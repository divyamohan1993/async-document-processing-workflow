#!/bin/bash
set -e

echo "=== Setting up DocProcessor on GCloud VM ==="

# Install Docker
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker "$USER"
    sudo systemctl enable docker
    sudo systemctl start docker
fi

# Install Docker Compose plugin
if ! docker compose version &> /dev/null; then
    echo "Installing Docker Compose plugin..."
    sudo apt-get update -qq
    sudo apt-get install -y -qq docker-compose-plugin
fi

# Create app directory
sudo mkdir -p /opt/docprocessor
sudo chown "$USER":"$USER" /opt/docprocessor

# Copy project files from temp upload location
if [ -d /tmp/docprocessor ]; then
    cp -r /tmp/docprocessor/* /opt/docprocessor/
fi

cd /opt/docprocessor

# Fetch the VM external IP from metadata
EXTERNAL_IP=$(curl -s http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip -H "Metadata-Flavor: Google")

# Generate secure credentials
SK=$(openssl rand -hex 32)
PG_PASS=$(openssl rand -hex 16)
RD_PASS=$(openssl rand -hex 16)
FL_PASS=$(openssl rand -hex 8)

# Create .env with production values (only if not already present)
if [ ! -f .env ]; then
    cat > .env << EOF
DEBUG=false
SECRET_KEY=${SK}
DOMAIN=${EXTERNAL_IP}

POSTGRES_USER=postgres
POSTGRES_PASSWORD=${PG_PASS}
POSTGRES_DB=docprocess

REDIS_PASSWORD=${RD_PASS}

FLOWER_USER=admin
FLOWER_PASSWORD=${FL_PASS}

NEXT_PUBLIC_API_URL=http://${EXTERNAL_IP}/api/v1

MAX_FILE_SIZE=52428800
EOF
    echo "Generated .env with production credentials"
else
    echo ".env already exists, skipping generation"
fi

echo "=== Building and starting services ==="
sudo docker compose build --no-cache
sudo docker compose up -d

# Install systemd service for auto-start on reboot/preemption recovery
if [ -f /opt/docprocessor/scripts/docprocessor.service ]; then
    sudo cp /opt/docprocessor/scripts/docprocessor.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable docprocessor
    echo "Installed and enabled docprocessor.service for auto-start"
fi

echo ""
echo "=== Setup complete! ==="
echo "Application URL: http://${EXTERNAL_IP}"
echo "Flower (task monitor): http://${EXTERNAL_IP}:5555 (blocked by firewall - access via SSH tunnel)"
echo ""
echo "Credentials saved in /opt/docprocessor/.env"
