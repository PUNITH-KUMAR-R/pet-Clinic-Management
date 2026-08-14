# VetCore AI Clinic Hub 🐾

A highly polished, full-stack Veterinary Practice Management Hub featuring:
- **Clinics Scheduling Manager** (Automated specialty doctor assignment, conflict validation, and double-booking checks)
- **Patients & Pet Passport Manager** (Comprehensive breed, weight, medical case history tracking)
- **Clinical Staff Roster** (Shift schedules, specialities, status management)
- **Secure Patient Medical Records Portal** (Secure email login to view diagnoses and immunization history)
- **AI Triage Co-Pilot** (Intelligent voice-responsive consultation, intake symptom triage, and scheduling helper)
- **DevOps Autoscale Console** (Interactive telemetry simulation)

---

## 🚀 Part 1: How to Share and Deploy the App

### 1. Quick Sharing via AI Studio
The easiest way to let others experience this app directly in their browser is through AI Studio's built-in share workflow:
- Click the **Share** button in the top right corner of the AI Studio workspace.
- This creates an interactive preview link that anyone can open to view, test, and interact with the application.

### 2. Standard Cloud Deployment (Cloud Run / Vercel)
If you want to host this application permanently on your own cloud:
1. **GitHub Sync**: Push your code repository directly to GitHub using the **GitHub Export** menu under **Settings** in AI Studio.
2. **Deploy to Cloud Run / Vercel / Render**:
   - Create a service on your hosting platform and connect it to your GitHub repository.
   - Configure the environment variable: `GEMINI_API_KEY` in the hosting console secrets.
   - The container build script will automatically execute `npm run build` and run `npm start` (listening on port 3000).

---

## 💻 Part 2: Downloading and Running Locally

To run this application on your local machine, you must first export the source code.

### 1. Download the Code
- In Google AI Studio, open the **Settings** menu (gear icon in the top/bottom left sidebar) or clicking the Export options.
- Select **Export ZIP** to download a compressed folder containing all files, or connect your **GitHub account** to push the workspace directly to a new repository.
- Extract the ZIP folder on your local computer and open your terminal inside the directory.

### 2. Environment Configuration
Before launching the server, copy `.env.example` to a new file named `.env` and fill in your custom **Gemini API Key**:

```bash
# Copy env example
cp .env.example .env
```

Open the newly created `.env` file and replace the placeholder with your actual key from [Google AI Studio](https://aistudio.google.com/):
```env
GEMINI_API_KEY="your_gemini_api_key_here"
APP_URL="http://localhost:3000"
```

---

## 🛠️ Method A: Run Locally (Node.js and npm)

### Prerequisites
- [Node.js](https://nodejs.org/) (Version 18 or 20+ recommended)
- [npm](https://www.npmjs.com/) (bundled with Node.js)

### Step 1: Install Dependencies
Run the package installation script to download libraries (such as React, Express, Lucide, Tailwind, and Gemini SDK):
```bash
npm install
```

### Step 2: Start the Development Server
Launch the full-stack development environment:
```bash
npm run dev
```
The server will boot up instantly on **`http://localhost:3000`**. You can open this address in any browser. It live-reloads as you make changes to files!

### Step 3: Run the Production Build (Optional)
To test how the app runs in optimized production mode:
```bash
# Build & bundle React assets and transpile server.ts
npm run build

# Start the optimized server
npm run start
```

---

## 🐳 Method B: Run Locally with Docker

If you prefer running apps in an isolated environment without installing Node.js directly on your host machine, you can package the app as a lightweight Alpine Docker image.

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### Step 1: Build the Docker Image
In your project root folder (where the `Dockerfile` resides), run:
```bash
docker build -t vetcore-ai-clinic .
```

### Step 2: Run the Docker Container
Launch the container, linking port 3000 and passing your `.env` configuration file:
```bash
docker run -p 3000:3000 --env-file .env vetcore-ai-clinic
```
Now, navigate to **`http://localhost:3000`** in your browser!

---

## 📦 Method C: Run Locally with Docker Compose

Using Docker Compose is the most streamlined way to run the application with a single command. It automatically handles building the image, reading environment files, and mounting ports.

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (which includes Docker Compose).

### Step 1: Launch the Application
In your project root, simply run:
```bash
docker-compose up --build
```
*Note: The `--build` flag ensures any recent code changes are rebuilt into the container.*

### Step 2: Access the Application
Open your browser and visit **`http://localhost:3000`**.

### Step 3: Stop the Application
To stop the services gracefully, press `Ctrl + C` in the terminal, or run:
```bash
docker-compose down
```

---

## 🔒 Part 3: Security, QA & Testing in VS Code

This section explains how to run **Unit Tests**, **Secrets Leak Detection**, **Vulnerability Scans**, and **SAST (Static Code Security Testing)** directly in **VS Code** for this application.

---

### 1. 🧪 Unit Tests (Running & Debugging in VS Code)

#### **CLI Approach (Vitest / Jest)**
1. **Install Vitest** (recommended for Vite projects):
   ```bash
   npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
   ```
2. **Add a test script** to `package.json`:
   ```json
   "scripts": {
     "test": "vitest run",
     "test:watch": "vitest"
   }
   ```
3. **Execute tests in terminal**:
   ```bash
   npm run test
   ```

#### **VS Code Integration**
- **Extension**: Install **[Vitest Runner](https://marketplace.visualstudio.com/items?itemName=vitest.explorer)** or **[Jest](https://marketplace.visualstudio.com/items?itemName=Orta.vscode-jest)** from the VS Code Extensions panel (`Ctrl+Shift+X` or `Cmd+Shift+X`).
- **Test Explorer**: Click the **Testing (Beaker Icon)** in the VS Code sidebar to run, re-trigger, or debug individual test suites visually with interactive inline pass/fail indicators.

---

### 2. 🔑 Secrets Leak Detection (Preventing API Key / Token Exposure)

#### **A. VS Code Extensions (Real-Time Protection)**
- **[Gitleaks Extension](https://marketplace.visualstudio.com/items?itemName=zricethezav.gitleaks)** or **[Secret Scanner](https://marketplace.visualstudio.com/items?itemName=moli.secret-scanner)**:
  - Scans files in real time while typing in VS Code.
  - Highlights hardcoded API keys, JWTs, or private keys before you commit code.

#### **B. CLI Scans (Gitleaks / TruffleHog)**
To run `gitleaks` in your terminal on Windows, `gitleaks` must first be installed. Choose one of the following methods:

**Option 1: Windows Package Manager (winget / scoop / choco)**
```powershell
# Using Winget (Built-in on Windows 10/11)
winget install gitleaks

# Or using Scoop
scoop install gitleaks

# Or using Chocolatey
choco install gitleaks
```

**Option 2: Using Docker (No local binary install needed)**
```powershell
docker run -v ${PWD}:/path zricethezav/gitleaks:latest detect --source="/path" -v
```

**Option 3: Run Gitleaks directly after installing**
```powershell
gitleaks detect --source . --verbose
```

#### **C. Pre-commit Hooks (Git Hook Automation)**
Add pre-commit protection using `husky`:
```bash
npm install -D husky
npx husky init
echo "npx gitleaks detect --source . --no-git" > .husky/pre-commit
```

---

### 3. 🛡️ Vulnerability Scanning (Dependency & Image Audits)

#### **A. Package Audit (npm audit)**
Check third-party dependencies for known CVE vulnerabilities:
```bash
# Scan dependencies
npm audit

# Automatically fix minor safe patches
npm audit fix
```

#### **B. Snyk Security (VS Code Integration)**
1. Install the **[Snyk Security](https://marketplace.visualstudio.com/items?itemName=snyk-security.snyk-vulnerability-scanner)** extension in VS Code.
2. Sign in to Snyk. It automatically scans `package.json` for known vulnerabilities and displays actionable remediation guidance in VS Code's sidebar.

#### **C. Container & Docker Vulnerability Scanning**
If using Docker, scan your container image with **Trivy** or **Docker Scout**:
```bash
# Docker Scout scan
docker scout cve vetcore-ai-clinic

# Trivy scan
trivy image vetcore-ai-clinic
```

---

### 4. 🔍 SAST Scan (Static Application Security Testing)

#### **A. ESLint & TypeScript Type Checking**
Catch code smells, invalid types, and unsafe patterns:
```bash
# Type check using TypeScript compiler
npm run lint
```
In VS Code, install the **[ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)** extension to see inline red/yellow squiggles for code quality issues.

#### **B. SonarLint (In-IDE SAST Scanning)**
1. Install **[SonarLint](https://marketplace.visualstudio.com/items?itemName=SonarSource.sonarlint-vscode)** extension in VS Code.
2. SonarLint scans code in real-time as you write TypeScript/JavaScript, flagging potential security flaws (e.g. unhandled promises, XSS vulnerabilities, hardcoded secrets, injection vectors).

#### **C. GitHub CodeQL (CI/CD Automated SAST)**
For GitHub repositories:
- Enable **Code Security & Analysis -> CodeQL Analysis** in GitHub repository settings.
- GitHub automatically scans every Pull Request and commit for SAST security vulnerabilities.

---

## 🧪 Quick Test Data for Local Testing
Once the app is running locally, you can use these records to log in and test clinical interactions:
1. **Patient Portal Registered Emails**:
   - `john.doe@gmail.com` (Owner of **Buddy** - Golden Retriever)
   - `alice.smith@yahoo.com` (Owner of **Bella** - Persian Cat)
2. **AI Co-Pilot Prompts**:
   - *"Tell me Dr. Thorne's specialties"*
   - *"Is Buddy's rabies vaccination due?"*
   - *"Help me schedule a suture check for Bella next Tuesday"*
