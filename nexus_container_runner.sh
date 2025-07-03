#!/bin/bash

# Nexus 容器运行脚本
# 该脚本会自动安装Docker，运行容器，并在容器中安装和运行Nexus CLI

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 检查是否以root权限运行
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_warn "检测到以root权限运行"
    fi
}

# 检测操作系统
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        if command -v apt-get > /dev/null; then
            DISTRO="ubuntu"
        elif command -v yum > /dev/null; then
            DISTRO="centos"
        else
            DISTRO="unknown"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    else
        OS="unknown"
    fi
    
    log_info "检测到操作系统: $OS ($DISTRO)"
}

# 安装Docker
install_docker() {
    log_step "检查Docker安装状态..."
    
    if command -v docker > /dev/null 2>&1; then
        log_info "Docker已安装"
        return 0
    fi
    
    log_step "开始安装Docker..."
    
    case $OS in
        "linux")
            case $DISTRO in
                "ubuntu")
                    sudo apt-get update
                    sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
                    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
                    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
                    sudo apt-get update
                    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
                    ;;
                "centos")
                    sudo yum install -y yum-utils
                    sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
                    sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
                    sudo systemctl start docker
                    sudo systemctl enable docker
                    ;;
            esac
            
            # 将当前用户添加到docker组
            if [ ! -z "$USER" ]; then
                sudo usermod -aG docker $USER
                log_warn "已将用户 $USER 添加到docker组，请重新登录或运行 'newgrp docker'"
            fi
            ;;
        "macos")
            log_error "请手动安装Docker Desktop for Mac: https://docs.docker.com/desktop/install/mac-install/"
            exit 1
            ;;
        *)
            log_error "不支持的操作系统: $OS"
            exit 1
            ;;
    esac
    
    log_info "Docker安装完成"
}

# 检测系统资源
detect_system_resources() {
    log_step "检测系统资源..."
    
    # 检测CPU核心数
    CPU_CORES=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo "unknown")
    
    # 检测内存（GB）
    if command -v free > /dev/null; then
        MEMORY_GB=$(free -g | awk '/^Mem:/{print $2}')
    elif command -v vm_stat > /dev/null; then
        # macOS
        MEMORY_BYTES=$(sysctl -n hw.memsize)
        MEMORY_GB=$((MEMORY_BYTES / 1024 / 1024 / 1024))
    else
        MEMORY_GB="unknown"
    fi
    
    log_info "CPU核心数: $CPU_CORES"
    log_info "内存大小: ${MEMORY_GB}GB"
    
    # 建议容器数量
    if [[ "$CPU_CORES" != "unknown" && "$MEMORY_GB" != "unknown" ]]; then
        # 根据资源建议容器数量（每个容器建议至少1GB内存和1个CPU核心）
        SUGGESTED_CONTAINERS=$(( (CPU_CORES < MEMORY_GB ? CPU_CORES : MEMORY_GB) ))
        if [ $SUGGESTED_CONTAINERS -gt 10 ]; then
            SUGGESTED_CONTAINERS=10
        fi
        if [ $SUGGESTED_CONTAINERS -lt 1 ]; then
            SUGGESTED_CONTAINERS=1
        fi
        log_info "建议运行容器数量: $SUGGESTED_CONTAINERS"
    else
        SUGGESTED_CONTAINERS=1
        log_warn "无法检测系统资源，建议运行1个容器"
    fi
}

# 创建容器内的Nexus安装脚本
create_nexus_script() {
    log_step "创建Nexus安装脚本..."
    
    cat > nexus_install.sh << 'EOF'
#!/bin/bash

# 启用详细日志和错误处理
set -x  # 显示执行的每条命令
# 注意：不使用 set -e，因为我们有自定义错误处理

echo "===================="
echo "开始安装Nexus CLI..."
echo "节点ID: ${NODE_ID:-6520503}"
echo "时间: $(date)"
echo "系统信息: $(uname -a)"
echo "===================="

# 检查基本环境
echo "### 环境检查 ###"
echo "当前用户: $(whoami)"
echo "当前目录: $(pwd)"
echo "可用磁盘空间:"
df -h
echo "内存信息:"
free -h
echo "网络连通性测试:"
ping -c 2 8.8.8.8 || echo "⚠ 网络连接可能有问题"

# 安装必要的依赖
echo "### 开始安装依赖 ###"
echo "更新软件包列表..."
if ! apt-get update; then
    echo "⚠ 软件包列表更新失败，继续尝试安装..."
fi

echo "安装必要的依赖包..."
export DEBIAN_FRONTEND=noninteractive
if ! apt-get install -y curl wget ca-certificates build-essential iproute2 iputils-ping net-tools; then
    echo "⚠ 首次安装失败，尝试修复并重新安装..."
    apt-get --fix-broken install -y
    apt-get install -y curl wget ca-certificates build-essential iproute2 iputils-ping net-tools
fi

echo "验证依赖安装..."
if curl --version > /dev/null 2>&1; then
    echo "✓ curl安装成功: $(curl --version | head -n1)"
else
    echo "✗ curl安装失败，尝试重新安装..."
    apt-get install -y curl --fix-missing
fi

if wget --version > /dev/null 2>&1; then
    echo "✓ wget安装成功: $(wget --version | head -n1)"
else
    echo "✗ wget安装失败，尝试重新安装..."
    apt-get install -y wget --fix-missing
fi

# 下载并安装Nexus CLI
echo "### 下载Nexus CLI ###"

# 再次验证依赖安装状态
if ! command -v curl > /dev/null 2>&1; then
    echo "✗ curl未安装，无法下载Nexus CLI"
    exit 1
fi

echo "开始下载Nexus CLI (时间: $(date))..."
echo "下载URL: https://cli.nexus.xyz/"
echo "使用官方安装脚本..."

# 设置下载超时和重试
MAX_RETRIES=3
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    echo "尝试下载 (第 $((RETRY_COUNT + 1)) 次)..."
    
    if curl --connect-timeout 30 --max-time 300 https://cli.nexus.xyz/ | sh; then
        echo "✓ Nexus CLI下载安装完成 (时间: $(date))"
        break
    else
        echo "✗ 下载失败"
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo "等待10秒后重试..."
            sleep 10
        else
            echo "✗ 达到最大重试次数，下载失败"
            exit 1
        fi
    fi
done

# 刷新环境变量 (按照官方文档)
echo "刷新环境变量..."
if [ -f ~/.bashrc ]; then
    source ~/.bashrc
    echo "✓ 已刷新 ~/.bashrc"
fi
if [ -f ~/.zshrc ]; then
    source ~/.zshrc  
    echo "✓ 已刷新 ~/.zshrc"
fi

# 更新PATH以确保能找到nexus-network
export PATH="$HOME/.nexus/bin:$PATH"
echo "✓ 已更新PATH: $PATH"

# 验证GLIBC版本
echo "### GLIBC版本检查 ###"
echo "检查GLIBC版本..."
ldd --version
GLIBC_VERSION=$(ldd --version | head -n1 | grep -o '[0-9]\+\.[0-9]\+' | head -n1 || echo "unknown")
echo "提取的GLIBC版本: $GLIBC_VERSION"

# 检查是否支持GLIBC 2.39
if [ -n "$GLIBC_VERSION" ] && [ "$GLIBC_VERSION" != "unknown" ]; then
    GLIBC_MAJOR=$(echo $GLIBC_VERSION | cut -d. -f1)
    GLIBC_MINOR=$(echo $GLIBC_VERSION | cut -d. -f2)
    echo "GLIBC主版本: $GLIBC_MAJOR, 次版本: $GLIBC_MINOR"
    
    # 验证提取的版本号是数字
    if [ "$GLIBC_MAJOR" -eq "$GLIBC_MAJOR" ] 2>/dev/null && [ "$GLIBC_MINOR" -eq "$GLIBC_MINOR" ] 2>/dev/null; then
        if [ "$GLIBC_MAJOR" -gt 2 ] || ( [ "$GLIBC_MAJOR" -eq 2 ] && [ "$GLIBC_MINOR" -ge 39 ] ); then
            echo "✓ GLIBC版本满足要求 (当前: $GLIBC_VERSION, 需要: ≥ 2.39)"
        else
            echo "✗ GLIBC版本不满足要求 (当前: $GLIBC_VERSION, 需要: ≥ 2.39)"
            echo "警告: 可能影响Nexus运行"
        fi
    else
        echo "✗ 版本号格式错误: 主版本=$GLIBC_MAJOR, 次版本=$GLIBC_MINOR"
    fi
else
    echo "⚠ 无法检测GLIBC版本"
fi

# 验证Nexus CLI安装
echo "### 验证Nexus CLI安装 ###"
echo "检查当前用户: $(whoami)"
echo "检查HOME目录: $HOME"
echo "检查家目录内容..."
ls -la $HOME/

# 验证nexus-network命令是否可用
echo "验证nexus-network命令..."
if command -v nexus-network > /dev/null 2>&1; then
    echo "✓ nexus-network在PATH中可用"
    NEXUS_BINARY="nexus-network"
    NEXUS_DIR=""
else
    echo "⚠ nexus-network不在PATH中，查找安装位置..."
    
    # 检查可能的安装位置
    NEXUS_PATHS=(
        "$HOME/.nexus"
        "/root/.nexus"
        "/usr/local/bin"
        "/usr/bin"
    )

    NEXUS_BINARY=""
    NEXUS_DIR=""

    for path in "${NEXUS_PATHS[@]}"; do
        echo "检查: $path"
        if [ -d "$path" ] && [ -f "$path/bin/nexus-network" ]; then
            NEXUS_DIR="$path"
            NEXUS_BINARY="$path/bin/nexus-network"
            echo "✓ 找到Nexus目录: $NEXUS_DIR"
            break
        elif [ -f "$path/nexus-network" ]; then
            NEXUS_BINARY="$path/nexus-network"
            echo "✓ 找到Nexus二进制文件: $NEXUS_BINARY"
            break
        fi
    done
fi

if [ -n "$NEXUS_BINARY" ] && ( command -v "$NEXUS_BINARY" > /dev/null 2>&1 || [ -f "$NEXUS_BINARY" ] ); then
    echo "✓ Nexus CLI可用: $NEXUS_BINARY"
    echo "测试nexus-network命令:"
    if command -v "$NEXUS_BINARY" > /dev/null 2>&1; then
        $NEXUS_BINARY --help 2>&1 | head -n 5 || echo "⚠ 执行测试失败"
    else
        chmod +x "$NEXUS_BINARY"
        "$NEXUS_BINARY" --help 2>&1 | head -n 5 || echo "⚠ 执行测试失败"
    fi
else
    echo "✗ Nexus CLI安装失败: 命令不可用"
    echo "尝试全局搜索..."
    find / -name "nexus-network" -type f 2>/dev/null | head -5 || echo "未找到nexus-network文件"
    exit 1
fi

echo "===================="
echo "启动Nexus网络节点..."
echo "节点ID: ${NODE_ID:-6520503}"
echo "时间: $(date)"
echo "===================="

# 设置非交互模式
export DEBIAN_FRONTEND=noninteractive

# 显示启动前的环境
echo "启动前环境检查:"
echo "HOME目录: $HOME"
echo "PATH: $PATH"
echo "当前进程:"
ps aux

# 网络环境检查
echo "### 网络环境检查 ###"
echo "网络接口信息:"
ip addr show || ifconfig -a || echo "⚠ 无法获取网络接口信息"
echo "路由表信息:"
ip route show || route -n || echo "⚠ 无法获取路由信息"
echo "DNS配置:"
cat /etc/resolv.conf || echo "⚠ 无法读取DNS配置"
echo "测试外网连通性:"
ping -c 2 8.8.8.8 || echo "⚠ 外网连接可能有问题"

# 启动节点 (按照官方文档)
echo "### 启动Nexus节点 ###"
echo "使用命令: $NEXUS_BINARY"
echo "执行命令: nexus-network start --node-id ${NODE_ID:-6520503}"
echo "开始时间: $(date)"

# 按照官方文档启动节点
echo "尝试方式1: 使用官方命令格式启动..."
if command -v nexus-network > /dev/null 2>&1; then
    # 使用全局命令
    if timeout 60 nexus-network start --node-id ${NODE_ID:-6520503} <<< "y"; then
        echo "✓ 节点启动成功"
    else
        echo "⚠ 全局命令启动失败，尝试完整路径..."
        if timeout 60 "$NEXUS_BINARY" start --node-id ${NODE_ID:-6520503} <<< "y"; then
            echo "✓ 节点启动成功"
        else
            echo "⚠ 标准启动失败，尝试诊断模式..."
            start_diagnostics
        fi
    fi
else
    # 使用完整路径
    if timeout 60 "$NEXUS_BINARY" start --node-id ${NODE_ID:-6520503} <<< "y"; then
        echo "✓ 节点启动成功"
    else
        echo "⚠ 启动失败，尝试诊断模式..."
        start_diagnostics
    fi
fi

# 诊断函数
start_diagnostics() {
    echo "### 诊断模式 ###"
    
    # 显示更多诊断信息
    echo "检查二进制文件权限和依赖:"
    if [ -f "$NEXUS_BINARY" ]; then
        ls -la "$NEXUS_BINARY"
        file "$NEXUS_BINARY"
        ldd "$NEXUS_BINARY" || echo "⚠ 无法检查动态库依赖"
    fi
    
    echo "系统信息诊断:"
    echo "内核版本: $(uname -r)"
    echo "系统限制:"
    ulimit -a
    
    # 尝试不同的启动方式
    echo "尝试方式2: 后台启动..."
    sleep 5
    echo "重试时间: $(date)"
    
    if "$NEXUS_BINARY" start --node-id ${NODE_ID:-6520503} <<< "y" &
    then
        NEXUS_PID=$!
        echo "节点进程ID: $NEXUS_PID"
        sleep 15
        
        if kill -0 "$NEXUS_PID" 2>/dev/null; then
            echo "✓ 节点在后台运行中"
            wait "$NEXUS_PID"
        else
            echo "⚠ 节点进程已退出"
            show_logs_and_exit
        fi
    else
        echo "✗ 所有启动方式都失败"
        show_logs_and_exit
    fi
}

# 显示日志并退出
show_logs_and_exit() {
    echo "尝试查看错误日志..."
    if [ -n "$NEXUS_DIR" ]; then
        find "$NEXUS_DIR" -name "*.log" -exec echo "=== {} ===" \; -exec cat {} \; 2>/dev/null || echo "未找到日志文件"
    else
        find /root -name "*.log" -path "*nexus*" -exec echo "=== {} ===" \; -exec cat {} \; 2>/dev/null || echo "未找到日志文件"
        find /home -name "*.log" -path "*nexus*" -exec echo "=== {} ===" \; -exec cat {} \; 2>/dev/null || true
    fi
    exit 1
}

echo "===================="
echo "Nexus节点启动完成!"
echo "节点ID: ${NODE_ID:-6520503}"
echo "完成时间: $(date)"
echo "===================="

# 显示节点状态
echo "### 节点状态检查 ###"
sleep 5
echo "检查进程状态:"
ps aux | grep nexus || echo "未找到nexus进程"

# 保持容器运行
echo "节点正在运行中..."
echo "使用 'docker logs <容器名>' 查看详细日志"

# 循环输出节点状态
while true; do
    echo "$(date): 节点 ${NODE_ID:-6520503} 正在运行..."
    echo "当前进程数: $(ps aux | wc -l)"
    echo "内存使用: $(free -h | grep Mem:)"
    sleep 300  # 每5分钟输出一次状态
done
EOF

    chmod +x nexus_install.sh
    log_info "Nexus安装脚本创建完成"
}

# 运行单个容器
run_single_container() {
    local container_name="nexus-node-$1"
    local node_id="$2"
    
    log_step "启动容器: $container_name (节点ID: $node_id)"
    log_info "使用Ubuntu 24.04镜像以确保GLIBC 2.39支持"
    
    # 检查容器是否已存在
    if docker ps -a --format "table {{.Names}}" | grep -q "^$container_name$"; then
        log_warn "容器 $container_name 已存在，正在删除..."
        docker rm -f $container_name > /dev/null 2>&1
    fi
    
    # 确保脚本有执行权限
    chmod +x nexus_install.sh 2>/dev/null || true
    
    # 运行容器 (使用Ubuntu 24.04以支持GLIBC 2.39)
    # 添加最大权限和设备映射以支持Nexus网络功能
    docker run -d \
        --name "$container_name" \
        --env NODE_ID="$node_id" \
        --env DEBIAN_FRONTEND=noninteractive \
        --network host \
        --privileged \
        --cap-add=ALL \
        --security-opt seccomp=unconfined \
        --security-opt apparmor=unconfined \
        --device=/dev/net/tun \
        --device=/dev/urandom \
        --device=/dev/random \
        -v /dev:/dev \
        -v /proc:/proc \
        -v /sys:/sys \
        -v "$(pwd)/nexus_install.sh:/app/nexus_install.sh:ro" \
        ubuntu:24.04 \
        /bin/bash -c "
            cd /app && 
            ./nexus_install.sh
        "
    
    log_info "容器 $container_name 已启动"
}

# 查看容器日志函数
view_container_logs() {
    local container_count=$1
    
    log_step "选择要查看日志的容器："
    echo "0. 查看所有容器日志摘要"
    for ((i=1; i<=container_count; i++)); do
        local container_name="nexus-node-$i"
        local status=$(docker ps --filter "name=$container_name" --format "{{.Status}}" 2>/dev/null || echo "未运行")
        echo "$i. $container_name ($status)"
    done
    echo "q. 退出日志查看"
    
    echo
    log_step "请输入选择 (0-$container_count, q): "
    read -r log_choice
    
    case $log_choice in
        0)
            log_info "显示所有容器日志摘要..."
            echo
            for ((i=1; i<=container_count; i++)); do
                local container_name="nexus-node-$i"
                if docker ps --filter "name=$container_name" --format "{{.Names}}" | grep -q "$container_name"; then
                    echo -e "${BLUE}=== $container_name 最新日志 ===${NC}"
                    docker logs --tail 10 "$container_name" 2>/dev/null || echo "无法获取日志"
                    echo
                else
                    echo -e "${RED}=== $container_name (未运行) ===${NC}"
                    echo
                fi
            done
            ;;
        [1-9]|10)
            if [[ "$log_choice" =~ ^[0-9]+$ ]] && [ "$log_choice" -ge 1 ] && [ "$log_choice" -le "$container_count" ]; then
                local container_name="nexus-node-$log_choice"
                log_info "显示容器 $container_name 的详细日志..."
                echo
                
                if docker ps --filter "name=$container_name" --format "{{.Names}}" | grep -q "$container_name"; then
                    echo -e "${BLUE}=== 实时日志 (按 Ctrl+C 退出) ===${NC}"
                    docker logs -f "$container_name"
                else
                    log_error "容器 $container_name 未运行"
                    # 尝试显示已停止容器的日志
                    if docker ps -a --filter "name=$container_name" --format "{{.Names}}" | grep -q "$container_name"; then
                        log_info "显示已停止容器的日志:"
                        docker logs "$container_name"
                    fi
                fi
            else
                log_error "无效的选择: $log_choice"
            fi
            ;;
        q|Q)
            log_info "退出日志查看"
            return 0
            ;;
        *)
            log_error "无效的选择: $log_choice"
            ;;
    esac
}

# 交互式日志管理
interactive_log_management() {
    local container_count=$1
    
    while true; do
        echo
        log_step "日志管理选项："
        echo "1. 查看容器日志"
        echo "2. 查看所有容器状态"
        echo "3. 重启失败的容器"
        echo "4. 退出"
        echo
        log_step "请选择操作 (1-4): "
        read -r management_choice
        
        case $management_choice in
            1)
                view_container_logs "$container_count"
                ;;
            2)
                log_info "当前容器状态:"
                docker ps -a --filter "name=nexus-node-" --format "table {{.Names}}\t{{.Status}}\t{{.CreatedAt}}"
                ;;
            3)
                log_step "检查并重启失败的容器..."
                for ((i=1; i<=container_count; i++)); do
                    local container_name="nexus-node-$i"
                    local status=$(docker ps --filter "name=$container_name" --format "{{.Status}}" 2>/dev/null)
                    
                    if [ -z "$status" ]; then
                        log_warn "容器 $container_name 未运行，尝试重启..."
                        docker start "$container_name" > /dev/null 2>&1 && log_info "容器 $container_name 重启成功" || log_error "容器 $container_name 重启失败"
                    fi
                done
                ;;
            4)
                log_info "退出日志管理"
                break
                ;;
            *)
                log_error "无效的选择: $management_choice"
                ;;
        esac
    done
}

# 本地安装Nexus (不使用容器)
install_nexus_locally() {
    log_step "在本地安装Nexus CLI..."
    
    if [[ "$OS" != "linux" ]]; then
        log_error "本地安装仅支持Linux系统"
        return 1
    fi
    
    # 安装依赖
    case $DISTRO in
        "ubuntu")
            if command -v sudo > /dev/null; then
                sudo apt-get update
                sudo apt-get install -y curl wget ca-certificates
            else
                apt-get update  
                apt-get install -y curl wget ca-certificates
            fi
            ;;
        "centos")
            if command -v sudo > /dev/null; then
                sudo yum install -y curl wget ca-certificates
            else
                yum install -y curl wget ca-certificates
            fi
            ;;
    esac
    
    # 下载并安装Nexus CLI
    log_info "下载Nexus CLI..."
    if curl https://cli.nexus.xyz/ | sh; then
        log_info "✓ Nexus CLI安装成功"
    else
        log_error "Nexus CLI安装失败"
        return 1
    fi
    
    # 刷新环境
    if [ -f ~/.bashrc ]; then
        source ~/.bashrc
    fi
    export PATH="$HOME/.nexus/bin:$PATH"
    
    # 验证安装
    if command -v nexus-network > /dev/null 2>&1; then
        log_info "✓ Nexus CLI命令可用"
        
        # 询问节点ID并启动
        echo
        read -p "请输入节点ID (默认: 6520503): " node_id
        node_id=${node_id:-6520503}
        
        log_step "启动Nexus节点 (节点ID: $node_id)..."
        log_info "开始时间: $(date)"
        
        # 启动节点
        echo "按回车确认启动..."
        nexus-network start --node-id "$node_id"
        
    elif [ -f "$HOME/.nexus/bin/nexus-network" ]; then
        log_info "✓ Nexus CLI二进制文件已安装"
        
        # 询问节点ID并启动
        echo
        read -p "请输入节点ID (默认: 6520503): " node_id
        node_id=${node_id:-6520503}
        
        log_step "启动Nexus节点 (节点ID: $node_id)..."
        log_info "开始时间: $(date)"
        
        # 启动节点
        echo "按回车确认启动..."
        "$HOME/.nexus/bin/nexus-network" start --node-id "$node_id"
    else
        log_error "Nexus CLI安装失败，未找到可执行文件"
        return 1
    fi
}

# 主函数
main() {
    log_info "=== Nexus 运行脚本启动 ==="
    
    check_root
    detect_os
    
    echo
    log_step "请选择安装方式："
    echo "1. 容器模式 (推荐用于多节点)"
    echo "2. 本地安装 (推荐用于解决网络问题)"
    echo
    read -p "请选择 (1/2): " install_mode
    
    case $install_mode in
        1)
            log_info "选择容器模式..."
            install_docker
            detect_system_resources
            create_nexus_script
            ;;
        2)
            log_info "选择本地安装模式..."
            install_nexus_locally
            return 0
            ;;
        *)
            log_warn "无效选择，默认使用容器模式..."
            install_docker
            detect_system_resources
            create_nexus_script
            ;;
    esac
    
    echo
    log_step "请输入要运行的容器数量 (建议: $SUGGESTED_CONTAINERS, 最大: 10): "
    read -r CONTAINER_COUNT
    
    # 验证输入
    if ! [[ "$CONTAINER_COUNT" =~ ^[0-9]+$ ]] || [ "$CONTAINER_COUNT" -lt 1 ] || [ "$CONTAINER_COUNT" -gt 10 ]; then
        log_error "无效的容器数量，使用建议值: $SUGGESTED_CONTAINERS"
        CONTAINER_COUNT=$SUGGESTED_CONTAINERS
    fi
    
    log_info "将运行 $CONTAINER_COUNT 个容器"
    
    # 获取节点ID
    echo
    log_step "请输入基础节点ID (默认: 6520503): "
    read -r BASE_NODE_ID
    
    if [ -z "$BASE_NODE_ID" ]; then
        BASE_NODE_ID=6520503
    fi
    
    # 验证节点ID是数字
    if ! [[ "$BASE_NODE_ID" =~ ^[0-9]+$ ]]; then
        log_error "无效的节点ID，使用默认值: 6520503"
        BASE_NODE_ID=6520503
    fi
    
    log_info "基础节点ID: $BASE_NODE_ID"
    
    # 启动多个容器
    echo
    log_step "开始启动容器..."
    
    for ((i=1; i<=CONTAINER_COUNT; i++)); do
        NODE_ID=$((BASE_NODE_ID + i - 1))
        run_single_container $i $NODE_ID
        
        # 添加小延迟避免资源冲突
        sleep 2
    done
    
    echo
    log_info "=== 所有容器启动完成 ==="
    log_info "运行的容器:"
    docker ps --filter "name=nexus-node-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    # 等待容器初始化
    log_step "等待容器初始化完成..."
    sleep 10
    
    # 显示初始日志摘要
    echo
    log_info "容器初始化日志摘要:"
    for ((i=1; i<=CONTAINER_COUNT; i++)); do
        local container_name="nexus-node-$i"
        if docker ps --filter "name=$container_name" --format "{{.Names}}" | grep -q "$container_name"; then
            echo -e "${BLUE}=== $container_name ===${NC}"
            docker logs --tail 5 "$container_name" 2>/dev/null || echo "无法获取日志"
            echo
        fi
    done
    
    echo
    log_info "容器管理命令:"
    echo "  查看所有Nexus容器: docker ps --filter 'name=nexus-node-'"
    echo "  查看容器日志: docker logs nexus-node-1"
    echo "  进入容器: docker exec -it nexus-node-1 /bin/bash"
    echo "  停止所有容器: docker stop \$(docker ps -q --filter 'name=nexus-node-')"
    echo "  删除所有容器: docker rm -f \$(docker ps -aq --filter 'name=nexus-node-')"
    
    # 询问是否进入交互式日志管理
    echo
    log_step "是否进入交互式日志管理? (y/n): "
    read -r interactive_choice
    
    if [[ "$interactive_choice" =~ ^[Yy]$ ]]; then
        interactive_log_management "$CONTAINER_COUNT"
    fi
    
    echo
    log_info "脚本执行完成！"
}

# 执行主函数
main "$@" 