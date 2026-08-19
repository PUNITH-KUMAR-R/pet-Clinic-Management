# ==============================================================================
# VetCore AI Clinic - Unified Automation Makefile
# ==============================================================================
# Commands: start | stop | restart | scan | publish | release | test | build
# ==============================================================================

# Variables
APP_NAME      ?= vetcore-ai-clinic
DOCKER_IMAGE  ?= vetcore-ai-clinic
DOCKER_TAG    ?= latest
DOCKER_USER   ?=
REGISTRY      ?= docker.io
PORT          ?= 3000
VERSION       ?= $(shell node -p "require('./package.json').version || '1.0.0'")

# Colors for terminal styling
CYAN   = \033[0;36m
GREEN  = \033[0;32m
YELLOW = \033[0;33m
RED    = \033[0;31m
BLUE   = \033[0;34m
NC     = \033[0m # No Color

.PHONY: help install start start-dev start-docker stop restart status logs test test-coverage scan scan-sast scan-secrets scan-lint scan-all build publish release clean

# ------------------------------------------------------------------------------
# 📋 HELP (Default target)
# ------------------------------------------------------------------------------
help:
	@echo ""
	@echo "$(CYAN)════════════════════════════════════════════════════════════════════$(NC)"
	@echo "$(CYAN)  🐾 VetCore AI Clinic - Management & DevOps Automation Makefile   $(NC)"
	@echo "$(CYAN)════════════════════════════════════════════════════════════════════$(NC)"
	@echo ""
	@echo "$(YELLOW)Application Lifecycle:$(NC)"
	@echo "  $(GREEN)make start$(NC)         Start the application (Docker container mode)"
	@echo "  $(GREEN)make start-dev$(NC)     Start in local interactive development mode (tsx)"
	@echo "  $(GREEN)make stop$(NC)          Stop all running application containers/processes"
	@echo "  $(GREEN)make restart$(NC)       Restart the application cleanly"
	@echo "  $(GREEN)make status$(NC)        Check status and ping /api/health"
	@echo "  $(GREEN)make logs$(NC)          View live container logs"
	@echo ""
	@echo "$(YELLOW)Security & Code Scanning:$(NC)"
	@echo "  $(GREEN)make scan$(NC)          Run all security scanners (SAST + Secret Leak + Lint)"
	@echo "  $(GREEN)make scan-sast$(NC)     Run Static Application Security Testing (Semgrep rules)"
	@echo "  $(GREEN)make scan-secrets$(NC)  Run Secret Leak & Entropy Detection (Gitleaks rules)"
	@echo "  $(GREEN)make scan-lint$(NC)     Run ESLint & TypeScript compiler checks"
	@echo "  $(GREEN)make test$(NC)          Run Vitest unit tests"
	@echo "  $(GREEN)make test-coverage$(NC) Run unit tests with full code coverage table"
	@echo ""
	@echo "$(YELLOW)Build, Release & Publish:$(NC)"
	@echo "  $(GREEN)make build$(NC)         Compile frontend & backend bundles + build Docker image"
	@echo "  $(GREEN)make publish$(NC)       Build, tag and push Docker image to container registry"
	@echo "  $(GREEN)make release$(NC)       Perform pre-release validation, build bundle & create Git release tag"
	@echo "  $(GREEN)make clean$(NC)         Remove build artifacts, caches, and dist directories"
	@echo ""

# ------------------------------------------------------------------------------
# 📦 SETUP & INSTALLATION
# ------------------------------------------------------------------------------
install:
	@echo "$(CYAN)📦 Installing dependencies...$(NC)"
	npm install

# ------------------------------------------------------------------------------
# 🚀 START / STOP / RESTART LIFECYCLE
# ------------------------------------------------------------------------------

# Start application via Docker Compose (or standalone if compose is not present)
start:
	@echo "$(GREEN)🚀 Starting $(APP_NAME) (Docker Compose)...$(NC)"
	@if [ ! -f .env ]; then \
		echo "$(YELLOW)⚠️  .env file not found. Copying from .env.example...$(NC)"; \
		cp .env.example .env; \
	fi
	docker compose up -d --build
	@echo "$(GREEN)✅ $(APP_NAME) is running at http://localhost:$(PORT)$(NC)"

# Start in local interactive development mode
start-dev:
	@echo "$(GREEN)💻 Starting local development server (tsx server.ts)...$(NC)"
	npm run dev

# Start directly via standard Docker run
start-docker: build-docker
	@echo "$(GREEN)🐳 Running standalone Docker container...$(NC)"
	docker run -d --name $(APP_NAME) -p $(PORT):3000 --env-file .env $(DOCKER_IMAGE):$(DOCKER_TAG)
	@echo "$(GREEN)✅ Container running at http://localhost:$(PORT)$(NC)"

# Stop application
stop:
	@echo "$(YELLOW)🛑 Stopping $(APP_NAME)...$(NC)"
	@docker compose down 2>/dev/null || true
	@docker stop $(APP_NAME) 2>/dev/null || true
	@docker rm $(APP_NAME) 2>/dev/null || true
	@echo "$(GREEN)✅ Application stopped.$(NC)"

# Restart application
restart: stop start
	@echo "$(GREEN)🔄 Application successfully restarted.$(NC)"

# Check application health and status
status:
	@echo "$(CYAN)🔍 Checking application status...$(NC)"
	@docker ps --filter "name=$(APP_NAME)"
	@echo "\nPinging health endpoint:"
	@curl -s -f http://localhost:$(PORT)/api/health || echo "$(RED)❌ Service unreachable on port $(PORT)$(NC)"

# Follow application logs
logs:
	docker compose logs -f

# ------------------------------------------------------------------------------
# 🛡️ SCANNING & QUALITY CHECKS (SAST, SECRETS, LINT, TESTS)
# ------------------------------------------------------------------------------

# Run all scans together
scan: scan-sast scan-secrets scan-lint
	@echo "\n$(GREEN)✅ [ALL SCANS PASSED] Codebase is secure and compliant.$(NC)\n"

# Run SAST vulnerability scanner
scan-sast:
	@echo "$(CYAN)🔒 [1/3] Running Static Application Security Testing (SAST)...$(NC)"
	npm run sast

# Run Secret Leak and Entropy scanner
scan-secrets:
	@echo "$(CYAN)🔑 [2/3] Running Secret Leak & High-Entropy Detection...$(NC)"
	npm run scan:secrets

# Run Lint checks
scan-lint:
	@echo "$(CYAN)🧹 [3/3] Running ESLint & TypeScript Checks...$(NC)"
	npx eslint . --quiet && npx tsc --noEmit
	@echo "$(GREEN)✅ Lint & Type checks passed!$(NC)"

# Run Vitest unit tests
test:
	@echo "$(CYAN)🧪 Running Unit Tests...$(NC)"
	npm run test

# Run tests with code coverage
test-coverage:
	@echo "$(CYAN)📊 Running Unit Tests with Code Coverage...$(NC)"
	npm run test:coverage

# ------------------------------------------------------------------------------
# 🏗️ BUILD, RELEASE & PUBLISH
# ------------------------------------------------------------------------------

# Build production bundle and Docker image
build:
	@echo "$(CYAN)🏗️  Building production application assets...$(NC)"
	npm run build
	@echo "$(CYAN)🐳 Building Docker image: $(DOCKER_IMAGE):$(DOCKER_TAG)$(NC)"
	docker build -t $(DOCKER_IMAGE):$(DOCKER_TAG) -t $(DOCKER_IMAGE):$(VERSION) .
	@echo "$(GREEN)✅ Build complete for version $(VERSION)!$(NC)"

build-docker:
	docker build -t $(DOCKER_IMAGE):$(DOCKER_TAG) -t $(DOCKER_IMAGE):$(VERSION) .

# Publish Docker container to registry (e.g., Docker Hub or GitHub Container Registry)
publish: scan test build
	@if [ -z "$(DOCKER_USER)" ]; then \
		echo "\n$(YELLOW)⚠️  DOCKER_USER is not set!$(NC)"; \
		echo "$(CYAN)Usage: make publish DOCKER_USER=<your-dockerhub-username>$(NC)"; \
		echo "$(CYAN)Example: make publish DOCKER_USER=punithkumarshivu$(NC)"; \
		echo "$(YELLOW)Or for GitHub Container Registry:$(NC)"; \
		echo "$(CYAN)make publish REGISTRY=ghcr.io DOCKER_USER=<github-username>$(NC)\n"; \
		exit 1; \
	fi
	@echo "$(CYAN)🚀 Publishing Docker image to $(REGISTRY)/$(DOCKER_USER)/$(DOCKER_IMAGE)...$(NC)"
	docker tag $(DOCKER_IMAGE):$(DOCKER_TAG) $(REGISTRY)/$(DOCKER_USER)/$(DOCKER_IMAGE):$(DOCKER_TAG)
	docker tag $(DOCKER_IMAGE):$(VERSION) $(REGISTRY)/$(DOCKER_USER)/$(DOCKER_IMAGE):$(VERSION)
	@echo "$(YELLOW)Note: Ensure you ran 'docker login' prior to publishing.$(NC)"
	docker push $(REGISTRY)/$(DOCKER_USER)/$(DOCKER_IMAGE):$(DOCKER_TAG)
	docker push $(REGISTRY)/$(DOCKER_USER)/$(DOCKER_IMAGE):$(VERSION)
	@echo "$(GREEN)🎉 Successfully published $(REGISTRY)/$(DOCKER_USER)/$(DOCKER_IMAGE):$(VERSION)$(NC)"

# Release workflow: Validates security, runs tests, creates Git tag, and builds release package
release: scan test build
	@echo "$(CYAN)🏷️  Preparing Release for v$(VERSION)...$(NC)"
	@if [ -z "$$(git status --porcelain)" ]; then \
		echo "$(GREEN)Working tree clean. Tagging release v$(VERSION)...$(NC)"; \
		git tag -a "v$(VERSION)" -m "Release v$(VERSION) [Automated by Makefile]"; \
		echo "$(GREEN)✅ Git tag v$(VERSION) created.$(NC)"; \
		echo "$(YELLOW)Run 'git push origin v$(VERSION)' to publish tag to GitHub.$(NC)"; \
	else \
		echo "$(YELLOW)⚠️  Uncommitted changes detected. Commit changes before releasing.$(NC)"; \
	fi
	@echo "$(GREEN)🏁 Release v$(VERSION) build ready!$(NC)"

# ------------------------------------------------------------------------------
# 🧹 CLEAN
# ------------------------------------------------------------------------------
clean:
	@echo "$(YELLOW)🧹 Cleaning build outputs and caches...$(NC)"
	rm -rf dist server.js coverage .turbo .cache
	@echo "$(GREEN)✅ Workspace cleaned.$(NC)"
