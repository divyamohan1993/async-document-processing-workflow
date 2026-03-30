#!/usr/bin/env bash
# =============================================================================
# Database Backup Script
# Usage:
#   ./scripts/backup.sh                    # Local backup only
#   ./scripts/backup.sh --gcs-bucket NAME  # Also upload to Google Cloud Storage
#   ./scripts/backup.sh --retention 14     # Keep 14 days of backups (default: 7)
# =============================================================================

set -euo pipefail

# --- Configuration ---
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS=7
GCS_BUCKET=""
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILENAME="docprocess_${TIMESTAMP}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILENAME}"

# Read from .env if available
if [[ -f .env ]]; then
    source <(grep -E '^(POSTGRES_USER|POSTGRES_PASSWORD|POSTGRES_DB)=' .env)
fi

POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-docprocess}"

# --- Parse Arguments ---
while [[ $# -gt 0 ]]; do
    case $1 in
        --gcs-bucket) GCS_BUCKET="$2"; shift 2 ;;
        --retention) RETENTION_DAYS="$2"; shift 2 ;;
        --backup-dir) BACKUP_DIR="$2"; BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILENAME}"; shift 2 ;;
        --help)
            echo "Usage: $0 [--gcs-bucket BUCKET_NAME] [--retention DAYS] [--backup-dir DIR]"
            echo ""
            echo "Options:"
            echo "  --gcs-bucket   Upload backup to this GCS bucket"
            echo "  --retention    Days to keep local backups (default: 7)"
            echo "  --backup-dir   Directory for backups (default: ./backups)"
            exit 0
            ;;
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

# --- Pre-flight Checks ---
if ! docker compose -f "${COMPOSE_FILE}" ps db --format '{{.Status}}' 2>/dev/null | grep -q "Up"; then
    error "Database container is not running. Start it first with: docker compose up -d db"
fi

# --- Create Backup Directory ---
mkdir -p "${BACKUP_DIR}"

# =============================================================================
# Step 1: Create Database Dump
# =============================================================================
log "Starting PostgreSQL backup..."
log "Database: ${POSTGRES_DB} | User: ${POSTGRES_USER}"

docker compose -f "${COMPOSE_FILE}" exec -T db \
    pg_dump \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    --format=plain \
    --no-owner \
    --no-privileges \
    --verbose \
    2>/dev/null | gzip > "${BACKUP_PATH}"

# Verify backup was created and is not empty
if [[ ! -s "${BACKUP_PATH}" ]]; then
    rm -f "${BACKUP_PATH}"
    error "Backup file is empty. The database dump may have failed."
fi

BACKUP_SIZE=$(du -h "${BACKUP_PATH}" | cut -f1)
log "Backup created: ${BACKUP_PATH} (${BACKUP_SIZE})"

# =============================================================================
# Step 2: Clean Up Old Backups
# =============================================================================
log "Cleaning up backups older than ${RETENTION_DAYS} days..."

DELETED_COUNT=0
while IFS= read -r old_backup; do
    rm -f "${old_backup}"
    DELETED_COUNT=$((DELETED_COUNT + 1))
    log "  Deleted: ${old_backup}"
done < <(find "${BACKUP_DIR}" -name "docprocess_*.sql.gz" -type f -mtime "+${RETENTION_DAYS}" 2>/dev/null)

if [[ $DELETED_COUNT -eq 0 ]]; then
    log "No old backups to clean up."
else
    log "Deleted ${DELETED_COUNT} old backup(s)."
fi

# =============================================================================
# Step 3: Upload to Google Cloud Storage (optional)
# =============================================================================
if [[ -n "${GCS_BUCKET}" ]]; then
    if ! command -v gsutil &> /dev/null; then
        log "Warning: gsutil is not installed. Skipping GCS upload."
        log "Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
    else
        log "Uploading backup to GCS bucket: gs://${GCS_BUCKET}/backups/"

        gsutil cp "${BACKUP_PATH}" "gs://${GCS_BUCKET}/backups/${BACKUP_FILENAME}"

        if [[ $? -eq 0 ]]; then
            log "Backup uploaded to GCS successfully."
        else
            log "Warning: GCS upload failed. Local backup is still available."
        fi

        # Clean up old GCS backups
        log "Cleaning up old GCS backups (older than ${RETENTION_DAYS} days)..."
        CUTOFF_DATE=$(date -d "-${RETENTION_DAYS} days" +%Y%m%d 2>/dev/null || date -v-${RETENTION_DAYS}d +%Y%m%d)

        gsutil ls "gs://${GCS_BUCKET}/backups/docprocess_*.sql.gz" 2>/dev/null | while read -r gcs_file; do
            FILE_DATE=$(echo "${gcs_file}" | grep -oP 'docprocess_\K\d{8}')
            if [[ -n "${FILE_DATE}" ]] && [[ "${FILE_DATE}" < "${CUTOFF_DATE}" ]]; then
                gsutil rm "${gcs_file}"
                log "  Deleted from GCS: ${gcs_file}"
            fi
        done
    fi
fi

# =============================================================================
# Summary
# =============================================================================
log "=== Backup Summary ==="
log "  File:      ${BACKUP_PATH}"
log "  Size:      ${BACKUP_SIZE}"
log "  Database:  ${POSTGRES_DB}"
log "  Retention: ${RETENTION_DAYS} days"

TOTAL_BACKUPS=$(find "${BACKUP_DIR}" -name "docprocess_*.sql.gz" -type f 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" 2>/dev/null | cut -f1)
log "  Total backups: ${TOTAL_BACKUPS} (${TOTAL_SIZE} total)"

if [[ -n "${GCS_BUCKET}" ]]; then
    log "  GCS Bucket: gs://${GCS_BUCKET}/backups/"
fi

log "Backup completed successfully!"
