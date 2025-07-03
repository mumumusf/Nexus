#!/usr/bin/env node
/**
 * Nexus节点管理器 - JavaScript版本
 * 自动安装Docker，检测系统资源，并在Docker容器中运行Nexus节点
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const os = require('os');
const readline = require('readline');

// 第三方依赖 - 需要通过npm安装
let Docker, si;

// 初始化依赖
async function initializeDependencies() {
    try {
        Docker = require('dockerode');
        si = require('systeminformation');
    } catch (error) {
        console.log('缺少必要的依赖包，正在安装...');
        await installDependencies();
        Docker = require('dockerode');
        si = require('systeminformation');
    }
}

// 安装依赖
async function installDependencies() {
    const execAsync = promisify(exec);
    try {
        console.log('安装dockerode和systeminformation...');
        await execAsync('npm install dockerode systeminformation');
        console.log('✓ 依赖安装完成');
    } catch (error) {
        console.error('依赖安装失败:', error.message);
        process.exit(1);
    }
}

class NexusNodeManager {
    constructor() {
        this.system = os.platform();
        this.docker = null;
        this.containers = [];
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    printBanner() {
        const banner = `
╔══════════════════════════════════════════════╗
║            Nexus节点管理器                    ║
║         自动化Docker节点部署工具               ║
║                JavaScript版本                ║
╚══════════════════════════════════════════════╝
        `;
        console.log(banner);
    }

    async checkDockerInstalled() {
        try {
            const execAsync = promisify(exec);
            const { stdout } = await execAsync('docker --version');
            console.log('✓ Docker已安装:', stdout.trim());
            return true;
        } catch (error) {
            console.log('✗ Docker未安装');
            return false;
        }
    }

    async installDocker() {
        console.log(`正在为 ${this.system} 系统安装Docker...`);
        
        switch (this.system) {
            case 'linux':
                await this._installDockerLinux();
                break;
            case 'win32':
                await this._installDockerWindows();
                break;
            case 'darwin':
                await this._installDockerMacOS();
                break;
            default:
                console.log(`不支持的操作系统: ${this.system}`);
                process.exit(1);
        }
    }

    async _installDockerLinux() {
        const execAsync = promisify(exec);
        const commands = [
            'curl -fsSL https://get.docker.com -o get-docker.sh',
            'sh get-docker.sh',
            'sudo usermod -aG docker $USER',
            'sudo systemctl start docker',
            'sudo systemctl enable docker'
        ];

        for (const cmd of commands) {
            console.log(`执行: ${cmd}`);
            try {
                await execAsync(cmd);
            } catch (error) {
                console.log(`命令执行失败: ${cmd}`);
                console.error(error.message);
                process.exit(1);
            }
        }
        
        console.log('Docker安装完成！请重新登录以使用Docker。');
    }

    async _installDockerWindows() {
        console.log('Windows用户请手动安装Docker Desktop:');
        console.log('1. 访问 https://www.docker.com/products/docker-desktop');
        console.log('2. 下载并安装Docker Desktop');
        console.log('3. 重启计算机');
        console.log('4. 重新运行此脚本');
        await this.waitForInput('安装完成后按Enter继续...');
    }

    async _installDockerMacOS() {
        console.log('macOS用户请手动安装Docker Desktop:');
        console.log('1. 访问 https://www.docker.com/products/docker-desktop');
        console.log('2. 下载并安装Docker Desktop');
        console.log('3. 重新运行此脚本');
        await this.waitForInput('安装完成后按Enter继续...');
    }

    async getSystemResources() {
        try {
            const cpu = await si.cpu();
            const mem = await si.mem();
            
            const cpuCores = cpu.cores;
            const memoryGB = mem.total / (1024 ** 3);
            
            console.log('系统资源检测:');
            console.log(`  CPU核心数: ${cpuCores}`);
            console.log(`  内存大小: ${memoryGB.toFixed(1)} GB`);
            
            return {
                cpu_cores: cpuCores,
                memory_gb: memoryGB
            };
        } catch (error) {
            console.error('获取系统资源失败:', error.message);
            // 回退到基本检测
            const cpuCores = os.cpus().length;
            const memoryGB = os.totalmem() / (1024 ** 3);
            
            console.log('系统资源检测 (基础模式):');
            console.log(`  CPU核心数: ${cpuCores}`);
            console.log(`  内存大小: ${memoryGB.toFixed(1)} GB`);
            
            return {
                cpu_cores: cpuCores,
                memory_gb: memoryGB
            };
        }
    }

    calculateMaxNodes(resources) {
        // 每个节点预估需要: 0.5 CPU核心 + 1GB内存
        const cpuLimit = Math.floor(resources.cpu_cores / 0.5);
        const memoryLimit = Math.floor(resources.memory_gb / 1.0);
        
        // 取最小值，并保留一些系统资源
        let maxNodes = Math.min(cpuLimit, memoryLimit) - 1;
        maxNodes = Math.max(1, maxNodes); // 至少运行1个节点
        
        console.log(`建议最大节点数: ${maxNodes}`);
        return maxNodes;
    }

    async getUserInput(maxNodes) {
        console.log('\n请输入配置信息:');
        
        // 获取节点数量
        let numNodes;
        while (true) {
            const input = await this.question(`要运行多少个节点? (1-${maxNodes}): `);
            numNodes = parseInt(input);
            if (numNodes >= 1 && numNodes <= maxNodes) {
                break;
            } else {
                console.log(`请输入1到${maxNodes}之间的数字`);
            }
        }
        
        // 获取节点ID列表
        const nodeIds = [];
        console.log(`\n请输入${numNodes}个节点ID:`);
        for (let i = 0; i < numNodes; i++) {
            while (true) {
                const nodeId = await this.question(`节点 ${i + 1} ID: `);
                if (nodeId.trim()) {
                    nodeIds.push(nodeId.trim());
                    break;
                } else {
                    console.log('节点ID不能为空');
                }
            }
        }
        
        return {
            num_nodes: numNodes,
            node_ids: nodeIds
        };
    }

    async connectDocker() {
        try {
            this.docker = new Docker();
            // 测试连接
            await this.docker.ping();
            console.log('✓ 成功连接到Docker');
        } catch (error) {
            console.log('✗ 连接Docker失败:', error.message);
            console.log('请确保Docker已启动');
            process.exit(1);
        }
    }

    async createNexusContainer(nodeId, containerName) {
        console.log(`创建容器: ${containerName}`);
        
        try {
            // 拉取Ubuntu镜像
            await this.pullImage('ubuntu:20.04');
            
            // 创建容器
            const container = await this.docker.createContainer({
                Image: 'ubuntu:20.04',
                name: containerName,
                Tty: true,
                OpenStdin: true,
                Env: [
                    `NODE_ID=${nodeId}`,
                    'DEBIAN_FRONTEND=noninteractive'
                ],
                Cmd: ['/bin/bash']
            });
            
            // 启动容器
            await container.start();
            
            // 在容器中安装Nexus
            await this._setupNexusInContainer(container, nodeId);
            
            this.containers.push(container);
            return container.id;
        } catch (error) {
            console.error(`创建容器失败: ${error.message}`);
            throw error;
        }
    }

    async pullImage(imageName) {
        console.log(`拉取镜像: ${imageName}`);
        return new Promise((resolve, reject) => {
            this.docker.pull(imageName, (err, stream) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                this.docker.modem.followProgress(stream, (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
        });
    }

    async _setupNexusInContainer(container, nodeId) {
        console.log(`在容器中安装Nexus (节点ID: ${nodeId})`);
        
        const setupCommands = [
            'apt-get update',
            'apt-get install -y curl',
            'curl https://cli.nexus.xyz/ | sh',
            "echo 'export PATH=$PATH:~/.nexus' >> ~/.bashrc"
        ];
        
        for (const cmd of setupCommands) {
            console.log(`  执行: ${cmd}`);
            try {
                const exec = await container.exec({
                    Cmd: ['bash', '-c', cmd],
                    AttachStdout: true,
                    AttachStderr: true,
                    WorkingDir: '/root'
                });
                
                const stream = await exec.start();
                const result = await this.streamToString(stream);
                
                const inspection = await exec.inspect();
                if (inspection.ExitCode !== 0) {
                    console.log(`  警告: 命令执行失败: ${cmd}`);
                    console.log(`  输出: ${result}`);
                }
            } catch (error) {
                console.log(`  错误: ${cmd} - ${error.message}`);
            }
        }
        
        // 启动Nexus节点
        const startCmd = `bash -c 'source ~/.bashrc && nexus-network start --node-id ${nodeId}'`;
        console.log(`  启动节点: ${startCmd}`);
        
        try {
            const exec = await container.exec({
                Cmd: ['bash', '-c', startCmd],
                AttachStdout: true,
                AttachStderr: true,
                WorkingDir: '/root',
                Detach: true
            });
            
            await exec.start({ Detach: true });
        } catch (error) {
            console.log(`  启动节点失败: ${error.message}`);
        }
    }

    async startNodes(config) {
        console.log(`\n开始创建${config.num_nodes}个Nexus节点...`);
        
        for (let i = 0; i < config.node_ids.length; i++) {
            const nodeId = config.node_ids[i];
            const containerName = `nexus-node-${i + 1}`;
            
            try {
                const containerId = await this.createNexusContainer(nodeId, containerName);
                console.log(`✓ 节点 ${i + 1} 创建成功 (容器ID: ${containerId.substring(0, 12)})`);
                await this.sleep(2000); // 给容器一些启动时间
            } catch (error) {
                console.log(`✗ 节点 ${i + 1} 创建失败: ${error.message}`);
            }
        }
    }

    async showContainerDetails(containerIndex) {
        const container = this.containers[containerIndex];
        if (!container) {
            console.log('容器不存在');
            return;
        }

        try {
            const info = await container.inspect();
            const stats = await container.stats({ stream: false });
            
            console.log(`\n=== 节点 ${containerIndex + 1} 详细信息 ===`);
            console.log(`容器ID: ${info.Id.substring(0, 12)}`);
            console.log(`容器名称: ${info.Name}`);
            console.log(`状态: ${info.State.Status}`);
            console.log(`启动时间: ${new Date(info.State.StartedAt).toLocaleString()}`);
            console.log(`重启次数: ${info.RestartCount}`);
            
            // 网络信息
            const networks = Object.keys(info.NetworkSettings.Networks);
            if (networks.length > 0) {
                const network = info.NetworkSettings.Networks[networks[0]];
                console.log(`IP地址: ${network.IPAddress || '未分配'}`);
            }
            
            // 资源使用情况
            if (stats && stats.memory_stats && stats.cpu_stats) {
                const memoryUsageMB = stats.memory_stats.usage / 1024 / 1024;
                const memoryLimitMB = stats.memory_stats.limit / 1024 / 1024;
                const memoryPercent = (memoryUsageMB / memoryLimitMB * 100).toFixed(1);
                
                console.log(`内存使用: ${memoryUsageMB.toFixed(1)} MB / ${memoryLimitMB.toFixed(1)} MB (${memoryPercent}%)`);
                
                // CPU使用率计算
                const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - (stats.precpu_stats.cpu_usage?.total_usage || 0);
                const systemDelta = stats.cpu_stats.system_cpu_usage - (stats.precpu_stats.system_cpu_usage || 0);
                const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta * 100).toFixed(1) : 0;
                
                console.log(`CPU使用率: ${cpuPercent}%`);
            }
            
        } catch (error) {
            console.log(`获取容器详情失败: ${error.message}`);
        }
    }

    async showContainerLogs(containerIndex, lines = 50) {
        const container = this.containers[containerIndex];
        if (!container) {
            console.log('容器不存在');
            return;
        }

        try {
            console.log(`\n=== 节点 ${containerIndex + 1} 最新 ${lines} 行日志 ===`);
            const logs = await container.logs({
                stdout: true,
                stderr: true,
                tail: lines,
                timestamps: true
            });
            
            const logStr = logs.toString();
            if (logStr.trim()) {
                console.log(logStr);
            } else {
                console.log('暂无日志');
            }
        } catch (error) {
            console.log(`获取日志失败: ${error.message}`);
        }
    }

    async restartContainer(containerIndex) {
        const container = this.containers[containerIndex];
        if (!container) {
            console.log('容器不存在');
            return;
        }

        try {
            console.log(`正在重启节点 ${containerIndex + 1}...`);
            await container.restart();
            console.log(`✓ 节点 ${containerIndex + 1} 重启成功`);
        } catch (error) {
            console.log(`✗ 重启失败: ${error.message}`);
        }
    }

    async showContainerOverview() {
        console.clear();
        console.log('='.repeat(80));
        console.log(`                    Nexus节点概览 - ${new Date().toLocaleString()}`);
        console.log('='.repeat(80));
        
        if (this.containers.length === 0) {
            console.log('暂无运行中的容器');
            return;
        }

        for (let i = 0; i < this.containers.length; i++) {
            const container = this.containers[i];
            try {
                const info = await container.inspect();
                const stats = await container.stats({ stream: false });
                
                // 状态指示器
                const statusIcon = info.State.Status === 'running' ? '🟢' : 
                                 info.State.Status === 'exited' ? '🔴' : '🟡';
                
                console.log(`\n${statusIcon} 节点 ${i + 1} (${info.Id.substring(0, 12)})`);
                console.log(`   状态: ${info.State.Status}`);
                console.log(`   运行时间: ${this.getUptime(info.State.StartedAt)}`);
                
                if (stats && stats.memory_stats) {
                    const memoryUsageMB = (stats.memory_stats.usage / 1024 / 1024).toFixed(0);
                    console.log(`   内存: ${memoryUsageMB} MB`);
                }
                
                // 获取最新日志
                const logs = await container.logs({
                    stdout: true,
                    stderr: true,
                    tail: 1
                });
                
                const logStr = logs.toString().trim();
                if (logStr) {
                    const lastLog = logStr.split('\n').pop();
                    const truncatedLog = lastLog.length > 60 ? lastLog.substring(0, 60) + '...' : lastLog;
                    console.log(`   最新: ${truncatedLog}`);
                }
                
            } catch (error) {
                console.log(`\n❌ 节点 ${i + 1}: 获取信息失败 - ${error.message}`);
            }
        }
        
        console.log('\n' + '-'.repeat(80));
    }

    getUptime(startedAt) {
        const start = new Date(startedAt);
        const now = new Date();
        const diff = now - start;
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return `${hours}小时${minutes}分钟`;
        } else {
            return `${minutes}分钟`;
        }
    }

    async showInteractiveMenu() {
        while (true) {
            console.log('\n📋 容器管理菜单:');
            console.log('1. 查看所有容器概览');
            console.log('2. 查看特定容器详情');
            console.log('3. 查看特定容器日志');
            console.log('4. 重启特定容器');
            console.log('5. 自动监控模式');
            console.log('0. 退出程序');
            
            const choice = await this.question('\n请选择操作 (0-5): ');
            
            switch (choice) {
                case '1':
                    await this.showContainerOverview();
                    break;
                    
                case '2':
                    if (this.containers.length === 0) {
                        console.log('暂无容器');
                        break;
                    }
                    const detailIndex = await this.question(`请输入容器编号 (1-${this.containers.length}): `);
                    const index = parseInt(detailIndex) - 1;
                    if (index >= 0 && index < this.containers.length) {
                        await this.showContainerDetails(index);
                    } else {
                        console.log('无效的容器编号');
                    }
                    break;
                    
                case '3':
                    if (this.containers.length === 0) {
                        console.log('暂无容器');
                        break;
                    }
                    const logIndex = await this.question(`请输入容器编号 (1-${this.containers.length}): `);
                    const logLines = await this.question('显示行数 (默认50): ') || '50';
                    const lIndex = parseInt(logIndex) - 1;
                    if (lIndex >= 0 && lIndex < this.containers.length) {
                        await this.showContainerLogs(lIndex, parseInt(logLines));
                    } else {
                        console.log('无效的容器编号');
                    }
                    break;
                    
                case '4':
                    if (this.containers.length === 0) {
                        console.log('暂无容器');
                        break;
                    }
                    const restartIndex = await this.question(`请输入容器编号 (1-${this.containers.length}): `);
                    const rIndex = parseInt(restartIndex) - 1;
                    if (rIndex >= 0 && rIndex < this.containers.length) {
                        await this.restartContainer(rIndex);
                    } else {
                        console.log('无效的容器编号');
                    }
                    break;
                    
                case '5':
                    await this.autoMonitorMode();
                    break;
                    
                case '0':
                    await this.handleExit();
                    return;
                    
                default:
                    console.log('无效选择，请重新输入');
            }
            
            if (choice !== '5') {
                await this.waitForInput('\n按Enter继续...');
            }
        }
    }

    async autoMonitorMode() {
        console.log('\n🔄 自动监控模式 (按Ctrl+C返回菜单)');
        console.log('-'.repeat(50));
        
        let monitoring = true;
        
        const sigintHandler = () => {
            monitoring = false;
            console.log('\n停止自动监控，返回菜单...');
        };
        
        process.on('SIGINT', sigintHandler);
        
        while (monitoring) {
            await this.showContainerOverview();
            
            // 等待10秒，但每秒检查一次是否需要退出
            for (let i = 0; i < 10 && monitoring; i++) {
                await this.sleep(1000);
            }
        }
        
        process.removeListener('SIGINT', sigintHandler);
    }

    async monitorNodes() {
        console.log('\n🚀 节点部署完成！');
        
        // 先显示一次概览
        await this.showContainerOverview();
        
        // 进入交互式菜单
        await this.showInteractiveMenu();
    }

    async cleanup() {
        console.log('\n清理容器...');
        for (const container of this.containers) {
            try {
                const info = await container.inspect();
                await container.stop();
                await container.remove();
                console.log(`✓ 容器已清理: ${info.Name}`);
            } catch (error) {
                console.log(`✗ 清理容器失败: ${error.message}`);
            }
        }
    }

    async saveConfig(config) {
        const configFile = 'nexus_config.json';
        try {
            await fs.writeFile(configFile, JSON.stringify(config, null, 2), 'utf8');
            console.log(`配置已保存到: ${configFile}`);
        } catch (error) {
            console.error(`保存配置失败: ${error.message}`);
        }
    }

    async run() {
        try {
            this.printBanner();
            
            // 1. 检查并安装Docker
            if (!(await this.checkDockerInstalled())) {
                const installChoice = await this.question('是否要安装Docker? (y/n): ');
                if (installChoice.toLowerCase() === 'y') {
                    await this.installDocker();
                } else {
                    console.log('需要Docker才能继续');
                    process.exit(1);
                }
            }
            
            // 2. 连接Docker
            await this.connectDocker();
            
            // 3. 检测系统资源
            const resources = await this.getSystemResources();
            const maxNodes = this.calculateMaxNodes(resources);
            
            // 4. 获取用户配置
            const config = await this.getUserInput(maxNodes);
            
            // 5. 保存配置
            await this.saveConfig(config);
            
            // 6. 启动节点
            await this.startNodes(config);
            
            // 7. 监控节点
            await this.monitorNodes();
            
        } catch (error) {
            console.error('发生错误:', error.message);
        }
    }

    async handleExit() {
        const cleanupChoice = await this.question('\n是否要清理所有容器? (y/n): ');
        if (cleanupChoice.toLowerCase() === 'y') {
            await this.cleanup();
        }
        this.rl.close();
        process.exit(0);
    }

    // 辅助方法
    question(prompt) {
        return new Promise(resolve => {
            this.rl.question(prompt, resolve);
        });
    }

    waitForInput(prompt) {
        return new Promise(resolve => {
            this.rl.question(prompt, () => resolve());
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    streamToString(stream) {
        return new Promise((resolve, reject) => {
            let data = '';
            stream.on('data', chunk => {
                data += chunk.toString();
            });
            stream.on('end', () => resolve(data));
            stream.on('error', reject);
        });
    }
}

// 主函数
async function main() {
    // 检查Node.js版本
    const nodeVersion = process.version;
    const versionNumber = parseInt(nodeVersion.substring(1).split('.')[0]);
    
    if (versionNumber < 12) {
        console.log('需要Node.js 12或更高版本');
        process.exit(1);
    }
    
    try {
        // 初始化依赖
        await initializeDependencies();
        
        // 启动管理器
        const manager = new NexusNodeManager();
        await manager.run();
    } catch (error) {
        console.error('启动失败:', error.message);
        process.exit(1);
    }
}

// 如果是直接运行此文件
if (require.main === module) {
    main();
}

module.exports = NexusNodeManager; 