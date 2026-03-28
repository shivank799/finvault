# ─────────────────────────────────────────────────────────────────────────────
# FinVault — Makefile
# All-in-one DevOps command center
# Usage: make <target>
# ─────────────────────────────────────────────────────────────────────────────

.PHONY: help dev build up down restart logs ps clean test lint k8s-apply k8s-delete \
        k8s-status k8s-logs rollback seed db-shell redis-shell

DOCKER_COMPOSE = docker compose
NAMESPACE      = finvault
KUBECTL        = kubectl -n $(NAMESPACE)

# ── Default: show help ────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "  ╔════════════════════════════════════╗"
	@echo "  ║   FinVault DevOps Command Center   ║"
	@echo "  ╚════════════════════════════════════╝"
	@echo ""
	@echo "  🐳 Docker Commands"
	@echo "  ─────────────────────────────────────"
	@echo "  make dev         Start in development mode (hot reload)"
	@echo "  make build       Build all Docker images"
	@echo "  make up          Start all services (production)"
	@echo "  make down        Stop all services"
	@echo "  make restart     Restart all services"
	@echo "  make logs        Stream logs from all services"
	@echo "  make ps          Show running containers"
	@echo "  make clean       Remove containers, volumes, images"
	@echo ""
	@echo "  ☸️  Kubernetes Commands"
	@echo "  ─────────────────────────────────────"
	@echo "  make k8s-apply   Apply all manifests to cluster"
	@echo "  make k8s-delete  Delete all resources from cluster"
	@echo "  make k8s-status  Show pod/service status"
	@echo "  make k8s-logs    Stream backend pod logs"
	@echo "  make rollback    Rollback last backend deployment"
	@echo ""
	@echo "  🔧 Development Commands"
	@echo "  ─────────────────────────────────────"
	@echo "  make test        Run all tests"
	@echo "  make lint        Run linters"
	@echo "  make seed        Seed demo data into database"
	@echo "  make db-shell    Open PostgreSQL shell"
	@echo "  make redis-shell Open Redis CLI"
	@echo ""

# ── Docker: Development ───────────────────────────────────────────────────────
dev:
	@echo "🚀 Starting FinVault in development mode..."
	$(DOCKER_COMPOSE) -f docker-compose.yml -f docker-compose.dev.yml up --build

# ── Docker: Build ─────────────────────────────────────────────────────────────
build:
	@echo "🐳 Building all Docker images..."
	$(DOCKER_COMPOSE) build --no-cache --parallel

# ── Docker: Up (production) ───────────────────────────────────────────────────
up:
	@echo "🚀 Starting all services..."
	$(DOCKER_COMPOSE) up -d
	@echo "✅ Services started. Running health checks..."
	@sleep 5
	@$(DOCKER_COMPOSE) ps

# ── Docker: Down ──────────────────────────────────────────────────────────────
down:
	@echo "🛑 Stopping all services..."
	$(DOCKER_COMPOSE) down

# ── Docker: Restart ───────────────────────────────────────────────────────────
restart:
	@echo "🔄 Restarting all services..."
	$(DOCKER_COMPOSE) restart

# ── Docker: Logs ──────────────────────────────────────────────────────────────
logs:
	$(DOCKER_COMPOSE) logs -f --tail=100

logs-backend:
	$(DOCKER_COMPOSE) logs -f backend

logs-nginx:
	$(DOCKER_COMPOSE) logs -f nginx

# ── Docker: Status ────────────────────────────────────────────────────────────
ps:
	$(DOCKER_COMPOSE) ps

# ── Docker: Clean ─────────────────────────────────────────────────────────────
clean:
	@echo "🧹 Removing containers and volumes (data will be lost!)..."
	@read -p "Are you sure? [y/N] " confirm && [ $${confirm:-N} = y ]
	$(DOCKER_COMPOSE) down -v --remove-orphans
	docker image prune -f

# ── Tests ─────────────────────────────────────────────────────────────────────
test:
	@echo "🧪 Running backend tests..."
	cd backend  && npm run test:ci
	@echo "🎨 Running frontend tests..."
	cd frontend && npm run test:ci

test-backend:
	cd backend && npm run test:ci

test-frontend:
	cd frontend && npm run test:ci

# ── Lint ──────────────────────────────────────────────────────────────────────
lint:
	@echo "🔍 Linting backend..."
	cd backend  && npm run lint
	@echo "🔍 Linting frontend..."
	cd frontend && npm run lint --if-present

# ── Database ──────────────────────────────────────────────────────────────────
seed:
	@echo "🌱 Seeding demo data..."
	$(DOCKER_COMPOSE) exec backend node src/config/seed.js

db-shell:
	$(DOCKER_COMPOSE) exec postgres psql -U finvault_user -d finvault

db-dump:
	$(DOCKER_COMPOSE) exec postgres pg_dump -U finvault_user finvault > backup-$(shell date +%Y%m%d-%H%M%S).sql
	@echo "✅ Database backed up"

db-restore:
	@read -p "Restore from file: " file; \
	$(DOCKER_COMPOSE) exec -T postgres psql -U finvault_user finvault < $$file

redis-shell:
	$(DOCKER_COMPOSE) exec redis redis-cli -a $$(grep REDIS_PASSWORD .env | cut -d= -f2)

# ── Kubernetes ────────────────────────────────────────────────────────────────
k8s-apply:
	@echo "☸️  Applying K8s manifests..."
	kubectl apply -f k8s/ --namespace=$(NAMESPACE)
	@echo "✅ Manifests applied. Checking rollout..."
	$(KUBECTL) rollout status deployment/backend  --timeout=300s
	$(KUBECTL) rollout status deployment/frontend --timeout=300s

k8s-delete:
	@echo "⚠️  Deleting all K8s resources..."
	@read -p "Are you sure? [y/N] " confirm && [ $${confirm:-N} = y ]
	kubectl delete -f k8s/ --namespace=$(NAMESPACE)

k8s-status:
	@echo "📊 Pods:"
	$(KUBECTL) get pods -o wide
	@echo ""
	@echo "🔌 Services:"
	$(KUBECTL) get services
	@echo ""
	@echo "📈 HPA:"
	$(KUBECTL) get hpa

k8s-logs:
	$(KUBECTL) logs -l app=backend -f --tail=100

k8s-exec-backend:
	$(KUBECTL) exec -it $$($(KUBECTL) get pod -l app=backend -o name | head -1) -- sh

rollback:
	@echo "⏮️  Rolling back backend deployment..."
	$(KUBECTL) rollout undo deployment/backend
	$(KUBECTL) rollout status deployment/backend --timeout=120s

k8s-port-forward:
	@echo "🔗 Port-forwarding services to localhost..."
	$(KUBECTL) port-forward svc/nginx    8080:80   &
	$(KUBECTL) port-forward svc/grafana  3001:3000 &
	@echo "✅ App:     http://localhost:8080"
	@echo "✅ Grafana: http://localhost:3001"

# ── Health checks ─────────────────────────────────────────────────────────────
health:
	@echo "🏥 Checking service health..."
	@curl -sf http://localhost/api/health | python3 -m json.tool || echo "❌ API unhealthy"
	@echo ""
	@$(DOCKER_COMPOSE) ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# ── Setup: first-time ─────────────────────────────────────────────────────────
setup:
	@echo "🔧 First-time setup..."
	@cp -n .env.example .env || true
	@echo "📝 Please edit .env with your credentials, then run: make up"
