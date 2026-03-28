# 💰 FinVault — Production-Grade Financial Application

[![CI/CD Pipeline](https://github.com/YOUR_ORG/finvault/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/YOUR_ORG/finvault/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://docker.com)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-ready-326CE5?logo=kubernetes)](https://kubernetes.io)

A production-ready full-stack financial tracking application demonstrating enterprise DevOps practices — containerisation, Kubernetes orchestration, CI/CD automation, and observability.

---

## 🏗️ Architecture Overview

```
                        ┌─────────────────────────────────────────────────────────┐
                        │                   INTERNET / USER                        │
                        └──────────────────────────┬──────────────────────────────┘
                                                   │ HTTPS :443
                        ┌──────────────────────────▼──────────────────────────────┐
                        │              NGINX Reverse Proxy / Load Balancer         │
                        │          Rate Limiting · SSL Termination · gzip          │
                        └────────────────┬─────────────────────┬───────────────────┘
                                         │ /api/*              │ /*
                     ┌───────────────────▼──────┐  ┌───────────▼──────────────────┐
                     │   Node.js Backend API     │  │     React Frontend (Nginx)    │
                     │   Express · JWT Auth       │  │     SPA · Code-split         │
                     │   Rate Limit · Helmet      │  │     PWA-ready                │
                     │   Prometheus Metrics       │  └──────────────────────────────┘
                     └──────┬────────────┬────────┘
                            │            │
              ┌─────────────▼──┐   ┌─────▼──────────┐
              │  PostgreSQL 15 │   │    Redis 7       │
              │  Transactions  │   │    Session Cache │
              │  Users · Goals │   │    Rate Limits   │
              │  Budgets       │   │    API Cache     │
              └────────────────┘   └─────────────────┘
                            │
              ┌─────────────▼──────────────┐
              │  Prometheus + Grafana       │
              │  Metrics · Alerts · Logs    │
              └─────────────────────────────┘
```

## 📁 Project Structure

```
finvault/
├── 🐳 docker-compose.yml          # Full stack orchestration
├── ⚙️  Makefile                    # One-command DevOps operations
├── 📋 .env.example                # Environment template
├── 🚫 .gitignore
│
├── 🖥️  backend/                    # Node.js REST API
│   ├── Dockerfile                 # Multi-stage production build
│   ├── package.json               # 20+ production dependencies
│   └── src/
│       ├── server.js              # Express app + graceful shutdown
│       ├── config/
│       │   ├── database.js        # PostgreSQL pool + migrations
│       │   └── redis.js           # IORedis client + cache helpers
│       ├── routes/
│       │   ├── auth.js            # Register · Login · Refresh · Logout
│       │   ├── transactions.js    # Full CRUD + bulk import
│       │   ├── dashboard.js       # Analytics with Redis caching
│       │   ├── budgets.js         # Monthly budget management
│       │   ├── goals.js           # Savings goals
│       │   ├── reports.js         # Monthly/yearly reports + CSV export
│       │   └── users.js           # Profile + password management
│       ├── middleware/
│       │   ├── auth.js            # JWT + Redis session validation
│       │   ├── errorHandler.js    # Centralised error handling
│       │   └── metrics.js         # Prometheus custom metrics
│       └── utils/
│           └── logger.js          # Winston structured logging
│
├── 🎨 frontend/                   # React 18 SPA
│   ├── Dockerfile                 # Multi-stage: build + nginx serve
│   ├── nginx-spa.conf             # React Router support
│   ├── package.json               # 15+ dependencies
│   └── src/
│       ├── index.js               # App root + QueryClient + Router
│       ├── index.css              # Design system variables
│       ├── services/api.js        # Axios + auto token refresh
│       ├── context/authStore.js   # Zustand auth state
│       ├── components/Layout.jsx  # Sidebar + mobile nav
│       └── pages/
│           ├── LoginPage.jsx      # Auth with zod validation
│           ├── Dashboard.jsx      # Recharts analytics
│           ├── Transactions.jsx   # Paginated CRUD table
│           ├── AddRecord.jsx      # react-hook-form entry
│           ├── BudgetPage.jsx     # Editable category budgets
│           ├── GoalsPage.jsx      # Savings milestone tracker
│           ├── ReportsPage.jsx    # Annual bar chart + CSV export
│           └── SettingsPage.jsx   # Profile + security + data
│
├── 🌐 nginx/                      # Reverse proxy config
│   ├── nginx.conf                 # Main config (gzip, rate limits, upstreams)
│   └── conf.d/finvault.conf       # Virtual host + security headers
│
├── ☸️  k8s/                        # Kubernetes manifests
│   ├── 00-namespace-configmap.yaml
│   ├── 01-secrets.yaml            # Base64-encoded secrets (use Vault in prod)
│   ├── 02-persistent-volumes.yaml # PVC for postgres/redis/logs
│   ├── 03-postgres.yaml           # StatefulSet + headless service
│   ├── 04-redis.yaml              # StatefulSet + config
│   ├── 05-backend.yaml            # Deployment + HPA + init containers
│   ├── 06-frontend.yaml           # Deployment + HPA
│   └── 07-nginx-ingress.yaml      # LoadBalancer + Ingress + TLS
│
├── 📊 monitoring/
│   └── prometheus.yml             # Scrape configs for all services
│
└── 🤖 .github/workflows/
    └── ci-cd.yml                  # Full CI/CD pipeline (6 jobs)
```

---

## 🚀 Quick Start

### Prerequisites
- Docker ≥ 24.0 and Docker Compose ≥ 2.20
- Node.js ≥ 20 (for local development)
- `make` (Linux/macOS) or Git Bash (Windows)

### Option A — Docker Compose (Recommended for demo)

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_ORG/finvault.git
cd finvault

# 2. Setup environment
make setup          # copies .env.example → .env
# Edit .env with your credentials (or use the defaults for local dev)

# 3. Start everything
make up

# 4. Seed demo data (optional)
make seed
```

**Services will be available at:**
| Service       | URL                          |
|---------------|------------------------------|
| 🌐 App        | http://localhost             |
| 🔌 API        | http://localhost/api         |
| 📊 Grafana    | http://localhost:3001        |
| 🔬 Prometheus | http://localhost:9090        |
| 🐘 PostgreSQL | localhost:5432               |
| 🟥 Redis      | localhost:6379               |

### Option B — Kubernetes (Production)

```bash
# 1. Create namespace + apply secrets
kubectl apply -f k8s/00-namespace-configmap.yaml
# Edit k8s/01-secrets.yaml with real base64 secrets
kubectl apply -f k8s/01-secrets.yaml

# 2. Deploy all services
make k8s-apply

# 3. Check status
make k8s-status

# 4. Port-forward for local access
make k8s-port-forward
```

### Option C — Local Development (Hot reload)

```bash
# Start infrastructure (DB + Redis) only
docker compose up postgres redis -d

# Backend (terminal 1)
cd backend && npm install && npm run dev

# Frontend (terminal 2)
cd frontend && npm install && npm start
```

---

## 🔑 API Reference

### Authentication
| Method | Endpoint              | Auth | Description           |
|--------|-----------------------|------|-----------------------|
| POST   | `/api/auth/register`  | ❌   | Create account        |
| POST   | `/api/auth/login`     | ❌   | Get JWT tokens        |
| POST   | `/api/auth/refresh`   | ❌   | Refresh access token  |
| POST   | `/api/auth/logout`    | ✅   | Revoke refresh token  |
| GET    | `/api/auth/me`        | ✅   | Get current user      |

### Transactions
| Method | Endpoint                    | Description              |
|--------|-----------------------------|--------------------------|
| GET    | `/api/transactions`         | List (paginated, filtered)|
| POST   | `/api/transactions`         | Create transaction        |
| GET    | `/api/transactions/:id`     | Get single transaction    |
| PUT    | `/api/transactions/:id`     | Update transaction        |
| DELETE | `/api/transactions/:id`     | Delete transaction        |
| POST   | `/api/transactions/bulk`    | Bulk import (≤500 rows)   |

### Dashboard & Analytics
| Method | Endpoint                        | Description                |
|--------|---------------------------------|----------------------------|
| GET    | `/api/dashboard/summary`        | Totals, trend, categories  |
| GET    | `/api/dashboard/budgets-status` | Budget vs actual spending  |
| GET    | `/api/reports/monthly/:y/:m`    | Monthly breakdown          |
| GET    | `/api/reports/yearly/:y`        | Annual trend data          |
| GET    | `/api/reports/export/csv`       | CSV data export            |

---

## 🔐 Security Features

- **JWT Authentication** with 15-minute access tokens + 7-day refresh rotation
- **bcrypt** password hashing (cost factor 12)
- **Redis brute-force protection** (5 attempts → 15-minute lockout)
- **Helmet.js** security headers (CSP, HSTS, X-Frame-Options)
- **Input validation** with express-validator + zod
- **XSS protection** + HPP (HTTP Parameter Pollution) prevention
- **Rate limiting** (100 req/15min global, 10 req/15min auth)
- **SQL injection prevention** via parameterised pg queries
- **Non-root containers** in Docker and Kubernetes
- **Read-only filesystem** where possible in K8s

---

## 📊 Observability Stack

| Layer       | Tool              | What it monitors                         |
|-------------|-------------------|------------------------------------------|
| Metrics     | Prometheus        | HTTP latency, error rates, DB pool, Redis|
| Dashboards  | Grafana           | Visual dashboards for all metrics        |
| Logs        | Winston           | Structured JSON logs with daily rotation |
| Tracing     | Request IDs       | End-to-end request correlation           |
| Health      | `/api/health`     | DB + Redis liveness check                |

---

## 🤖 CI/CD Pipeline (GitHub Actions)

```
Push to develop/main
        │
        ▼
┌──────────────────┐    ┌──────────────────┐
│ test-backend      │    │ test-frontend     │
│ • ESLint          │    │ • ESLint          │
│ • Jest + coverage │    │ • React tests     │
│ • Postgres + Redis│    │                  │
└────────┬─────────┘    └───────┬──────────┘
         │                      │
         └──────────┬───────────┘
                    ▼
         ┌──────────────────┐
         │  security-scan   │
         │  • Trivy (FS)    │
         │  • npm audit     │
         └────────┬─────────┘
                  ▼
         ┌──────────────────┐
         │  build-images    │
         │  • Multi-arch    │
         │  • GHCR push     │
         │  • Trivy (image) │
         └────────┬─────────┘
                  │
        ┌─────────┴──────────┐
        ▼                    ▼
  [develop branch]     [main branch]
  deploy-staging       deploy-production
  (auto)               (requires approval)
                        + GitHub Release
                        + Slack notify
                        + Auto rollback
```

---

## 🛠️ Tech Stack

### Backend
| Package              | Version | Purpose                              |
|----------------------|---------|--------------------------------------|
| express              | 4.18    | HTTP framework                       |
| pg / pg-pool         | 8.11    | PostgreSQL client with connection pool|
| ioredis              | 5.3     | Redis client                         |
| jsonwebtoken         | 9.0     | JWT signing/verification             |
| bcryptjs             | 2.4     | Password hashing                     |
| helmet               | 7.1     | Security HTTP headers                |
| express-rate-limit   | 7.1     | API rate limiting                    |
| express-validator    | 7.0     | Input validation                     |
| prom-client          | 15.1    | Prometheus metrics                   |
| winston              | 3.11    | Structured logging                   |
| compression          | 1.7     | gzip response compression            |

### Frontend
| Package              | Version | Purpose                              |
|----------------------|---------|--------------------------------------|
| react                | 18.2    | UI framework                         |
| react-router-dom     | 6.22    | Client-side routing                  |
| @tanstack/react-query| 5.17    | Server state management              |
| zustand              | 4.5     | Client state management              |
| axios                | 1.6     | HTTP client + interceptors           |
| framer-motion        | 11.0    | Animations                           |
| recharts             | 2.10    | Charts and data visualisation        |
| react-hook-form      | 7.49    | Performant form handling             |
| zod                  | 3.22    | Schema validation                    |
| react-hot-toast      | 2.4     | Toast notifications                  |
| date-fns             | 3.3     | Date utilities                       |

### Infrastructure
| Tool         | Version | Purpose                              |
|--------------|---------|--------------------------------------|
| Docker       | 24+     | Containerisation                     |
| Docker Compose| 2.20+  | Local multi-container orchestration  |
| Kubernetes   | 1.29    | Production container orchestration   |
| Nginx        | 1.25    | Reverse proxy + SSL termination      |
| PostgreSQL   | 15      | Primary relational database          |
| Redis        | 7       | Cache + session store                |
| Prometheus   | latest  | Metrics collection                   |
| Grafana      | latest  | Metrics visualisation                |
| GitHub Actions| -      | CI/CD automation                     |

---

## 📋 Interview Talking Points (DevOps)

1. **Multi-stage Docker builds** — separate deps/build/prod stages, non-root users, minimal attack surface
2. **Zero-downtime deployments** — RollingUpdate with `maxUnavailable: 0`, preStop lifecycle hooks
3. **Horizontal Pod Autoscaling** — CPU/memory-based autoscaling for backend (2–8 replicas) and frontend (2–6)
4. **Health probes** — separate liveness + readiness probes with appropriate delays and thresholds
5. **Init containers** — `wait-for-postgres` and `wait-for-redis` before app starts
6. **Secret management** — K8s Secrets (with guidance to use Sealed Secrets / Vault in prod)
7. **Pod anti-affinity** — prevents all replicas landing on same node
8. **Graceful shutdown** — SIGTERM handler drains connections before exit
9. **Observability** — Prometheus custom metrics, Grafana dashboards, structured Winston logs, request IDs
10. **CI/CD gates** — lint → test → security scan → build → staging → production (with approval + auto-rollback)
11. **Redis caching** — dashboard analytics cached 5 min, invalidated on writes
12. **Connection pooling** — pg-pool with max 20 connections, slow query detection
13. **Rate limiting** — global + auth-specific limits in Nginx AND Express (defence in depth)
14. **StatefulSets** — PostgreSQL and Redis use StatefulSets with headless services for stable DNS

---

## 📄 License

MIT © FinVault — Built for production-grade DevOps demonstration
