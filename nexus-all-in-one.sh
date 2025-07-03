#!/bin/bash

# Nexus 节点多开一体化脚本 v2.0
# 集成所有功能：节点管理、监控、快速启动
# 使用官方容器镜像，支持交互式节点ID输入

set -e

# ============================================================================
# 全局配置
# ============================================================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Docker配置
DOCKER_IMAGE="nexusxyz/nexus-zkvm:latest"
NETWORK_NAME="nexus-network"
CONTAINER_PREFIX="nexus-node"
DEFAULT_NODE_ID="6520503"

# 监控配置
REFRESH_INTERVAL=5
LOG_FILE="nexus-monitor.log"
ALERT_THRESHOLD_CPU=80
ALERT_THRESHOLD_MEMORY=90

# ============================================================================
# 基础工具函数
# ============================================================================

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_alert() {
    echo -e "${RED}[ALERT]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ALERT] $1" >> "$LOG_FILE"
}

# 显示主欢迎界面
show_main_welcome() {
    clear
    echo -e "${CYAN}"
    cat << 'EOF'
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║               Nexus 节点多开一体化管理器                     ║
║                        v2.0 完整版                           ║
║                                                              ║
║  🚀 核心功能:                                               ║
║  • 官方容器镜像支持 (nexusxyz/nexus-zkvm)                  ║
║  • 交互式节点ID配置                                        ║
║  • 自动内存检测与优化                                      ║
║  • 实时监控和告警                                          ║
║  • 一键部署和管理                                          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    echo
}

# ============================================================================
# 系统检查和安装
# ============================================================================

# 检查系统要求
check_requirements() {
    log_info "正在检查系统要求..."
    
    # 检查curl
    if ! command -v curl &> /dev/null; then
        log_error "curl 未安装，请先安装 curl"
        exit 1
    fi
    
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        log_warning "Docker 未安装，正在自动安装..."
        install_docker
    fi
    
    # 检查Docker服务
    if ! systemctl is-active --quiet docker; then
        log_info "正在启动 Docker 服务..."
        sudo systemctl start docker
        sudo systemctl enable docker
    fi
    
    log_success "系统要求检查完成"
}

# 安装Docker
install_docker() {
    log_info "正在安装 Docker..."
    
    # 检测操作系统
    if [ -f /etc/debian_version ]; then
        # Debian/Ubuntu
        sudo apt-get update
        sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        sudo apt-get update
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io
    elif [ -f /etc/redhat-release ]; then
        # CentOS/RHEL
        sudo yum install -y yum-utils
        sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        sudo yum install -y docker-ce docker-ce-cli containerd.io
    else
        log_error "不支持的操作系统，请手动安装 Docker"
        exit 1
    fi
    
    # 将当前用户添加到docker组
    sudo usermod -aG docker $USER
    
    log_success "Docker 安装完成"
    log_warning "请重新登录或执行 'newgrp docker' 以应用用户组更改"
}

# ============================================================================
# 系统信息和计算
# ============================================================================

# 获取系统内存信息
get_memory_info() {
    # 获取总内存（GB）
    TOTAL_MEMORY_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    TOTAL_MEMORY_GB=$((TOTAL_MEMORY_KB / 1024 / 1024))
    
    # 获取可用内存（GB）
    AVAILABLE_MEMORY_KB=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
    AVAILABLE_MEMORY_GB=$((AVAILABLE_MEMORY_KB / 1024 / 1024))
    
    echo
    log_info "═══ 系统内存信息 ═══"
    echo "总内存: ${TOTAL_MEMORY_GB}GB"
    echo "可用内存: ${AVAILABLE_MEMORY_GB}GB"
}

# 计算推荐节点数量
calculate_recommended_nodes() {
    # 每个节点预估使用 2GB 内存
    MEMORY_PER_NODE=2
    # 保留 2GB 系统内存
    RESERVED_MEMORY=2
    
    # 计算可用于节点的内存
    USABLE_MEMORY=$((AVAILABLE_MEMORY_GB - RESERVED_MEMORY))
    
    if [ $USABLE_MEMORY -le 0 ]; then
        RECOMMENDED_NODES=1
    else
        RECOMMENDED_NODES=$((USABLE_MEMORY / MEMORY_PER_NODE))
        
        # 最少1个节点，最多20个节点
        if [ $RECOMMENDED_NODES -lt 1 ]; then
            RECOMMENDED_NODES=1
        elif [ $RECOMMENDED_NODES -gt 20 ]; then
            RECOMMENDED_NODES=20
        fi
    fi
    
    echo "推荐节点数量: $RECOMMENDED_NODES"
    echo
}

# 获取系统资源使用情况
get_system_stats() {
    # CPU使用率
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//' || echo "0")
    
    # 内存使用情况
    local mem_total=$(free -m | awk 'NR==2{printf "%.0f", $2}')
    local mem_used=$(free -m | awk 'NR==2{printf "%.0f", $3}')
    local mem_free=$(free -m | awk 'NR==2{printf "%.0f", $4}')
    local mem_percent=$(free | awk 'NR==2{printf "%.1f", $3*100/$2}')
    
    # 磁盘使用情况
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    echo "$cpu_usage|$mem_total|$mem_used|$mem_free|$mem_percent|$disk_usage"
}

# ============================================================================
# 节点配置和管理
# ============================================================================

# 交互式获取节点配置
get_node_configuration() {
    echo -e "${YELLOW}═══ 节点配置 ═══${NC}"
    echo
    
    # 获取节点数量
    while true; do
        read -p "请输入要启动的节点数量 [推荐: $RECOMMENDED_NODES]: " INPUT_NODE_COUNT
        
        # 如果用户直接回车，使用推荐值
        if [ -z "$INPUT_NODE_COUNT" ]; then
            NODE_COUNT=$RECOMMENDED_NODES
            break
        fi
        
        # 验证输入
        if [[ "$INPUT_NODE_COUNT" =~ ^[0-9]+$ ]] && [ "$INPUT_NODE_COUNT" -ge 1 ] && [ "$INPUT_NODE_COUNT" -le 20 ]; then
            NODE_COUNT=$INPUT_NODE_COUNT
            break
        else
            log_error "请输入1-20之间的有效数字"
        fi
    done
    
    echo
    log_info "将启动 $NODE_COUNT 个节点"
    echo
    
    # 获取起始节点ID
    while true; do
        read -p "请输入起始节点ID [默认: $DEFAULT_NODE_ID]: " INPUT_START_ID
        
        # 如果用户直接回车，使用默认值
        if [ -z "$INPUT_START_ID" ]; then
            START_NODE_ID=$DEFAULT_NODE_ID
            break
        fi
        
        # 验证输入（简单验证数字）
        if [[ "$INPUT_START_ID" =~ ^[0-9]+$ ]]; then
            START_NODE_ID=$INPUT_START_ID
            break
        else
            log_error "请输入有效的数字节点ID"
        fi
    done
    
    echo
    log_info "起始节点ID: $START_NODE_ID"
    
    # 显示节点ID列表
    echo
    echo -e "${CYAN}节点ID分配:${NC}"
    for i in $(seq 1 $NODE_COUNT); do
        NODE_ID=$((START_NODE_ID + i - 1))
        echo "  节点 $i: ID $NODE_ID"
    done
    echo
    
    # 确认配置
    echo -e "${YELLOW}配置确认:${NC}"
    echo "  节点数量: $NODE_COUNT"
    echo "  起始ID: $START_NODE_ID"
    echo "  镜像: $DOCKER_IMAGE"
    echo
    
    read -p "确认启动这些节点? [Y/n]: " CONFIRM
    if [[ "$CONFIRM" =~ ^[Nn]$ ]]; then
        log_info "操作已取消"
        return 1
    fi
    return 0
}

# 拉取官方Docker镜像
pull_docker_image() {
    log_info "正在拉取 Nexus 官方镜像..."
    
    # 检查镜像是否已存在
    if docker images | grep -q "nexusxyz/nexus-zkvm"; then
        log_info "发现已有镜像，检查更新..."
    fi
    
    # 拉取最新镜像
    if docker pull $DOCKER_IMAGE; then
        log_success "镜像拉取完成"
    else
        log_error "镜像拉取失败，请检查网络连接"
        return 1
    fi
}

# 创建Docker网络
create_network() {
    if ! docker network ls | grep -q "$NETWORK_NAME"; then
        log_info "创建 Docker 网络: $NETWORK_NAME"
        docker network create $NETWORK_NAME
    else
        log_info "Docker 网络已存在: $NETWORK_NAME"
    fi
}

# 停止现有容器
stop_existing_containers() {
    log_info "正在停止现有的 Nexus 容器..."
    
    # 获取所有匹配的容器
    EXISTING_CONTAINERS=$(docker ps -aq --filter "name=$CONTAINER_PREFIX-" 2>/dev/null || true)
    
    if [ -n "$EXISTING_CONTAINERS" ]; then
        echo "$EXISTING_CONTAINERS" | xargs docker stop 2>/dev/null || true
        echo "$EXISTING_CONTAINERS" | xargs docker rm 2>/dev/null || true
        log_info "已清理现有容器"
    else
        log_info "没有发现运行中的容器"
    fi
}

# 启动节点容器
start_nodes() {
    log_info "正在启动 $NODE_COUNT 个 Nexus 节点..."
    echo
    
    for i in $(seq 1 $NODE_COUNT); do
        CONTAINER_NAME="$CONTAINER_PREFIX-$i"
        NODE_ID=$((START_NODE_ID + i - 1))
        
        echo -e "${BLUE}启动节点 $i/${NODE_COUNT}${NC}"
        echo "  容器名: $CONTAINER_NAME"
        echo "  节点ID: $NODE_ID"
        
        # 创建数据卷
        VOLUME_NAME="nexus-data-$i"
        
        # 启动容器
        if docker run -d \
            --name "$CONTAINER_NAME" \
            --network "$NETWORK_NAME" \
            --restart unless-stopped \
            -v "$VOLUME_NAME":/data \
            -e NODE_ID="$NODE_ID" \
            "$DOCKER_IMAGE" \
            bash -c "nexus-network start --node-id $NODE_ID"; then
            
            echo -e "  状态: ${GREEN}启动成功${NC}"
        else
            echo -e "  状态: ${RED}启动失败${NC}"
            log_error "节点 $i 启动失败"
        fi
        
        echo
        
        # 启动间隔，避免同时启动过多容器
        if [ $i -lt $NODE_COUNT ]; then
            sleep 2
        fi
    done
    
    log_success "所有节点启动完成！"
}

# ============================================================================
# 节点状态和日志
# ============================================================================

# 显示节点状态
show_status() {
    echo
    log_info "═══ Nexus 节点状态 ═══"
    echo
    
    # 获取所有nexus容器
    CONTAINERS=$(docker ps -a --filter "name=$CONTAINER_PREFIX-" --format "{{.Names}}" 2>/dev/null || true)
    
    if [ -z "$CONTAINERS" ]; then
        log_warning "没有发现 Nexus 节点容器"
        return 1
    fi
    
    # 显示表头
    printf "%-15s %-12s %-15s %-20s %-15s\n" "容器名" "状态" "运行时间" "节点ID" "端口"
    echo "────────────────────────────────────────────────────────────────────────────"
    
    local total_count=0
    local running_count=0
    
    for container in $CONTAINERS; do
        total_count=$((total_count + 1))
        
        # 获取容器信息
        local status=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "unknown")
        local running_time=$(docker inspect --format='{{.State.StartedAt}}' "$container" 2>/dev/null | cut -d'T' -f1 || echo "unknown")
        local ports=$(docker port "$container" 2>/dev/null | tr '\n' ',' | sed 's/,$//' || echo "-")
        
        # 尝试从环境变量获取节点ID
        local node_id=$(docker inspect --format='{{range .Config.Env}}{{if eq (index (split . "=") 0) "NODE_ID"}}{{index (split . "=") 1}}{{end}}{{end}}' "$container" 2>/dev/null || echo "-")
        
        # 状态颜色
        case "$status" in
            "running")
                status_colored="${GREEN}运行中${NC}"
                running_count=$((running_count + 1))
                ;;
            "exited")
                status_colored="${RED}已退出${NC}"
                ;;
            "restarting")
                status_colored="${YELLOW}重启中${NC}"
                ;;
            *)
                status_colored="${YELLOW}$status${NC}"
                ;;
        esac
        
        printf "%-15s %-20s %-15s %-20s %-15s\n" "$container" "$status_colored" "$running_time" "$node_id" "$ports"
    done
    
    echo
    echo -e "总计: $total_count 个节点 | ${GREEN}运行中: $running_count${NC} | ${RED}异常: $((total_count - running_count))${NC}"
    echo
}

# 查看容器日志
show_logs() {
    local node_number=$1
    
    if [ -z "$node_number" ]; then
        # 显示所有容器的简要日志
        log_info "显示所有节点的最新日志..."
        echo
        
        CONTAINERS=$(docker ps --filter "name=$CONTAINER_PREFIX-" --format "{{.Names}}" 2>/dev/null || true)
        
        if [ -z "$CONTAINERS" ]; then
            log_warning "没有发现运行中的容器"
            return 1
        fi
        
        for container in $CONTAINERS; do
            echo -e "${CYAN}=== $container 日志 (最近10行) ===${NC}"
            docker logs --tail 10 "$container" 2>/dev/null || echo "无法获取日志"
            echo
        done
    else
        # 显示特定节点的详细日志
        CONTAINER_NAME="$CONTAINER_PREFIX-$node_number"
        
        if docker ps --filter "name=$CONTAINER_NAME" | grep -q "$CONTAINER_NAME"; then
            log_info "显示节点 $node_number 的实时日志 (按Ctrl+C退出)..."
            echo
            docker logs -f "$CONTAINER_NAME"
        else
            log_error "节点 $node_number 不存在或未运行"
            return 1
        fi
    fi
}

# ============================================================================
# 节点操作
# ============================================================================

# 停止所有节点
stop_nodes() {
    log_info "正在停止所有 Nexus 节点..."
    
    CONTAINERS=$(docker ps -q --filter "name=$CONTAINER_PREFIX-" 2>/dev/null || true)
    
    if [ -n "$CONTAINERS" ]; then
        echo "$CONTAINERS" | xargs docker stop 2>/dev/null || true
        log_success "所有节点已停止"
    else
        log_info "没有运行中的节点"
    fi
}

# 重启所有节点
restart_nodes() {
    log_info "正在重启所有 Nexus 节点..."
    
    # 先停止
    stop_nodes
    
    # 等待一下
    sleep 3
    
    # 重新获取配置并启动
    get_memory_info
    calculate_recommended_nodes
    if get_node_configuration; then
        pull_docker_image && create_network && start_nodes
    fi
}

# 清理资源
cleanup() {
    echo
    log_warning "此操作将删除所有容器、数据卷和网络，是否继续？"
    read -p "请输入 'yes' 确认清理: " CONFIRM
    
    if [ "$CONFIRM" != "yes" ]; then
        log_info "操作已取消"
        return 0
    fi
    
    log_info "正在清理资源..."
    
    # 停止并删除所有nexus容器
    CONTAINERS=$(docker ps -aq --filter "name=$CONTAINER_PREFIX-" 2>/dev/null || true)
    if [ -n "$CONTAINERS" ]; then
        echo "$CONTAINERS" | xargs docker stop 2>/dev/null || true
        echo "$CONTAINERS" | xargs docker rm 2>/dev/null || true
    fi
    
    # 删除数据卷
    VOLUMES=$(docker volume ls -q --filter "name=nexus-data-" 2>/dev/null || true)
    if [ -n "$VOLUMES" ]; then
        echo "$VOLUMES" | xargs docker volume rm 2>/dev/null || true
    fi
    
    # 删除网络
    docker network rm "$NETWORK_NAME" 2>/dev/null || true
    
    # 询问是否删除镜像
    read -p "是否删除 Nexus Docker 镜像? [y/N]: " DELETE_IMAGE
    if [[ "$DELETE_IMAGE" =~ ^[Yy]$ ]]; then
        docker rmi "$DOCKER_IMAGE" 2>/dev/null || true
        log_info "镜像已删除"
    fi
    
    log_success "清理完成"
}

# ============================================================================
# 监控功能
# ============================================================================

# 获取容器列表
get_containers() {
    docker ps --filter "name=$CONTAINER_PREFIX-" --format "{{.Names}}" 2>/dev/null || true
}

# 获取容器状态
get_container_status() {
    local container_name=$1
    docker inspect --format='{{.State.Status}}' "$container_name" 2>/dev/null || echo "not_found"
}

# 检查容器健康状态
check_container_health() {
    local container_name=$1
    local status=$(get_container_status "$container_name")
    
    case "$status" in
        "running")
            echo -e "${GREEN}运行中${NC}"
            return 0
            ;;
        "exited")
            echo -e "${RED}已退出${NC}"
            return 1
            ;;
        "restarting")
            echo -e "${YELLOW}重启中${NC}"
            return 2
            ;;
        "paused")
            echo -e "${YELLOW}已暂停${NC}"
            return 2
            ;;
        "not_found")
            echo -e "${RED}不存在${NC}"
            return 3
            ;;
        *)
            echo -e "${YELLOW}未知${NC}"
            return 4
            ;;
    esac
}

# 显示实时监控界面
show_real_time_monitor() {
    while true; do
        clear
        echo -e "${CYAN}=== Nexus 节点实时监控 ===${NC}"
        echo "刷新间隔: ${REFRESH_INTERVAL}秒 | 时间: $(date '+%Y-%m-%d %H:%M:%S')"
        echo

        # 系统资源概览
        echo -e "${BLUE}=== 系统资源 ===${NC}"
        local sys_stats=$(get_system_stats)
        IFS='|' read -r cpu_usage mem_total mem_used mem_free mem_percent disk_usage <<< "$sys_stats"
        
        printf "CPU使用率: %s%% | 内存: %sM/%sM (%.1f%%) | 磁盘使用率: %s%%\n" \
               "$cpu_usage" "$mem_used" "$mem_total" "$mem_percent" "$disk_usage"
        echo

        # 节点状态概览
        echo -e "${BLUE}=== 节点状态概览 ===${NC}"
        local containers=$(get_containers)
        local total_count=0
        local running_count=0
        local error_count=0

        if [ -z "$containers" ]; then
            echo "没有发现 Nexus 节点容器"
        else
            printf "%-15s %-10s %-15s %-15s %-20s %-15s\n" \
                   "容器名" "状态" "CPU使用率" "内存使用率" "网络I/O" "磁盘I/O"
            echo "────────────────────────────────────────────────────────────────────────────────"
            
            for container in $containers; do
                total_count=$((total_count + 1))
                local health_status=$(check_container_health "$container")
                local status_code=$?
                
                if [ $status_code -eq 0 ]; then
                    running_count=$((running_count + 1))
                    
                    # 获取详细统计信息
                    local stats=$(docker stats --no-stream --format "{{.CPUPerc}}|{{.MemPerc}}|{{.NetIO}}|{{.BlockIO}}" "$container" 2>/dev/null || echo "0%|0%|0B / 0B|0B / 0B")
                    IFS='|' read -r cpu_perc mem_perc net_io block_io <<< "$stats"
                    
                    printf "%-15s %-10s %-15s %-15s %-20s %-15s\n" \
                           "$container" "$health_status" "$cpu_perc" "$mem_perc" "$net_io" "$block_io"
                    
                    # 检查告警阈值
                    local cpu_num=$(echo "$cpu_perc" | sed 's/%//')
                    local mem_num=$(echo "$mem_perc" | sed 's/%//')
                    
                    if command -v bc >/dev/null 2>&1; then
                        if (( $(echo "$cpu_num > $ALERT_THRESHOLD_CPU" | bc -l) )); then
                            log_alert "容器 $container CPU使用率过高: $cpu_perc"
                        fi
                        
                        if (( $(echo "$mem_num > $ALERT_THRESHOLD_MEMORY" | bc -l) )); then
                            log_alert "容器 $container 内存使用率过高: $mem_perc"
                        fi
                    fi
                else
                    error_count=$((error_count + 1))
                    printf "%-15s %-10s %-15s %-15s %-20s %-15s\n" \
                           "$container" "$health_status" "-" "-" "-" "-"
                fi
            done
            
            echo
            echo -e "总节点数: $total_count | ${GREEN}运行中: $running_count${NC} | ${RED}异常: $error_count${NC}"
        fi

        echo
        echo -e "${YELLOW}按 Ctrl+C 退出监控${NC}"
        
        sleep $REFRESH_INTERVAL
    done
}

# 显示简单监控状态
show_simple_monitor_status() {
    echo -e "${CYAN}=== Nexus 节点监控状态 ===${NC}"
    echo "检查时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo

    local containers=$(get_containers)
    if [ -z "$containers" ]; then
        echo "没有发现 Nexus 节点容器"
        return 1
    fi

    local total_count=0
    local running_count=0

    for container in $containers; do
        total_count=$((total_count + 1))
        local health_status=$(check_container_health "$container")
        local status_code=$?
        
        if [ $status_code -eq 0 ]; then
            running_count=$((running_count + 1))
        fi
        
        echo "$container: $health_status"
    done

    echo
    echo -e "总计: $total_count 个节点，${GREEN}$running_count 个运行中${NC}，${RED}$((total_count - running_count)) 个异常${NC}"
}

# 生成监控报告
generate_monitor_report() {
    local report_file="nexus-report-$(date +%Y%m%d_%H%M%S).txt"
    
    echo "生成监控报告: $report_file"
    
    {
        echo "=== Nexus 节点监控报告 ==="
        echo "生成时间: $(date '+%Y-%m-%d %H:%M:%S')"
        echo
        
        echo "=== 系统信息 ==="
        echo "操作系统: $(lsb_release -d 2>/dev/null | cut -f2 || echo "未知")"
        echo "内核版本: $(uname -r)"
        echo "Docker版本: $(docker --version 2>/dev/null || echo "未安装")"
        echo
        
        echo "=== 系统资源 ==="
        local sys_stats=$(get_system_stats)
        IFS='|' read -r cpu_usage mem_total mem_used mem_free mem_percent disk_usage <<< "$sys_stats"
        echo "CPU使用率: $cpu_usage%"
        echo "内存使用: $mem_used MB / $mem_total MB ($mem_percent%)"
        echo "磁盘使用率: $disk_usage%"
        echo
        
        echo "=== 节点状态 ==="
        local containers=$(get_containers)
        if [ -z "$containers" ]; then
            echo "没有发现 Nexus 节点容器"
        else
            for container in $containers; do
                local health_status=$(check_container_health "$container")
                echo "$container: $health_status"
            done
        fi
        echo
        
        echo "=== Docker 容器详情 ==="
        docker ps --filter "name=$CONTAINER_PREFIX-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.CreatedAt}}"
        
    } > "$report_file"
    
    log_success "报告已生成: $report_file"
}

# 重启异常节点
restart_failed_nodes() {
    echo "检查并重启异常节点..."
    
    local containers=$(get_containers)
    local restarted_count=0
    
    for container in $containers; do
        local status=$(get_container_status "$container")
        
        if [ "$status" != "running" ]; then
            log_warning "重启异常节点: $container (状态: $status)"
            docker restart "$container" >/dev/null 2>&1
            restarted_count=$((restarted_count + 1))
            sleep 2
        fi
    done
    
    if [ $restarted_count -eq 0 ]; then
        log_success "所有节点运行正常，无需重启"
    else
        log_success "已重启 $restarted_count 个异常节点"
    fi
}

# ============================================================================
# 主菜单界面
# ============================================================================

# 显示主菜单
show_main_menu() {
    while true; do
        echo
        echo -e "${CYAN}═══════════════════════════════════════${NC}"
        echo -e "${CYAN}             主菜单选项                ${NC}"
        echo -e "${CYAN}═══════════════════════════════════════${NC}"
        echo "1. 🚀 启动节点"
        echo "2. 📊 查看状态"
        echo "3. 📝 查看日志"
        echo "4. ⏹️  停止节点"
        echo "5. 🔄 重启节点"
        echo "6. 📺 实时监控"
        echo "7. 📋 监控报告"
        echo "8. 🧹 清理资源"
        echo "9. ℹ️  系统信息"
        echo "0. 🚪 退出程序"
        echo -e "${CYAN}═══════════════════════════════════════${NC}"
        echo
        
        read -p "请选择操作 [0-9]: " CHOICE
        
        case "$CHOICE" in
            1)
                echo
                log_info "开始启动节点流程..."
                get_memory_info
                calculate_recommended_nodes
                if get_node_configuration; then
                    pull_docker_image && create_network && stop_existing_containers && start_nodes
                    show_status
                fi
                ;;
            2)
                show_status
                ;;
            3)
                echo
                read -p "请输入节点编号 (留空查看所有): " NODE_NUM
                show_logs "$NODE_NUM"
                ;;
            4)
                stop_nodes
                ;;
            5)
                restart_nodes
                ;;
            6)
                log_info "启动实时监控界面..."
                echo "提示: 按 Ctrl+C 退出监控"
                sleep 2
                show_real_time_monitor
                ;;
            7)
                echo
                echo "1. 查看简单状态"
                echo "2. 生成详细报告"
                echo "3. 重启异常节点"
                read -p "请选择 [1-3]: " MONITOR_CHOICE
                case "$MONITOR_CHOICE" in
                    1) show_simple_monitor_status ;;
                    2) generate_monitor_report ;;
                    3) restart_failed_nodes ;;
                    *) log_error "无效选择" ;;
                esac
                ;;
            8)
                cleanup
                ;;
            9)
                echo
                log_info "═══ 系统信息 ═══"
                get_memory_info
                calculate_recommended_nodes
                echo "Docker 版本: $(docker --version 2>/dev/null || echo '未安装')"
                echo "镜像信息: $DOCKER_IMAGE"
                echo "网络名称: $NETWORK_NAME"
                ;;
            0)
                log_info "退出程序"
                exit 0
                ;;
            *)
                log_error "无效选择，请输入 0-9"
                ;;
        esac
        
        echo
        read -p "按回车键继续..." 
    done
}

# 快速启动菜单
show_quick_menu() {
    while true; do
        clear
        echo -e "${PURPLE}"
        cat << 'EOF'
╔══════════════════════════════════════════════════════════════╗
║                   Nexus 快速启动菜单                         ║
║                                                              ║
║  快速操作:                                                   ║
║  1. 🚀 一键启动 (推荐配置)                                  ║
║  2. ⚙️  自定义启动                                          ║
║  3. 📊 查看状态                                             ║
║  4. ⏹️  停止节点                                             ║
║  5. 🔧 进入完整管理器                                       ║
║  0. 🚪 退出                                                 ║
╚══════════════════════════════════════════════════════════════╝
EOF
        echo -e "${NC}"
        echo
        
        read -p "请选择操作 [0-5]: " CHOICE
        
        case "$CHOICE" in
            1)
                # 一键启动
                echo
                log_info "一键启动模式 - 使用推荐配置"
                get_memory_info
                calculate_recommended_nodes
                NODE_COUNT=$RECOMMENDED_NODES
                START_NODE_ID=$DEFAULT_NODE_ID
                echo
                log_info "将启动 $NODE_COUNT 个节点，起始ID: $START_NODE_ID"
                read -p "确认启动? [Y/n]: " CONFIRM
                if [[ ! "$CONFIRM" =~ ^[Nn]$ ]]; then
                    pull_docker_image && create_network && stop_existing_containers && start_nodes
                    show_status
                fi
                ;;
            2)
                # 自定义启动
                echo
                log_info "自定义启动模式"
                get_memory_info
                calculate_recommended_nodes
                if get_node_configuration; then
                    pull_docker_image && create_network && stop_existing_containers && start_nodes
                    show_status
                fi
                ;;
            3)
                show_status
                ;;
            4)
                stop_nodes
                ;;
            5)
                return 0  # 返回主菜单
                ;;
            0)
                log_info "退出程序"
                exit 0
                ;;
            *)
                log_error "无效选择，请输入 0-5"
                sleep 2
                ;;
        esac
        
        if [ "$CHOICE" != "5" ]; then
            echo
            read -p "按回车键继续..." 
        fi
    done
}

# ============================================================================
# 帮助和主程序
# ============================================================================

# 显示帮助信息
show_help() {
    echo "Nexus 节点多开一体化脚本 v2.0"
    echo
    echo "用法: $0 [选项]"
    echo
    echo "选项:"
    echo "  menu            显示主菜单 (默认)"
    echo "  quick           显示快速启动菜单"
    echo "  start           启动节点"
    echo "  status          查看状态"
    echo "  logs [N]        查看日志"
    echo "  stop            停止节点"
    echo "  restart         重启节点"
    echo "  monitor         启动实时监控"
    echo "  cleanup         清理资源"
    echo "  help            显示帮助"
    echo
    echo "示例:"
    echo "  $0              # 显示主菜单"
    echo "  $0 quick        # 快速启动菜单"
    echo "  $0 start        # 启动节点"
    echo "  $0 monitor      # 实时监控"
    echo "  $0 logs 1       # 查看节点1日志"
}

# 主函数
main() {
    # 显示欢迎界面
    show_main_welcome
    
    # 检查系统要求
    check_requirements
    
    # 根据参数选择操作
    case "${1:-menu}" in
        menu)
            show_main_menu
            ;;
        quick)
            show_quick_menu
            show_main_menu
            ;;
        start)
            get_memory_info
            calculate_recommended_nodes
            if get_node_configuration; then
                pull_docker_image && create_network && stop_existing_containers && start_nodes
                show_status
            fi
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs "$2"
            ;;
        stop)
            stop_nodes
            ;;
        restart)
            restart_nodes
            ;;
        monitor)
            show_real_time_monitor
            ;;
        cleanup)
            cleanup
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
}

# 捕获中断信号
trap 'echo; log_info "程序被中断"; exit 0' INT TERM

# 运行主函数
main "$@" 