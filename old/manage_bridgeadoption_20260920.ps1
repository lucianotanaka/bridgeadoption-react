<#
.SYNOPSIS
    Script de orquestracao para inicializar o Bridge Adoption.
.DESCRIPTION
    Gerencia Docker, banco de dados, variaveis de ambiente e inicia API e Frontend.
.EXAMPLE
    .\manage_bridgeadoption.ps1 start
#>

param (
    [Parameter(Mandatory=$false)]
    [ValidateSet('start', 'stop', 'restart', 'status')]
    [string]$Action = 'start'
)

$ProjectRoot = $PSScriptRoot
$ApiDir = Join-Path $ProjectRoot "backend"
$FrontendDir = Join-Path $ProjectRoot "frontend"
$BackendPort = 8001
$FrontendPort = 3000

function Start-DockerEngine {
    $dockerProcess = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
    if (-not $dockerProcess) {
        Write-Host "[BRIDGE ADOPTION] Iniciando o Docker Desktop..." -ForegroundColor Yellow
        Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        
        $timeout = 60
        $elapsed = 0
        while (-not (docker info 2>$null) -and ($elapsed -lt $timeout)) {
            Start-Sleep -Seconds 2
            $elapsed += 2
            Write-Host "[BRIDGE ADOPTION] Aguardando engine do Docker... ($elapsed s)" -ForegroundColor Gray
        }
    }
    Write-Host "[BRIDGE ADOPTION] Docker está operacional." -ForegroundColor Green
}

function Start-BridgeAdoption {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "   INICIALIZANDO BRIDGE ADOPTION       " -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan

    # 1. Garante Docker rodando
    Start-DockerEngine

    # 2. Sobe os containers de infraestrutura (Banco de Dados / Cache)
    if (Test-Path "$ProjectRoot\docker-compose.yml") {
        Write-Host "[1/4] Subindo infraestrutura via Docker Compose..." -ForegroundColor Yellow
        docker compose -f "$ProjectRoot\docker-compose.yml" up -d
    }

    # 3. Configuracao de Variaveis de Ambiente (.env)
    Write-Host "[2/4] Verificando arquivo de ambiente (.env)..." -ForegroundColor Yellow
    $envPath = Join-Path $FrontendDir ".env"
    if (-not (Test-Path $envPath)) {
        "VITE_API_URL=http://localhost:$BackendPort/api" | Out-File -FilePath $envPath -Encoding utf8
        Write-Host "Arquivo .env criado no Frontend com VITE_API_URL." -ForegroundColor Green
    }

    # 4. Inicia a API (Backend) em uma nova janela
    Write-Host "[3/4] Iniciando Backend (API)..." -ForegroundColor Yellow
    $backendCommand = @"
Set-Location '$ApiDir'
`$env:PYTHONPATH = '$ProjectRoot'
Write-Host '--- API BRIDGE ADOPTION ---' -ForegroundColor Cyan
if (Test-Path '.venv\Scripts\python.exe') {
    & '.venv\Scripts\python.exe' -m uvicorn app.main:app --reload --port $BackendPort
}
elseif (Test-Path 'venv\Scripts\python.exe') {
    & 'venv\Scripts\python.exe' -m uvicorn app.main:app --reload --port $BackendPort
}
else {
    python -m uvicorn app.main:app --reload --port $BackendPort
}
"@
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCommand

    # 5. Inicia o Frontend (Vite/React) em uma nova janela
    Write-Host "[4/4] Iniciando Frontend (UI)..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$FrontendDir'; Write-Host '--- FRONTEND BRIDGE ADOPTION ---' -ForegroundColor Green; npm run dev"

    Write-Host "----------------------------------------" -ForegroundColor Cyan
    Write-Host "Bridge Adoption iniciado." -ForegroundColor Green
    Write-Host "Frontend: http://localhost:$FrontendPort/bridgeadoption/login" -ForegroundColor White
    Write-Host "API Health: http://localhost:$BackendPort/api/health" -ForegroundColor White
    Write-Host "API Docs: http://localhost:$BackendPort/api/docs" -ForegroundColor White
    Write-Host "----------------------------------------" -ForegroundColor Cyan
}

function Stop-BridgeAdoption {
    Write-Host "[BRIDGE ADOPTION] Encerrando servicos..." -ForegroundColor Red
    if (Test-Path "$ProjectRoot\docker-compose.yml") {
        docker compose -f "$ProjectRoot\docker-compose.yml" down
    }
    Get-Process -Name "node", "python" -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "[BRIDGE ADOPTION] Servicos finalizados." -ForegroundColor Green
}

# Execução baseada na ação passada
switch ($Action) {
    'start'   { Start-BridgeAdoption }
    'stop'    { Stop-BridgeAdoption }
    'restart' { Stop-BridgeAdoption; Start-Sleep -Seconds 2; Start-BridgeAdoption }
    'status'  { docker ps }
}
