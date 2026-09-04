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

# ==============================================================================
# External Semgrep & Remote Configuration Settings
# ==============================================================================
SEMGREP_BIN          ?= semgrep
SEMGREP_CONFIG_URL   ?= p/typescript --config=p/react --config=p/nodejs --config=p/javascript --config=p/owasp-top-ten --config=p/cwe-top-25
SEMGREP_SECRETS_URL  ?= p/secrets
SEMGREP_EXCLUDES     ?= --exclude=dist --exclude=node_modules --exclude=coverage --exclude=.git

# Colors for terminal styling
CYAN   = \033[0;36m
GREEN  = \033[0;32m
YELLOW = \033[0;33m
RED    = \033[0;31m
BLUE   = \033[0;34m
NC     = \033[0m # No Color

.PHONY: help install start start-dev start-docker stop restart status logs test test-coverage scan scan-sast scan-secrets scan-lint scan-semgrep build publish release clean

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
	@echo "  $(GREEN)make start-dev$(NC)     Start in local interactive development mode"
	@echo "  $(GREEN)make stop$(NC)          Stop all running application containers/processes"
	@echo "  $(GREEN)make restart$(NC)       Restart the application cleanly"
	@echo "  $(GREEN)make status$(NC)        Check status and ping /api/health"
	@echo "  $(GREEN)make logs$(NC)          View live container logs"
	@echo ""
	@echo "$(YELLOW)Security & External Semgrep Code Scanning:$(NC)"
	@echo "  $(GREEN)make scan$(NC)          Run complete audit (External SAST + Secrets + Lint)"
	@echo "  $(GREEN)make scan-sast$(NC)     Run External Semgrep SAST & Vulnerability scanner"
	@echo "  $(GREEN)make scan-secrets$(NC)  Run External Semgrep Secret & Credential Leak detector"
	@echo "  $(GREEN)make scan-semgrep$(NC)  Run External Semgrep with custom remote rules"
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

start:
	@echo "$(GREEN)🚀 Starting $(APP_NAME) (Docker Compose)...$(NC)"
	@if [ ! -f .env ]; then \
		echo "$(YELLOW)⚠️  .env file not found. Copying from .env.example...$(NC)"; \
		cp .env.example .env; \
	fi
	docker compose up -d --build
	@echo "$(GREEN)✅ $(APP_NAME) is running at http://localhost:$(PORT)$(NC)"

start-dev:
	@echo "$(GREEN)💻 Starting local development server...$(NC)"
	npm run dev

start-docker: build-docker
	@echo "$(GREEN)🐳 Running standalone Docker container...$(NC)"
	docker run -d --name $(APP_NAME) -p $(PORT):3000 --env-file .env $(DOCKER_IMAGE):$(DOCKER_TAG)
	@echo "$(GREEN)✅ Container running at http://localhost:$(PORT)$(NC)"

stop:
	@echo "$(YELLOW)🛑 Stopping $(APP_NAME)...$(NC)"
	@docker compose down 2>/dev/null || true
	@docker stop $(APP_NAME) 2>/dev/null || true
	@docker rm $(APP_NAME) 2>/dev/null || true
	@echo "$(GREEN)✅ Application stopped.$(NC)"

restart: stop start
	@echo "$(GREEN)🔄 Application successfully restarted.$(NC)"

status:
	@echo "$(CYAN)🔍 Checking application status...$(NC)"
	@docker ps --filter "name=$(APP_NAME)"
	@echo "\nPinging health endpoint:"
	@curl -s -f http://localhost:$(PORT)/api/health || echo "$(RED)❌ Service unreachable on port $(PORT)$(NC)"

logs:
	docker compose logs -f

# ------------------------------------------------------------------------------
# 🛡️ EXTERNAL SEMGREP SCANNING & QUALITY CHECKS
# ------------------------------------------------------------------------------

# Run all scans together
scan: scan-sast scan-secrets scan-lint
	@echo "\n$(GREEN)✅ [ALL SCANS PASSED] Codebase is secure and compliant.$(NC)\n"

# Run External Semgrep SAST vulnerability scanner using remote rulesets
scan-sast:
	@echo "$(CYAN)🔒 [External Semgrep] Running SAST & Vulnerability Scan [Remote Rules: $(SEMGREP_CONFIG_URL)]...$(NC)"
	$(SEMGREP_BIN) scan --config=$(SEMGREP_CONFIG_URL) $(SEMGREP_EXCLUDES) --error

# Run External Semgrep Secret Leak detection using remote rulesets
scan-secrets:
	@echo "$(CYAN)🔑 [External Semgrep] Running Secret & Credential Leak Detection [Remote Rules: $(SEMGREP_SECRETS_URL)]...$(NC)"
	$(SEMGREP_BIN) scan --config=$(SEMGREP_SECRETS_URL) $(SEMGREP_EXCLUDES) --error

# Run custom remote Semgrep scan URL (e.g. make scan-semgrep SEMGREP_CONFIG_URL=https://semgrep.dev/c/p/owasp-top-ten)
scan-semgrep:
	@echo "$(CYAN)🛡️ [External Semgrep] Running custom remote ruleset...$(NC)"
	$(SEMGREP_BIN) scan --config=$(SEMGREP_CONFIG_URL) --config=$(SEMGREP_SECRETS_URL) $(SEMGREP_EXCLUDES) --error

# Run Lint & Type checks
scan-lint:
	@echo "$(CYAN)🧹 [3/3] Running ESLint & TypeScript Checks...$(NC)"
	npm run lint
	@echo "$(GREEN)✅ Lint & Type checks passed!$(NC)"

# Run Vitest unit tests
test:
	@echo "$(CYAN)🧪 Running Unit Tests...$(NC)"
	npx vitest run

# Run tests with code coverage
test-coverage:
	@echo "$(CYAN)📊 Running Unit Tests with Code Coverage...$(NC)"
	npx vitest run --coverage

# ------------------------------------------------------------------------------
# 🏗️ BUILD, RELEASE & PUBLISH
# ------------------------------------------------------------------------------

build:
	@echo "$(CYAN)🏗️  Building production application assets...$(NC)"
	npm run build
	@echo "$(CYAN)🐳 Building Docker image: $(DOCKER_IMAGE):$(DOCKER_TAG)$(NC)"
	docker build -t $(DOCKER_IMAGE):$(DOCKER_TAG) -t $(DOCKER_IMAGE):$(VERSION) .
	@echo "$(GREEN)✅ Build complete for version $(VERSION)!$(NC)"

build-docker:
	docker build -t $(DOCKER_IMAGE):$(DOCKER_TAG) -t $(DOCKER_IMAGE):$(VERSION) .

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
# ☁️ CLOUD DEPLOYMENTS (GCP Cloud Run & AWS App Runner / ECS)
# ------------------------------------------------------------------------------

deploy-gcp:
	@echo "$(CYAN)☁️  Deploying to Google Cloud Run...$(NC)"
	@which gcloud > /dev/null || (echo "$(RED)Error: Google Cloud SDK (gcloud) is not installed.$(NC)" && exit 1)
	gcloud run deploy $(APP_NAME) \
		--source . \
		--platform managed \
		--region us-central1 \
		--allow-unauthenticated \
		--port 3000 \
		--set-env-vars NODE_ENV=production
	@echo "$(GREEN)✅ Successfully deployed to Google Cloud Run!$(NC)"

AWS_ACCOUNT_ID ?= 104033131308
AWS_REGION     ?= us-east-1

deploy-aws-ecr:
	@echo "$(CYAN)☁️  Preparing AWS ECR Deployment for $(AWS_ACCOUNT_ID) ($(AWS_REGION))...$(NC)"
	aws ecr get-login-password --region $(AWS_REGION) | docker login --username AWS --password-stdin $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com
	docker build -t $(DOCKER_IMAGE):latest .
	docker tag $(DOCKER_IMAGE):latest $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/$(DOCKER_IMAGE):latest
	docker tag $(DOCKER_IMAGE):latest $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/$(DOCKER_IMAGE):$(VERSION)
	docker push $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/$(DOCKER_IMAGE):latest
	docker push $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/$(DOCKER_IMAGE):$(VERSION)
	@echo "$(GREEN)✅ Successfully pushed to AWS ECR ($(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/$(DOCKER_IMAGE))!$(NC)"

# ------------------------------------------------------------------------------
# 🧹 CLEAN
# ------------------------------------------------------------------------------
clean:
	@echo "$(YELLOW)🧹 Cleaning build outputs and caches...$(NC)"
	rm -rf dist server.js coverage .turbo .cache
	@echo "$(GREEN)✅ Workspace cleaned.$(NC)"
