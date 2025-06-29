#!/bin/bash

# 显示banner
echo "
██╗  ██╗██╗ █████╗  ██████╗ ██╗     ██╗███╗   ██╗
╚██╗██╔╝██║██╔══██╗██╔═══██╗██║     ██║████╗  ██║
 ╚███╔╝ ██║███████║██║   ██║██║     ██║██╔██╗ ██║
 ██╔██╗ ██║██╔══██║██║   ██║██║     ██║██║╚██╗██║
██╔╝ ██╗██║██║  ██║╚██████╔╝███████╗██║██║ ╚████║
╚═╝  ╚═╝╚═╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝╚═╝  ╚═══╝

    === Nexus 自动化工具 (Screen版) ===
** ====================================== **
*         此脚本仅供免费使用              *
*         禁止出售或用于盈利              *
** ====================================== **

* 作者: @YOYOMYOYOA
* 空投玩家 | 现货玩家 | meme收藏
* Github: github.com/mumumusf

** ====================================== **
*            免责声明                      *
* 此脚本仅供学习交流使用                  *
* 使用本脚本所产生的任何后果由用户自行承担 *
* 如果因使用本脚本造成任何损失，作者概不负责*
** ====================================== **
"

# 检查是否安装了screen
if ! command -v screen &> /dev/null; then
    echo "正在安装 screen..."
    if command -v apt &> /dev/null; then
        sudo apt update && sudo apt install -y screen
    elif command -v yum &> /dev/null; then
        sudo yum install -y screen
    elif command -v dnf &> /dev/null; then
        sudo dnf install -y screen
    else
        echo "错误：无法自动安装screen，请手动安装"
        exit 1
    fi
    echo "screen 安装完成！"
fi

# 安装nexus-cli（如果未安装）
if ! command -v nexus-network &> /dev/null; then
    echo "正在安装 nexus-cli 及其依赖..."
    
    # 安装系统依赖
    echo "安装系统依赖..."
    if command -v apt &> /dev/null; then
        sudo apt update
        sudo apt install -y protobuf-compiler curl
    elif command -v yum &> /dev/null; then
        sudo yum install -y protobuf-compiler curl
    elif command -v dnf &> /dev/null; then
        sudo dnf install -y protobuf-compiler curl
    else
        echo "错误：无法自动安装依赖，请手动安装 protobuf-compiler 和 curl"
        exit 1
    fi
    
    # 安装 Rust
    echo "安装 Rust..."
    curl https://sh.rustup.rs -sSf | sh -s -- -y
    source $HOME/.cargo/env
    
    # 设置 Rust 默认版本
    echo "设置 Rust 默认版本..."
    rustup default stable
    
    # 安装 nexus-cli
    echo "安装 nexus-cli..."
    curl https://cli.nexus.xyz | sh
    
    # 添加 PATH 环境变量
    echo 'export PATH="$HOME/.nexus/bin:$PATH"' >> ~/.bashrc
    source ~/.bashrc 2>/dev/null || source ~/.zshrc 2>/dev/null
    
    echo "✅ nexus-cli 安装完成！"
fi

# 获取节点ID
echo ""
echo "请输入您的节点ID（纯数字，如：7366937）:"
read -p "节点ID: " NODE_ID

# 清理输入（去除空格和特殊字符）
NODE_ID=$(echo "$NODE_ID" | tr -d '[:space:]')

# 验证节点ID
if [ -z "$NODE_ID" ]; then
    echo "❌ 错误：节点ID不能为空"
    echo "请重新运行脚本并输入有效的节点ID"
    exit 1
fi

# 检查是否只包含数字
if ! [[ "$NODE_ID" =~ ^[0-9]+$ ]]; then
    echo "❌ 错误：节点ID应该只包含数字"
    echo "您输入的ID: $NODE_ID"
    echo "请重新运行脚本并输入正确的节点ID"
    exit 1
fi

echo "✅ 节点ID验证通过: $NODE_ID"

# 检查是否已有同名screen会话
SESSION_NAME="nexus_${NODE_ID}"
if screen -list | grep -q "$SESSION_NAME"; then
    echo "发现已存在的会话: $SESSION_NAME"
    read -p "是否要连接到现有会话？(y/n): " choice
    if [[ $choice == "y" || $choice == "Y" ]]; then
        echo "连接到现有会话..."
        screen -r "$SESSION_NAME"
        exit 0
    else
        echo "终止现有会话并创建新会话..."
        screen -S "$SESSION_NAME" -X quit 2>/dev/null
    fi
fi

echo "开始运行节点: $NODE_ID"
echo "Screen会话名称: $SESSION_NAME"
echo ""
echo "=== Screen 使用说明 ==="
echo "• 分离会话: Ctrl+A 然后按 D"
echo "• 重新连接: screen -r $SESSION_NAME"
echo "• 查看会话: screen -list"
echo "• 停止脚本: 在会话中按 Ctrl+C"
echo "========================"
echo ""

# 在screen会话中运行脚本
screen -dmS "$SESSION_NAME" bash -c "
echo '=== Nexus 节点运行中 ==='
echo '节点ID: $NODE_ID'
echo '会话名称: $SESSION_NAME'
echo '开始时间: \$(date)'
echo ''

# 主循环
while true; do
    echo \"\$(date): 检查并安装最新版本的 nexus-cli...\"
    
    # 更新 nexus-cli
    curl https://cli.nexus.xyz | sh
    source ~/.bashrc 2>/dev/null || source ~/.zshrc 2>/dev/null
    
    echo \"\$(date): 启动节点 $NODE_ID\"
    
    # 启动节点并在后台运行，同时设置2小时定时器
    nexus-network start --node-id \"$NODE_ID\" &
    NODE_PID=\$!
    
    # 等待2小时
    echo \"\$(date): 节点已启动，将在2小时后重启...\"
    sleep 7200
    
    # 2小时后终止节点进程
    echo \"\$(date): 2小时时间到，终止节点进程...\"
    kill \$NODE_PID 2>/dev/null
    wait \$NODE_PID 2>/dev/null
    
    echo \"\$(date): 节点已停止，准备重启...\"
    sleep 5
done
"

echo "✅ 节点已在Screen会话中启动！"
echo ""
echo "📋 常用命令："
echo "• 查看会话状态: screen -list"
echo "• 连接到会话: screen -r $SESSION_NAME"
echo "• 分离会话: 在会话中按 Ctrl+A 然后按 D"
echo "• 停止节点: screen -S $SESSION_NAME -X quit"
echo ""
echo "🌐 现在您可以安全地关闭SSH连接，节点会继续运行！" 