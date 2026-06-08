param(
  [switch]$SkipMigration
)

$ErrorActionPreference = 'Stop'

$vercelCommand = if ($IsWindows -or $env:OS -eq 'Windows_NT') { 'vercel.cmd' } else { 'vercel' }
$vercel = Get-Command $vercelCommand -ErrorAction SilentlyContinue
if (-not $vercel) {
  throw 'Vercel CLI is required. Install it with: npm install -g vercel'
}

npm.cmd run env:validate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npm.cmd run test:coverage
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not $SkipMigration) {
  npm.cmd run db:migrate
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

& $vercel.Source deploy --prod
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
