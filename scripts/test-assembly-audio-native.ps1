param([string]$JavaHome = $env:JAVA_HOME, [string]$GradleCache = $env:GRADLE_USER_HOME)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
if (-not $JavaHome) { $JavaHome = Join-Path $taskRoot 'tmp/toolchains/jdk-21.0.12.1+1' }
if (-not $GradleCache) { $GradleCache = Join-Path $taskRoot 'tmp/gradle-cache' }
$junitJar = Join-Path $GradleCache 'caches/modules-2/files-2.1/junit/junit/4.13.2/8ac9e16d933b6fb43bc7f576336b8f4d7eb5ba12/junit-4.13.2.jar'
$hamcrestJar = Join-Path $GradleCache 'caches/modules-2/files-2.1/org.hamcrest/hamcrest-core/1.3/42a25dc3219429f0e5d060061f71acb49bf010a0/hamcrest-core-1.3.jar'
foreach ($file in @($junitJar, $hamcrestJar, (Join-Path $JavaHome 'bin/javac.exe'), (Join-Path $JavaHome 'bin/java.exe'))) {
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw 'Required local JDK/JUnit cache is missing. Nothing was downloaded.' }
}
$runDir = Join-Path $taskRoot ('test-results/audio-native-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $runDir | Out-Null
$classPath = $junitJar + [IO.Path]::PathSeparator + $hamcrestJar
$source = Join-Path $taskRoot 'android/app/src/main/java/uz/iprasm/app/AudioRequestFence.java'
$tests = Join-Path $taskRoot 'android/app/src/test/java/uz/iprasm/app/AudioRequestFenceTest.java'
& (Join-Path $JavaHome 'bin/javac.exe') '-J-Xmx128m' '-encoding' 'UTF-8' '-cp' $classPath '-d' $runDir $source $tests
if ($LASTEXITCODE -ne 0) { throw 'Native audio guard compilation failed' }
$result = & (Join-Path $JavaHome 'bin/java.exe') '-Xmx128m' '-cp' ($runDir + [IO.Path]::PathSeparator + $classPath) 'org.junit.runner.JUnitCore' 'uz.iprasm.app.AudioRequestFenceTest' 2>&1
$testExit = $LASTEXITCODE
$result | Set-Content -LiteralPath (Join-Path $runDir 'junit.log') -Encoding utf8
if ($testExit -ne 0 -or -not (($result -join "`n") -match 'OK \(3 tests\)')) { throw 'Native audio guard JUnit test failed; inspect the local run log' }
@{ tests = 3; passed = 3; downloaded = $false; source = 'AudioRequestFence.java'; directory = $runDir } | ConvertTo-Json
