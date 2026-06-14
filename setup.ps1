# FiscalAI — Setup PowerShell
# Corre com: .\setup.ps1

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           FiscalAI — Setup               ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verificar Docker
try {
    $null = docker --version
    Write-Host "✅ Docker encontrado." -ForegroundColor Green
} catch {
    Write-Host "❌ Docker não encontrado. Instala em https://docker.com" -ForegroundColor Red
    exit 1
}

# Verificar Docker Compose
$composeCmd = $null
try { $null = docker compose version; $composeCmd = "docker compose" } catch {}
if (-not $composeCmd) {
    try { $null = docker-compose --version; $composeCmd = "docker-compose" } catch {}
}
if (-not $composeCmd) {
    Write-Host "❌ Docker Compose não encontrado." -ForegroundColor Red
    exit 1
}

# Criar .env
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Ficheiro .env criado." -ForegroundColor Yellow
    Write-Host ""
    $apiKey = Read-Host "Cola a tua ANTHROPIC_API_KEY (ou Enter para configurar depois)"
    if ($apiKey) {
        (Get-Content ".env") -replace "sk-ant-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX", $apiKey | Set-Content ".env"
        Write-Host "API key guardada." -ForegroundColor Green
    } else {
        Write-Host "API key não configurada. Edita .env antes de gerar relatórios." -ForegroundColor Yellow
    }
} else {
    Write-Host "Ficheiro .env já existe." -ForegroundColor Green
}

Write-Host ""
Write-Host "A iniciar os containers (pode demorar na primeira vez)…" -ForegroundColor Cyan
Write-Host ""

if ($composeCmd -eq "docker compose") {
    docker compose up --build -d
} else {
    docker-compose up --build -d
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ FiscalAI está a correr!              ║" -ForegroundColor Green
Write-Host "║                                          ║" -ForegroundColor Green
Write-Host "║  🌐 App:      http://localhost:3000      ║" -ForegroundColor Green
Write-Host "║  🔧 API:      http://localhost:3001      ║" -ForegroundColor Green
Write-Host "║                                          ║" -ForegroundColor Green
Write-Host "║  Login: admin / admin                    ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
