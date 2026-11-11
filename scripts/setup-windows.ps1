param([string]$PythonCommand='python')
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
 foreach($tool in @('node','npm','git','ffmpeg','ffprobe')) { if(-not (Get-Command $tool -ErrorAction SilentlyContinue)){throw "Missing $tool. Install it, then run setup again."} }
 & $PythonCommand -c "import sys; assert sys.version_info >= (3,10), 'Python >=3.10 required'"
 if($LASTEXITCODE -ne 0){throw 'Python check failed.'}
 if(-not (Test-Path '.venv\Scripts\python.exe')){& $PythonCommand -m venv .venv;if($LASTEXITCODE -ne 0){throw 'venv failed.'}}
 & '.\.venv\Scripts\python.exe' -m pip install -r engine/requirements.txt
 if($LASTEXITCODE -ne 0){throw 'Python dependency installation failed.'}
 & npm.cmd ci
 if($LASTEXITCODE -ne 0){throw 'Studio dependency installation failed.'}
 Push-Location engine/remotion-composer
 try { & npm.cmd ci; if($LASTEXITCODE -ne 0){throw 'Remotion dependency installation failed.'} } finally {Pop-Location}
 & node scripts/configure-local.mjs
 if($LASTEXITCODE -ne 0){throw 'Local configuration failed.'}
 if(-not (Get-Command codex -ErrorAction SilentlyContinue)){Write-Warning 'Codex CLI missing. Install @openai/codex and sign in to use agent-driven stages.'}
 Write-Host 'Setup complete. Run npm run dev.'
} finally { Pop-Location }
