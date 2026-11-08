/**
 * Test QR Code Generator for Ruo Facilities Management
 * Generates PNG images and standalone HTML test sheet.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from '../server/node_modules/qrcode/lib/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'test_qr_codes');
const artifactScreenshotsDir = 'C:\\Users\\Dang\\.gemini\\antigravity-cli\\brain\\38787454-3954-4e66-9173-3db69951ef3e\\screenshots';

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const testItems = [
  {
    code: 'EQ-101-ACCASS-01',
    name: 'Điều hòa Daikin Inverter Cassette 4HP',
    category: 'Thiết bị điện lạnh',
    location: 'Phòng A1-101 · Tầng 1 Tòa A1',
    status: 'Đang bảo trì',
    statusColor: '#f59e0b',
    description: 'Thiết bị báo hỏng rung lắc quạt gió cần kỹ thuật viên xử lý gấp.',
  },
  {
    code: 'EQ-101-PRJ-01',
    name: 'Máy chiếu Sony Laser 5000 Lumens',
    category: 'Thiết bị trình chiếu',
    location: 'Phòng A1-101 · Tầng 1 Tòa A1',
    status: 'Sẵn sàng',
    statusColor: '#10b981',
    description: 'Máy chiếu giảng dạy chất lượng cao, định kỳ bảo dưỡng định dạng laser.',
  },
  {
    code: 'EQ-102-CAM-01',
    name: 'Camera PTZ Tracking Tự Động',
    category: 'Hệ thống Smart Classroom',
    location: 'Phòng A1-102 · Tầng 1 Tòa A1',
    status: 'Sẵn sàng',
    statusColor: '#10b981',
    description: 'Camera tự động bám theo giảng viên và ghi hình bài giảng.',
  },
  {
    code: 'A1-101',
    name: 'Phòng Học Thông Minh A1-101',
    category: 'Không gian giảng dạy',
    location: 'Tầng 1 · Tòa nhà A1',
    status: 'Đang bảo trì',
    statusColor: '#f59e0b',
    description: 'Phòng học 50 chỗ trang bị bàn ghế di động và màn hình tương tác.',
  },
];

async function generate() {
  console.log('Generating high-res QR codes...');

  const cardsHtml = [];

  for (const item of testItems) {
    const pngPath = path.join(outDir, `${item.code}.png`);
    await QRCode.toFile(pngPath, item.code, {
      width: 400,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    });
    console.log(`✓ Generated ${pngPath}`);

    // Also copy to artifacts if dir exists
    if (fs.existsSync(artifactScreenshotsDir)) {
      fs.copyFileSync(pngPath, path.join(artifactScreenshotsDir, `qr_${item.code.replace(/-/g, '_')}.png`));
    }

    const dataUrl = await QRCode.toDataURL(item.code, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#0f172a', light: '#ffffff' },
    });

    cardsHtml.push(`
      <div class="qr-card" onclick="openModal('${item.code}', '${item.name}', '${dataUrl}')">
        <div class="badge" style="background:${item.statusColor}22; color:${item.statusColor}; border-color:${item.statusColor}55;">
          ${item.status}
        </div>
        <div class="qr-img-wrap">
          <img src="${dataUrl}" alt="QR ${item.code}" class="qr-img" />
          <div class="zoom-hint">🔍 Nhấp để phóng to toàn màn hình</div>
        </div>
        <div class="qr-code-text">${item.code}</div>
        <div class="qr-title">${item.name}</div>
        <div class="qr-meta">📍 ${item.location} · 🏷️ ${item.category}</div>
        <p class="qr-desc">${item.description}</p>
      </div>
    `);
  }

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ruo — Bảng Mã QR Kiểm Thử Thực Địa</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --border: #1f293d;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --brand: #38bdf8;
      --brand-accent: #0284c7;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 32px 20px;
    }
    .header {
      max-width: 1200px;
      margin: 0 auto 32px;
      text-align: center;
    }
    .logo-badge {
      display: inline-block;
      padding: 6px 14px;
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 999px;
      color: var(--brand);
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 1px;
      margin-bottom: 12px;
    }
    h1 {
      font-size: 28px;
      font-weight: 800;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }
    p.lead {
      color: var(--text-muted);
      font-size: 15px;
      max-width: 650px;
      margin: 0 auto;
      line-height: 1.5;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
      gap: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .qr-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      position: relative;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .qr-card:hover {
      transform: translateY(-4px);
      border-color: var(--brand);
      box-shadow: 0 12px 28px rgba(0,0,0,0.4);
    }
    .badge {
      align-self: flex-end;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      border: 1px solid transparent;
      margin-bottom: 12px;
    }
    .qr-img-wrap {
      background: #ffffff;
      padding: 12px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      position: relative;
      overflow: hidden;
      margin-bottom: 14px;
    }
    .qr-img {
      display: block;
      width: 220px;
      height: 220px;
      image-rendering: pixelated;
    }
    .zoom-hint {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(15, 23, 42, 0.85);
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      padding: 6px;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .qr-card:hover .zoom-hint {
      opacity: 1;
    }
    .qr-code-text {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 16px;
      font-weight: 700;
      color: var(--brand);
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .qr-title {
      font-size: 15px;
      font-weight: 700;
      margin-bottom: 6px;
      color: #fff;
    }
    .qr-meta {
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 8px;
    }
    .qr-desc {
      font-size: 12px;
      color: #64748b;
      line-height: 1.4;
    }
    .instructions {
      max-width: 1200px;
      margin: 40px auto 0;
      background: rgba(56, 189, 248, 0.05);
      border: 1px dashed rgba(56, 189, 248, 0.25);
      border-radius: 14px;
      padding: 20px 24px;
    }
    .instructions h3 {
      color: var(--brand);
      font-size: 15px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .instructions ol {
      padding-left: 20px;
      color: var(--text-muted);
      font-size: 13.5px;
      line-height: 1.6;
    }
    /* Modal */
    .modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.85);
      backdrop-filter: blur(8px);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .modal.active { display: flex; }
    .modal-content {
      background: #ffffff;
      padding: 32px;
      border-radius: 20px;
      text-align: center;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .modal-img {
      width: 320px;
      height: 320px;
      margin: 0 auto 16px;
      display: block;
      image-rendering: pixelated;
    }
    .modal-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 6px;
    }
    .modal-name {
      font-size: 16px;
      font-weight: 600;
      color: #475569;
      margin-bottom: 20px;
    }
    .modal-close-btn {
      background: #0f172a;
      color: #ffffff;
      border: none;
      padding: 10px 24px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-badge">RUO FIELD SUITE · KIỂM THỬ MÁY ẢNH QR</div>
    <h1>Bảng Mã QR Thiết Bị & Phòng Học Thực Địa</h1>
    <p class="lead">
      Mở trang này trên màn hình máy tính, bật tab <strong>Quét QR</strong> trên điện thoại Vivo V2338A và đưa máy ảnh vào để quét nhận diện tức thì.
    </p>
  </div>

  <div class="grid">
    ${cardsHtml.join('')}
  </div>

  <div class="instructions">
    <h3>📱 Hướng Dẫn Thử Nghiệm Với Điện Thoại Thật</h3>
    <ol>
      <li>Mở ứng dụng <strong>Ruo</strong> trên điện thoại Vivo V2338A (đã kết nối qua ADB reverse cổng 5000).</li>
      <li>Đăng nhập nhanh với vai trò <strong>GV001 (Giảng viên)</strong> hoặc <strong>KT001 (Kỹ thuật viên)</strong>.</li>
      <li>Chạm vào tab <strong>Quét QR</strong> (Tab 2) trên thanh điều hướng dưới cùng.</li>
      <li>Khung bo tròn hiển thị trực tiếp luồng camera thật. Hướng camera vào bất kỳ ô mã QR nào ở trên (hoặc nhấp vào ô để phóng to toàn màn hình).</li>
      <li>Camera sẽ tự động nhận dạng trong vòng <strong>0.2 giây</strong>, rung phản hồi và mở bảng tra cứu thiết bị / báo hỏng SLA tương ứng.</li>
    </ol>
  </div>

  <div id="modal" class="modal" onclick="closeModal(event)">
    <div class="modal-content" onclick="event.stopPropagation()">
      <img id="modalImg" src="" alt="QR Modal" class="modal-img" />
      <div id="modalCode" class="modal-code"></div>
      <div id="modalName" class="modal-name"></div>
      <button class="modal-close-btn" onclick="closeModal()">Đóng cửa sổ</button>
    </div>
  </div>

  <script>
    function openModal(code, name, src) {
      document.getElementById('modalCode').innerText = code;
      document.getElementById('modalName').innerText = name;
      document.getElementById('modalImg').src = src;
      document.getElementById('modal').classList.add('active');
    }
    function closeModal() {
      document.getElementById('modal').classList.remove('active');
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  </script>
</body>
</html>`;

  const htmlPath = path.join(outDir, 'qr_test_sheet.html');
  fs.writeFileSync(htmlPath, html, 'utf-8');
  console.log(`✓ Generated HTML test sheet at ${htmlPath}`);

  return { htmlPath, outDir };
}

generate().catch(err => {
  console.error('Error generating QR codes:', err);
  process.exit(1);
});
