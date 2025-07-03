# Nexus 节点多开一体化工具 v2.0

## 🎯 一个脚本，全部功能！

这是一个完全集成的 Nexus 节点多开管理工具，所有功能都在单个脚本文件中：
- ✅ **官方容器镜像** (nexusxyz/nexus-zkvm:latest)
- ✅ **交互式节点ID配置**
- ✅ **自动内存检测**
- ✅ **实时监控**
- ✅ **一键部署**

## 📦 快速部署

### 🔧 系统要求
- **操作系统**: Ubuntu 18.04+, CentOS 7+, Debian 9+
- **内存**: 最低 4GB，推荐 16GB+
- **存储**: 10GB 可用空间

### 🚀 手动安装步骤

#### 1. 连接服务器
```bash
ssh username@your-server-ip
```

#### 2. 系统准备
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install -y wget curl

# CentOS/RHEL  
sudo yum update && sudo yum install -y wget curl
```

**注意**: 脚本将自动安装 Docker，使用官方推荐的安装方法：
- 添加 Docker 官方 GPG 密钥
- 配置官方软件源
- 安装最新版 Docker Engine 和相关组件
- 自动配置服务启动和用户权限

#### 3. 下载脚本
```bash
wget https://raw.githubusercontent.com/mumumusf/Nexus/main/nexus-all-in-one.sh
chmod +x nexus-all-in-one.sh
```

#### 4. 启动脚本
```bash
# 快速启动（推荐新手）
./nexus-all-in-one.sh quick

# 完整菜单（高级用户）
./nexus-all-in-one.sh
```

## 📋 基本使用

### 启动方式
```bash
# 快速菜单
./nexus-all-in-one.sh quick

# 主菜单
./nexus-all-in-one.sh

# 直接启动
./nexus-all-in-one.sh start
```

### 常用命令
```bash
# 查看状态
./nexus-all-in-one.sh status

# 查看日志
./nexus-all-in-one.sh logs

# 实时监控
./nexus-all-in-one.sh monitor

# 停止节点
./nexus-all-in-one.sh stop

# 重启节点
./nexus-all-in-one.sh restart
```

## ⚙️ 配置说明

### 推荐节点数量
| 内存 | 节点数 |
|------|--------|
| 4GB  | 1个    |
| 8GB  | 3个    |
| 16GB | 7个    |
| 32GB | 15个   |

### 首次启动流程
1. 系统自动检查并安装 Docker
2. 验证 Docker 安装和运行状态
3. 输入节点数量（或使用推荐值）
4. **必须输入起始节点ID**（无默认值）
5. 确认配置并启动

## 🚨 常见问题

### Docker 权限问题
```bash
sudo usermod -aG docker $USER
newgrp docker
```

### 内存不足
```bash
# 查看内存
free -h

# 减少节点数量或升级VPS
```

### 网络问题
```bash
# 测试连接
ping docker.io

# 手动拉取镜像
docker pull nexusxyz/nexus-zkvm:latest
```

## 💡 使用技巧

- 新手直接用 `./nexus-all-in-one.sh quick`
- 节点数据自动保存，重启不丢失
- 支持实时监控和日志查看
- 一个命令管理所有节点

---

**🎉 现在您只需要一个脚本文件就能完成所有 Nexus 节点的部署和管理！** 