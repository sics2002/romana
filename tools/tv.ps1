param([ValidateSet('info','install','launch','inspect','pair')][string]$Action='info',[string]$Device='cinemana-lg-c4')
$ErrorActionPreference='Stop'
$project=Split-Path $PSScriptRoot -Parent
$previousAppData=$env:APPDATA
try {
  $env:APPDATA=Join-Path $env:LOCALAPPDATA 'CinemanaTV\webos-cli'
  $cli=Join-Path $project 'node_modules\.bin'
  $metadata=Get-Content -LiteralPath (Join-Path $project 'static\appinfo.json') -Raw | ConvertFrom-Json
  switch($Action){
    'info' { & (Join-Path $cli 'ares-device.cmd') -d $Device --system-info }
    'install' { $ipk=Join-Path $project ('dist\'+$metadata.id+'_'+$metadata.version+'_all.ipk');if(-not(Test-Path -LiteralPath $ipk)){throw 'Build the package first: npm.cmd run package'};& (Join-Path $cli 'ares-install.cmd') -d $Device $ipk }
    'launch' { & (Join-Path $cli 'ares-launch.cmd') -d $Device $metadata.id }
    'inspect' { & (Join-Path $cli 'ares-inspect.cmd') -d $Device --app $metadata.id }
    'pair' { & (Join-Path $cli 'ares-novacom.cmd') -d $Device --getkey }
  }
  if($LASTEXITCODE -ne 0){throw "LG CLI failed ($LASTEXITCODE)"}
} finally { $env:APPDATA=$previousAppData }
