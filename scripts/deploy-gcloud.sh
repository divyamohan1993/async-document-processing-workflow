#!/bin/bash
# =============================================================================
# GCloud Spot VM Deployment Script
# Copies project to the VM and runs setup remotely
# Usage: bash scripts/deploy-gcloud.sh
# =============================================================================

set -euo pipefail

VM_NAME="docprocessor-vm"
ZONE=$(gcloud config get-value compute/zone 2>/dev/null)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ -z "$ZONE" ]; then
    echo "Error: No compute zone set. Run: gcloud config set compute/zone <zone>"
    exit 1
fi

echo "=== Deploying to ${VM_NAME} in ${ZONE} ==="

# Get VM external IP
VM_IP=$(gcloud compute instances describe "$VM_NAME" --zone="$ZONE" --format='get(networkInterfaces[0].accessConfigs[0].natIP)')
echo "VM External IP: ${VM_IP}"

# Wait for SSH to be available
echo "Waiting for VM SSH to become available..."
for i in $(seq 1 30); do
    if gcloud compute ssh "$VM_NAME" --zone="$ZONE" --command="echo ready" 2>/dev/null; then
        break
    fi
    echo "  Attempt $i/30..."
    sleep 5
done

# Create temp dir on VM
gcloud compute ssh "$VM_NAME" --zone="$ZONE" --command="rm -rf /tmp/docprocessor && mkdir -p /tmp/docprocessor"

# Copy project files to VM (excluding heavy/unnecessary dirs)
echo "Copying project files to VM..."
gcloud compute scp --recurse --zone="$ZONE" --compress \
    "${PROJECT_ROOT}/backend" \
    "${PROJECT_ROOT}/frontend" \
    "${PROJECT_ROOT}/nginx" \
    "${PROJECT_ROOT}/scripts" \
    "${PROJECT_ROOT}/docker-compose.yml" \
    "${PROJECT_ROOT}/init-db.sql" \
    "${PROJECT_ROOT}/Makefile" \
    "${VM_NAME}:/tmp/docprocessor/"

# Run setup on the VM
echo "Running setup on VM..."
gcloud compute ssh "$VM_NAME" --zone="$ZONE" --command="
set -e

# Copy files to /opt/docprocessor
sudo mkdir -p /opt/docprocessor
sudo chown \$USER:\$USER /opt/docprocessor
cp -r /tmp/docprocessor/* /opt/docprocessor/

# Install Docker if needed
if ! command -v docker &> /dev/null; then
    echo 'Installing Docker...'
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker \$USER
    sudo systemctl enable docker
    sudo systemctl start docker
fi

# Install Docker Compose plugin if needed
if ! sudo docker compose version &> /dev/null; then
    echo 'Installing Docker Compose plugin...'
    sudo apt-get update -qq
    sudo apt-get install -y -qq docker-compose-plugin
fi

# Get external IP from metadata
EXTERNAL_IP=\$(curl -s http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip -H 'Metadata-Flavor: Google')

# Generate .env if not present
cd /opt/docprocessor
if [ ! -f .env ]; then
    echo 'Generating production .env...'
    cat > .env << EOF
DEBUG=false
SECRET_KEY=\$(openssl rand -hex 32)
DOMAIN=\${EXTERNAL_IP}

POSTGRES_USER=postgres
POSTGRES_PASSWORD=\$(openssl rand -hex 16)
POSTGRES_DB=docprocess

REDIS_PASSWORD=\$(openssl rand -hex 16)

FLOWER_USER=admin
FLOWER_PASSWORD=\$(openssl rand -hex 8)

NEXT_PUBLIC_API_URL=http://\${EXTERNAL_IP}/api/v1

MAX_FILE_SIZE=52428800
EOF
    chmod 600 .env
    echo 'Production .env generated'
fi

# Build and start
echo 'Building Docker images (this may take several minutes)...'
sudo docker compose build --no-cache
sudo docker compose up -d

# Install systemd service for auto-start
sudo cp /opt/docprocessor/scripts/docprocessor.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable docprocessor
echo 'Enabled docprocessor.service for auto-start on boot'

# Wait for health
echo 'Waiting for services to start...'
sleep 20

echo ''
echo '=== Deployment Complete ==='
echo \"Application URL: http://\${EXTERNAL_IP}\"
echo \"API Docs: http://\${EXTERNAL_IP}/api/v1/docs\"
sudo docker compose ps
"

echo ""
echo "=== Deployment finished ==="
echo "Application URL: http://${VM_IP}"
echo "API Docs: http://${VM_IP}/api/v1/docs"
echo ""
echo "SSH into VM:  gcloud compute ssh ${VM_NAME} --zone=${ZONE}"
echo "View logs:    gcloud compute ssh ${VM_NAME} --zone=${ZONE} --command='cd /opt/docprocessor && sudo docker compose logs -f'"
