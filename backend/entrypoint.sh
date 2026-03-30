#!/bin/bash
set -e

echo "=== Document Processing System - Starting ==="

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
MAX_RETRIES=30
RETRY_COUNT=0
until python -c "
import psycopg2
import os
url = os.environ.get('DATABASE_SYNC_URL', 'postgresql+psycopg2://postgres:postgres@db:5432/docprocess')
# Parse the URL to extract connection params
url = url.replace('postgresql+psycopg2://', '')
userpass, hostdb = url.split('@')
user, password = userpass.split(':')
hostport, dbname = hostdb.split('/')
if ':' in hostport:
    host, port = hostport.split(':')
else:
    host, port = hostport, '5432'
conn = psycopg2.connect(host=host, port=port, user=user, password=password, dbname=dbname)
conn.close()
print('PostgreSQL is ready!')
" 2>/dev/null; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "ERROR: PostgreSQL not available after $MAX_RETRIES attempts"
        exit 1
    fi
    echo "PostgreSQL not ready yet (attempt $RETRY_COUNT/$MAX_RETRIES)... waiting"
    sleep 2
done

# Wait for Redis to be ready
echo "Waiting for Redis..."
RETRY_COUNT=0
until python -c "
import redis
import os
url = os.environ.get('REDIS_URL', 'redis://redis:6379/0')
r = redis.from_url(url)
r.ping()
print('Redis is ready!')
" 2>/dev/null; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "ERROR: Redis not available after $MAX_RETRIES attempts"
        exit 1
    fi
    echo "Redis not ready yet (attempt $RETRY_COUNT/$MAX_RETRIES)... waiting"
    sleep 2
done

# Run database migrations
echo "Running database migrations..."
alembic upgrade head
echo "Migrations completed!"

# Create upload directory
mkdir -p "${UPLOAD_DIR:-/app/uploads}"

# Determine number of workers
WORKERS=${UVICORN_WORKERS:-1}

echo "Starting uvicorn with $WORKERS worker(s)..."
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers "$WORKERS" \
    --log-level "${LOG_LEVEL:-info}" \
    --access-log
