# Nexus节点管理器

🚀 自动化部署和管理多个Nexus节点的JavaScript脚本。

## 快速部署

```bash
# 一键部署
git clone https://github.com/mumumusf/Nexus.git
cd Nexus
node nexus-node-manager.js
```

## 功能特性

- ✅ 自动检测系统CPU和内存资源
- ✅ 使用Ubuntu 24.04 Docker容器作为隔离环境
- ✅ 自动安装Nexus CLI
- ✅ 支持多节点并行运行
- ✅ 使用screen会话管理节点
- ✅ 实时状态监控
- ✅ 一键停止所有节点

## 系统要求

- **操作系统**: Windows, macOS, Linux
- **Node.js**: >= 14.0.0
- **Docker**: 最新版本
- **内存**: 至少5GB（每个节点需要5GB内存）

## 运行方式

```bash
# 直接运行主脚本
node nexus-node-manager.js

# 或使用npm
npm start
``` 