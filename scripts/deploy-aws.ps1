# ==============================================================================
# AWS ECR Deployment Script (PowerShell)
# ==============================================================================
param (
    [string]$AccountId = "104033131308",
    [string]$Region = "us-east-1",
    [string]$RepoName = "vetcore-ai-clinic"
)

# Prevent PowerShell from aborting on native stderr output
$ErrorActionPreference = "Continue"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " AWS ECR Automated Container Deployment " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "AWS Account ID: $AccountId" -ForegroundColor Yellow
Write-Host "AWS Region:     $Region" -ForegroundColor Yellow
Write-Host "Repository:     $RepoName" -ForegroundColor Yellow
Write-Host ""

# 1. Check if ECR repository exists, create if not
Write-Host "[1/4] Checking ECR repository '$RepoName'..." -ForegroundColor Cyan
$null = aws ecr describe-repositories --repository-names $RepoName --region $Region 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Creating ECR repository '$RepoName' in $Region..." -ForegroundColor Yellow
    $null = aws ecr create-repository --repository-name $RepoName --region $Region 2>$null
} else {
    Write-Host "Repository '$RepoName' already exists. Proceeding..." -ForegroundColor Green
}

# 2. Authenticate Docker with AWS ECR
Write-Host "[2/4] Authenticating Docker with ECR..." -ForegroundColor Cyan
$ecrUri = "$AccountId.dkr.ecr.$Region.amazonaws.com"
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $ecrUri
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to authenticate Docker with AWS ECR. Please check 'aws configure' or Docker Desktop." -ForegroundColor Red
    exit 1
}

# 3. Build Docker container image
Write-Host "[3/4] Building production Docker image..." -ForegroundColor Cyan
docker build -t "$RepoName`:latest" .
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker build failed. Please ensure Docker Desktop is running." -ForegroundColor Red
    exit 1
}

# Tag image for AWS ECR
$targetImage = "$ecrUri/$RepoName`:latest"
docker tag "$RepoName`:latest" $targetImage

# 4. Push to ECR
Write-Host "[4/4] Pushing image to AWS ECR ($targetImage)..." -ForegroundColor Cyan
docker push $targetImage
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker push failed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " SUCCESS: Image deployed to AWS ECR!" -ForegroundColor Green
Write-Host " Image URI: $targetImage" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "You can now use this URI in your ECS Task Definition." -ForegroundColor Yellow

