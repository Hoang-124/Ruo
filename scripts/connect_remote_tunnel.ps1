# ==============================================================================
# Script: connect_remote_tunnel.ps1
# Description: Khoi tao duong ham HTTPS tu xa (Cloudflare / Ngrok / LAN IP) cho Ruo Mobile
# Du an: Ruo - Quan Ly Co So Vat Chat Dai Hoc
# ==============================================================================

param(
    [ValidateSet('lan', 'cloudflare', 'ngrok', 'localtunnel')]
    [string]$Mode = 'lan'
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   RUO CAMPUS - THIET LAP KET NOI TU XA CHO THIET BI DI DONG  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Lay danh sach dia chi IP LAN cua may tinh
$lanIps = Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi*', 'Ethernet*' -ErrorAction SilentlyContinue |
          Where-Object { $_.IPAddress -notlike '169.254*' -and $_.IPAddress -ne '127.0.0.1' }

Write-Host "`n[CHE DO 1: KET NOI QUA MANG WI-FI NOI BO (LAN)]" -ForegroundColor Green
Write-Host "Khi dien thoai va may tinh ket noi CHUNG mang Wi-Fi:" -ForegroundColor White
foreach ($ip in $lanIps) {
    Write-Host "  -> Dia chi API tren giao dien: http://$($ip.IPAddress):5000/api" -ForegroundColor Yellow
}
Write-Host "  (Luu y: Dam bao Windows Firewall khong chan Inbound ket noi vao cong 5000)" -ForegroundColor Gray

if ($Mode -eq 'lan') {
    Write-Host "`nDang o che do LAN mac dinh. Neu ban muon mo Tunnel ra Internet toan cau (4G/5G):" -ForegroundColor White
    Write-Host "  powershell scripts\connect_remote_tunnel.ps1 -Mode cloudflare" -ForegroundColor Cyan
    Write-Host "  powershell scripts\connect_remote_tunnel.ps1 -Mode ngrok" -ForegroundColor Cyan
    exit 0
}

if ($Mode -eq 'cloudflare') {
    Write-Host "`n[CHE DO 2: CLOUDFLARE QUICK TUNNEL (HTTPS TU DONG)]" -ForegroundColor Magenta
    Write-Host "Dang khoi chay Cloudflare Tunnel noi vao http://localhost:5000..." -ForegroundColor Yellow
    Write-Host "Cho URL cong cong xuat hien (ket thuc bang .trycloudflare.com)..." -ForegroundColor Gray
    npx --yes cloudflared tunnel --url http://localhost:5000
    exit $LASTEXITCODE
}

if ($Mode -eq 'ngrok') {
    Write-Host "`n[CHE DO 3: NGROK EDGE TUNNEL (HTTPS)]" -ForegroundColor Blue
    Write-Host "Dang khoi chay Ngrok qua npx noi vao cong 5000..." -ForegroundColor Yellow
    Write-Host "Neu la lan dau dung ngrok, ban can co auth token: 'npx @ngrok/ngrok config add-authtoken YOUR_TOKEN'" -ForegroundColor Gray
    npx --yes @ngrok/ngrok http 5000
    exit $LASTEXITCODE
}

if ($Mode -eq 'localtunnel') {
    Write-Host "`n[CHE DO 4: LOCALTUNNEL (HTTPS MIEN PHI)]" -ForegroundColor Cyan
    Write-Host "Dang khoi chay localtunnel noi vao cong 5000..." -ForegroundColor Yellow
    npx --yes localtunnel --port 5000
    exit $LASTEXITCODE
}
