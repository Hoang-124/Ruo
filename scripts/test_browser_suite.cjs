const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/Dang/AppData/Local/npm-cache/_npx/6ddf87659f2ad8a4/node_modules/playwright-core');

const SCREENSHOTS_DIR = 'C:/Users/Dang/Documents/wdp/Ruo/screenshots/browser';
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

async function enableSemantics(page) {
  await page.evaluate(() => {
    document.querySelector('flt-semantics-placeholder')?.click();
  });
  await page.waitForTimeout(1000);
}

async function clickText(page, text, timeoutMs = 8000) {
  console.log(`  🔍 Searching for element containing: "${text}"...`);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await page.evaluate((t) => {
      const all = Array.from(document.querySelectorAll('flt-semantics, button, input, [role="button"]'));
      const matches = all.filter(e => {
        const inner = e.innerText || '';
        const label = e.getAttribute('aria-label') || '';
        return inner.toLowerCase().includes(t.toLowerCase()) || label.toLowerCase().includes(t.toLowerCase());
      });
      // Sort by specificity: shortest text/label first
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
      console.log(`    ✓ Clicked element: "${res.text.replace(/\n/g, ' ')}"`);
      return true;
    }
    await page.waitForTimeout(300);
  }
  console.warn(`    ⚠️ Could not click element matching: "${text}" within ${timeoutMs}ms`);
  return false;
}

(async () => {
  console.log('🚀 [Browser Testing Suite] Starting clean isolated browser execution...');

  const browser = await chromium.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true
  });

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
  });

  try {
    // ==========================================
    // STEP 1: Login Screen & Dark/Light Mode Moon
    // ==========================================
    console.log('\n📱 Step 1: Navigating to Login Screen...');
    const page1 = await mobileContext.newPage();
    await page1.goto('http://127.0.0.1:8080');
    await page1.waitForTimeout(4000);
    await enableSemantics(page1);

    console.log('📸 Capturing browser_01_login_clean_moon.png...');
    await page1.screenshot({ path: path.join(SCREENSHOTS_DIR, 'browser_01_login_clean_moon.png') });
    copyToArtifacts('browser_01_login_clean_moon.png');

    // ==========================================
    // STEP 2: Login as GV001 & Quét QR Modal
    // ==========================================
    console.log('\n🔑 Step 2: Authenticating as GV001 (Giảng viên)...');
    await clickText(page1, 'GV001');
    await page1.waitForTimeout(3500);

    console.log('📷 Switching to "Quét QR" tab...');
    await clickText(page1, 'Quét QR');
    await page1.waitForTimeout(2000);

    console.log('📋 Opening "MÃ QR MẪU" modal dialog...');
    await clickText(page1, 'MÃ QR MẪU');
    await page1.waitForTimeout(2000);

    console.log('📸 Capturing browser_02_qr_scanner_sample_modal.png...');
    await page1.screenshot({ path: path.join(SCREENSHOTS_DIR, 'browser_02_qr_scanner_sample_modal.png') });
    copyToArtifacts('browser_02_qr_scanner_sample_modal.png');

    // ==========================================
    // STEP 3: Daikin AC detail & AppBar Clean Bell
    // ==========================================
    console.log('\n🔍 Step 3: Looking up Daikin AC asset EQ-101-ACCASS-01...');
    await clickText(page1, 'Tra cứu');
    await page1.waitForTimeout(3000);

    console.log('📸 Capturing browser_03_clean_bell_appbar.png...');
    await page1.screenshot({ path: path.join(SCREENSHOTS_DIR, 'browser_03_clean_bell_appbar.png') });
    copyToArtifacts('browser_03_clean_bell_appbar.png');
    await page1.close();

    // ==========================================
    // STEP 4: Fullscreen Notification Center with Lucide Bell
    // ==========================================
    console.log('\n🔔 Step 4: Opening Notification Center in fresh session...');
    const page2 = await mobileContext.newPage();
    await page2.goto('http://127.0.0.1:8080');
    await page2.waitForTimeout(3500);
    await enableSemantics(page2);

    await clickText(page2, 'GV001');
    await page2.waitForTimeout(3000);

    console.log('🔔 Clicking Notification Bell on AppBar / Tab...');
    await clickText(page2, 'Thông báo', 5000);
    await page2.waitForTimeout(2500);

    console.log('📸 Capturing browser_04_notification_center.png...');
    await page2.screenshot({ path: path.join(SCREENSHOTS_DIR, 'browser_04_notification_center.png') });
    copyToArtifacts('browser_04_notification_center.png');
    await page2.close();

    // ==========================================
    // STEP 5: Facility Manager QL001 2D CAD & Clean Reload Icon
    // ==========================================
    console.log('\n🏛️ Step 5: Logging in as QL001 (Quản lý CSVC) for 2D CAD & Reload Icon...');
    const page3 = await mobileContext.newPage();
    await page3.goto('http://127.0.0.1:8080');
    await page3.waitForTimeout(3500);
    await enableSemantics(page3);

    await clickText(page3, 'QL001');
    await page3.waitForTimeout(3500);

    console.log('🏛️ Navigating to Mặt bằng / Phòng học tab...');
    await clickText(page3, 'Mặt bằng', 4000) || await clickText(page3, 'Phòng học', 4000);
    await page3.waitForTimeout(3000);

    console.log('📸 Capturing browser_05_room_cad_reload_icon.png...');
    await page3.screenshot({ path: path.join(SCREENSHOTS_DIR, 'browser_05_room_cad_reload_icon.png') });
    copyToArtifacts('browser_05_room_cad_reload_icon.png');

    // ==========================================
    // STEP 6: Admin AD001 Workspace & Room Creation Form
    // ==========================================
    console.log('\n➕ Step 6: Logging in as AD001 (Quản trị viên) for Room Creation Form...');
    const page4 = await mobileContext.newPage();
    await page4.goto('http://127.0.0.1:8080');
    await page4.waitForTimeout(3500);
    await enableSemantics(page4);

    await clickText(page4, 'AD001');
    await page4.waitForTimeout(3500);

    console.log('➕ Clicking "Thêm phòng" (RoomFormPage)...');
    await clickText(page4, 'Thêm phòng', 5000);
    await page4.waitForTimeout(2500);

    console.log('📸 Capturing browser_06_admin_room_form.png...');
    await page4.screenshot({ path: path.join(SCREENSHOTS_DIR, 'browser_06_admin_room_form.png') });
    copyToArtifacts('browser_06_admin_room_form.png');
    await page4.close();

    // ==========================================
    // STEP 7: Facility Manager QL001 6-Tab Reports View
    // ==========================================
    console.log('\n📊 Step 7: Navigating to Reports View in QL001 workspace...');
    await clickText(page3, 'Báo cáo', 5000);
    await page3.waitForTimeout(3000);

    console.log('📸 Capturing browser_07_manager_reports_view.png...');
    await page3.screenshot({ path: path.join(SCREENSHOTS_DIR, 'browser_07_manager_reports_view.png') });
    copyToArtifacts('browser_07_manager_reports_view.png');
    await page3.close();

    // ==========================================
    // STEP 8: Server QR Test Suite Web Dashboard (Desktop Viewport)
    // ==========================================
    console.log('\n💻 Step 8: Desktop Viewport Context (1280x800) for Server QR Test Dashboard...');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1
    });

    const desktopPage = await desktopContext.newPage();
    console.log('🌐 Navigating to http://localhost:5000/qr-test...');
    await desktopPage.goto('http://localhost:5000/qr-test');
    await desktopPage.waitForTimeout(2000);

    console.log('🔍 Clicking first QR card to open full-screen zoom modal...');
    await desktopPage.click('.qr-card:first-child');
    await desktopPage.waitForTimeout(1500);

    console.log('📸 Capturing browser_08_server_qr_test_dashboard.png...');
    await desktopPage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'browser_08_server_qr_test_dashboard.png') });
    copyToArtifacts('browser_08_server_qr_test_dashboard.png');
    await desktopContext.close();

    console.log('\n✨ All 8 browser test screenshots successfully captured!\n');

    // Verification Table
    console.log('📋 BROWSER VERIFICATION TABLE:');
    console.log('------------------------------------------------------------');
    const files = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.startsWith('browser_'));
    for (const f of files.sort()) {
      const dim = getPngDimensions(path.join(SCREENSHOTS_DIR, f));
      console.log(`- ${f.padEnd(42)}: ${dim.width} x ${dim.height} px (${dim.sizeKb} KB)`);
    }
    console.log('------------------------------------------------------------');

  } catch (err) {
    console.error('❌ Error during browser test run:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
