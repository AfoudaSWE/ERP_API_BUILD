[CmdletBinding()]
param(
    [switch]$SkipDatabaseSetup,
    [switch]$RegeneratePrisma
)

$ErrorActionPreference = "Stop"
$agentRoot = Split-Path -Parent $PSScriptRoot
$workspaceRoot = (Resolve-Path (Join-Path $agentRoot "..\..\..")).Path
Set-Location $workspaceRoot

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example."
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker was not found. Install Docker Desktop and try again."
}

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw "npm was not found. Install Node.js 20 or newer and try again."
}

$apiHealthUrl = "http://localhost:3335/api/v1/health"
try {
    $health = Invoke-RestMethod -Uri $apiHealthUrl -TimeoutSec 3
    if ($health.status -eq "ok") {
        Write-Host "Camera API is already running at http://localhost:3335/api/v1"
        return
    }
} catch {
    # No healthy API is running, so continue with normal startup.
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
    $dockerDesktop = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"
    if (-not (Test-Path $dockerDesktop)) {
        throw "Docker Desktop is not running and could not be found at '$dockerDesktop'."
    }

    Write-Host "Starting Docker Desktop..."
    Start-Process -FilePath $dockerDesktop

    $ready = $false
    for ($attempt = 1; $attempt -le 60; $attempt++) {
        Start-Sleep -Seconds 2
        docker info *> $null
        if ($LASTEXITCODE -eq 0) {
            $ready = $true
            break
        }
    }

    if (-not $ready) {
        throw "Docker Desktop did not become ready within 120 seconds."
    }
}

Write-Host "Starting PostgreSQL..."
& docker compose up -d postgres
if ($LASTEXITCODE -ne 0) {
    throw "PostgreSQL failed to start."
}

if (-not $SkipDatabaseSetup) {
    $prismaEngine = Join-Path $workspaceRoot "node_modules\.prisma\client\query_engine-windows.dll.node"
    $prismaClient = Join-Path $workspaceRoot "node_modules\.prisma\client\default.js"
    if ($RegeneratePrisma -or -not (Test-Path $prismaEngine) -or -not (Test-Path $prismaClient)) {
        Write-Host "Generating the Prisma client..."
        & npx.cmd prisma generate --schema apps/services/vision-service/prisma/schema.prisma
        if ($LASTEXITCODE -ne 0) {
            throw "Prisma client generation failed. Stop any running Vision API process before regenerating on Windows."
        }
    } else {
        Write-Host "Using the existing Prisma client. Use -RegeneratePrisma after stopping the API to regenerate it."
    }

    Write-Host "Applying database migrations..."
    & npx.cmd prisma migrate deploy --schema apps/services/vision-service/prisma/schema.prisma
    if ($LASTEXITCODE -ne 0) { throw "Database migration failed." }

    Write-Host "Seeding demo data..."
    & npx.cmd nx run vision-service:seed
    if ($LASTEXITCODE -ne 0) { throw "Database seed failed." }
}

Write-Host "Starting the API at http://localhost:3335/api/v1"
Write-Host "Press Ctrl+C to stop the API. PostgreSQL will remain running."
& npx.cmd nx serve vision-service
