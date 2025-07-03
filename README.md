# Nexus节点管理器 (JavaScript版本)

使用Screen会话管理多个Nexus网络节点的自动化部署工具。

## 功能特性

- ✅ 自动检测并安装Screen和Nexus CLI
- ✅ 智能检测系统资源（CPU、内存）
- ✅ 自动计算最大可运行节点数
- ✅ 交互式用户配置界面
- ✅ 使用Screen会话隔离运行节点
- ✅ 实时监控节点状态和资源使用
- ✅ 配置保存和恢复
- ✅ 跨平台支持（Linux/macOS/WSL）
- ✅ 自动依赖管理和安装
- ✅ 日志文件管理和查看
- ✅ 会话重启和命令发送功能

## 系统要求

### 最低要求
- **Node.js**: 12.0或更高版本
- **npm**: 6.0或更高版本
- **Screen**: 终端复用器（Linux/macOS自带，Windows需WSL）
- **Nexus CLI**: 自动安装或手动安装
- **内存**: 至少2GB RAM
- **CPU**: 至少1核心
- **存储**: 至少1GB可用空间
- **网络**: 稳定的互联网连接

### 推荐配置
- **Node.js**: 16.0+
- **npm**: 8.0+
- **内存**: 4GB+ RAM
- **CPU**: 2核心+
- **存储**: 5GB+ 可用空间
- **操作系统**: Linux/macOS/WSL（Windows Subsystem for Linux）

## 安装指南

### 1. 安装Node.js
如果尚未安装Node.js，请访问 [https://nodejs.org/](https://nodejs.org/) 下载并安装。

### 2. 克隆项目
```bash
git clone https://github.com/mumumusf/Nexus.git
cd Nexus
```

### 3. 运行脚本

#### 使用npm运行（推荐）
```bash
npm install
npm start
```

#### 直接运行Node.js脚本
```bash
node nexus_node_manager.js
```

#### Windows用户（WSL推荐）
在WSL环境中运行：
```bash
npm install
npm start
```

## 使用说明

### 第一次运行

1. **依赖检查和安装**
   - 脚本会自动检查并安装所需的npm包
   - 主要依赖：`systeminformation`

2. **Screen安装检查**
   - 脚本会自动检查Screen是否已安装
   - 如果未安装，会提示安装方法

3. **Nexus CLI安装检查**
   - 脚本会自动检查Nexus CLI是否已安装
   - 如果未安装，会自动下载并安装

4. **系统资源检测**
   - 自动检测CPU核心数和内存大小
   - 计算建议的最大节点数

5. **用户配置**
   - 输入要运行的节点数量
   - 为每个节点输入节点ID

6. **节点部署**
   - 自动创建Screen会话
   - 在每个会话中启动Nexus节点
   - 生成日志文件

7. **监控模式**
   - 实时显示节点状态
   - 查看节点日志
   - 重启会话功能
   - 发送命令到会话
   - 按Ctrl+C退出监控

### 配置文件

脚本会自动保存配置到 `nexus_config.json`：
```json
{
  "num_nodes": 3,
  "node_ids": [
    "node-id-1",
    "node-id-2", 
    "node-id-3"
  ]
}
```

### NPM脚本命令

```bash
# 启动主程序
npm start

# 手动安装依赖
npm run install-deps

# 安装所有依赖
npm install
```

## 项目文件说明

- `nexus_node_manager.js` - 主程序文件（使用Screen会话管理节点）
- `package.json` - Node.js项目配置文件
- `README.md` - 说明文档
- `logs/` - 自动生成的日志目录
- `nexus_config.json` - 自动生成的配置文件

## Screen会话管理

### 查看运行中的会话
```bash
screen -list
```

### 连接到特定会话
```bash
screen -r nexus-node-1
```

### 分离会话（不停止）
在会话中按 `Ctrl+A` 然后按 `D`

### 查看会话日志
```bash
tail -f logs/nexus-node-1.log
```

### 手动停止会话
```bash
screen -S nexus-node-1 -X quit
```

### 向会话发送命令
```bash
screen -S nexus-node-1 -p 0 -X stuff "命令\n"
```

## 故障排除

### 常见问题

1. **Node.js版本过低**
   ```
   ❌ Node.js版本过低，需要12或更高版本
   ```
   **解决方案**: 更新Node.js到12.0或更高版本

2. **npm依赖安装失败**
   ```
   ❌ systeminformation 未安装
   ```
   **解决方案**: 运行 `npm install` 或 `npm run install-deps`

3. **Screen未安装**
   ```
   ✗ Screen未安装
   ```
   **解决方案**: 安装screen包（Linux: `sudo apt-get install screen`, macOS: `brew install screen`）

4. **Nexus CLI未安装**
   ```
   ✗ Nexus CLI未安装
   ```
   **解决方案**: 运行 `curl https://cli.nexus.xyz/ | sh` 手动安装

5. **内存不足**
   ```
   建议最大节点数: 0
   ```
   **解决方案**: 增加系统内存或减少其他程序的使用

6. **会话创建失败**
   ```
   创建会话失败: [错误信息]
   ```
   **解决方案**: 检查screen安装状态和系统权限

### 手动清理

如果脚本异常退出，可以手动清理会话：

```bash
# 查看所有nexus相关的screen会话
screen -list | grep nexus

# 停止所有nexus会话
for session in $(screen -list | grep nexus | awk '{print $1}' | cut -d'.' -f2); do
    screen -S "$session" -X quit
done

# 或者手动停止单个会话
screen -S nexus-node-1 -X quit

# 清理日志文件（可选）
rm -rf logs/
```

### 重置项目

如果需要重置项目状态：

```bash
# 删除node_modules和package-lock.json
rm -rf node_modules package-lock.json

# 重新安装依赖
npm install

# 停止所有screen会话
screen -wipe

# 清理日志和配置文件
rm -rf logs/ nexus_config.json
```

## 高级配置

### 自定义资源分配

修改 `calculateMaxNodes` 函数中的资源分配策略：
```javascript
// 每个节点预估需要: 0.5 CPU核心 + 1GB内存
const cpuLimit = Math.floor(resources.cpu_cores / 0.5);
const memoryLimit = Math.floor(resources.memory_gb / 1.0);
```

### 自定义日志目录

修改 `createNexusSession` 函数中的日志路径：
```javascript
const logDir = path.join(process.cwd(), 'logs');  // 可改为其他目录
```

### 自定义监控间隔

在 `autoMonitorMode` 函数中修改：
```javascript
for (let i = 0; i < 10 && monitoring; i++) {
    await this.sleep(1000);  // 可调整监控间隔
}
```

### 修改依赖版本

在 `package.json` 中更新依赖版本：
```json
{
  "dependencies": {
    "systeminformation": "^5.21.0"
  }
}
```

## API文档

### NexusNodeManager类

主要方法：

- `constructor()` - 初始化管理器
- `checkScreenInstalled()` - 检查Screen安装状态
- `checkNexusInstalled()` - 检查Nexus CLI安装状态
- `getSystemResources()` - 获取系统资源信息
- `getUserInput(maxNodes)` - 获取用户配置输入
- `createNexusSession(nodeId, sessionName)` - 创建Nexus会话
- `startNodes(config)` - 启动节点会话
- `showSessionOverview()` - 显示会话概览
- `showSessionDetails(index)` - 显示会话详情
- `showSessionLogs(index, lines)` - 显示会话日志
- `restartSession(index)` - 重启会话
- `sendCommandToSession(sessionName, command)` - 发送命令到会话
- `monitorNodes()` - 监控节点状态
- `cleanup()` - 清理会话资源

### 配置对象格式

```javascript
{
  num_nodes: 3,
  node_ids: ['node-1', 'node-2', 'node-3']
}
```

## 开发说明

### 添加新功能

1. 在 `NexusNodeManager` 类中添加新方法
2. 更新 `run()` 方法的执行流程
3. 测试新功能
4. 更新文档

### 调试模式

设置环境变量启用调试：
```bash
# Linux/macOS
DEBUG=nexus* node nexus_node_manager.js

# Windows
set DEBUG=nexus* && node nexus_node_manager.js
```

## 注意事项

1. **安全提醒**: 请确保节点ID的安全性，不要与他人共享
2. **资源监控**: 长时间运行请监控系统资源使用情况
3. **网络要求**: 确保网络连接稳定，避免节点掉线
4. **数据备份**: 重要数据请及时备份
5. **版本更新**: 定期检查Node.js、npm和依赖包的更新
6. **会话管理**: 定期清理不使用的Screen会话和日志文件
7. **系统兼容性**: Windows用户建议使用WSL环境运行

## 技术支持

- 查看日志文件了解详细错误信息（logs/ 目录下）
- 检查Screen和Nexus CLI环境配置
- 确保系统有足够的资源
- 使用 `screen -list` 查看会话状态
- 运行环境测试脚本诊断问题

## 版本历史

- **v1.0.0**: 初始JavaScript版本
  - 基础Screen会话节点管理功能
  - 自动资源检测
  - 跨平台支持（Linux/macOS/WSL）
  - 自动依赖管理
  - 日志文件管理
  - 会话监控和控制功能

## 许可证

本项目仅供学习和研究使用。 