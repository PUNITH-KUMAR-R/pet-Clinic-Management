import { useState } from 'react';
import { Terminal, Shield, Cloud, Server, Code, FileCode, CheckCircle, Layers, Cpu } from 'lucide-react';

export default function DevOpsHub() {
  const [activeTab, setActiveTab] = useState<'docker' | 'testing' | 'gcp' | 'scale'>('docker');

  const dockerfiles = {
    fastapi: `FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \\
    build-essential \\
    libpq-dev \\
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose port
EXPOSE 8000

# Start command
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]`,

    react: `FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production server using lightweight nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]`,

    compose: `version: "3.8"

services:
  # FastAPI backend service
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://\${POSTGRES_USER:-postgres}:\${POSTGRES_PASSWORD:-changeme}@db:5432/\${POSTGRES_DB:-pet_clinic}
      - GEMINI_API_KEY=\${GEMINI_API_KEY}
    depends_on:
      db:
        condition: service_healthy

  # React SPA frontend service
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    depends_on:
      - backend

  # PostgreSQL database container
  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=\${POSTGRES_USER:-postgres}
      - POSTGRES_PASSWORD=\${POSTGRES_PASSWORD:-changeme}
      - POSTGRES_DB=\${POSTGRES_DB:-pet_clinic}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:`
  };

  const testingCode = {
    test: `import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db

client = TestClient(app)

# Seed sample data for testing
@pytest.fixture(autouse=True)
def setup_database():
    # In modular databases, run migration or seed script
    pass

def test_get_doctors():
    response = client.get("/api/doctors")
    assert response.status_code == 200
    doctors = response.json()
    assert len(doctors) > 0
    assert "name" in doctors[0]

def test_create_appointment_success():
    payload = {
        "petId": "pet-1",
        "doctorId": "doc-1",
        "date": "2026-07-22",
        "time": "11:00",
        "reason": "Routine wellness exam"
    }
    response = client.post("/api/appointments", json=payload)
    assert response.status_code == 201
    assert response.json()["status"] == "Scheduled"

def test_create_appointment_conflict_fail():
    payload = {
        "petId": "pet-1",
        "doctorId": "doc-1",
        "date": "2026-07-22",
        "time": "10:00", # Dr. Sarah Jenkins is booked at 10:00!
        "reason": "Ear inspection"
    }
    response = client.post("/api/appointments", json=payload)
    assert response.status_code == 400
    assert "conflict" in response.json()["detail"].lower() or "already booked" in response.json()["detail"].lower()`,

    coverage: `# Pytest configuration with coverage report output (.coveragerc)
[run]
branch = True
source = app

[report]
show_missing = True
fail_under = 90

# Commands to run test & verify coverage:
# pytest --cov=app --cov-report=term-missing --cov-fail-under=90 tests/`,

    scanners: `# Secret & Vulnerability scanning configuration (.github/workflows/security-scan.yml)
name: Security Scan

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  security-scans:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout Code
      uses: actions/checkout@v3
      with:
        fetch-depth: 0 # gitleaks needs full history

    # 1. Scan for Secret Leaks
    - name: Gitleaks Action Scan
      uses: gitleaks/gitleaks-action@v2
      env:
        GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}

    # 2. Scan Python Dependencies for vulnerabilities
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    - name: Install pip-audit
      run: pip install pip-audit
    - name: Run pip-audit
      run: pip-audit -r backend/requirements.txt

    # 3. Scan built Docker images for CVE vulnerabilities
    - name: Build Docker Image
      run: docker build -t pet-clinic-backend:test ./backend
    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: 'pet-clinic-backend:test'
        format: 'table'
        exit-code: '1' # Fail the pipeline on HIGH/CRITICAL issues
        severity: 'HIGH,CRITICAL'`
  };

  const gcpDeployment = {
    commands: `# 1. Enable Required GCP Services
gcloud services enable \\
  artifactregistry.googleapis.com \\
  run.googleapis.com \\
  sqladmin.googleapis.com \\
  secretmanager.googleapis.com \\
  cloudbuild.googleapis.com

# 2. Create Artifact Registry repository for Docker images
gcloud artifacts repositories create pet-clinic-repo \\
  --repository-format=docker \\
  --location=us-central1 \\
  --description="Repository for Pet Clinic application"

# 3. Build & Push images to Registry via Cloud Build
gcloud builds submit --tag us-central1-docker.pkg.dev/YOUR_PROJECT_ID/pet-clinic-repo/backend:latest ./backend
gcloud builds submit --tag us-central1-docker.pkg.dev/YOUR_PROJECT_ID/pet-clinic-repo/frontend:latest ./frontend

# 4. Provision secure Cloud SQL (PostgreSQL) instance
gcloud sql instances create pet-clinic-db \\
  --database-version=POSTGRES_15 \\
  --tier=db-f1-micro \\
  --region=us-central1

# 5. Store secrets in GCP Secret Manager safely
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 6. Deploy Backend to Cloud Run
gcloud run deploy pet-clinic-backend \\
  --image us-central1-docker.pkg.dev/YOUR_PROJECT_ID/pet-clinic-repo/backend:latest \\
  --region us-central1 \\
  --set-env-vars="DB_HOST=127.0.0.1,DB_NAME=pet_clinic,DB_USER=postgres" \\
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest,DB_PASS=CLOUDSQL_DB_PASS:latest" \\
  --add-cloudsql-instances YOUR_PROJECT_ID:us-central1:pet-clinic-db \\
  --allow-unauthenticated`,

    tf: `provider "google" {
  project = var.gcp_project_id
  region  = "us-central1"
}

# Artifact Registry for images
resource "google_artifact_registry_repository" "clinic_repo" {
  location      = "us-central1"
  repository_id = "pet-clinic-repo"
  format        = "DOCKER"
}

# Secret for Gemini API Key
resource "google_secret_manager_secret" "gemini_key" {
  secret_id = "GEMINI_API_KEY"
  replication {
    auto {}
  }
}

# Database Instance
resource "google_active_directory_domain" "clinic_db" {
  # ... Cloud SQL resources
}`
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6" id="devops-hub">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
            <Cpu className="w-5.5 h-5.5 text-teal-600" />
            <span>Architecture & DevOps Advisory Center</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">Production-ready guidelines for migrating to FastAPI + GCloud deployment and scaling to 10 clinics.</p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-xl space-x-1 mt-4 md:mt-0">
          <button
            onClick={() => setActiveTab('docker')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 ${
              activeTab === 'docker' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Docker & Python Stack</span>
          </button>
          <button
            onClick={() => setActiveTab('testing')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 ${
              activeTab === 'testing' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Testing & DevOps</span>
          </button>
          <button
            onClick={() => setActiveTab('gcp')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 ${
              activeTab === 'gcp' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>GCP Deployments</span>
          </button>
          <button
            onClick={() => setActiveTab('scale')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 ${
              activeTab === 'scale' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Multi-Clinic (10 Tenant)</span>
          </button>
        </div>
      </div>

      {/* Content Container */}
      <div className="space-y-6">
        {activeTab === 'docker' && (
          <div className="space-y-6">
            <div className="bg-teal-50/50 border border-teal-100 rounded-xl p-4 text-sm text-teal-800">
              <h4 className="font-semibold flex items-center space-x-1.5 mb-1.5">
                <CheckCircle className="w-4 h-4 text-teal-600" />
                <span>FastAPI + Docker Target Blueprint</span>
              </h4>
              <p>We leverage Python FastAPI for rapid, asynchronous execution, built with Pydantic schemas and typed routes. Nginx reverse proxies requests directly to our static web files and FastAPI container via Docker Compose.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1">
                    <Code className="w-3.5 h-3.5" />
                    <span>Python FastAPI Dockerfile</span>
                  </span>
                </div>
                <pre className="bg-slate-900 text-slate-200 text-xs p-4 rounded-xl overflow-x-auto font-mono max-h-72">
                  {dockerfiles.fastapi}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1">
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Next.js / Vite React Dockerfile</span>
                  </span>
                </div>
                <pre className="bg-slate-900 text-slate-200 text-xs p-4 rounded-xl overflow-x-auto font-mono max-h-72">
                  {dockerfiles.react}
                </pre>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span>docker-compose.yml (Local Multi-Container Dev & Run Stack)</span>
                </span>
              </div>
              <pre className="bg-slate-900 text-slate-200 text-xs p-4 rounded-xl overflow-x-auto font-mono">
                {dockerfiles.compose}
              </pre>
            </div>
          </div>
        )}

        {activeTab === 'testing' && (
          <div className="space-y-6">
            <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-4 text-sm text-sky-900">
              <h4 className="font-semibold flex items-center space-x-1.5 mb-1.5">
                <Shield className="w-4 h-4 text-sky-600" />
                <span>DevOps Pipelines: 90% Test Coverage & Vulnerability Scanning</span>
              </h4>
              <p>Ensuring absolute safety of private veterinary records and high reliability is achieved using automated Python unit testing workflows coupled with state-of-the-art vulnerability scanning.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1">
                    <Code className="w-3.5 h-3.5" />
                    <span>Unit Testing with Pytest (app/tests/test_appointments.py)</span>
                  </span>
                </div>
                <pre className="bg-slate-900 text-slate-200 text-xs p-4 rounded-xl overflow-x-auto font-mono max-h-[350px]">
                  {testingCode.test}
                </pre>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1">
                      <Layers className="w-3.5 h-3.5" />
                      <span>90% Coverage Enforcement (.coveragerc)</span>
                    </span>
                  </div>
                  <pre className="bg-slate-900 text-slate-200 text-xs p-4 rounded-xl overflow-x-auto font-mono max-h-40">
                    {testingCode.coverage}
                  </pre>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1">
                      <Shield className="w-3.5 h-3.5" />
                      <span>Security: Secret Leak Scan & CVE Container Scan</span>
                    </span>
                  </div>
                  <pre className="bg-slate-900 text-slate-200 text-xs p-4 rounded-xl overflow-x-auto font-mono max-h-56">
                    {testingCode.scanners}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'gcp' && (
          <div className="space-y-6">
            <div className="bg-teal-50/50 border border-teal-100 rounded-xl p-4 text-sm text-teal-800">
              <h4 className="font-semibold flex items-center space-x-1.5 mb-1.5">
                <Cloud className="w-4 h-4 text-teal-600" />
                <span>Google Cloud Platform Architecture & Deployments</span>
              </h4>
              <p>For high scalability and security, we leverage serverless deployment using Google Cloud Run for the FastAPI and Vite images. Private secrets are hosted on Google Secret Manager and injected at runtime, protecting the Gemini key.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-2">Deployment Commands (Cloud Build & Cloud Run)</h4>
                <pre className="bg-slate-900 text-slate-200 text-xs p-4 rounded-xl overflow-x-auto font-mono h-[350px]">
                  {gcpDeployment.commands}
                </pre>
              </div>

              <div className="space-y-4">
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                  <h4 className="text-sm font-semibold text-slate-800 flex items-center space-x-1.5 mb-2">
                    <Server className="w-4 h-4 text-teal-600" />
                    <span>GCP Serverless Architecture</span>
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-600">
                    <li className="flex items-start space-x-2">
                      <span className="bg-teal-100 text-teal-800 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold mt-0.5">1</span>
                      <span><strong>Cloud Run:</strong> Hosts containerized frontend & backend. Fully managed, autoscales to zero to optimize costs.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="bg-teal-100 text-teal-800 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold mt-0.5">2</span>
                      <span><strong>Cloud SQL (PostgreSQL):</strong> Fully-managed primary DB with automatic backups, replication, and high-availability setups.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="bg-teal-100 text-teal-800 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold mt-0.5">3</span>
                      <span><strong>Secret Manager:</strong> Safeguards Gemini and Database credential tokens, preventing hardcoded configuration leaks.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="bg-teal-100 text-teal-800 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold mt-0.5">4</span>
                      <span><strong>Cloud Build:</strong> Directly compiles the Docker container and pushes to Artifact Registry via secure Git hooks.</span>
                    </li>
                  </ul>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-white">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Terraform Infrastructure Blueprint</h4>
                  <pre className="bg-slate-900 text-slate-200 text-xs p-3 rounded-lg overflow-x-auto font-mono max-h-40">
                    {gcpDeployment.tf}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'scale' && (
          <div className="space-y-6">
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-5 text-emerald-900">
              <h3 className="font-bold text-base flex items-center space-x-2 mb-2">
                <Layers className="w-5.5 h-5.5 text-emerald-600" />
                <span>Extending the Architecture to 10+ Clinics (SaaS Multi-Tenancy)</span>
              </h3>
              <p className="text-sm">Running this system for 10 separate clinics requires transitioning to a highly efficient and compliant Multi-Tenant SaaS layout. We present the standard three approaches for scaling.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border border-slate-200 rounded-xl p-4 bg-white hover:border-teal-500 transition-colors duration-150">
                <h4 className="font-semibold text-slate-800 text-sm mb-1.5">1. Database-per-Tenant</h4>
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">Each clinic gets its own isolated Cloud SQL database. Perfect for data isolation compliance.</p>
                <div className="bg-slate-50 p-2.5 rounded-lg text-[10px] text-slate-600 font-mono">
                  Clinic_A_DB (postgres)<br />
                  Clinic_B_DB (postgres)<br />
                  Clinic_C_DB (postgres)
                </div>
                <div className="mt-3 text-[11px] text-teal-700 font-semibold bg-teal-50 p-1.5 rounded text-center">Highest Compliance Isolation</div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-white hover:border-teal-500 transition-colors duration-150">
                <h4 className="font-semibold text-slate-800 text-sm mb-1.5">2. Shared DB, Schema Isolation</h4>
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">One database instance, but each clinic gets a custom schema namespace in PostgreSQL.</p>
                <div className="bg-slate-50 p-2.5 rounded-lg text-[10px] text-slate-600 font-mono">
                  CREATE SCHEMA clinic_1;<br />
                  CREATE SCHEMA clinic_2;<br />
                  SET search_path TO clinic_1;
                </div>
                <div className="mt-3 text-[11px] text-sky-700 font-semibold bg-sky-50 p-1.5 rounded text-center">Balanced Cost / Separation</div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-white hover:border-teal-500 transition-colors duration-150">
                <h4 className="font-semibold text-slate-800 text-sm mb-1.5">3. Shared DB, Shared Table</h4>
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">All clinic records are kept in identical tables separated by a mandatory indexed tenant_id foreign key.</p>
                <div className="bg-slate-50 p-2.5 rounded-lg text-[10px] text-slate-600 font-mono">
                  SELECT * FROM appointments<br />
                  WHERE clinic_id = 'clinic-abc'<br />
                  AND date = '2026-07-20';
                </div>
                <div className="mt-3 text-[11px] text-emerald-700 font-semibold bg-emerald-50 p-1.5 rounded text-center">Easiest to Deploy & Query</div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center space-x-1.5">
                <Server className="w-4 h-4 text-slate-600" />
                <span>Production Tenant Router & Domain Strategy (NextJS/FastAPI Middleware)</span>
              </h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs text-slate-600">
                <div className="space-y-3">
                  <p><strong>Tenant Domain Mapping:</strong> Each clinic registers its custom domain (e.g., <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">seattle.petclinic.com</code> or <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">bostonvet.com</code>). The DNS records route to an ingress GCLB (Google Cloud Load Balancer) which extracts the origin host headers.</p>
                  <p><strong>FastAPI Tenant Middleware:</strong> A global python middleware extracts the client host domain, queries a lightweight shared Redis cache to retrieve the database credentials or schema namespace mapped to that clinic, and sets up a dynamic SQLAlchemy DB context session for the lifespan of that specific HTTP request!</p>
                </div>
                <div className="bg-slate-900 text-slate-300 font-mono p-4 rounded-xl max-h-[160px] overflow-y-auto">
                  <p className="text-emerald-400 font-bold"># Python Tenant Middleware Context Sample</p>
                  <p>class TenantMiddleware(BaseHTTPMiddleware):</p>
                  <p>&nbsp;&nbsp;async def dispatch(self, request, call_next):</p>
                  <p>&nbsp;&nbsp;&nbsp;&nbsp;host = request.headers.get("host")</p>
                  <p>&nbsp;&nbsp;&nbsp;&nbsp;tenant_id = await get_tenant_from_domain(host)</p>
                  <p>&nbsp;&nbsp;&nbsp;&nbsp;request.state.tenant_id = tenant_id</p>
                  <p>&nbsp;&nbsp;&nbsp;&nbsp;response = await call_next(request)</p>
                  <p>&nbsp;&nbsp;&nbsp;&nbsp;return response</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
