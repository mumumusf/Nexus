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
            // 在screen会话中启动节点
            const command = `screen -dmS ${screenSessionName} bash -c "source ~/.bashrc && nexus-network start --node-id ${nodeId}"`;
            await this.executeInContainer(command);
            
            console.log(`✅ 节点 ${nodeId} 在screen会话 ${screenSessionName} 中启动成功`);
            
            this.nodeInstances.push({
                nodeId: nodeId,
                screenSession: screenSessionName,
                status: 'running'
            });
            
            return true;
        } catch (error) {
            console.error(`❌ 启动节点 ${nodeId} 失败:`, error.message);
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
        
        for (let i = 0; i < nodeIds.length; i++) {
            const nodeId = nodeIds[i];
            const screenSessionName = `nexus-node-${i + 1}`;
            
            await this.startNode(nodeId, screenSessionName);
            
            // 添加延迟避免同时启动造成资源竞争
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
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
            
            for (const node of this.nodeInstances) {
                const isActive = activeSessions.some(session => session.includes(node.screenSession));
                const status = isActive ? '🟢 运行中' : '🔴 已停止';
                console.log(`   节点ID: ${node.nodeId} | Screen: ${node.screenSession} | 状态: ${status}`);
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

    // 显示管理菜单
    async showMenu() {
        console.log('\n' + '='.repeat(50));
        console.log('🚀 Nexus节点管理器');
        console.log('='.repeat(50));
        console.log('1. 启动多个节点');
        console.log('2. 查看节点状态');
        console.log('3. 停止所有节点');
        console.log('4. 进入容器命令行');
        console.log('5. 退出');
        console.log('='.repeat(50));
        
        const choice = await this.getUserInput('请选择操作 (1-5): ');
        
        switch (choice) {
            case '1':
                await this.startMultipleNodes();
                break;
            case '2':
                await this.showStatus();
                break;
            case '3':
                await this.stopAllNodes();
                break;
            case '4':
                console.log(`\n要进入容器命令行，请在新终端中运行:`);
                console.log(`docker exec -it ${this.containerName} bash`);
                console.log(`在容器中查看screen会话: screen -ls`);
                console.log(`连接到特定会话: screen -r <session-name>`);
                console.log(`断开screen会话但保持运行: Ctrl+A 然后按 D`);
                break;
            case '5':
                console.log('👋 感谢使用Nexus节点管理器！');
                this.rl.close();
                return false;
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