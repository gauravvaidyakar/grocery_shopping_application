$ErrorActionPreference = "Stop"

$repositoryRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$customerDirectory = Join-Path $repositoryRoot "apps\customer-web"
$viteCommand = Join-Path $repositoryRoot "node_modules\.bin\vite.cmd"
$customerUrl = "http://localhost:5173/"

$listener = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue |
  Select-Object -First 1

if ($listener) {
  try {
    $response = Invoke-WebRequest -Uri $customerUrl -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200 -and $response.Content -match "Vishwaneed") {
      Write-Host "Vishwaneed customer web is already running on $customerUrl"
      exit 0
    }
  }
  catch {
    # A listener exists, but it is not a healthy Vishwaneed customer app.
  }

  $process = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
  $processName = if ($process) { $process.ProcessName } else { "unknown" }
  throw "Port 5173 is occupied by process $processName (PID $($listener.OwningProcess)), but the Vishwaneed customer app is not responding."
}

if (-not (Test-Path -LiteralPath $viteCommand)) {
  throw "Vite is not installed. Run npm install from $repositoryRoot first."
}

Push-Location $customerDirectory
try {
  & $viteCommand "--host" "localhost" "--port" "5173" "--strictPort"
  exit $LASTEXITCODE
}
finally {
  Pop-Location
}
