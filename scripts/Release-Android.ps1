param([switch]$ValidateOnly)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$required = @('IP_RASM_RELEASE_STORE_FILE','IP_RASM_RELEASE_STORE_PASSWORD','IP_RASM_RELEASE_KEY_ALIAS','IP_RASM_RELEASE_KEY_PASSWORD')
foreach ($name in $required) { if (-not [Environment]::GetEnvironmentVariable($name)) { throw "Owner release signing configuration is missing: $name" } }
$storePath = [IO.Path]::GetFullPath($env:IP_RASM_RELEASE_STORE_FILE)
if (-not (Test-Path -LiteralPath $storePath -PathType Leaf)) { throw 'Owner keystore file does not exist' }
if ($storePath.StartsWith($repoRoot + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Keep the owner keystore outside the repository' }
Push-Location -LiteralPath $repoRoot
try {
  $nativeConfigScript = @'
import {loadEnv} from 'vite';
import {resolveBackendUrl} from './src/backend-url.ts';
const env=loadEnv('production',process.cwd(),'VITE_');
const value=resolveBackendUrl(true,process.env.VITE_NATIVE_API_BASE||env.VITE_NATIVE_API_BASE);
if(!value||new URL(value).protocol!=='https:')throw Error('A public HTTPS VITE_NATIVE_API_BASE is required for release');
process.stdout.write(value);
'@
  $apiBase = $nativeConfigScript | & node --import tsx --input-type=module
  if ($LASTEXITCODE -ne 0) { throw 'Release API configuration validation failed' }
  $env:VITE_NATIVE_API_BASE = $apiBase
  $env:VITE_NATIVE_DEBUG_SETTINGS = '0'
  if ($ValidateOnly) { Write-Output 'Release configuration validated; no build or signing performed'; return }
  $releaseDir = Join-Path $repoRoot ('output/release-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
  if (Test-Path -LiteralPath $releaseDir) { throw 'Refusing to overwrite a release directory' }
  & node node_modules/typescript/bin/tsc -b
  if ($LASTEXITCODE -ne 0) { throw 'TypeScript validation failed' }
  & node node_modules/vite/bin/vite.js build --outDir $releaseDir
  if ($LASTEXITCODE -ne 0) { throw 'Release web build failed' }
  $env:IP_RASM_NATIVE_WEB_DIR = $releaseDir
  & node node_modules/@capacitor/cli/bin/capacitor sync android
  if ($LASTEXITCODE -ne 0) { throw 'Capacitor sync failed' }
  Push-Location -LiteralPath (Join-Path $repoRoot 'android')
  try { & .\gradlew.bat --offline assembleRelease; if ($LASTEXITCODE -ne 0) { throw 'Offline unsigned release assembly failed; prepare SDK/Gradle dependencies first' } } finally { Pop-Location }
  $sdk = if ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } elseif ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { throw 'Set ANDROID_SDK_ROOT' }
  $tools = Get-ChildItem -LiteralPath (Join-Path $sdk 'build-tools') -Directory | Where-Object { $_.Name -match '^\d+\.\d+\.\d+$' } | Sort-Object { [version]$_.Name } -Descending | Select-Object -First 1
  if (-not $tools) { throw 'Android build tools are missing' }
  $unsigned = Join-Path $repoRoot 'android/app/build/outputs/apk/release/app-release-unsigned.apk'
  $aligned = Join-Path $releaseDir 'aligned-unsigned.apk'
  $signed = Join-Path $releaseDir 'ip-rasm-release.apk'
  & (Join-Path $tools.FullName 'zipalign.exe') -p 4 $unsigned $aligned
  if ($LASTEXITCODE -ne 0) { throw 'APK alignment failed' }
  & (Join-Path $tools.FullName 'apksigner.bat') sign --ks $storePath --ks-key-alias $env:IP_RASM_RELEASE_KEY_ALIAS --ks-pass env:IP_RASM_RELEASE_STORE_PASSWORD --key-pass env:IP_RASM_RELEASE_KEY_PASSWORD --out $signed $aligned
  if ($LASTEXITCODE -ne 0) { throw 'Owner release signing failed' }
  $verification = & (Join-Path $tools.FullName 'apksigner.bat') verify --print-certs $signed
  if ($LASTEXITCODE -ne 0) { throw 'Signed APK verification failed' }
  if (($verification -join "\n") -match '8e43cfb55a120f18a62cf955d19a5ed40816f34a96c1416b27644b08de500c90') { throw 'Refusing a release signed with the development certificate' }
  $verification | Set-Content -LiteralPath (Join-Path $releaseDir 'public-signer.txt')
  Get-FileHash -LiteralPath $signed -Algorithm SHA256 | Select-Object Algorithm,Hash,Path
} finally { Pop-Location }
