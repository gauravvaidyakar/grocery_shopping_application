$ErrorActionPreference = "Stop"

$repositoryRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$postgresRoot = Join-Path $repositoryRoot "tmp\postgresql18"
$dataDirectory = Join-Path $repositoryRoot "tmp\postgresql18-data"
$pgCtl = Join-Path $postgresRoot "bin\pg_ctl.exe"
$pgIsReady = Join-Path $postgresRoot "bin\pg_isready.exe"
$logFile = Join-Path $repositoryRoot "tmp\postgresql18.log"

if (-not (Test-Path -LiteralPath $pgCtl) -or -not (Test-Path -LiteralPath $dataDirectory)) {
  throw "The bundled local PostgreSQL installation or data directory is missing."
}

& $pgCtl status -D $dataDirectory *> $null
if ($LASTEXITCODE -ne 0) {
  & $pgCtl start -D $dataDirectory -l $logFile
  if ($LASTEXITCODE -ne 0) {
    throw "PostgreSQL could not be started. Check $logFile"
  }
}

& $pgIsReady -h localhost -p 5432 -d vishwaneed -U vishwaneed
if ($LASTEXITCODE -ne 0) {
  throw "PostgreSQL started but the Vishwaneed database is not accepting connections."
}

Write-Host "Vishwaneed PostgreSQL is ready on localhost:5432."
