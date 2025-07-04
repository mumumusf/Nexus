#!/usr/bin/env node

const { exec, spawn } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const os = require('os');
const util = require('util');

const execAsync = util.promisify(exec);

class NexusNodeManager {
    constructor() {
        this.containerName = 'nexus-ubuntu24';
        this.imageName = 'ubuntu:24.04';
        this.minMemoryGB = 5;
        this.nodeInstances = [];
        this.detailedLogs = false; // 详细日志模式
        
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    // 检测系统资源
    async checkSystemResources() {
        console.log('\n🔍 正在检测系统资源...');
        
        const totalMemoryGB = Math.round(os.totalmem() / (1024 * 1024 * 1024));
        const cpuCores = os.cpus().length;
        const freeMemoryGB = Math.round(os.freemem() / (1024 * 1024 * 1024));
        
        console.log(`📊 系统信息:`);
        console.log(`   CPU核心数: ${cpuCores}`);
        console.log(`   总内存: ${totalMemoryGB}GB`);
        console.log(`   可用内存: ${freeMemoryGB}GB`);
        
        const maxNodes = Math.floor(freeMemoryGB / this.minMemoryGB);
        
        if (maxNodes === 0) {
            console.log(`❌ 系统内存不足! 至少需要${this.minMemoryGB}GB内存来运行一个节点`);
            return 0;
        }
        
        console.log(`✅ 推荐最大节点数: ${maxNodes} (基于${this.minMemoryGB}GB内存/节点)`);
        return maxNodes;
    }

    // 检查Docker是否安装
    async checkDockerInstallation() {
        try {
            const { stdout } = await execAsync('docker --version');
            console.log(`✅ Docker已安装: ${stdout.trim()}`);
            return true;
        } catch (error) {
            console.log('❌ Docker未安装或未运行');
            
            // 在Linux系统上提供自动安装选项
            if (process.platform === 'linux') {
                const installDocker = await this.getUserInput('是否要自动安装Docker? (y/N): ');
                if (installDocker.toLowerCase() === 'y') {
                    return await this.installDocker();
                }
            }
            
            console.log('请手动安装Docker:');
            console.log('Windows/Mac: https://docs.docker.com/desktop/');
            console.log('Linux: curl -fsSL https://get.docker.com | bash');
            return false;
        }
    }

    // 自动安装Docker (仅Linux)
    async installDocker() {
        try {
            console.log('🔧 正在安装Docker...');
            
            // 安装Docker
            await execAsync('curl -fsSL https://get.docker.com | bash');
            
            // 添加用户到docker组
            const user = process.env.USER || 'root';
            await execAsync(`usermod -aG docker ${user}`);
            
            console.log('✅ Docker安装成功');
            console.log('⚠️ 注意: 您可能需要重新登录或重启终端来使用Docker');
            console.log('或者运行: newgrp docker');
            
            return true;
        } catch (error) {
            console.error('❌ Docker安装失败:', error.message);
            console.log('请手动安装Docker: https://docs.docker.com/get-docker/');
            return false;
        }
    }

    // 创建Ubuntu 24.04容器
    async createUbuntuContainer() {
        console.log('\n🐳 正在创建Ubuntu 24.04容器...');
        
        try {
            // 先拉取Ubuntu 24.04镜像
            console.log('📥 正在拉取Ubuntu 24.04镜像...');
            await execAsync(`docker pull ${this.imageName}`);
            
            // 检查容器是否已存在
            try {
                await execAsync(`docker inspect ${this.containerName}`);
                console.log('📦 容器已存在，正在重启...');
                await execAsync(`docker restart ${this.containerName}`);
            } catch (error) {
                // 容器不存在，创建新容器
                console.log('📦 正在创建新容器...');
                const homeDir = os.homedir();
                const createCommand = `docker run -d --name ${this.containerName} ` +
                    `--privileged ` +
                    `-v ${homeDir}:/workspace ` +
                    `-v /tmp/.X11-unix:/tmp/.X11-unix ` +
                    `${this.imageName} ` +
                    `sleep infinity`;
                
                await execAsync(createCommand);
                console.log('✅ Ubuntu 24.04容器创建成功');
            }

            // 更新容器并安装必要软件
            console.log('📦 正在更新容器并安装必要软件...');
            await this.executeInContainer('apt update');
            const installCommand = 'apt install -y curl wget git screen build-essential libssl-dev bash';
            await this.executeInContainer(installCommand);
            
            console.log('✅ 容器环境配置完成');
            return true;
        } catch (error) {
            console.error('❌ 创建容器失败:', error.message);
            return false;
        }
    }

    // 在容器中执行命令
    async executeInContainer(command) {
        const fullCommand = `docker exec ${this.containerName} bash -c "${command}"`;
        return await execAsync(fullCommand);
    }

    // 安装Nexus CLI
    async installNexusCLI() {
        console.log('\n⚡ 正在安装Nexus CLI...');
        
        try {
            // 安装Nexus CLI
            await this.executeInContainer('curl https://cli.nexus.xyz/ | sh');
            
            // 重新加载环境变量
            await this.executeInContainer('source ~/.bashrc');
            
            console.log('✅ Nexus CLI安装成功');
            return true;
        } catch (error) {
            console.error('❌ Nexus CLI安装失败:', error.message);
            return false;
        }
    }

    // 获取用户输入
    async getUserInput(question) {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer.trim());
            });
        });
    }

    // 启动单个节点
    async startNode(nodeId, screenSessionName) {
        console.log(`🚀 正在启动节点 ${nodeId}...`);
        
        try {
            if (this.detailedLogs) {
                console.log(`📋 详细启动过程:`);
                console.log(`   - 节点ID: ${nodeId}`);
                console.log(`   - Screen会话: ${screenSessionName}`);
                console.log(`   - 容器: ${this.containerName}`);
            }

            // 创建日志目录
            if (this.detailedLogs) console.log(`📁 创建日志目录...`);
            await this.executeInContainer(`mkdir -p ~/.nexus/logs`);
            
            // 在screen会话中启动节点，重定向日志到文件
            if (this.detailedLogs) console.log(`🔧 启动nexus进程...`);
            const logFile = `~/.nexus/logs/node-${nodeId}.log`;
            const command = `screen -dmS ${screenSessionName} bash -c "source ~/.bashrc && nexus-network start --node-id ${nodeId} 2>&1 | tee ${logFile}"`;
            
            await this.executeInContainer(command);
            
            // 等待一下确保进程启动
            if (this.detailedLogs) console.log(`⏳ 等待进程启动...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // 检查进程是否启动成功
            if (this.detailedLogs) console.log(`🔍 检查进程状态...`);
            try {
                const { stdout } = await this.executeInContainer(`screen -ls | grep ${screenSessionName}`);
                if (stdout.includes(screenSessionName)) {
                    console.log(`✅ 节点 ${nodeId} 在screen会话 ${screenSessionName} 中启动成功`);
                    if (this.detailedLogs) {
                        console.log(`📊 启动信息:`);
                        console.log(`   - 日志文件: ${logFile}`);
                        console.log(`   - 查看日志: docker exec -it ${this.containerName} bash -c "tail -f ${logFile}"`);
                    }
                } else {
                    throw new Error('Screen会话未找到');
                }
            } catch (checkError) {
                console.log(`⚠️ 无法确认启动状态，但命令已执行`);
            }
            
            this.nodeInstances.push({
                nodeId: nodeId,
                screenSession: screenSessionName,
                status: 'running',
                logFile: logFile
            });
            
            return true;
        } catch (error) {
            console.error(`❌ 启动节点 ${nodeId} 失败:`, error.message);
            if (this.detailedLogs) {
                console.error(`🔍 错误详情:`, error);
            }
            return false;
        }
    }

    // 启动多个节点
    async startMultipleNodes() {
        const maxNodes = await this.checkSystemResources();
        if (maxNodes === 0) return;

        const nodeCountInput = await this.getUserInput(`\n请输入要运行的节点数量 (最大推荐: ${maxNodes}): `);
        const nodeCount = parseInt(nodeCountInput);

        if (isNaN(nodeCount) || nodeCount <= 0) {
            console.log('❌ 无效的节点数量');
            return;
        }

        if (nodeCount > maxNodes) {
            const confirm = await this.getUserInput(`⚠️ 您输入的节点数(${nodeCount})超过推荐值(${maxNodes})，可能导致系统不稳定。是否继续? (y/N): `);
            if (confirm.toLowerCase() !== 'y') {
                console.log('操作已取消');
                return;
            }
        }

        console.log(`\n📝 请输入${nodeCount}个节点的ID:`);
        const nodeIds = [];
        
        for (let i = 1; i <= nodeCount; i++) {
            const nodeId = await this.getUserInput(`节点 ${i} ID: `);
            if (nodeId) {
                nodeIds.push(nodeId);
            } else {
                console.log('❌ 节点ID不能为空');
                i--; // 重新输入
            }
        }

        console.log('\n🚀 开始启动节点...');
        
        let successCount = 0;
        let failCount = 0;
        
        for (let i = 0; i < nodeIds.length; i++) {
            const nodeId = nodeIds[i];
            const screenSessionName = `nexus-node-${i + 1}`;
            
            console.log(`\n📝 正在启动第 ${i + 1}/${nodeIds.length} 个节点...`);
            const success = await this.startNode(nodeId, screenSessionName);
            
            if (success) {
                successCount++;
            } else {
                failCount++;
            }
            
            // 添加延迟避免同时启动造成资源竞争
            if (i < nodeIds.length - 1) {
                if (this.detailedLogs) console.log(`⏳ 等待2秒后启动下一个节点...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        // 启动完成总结
        console.log('\n' + '='.repeat(50));
        console.log('🎉 节点启动完成！');
        console.log('='.repeat(50));
        console.log(`✅ 成功启动: ${successCount} 个节点`);
        if (failCount > 0) {
            console.log(`❌ 启动失败: ${failCount} 个节点`);
        }
        console.log(`📊 总计节点: ${this.nodeInstances.length} 个`);
        console.log('\n💡 提示:');
        console.log('   - 选择菜单选项 2 查看节点状态');
        console.log('   - 选择菜单选项 3 查看节点日志');
        console.log('   - 输入 v 切换详细日志模式');
        console.log('='.repeat(50));
        
        // 等待用户查看信息
        await this.getUserInput('\n按回车键返回主菜单...');
    }

    // 显示运行状态
    async showStatus() {
        console.log('\n📊 节点运行状态:');
        
        if (this.nodeInstances.length === 0) {
            console.log('   当前没有运行的节点');
            return;
        }

        try {
            // 获取screen会话列表
            const { stdout } = await this.executeInContainer('screen -ls');
            const activeSessions = stdout.split('\n').filter(line => line.includes('nexus-node'));

            console.log(`   总计节点: ${this.nodeInstances.length}`);
            console.log('-'.repeat(80));
            
            for (const node of this.nodeInstances) {
                const isActive = activeSessions.some(session => session.includes(node.screenSession));
                const status = isActive ? '🟢 运行中' : '🔴 已停止';
                console.log(`   节点ID: ${node.nodeId}`);
                console.log(`   Screen会话: ${node.screenSession}`);
                console.log(`   状态: ${status}`);
                if (node.logFile) {
                    console.log(`   日志文件: ${node.logFile}`);
                    
                    // 显示最近的日志（如果开启详细模式）
                    if (this.detailedLogs) {
                        try {
                            const { stdout: logContent } = await this.executeInContainer(`tail -3 ${node.logFile} 2>/dev/null || echo "暂无日志"`);
                            const logs = logContent.trim();
                            if (logs && logs !== "暂无日志") {
                                console.log(`   最近日志: ${logs.split('\n')[0]}...`);
                            }
                        } catch (logError) {
                            // 忽略日志读取错误
                        }
                    }
                }
                console.log('-'.repeat(80));
            }
            
            if (this.nodeInstances.length > 0) {
                console.log('\n💡 提示:');
                console.log('   - 选择菜单选项 3 查看详细日志');
                console.log('   - 输入 v 开启详细日志模式显示更多信息');
            }
        } catch (error) {
            console.error('获取状态失败:', error.message);
        }
    }

    // 停止所有节点
    async stopAllNodes() {
        console.log('\n🛑 正在停止所有节点...');
        
        for (const node of this.nodeInstances) {
            try {
                await this.executeInContainer(`screen -S ${node.screenSession} -X quit`);
                console.log(`✅ 节点 ${node.nodeId} 已停止`);
            } catch (error) {
                console.log(`⚠️ 停止节点 ${node.nodeId} 失败: ${error.message}`);
            }
        }
        
        this.nodeInstances = [];
        console.log('✅ 所有节点已停止');
    }

    // 查看节点日志
    async viewNodeLogs() {
        console.log('\n📋 节点日志查看');
        
        if (this.nodeInstances.length === 0) {
            console.log('   当前没有运行的节点');
            return;
        }

        console.log('\n选择要查看日志的节点:');
        for (let i = 0; i < this.nodeInstances.length; i++) {
            const node = this.nodeInstances[i];
            console.log(`   ${i + 1}. 节点 ${node.nodeId} (${node.screenSession})`);
        }
        console.log(`   ${this.nodeInstances.length + 1}. 查看所有节点日志`);
        console.log(`   0. 返回主菜单`);

        const choice = await this.getUserInput('\n请选择: ');
        const nodeIndex = parseInt(choice) - 1;

        if (choice === '0') {
            return;
        } else if (parseInt(choice) === this.nodeInstances.length + 1) {
            // 查看所有节点日志
            console.log('\n📊 所有节点日志:');
            for (const node of this.nodeInstances) {
                await this.showNodeLog(node, 10);
            }
        } else if (nodeIndex >= 0 && nodeIndex < this.nodeInstances.length) {
            const selectedNode = this.nodeInstances[nodeIndex];
            await this.showDetailedNodeLog(selectedNode);
        } else {
            console.log('❌ 无效选择');
        }
    }

    // 显示节点详细日志
    async showDetailedNodeLog(node) {
        console.log(`\n📋 节点 ${node.nodeId} 详细日志:`);
        console.log(`Screen会话: ${node.screenSession}`);
        console.log(`日志文件: ${node.logFile}`);
        console.log('=' .repeat(60));

        try {
            // 显示最近50行日志
            const { stdout } = await this.executeInContainer(`tail -50 ${node.logFile} 2>/dev/null || echo "日志文件不存在或为空"`);
            if (stdout.trim()) {
                console.log(stdout);
            } else {
                console.log('📝 暂无日志内容');
            }
        } catch (error) {
            console.log('❌ 读取日志失败:', error.message);
        }

        console.log('=' .repeat(60));
        console.log('\n📖 实时日志选项:');
        console.log('1. 查看实时日志 (按Ctrl+C退出)');
        console.log('2. 查看完整日志');
        console.log('3. 返回');

        const choice = await this.getUserInput('请选择: ');
        
        if (choice === '1') {
            console.log(`\n🔄 实时查看节点 ${node.nodeId} 日志 (按Ctrl+C退出):`);
            console.log(`手动命令: docker exec -it ${this.containerName} bash -c "tail -f ${node.logFile}"`);
            await this.getUserInput('\n按回车键返回菜单...');
        } else if (choice === '2') {
            try {
                const { stdout } = await this.executeInContainer(`cat ${node.logFile} 2>/dev/null || echo "日志文件不存在"`);
                console.log('\n📄 完整日志:');
                console.log('=' .repeat(60));
                console.log(stdout);
                console.log('=' .repeat(60));
            } catch (error) {
                console.log('❌ 读取完整日志失败:', error.message);
            }
            await this.getUserInput('\n按回车键返回...');
        }
    }

    // 显示节点简要日志
    async showNodeLog(node, lines = 5) {
        console.log(`\n📋 节点 ${node.nodeId} (最近${lines}行):`);
        try {
            const { stdout } = await this.executeInContainer(`tail -${lines} ${node.logFile} 2>/dev/null || echo "暂无日志"`);
            console.log(stdout.trim() || '📝 暂无日志内容');
        } catch (error) {
            console.log('❌ 读取日志失败');
        }
        console.log('-'.repeat(40));
    }

    // 切换详细日志模式
    toggleDetailedLogs() {
        this.detailedLogs = !this.detailedLogs;
        console.log(`\n📊 详细日志模式: ${this.detailedLogs ? '✅ 已开启' : '❌ 已关闭'}`);
        if (this.detailedLogs) {
            console.log('现在会显示详细的操作过程和错误信息');
        } else {
            console.log('现在只显示简要的操作结果');
        }
    }

    // 显示管理菜单
    async showMenu() {
        console.log('\n' + '='.repeat(50));
        console.log('🚀 Nexus节点管理器');
        console.log('='.repeat(50));
        console.log('1. 启动多个节点');
        console.log('2. 查看节点状态');
        console.log('3. 查看节点日志');
        console.log('4. 停止所有节点');
        console.log('5. 进入容器命令行');
        console.log('6. 退出');
        console.log('='.repeat(50));
        console.log(`📊 详细日志: ${this.detailedLogs ? '✅ 开启' : '❌ 关闭'} (输入 v 切换)`);
        console.log('='.repeat(50));
        
        const choice = await this.getUserInput('请选择操作 (1-6, v): ');
        
        switch (choice.toLowerCase()) {
            case '1':
                await this.startMultipleNodes();
                break;
            case '2':
                await this.showStatus();
                break;
            case '3':
                await this.viewNodeLogs();
                break;
            case '4':
                await this.stopAllNodes();
                break;
            case '5':
                console.log(`\n要进入容器命令行，请在新终端中运行:`);
                console.log(`docker exec -it ${this.containerName} bash`);
                console.log(`在容器中查看screen会话: screen -ls`);
                console.log(`连接到特定会话: screen -r <session-name>`);
                console.log(`断开screen会话但保持运行: Ctrl+A 然后按 D`);
                break;
            case '6':
                console.log('👋 感谢使用Nexus节点管理器！');
                this.rl.close();
                return false;
            case 'v':
                this.toggleDetailedLogs();
                break;
            default:
                console.log('❌ 无效选择');
        }
        
        return true;
    }

    // 主运行函数
    async run() {
        console.log('🚀 Nexus节点管理器启动中...\n');
        
        // 检查Docker
        if (!(await this.checkDockerInstallation())) {
            return;
        }

        // 检查系统资源
        await this.checkSystemResources();

        // 创建Ubuntu容器
        if (!(await this.createUbuntuContainer())) {
            return;
        }

        // 安装Nexus CLI
        if (!(await this.installNexusCLI())) {
            return;
        }

        // 显示管理菜单
        let continueRunning = true;
        while (continueRunning) {
            continueRunning = await this.showMenu();
            if (continueRunning) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    // 清理函数
    async cleanup() {
        console.log('\n🧹 正在清理资源...');
        
        try {
            // 停止所有节点
            await this.stopAllNodes();
            
            // 可选：停止并删除容器
            const deleteContainer = await this.getUserInput('是否删除Docker容器? (y/N): ');
            if (deleteContainer.toLowerCase() === 'y') {
                await execAsync(`docker stop ${this.containerName}`);
                await execAsync(`docker rm ${this.containerName}`);
                console.log('✅ 容器已删除');
            }
        } catch (error) {
            console.error('清理过程中出现错误:', error.message);
        }
        
        this.rl.close();
    }
}

// 处理程序退出
process.on('SIGINT', async () => {
    console.log('\n\n⚠️ 收到退出信号...');
    if (global.nodeManager) {
        await global.nodeManager.cleanup();
    }
    process.exit(0);
});

// 主程序入口
async function main() {
    const nodeManager = new NexusNodeManager();
    global.nodeManager = nodeManager;
    
    try {
        await nodeManager.run();
    } catch (error) {
        console.error('程序运行出错:', error.message);
    } finally {
        nodeManager.rl.close();
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}

module.exports = NexusNodeManager; 