# ==============================================================================
# Script: connect_adb_reverse.ps1
# Description: Tu dong dao chieu cong (Reverse Port Forwarding) qua ADB cho Ruo Mobile
# Du an: Ruo - Quan Ly Co So Vat Chat Dai Hoc
# ==============================================================================

$AdbExe = "C:\platform-tools\adb.exe"
if (-not (Test-Path $AdbExe)) {
    $AdbExe = "adb.exe"
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  RUO CAMPUS - THIET LAP KET NOI ADB REVERSE PROXY (USB)  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Kiem tra trang thai Express Backend
Write-Host "`n[1/3] Kiem tra Express Backend tren cong 5000..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get -TimeoutSec 3 -ErrorAction Stop
    Write-Host "  -> Express Backend dang chay TOT: Status=$($health.status), Version=$($health.version)" -ForegroundColor Green
} catch {
    Write-Host "  -> CANH BAO: Khong the ket noi toi http://localhost:5000/api/health." -ForegroundColor Red
    Write-Host "     Hay dam bao Express server dang chay: 'cd server; node src/server.js'" -ForegroundColor Yellow
}

# 2. Kiem tra thiet bi Android gan ket qua USB hoac Gia lap
Write-Host "`n[2/3] Kiem tra thiet bi Android ket noi qua ADB..." -ForegroundColor Yellow
$rawDevices = & $AdbExe devices
$devices = $rawDevices | Where-Object { $_ -match '\tdevice$' }

if (-not $devices) {
    Write-Host "  -> Khong tim thay thiet bi Android nao dang ket noi o trang thai 'device'." -ForegroundColor Red
    Write-Host "     HUONG DAN XU LY:" -ForegroundColor Yellow
    Write-Host "     1. Cam cap USB noi dien thoai Android vao may tinh." -ForegroundColor Gray
    Write-Host "     2. Tren dien thoai: Bat 'Cai dat' -> 'Tuy chon nha phat trien' -> Bat 'Go loi qua USB' (USB Debugging)." -ForegroundColor Gray
    Write-Host "     3. Chap nhan hop thoai 'Cho phep go loi qua USB tu may tinh nay'." -ForegroundColor Gray
    Write-Host "     4. Chay lai script nay de kich hoat reverse proxy." -ForegroundColor Gray
    exit 0
}

$deviceCount = ($devices | Measure-Object).Count
Write-Host "  -> Da tim thay $deviceCount thiet bi Android san sang:" -ForegroundColor Green
$devices | ForEach-Object { Write-Host "     * $_" -ForegroundColor Green }

# 3. Kich hoat Reverse Port Forwarding
Write-Host "`n[3/3] Dao chieu cong mang: adb reverse tcp:5000 tcp:5000..." -ForegroundColor Yellow
& $AdbExe reverse tcp:5000 tcp:5000
if ($LASTEXITCODE -eq 0) {
    Write-Host "  -> THANH CONG! Cong 5000 tren dien thoai da duoc noi thang vao cong 5000 cua may tinh." -ForegroundColor Green
    Write-Host "`n----------------------------------------------------------" -ForegroundColor Cyan
    Write-Host "CACH DUNG TREN DIEN THOAI:" -ForegroundColor White
    Write-Host "  1. Mo ung dung Ruo Campus tren dien thoai." -ForegroundColor White
    Write-Host "  2. Tai man hinh Dang nhap, bam 'Ket noi may chu'." -ForegroundColor White
    Write-Host "  3. Chon hoac dien URL API:" -ForegroundColor White
    Write-Host "     http://127.0.0.1:5000/api" -ForegroundColor Green
    Write-Host "  4. Bam 'DANG NHAP VAO HE THONG' (Dung GV001, KT001 hoac QL001)." -ForegroundColor White
    Write-Host "----------------------------------------------------------`n" -ForegroundColor Cyan
} else {
    Write-Host "  -> THAT BAI khi goi adb reverse. Vui long kiem tra lai quyen ket noi ADB." -ForegroundColor Red
}
