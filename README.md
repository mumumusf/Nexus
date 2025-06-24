# Nexus Network 自动化工具

[![GitHub](https://img.shields.io/badge/GitHub-mumumusf/Nexus-blue?style=flat-square&logo=github)](https://github.com/mumumusf/Nexus)

> 一键运行 Nexus Network 节点，支持自动安装、持久运行和定时重启

## 🚀 功能特点

- ✅ 自动安装 nexus-cli 和 screen
- ✅ 每2小时自动重启节点
- ✅ SSH断开后继续运行
- ✅ 支持多节点管理
- ✅ 简单易用，新手友好

## 📋 系统要求

- Linux VPS (Ubuntu/CentOS/Debian)
- **CPU**: 2核
- **内存**: 4GB RAM
- **存储**: 10GB+ 可用空间
- **网络**: 稳定网络连接

## 🛠️ 快速开始

### 一键运行（推荐）

```bash
curl -sSL https://raw.githubusercontent.com/mumumusf/Nexus/main/nexus_screen.sh | bash
```

### 手动下载运行

```bash
# 下载脚本
wget https://raw.githubusercontent.com/mumumusf/Nexus/main/nexus_screen.sh

# 给执行权限
chmod +x nexus_screen.sh

# 运行脚本
./nexus_screen.sh
```

## 🎯 使用步骤

### 1. 运行脚本
执行上述命令，会看到漂亮的欢迎界面

### 2. 自动安装
脚本会自动安装必要的工具（screen + nexus-cli）

### 3. 输入节点ID
```
请输入您的节点ID（纯数字，如：7366937）:
节点ID: 7366937
✅ 节点ID验证通过: 7366937
```

**注意**: 节点ID应该是纯数字，输入后按回车确认

### 4. 开始运行
脚本会在后台创建screen会话并开始运行节点

## 📊 管理命令

### 查看运行状态
```bash
screen -list
```

### 查看节点日志
```bash
screen -r nexus_your-node-id
```

### 分离会话（保持运行）
在会话中按 `Ctrl+A` 然后按 `D`

### 停止节点
```bash
screen -S nexus_your-node-id -X quit
```

## 🔄 运行机制

- **自动重启**: 每2小时自动重启节点
- **持久运行**: SSH断开后继续运行
- **会话管理**: 每个节点独立screen会话
- **状态监控**: 可随时查看运行状态

## ❓ 常见问题

**Q: 如何获取节点ID？**
A: 访问 [nexus.xyz](https://nexus.xyz) 注册并创建节点

**Q: SSH断开后节点会停止吗？**
A: 不会，节点会在screen会话中继续运行

**Q: 如何修改重启间隔？**
A: 编辑脚本中的 `sleep 7200` 行（7200秒=2小时）

**Q: 支持运行多个节点吗？**
A: 支持，每个节点ID会创建独立的screen会话

**Q: 需要root权限吗？**
A: 不需要，普通用户权限即可

## 📝 更新日志

### v1.0.0
- ✨ 初始版本发布
- ✨ 自动安装screen和nexus-cli
- ✨ 支持2小时自动重启
- ✨ 持久运行功能

## 👨‍💻 作者

**@YOYOMYOYOA**
- GitHub: [github.com/mumumusf](https://github.com/mumumusf)

---

⭐ 如果对您有帮助，请给个 Star 支持！ 