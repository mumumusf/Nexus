# Yoyom - Nexus多开运行器

🚀 这是一个用于在多个Docker容器中运行Nexus节点的JavaScript脚本。

## 功能特点

- 🔍 **跨平台系统资源检测** - 自动检测CPU和内存，支持Windows/Linux/macOS
- 🐳 **Docker容器管理** - 自动创建和管理Ubuntu 24.04容器
- 📦 **自动安装** - 自动安装nexus CLI和必要依赖
- 🎯 **多节点部署** - 支持同时运行多个nexus节点
- 📋 **日志查看** - 实时查看每个节点的运行日志
- 📝 **详细日志模式** - 可切换的详细日志输出，便于故障排除和学习
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
v. **切换详细日志模式** - 开启/关闭安装和运行过程的详细日志输出
0. **退出** - 退出程序

### 详细日志模式

脚本现在支持详细日志模式，帮助用户更好地了解安装和运行过程：

- **开启详细日志**：显示每个命令的执行过程和输出结果
- **关闭详细日志**：只显示关键步骤和结果信息
- **默认状态**：详细日志模式默认开启

**使用方法**：
1. 在主菜单中输入 `v` 来切换模式
2. 开启后，安装和启动过程会显示：
   - 每个执行的命令
   - 命令的完整输出结果
   - 详细的错误信息和调试信息
3. 关闭后，只显示步骤进度和最终结果

**推荐使用场景**：
- 🔍 **故障排除**：当安装或启动失败时，开启详细日志查看具体错误
- 🎓 **学习过程**：了解脚本执行的具体步骤和命令
- 🚀 **快速使用**：正常使用时可关闭详细日志，界面更简洁

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
   
   # 安装nexus CLI（会提示确认，输入y）
   curl -L https://cli.nexus.xyz | sh
   # 或者非交互模式：echo "y" | curl -L https://cli.nexus.xyz | sh
   
   # 使用screen后台运行nexus（方法1：后台运行）
   screen -dmS nexus-your-node-id bash -c "~/.nexus/bin/nexus-network start --node-id your-node-id"
   
   # 或者方法2：前台运行（可以直接看到输出）
   screen -S nexus
   ~/.nexus/bin/nexus-network start --node-id your-node-id
   # 按 Ctrl+A 然后 D 可以脱离screen会话
   
   # 查看screen会话
   screen -ls
   
   # 连接到nexus会话
   screen -r nexus-your-node-id
   # 或者连接到名为nexus的会话
   screen -r nexus
   ```

### 经过验证的手动流程

以下是用户验证过的完整手动安装流程：

```bash
# 1. 创建容器
docker run -it --name nexus-ubuntu24 \
  -v $HOME:/workspace \
  ubuntu:24.04 bash

# 2. 安装依赖
apt update && apt install -y \
  curl wget git screen build-essential libssl-dev

# 3. 安装Nexus CLI（会提示确认）
curl -L https://cli.nexus.xyz | sh
# 当提示 "Do you want to install Nexus CLI? (y/N)" 时，输入 y

# 4. 启动nexus节点
screen -S nexus
~/.nexus/bin/nexus-network start --node-id 6520503
# 按 Ctrl+A 然后 D 脱离screen会话

# 5. 验证运行状态
screen -ls  # 查看screen会话
ps aux | grep nexus  # 查看nexus进程
```

**重要提示**：
- Node ID可以是纯数字（如：`6520503`）或字母数字组合
- 安装Nexus CLI时需要手动确认，输入`y`
- 使用screen确保节点在后台持续运行

### 节点命名规则

- 容器名称：`nexus-node-1`, `nexus-node-2`, ...
- 节点ID：`yourbaseid01`, `yourbaseid02`, ... (仅包含字母和数字，无特殊字符)

**重要说明**：
- Node ID只能包含字母和数字，不能包含连字符、下划线等特殊字符
- 脚本会自动将用户输入的基础ID与节点编号组合（如：mynode + 01 = mynode01）
- 节点编号使用两位数字格式（01, 02, 03...）

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

### Node ID格式错误

**问题**：nexus启动失败，提示node-id格式无效
```
error: invalid value 'xxx-1' for '--node-id <NODE_ID>': invalid digit found in string
```

**解决方案**：
1. Node ID只能包含字母和数字，不能有特殊字符（连字符、下划线等）
2. 重新运行部署时，使用纯字母数字的基础ID（如：`mynode123`）
3. 脚本会自动格式化为正确格式（如：`mynode12301`, `mynode12302`）
4. 避免使用：`my-node`, `my_node`, `node@1` 等包含特殊字符的ID

### Nexus进程问题

**问题**：nexus进程异常退出或无法启动

**解决方案**：
1. 查看详细日志：
   ```bash
   docker exec nexus-node-1 cat ~/.nexus/logs/nexus-*.log
   ```

2. 检查系统资源是否足够（内存至少3GB每个节点）
3. 验证node-id格式是否正确
4. 尝试重启节点（选项7）
5. 如果问题持续，删除容器重新部署

### Shell命令解析错误

**问题**：启动nexus时出现引号嵌套错误
```
unexpected EOF while looking for matching `''
```

**解决方案**：
1. 这是shell命令中引号嵌套导致的问题，v1.0.4已完全修复
2. 如果仍然遇到此问题：
   - 确保使用最新版本的脚本（v1.0.4+）
   - 重新运行部署流程
   - 开启详细日志模式查看具体命令

**手动启动方法**（如果自动启动失败）：
```bash
# 进入容器
docker exec -it nexus-node-1 bash

# 创建日志文件
echo "启动nexus节点: your-node-id - $(date)" > ~/.nexus/logs/nexus-your-node-id.log

# 启动screen会话
screen -dmS nexus-your-node-id bash -c "~/.nexus/bin/nexus-network start --node-id your-node-id 2>&1 | tee -a ~/.nexus/logs/nexus-your-node-id.log"

# 检查会话状态
screen -ls
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

# 安装nexus CLI（会提示确认，输入y）
curl -L https://cli.nexus.xyz | sh
# 或者非交互模式：echo "y" | curl -L https://cli.nexus.xyz | sh

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

## 故障排除

### 快速故障排除流程

如果遇到安装或运行问题，建议按以下步骤排查：

1. **🔍 开启详细日志模式**：
   - 在主菜单输入 `v` 开启详细日志
   - 重新执行失败的操作（如部署节点）
   - 观察具体的错误信息和失败步骤

2. **📋 查看详细输出**：
   - 详细日志会显示每个命令的执行过程
   - 可以看到具体的错误信息和系统输出
   - 帮助识别是网络问题、权限问题还是系统环境问题

3. **🔧 常见解决方案**：
   - **网络问题**：检查网络连接，重试下载步骤
   - **权限问题**：确保有Docker访问权限
   - **容器冲突**：使用菜单选项8清理冲突容器
   - **资源不足**：减少节点数量或增加系统内存

4. **🚀 重新部署**：
   - 使用菜单选项8清理所有容器
   - 重新执行部署流程

### 详细日志使用技巧

- **开启时机**：遇到问题时立即开启详细日志
- **关闭时机**：问题解决后可关闭，保持界面简洁
- **查看重点**：关注标有❌的错误信息和命令执行失败的步骤
- **调试信息**：详细日志包含完整的错误栈信息，便于深度调试

## 支持

如果遇到问题，请检查：
1. Docker是否正常运行
2. 网络连接是否正常
3. 系统资源是否充足
4. 节点ID是否正确
5. 是否开启了详细日志模式来查看具体错误

## 相关项目

- [Nexus项目仓库](https://github.com/mumumusf/Nexus) - 相关的Nexus实现和工具

## 版本信息

- 项目名称: Yoyom
- 版本: 1.0.4
- 推荐Node.js版本: 22.13.1
- 推荐npm版本: 10.9.2
- 支持的Nexus版本: 最新版本
- 测试环境: Windows 10/11 + Docker Desktop, Linux + Docker CE, macOS + Docker Desktop

## 更新日志

### v1.0.4 (最新)
- 🐛 **重要修复**：修复screen启动命令中的shell引号嵌套问题
- 🔧 **优化**：简化nexus启动流程，分解复杂命令为多个简单步骤
- ✅ 解决了 `unexpected EOF while looking for matching` 错误
- ✅ 提高了nexus节点启动的稳定性和成功率
- ✅ 增强了启动过程的日志记录

### v1.0.3
- 🆕 **新功能**：添加详细日志模式，可切换显示安装过程的详细输出
- 🔧 **体验优化**：改进安装和启动过程的日志显示，分步骤展示进度
- 🐛 **故障排除**：详细日志模式帮助用户快速定位安装或启动过程中的问题
- ✅ 增加每个执行步骤的清晰标识和状态反馈
- ✅ 支持一键切换详细/简洁日志模式 (菜单选项 v)

### v1.0.2
- 🔧 **重要修复**：修复Nexus CLI安装的交互提示问题，使用非交互模式自动确认
- ✅ 添加经过验证的完整手动安装流程说明
- ✅ 支持纯数字Node ID格式（如：6520503）
- ✅ 改进文档，添加screen使用的多种方法
- ✅ 增强安装过程的稳定性和可靠性

### v1.0.1
- 🔧 **重要修复**：修复Node ID格式问题，移除连字符以符合nexus要求
- ✅ 添加Node ID格式验证和自动转换功能
- ✅ 改进nexus启动流程，增加命令测试和详细日志
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