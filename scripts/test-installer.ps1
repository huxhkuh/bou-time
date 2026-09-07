$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$framework = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319'
$target = Join-Path ([IO.Path]::GetTempPath()) ('BouInstallerTests-' + [guid]::NewGuid().ToString('N') + '.exe')
$references = @('System.dll','System.Core.dll','System.Net.Http.dll','System.Web.Extensions.dll','System.Xaml.dll','WPF\WindowsBase.dll','WPF\PresentationCore.dll','WPF\PresentationFramework.dll') | ForEach-Object { '/reference:' + (Join-Path $framework $_) }
try {
    & "$framework\csc.exe" /nologo /target:exe /main:InstallerTests /codepage:65001 "/out:$target" $references "$projectRoot\installer\Installer.cs" "$projectRoot\tests\InstallerTests.cs"
    if ($LASTEXITCODE -ne 0) { throw 'Tests failed to compile.' }
    & $target
    if ($LASTEXITCODE -ne 0) { throw 'Installer tests failed.' }
} finally { if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target } }
