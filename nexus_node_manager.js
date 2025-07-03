#!/usr/bin/env node
/**
 * Nexus节点管理器 - JavaScript版本
 * 使用screen会话管理多个Nexus节点
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const os = require('os');
const readline = require('readline');

// 第三方依赖 - 需要通过npm安装
let si;

// 初始化依赖
async function initializeDependencies() {
    try {
        si = require('systeminformation');
    } catch (error) {
        console.log('缺少必要的依赖包，正在安装...');
        await installDependencies();
        si = require('systeminformation');
    }
}

// 安装依赖
async function installDependencies() {
    const execAsync = promisify(exec);
    try {
        console.log('安装systeminformation...');
        await execAsync('npm install systeminformation');
        console.log('✓ 依赖安装完成');
    } catch (error) {
        console.error('依赖安装失败:', error.message);
        process.exit(1);
    }
}

class NexusNodeManager {
    constructor() {
        this.system = os.platform();
        this.sessions = [];
        this.nodeConfigs = [];
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    printBanner() {
        const banner = `
╔══════════════════════════════════════════════╗
║            Nexus节点管理器                    ║
║         Screen会话节点部署工具                 ║
║                JavaScript版本                ║
╚══════════════════════════════════════════════╝
        `;
        console.log(banner);
    }

    async checkScreenInstalled() {
        try {
            const execAsync = promisify(exec);
            const { stdout } = await execAsync('screen -v');
            console.log('✓ Screen已安装:', stdout.trim().split('\n')[0]);
            return true;
        } catch (error) {
            console.log('✗ Screen未安装');
            return false;
        }
    }

    async installScreen() {
        console.log(`正在为 ${this.system} 系统安装Screen...`);
        
        switch (this.system) {
            case 'linux':
                await this._installScreenLinux();
                break;
            case 'win32':
                await this._installScreenWindows();
                break;
            case 'darwin':
                await this._installScreenMacOS();
                break;
            default:
                console.log(`不支持的操作系统: ${this.system}`);
                process.exit(1);
        }
    }

    async _installScreenLinux() {
        const execAsync = promisify(exec);
        
        // 检测包管理器并安装screen
        const packageManagers = [
            { cmd: 'apt-get', install: 'sudo apt-get update && sudo apt-get install -y screen' },
            { cmd: 'yum', install: 'sudo yum install -y screen' },
            { cmd: 'dnf', install: 'sudo dnf install -y screen' },
            { cmd: 'pacman', install: 'sudo pacman -S screen' },
            { cmd: 'zypper', install: 'sudo zypper install screen' }
        ];

        for (const pm of packageManagers) {
            try {
                await execAsync(`which ${pm.cmd}`);
                console.log(`使用 ${pm.cmd} 安装 screen...`);
                await execAsync(pm.install);
                console.log('Screen安装完成！');
                return;
            } catch (error) {
                continue;
            }
        }
        
        console.log('未能自动安装screen，请手动安装后重新运行脚本。');
        process.exit(1);
    }

    async _installScreenWindows() {
        console.log('Windows系统建议使用以下方式安装screen:');
        console.log('1. 使用WSL (Windows Subsystem for Linux):');
        console.log('   - 安装WSL: wsl --install');
        console.log('   - 在WSL中运行此脚本');
        console.log('2. 使用Cygwin或MinGW');
        console.log('3. 使用Git Bash (可能不完全兼容)');
        await this.waitForInput('安装完成后按Enter继续...');
    }

    async _installScreenMacOS() {
        const execAsync = promisify(exec);
        
        try {
            // 尝试使用Homebrew安装
            await execAsync('brew --version');
            console.log('使用 Homebrew 安装 screen...');
            await execAsync('brew install screen');
            console.log('Screen安装完成！');
        } catch (error) {
            console.log('macOS用户请安装Homebrew后再安装screen:');
            console.log('1. 安装Homebrew: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"');
            console.log('2. 安装screen: brew install screen');
            await this.waitForInput('安装完成后按Enter继续...');
        }
    }

    async checkNexusInstalled() {
        try {
            const execAsync = promisify(exec);
            await execAsync('nexus-network --version');
            console.log('✓ Nexus CLI已安装');
            return true;
        } catch (error) {
            console.log('✗ Nexus CLI未安装');
            return false;
        }
    }

    async installNexus() {
        console.log('正在安装Nexus CLI...');
        const execAsync = promisify(exec);
        
        try {
            // 安装Nexus CLI
            await execAsync('curl https://cli.nexus.xyz/ | sh');
            
            // 添加到PATH (根据shell类型)
            const shell = process.env.SHELL || '/bin/bash';
            const rcFile = shell.includes('zsh') ? '~/.zshrc' : '~/.bashrc';
            
            await execAsync(`echo 'export PATH=$PATH:~/.nexus' >> ${rcFile}`);
            console.log('✓ Nexus CLI安装完成');
            console.log('请重新加载shell配置: source ~/.bashrc 或 source ~/.zshrc');
            
        } catch (error) {
            console.log(`Nexus CLI安装失败: ${error.message}`);
            console.log('请手动安装: curl https://cli.nexus.xyz/ | sh');
        }
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

    async createNexusSession(nodeId, sessionName) {
        console.log(`创建Screen会话: ${sessionName}`);
        
        try {
            const execAsync = promisify(exec);
            
            // 创建日志目录
            const logDir = path.join(process.cwd(), 'logs');
            try {
                await fs.mkdir(logDir, { recursive: true });
            } catch (error) {
                // 目录已存在，忽略错误
            }
            
            const logFile = path.join(logDir, `${sessionName}.log`);
            
            // 创建screen会话并启动Nexus节点
            const screenCmd = `screen -dmS ${sessionName} -L -Logfile ${logFile} bash -c 'nexus-network start --node-id ${nodeId}; exec bash'`;
            
            console.log(`  执行: ${screenCmd}`);
            await execAsync(screenCmd);
            
            // 等待会话启动
            await this.sleep(2000);
            
            // 验证会话是否创建成功
            try {
                await execAsync(`screen -list | grep ${sessionName}`);
                console.log(`✓ 会话 ${sessionName} 创建成功`);
                
                // 保存会话信息
                const sessionInfo = {
                    name: sessionName,
                    nodeId: nodeId,
                    logFile: logFile,
                    startTime: new Date(),
                    pid: await this.getSessionPid(sessionName)
                };
                
                this.sessions.push(sessionInfo);
                this.nodeConfigs.push({ nodeId, sessionName });
                
                return sessionInfo;
            } catch (error) {
                throw new Error(`会话创建失败: ${error.message}`);
            }
            
        } catch (error) {
            console.error(`创建会话失败: ${error.message}`);
            throw error;
        }
    }

    async getSessionPid(sessionName) {
        try {
            const execAsync = promisify(exec);
            const { stdout } = await execAsync(`screen -list | grep ${sessionName} | awk '{print $1}' | cut -d'.' -f1`);
            return stdout.trim();
        } catch (error) {
            return null;
        }
    }

    async getSessionStatus(sessionName) {
        try {
            const execAsync = promisify(exec);
            await execAsync(`screen -list | grep ${sessionName}`);
            return 'running';
        } catch (error) {
            return 'stopped';
        }
    }

    async sendCommandToSession(sessionName, command) {
        try {
            const execAsync = promisify(exec);
            await execAsync(`screen -S ${sessionName} -p 0 -X stuff "${command}\n"`);
            return true;
        } catch (error) {
            console.log(`发送命令到会话失败: ${error.message}`);
            return false;
        }
    }

    async startNodes(config) {
        console.log(`\n开始创建${config.num_nodes}个Nexus节点...`);
        
        for (let i = 0; i < config.node_ids.length; i++) {
            const nodeId = config.node_ids[i];
            const sessionName = `nexus-node-${i + 1}`;
            
            try {
                const sessionInfo = await this.createNexusSession(nodeId, sessionName);
                console.log(`✓ 节点 ${i + 1} 创建成功 (会话: ${sessionName}, PID: ${sessionInfo.pid})`);
                await this.sleep(1000); // 给会话一些启动时间
            } catch (error) {
                console.log(`✗ 节点 ${i + 1} 创建失败: ${error.message}`);
            }
        }
    }

    async showSessionDetails(sessionIndex) {
        const session = this.sessions[sessionIndex];
        if (!session) {
            console.log('会话不存在');
            return;
        }

        try {
            const status = await this.getSessionStatus(session.name);
            const currentPid = await this.getSessionPid(session.name);
            
            console.log(`\n=== 节点 ${sessionIndex + 1} 详细信息 ===`);
            console.log(`会话名称: ${session.name}`);
            console.log(`节点ID: ${session.nodeId}`);
            console.log(`状态: ${status}`);
            console.log(`启动时间: ${session.startTime.toLocaleString()}`);
            console.log(`PID: ${currentPid || session.pid || '未知'}`);
            console.log(`日志文件: ${session.logFile}`);
            
            // 获取进程资源使用情况
            if (currentPid && status === 'running') {
                try {
                    const execAsync = promisify(exec);
                    
                    // 获取CPU和内存使用情况
                    const { stdout: psOutput } = await execAsync(`ps -p ${currentPid} -o %cpu,%mem,etime --no-headers`);
                    if (psOutput.trim()) {
                        const [cpu, mem, etime] = psOutput.trim().split(/\s+/);
                        console.log(`CPU使用率: ${cpu}%`);
                        console.log(`内存使用率: ${mem}%`);
                        console.log(`运行时间: ${etime}`);
                    }
                    
                    // 获取进程树
                    try {
                        const { stdout: childrenOutput } = await execAsync(`pgrep -P ${currentPid}`);
                        if (childrenOutput.trim()) {
                            const children = childrenOutput.trim().split('\n');
                            console.log(`子进程数量: ${children.length}`);
                        }
                    } catch (error) {
                        // 没有子进程是正常的
                    }
                    
                } catch (error) {
                    console.log(`获取进程信息失败: ${error.message}`);
                }
            }
            
        } catch (error) {
            console.log(`获取会话详情失败: ${error.message}`);
        }
    }

    async showSessionLogs(sessionIndex, lines = 50) {
        const session = this.sessions[sessionIndex];
        if (!session) {
            console.log('会话不存在');
            return;
        }

        try {
            console.log(`\n=== 节点 ${sessionIndex + 1} 最新 ${lines} 行日志 ===`);
            
            // 检查日志文件是否存在
            try {
                await fs.access(session.logFile);
            } catch (error) {
                console.log('日志文件不存在');
                return;
            }
            
            const execAsync = promisify(exec);
            const { stdout } = await execAsync(`tail -n ${lines} "${session.logFile}"`);
            
            if (stdout.trim()) {
                console.log(stdout);
            } else {
                console.log('暂无日志');
            }
        } catch (error) {
            console.log(`获取日志失败: ${error.message}`);
        }
    }

    async restartSession(sessionIndex) {
        const session = this.sessions[sessionIndex];
        if (!session) {
            console.log('会话不存在');
            return;
        }

        try {
            console.log(`正在重启节点 ${sessionIndex + 1}...`);
            const execAsync = promisify(exec);
            
            // 停止旧会话
            try {
                await execAsync(`screen -S ${session.name} -X quit`);
                console.log(`  旧会话已停止`);
            } catch (error) {
                // 会话可能已经停止
            }
            
            // 等待会话完全停止
            await this.sleep(2000);
            
            // 创建新会话
            const screenCmd = `screen -dmS ${session.name} -L -Logfile ${session.logFile} bash -c 'nexus-network start --node-id ${session.nodeId}; exec bash'`;
            await execAsync(screenCmd);
            
            // 更新会话信息
            session.startTime = new Date();
            session.pid = await this.getSessionPid(session.name);
            
            console.log(`✓ 节点 ${sessionIndex + 1} 重启成功 (新PID: ${session.pid})`);
        } catch (error) {
            console.log(`✗ 重启失败: ${error.message}`);
        }
    }

    async showSessionOverview() {
        console.clear();
        console.log('='.repeat(80));
        console.log(`                    Nexus节点概览 - ${new Date().toLocaleString()}`);
        console.log('='.repeat(80));
        
        if (this.sessions.length === 0) {
            console.log('暂无运行中的会话');
            return;
        }

        for (let i = 0; i < this.sessions.length; i++) {
            const session = this.sessions[i];
            try {
                const status = await this.getSessionStatus(session.name);
                const currentPid = await this.getSessionPid(session.name);
                
                // 状态指示器
                const statusIcon = status === 'running' ? '🟢' : '🔴';
                
                console.log(`\n${statusIcon} 节点 ${i + 1} (${session.name})`);
                console.log(`   状态: ${status}`);
                console.log(`   节点ID: ${session.nodeId}`);
                console.log(`   PID: ${currentPid || '未知'}`);
                console.log(`   运行时间: ${this.getUptime(session.startTime.toISOString())}`);
                
                // 获取进程内存使用情况
                if (currentPid && status === 'running') {
                    try {
                        const execAsync = promisify(exec);
                        const { stdout: psOutput } = await execAsync(`ps -p ${currentPid} -o %mem --no-headers`);
                        if (psOutput.trim()) {
                            const memPercent = parseFloat(psOutput.trim());
                            console.log(`   内存: ${memPercent.toFixed(1)}%`);
                        }
                    } catch (error) {
                        // 忽略获取内存信息失败
                    }
                }
                
                // 获取最新日志
                try {
                    await fs.access(session.logFile);
                    const execAsync = promisify(exec);
                    const { stdout: logOutput } = await execAsync(`tail -n 1 "${session.logFile}"`);
                    
                    if (logOutput.trim()) {
                        const truncatedLog = logOutput.trim().length > 60 ? 
                            logOutput.trim().substring(0, 60) + '...' : logOutput.trim();
                        console.log(`   最新: ${truncatedLog}`);
                    }
                } catch (error) {
                    console.log(`   最新: 暂无日志`);
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
            console.log('\n📋 会话管理菜单:');
            console.log('1. 查看所有会话概览');
            console.log('2. 查看特定会话详情');
            console.log('3. 查看特定会话日志');
            console.log('4. 重启特定会话');
            console.log('5. 自动监控模式');
            console.log('6. 发送命令到会话');
            console.log('0. 退出程序');
            
            const choice = await this.question('\n请选择操作 (0-6): ');
            
            switch (choice) {
                case '1':
                    await this.showSessionOverview();
                    break;
                    
                case '2':
                    if (this.sessions.length === 0) {
                        console.log('暂无会话');
                        break;
                    }
                    const detailIndex = await this.question(`请输入会话编号 (1-${this.sessions.length}): `);
                    const index = parseInt(detailIndex) - 1;
                    if (index >= 0 && index < this.sessions.length) {
                        await this.showSessionDetails(index);
                    } else {
                        console.log('无效的会话编号');
                    }
                    break;
                    
                case '3':
                    if (this.sessions.length === 0) {
                        console.log('暂无会话');
                        break;
                    }
                    const logIndex = await this.question(`请输入会话编号 (1-${this.sessions.length}): `);
                    const logLines = await this.question('显示行数 (默认50): ') || '50';
                    const lIndex = parseInt(logIndex) - 1;
                    if (lIndex >= 0 && lIndex < this.sessions.length) {
                        await this.showSessionLogs(lIndex, parseInt(logLines));
                    } else {
                        console.log('无效的会话编号');
                    }
                    break;
                    
                case '4':
                    if (this.sessions.length === 0) {
                        console.log('暂无会话');
                        break;
                    }
                    const restartIndex = await this.question(`请输入会话编号 (1-${this.sessions.length}): `);
                    const rIndex = parseInt(restartIndex) - 1;
                    if (rIndex >= 0 && rIndex < this.sessions.length) {
                        await this.restartSession(rIndex);
                    } else {
                        console.log('无效的会话编号');
                    }
                    break;
                    
                case '5':
                    await this.autoMonitorMode();
                    break;
                    
                case '6':
                    if (this.sessions.length === 0) {
                        console.log('暂无会话');
                        break;
                    }
                    const cmdIndex = await this.question(`请输入会话编号 (1-${this.sessions.length}): `);
                    const cIndex = parseInt(cmdIndex) - 1;
                    if (cIndex >= 0 && cIndex < this.sessions.length) {
                        const command = await this.question('请输入要发送的命令: ');
                        if (command.trim()) {
                            const success = await this.sendCommandToSession(this.sessions[cIndex].name, command);
                            if (success) {
                                console.log('✓ 命令发送成功');
                            } else {
                                console.log('✗ 命令发送失败');
                            }
                        }
                    } else {
                        console.log('无效的会话编号');
                    }
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
            await this.showSessionOverview();
            
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
        await this.showSessionOverview();
        
        // 进入交互式菜单
        await this.showInteractiveMenu();
    }

    async cleanup() {
        console.log('\n清理会话...');
        const execAsync = promisify(exec);
        
        for (const session of this.sessions) {
            try {
                // 停止screen会话
                await execAsync(`screen -S ${session.name} -X quit`);
                console.log(`✓ 会话已清理: ${session.name}`);
            } catch (error) {
                console.log(`✗ 清理会话失败: ${session.name} - ${error.message}`);
            }
        }
        
        // 清理日志文件 (可选)
        const cleanLogs = await this.question('是否要删除日志文件? (y/n): ');
        if (cleanLogs.toLowerCase() === 'y') {
            for (const session of this.sessions) {
                try {
                    await fs.unlink(session.logFile);
                    console.log(`✓ 日志文件已删除: ${session.logFile}`);
                } catch (error) {
                    console.log(`✗ 删除日志文件失败: ${session.logFile}`);
                }
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
            
            // 1. 检查并安装Screen
            if (!(await this.checkScreenInstalled())) {
                const installChoice = await this.question('是否要安装Screen? (y/n): ');
                if (installChoice.toLowerCase() === 'y') {
                    await this.installScreen();
                } else {
                    console.log('需要Screen才能继续');
                    process.exit(1);
                }
            }
            
            // 2. 检查并安装Nexus CLI
            if (!(await this.checkNexusInstalled())) {
                const installChoice = await this.question('是否要安装Nexus CLI? (y/n): ');
                if (installChoice.toLowerCase() === 'y') {
                    await this.installNexus();
                    console.log('请重新运行脚本以使用Nexus CLI');
                    process.exit(0);
                } else {
                    console.log('需要Nexus CLI才能继续');
                    process.exit(1);
                }
            }
            
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
        const cleanupChoice = await this.question('\n是否要清理所有会话? (y/n): ');
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