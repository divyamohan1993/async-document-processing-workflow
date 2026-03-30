#!/usr/bin/env bash
# =============================================================================
# Deployment Script for Async Document Processing Workflow System
# Target: Bare Ubuntu 22.04+ server
# Usage: sudo bash scripts/deploy.sh [--domain your-domain.com] [--email your@email.com]
# =============================================================================

set -euo pipefail

# --- Configuration ---
DOMAIN="${DOMAIN:-}"
EMAIL="${EMAIL:-}"
PROJECT_DIR="/opt/docprocess"
COMPOSE_VERSION="2.24.0"

# --- Parse Arguments ---
while [[ $# -gt 0 ]]; do
    case $1 in
        --domain) DOMAIN="$2"; shift 2 ;;
        --email) EMAIL="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# --- Helper Functions ---
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[ERROR] $1" >&2
    exit 1
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root (use sudo)"
    fi
}

# =============================================================================
# Step 1: System Updates and Prerequisites
# =============================================================================
install_prerequisites() {
    log "Updating system packages..."
    apt-get update -y
    apt-get upgrade -y

    log "Installing prerequisites..."
    apt-get install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release \
        software-properties-common \
        ufw \
        fail2ban \
        unzip \
        git
}

# =============================================================================
# Step 2: Install Docker
# =============================================================================
install_docker() {
    if command -v docker &> /dev/null; then
        log "Docker is already installed: $(docker --version)"
        return
    fi

    log "Installing Docker..."

    # Add Docker's official GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc

    # Add Docker repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Start and enable Docker
    systemctl start docker
    systemctl enable docker

    log "Docker installed: $(docker --version)"
    log "Docker Compose installed: $(docker compose version)"
}

# =============================================================================
# Step 3: Configure Firewall (UFW)
# =============================================================================
configure_firewall() {
    log "Configuring firewall (UFW)..."

    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing

    # Allow SSH
    ufw allow 22/tcp

    # Allow HTTP and HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp

    # Enable firewall
    ufw --force enable

    log "Firewall configured. Allowed ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)"
    ufw status verbose
}

# =============================================================================
# Step 4: Configure fail2ban
# =============================================================================
configure_fail2ban() {
    log "Configuring fail2ban..."

    cat > /etc/fail2ban/jail.local << 'JAILEOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 5
JAILEOF

    systemctl restart fail2ban
    systemctl enable fail2ban
    log "fail2ban configured and enabled"
}

# =============================================================================
# Step 5: Set Up Project
# =============================================================================
setup_project() {
    log "Setting up project directory at ${PROJECT_DIR}..."

    mkdir -p "${PROJECT_DIR}"

    # Copy project files (assuming script is run from project root)
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
    if [[ -f "${SCRIPT_DIR}/docker-compose.yml" ]]; then
        cp -r "${SCRIPT_DIR}"/* "${PROJECT_DIR}/"
        cp "${SCRIPT_DIR}"/.env.example "${PROJECT_DIR}/.env.example"
        cp "${SCRIPT_DIR}"/.dockerignore "${PROJECT_DIR}/.dockerignore" 2>/dev/null || true
    else
        error "Cannot find docker-compose.yml. Run this script from the project root directory."
    fi

    # Generate .env if it doesn't exist
    if [[ ! -f "${PROJECT_DIR}/.env" ]]; then
        log "Generating production .env file..."
        cp "${PROJECT_DIR}/.env.example" "${PROJECT_DIR}/.env"

        # Generate secure random passwords
        SECRET_KEY=$(openssl rand -hex 32)
        POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=')
        REDIS_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=')
        FLOWER_PASSWORD=$(openssl rand -base64 16 | tr -d '/+=')

        sed -i "s|your-super-secret-key-change-this-in-production-min-32-chars|${SECRET_KEY}|" "${PROJECT_DIR}/.env"
        sed -i "s|your-secure-db-password-here|${POSTGRES_PASSWORD}|" "${PROJECT_DIR}/.env"
        sed -i "s|your-secure-redis-password-here|${REDIS_PASSWORD}|" "${PROJECT_DIR}/.env"
        sed -i "s|change-this-flower-password|${FLOWER_PASSWORD}|" "${PROJECT_DIR}/.env"
        sed -i "s|DEBUG=false|DEBUG=false|" "${PROJECT_DIR}/.env"

        if [[ -n "${DOMAIN}" ]]; then
            sed -i "s|DOMAIN=localhost|DOMAIN=${DOMAIN}|" "${PROJECT_DIR}/.env"
            sed -i "s|NEXT_PUBLIC_API_URL=http://localhost/api/v1|NEXT_PUBLIC_API_URL=https://${DOMAIN}/api/v1|" "${PROJECT_DIR}/.env"
        fi

        log "Production .env generated with random secure passwords"
        chmod 600 "${PROJECT_DIR}/.env"
    fi
}

# =============================================================================
# Step 6: Set Up SSL with Let's Encrypt
# =============================================================================
setup_ssl() {
    if [[ -z "${DOMAIN}" ]] || [[ -z "${EMAIL}" ]]; then
        log "Skipping SSL setup (no --domain or --email provided)"
        log "To set up SSL later, run: sudo certbot certonly --standalone -d your-domain.com"
        return
    fi

    log "Setting up SSL with Let's Encrypt for ${DOMAIN}..."

    # Install certbot
    apt-get install -y certbot

    # Stop nginx if running (certbot needs port 80)
    docker compose -f "${PROJECT_DIR}/docker-compose.yml" stop nginx 2>/dev/null || true

    # Obtain certificate
    certbot certonly \
        --standalone \
        --non-interactive \
        --agree-tos \
        --email "${EMAIL}" \
        -d "${DOMAIN}" \
        -d "www.${DOMAIN}" || {
        log "Warning: SSL certificate request failed. Continuing without SSL."
        return
    }

    # Copy certs to nginx ssl directory
    mkdir -p "${PROJECT_DIR}/nginx/ssl"
    cp "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" "${PROJECT_DIR}/nginx/ssl/"
    cp "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" "${PROJECT_DIR}/nginx/ssl/"

    # Set up auto-renewal cron job
    cat > /etc/cron.d/certbot-renewal << CRONEOF
0 2 * * 1 root certbot renew --quiet --deploy-hook "cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ${PROJECT_DIR}/nginx/ssl/ && cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem ${PROJECT_DIR}/nginx/ssl/ && docker compose -f ${PROJECT_DIR}/docker-compose.yml exec nginx nginx -s reload"
CRONEOF

    log "SSL certificates installed and auto-renewal configured"
}

# =============================================================================
# Step 7: Build and Start Services
# =============================================================================
start_services() {
    log "Building and starting services..."
    cd "${PROJECT_DIR}"

    docker compose build --no-cache
    docker compose up -d

    log "Waiting for services to become healthy..."
    sleep 15

    # Check service health
    local retries=0
    local max_retries=12
    while [[ $retries -lt $max_retries ]]; do
        if curl -sf http://localhost/health > /dev/null 2>&1; then
            log "All services are healthy!"
            break
        fi
        retries=$((retries + 1))
        log "Waiting for services... (attempt ${retries}/${max_retries})"
        sleep 10
    done

    if [[ $retries -eq $max_retries ]]; then
        log "Warning: Some services may not be fully healthy yet. Check with: docker compose ps"
    fi
}

# =============================================================================
# Step 8: Post-deployment verification
# =============================================================================
verify_deployment() {
    log "=== Deployment Verification ==="
    cd "${PROJECT_DIR}"

    echo ""
    echo "--- Container Status ---"
    docker compose ps

    echo ""
    echo "--- Health Checks ---"

    if curl -sf http://localhost/health > /dev/null 2>&1; then
        echo "Nginx:    OK"
    else
        echo "Nginx:    FAIL"
    fi

    if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
        echo "Backend:  OK"
    else
        echo "Backend:  FAIL"
    fi

    echo ""
    echo "=== Deployment Complete ==="
    echo ""
    echo "Access the application:"
    if [[ -n "${DOMAIN}" ]]; then
        echo "  Web UI:   https://${DOMAIN}"
        echo "  API:      https://${DOMAIN}/api/v1"
        echo "  API Docs: https://${DOMAIN}/api/v1/docs"
        echo "  Flower:   https://${DOMAIN}/flower/"
    else
        echo "  Web UI:   http://localhost"
        echo "  API:      http://localhost/api/v1"
        echo "  API Docs: http://localhost/api/v1/docs"
        echo "  Flower:   http://localhost:5555"
    fi
    echo ""
    echo "Useful commands:"
    echo "  cd ${PROJECT_DIR}"
    echo "  make status   - Check service status"
    echo "  make logs     - View all logs"
    echo "  make health   - Run health checks"
    echo ""
}

# =============================================================================
# Main
# =============================================================================
main() {
    log "Starting deployment..."
    check_root
    install_prerequisites
    install_docker
    configure_firewall
    configure_fail2ban
    setup_project
    setup_ssl
    start_services
    verify_deployment
    log "Deployment finished successfully!"
}

main
