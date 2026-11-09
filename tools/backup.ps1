param([string]$Label = 'change')
$ErrorActionPreference = 'Stop'
$project = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$backupRoot = Join-Path (Split-Path $project -Parent) '.backups'
$destination = Join-Path $backupRoot ((Get-Date -Format 'yyyyMMdd-HHmmss-fff') + '-' + ($Label -replace '[^a-zA-Z0-9_-]', '_'))
New-Item -ItemType Directory -Path $destination -Force | Out-Null
Get-ChildItem -LiteralPath $project -Force | Where-Object { $_.Name -notin @('node_modules', '.git') } | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $destination -Recurse -Force }
[ordered]@{ source=$project; createdAt=(Get-Date -Format o); excludes=@('node_modules (reproducible from package-lock.json)', '.git'); label=$Label } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $destination 'snapshot.json') -Encoding utf8
Write-Output $destination
