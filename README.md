# Nexus节点管理器 (JavaScript版本)

自动化Docker节点部署工具，用于管理多个Nexus网络节点。

## 功能特性

- ✅ 自动检测并安装Docker
- ✅ 智能检测系统资源（CPU、内存）
- ✅ 自动计算最大可运行节点数
- ✅ 交互式用户配置界面
- ✅ 在Docker容器中隔离运行节点
- ✅ 实时监控节点状态
- ✅ 配置保存和恢复
- ✅ 跨平台支持（Windows/Linux/macOS）
- ✅ 自动依赖管理和安装

## 系统要求

### 最低要求
- **Node.js**: 12.0或更高版本
- **npm**: 6.0或更高版本
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

## 安装指南

### 1. 安装Node.js
如果尚未安装Node.js，请访问 [https://nodejs.org/](https://nodejs.org/) 下载并安装。

### 2. 克隆项目
```bash
git clone <repository-url>
cd nexus-node-manager
```

### 3. 运行脚本

#### Windows用户
双击运行 `run.bat` 或在命令行中执行：
```cmd
run.bat
```

#### Linux/macOS用户
```bash
chmod +x run.sh
./run.sh
```

#### 使用npm运行
```bash
npm install
npm start
```

#### 直接运行Node.js脚本
```bash
node nexus_node_manager.js
```

### 4. 环境测试
运行环境测试脚本检查所有依赖：
```bash
node test_environment.js
```
或
```bash
npm test
```

## 使用说明

### 第一次运行

1. **依赖检查和安装**
   - 脚本会自动检查并安装所需的npm包
   - 主要依赖：`dockerode`、`systeminformation`

2. **Docker安装检查**
   - 脚本会自动检查Docker是否已安装
   - 如果未安装，会提示安装方法

3. **系统资源检测**
   - 自动检测CPU核心数和内存大小
   - 计算建议的最大节点数

4. **用户配置**
   - 输入要运行的节点数量
   - 为每个节点输入节点ID

5. **节点部署**
   - 自动创建Docker容器
   - 在每个容器中安装Nexus CLI
   - 启动节点

6. **监控模式**
   - 实时显示节点状态
   - 显示节点日志
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

# 运行环境测试
npm test

# 手动安装依赖
npm run install-deps

# 安装所有依赖
npm install
```

## 项目文件说明

- `nexus_node_manager.js` - 主程序文件
- `package.json` - Node.js项目配置文件
- `run.js` - Node.js启动脚本
- `run.bat` - Windows批处理启动脚本
- `run.sh` - Linux/macOS shell启动脚本
- `test_environment.js` - 环境测试脚本
- `README.md` - 说明文档

## Docker容器管理

### 查看运行中的容器
```bash
docker ps
```

### 查看所有容器（包括停止的）
```bash
docker ps -a
```

### 进入特定容器
```bash
docker exec -it nexus-node-1 /bin/bash
```

### 查看容器日志
```bash
docker logs nexus-node-1
```

### 手动停止容器
```bash
docker stop nexus-node-1
```

### 手动删除容器
```bash
docker rm nexus-node-1
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
   ❌ dockerode 未安装
   ```
   **解决方案**: 运行 `npm install` 或 `npm run install-deps`

3. **Docker连接失败**
   ```
   ✗ 连接Docker失败: [错误信息]
   ```
   **解决方案**: 确保Docker Desktop已启动并正在运行

4. **内存不足**
   ```
   建议最大节点数: 0
   ```
   **解决方案**: 增加系统内存或减少其他程序的使用

5. **端口冲突**
   ```
   容器创建失败: port already in use
   ```
   **解决方案**: 停止冲突的容器或服务

### 手动清理

如果脚本异常退出，可以手动清理容器：

```bash
# 停止所有nexus容器
docker stop $(docker ps -q --filter "name=nexus-node")

# 删除所有nexus容器
docker rm $(docker ps -aq --filter "name=nexus-node")

# 清理未使用的镜像（可选）
docker image prune -f
```

### 重置项目

如果需要重置项目状态：

```bash
# 删除node_modules和package-lock.json
rm -rf node_modules package-lock.json

# 重新安装依赖
npm install

# 清理Docker容器
docker container prune -f
```

## 高级配置

### 自定义资源分配

修改 `calculateMaxNodes` 函数中的资源分配策略：
```javascript
// 每个节点预估需要: 0.5 CPU核心 + 1GB内存
const cpuLimit = Math.floor(resources.cpu_cores / 0.5);
const memoryLimit = Math.floor(resources.memory_gb / 1.0);
```

### 修改容器基础镜像

在 `createNexusContainer` 函数中更改：
```javascript
Image: 'ubuntu:20.04'  // 可改为其他镜像
```

### 自定义监控间隔

在 `monitorNodes` 函数中修改：
```javascript
}, 30000); // 监控间隔毫秒数
```

### 修改依赖版本

在 `package.json` 中更新依赖版本：
```json
{
  "dependencies": {
    "dockerode": "^4.0.0",
    "systeminformation": "^5.21.0"
  }
}
```

## API文档

### NexusNodeManager类

主要方法：

- `constructor()` - 初始化管理器
- `checkDockerInstalled()` - 检查Docker安装状态
- `getSystemResources()` - 获取系统资源信息
- `getUserInput(maxNodes)` - 获取用户配置输入
- `startNodes(config)` - 启动节点容器
- `monitorNodes()` - 监控节点状态
- `cleanup()` - 清理容器资源

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
6. **容器管理**: 定期清理不使用的Docker容器和镜像

## 技术支持

- 查看日志文件了解详细错误信息
- 检查Docker和Node.js环境配置
- 确保系统有足够的资源
- 运行环境测试脚本诊断问题

## 版本历史

- **v1.0.0**: 初始JavaScript版本
  - 基础Docker节点管理功能
  - 自动资源检测
  - 跨平台支持
  - 自动依赖管理

## 许可证

本项目仅供学习和研究使用。 