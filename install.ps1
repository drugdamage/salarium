# Installs (or updates) the latest Salarium release on Windows and starts it.
#   irm https://raw.githubusercontent.com/drugdamage/salarium/main/install.ps1 | iex
# Your Supabase settings are kept between updates.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$repo = 'drugdamage/salarium'
$dest = Join-Path $env:LOCALAPPDATA 'Programs\Salarium'

function Say($msg) { Write-Host ':: ' -ForegroundColor Blue -NoNewline; Write-Host $msg }

Say 'Looking up the latest release'
$release = Invoke-RestMethod "https://api.github.com/repos/$repo/releases/latest" -Headers @{ 'User-Agent' = 'salarium-install' }
$asset = $release.assets | Where-Object { $_.name -like '*-win-x64.zip' } | Select-Object -First 1
if (-not $asset) { throw 'No Windows build found in the latest release' }

$tmp = Join-Path ([IO.Path]::GetTempPath()) ('salarium-' + [guid]::NewGuid())
New-Item -ItemType Directory $tmp | Out-Null
try {
  Say "Downloading $($asset.name)"
  $zip = Join-Path $tmp 'salarium.zip'
  Invoke-WebRequest $asset.browser_download_url -OutFile $zip -UseBasicParsing

  Get-Process Salarium -ErrorAction SilentlyContinue | Stop-Process -Force
  Start-Sleep -Milliseconds 800
  if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
  Expand-Archive $zip $dest -Force
  $exe = Join-Path $dest 'Salarium.exe'
  if (-not (Test-Path $exe)) { throw 'Salarium.exe not found in the download' }

  # Start menu and desktop shortcuts.
  $shell = New-Object -ComObject WScript.Shell
  foreach ($dir in @([Environment]::GetFolderPath('Programs'), [Environment]::GetFolderPath('Desktop'))) {
    $lnk = $shell.CreateShortcut((Join-Path $dir 'Salarium.lnk'))
    $lnk.TargetPath = $exe
    $lnk.WorkingDirectory = $dest
    $lnk.Save()
  }

  Say "Installed to $dest"
  Start-Process $exe
} finally {
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
