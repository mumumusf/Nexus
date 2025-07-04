# Yoyom - Nexus多开运行器

🚀 这是一个用于在多个Docker容器中运行Nexus节点的JavaScript脚本。

## 功能特点

- 🔍 **系统资源检测** - 自动检测CPU和内存，建议最佳节点数量
- 🐳 **Docker容器管理** - 自动创建和管理Ubuntu 24.04容器
- 📦 **自动安装** - 自动安装nexus CLI和必要依赖
- 🎯 **多节点部署** - 支持同时运行多个nexus节点
- 📋 **日志查看** - 实时查看每个节点的运行日志
- 🛑 **一键停止** - 快速停止所有节点

## 系统要求

- Node.js 14.0+
- Docker Desktop
- 至少3GB内存（每个节点需要3GB内存）

## 安装和使用

1. **克隆项目**
   ```bash
   git clone https://github.com/mumumusf/Nexus
   cd Nexus
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动脚本**
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
6. **查看节点日志** - 查看每个节点的运行日志
7. **停止所有节点** - 停止并删除所有nexus容器
8. **退出** - 退出程序

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
   apt update && apt install -y curl wget git screen build-essential libssl-dev
   curl -L https://cli.nexus.xyz | sh
   ~/.nexus/bin/nexus-network start --node-id your-node-id
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
- **基础环境**: curl, wget, git, screen, build-essential, libssl-dev

## 常见问题

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
apt update && apt install -y curl wget git screen build-essential libssl-dev

# 安装nexus CLI
curl -L https://cli.nexus.xyz | sh

# 启动nexus节点
~/.nexus/bin/nexus-network start --node-id your-node-id
```

## 安全提示

- 请确保Docker Desktop正常运行
- 定期备份重要数据
- 监控系统资源使用情况
- 建议在防火墙后运行

## 快速开始

### 第一次使用
1. 运行脚本: `npm start` 或 `node yoyom.js`
2. 选择"初始化环境"（选项2）
3. 等待Docker安装和镜像拉取完成
4. 选择"开始部署节点"（选项4）
5. 输入节点数量和基础节点ID
6. 等待自动部署完成

### 手动操作
1. 运行脚本: `npm start` 或 `node yoyom.js`
2. 选择"创建交互式容器"（选项3）
3. 进入容器后手动安装和配置
4. 使用 `exit` 退出容器返回主菜单

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
- 版本: 1.0.0
- 支持的Nexus版本: 最新版本
- 测试环境: Windows 10/11 + Docker Desktop, Linux + Docker CE
- 新增功能: 
  - 自动Docker安装（Linux/macOS）
  - 主机目录挂载
  - 交互式容器创建
  - 完整的基础环境安装 