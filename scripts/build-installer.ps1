param([string]$OutputDirectory = (Join-Path $PSScriptRoot '../../windows'))
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$framework = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319'
$compiler = Join-Path $framework 'csc.exe'
if (!(Test-Path $compiler)) { throw '.NET Framework 4.x compiler is required (Windows 10/11).' }
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$references = @('System.dll','System.Core.dll','System.Net.Http.dll','System.Web.Extensions.dll','System.Xaml.dll','WPF\WindowsBase.dll','WPF\PresentationCore.dll','WPF\PresentationFramework.dll') | ForEach-Object { '/reference:' + (Join-Path $framework $_) }
& $compiler /nologo /target:winexe /platform:anycpu /optimize+ /codepage:65001 "/out:$(Join-Path $OutputDirectory 'Bou-Install.exe')" "/win32manifest:$projectRoot\installer\app.manifest" "/win32icon:$projectRoot\desktop\icon.ico" "/resource:$projectRoot\installer\Installer.xaml,Installer.xaml" $references "$projectRoot\installer\Installer.cs"
if ($LASTEXITCODE -ne 0) { throw 'Installer compilation failed.' }
Write-Output "Built $(Join-Path $OutputDirectory 'Bou-Install.exe')"
