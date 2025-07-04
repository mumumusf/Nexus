const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

class NexusMultiRunner {
    constructor() {
        this.containers = [];
        this.nodeCount = 0;
        this.nodeId = '';
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    // 检测系统资源
    async checkSystemResources() {
        console.log('🔍 检测系统资源...');
        
        try {
            const platform = process.platform;
            let totalMemoryGB, cpuCores;
            
            if (platform === 'win32') {
                // Windows
                const memoryInfo = await this.execCommand('wmic computersystem get TotalPhysicalMemory /value');
                const memoryMatch = memoryInfo.match(/TotalPhysicalMemory=(\d+)/);
                totalMemoryGB = Math.floor(parseInt(memoryMatch[1]) / (1024 * 1024 * 1024));
                
                const cpuInfo = await this.execCommand('wmic cpu get NumberOfCores /value');
                const cpuMatch = cpuInfo.match(/NumberOfCores=(\d+)/);
                cpuCores = parseInt(cpuMatch[1]);
                
            } else if (platform === 'linux') {
                // Linux
                const memoryInfo = await this.execCommand('free -b | grep "Mem:" | awk \'{print $2}\'');
                totalMemoryGB = Math.floor(parseInt(memoryInfo.trim()) / (1024 * 1024 * 1024));
                
                const cpuInfo = await this.execCommand('nproc');
                cpuCores = parseInt(cpuInfo.trim());
                
            } else if (platform === 'darwin') {
                // macOS
                const memoryInfo = await this.execCommand('sysctl -n hw.memsize');
                totalMemoryGB = Math.floor(parseInt(memoryInfo.trim()) / (1024 * 1024 * 1024));
                
                const cpuInfo = await this.execCommand('sysctl -n hw.ncpu');
                cpuCores = parseInt(cpuInfo.trim());
                
            } else {
                throw new Error('不支持的操作系统');
            }
            
            // 建议节点数量（每个节点需要3GB内存）
            const recommendedNodes = Math.floor(totalMemoryGB / 3);
            
            console.log(`💾 总内存: ${totalMemoryGB}GB`);
            console.log(`🖥️  CPU核心数: ${cpuCores}`);
            console.log(`🎯 建议节点数: ${recommendedNodes}个 (每个节点需要3GB内存)`);
            console.log(`🖥️  检测到操作系统: ${platform}`);
            
            return { totalMemoryGB, cpuCores, recommendedNodes };
        } catch (error) {
            console.error('❌ 检测系统资源失败:', error.message);
            console.log('⚠️  使用默认值：8GB内存，4CPU核心，建议2个节点');
            return { totalMemoryGB: 8, cpuCores: 4, recommendedNodes: 2 };
        }
    }

    // 执行命令的Promise封装
    execCommand(command) {
        return new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(stdout);
                }
            });
        });
    }

    // 检查Docker是否安装
    async checkDockerInstallation() {
        console.log('🐳 检查Docker安装状态...');
        
        try {
            await this.execCommand('docker --version');
            console.log('✅ Docker已安装');
            return true;
        } catch (error) {
            console.log('❌ Docker未安装');
            const install = await this.getUserInput('是否要自动安装Docker? (y/n): ');
            if (install.toLowerCase() === 'y') {
                return await this.installDocker();
            } else {
                console.log('请手动安装Docker或输入: curl -fsSL https://get.docker.com | bash');
                return false;
            }
        }
    }

    // 自动安装Docker
    async installDocker() {
        console.log('🚀 开始安装Docker...');
        
        try {
            const platform = process.platform;
            
            if (platform === 'win32') {
                console.log('🔧 在Windows上，建议手动安装Docker Desktop');
                console.log('下载地址: https://www.docker.com/products/docker-desktop');
                console.log('或使用winget安装: winget install Docker.DockerDesktop');
                return false;
            } else {
                // Linux/macOS
                await this.execCommand('curl -fsSL https://get.docker.com | bash');
                console.log('✅ Docker安装成功');
                
                // 启动Docker服务 (仅Linux)
                if (platform === 'linux') {
                    try {
                        await this.execCommand('systemctl start docker');
                        await this.execCommand('systemctl enable docker');
                        console.log('✅ Docker服务已启动');
                    } catch (err) {
                        console.log('⚠️ 启动Docker服务失败，请手动启动');
                    }
                }
                
                return true;
            }
        } catch (error) {
            console.error('❌ Docker安装失败:', error.message);
            console.log('请手动安装Docker: curl -fsSL https://get.docker.com | bash');
            return false;
        }
    }

    // 拉取Ubuntu 24.04镜像
    async pullUbuntuImage() {
        console.log('📥 拉取Ubuntu 24.04镜像...');
        
        try {
            await this.execCommand('docker pull ubuntu:24.04');
            console.log('✅ Ubuntu 24.04镜像拉取成功');
            return true;
        } catch (error) {
            console.error('❌ 拉取Ubuntu 24.04镜像失败:', error.message);
            return false;
        }
    }

    // 初始化环境
    async initializeEnvironment() {
        console.log('\n🔧 开始初始化环境...');
        
        // 检查并安装Docker
        if (!(await this.checkDockerInstallation())) {
            console.log('❌ Docker安装失败，无法继续');
            return false;
        }
        
        // 拉取Ubuntu 24.04镜像
        if (!(await this.pullUbuntuImage())) {
            console.log('❌ 镜像拉取失败，无法继续');
            return false;
        }
        
        console.log('✅ 环境初始化完成！');
        console.log('💡 提示：现在可以使用"开始部署节点"功能来创建nexus节点');
        return true;
    }

    // 创建单个交互式容器
    async createInteractiveContainer() {
        console.log('\n🎯 创建交互式容器...');
        
        const containerName = await this.getUserInput('请输入容器名称 (默认: nexus-ubuntu24): ') || 'nexus-ubuntu24';
        
        // 获取用户主目录
        const homeDir = process.env.HOME || process.env.USERPROFILE || '/root';
        
        const createCommand = `docker run -it --name ${containerName} -v ${homeDir}:/workspace ubuntu:24.04 bash`;
        
        console.log(`🚀 创建交互式容器: ${containerName}`);
        console.log(`📁 主机目录 ${homeDir} 将挂载到容器的 /workspace`);
        console.log('💡 进入容器后，运行以下命令安装基础环境:');
        console.log('apt update');
        console.log('apt install -y curl wget git build-essential libssl-dev');
        console.log('apt install -y screen');
        console.log('然后运行: curl -L https://cli.nexus.xyz | sh');
        console.log('最后运行: screen -dmS nexus-your-node-id bash -c "~/.nexus/bin/nexus-network start --node-id your-node-id"');
        console.log('\n按 Ctrl+C 退出容器，返回主菜单\n');
        
        try {
            // 使用spawn来创建交互式进程
            const child = spawn('docker', ['run', '-it', '--name', containerName, '-v', `${homeDir}:/workspace`, 'ubuntu:24.04', 'bash'], {
                stdio: 'inherit',
                shell: true
            });
            
            return new Promise((resolve) => {
                child.on('close', (code) => {
                    console.log(`\n容器 ${containerName} 已退出`);
                    resolve(true);
                });
            });
        } catch (error) {
            console.error(`❌ 创建容器失败:`, error.message);
            return false;
        }
    }

    // 获取用户输入
    getUserInput(question) {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer);
            });
        });
    }

    // 创建Docker容器
    async createContainer(containerName, nodeId) {
        console.log(`🚀 创建容器: ${containerName}`);
        
        // 获取用户主目录
        const homeDir = process.env.HOME || process.env.USERPROFILE || '/root';
        
        const createCommand = `docker run -d --name ${containerName} \
            -m 3g --cpus="1" \
            -e NODE_ID=${nodeId} \
            -v ${homeDir}:/workspace \
            --restart unless-stopped \
            ubuntu:24.04 \
            tail -f /dev/null`;
        
        try {
            await this.execCommand(createCommand);
            console.log(`✅ 容器 ${containerName} 创建成功`);
            console.log(`📁 主机目录 ${homeDir} 已挂载到容器的 /workspace`);
            return true;
        } catch (error) {
            console.error(`❌ 容器 ${containerName} 创建失败:`, error.message);
            return false;
        }
    }

    // 在容器中执行命令
    async execInContainer(containerName, command) {
        const execCommand = `docker exec ${containerName} bash -c "${command}"`;
        return this.execCommand(execCommand);
    }

    // 在容器中安装nexus
    async installNexusInContainer(containerName) {
        console.log(`📦 在容器 ${containerName} 中安装nexus...`);
        
        try {
            console.log('🔄 更新包管理器...');
            await this.execInContainer(containerName, 'apt update');
            
            console.log('📦 安装基础系统工具...');
            await this.execInContainer(containerName, 'apt install -y curl wget git build-essential libssl-dev');
            
            console.log('📺 安装screen...');
            await this.execInContainer(containerName, 'apt install -y screen');
            
            console.log('🔍 验证screen安装...');
            try {
                const screenVersion = await this.execInContainer(containerName, 'screen --version');
                console.log('Screen版本:', screenVersion.trim());
            } catch (err) {
                console.log('⚠️ 无法验证screen版本，但继续安装过程');
            }
            
            console.log('⬇️ 下载并安装nexus CLI...');
            await this.execInContainer(containerName, 'curl -L https://cli.nexus.xyz | sh');
            
            console.log('🔍 验证nexus CLI安装...');
            try {
                const nexusPath = await this.execInContainer(containerName, 'ls -la ~/.nexus/bin/ 2>/dev/null || echo "nexus未安装"');
                console.log('Nexus CLI文件:', nexusPath.trim());
            } catch (err) {
                console.log('⚠️ 无法验证nexus CLI安装');
            }
            
            console.log(`✅ 容器 ${containerName} 中nexus安装成功`);
            return true;
        } catch (error) {
            console.error(`❌ 容器 ${containerName} 中nexus安装失败:`, error.message);
            return false;
        }
    }

    // 在容器中运行nexus
    async runNexusInContainer(containerName, nodeId) {
        console.log(`🎯 在容器 ${containerName} 中运行nexus节点...`);
        
        try {
            // 1. 检查nexus是否已安装
            console.log('🔍 检查nexus安装状态...');
            try {
                const nexusVersion = await this.execInContainer(containerName, '~/.nexus/bin/nexus-network --version 2>/dev/null || echo "not installed"');
                console.log('Nexus版本:', nexusVersion.trim());
            } catch (err) {
                console.log('⚠️ 无法检查nexus版本');
            }
            
            // 2. 创建日志目录
            console.log('📁 创建日志目录...');
            await this.execInContainer(containerName, 'mkdir -p ~/.nexus/logs');
            
            // 3. 使用screen在后台运行nexus，并重定向输出到日志文件
            console.log('🚀 启动nexus节点...');
            const runCommand = `screen -dmS nexus-${nodeId} bash -c '~/.nexus/bin/nexus-network start --node-id ${nodeId} 2>&1 | tee ~/.nexus/logs/nexus-${nodeId}.log'`;
            await this.execInContainer(containerName, runCommand);
            
            // 4. 等待一下，然后检查进程是否启动
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            console.log('🔍 检查nexus进程状态...');
            try {
                const processes = await this.execInContainer(containerName, 'ps aux | grep nexus | grep -v grep');
                if (processes.trim()) {
                    console.log('✅ Nexus进程已启动:', processes.trim());
                } else {
                    console.log('⚠️ 未找到nexus进程');
                }
            } catch (err) {
                console.log('⚠️ 无法检查nexus进程');
            }
            
            // 5. 检查screen会话
            try {
                const screenSessions = await this.execInContainer(containerName, 'screen -ls');
                console.log('📺 Screen会话:', screenSessions.trim());
            } catch (err) {
                console.log('⚠️ 无法检查screen会话');
            }
            
            console.log(`✅ 容器 ${containerName} 中nexus节点启动命令已执行`);
            console.log(`📄 日志文件位置: ~/.nexus/logs/nexus-${nodeId}.log`);
            console.log(`📺 Screen会话名称: nexus-${nodeId}`);
            
            return true;
        } catch (error) {
            console.error(`❌ 容器 ${containerName} 中nexus节点启动失败:`, error.message);
            return false;
        }
    }

    // 查看容器日志
    async viewContainerLogs(containerName) {
        console.log(`📋 查看容器 ${containerName} 的日志:`);
        
        try {
            // 1. 查看Docker容器日志
            console.log('\n--- Docker容器日志 ---');
            try {
                const dockerLogs = await this.execCommand(`docker logs ${containerName} --tail 20`);
                console.log(dockerLogs || '暂无Docker日志');
            } catch (err) {
                console.log('无法获取Docker日志:', err.message);
            }
            
            // 2. 查看容器内进程
            console.log('\n--- 容器内进程 ---');
            try {
                const processes = await this.execInContainer(containerName, 'ps aux');
                console.log(processes || '暂无进程信息');
            } catch (err) {
                console.log('无法获取进程信息:', err.message);
            }
            
            // 3. 查看screen会话列表
            console.log('\n--- Screen会话列表 ---');
            try {
                const screenList = await this.execInContainer(containerName, 'screen -ls');
                console.log(screenList || '暂无screen会话');
            } catch (err) {
                console.log('无法获取screen会话:', err.message);
            }
            
            // 4. 查看nexus相关文件
            console.log('\n--- Nexus相关文件 ---');
            try {
                const nexusFiles = await this.execInContainer(containerName, 'ls -la ~/.nexus/ 2>/dev/null || echo "nexus目录不存在"');
                console.log(nexusFiles);
            } catch (err) {
                console.log('无法查看nexus文件:', err.message);
            }
            
            // 5. 查看nexus日志文件
            console.log('\n--- Nexus日志文件 ---');
            try {
                const nexusLogs = await this.execInContainer(containerName, 'find ~/.nexus -name "*.log" -exec tail -10 {} \\; 2>/dev/null || echo "暂无nexus日志文件"');
                console.log(nexusLogs || '暂无nexus日志');
            } catch (err) {
                console.log('无法读取nexus日志:', err.message);
            }
            
            // 6. 查看系统日志
            console.log('\n--- 系统日志 ---');
            try {
                const systemLogs = await this.execInContainer(containerName, 'tail -10 /var/log/syslog 2>/dev/null || dmesg | tail -10 2>/dev/null || echo "暂无系统日志"');
                console.log(systemLogs || '暂无系统日志');
            } catch (err) {
                console.log('无法获取系统日志:', err.message);
            }
            
        } catch (error) {
            console.error(`❌ 查看容器 ${containerName} 日志失败:`, error.message);
        }
    }

    // 主菜单
    async showMainMenu() {
        console.log('\n=== Nexus多开运行器 ===');
        console.log('1. 检测系统资源');
        console.log('2. 初始化环境(安装Docker+拉取镜像)');
        console.log('3. 创建交互式容器');
        console.log('4. 开始部署节点');
        console.log('5. 查看节点状态');
        console.log('6. 查看节点日志');
        console.log('7. 重启nexus节点');
        console.log('8. 停止所有节点');
        console.log('9. 退出');
        console.log('====================');
        
        const choice = await this.getUserInput('请选择操作 (1-9): ');
        
        switch (choice) {
            case '1':
                await this.checkSystemResources();
                break;
            case '2':
                await this.initializeEnvironment();
                break;
            case '3':
                await this.createInteractiveContainer();
                break;
            case '4':
                await this.deployNodes();
                break;
            case '5':
                await this.checkNodeStatus();
                break;
            case '6':
                await this.viewNodeLogs();
                break;
            case '7':
                await this.restartNexusNodes();
                break;
            case '8':
                await this.stopAllNodes();
                break;
            case '9':
                this.rl.close();
                process.exit(0);
                break;
            default:
                console.log('无效选择，请重新输入');
        }
        
        setTimeout(() => this.showMainMenu(), 2000);
    }

    // 部署节点
    async deployNodes() {
        console.log('\n🚀 开始部署nexus节点...');
        
        // 检查Docker
        if (!(await this.checkDockerInstallation())) {
            return;
        }
        
        // 拉取Ubuntu 24.04镜像
        if (!(await this.pullUbuntuImage())) {
            return;
        }
        
        // 检查系统资源
        const resources = await this.checkSystemResources();
        
        // 获取用户输入
        const nodeCount = await this.getUserInput(`请输入要部署的节点数量 (建议最多${resources.recommendedNodes}个): `);
        const baseNodeId = await this.getUserInput('请输入基础节点ID (将自动为每个节点添加后缀): ');
        
        this.nodeCount = parseInt(nodeCount);
        this.nodeId = baseNodeId;
        
        // 创建并部署节点
        for (let i = 0; i < this.nodeCount; i++) {
            const containerName = `nexus-node-${i + 1}`;
            const nodeId = `${baseNodeId}-${i + 1}`;
            
            console.log(`\n📦 部署节点 ${i + 1}/${this.nodeCount}...`);
            
            // 创建容器
            if (await this.createContainer(containerName, nodeId)) {
                // 等待容器启动
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // 安装nexus
                if (await this.installNexusInContainer(containerName)) {
                    // 运行nexus
                    await this.runNexusInContainer(containerName, nodeId);
                    
                    this.containers.push({
                        name: containerName,
                        nodeId: nodeId,
                        status: 'running'
                    });
                }
            }
        }
        
        console.log('\n✅ 节点部署完成！');
        console.log(`部署了 ${this.containers.length} 个节点`);
    }

    // 检查节点状态
    async checkNodeStatus() {
        console.log('\n📊 检查节点状态...');
        
        try {
            const containerList = await this.execCommand('docker ps -a --format "table {{.Names}}\t{{.Status}}"');
            console.log('容器状态:');
            console.log(containerList);
        } catch (error) {
            console.error('❌ 检查节点状态失败:', error.message);
        }
    }

    // 查看节点日志
    async viewNodeLogs() {
        console.log('\n📋 查看节点日志...');
        
        if (this.containers.length === 0) {
            console.log('暂无运行中的节点');
            return;
        }
        
        for (const container of this.containers) {
            console.log(`\n--- ${container.name} (${container.nodeId}) ---`);
            await this.viewContainerLogs(container.name);
        }
    }

    // 重启nexus节点
    async restartNexusNodes() {
        console.log('\n🔄 重启nexus节点...');
        
        try {
            // 获取所有nexus容器
            const containerList = await this.execCommand('docker ps -q --filter "name=nexus-node-"');
            const containerIds = containerList.trim().split('\n').filter(id => id.trim());
            
            if (containerIds.length === 0) {
                console.log('⚠️ 没有找到运行中的nexus节点');
                return;
            }
            
            console.log(`🔍 找到 ${containerIds.length} 个nexus容器`);
            
            for (const containerId of containerIds) {
                try {
                    // 获取容器名称
                    const containerName = await this.execCommand(`docker ps --format "{{.Names}}" --filter "id=${containerId}"`);
                    const name = containerName.trim();
                    
                    console.log(`\n🔄 重启容器 ${name}...`);
                    
                    // 停止容器中的nexus进程
                    console.log('🛑 停止nexus进程...');
                    try {
                        await this.execInContainer(name, 'pkill -f nexus-network');
                        await this.execInContainer(name, 'screen -wipe'); // 清理screen会话
                    } catch (err) {
                        console.log('⚠️ 停止进程时出现问题:', err.message);
                    }
                    
                    // 等待进程完全停止
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // 重新启动nexus
                    console.log('🚀 重新启动nexus...');
                    const nodeId = this.containers.find(c => c.name === name)?.nodeId || 'unknown';
                    await this.runNexusInContainer(name, nodeId);
                    
                    console.log(`✅ 容器 ${name} 重启完成`);
                    
                } catch (error) {
                    console.error(`❌ 重启容器 ${containerId} 失败:`, error.message);
                }
            }
            
            console.log('\n✅ 所有nexus节点重启完成');
            
        } catch (error) {
            console.error('❌ 重启节点失败:', error.message);
        }
    }

    // 停止所有节点
    async stopAllNodes() {
        console.log('\n🛑 停止所有节点...');
        
        try {
            // 停止所有nexus容器
            const stopCommand = 'docker stop $(docker ps -q --filter "name=nexus-node-") 2>/dev/null || echo "无运行中的容器"';
            await this.execCommand(stopCommand);
            
            // 删除所有nexus容器
            const removeCommand = 'docker rm $(docker ps -aq --filter "name=nexus-node-") 2>/dev/null || echo "无容器需要删除"';
            await this.execCommand(removeCommand);
            
            this.containers = [];
            console.log('✅ 所有节点已停止');
            
        } catch (error) {
            console.error('❌ 停止节点失败:', error.message);
        }
    }

    // 启动应用
    async start() {
        console.log('🎉 欢迎使用Nexus多开运行器！');
        console.log('这个工具可以帮助您在多个Docker容器中运行Nexus节点\n');
        
        // 显示主菜单
        await this.showMainMenu();
    }
}

// 启动应用
const runner = new NexusMultiRunner();
runner.start().catch(console.error); 