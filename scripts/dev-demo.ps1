$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$demoNode = Join-Path $env:LOCALAPPDATA 'E-Sapiens\node-v24.21.0-win-x64'
if (Test-Path -LiteralPath (Join-Path $demoNode 'node.exe')) {
    $env:Path = $demoNode + ';' + $env:Path
}
if ((node --version) -notmatch '^v24\.') {
    throw 'Este proyecto requiere Node 24.15 o superior dentro de la versión 24.'
}
pnpm.cmd demo:start
