# Async Document Processing Workflow System

![Docker](https://img.shields.io/badge/Docker-24.0+-2496ED?logo=docker&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

A production-grade asynchronous document processing system with a multi-stage workflow (upload, process, review, finalize, export), real-time progress tracking via SSE, and a modern web interface.

---

## Table of Contents

- [Overview](#overview)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Architecture Details](#architecture-details)
- [Development](#development)
- [Deployment](#deployment)
- [Testing](#testing)
- [Assumptions and Tradeoffs](#assumptions-and-tradeoffs)
- [Limitations](#limitations)
- [Sample Files](#sample-files)

---

## Overview

This system allows users to upload documents (PDF, TXT, CSV, JSON, Markdown), which are then processed asynchronously through a multi-stage pipeline. Each document goes through: upload, text extraction, analysis/categorization, human review, finalization, and optional bulk export. Real-time progress is streamed to the frontend via Server-Sent Events (SSE).

---

## Architecture Overview

```
                          +-------------------+
                          |     Browser       |
                          +--------+----------+
                                   |
                          +--------v----------+
                          |      Nginx        |
                          |  (Reverse Proxy)  |
                          |  Ports 80 / 443   |
                          +----+--------+-----+
                               |        |
                    +----------+        +----------+
                    |                              |
           +--------v--------+          +----------v--------+
           |    Frontend     |          |     Backend       |
           |   (Next.js 14) |          |    (FastAPI)      |
           |   Port 3000    |          |   Port 8000       |
           +-----------------+          +---+----------+----+
                                            |          |
                                +-----------+    +-----v------+
                                |                |   Redis 7   |
                                |                |  (Broker +  |
                                |                |   Cache)    |
                                |                +-----+-------+
                                |                      |
                          +-----v------+        +------v--------+
                          |PostgreSQL  |        | Celery Worker |
                          |    16      |        | (Async Tasks) |
                          +------------+        +---------------+
```

**Data Flow: Document Processing Pipeline**

```
Upload --> Validate --> Extract Text --> Analyze/Categorize --> Ready for Review
   |                                                                |
   |  (async via Celery)                                           |
   |                                                                v
   +-- SSE Progress Stream ----> Frontend UI <---- Review (Human) --+
                                                        |
                                                        v
                                                   Finalize --> Export (JSON/CSV)
```

---

## Tech Stack

| Component        | Technology              | Version |
|------------------|-------------------------|---------|
| Frontend         | Next.js (React)         | 14.x    |
| Frontend Styling | Tailwind CSS            | 3.x     |
| Frontend Language| TypeScript              | 5.x     |
| Backend          | FastAPI (Python)        | 0.109+  |
| Task Queue       | Celery                  | 5.3+    |
| Task Monitoring  | Flower                  | 2.0+    |
| Database         | PostgreSQL              | 16      |
| Cache/Broker     | Redis                   | 7       |
| Reverse Proxy    | Nginx                   | Alpine  |
| ORM              | SQLAlchemy (async)      | 2.0+    |
| Migrations       | Alembic                 | 1.13+   |
| Containerization | Docker + Compose        | 24.0+   |

---

## Features

**Document Management**
- Multi-format file upload (PDF, TXT, CSV, JSON, Markdown)
- Automatic text extraction and content analysis
- Document categorization and keyword extraction
- Configurable file size limits (default 50MB)

**Async Processing Pipeline**
- Multi-stage workflow: Upload -> Process -> Review -> Finalize -> Export
- Background processing via Celery workers
- Real-time progress tracking via Server-Sent Events (SSE)
- Automatic retry on transient failures

**Review and Export**
- Human-in-the-loop review step before finalization
- Approve, reject, or request reprocessing
- Bulk export to JSON and CSV formats

**Infrastructure**
- Production-grade Docker Compose setup with health checks
- Nginx reverse proxy with rate limiting and security headers
- PostgreSQL with UUID and trigram search extensions
- Redis for caching, task brokering, and pub/sub
- Celery Beat for scheduled tasks
- Flower dashboard for task monitoring
- Resource limits on all containers
- Network isolation via Docker bridge network

**Developer Experience**
- Development mode with hot reload (source mount)
- Comprehensive Makefile with 20+ targets
- Database backup and restore scripts
- Automated deployment script for Ubuntu servers

---

## Prerequisites

- **Docker** >= 24.0 and **Docker Compose** >= 2.20 (plugin version)
- **Git**
- **Make** (optional, for Makefile targets)
- 4 GB RAM minimum (8 GB recommended)
- 10 GB free disk space

---

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd async-document-processing-workflow-system

# Copy and configure environment
cp .env.example .env
# Edit .env with your preferred editor - at minimum change passwords for production

# Build and start all services
make build
make up

# Or without Make:
docker compose build
docker compose up -d

# Check that services are running
make status
make health

# View logs
make logs
```

Once running, access:

| Service          | URL                          |
|------------------|------------------------------|
| Web Application  | http://localhost              |
| API Documentation| http://localhost/api/v1/docs  |
| API (direct)     | http://localhost:8000         |
| Flower Dashboard | http://localhost:5555         |
| PostgreSQL       | localhost:5432               |
| Redis            | localhost:6379               |

---

## Configuration

All configuration is managed via environment variables in the `.env` file.

| Variable              | Description                                    | Default                    | Required |
|-----------------------|------------------------------------------------|----------------------------|----------|
| `DEBUG`               | Enable debug mode                              | `false`                    | No       |
| `SECRET_KEY`          | JWT signing key (min 32 chars)                 | -                          | Yes      |
| `DOMAIN`              | Application domain name                        | `localhost`                | No       |
| `POSTGRES_USER`       | PostgreSQL username                            | `postgres`                 | No       |
| `POSTGRES_PASSWORD`   | PostgreSQL password                            | -                          | Yes      |
| `POSTGRES_DB`         | PostgreSQL database name                       | `docprocess`               | No       |
| `REDIS_PASSWORD`      | Redis password                                 | -                          | Yes      |
| `FLOWER_USER`         | Flower dashboard username                      | `admin`                    | No       |
| `FLOWER_PASSWORD`     | Flower dashboard password                      | `admin123`                 | No       |
| `NEXT_PUBLIC_API_URL` | API URL used by the frontend                   | `http://localhost/api/v1`  | No       |
| `MAX_FILE_SIZE`       | Maximum upload file size in bytes               | `52428800` (50MB)          | No       |

---

## API Documentation

The backend serves interactive API documentation at `/api/v1/docs` (Swagger UI) and `/api/v1/redoc` (ReDoc) when running.

### Endpoints Reference

#### Health

| Method | Endpoint     | Description         |
|--------|-------------|---------------------|
| GET    | `/health`   | Service health check |

#### Authentication

| Method | Endpoint             | Description          |
|--------|---------------------|----------------------|
| POST   | `/api/v1/auth/register` | Register new user |
| POST   | `/api/v1/auth/login`    | Login and get JWT |
| POST   | `/api/v1/auth/refresh`  | Refresh JWT token |

#### Documents

| Method | Endpoint                          | Description                        |
|--------|----------------------------------|------------------------------------|
| POST   | `/api/v1/documents/upload`       | Upload a new document              |
| GET    | `/api/v1/documents/`             | List all documents (paginated)     |
| GET    | `/api/v1/documents/{id}`         | Get document details               |
| DELETE | `/api/v1/documents/{id}`         | Delete a document                  |
| GET    | `/api/v1/documents/{id}/status`  | Get processing status              |
| GET    | `/api/v1/documents/{id}/stream`  | SSE stream for real-time progress  |

#### Review

| Method | Endpoint                            | Description                   |
|--------|-------------------------------------|-------------------------------|
| GET    | `/api/v1/review/pending`            | List documents pending review |
| POST   | `/api/v1/review/{id}/approve`       | Approve a processed document  |
| POST   | `/api/v1/review/{id}/reject`        | Reject a processed document   |
| POST   | `/api/v1/review/{id}/reprocess`     | Request reprocessing          |

#### Export

| Method | Endpoint                    | Description                          |
|--------|-----------------------------|--------------------------------------|
| POST   | `/api/v1/export/json`       | Export finalized documents as JSON   |
| POST   | `/api/v1/export/csv`        | Export finalized documents as CSV    |
| GET    | `/api/v1/export/{id}/download` | Download a specific export file   |

### Example: Upload a Document

```bash
curl -X POST http://localhost/api/v1/documents/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@sample-files/sample-report.txt"
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "sample-report.txt",
  "file_type": "text/plain",
  "file_size": 1234,
  "status": "uploaded",
  "created_at": "2024-01-15T10:00:00Z"
}
```

### Example: Stream Processing Progress (SSE)

```bash
curl -N http://localhost/api/v1/documents/550e8400-e29b-41d4-a716-446655440000/stream \
  -H "Authorization: Bearer <token>"
```

**SSE Events:**
```
data: {"stage": "extracting", "progress": 25, "message": "Extracting text content..."}

data: {"stage": "analyzing", "progress": 50, "message": "Analyzing document structure..."}

data: {"stage": "categorizing", "progress": 75, "message": "Categorizing document..."}

data: {"stage": "completed", "progress": 100, "message": "Processing complete. Ready for review."}
```

---

## Architecture Details

### Backend Architecture

The backend follows a layered architecture:

```
app/
  api/           # Route handlers (thin controllers)
    v1/
      documents.py
      review.py
      export.py
      auth.py
  models/        # SQLAlchemy ORM models
  schemas/       # Pydantic request/response schemas
  services/      # Business logic layer
  workers/       # Celery task definitions
  core/          # Configuration, security, database setup
```

**Key patterns:**
- Async/await throughout (asyncpg for DB, httpx for HTTP)
- Repository pattern for data access
- Dependency injection via FastAPI's Depends()
- Pydantic v2 for validation and serialization

### Async Processing Flow

1. **Upload**: File is saved to disk, metadata stored in PostgreSQL, status set to `uploaded`
2. **Processing triggered**: A Celery task is dispatched to the `documents` queue
3. **Text extraction**: Worker extracts text based on file type (stage: `extracting`)
4. **Analysis**: Worker analyzes content structure, extracts summary (stage: `analyzing`)
5. **Categorization**: Worker categorizes document and extracts keywords (stage: `categorizing`)
6. **Ready for review**: Status set to `processed`, awaiting human review
7. **Review**: Human approves, rejects, or requests reprocessing
8. **Finalization**: Approved documents are marked `finalized`
9. **Export**: Finalized documents can be exported as JSON or CSV

### Progress Tracking

Progress updates flow through Redis Pub/Sub:
- Celery worker publishes progress events to a Redis channel per document
- Backend SSE endpoint subscribes to the channel and streams events to the client
- Frontend EventSource API receives and displays real-time updates

### File Storage

- Files are stored on a Docker volume (`upload_data`) mounted at `/app/uploads`
- Each file is stored with a UUID-based path to avoid collisions
- For production at scale, the volume can be replaced with cloud storage (S3, GCS)

---

## Development

### Running in Development Mode

Development mode mounts source code for hot reload and enables debug logging:

```bash
# Start with dev overrides
make dev

# Or manually:
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### Code Structure

```
.
+-- docker-compose.yml           # Production compose
+-- docker-compose.dev.yml       # Development overrides
+-- .env.example                 # Environment template
+-- init-db.sql                  # Database initialization
+-- Makefile                     # Build and management targets
+-- nginx/
|   +-- nginx.conf               # Main Nginx configuration
|   +-- conf.d/default.conf      # Virtual host configuration
|   +-- ssl/                     # SSL certificates (gitignored)
+-- backend/                     # FastAPI application
|   +-- Dockerfile
|   +-- app/
|   +-- tests/
|   +-- requirements.txt
+-- frontend/                    # Next.js application
|   +-- Dockerfile
|   +-- src/
|   +-- package.json
+-- scripts/
|   +-- deploy.sh                # Deployment automation
|   +-- backup.sh                # Database backup
+-- sample-files/                # Test documents
+-- sample-outputs/              # Expected output examples
```

### Useful Make Targets

```bash
make help            # Show all available targets
make dev             # Start in dev mode with hot reload
make logs-backend    # Stream backend logs
make logs-worker     # Stream worker logs
make shell-backend   # Open bash in backend container
make shell-db        # Open psql in database container
make test            # Run backend tests
make test-frontend   # Run frontend tests
make migrate         # Run database migrations
make backup-db       # Backup the database
```

---

## Deployment

### Production Deployment (Ubuntu Server)

An automated deployment script is provided:

```bash
# On a fresh Ubuntu 22.04+ server:
sudo bash scripts/deploy.sh --domain your-domain.com --email you@email.com
```

The script will:
1. Install Docker and Docker Compose
2. Configure UFW firewall (ports 22, 80, 443)
3. Set up fail2ban for brute-force protection
4. Generate secure random passwords
5. Obtain SSL certificates via Let's Encrypt
6. Build and start all services
7. Verify deployment health

### Manual Production Setup

```bash
# 1. Clone and configure
git clone <repo-url> /opt/docprocess
cd /opt/docprocess
cp .env.example .env

# 2. Generate secure values for .env
#    - SECRET_KEY: openssl rand -hex 32
#    - POSTGRES_PASSWORD: openssl rand -base64 24
#    - REDIS_PASSWORD: openssl rand -base64 24
#    - Set DOMAIN to your actual domain
#    - Set DEBUG=false

# 3. Set up SSL certificates
mkdir -p nginx/ssl
# Copy fullchain.pem and privkey.pem to nginx/ssl/
# Uncomment the HTTPS server block in nginx/conf.d/default.conf

# 4. Build and start
docker compose build --no-cache
docker compose up -d

# 5. Run migrations
docker compose exec backend alembic upgrade head

# 6. Verify
make health
```

### SSL/TLS with Let's Encrypt

```bash
# Install certbot
sudo apt install certbot

# Obtain certificate (stop nginx first)
docker compose stop nginx
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/

# Uncomment HTTPS server block in nginx/conf.d/default.conf
# Restart nginx
docker compose up -d nginx
```

### Security Checklist

- [ ] Change all default passwords in `.env`
- [ ] Set `DEBUG=false`
- [ ] Generate a strong `SECRET_KEY` (min 32 chars)
- [ ] Configure SSL/TLS
- [ ] Set `DOMAIN` to actual domain name
- [ ] Change Flower credentials
- [ ] Configure firewall (UFW) to only allow ports 22, 80, 443
- [ ] Enable fail2ban
- [ ] Restrict direct database port access (remove `5432:5432` from compose)
- [ ] Restrict direct Redis port access (remove `6379:6379` from compose)
- [ ] Set up automated database backups
- [ ] Review and tighten Content-Security-Policy header

---

## Testing

### Backend Tests

```bash
# Run all backend tests
make test

# Run with coverage
make test-cov

# Run specific test file
docker compose exec backend pytest tests/test_documents.py -v

# Run specific test
docker compose exec backend pytest tests/test_documents.py::test_upload_document -v
```

### Frontend Tests

```bash
make test-frontend

# Or directly:
docker compose exec frontend npm test
```

### Manual API Testing

Sample files are provided in `sample-files/` for testing uploads:

```bash
# Upload a text file
curl -X POST http://localhost/api/v1/documents/upload \
  -F "file=@sample-files/sample-report.txt"

# Upload a CSV
curl -X POST http://localhost/api/v1/documents/upload \
  -F "file=@sample-files/sample-invoice.csv"

# Upload JSON
curl -X POST http://localhost/api/v1/documents/upload \
  -F "file=@sample-files/sample-technical-doc.json"

# List documents
curl http://localhost/api/v1/documents/

# Check processing status
curl http://localhost/api/v1/documents/<document-id>/status
```

---

## Assumptions and Tradeoffs

| Decision | Rationale |
|----------|-----------|
| **Local file storage** | Simplifies initial setup. Can be swapped for S3/GCS via a storage abstraction layer. |
| **Redis for both broker and cache** | Reduces infrastructure complexity. For high-throughput production, consider separate Redis instances or RabbitMQ for the broker. |
| **Synchronous Celery DB access** | Celery workers use psycopg2 (sync) instead of asyncpg because Celery tasks are synchronous by nature. |
| **Single Nginx instance** | Adequate for moderate traffic. For high availability, use a cloud load balancer in front. |
| **JWT authentication** | Stateless auth suitable for API-first architecture. Tokens should be short-lived with refresh rotation. |
| **PostgreSQL for all data** | Single database simplifies operations. Document metadata, user data, and processing results all in one place. |
| **Human-in-the-loop review** | Ensures quality control before finalization. Can be made optional per document type. |
| **Docker Compose (not Kubernetes)** | Suitable for single-server deployments. Migrate to Kubernetes for multi-node horizontal scaling. |

---

## Limitations

- **No horizontal scaling of Celery workers** in the current Compose setup (single worker container). Scale by increasing `--concurrency` or adding worker replicas.
- **File storage is local** to the Docker volume. Not suitable for multi-node deployments without shared storage.
- **No built-in user management UI** -- user registration and management is API-only.
- **SSE connections are long-lived** and consume a server connection each. Under heavy load, consider WebSocket or polling as alternatives.
- **No document versioning** -- reprocessing overwrites previous results.
- **Single-region deployment** -- no built-in multi-region or DR support.
- **No rate limiting per user** -- rate limiting is IP-based via Nginx.

---

## Sample Files

The `sample-files/` directory contains test documents for exercising the upload and processing pipeline:

| File | Type | Description |
|------|------|-------------|
| `sample-report.txt` | Text | Annual technology report with findings and recommendations |
| `sample-invoice.csv` | CSV | Invoice data with line items and totals |
| `sample-memo.md` | Markdown | Engineering priorities memo with structured sections |
| `sample-letter.txt` | Text | Formal business partnership letter |
| `sample-technical-doc.json` | JSON | Microservices architecture specification |

The `sample-outputs/` directory contains examples of expected export output:

| File | Description |
|------|-------------|
| `sample-export.json` | JSON export of processed document results |
| `sample-export.csv` | CSV export of processed document results |
