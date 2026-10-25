param([switch]$ValidateOnly)
$ErrorActionPreference = 'Stop'
# Keep HTTPS, external owner-keystore, debug-UI and signing checks in one place.
# This entry point never creates a key or publishes an APK.
& (Join-Path $PSScriptRoot 'Release-Android.ps1') -ValidateOnly:$ValidateOnly
if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw 'Release preparation failed' }
