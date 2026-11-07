# ==============================================================================
# Script: build_android_apk.ps1
# Description: Tự động hóa quá trình biên dịch và xuất bản APK Android cho Ruo Mobile
# Chuyển hướng Gradle Cache và Build Output sang ổ D: (11.75 GB trống) để tránh tràn ổ đĩa C:
# Dự án: Ruo - Quản Lý Cơ Sở Vật Chất Đại Học
# ==============================================================================

param(
    [switch]$DebugOnly,
    [switch]$ReleaseSplitOnly
)

$ErrorActionPreference = 'Continue'
$MobileDir = "C:\Users\Dang\Documents\wdp\Ruo\mobile"
$GradleCacheDir = "D:\.gradle"
$TempDir = "D:\temp"
$BuildTargetDir = "D:\ruo_mobile_build"
$DistDir = "C:\Users\Dang\Documents\wdp\Ruo\apk_dist"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "     RUO CAMPUS - BIÊN DỊCH VÀ XUẤT BẢN ANDROID APK       " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Chuẩn bị bộ đệm và Junction trên ổ D:
Write-Host "`n[1/4] Thiết lập bộ đệm Gradle và Build Junction trên ổ D:..." -ForegroundColor Yellow
if (-not (Test-Path $GradleCacheDir)) {
    New-Item -ItemType Directory -Path $GradleCacheDir -Force | Out-Null
}
if (-not (Test-Path $TempDir)) {
    New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
}
if (-not (Test-Path $BuildTargetDir)) {
    New-Item -ItemType Directory -Path $BuildTargetDir -Force | Out-Null
}
if (-not (Test-Path $DistDir)) {
    New-Item -ItemType Directory -Path $DistDir -Force | Out-Null
}

$buildPath = Join-Path $MobileDir "build"
if (-not (Test-Path $buildPath)) {
    cmd /c mklink /J "$buildPath" "$BuildTargetDir" | Out-Null
}

$env:GRADLE_USER_HOME = $GradleCacheDir
$env:JAVA_TOOL_OPTIONS = "-Djava.io.tmpdir=$TempDir"
Write-Host "  -> GRADLE_USER_HOME = $env:GRADLE_USER_HOME" -ForegroundColor Green
Write-Host "  -> JAVA_TOOL_OPTIONS = $env:JAVA_TOOL_OPTIONS" -ForegroundColor Green
Write-Host "  -> Build Output Link = $buildPath -> $BuildTargetDir" -ForegroundColor Green

# 2. Kiểm tra Flutter & Java SDK
Write-Host "`n[2/4] Kiểm tra môi trường Flutter và Java 17..." -ForegroundColor Yellow
Set-Location $MobileDir
flutter --version | Select-Object -First 1
Write-Host "  -> Java: C:\Program Files\Java\jdk-17 (Java 17 LTS)" -ForegroundColor Green

# 3. Biên dịch APK theo chế độ yêu cầu
Write-Host "`n[3/4] Bắt đầu quá trình biên dịch APK..." -ForegroundColor Yellow

if (-not $ReleaseSplitOnly) {
    Write-Host "`n>>> [A] Biên dịch Universal Debug APK (flutter build apk --debug)..." -ForegroundColor Cyan
    flutter build apk --debug
    if ($LASTEXITCODE -ne 0) {
        Write-Host "LỖI: Biên dịch Debug APK thất bại!" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

if (-not $DebugOnly) {
    Write-Host "`n>>> [B] Biên dịch Release Split-per-ABI APK (flutter build apk --release --split-per-abi)..." -ForegroundColor Cyan
    flutter build apk --release --split-per-abi
    if ($LASTEXITCODE -ne 0) {
        Write-Host "LỖI: Biên dịch Release Split APK thất bại!" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

# 4. Sao chép và tổng kết danh mục tệp APK
Write-Host "`n[4/4] TỔNG HỢP DANH MỤC TỆP APK ĐÃ XUẤT BẢN THÀNH CÔNG:" -ForegroundColor Green
$apkDir = Join-Path $MobileDir "build\app\outputs\flutter-apk"
$apks = Get-ChildItem -Path $apkDir -Filter "*.apk" -File | Sort-Object Length -Descending

foreach ($apk in $apks) {
    Copy-Item $apk.FullName (Join-Path $DistDir $apk.Name) -Force
    $sizeMB = [math]::Round($apk.Length / 1MB, 2)
    Write-Host "  * $($apk.Name.PadRight(35)) : $sizeMB MB" -ForegroundColor White
    Write-Host "    Đường dẫn phân phối: $DistDir\$($apk.Name)" -ForegroundColor Gray
}

Write-Host "`n----------------------------------------------------------" -ForegroundColor Cyan
Write-Host "HƯỚNG DẪN CÀI ĐẶT LÊN ĐIỆN THOẠI QUA ADB:" -ForegroundColor White
Write-Host "  # Cài đặt bản ARM64 tối ưu (Hầu hết điện thoại Android hiện nay):" -ForegroundColor Gray
Write-Host "  C:\platform-tools\adb.exe install -r `"$DistDir\app-arm64-v8a-release.apk`"" -ForegroundColor Yellow
Write-Host "  # Hoặc cài đặt bản Universal Debug:" -ForegroundColor Gray
Write-Host "  C:\platform-tools\adb.exe install -r `"$DistDir\app-debug.apk`"" -ForegroundColor Yellow
Write-Host "----------------------------------------------------------`n" -ForegroundColor Cyan
