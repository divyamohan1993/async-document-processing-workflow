.PHONY: build up down logs logs-backend logs-worker restart clean migrate shell-backend shell-db \
       test test-frontend dev prod status health backup-db restore-db help

# Default target
help: ## Show this help message
	@echo "Async Document Processing Workflow System"
	@echo "========================================="
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# --- Docker Compose Commands ---

build: ## Build all Docker images
	docker compose build

up: ## Start all services in detached mode
	docker compose up -d

down: ## Stop all services
	docker compose down

logs: ## Tail logs for all services
	docker compose logs -f

logs-backend: ## Tail backend service logs
	docker compose logs -f backend

logs-worker: ## Tail Celery worker logs
	docker compose logs -f celery_worker

logs-beat: ## Tail Celery beat logs
	docker compose logs -f celery_beat

logs-frontend: ## Tail frontend service logs
	docker compose logs -f frontend

logs-nginx: ## Tail Nginx logs
	docker compose logs -f nginx

restart: ## Restart all services
	docker compose restart

clean: ## Remove all containers, volumes, and images for this project
	docker compose down -v --rmi local --remove-orphans
	@echo "Cleaned up all containers, volumes, and local images."

# --- Database Commands ---

migrate: ## Run database migrations (Alembic)
	docker compose exec backend alembic upgrade head

migrate-create: ## Create a new migration. Usage: make migrate-create MSG="description"
	docker compose exec backend alembic revision --autogenerate -m "$(MSG)"

migrate-downgrade: ## Downgrade database by one revision
	docker compose exec backend alembic downgrade -1

# --- Shell Access ---

shell-backend: ## Open a bash shell in the backend container
	docker compose exec backend bash

shell-db: ## Open psql shell in the database container
	docker compose exec db psql -U $${POSTGRES_USER:-postgres} -d $${POSTGRES_DB:-docprocess}

shell-redis: ## Open redis-cli in the Redis container
	docker compose exec redis redis-cli -a $${REDIS_PASSWORD:-redis_dev_2024}

# --- Testing ---

test: ## Run backend tests with pytest
	docker compose exec backend pytest tests/ -v --tb=short

test-cov: ## Run backend tests with coverage report
	docker compose exec backend pytest tests/ -v --tb=short --cov=app --cov-report=term-missing

test-frontend: ## Run frontend tests
	docker compose exec frontend npm test

lint: ## Run linting on backend code
	docker compose exec backend ruff check app/ tests/
	docker compose exec backend mypy app/

# --- Development Mode ---

dev: ## Start in development mode with hot reload and debug
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

dev-d: ## Start in development mode (detached)
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d

# --- Production Mode ---

prod: ## Start in production mode
	docker compose up --build -d

prod-pull: ## Pull latest images and restart in production mode
	docker compose pull
	docker compose up --build -d

# --- Monitoring ---

status: ## Show status of all services
	docker compose ps

health: ## Check health of all services
	@echo "=== Service Health Check ==="
	@echo ""
	@echo "--- Docker Containers ---"
	@docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
	@echo ""
	@echo "--- Backend Health ---"
	@curl -sf http://localhost:8000/health 2>/dev/null && echo "Backend: OK" || echo "Backend: UNREACHABLE"
	@echo ""
	@echo "--- Frontend Health ---"
	@curl -sf http://localhost:3000 >/dev/null 2>&1 && echo "Frontend: OK" || echo "Frontend: UNREACHABLE"
	@echo ""
	@echo "--- Nginx Health ---"
	@curl -sf http://localhost/health 2>/dev/null && echo "Nginx: OK" || echo "Nginx: UNREACHABLE"
	@echo ""
	@echo "--- Database ---"
	@docker compose exec -T db pg_isready -U $${POSTGRES_USER:-postgres} 2>/dev/null && echo "Database: OK" || echo "Database: UNREACHABLE"
	@echo ""
	@echo "--- Redis ---"
	@docker compose exec -T redis redis-cli -a $${REDIS_PASSWORD:-redis_dev_2024} ping 2>/dev/null | grep -q PONG && echo "Redis: OK" || echo "Redis: UNREACHABLE"

# --- Backup / Restore ---

BACKUP_DIR ?= ./backups
BACKUP_FILE ?= $(BACKUP_DIR)/docprocess_$(shell date +%Y%m%d_%H%M%S).sql.gz

backup-db: ## Backup PostgreSQL database to compressed file
	@mkdir -p $(BACKUP_DIR)
	docker compose exec -T db pg_dump -U $${POSTGRES_USER:-postgres} $${POSTGRES_DB:-docprocess} | gzip > $(BACKUP_FILE)
	@echo "Database backed up to: $(BACKUP_FILE)"

restore-db: ## Restore PostgreSQL database. Usage: make restore-db FILE=backups/file.sql.gz
	@if [ -z "$(FILE)" ]; then \
		echo "Error: specify FILE=path/to/backup.sql.gz"; \
		exit 1; \
	fi
	@echo "WARNING: This will overwrite the current database. Press Ctrl+C to cancel."
	@sleep 3
	gunzip -c $(FILE) | docker compose exec -T db psql -U $${POSTGRES_USER:-postgres} -d $${POSTGRES_DB:-docprocess}
	@echo "Database restored from: $(FILE)"

# --- Utility ---

seed: ## Seed the database with sample data
	docker compose exec backend python -m app.scripts.seed_data

flower-open: ## Open Flower monitoring dashboard in browser
	@echo "Opening Flower at http://localhost:5555"
	@which xdg-open > /dev/null 2>&1 && xdg-open http://localhost:5555 || open http://localhost:5555 2>/dev/null || echo "Visit http://localhost:5555"

prune: ## Remove unused Docker resources (system-wide)
	docker system prune -f
	docker volume prune -f
