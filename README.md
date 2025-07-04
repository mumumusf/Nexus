# Yoyom - Nexus多开运行器

🚀 这是一个用于在多个Docker容器中运行Nexus节点的JavaScript脚本。

## 功能特点

- 🔍 **跨平台系统资源检测** - 自动检测CPU和内存，支持Windows/Linux/macOS
- 🐳 **Docker容器管理** - 自动创建和管理Ubuntu 24.04容器
- 📦 **自动安装** - 自动安装nexus CLI和必要依赖
- 🎯 **多节点部署** - 支持同时运行多个nexus节点
- 📋 **日志查看** - 实时查看每个节点的运行日志
- 🛑 **一键停止** - 快速停止所有节点

## 系统要求

- Node.js 14.0+ (推荐使用Node.js 22)
- npm (Node Package Manager)
- Docker Desktop
- 至少3GB内存（每个节点需要3GB内存）

### 为什么推荐使用nvm和Node.js 22？

- **版本管理**：nvm可以轻松管理多个Node.js版本
- **最新特性**：Node.js 22是最新的LTS版本，性能更好
- **避免权限问题**：nvm安装在用户目录，避免sudo权限问题
- **更好的npm版本**：自带npm 10.9.2，功能更完善
- **环境隔离**：不同项目可以使用不同的Node.js版本

## 安装和使用

1. **克隆项目**
   ```bash
   git clone https://github.com/mumumusf/Nexus
   cd Nexus
   ```

2. **安装Node.js和npm** (推荐使用nvm)
   
   **方法一：使用nvm管理Node.js版本（推荐）**
   ```bash
   # 1. 下载并安装nvm
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
   
   # 2. 重新加载shell配置
   source ~/.bashrc   # 如果使用bash
   source ~/.zshrc    # 如果使用zsh
   
   # 3. 安装Node.js 22
   nvm install 22
   nvm list
   
   # 4. 使用Node.js 22
   nvm use 22
   nvm alias default 22
   
   # 5. 验证安装
   node -v   # 预期输出: v22.13.1
   nvm current # 预期输出: v22.13.1
   npm -v    # 预期输出: 10.9.2
   ```
   
   **方法二：直接通过包管理器安装**
   ```bash
   # Ubuntu/Debian
   apt update
   apt install nodejs npm
   
   # CentOS/RHEL
   yum install nodejs npm
   
   # 检查版本
   node --version
   npm --version
   ```

3. **安装依赖**
   ```bash
   npm install
   ```

4. **启动脚本**
   ```bash
   npm start
   # 或者直接运行
   node yoyom.js
   ```

## 使用说明

### 主菜单选项

1. **检测系统资源** - 查看当前系统的CPU和内存情况
2. **初始化环境** - 自动安装Docker并拉取Ubuntu 24.04镜像
3. **创建交互式容器** - 创建单个交互式容器，可手动操作
4. **开始部署节点** - 创建并启动多个nexus节点
5. **查看节点状态** - 查看所有Docker容器的状态
6. **查看节点日志** - 查看每个节点的详细运行日志
7. **重启nexus节点** - 重启所有运行中的nexus节点
8. **清理冲突容器** - 清理所有nexus相关容器，解决名称冲突
9. **停止所有节点** - 停止并删除所有nexus容器
0. **退出** - 退出程序

### 部署流程

#### 首次使用
1. 选择"初始化环境"
   - 自动安装Docker（Linux/macOS）或提示手动安装（Windows）
   - 拉取Ubuntu 24.04镜像

#### 自动部署多节点
1. 选择"开始部署节点"
2. 输入要部署的节点数量（建议根据系统资源提示）
3. 输入基础节点ID（例如：my-nexus-node）
4. 脚本会自动：
   - 创建Docker容器（Ubuntu 24.04）
   - 挂载主机目录到容器的/workspace
   - 安装基础运行环境（curl, wget, git, screen, build-essential, libssl-dev）
   - 安装nexus CLI
   - 启动nexus节点
   - 使用screen保持后台运行

#### 手动创建单个容器
1. 选择"创建交互式容器"
2. 输入容器名称
3. 容器创建后会自动进入bash终端
4. 手动运行安装命令：
   ```bash
   # 更新包管理器
   apt update
   
   # 安装基础工具
   apt install -y curl wget git build-essential libssl-dev
   
   # 安装screen（重要：用于后台运行）
   apt install -y screen
   
   # 安装nexus CLI
   curl -L https://cli.nexus.xyz | sh
   
   # 使用screen后台运行nexus
   screen -dmS nexus-your-node-id bash -c "~/.nexus/bin/nexus-network start --node-id your-node-id"
   
   # 查看screen会话
   screen -ls
   
   # 连接到nexus会话
   screen -r nexus-your-node-id
   ```

### 节点命名规则

- 容器名称：`nexus-node-1`, `nexus-node-2`, ...
- 节点ID：`your-base-id-1`, `your-base-id-2`, ...

## 容器配置

每个容器的配置：
- **操作系统**: Ubuntu 24.04
- **内存限制**: 3GB
- **CPU限制**: 1核心
- **重启策略**: 除非手动停止
- **挂载目录**: 主机目录挂载到容器的/workspace
- **基础环境**: curl, wget, git, build-essential, libssl-dev, screen (单独安装确保可用)

## 常见问题

### npm未安装
如果出现 `Command 'npm' not found` 错误：

**推荐方案：使用nvm**
```bash
# 1. 安装nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc

# 2. 安装Node.js 22
nvm install 22
nvm use 22
nvm alias default 22

# 3. 验证安装
node -v      # 预期输出: v22.13.1
npm -v       # 预期输出: 10.9.2
```

**快速方案：直接安装**
```bash
# Ubuntu/Debian
apt update
apt install nodejs npm

# CentOS/RHEL
yum install nodejs npm

# 验证安装
node --version
npm --version
```

**或者直接运行脚本**：
```bash
# 如果只安装了Node.js，可以直接运行
node yoyom.js
```

### Docker未安装
- **Windows**: 建议手动安装Docker Desktop或使用 `winget install Docker.DockerDesktop`
- **Linux/macOS**: 脚本会自动安装，或手动运行 `curl -fsSL https://get.docker.com | bash`

### 内存不足
如果系统内存不足，建议减少节点数量或升级硬件。

### 节点无法启动
1. 检查Docker是否正常运行
2. 确认网络连接正常
3. 查看容器日志排查问题

### 环境初始化失败
1. 确保有网络连接
2. 检查Docker是否正常运行
3. 重新运行"初始化环境"选项

### 交互式容器使用
进入交互式容器后：
- 使用 `exit` 退出容器
- 容器内的 `/workspace` 目录对应主机目录
- 可以在容器内直接编辑主机文件

### nvm相关问题
如果nvm安装后无法使用：
```bash
# 1. 重新加载配置文件
source ~/.bashrc
# 或者
source ~/.zshrc

# 2. 验证nvm是否可用
nvm --version

# 3. 如果还是不行，手动添加到shell配置
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc
echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.bashrc
echo '[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"' >> ~/.bashrc
source ~/.bashrc
```

### Node.js版本问题
如果需要切换Node.js版本：
```bash
# 查看已安装的版本
nvm list

# 切换到特定版本
nvm use 22

# 设置默认版本
nvm alias default 22

# 查看当前使用的版本
nvm current
```

### 系统资源检测失败
如果系统资源检测失败，脚本会使用默认值（8GB内存，4CPU核心，建议2个节点）。

不同操作系统的检测方式：
- **Windows**: 使用`wmic`命令
- **Linux**: 使用`free`和`nproc`命令
- **macOS**: 使用`sysctl`命令

如果检测失败，通常是因为缺少必要的系统工具，可以手动安装：
```bash
# Linux - 安装必要工具
apt update
apt install procps coreutils

# 或者忽略检测失败，直接使用默认值
```

### 节点日志问题
如果查看节点日志时遇到问题，脚本会显示多种类型的日志：

1. **Docker容器日志** - 容器启动和运行日志
2. **容器内进程** - 查看正在运行的进程
3. **Screen会话列表** - 后台运行的screen会话
4. **Nexus相关文件** - ~/.nexus目录下的文件
5. **Nexus日志文件** - 实际的nexus运行日志
6. **系统日志** - 系统级别的错误信息

### 节点重启功能
如果nexus节点停止响应或出现问题，可以使用"重启nexus节点"功能：
- 自动停止所有nexus进程
- 清理screen会话
- 重新启动nexus节点
- 保持容器运行状态

### Screen相关问题
如果screen命令失败，通常是因为screen未正确安装：

```bash
# 检查screen是否安装
docker exec container-name which screen

# 如果未安装，手动安装
docker exec container-name apt update
docker exec container-name apt install -y screen

# 验证安装
docker exec container-name screen --version

# 查看现有screen会话
docker exec container-name screen -ls

# 连接到特定会话
docker exec -it container-name screen -r session-name

# 创建新的后台会话
docker exec container-name screen -dmS nexus-test bash -c "echo 'test'; sleep 10"
```

### 容器名称冲突问题
如果遇到容器名称冲突错误（如 `Conflict. The container name "/nexus-node-1" is already in use`），有以下解决方案：

**自动解决（推荐）**：
- 使用脚本的"清理冲突容器"功能（选项8）
- 脚本会自动检测并询问是否删除现有容器

**手动解决**：
```bash
# 查看所有nexus容器
docker ps -a --filter "name=nexus"

# 停止特定容器
docker stop nexus-node-1

# 删除特定容器
docker rm nexus-node-1

# 或者一键清理所有nexus容器
docker stop $(docker ps -q --filter "name=nexus")
docker rm $(docker ps -aq --filter "name=nexus")
```

**预防措施**：
- 部署新节点前先使用"清理冲突容器"功能
- 定期清理不需要的容器

## 命令行操作

如果需要手动操作容器，可以使用以下命令：

```bash
# 查看容器列表
docker ps -a

# 进入容器
docker exec -it nexus-node-1 bash

# 进入交互式容器
docker exec -it nexus-ubuntu24 bash

# 查看screen会话
screen -ls

# 连接到nexus会话
screen -r nexus-your-node-id-1

# 查看nexus日志
tail -f ~/.nexus/logs/nexus.log

# 手动创建容器并挂载目录
docker run -it --name my-nexus -v $HOME:/workspace ubuntu:24.04 bash

# 安装完整的基础环境
apt update
apt install -y curl wget git build-essential libssl-dev

# 安装screen（后台运行必需）
apt install -y screen

# 验证screen安装
screen --version

# 安装nexus CLI
curl -L https://cli.nexus.xyz | sh

# 使用screen后台启动nexus节点
screen -dmS nexus-your-node-id bash -c "~/.nexus/bin/nexus-network start --node-id your-node-id 2>&1 | tee ~/.nexus/logs/nexus.log"

# 查看screen会话
screen -ls

# 连接到nexus会话
screen -r nexus-your-node-id
```

## 安全提示

- 请确保Docker Desktop正常运行
- 定期备份重要数据
- 监控系统资源使用情况
- 建议在防火墙后运行

## 快速开始

### Ubuntu环境快速启动
如果你正在Ubuntu环境中，按照以下步骤快速开始：

**推荐方案（使用nvm）**：
```bash
# 1. 安装nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc

# 2. 安装Node.js 22
nvm install 22
nvm use 22
nvm alias default 22

# 3. 验证安装
node -v      # 预期输出: v22.13.1
npm -v       # 预期输出: 10.9.2

# 4. 运行脚本
node yoyom.js
# 或者
npm start
```

**快速方案（直接安装）**：
```bash
# 1. 安装Node.js和npm
apt update
apt install nodejs npm

# 2. 验证安装
node --version
npm --version

# 3. 运行脚本
node yoyom.js
# 或者
npm start
```

### 第一次使用
1. 安装Node.js: 使用nvm（推荐）或直接安装 `apt install nodejs npm`
2. 运行脚本: `npm start` 或 `node yoyom.js`
3. 选择"初始化环境"（选项2）
4. 等待Docker安装和镜像拉取完成
5. 选择"开始部署节点"（选项4）
6. 输入节点数量和基础节点ID
7. 等待自动部署完成

### 手动操作
1. 安装Node.js: 使用nvm（推荐）或直接安装 `apt install nodejs npm`
2. 运行脚本: `npm start` 或 `node yoyom.js`
3. 选择"创建交互式容器"（选项3）
4. 进入容器后手动安装和配置
5. 使用 `exit` 退出容器返回主菜单

## 支持

如果遇到问题，请检查：
1. Docker是否正常运行
2. 网络连接是否正常
3. 系统资源是否充足
4. 节点ID是否正确

## 相关项目

- [Nexus项目仓库](https://github.com/mumumusf/Nexus) - 相关的Nexus实现和工具

## 版本信息

- 项目名称: Yoyom
- 版本: 1.0.1
- 推荐Node.js版本: 22.13.1
- 推荐npm版本: 10.9.2
- 支持的Nexus版本: 最新版本
- 测试环境: Windows 10/11 + Docker Desktop, Linux + Docker CE, macOS + Docker Desktop

## 更新日志

### v1.0.1 (最新)
- ✅ 修复Linux环境下系统资源检测失败的问题
- ✅ 添加跨平台系统资源检测（Windows/Linux/macOS）
- ✅ 增强日志查看功能，支持多种日志类型
- ✅ 添加nexus节点重启功能
- ✅ 改进nexus启动流程，增加进程状态检查
- ✅ 单独安装screen确保后台运行可用
- ✅ 添加screen安装验证和故障排除
- ✅ 添加容器名称冲突自动检测和处理
- ✅ 新增"清理冲突容器"功能
- ✅ 添加详细的故障排除指南

### v1.0.0
- 🎉 初始版本发布
- ✅ 自动Docker安装（Linux/macOS）
- ✅ 主机目录挂载
- ✅ 交互式容器创建
- ✅ 完整的基础环境安装
- ✅ nvm版本管理支持 