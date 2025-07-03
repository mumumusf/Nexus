# Nexus 容器运行脚本

这是一个自动化脚本，用于在Docker容器中安装和运行Nexus CLI节点。

📥 **仓库地址**: [https://github.com/mumumusf/Nexus](https://github.com/mumumusf/Nexus)

## 快速开始

```bash
# 克隆项目到VPS
git clone https://github.com/mumumusf/Nexus.git

# 进入项目目录
cd Nexus

# 给脚本添加执行权限
chmod +x nexus_container_runner.sh

# 运行脚本
./nexus_container_runner.sh
```

按照提示输入容器数量和节点ID，脚本会自动处理所有安装和配置工作！

## 功能特性

- 🐳 自动检测并安装Docker
- 🖥️ 智能检测系统资源（CPU和内存）
- 🚀 支持运行多个Nexus节点容器
- 🎯 自动配置节点ID
- 📊 实时显示容器状态
- 🛠️ 提供容器管理命令
- ⚙️ 确保GLIBC 2.39兼容性支持

## 系统要求

- Linux系统（Ubuntu/CentOS）或macOS
- 至少1GB可用内存
- 至少1个CPU核心
- 网络连接
- **自动确保GLIBC 2.39支持**（脚本使用Ubuntu 24.04镜像）

## Windows用户注意

Windows用户可以通过以下方式运行此脚本：

### 方法一：使用Windows启动器脚本（推荐）
```powershell
# 首先克隆项目
git clone https://github.com/mumumusf/Nexus.git
cd Nexus

# 运行Windows启动器
.\run_nexus_windows.ps1
```

该启动器会自动检测您的环境并选择最佳运行方式。

### 方法二：手动选择环境
1. **WSL (Windows Subsystem for Linux)** - 推荐
2. **Git Bash**
3. **Docker Desktop + PowerShell**

### WSL安装方法
```powershell
# 以管理员身份运行PowerShell
wsl --install
# 重启计算机后，设置Ubuntu用户名和密码
```

### Git Bash使用方法
1. 下载并安装 Git for Windows: https://git-scm.com/download/win
2. 右键点击文件夹，选择"Git Bash Here"
3. 克隆项目：
   ```bash
   git clone https://github.com/mumumusf/Nexus.git
   cd Nexus
   ```
4. 运行脚本：`./nexus_container_runner.sh`

## 使用方法

### 1. 克隆项目
```bash
git clone https://github.com/mumumusf/Nexus.git
cd Nexus
```

### 2. 给脚本添加可执行权限
```bash
chmod +x nexus_container_runner.sh
```

### 3. 运行脚本
```bash
./nexus_container_runner.sh
```

### 4. 按照提示操作
脚本会自动：
1. 检测操作系统
2. 安装Docker（如果未安装）
3. 检测系统资源
4. 建议合适的容器数量
5. 要求输入容器数量和节点ID

## 脚本执行流程

1. **环境检测**: 检查操作系统和Docker安装状态
2. **Docker安装**: 如果Docker未安装，自动安装
3. **资源检测**: 检测CPU核心数和内存大小
4. **用户交互**: 
   - 输入要运行的容器数量
   - 输入基础节点ID（默认：6520503）
5. **容器启动**: 启动指定数量的容器（使用Ubuntu 24.04确保GLIBC 2.39支持）
6. **GLIBC检查**: 验证每个容器的GLIBC版本兼容性
7. **Nexus安装**: 在每个容器中自动安装和运行Nexus CLI
8. **初始化等待**: 等待容器初始化完成（约10秒）
9. **日志摘要**: 显示所有容器的初始化日志摘要
10. **交互式管理**: 可选择进入交互式日志管理模式

## 容器管理命令

脚本执行完成后，会提供以下管理命令：

```bash
# 查看所有Nexus容器
docker ps --filter 'name=nexus-node-'

# 查看特定容器日志
docker logs nexus-node-1

# 进入容器交互模式
docker exec -it nexus-node-1 /bin/bash

# 停止所有Nexus容器
docker stop $(docker ps -q --filter 'name=nexus-node-')

# 删除所有Nexus容器
docker rm -f $(docker ps -aq --filter 'name=nexus-node-')
```

## 交互式日志管理

脚本完成后会询问是否进入交互式日志管理模式，提供以下功能：

### 1. 查看容器日志
- **选项0**: 查看所有容器日志摘要（最新10行）
- **选项1-N**: 查看指定容器的实时日志
- **选项q**: 退出日志查看

### 2. 查看所有容器状态
显示所有Nexus容器的当前状态、创建时间等信息

### 3. 重启失败的容器
自动检测并重启已停止的容器

### 4. 退出日志管理
返回到命令行

### 日志查看示例
```bash
[STEP] 选择要查看日志的容器：
0. 查看所有容器日志摘要
1. nexus-node-1 (Up 2 minutes)
2. nexus-node-2 (Up 2 minutes) 
3. nexus-node-3 (Up 2 minutes)
q. 退出日志查看

[STEP] 请输入选择 (0-3, q): 1

[INFO] 显示容器 nexus-node-1 的详细日志...
=== 实时日志 (按 Ctrl+C 退出) ===
[容器日志实时输出...]
```

### 日志内容说明

容器日志会显示以下信息：
- **安装阶段**: 系统包更新、依赖安装、Nexus CLI下载进度
- **兼容性检查**: GLIBC版本验证（确保≥2.39）
- **启动阶段**: 节点启动过程、初始化状态
- **运行阶段**: 节点运行状态、每5分钟的状态更新
- **错误信息**: 如果出现问题，会显示详细的错误信息

典型的日志输出示例：
```bash
====================
开始安装Nexus CLI...
节点ID: 6520503
====================
更新系统包...
安装依赖包...
下载Nexus CLI...
Nexus CLI安装完成

检查GLIBC版本...
当前GLIBC版本: 2.39
✓ GLIBC版本满足要求 (需要 ≥ 2.39)
✓ Nexus CLI安装成功
====================
启动Nexus网络节点...
节点ID: 6520503
====================
正在启动节点，这可能需要几分钟...
====================
Nexus节点启动完成!
节点ID: 6520503
====================
节点状态检查...
节点正在运行中...
使用 'docker logs <容器名>' 查看详细日志
Wed Jan 01 12:00:00 UTC 2024: 节点 6520503 正在运行...
```

## 示例运行

```bash
$ git clone https://github.com/mumumusf/Nexus.git
$ cd Nexus
$ chmod +x nexus_container_runner.sh
$ ./nexus_container_runner.sh

[INFO] === Nexus 容器运行脚本启动 ===
[INFO] 检测到操作系统: linux (ubuntu)
[STEP] 检查Docker安装状态...
[INFO] Docker已安装
[STEP] 检测系统资源...
[INFO] CPU核心数: 4
[INFO] 内存大小: 8GB
[INFO] 建议运行容器数量: 4

[STEP] 请输入要运行的容器数量 (建议: 4, 最大: 10): 
3

[INFO] 将运行 3 个容器

[STEP] 请输入基础节点ID (默认: 6520503): 
6520503

[INFO] 基础节点ID: 6520503
[STEP] 开始启动容器...
[STEP] 启动容器: nexus-node-1 (节点ID: 6520503)
[INFO] 容器 nexus-node-1 已启动
[STEP] 启动容器: nexus-node-2 (节点ID: 6520504)
[INFO] 容器 nexus-node-2 已启动
[STEP] 启动容器: nexus-node-3 (节点ID: 6520505)
[INFO] 容器 nexus-node-3 已启动

[INFO] === 所有容器启动完成 ===
```

## 故障排除

### Docker权限问题
如果遇到Docker权限问题，运行：
```bash
sudo usermod -aG docker $USER
newgrp docker
```

### 容器启动失败
检查系统资源是否充足：
```bash
docker system df
free -h
```

### 网络连接问题
确保能够访问外部网络：
```bash
curl -I https://cli.nexus.xyz
```

## 注意事项

- 每个容器会使用独立的节点ID（基础ID + 容器序号 - 1）
- 建议根据系统资源合理设置容器数量
- 容器会自动重启，除非手动停止
- 脚本会自动处理容器冲突（删除已存在的同名容器）
- **GLIBC兼容性**: 脚本自动使用Ubuntu 24.04镜像确保GLIBC 2.39支持

## 技术支持

如果遇到问题，请检查：
1. Docker是否正常运行：`docker --version`
2. 网络连接是否正常：`ping google.com`
3. 系统资源是否充足：`htop` 或 `top`
4. GLIBC版本兼容性：容器日志中会显示GLIBC版本检查结果

### GLIBC兼容性说明

脚本已优化以确保GLIBC 2.39兼容性：
- 使用Ubuntu 24.04 (Noble)作为基础镜像，内置GLIBC 2.39
- 自动检查每个容器的GLIBC版本
- 如果检测到版本不兼容，会在日志中显示警告信息 