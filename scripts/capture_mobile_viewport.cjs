const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/Dang/AppData/Local/npm-cache/_npx/6ddf87659f2ad8a4/node_modules/playwright-core');

const SCREENSHOTS_DIR = 'C:/Users/Dang/Documents/wdp/Ruo/screenshots';
const ARTIFACTS_DIR = 'C:/Users/Dang/.gemini/antigravity-cli/brain/38787454-3954-4e66-9173-3db69951ef3e/screenshots';

if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACTS_DIR)) fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

function copyToArtifacts(filename) {
  const src = path.join(SCREENSHOTS_DIR, filename);
  const dst = path.join(ARTIFACTS_DIR, filename);
  fs.copyFileSync(src, dst);
}

function getPngDimensions(filePath) {
  const b = fs.readFileSync(filePath);
  return {
    width: b.readUInt32BE(16),
    height: b.readUInt32BE(20),
    sizeKb: Math.round(b.length / 1024)
  };
}

async function clickText(page, text, timeoutMs = 8000) {
  console.log(`Searching for button containing: "${text}"...`);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await page.evaluate((t) => {
      const all = Array.from(document.querySelectorAll('flt-semantics, button, input'));
      const matches = all.filter(e => {
        const inner = e.innerText || '';
        const label = e.getAttribute('aria-label') || '';
        return inner.toLowerCase().includes(t.toLowerCase()) || label.toLowerCase().includes(t.toLowerCase());
      });
      // Sort by specificity: smallest innerText/label first to pick the exact leaf element
      matches.sort((a, b) => {
        const lenA = (a.innerText?.trim().length || a.getAttribute('aria-label')?.length || 9999);
        const lenB = (b.innerText?.trim().length || b.getAttribute('aria-label')?.length || 9999);
        return lenA - lenB;
      });
      if (matches.length > 0) {
        const target = matches[0];
        target.click();
        return { found: true, text: target.innerText || target.getAttribute('aria-label') };
      }
      return { found: false };
    }, text);

    if (res.found) {
      console.log(`  ✓ Clicked element matching: "${text}" (${res.text})`);
      return true;
    }
    await page.waitForTimeout(400);
  }
  console.warn(`  ⚠️ Could not click element matching: "${text}" within ${timeoutMs}ms`);
  return false;
}

(async () => {
  console.log('🚀 [Ruo UEMS] Launching Edge in TRUE Mobile Viewport (iPhone 14: 390x844 px, DPR: 2 => 780x1688 px)...');

  const browser = await chromium.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
  });

  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[BROWSER ERROR] ${msg.text()}`);
  });

  try {
    console.log('📱 Navigating to Flutter Web Server (http://127.0.0.1:8080)...');
    await page.goto('http://127.0.0.1:8080');
    await page.waitForTimeout(4500);

    // Enable Flutter Web Semantics
    console.log('♿ Enabling Flutter Web Semantics tree...');
    await page.evaluate(() => {
      document.querySelector('flt-semantics-placeholder')?.click();
    });
    await page.waitForTimeout(2000);

    // 01: Login Screen (Obsidian Dark)
    console.log('📸 Step 01: Capturing 01_login_obsidian_dark.png...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_login_obsidian_dark.png') });
    copyToArtifacts('01_login_obsidian_dark.png');

    // 02: Login as Lecturer GV001 & Open QR Scanner
    console.log('🔑 Authenticating as GV001 (Giảng viên)...');
    await clickText(page, 'GV001');
    await page.waitForTimeout(3500);

    console.log('📷 Switching to Quét QR tab...');
    await clickText(page, 'Quét QR');
    await page.waitForTimeout(2000);

    console.log('📸 Step 02: Capturing 02_lecturer_qr_scanner.png...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_lecturer_qr_scanner.png') });
    copyToArtifacts('02_lecturer_qr_scanner.png');

    // 03: Lookup Equipment A1-101 Cassette AC
    console.log('🔍 Looking up EQ-101-ACCASS-01...');
    await clickText(page, 'EQ-101-ACCASS-01');
    await page.waitForTimeout(3000);

    console.log('📸 Step 03: Capturing 03_equipment_detail_p101.png...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_equipment_detail_p101.png') });
    copyToArtifacts('03_equipment_detail_p101.png');

    // 04: Report Incident Form
    console.log('📝 Opening Incident Report Form...');
    await clickText(page, 'Yêu cầu sửa chữa');
    await page.waitForTimeout(2000);

    console.log('⚡ Selecting SLA Level 2...');
    await clickText(page, 'Cấp 2');
    await page.waitForTimeout(1000);

    console.log('📸 Step 04: Capturing 04_report_incident_form.png...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_report_incident_form.png') });
    copyToArtifacts('04_report_incident_form.png');

    // 05: Submit Report & Success Dialog
    console.log('🚀 Submitting incident ticket with SLA commitment...');
    await clickText(page, 'Gửi báo hỏng');
    await page.waitForTimeout(3500);

    console.log('📸 Step 05: Capturing 05_report_success_dialog.png...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_report_success_dialog.png') });
    copyToArtifacts('05_report_success_dialog.png');

    // 06: Dismiss Dialog, Profile & Logout
    console.log('👤 Navigating to Lecturer Profile...');
    await clickText(page, 'Đã hiểu & Hoàn tất');
    await page.waitForTimeout(1500);

    await clickText(page, 'Hồ sơ');
    await page.waitForTimeout(2000);

    console.log('📸 Step 06: Capturing 06_lecturer_profile_logout.png...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_lecturer_profile_logout.png') });
    copyToArtifacts('06_lecturer_profile_logout.png');

    // 07: Logout & Login as Technician KT001
    console.log('🔄 Logging out and authenticating as KT001 (Kỹ thuật viên)...');
    await clickText(page, 'Đăng xuất khỏi thiết bị');
    await page.waitForTimeout(1000);
    await clickText(page, 'Xác nhận đăng xuất');
    await page.waitForTimeout(2500);

    await clickText(page, 'KT001');
    await page.waitForTimeout(3500);

    console.log('📸 Step 07: Capturing 07_technician_sla_kanban.png...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_technician_sla_kanban.png') });
    copyToArtifacts('07_technician_sla_kanban.png');

    // 08: Technician Task Acceptance / Detail
    console.log('🛠️ Accepting task or updating progress...');
    await clickText(page, 'Tiếp nhận', 3500);
    await page.waitForTimeout(2000);

    console.log('📸 Step 08: Capturing 08_technician_task_accepted.png...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_technician_task_accepted.png') });
    copyToArtifacts('08_technician_task_accepted.png');

    // 09: Classroom Stocktaking Audit
    console.log('📦 Navigating to Classroom Stocktaking Tab...');
    await clickText(page, 'Kiểm Kê');
    await page.waitForTimeout(3000);

    console.log('📸 Step 09: Capturing 09_classroom_stocktaking.png...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09_classroom_stocktaking.png') });
    copyToArtifacts('09_classroom_stocktaking.png');

    // 10: Notification Center
    console.log('🔔 Navigating to Notification Center in AppBar...');
    await clickText(page, 'Thông báo');
    await page.waitForTimeout(3000);

    console.log('📸 Step 10: Capturing 10_notification_center.png...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10_notification_center.png') });
    copyToArtifacts('10_notification_center.png');

    console.log('\n✨ All 10 mobile viewport screenshots successfully captured!\n');

    // Verification Table
    console.log('📋 VERIFICATION TABLE:');
    console.log('------------------------------------------------------------');
    const files = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.startsWith('0') || f.startsWith('10'));
    for (const f of files.sort()) {
      const dim = getPngDimensions(path.join(SCREENSHOTS_DIR, f));
      console.log(`- ${f.padEnd(32)}: ${dim.width} x ${dim.height} px (${dim.sizeKb} KB)`);
    }
    console.log('------------------------------------------------------------');

  } catch (err) {
    console.error('❌ Error during mobile screenshot run:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
