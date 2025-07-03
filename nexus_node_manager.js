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

    async monitorNodes() {
        console.log('\n节点监控 (按Ctrl+C退出):');
        console.log('-'.repeat(50));
        
        const monitorInterval = setInterval(async () => {
            console.log(`\n时间: ${new Date().toLocaleString()}`);
            
            for (let i = 0; i < this.containers.length; i++) {
                const container = this.containers[i];
                try {
                    const info = await container.inspect();
                    const status = info.State.Status;
                    console.log(`节点 ${i + 1}: ${status}`);
                    
                    // 获取容器日志的最后几行
                    const logs = await container.logs({
                        stdout: true,
                        stderr: true,
                        tail: 3
                    });
                    
                    const logStr = logs.toString().trim();
                    if (logStr) {
                        const lines = logStr.split('\n');
                        console.log(`  最新日志: ${lines[lines.length - 1]}`);
                    }
                } catch (error) {
                    console.log(`节点 ${i + 1}: 错误 - ${error.message}`);
                }
            }
        }, 30000); // 每30秒检查一次
        
        // 处理Ctrl+C
        process.on('SIGINT', () => {
            clearInterval(monitorInterval);
            console.log('\n停止监控...');
            this.handleExit();
        });
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