param([string]$OutputDirectory = (Join-Path $PSScriptRoot '../../windows'))
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$version = (Get-Content "$projectRoot/package.json" -Raw | ConvertFrom-Json).version
if ($version -notmatch '^\d+\.\d+\.\d+$') { throw 'Expected stable semantic version.' }
$setupName = "Bou-Time-$version-x64-Setup.exe"
$portableName = "Bou-Time-$version-x64-Portable.exe"
foreach ($name in @('Temura-Install.exe', 'Bou-Install.exe', $setupName, $portableName, "$setupName.blockmap", 'latest.yml')) {
    if (!(Test-Path (Join-Path $OutputDirectory $name))) { throw "Build the missing asset first: $name" }
}
$setup = Get-Item (Join-Path $OutputDirectory $setupName)
$manifest = [ordered]@{
    schema = 1
    version = $version
    # Compatibility wire URL: released bootstrappers validate this exact old path.
    # GitHub redirects it to huxhkuh/tmora; new bootstrappers normalize it before download.
    # Keep this alias until old installers are retired; do not reuse the old repo name.
    url = "https://github.com/huxhkuh/bou-time/releases/download/v$version/$setupName"
    sha256 = (Get-FileHash $setup.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    size = $setup.Length
}
[IO.File]::WriteAllText((Join-Path $OutputDirectory 'windows-release.json'), ($manifest | ConvertTo-Json), [Text.UTF8Encoding]::new($false))
$channel = Get-Content (Join-Path $OutputDirectory 'latest.yml') -Raw
if ($channel -notmatch "(?m)^version: $([regex]::Escape($version))\s*$" -or !$channel.Contains($setupName)) { throw 'latest.yml does not match this release.' }
$sums = @('Temura-Install.exe', 'Bou-Install.exe', $setupName, $portableName, "$setupName.blockmap", 'latest.yml', 'windows-release.json') | ForEach-Object {
    $hash = (Get-FileHash (Join-Path $OutputDirectory $_) -Algorithm SHA256).Hash.ToLowerInvariant()
    "$hash  $_"
}
[IO.File]::WriteAllLines((Join-Path $OutputDirectory 'SHA256SUMS.txt'), $sums, [Text.UTF8Encoding]::new($false))
Write-Output "Prepared release v$version in $OutputDirectory"
