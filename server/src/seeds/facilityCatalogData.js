import { EQUIPMENT_STATUSES } from '../config/constants.js';

/**
 * Master Facility & Equipment Catalog for Building A1 (5 Floors — 91 Rooms)
 * Strictly aligned with user-curated DANH_MUC_CSVC_TOA_NHA_DAI_HOC_CAP_NHAT.md (27/10/2026).
 * Only retained categories (11), equipment models (55), and spare parts (10) are registered here.
 */

export const CATALOG_CATEGORIES = [
  {
    code: 'CAT-DISPLAY',
    name: 'Thiết bị Trình chiếu & Hiển thị Hình ảnh',
    description: 'Bảo dưỡng 3 tháng/lần • SLA critical • Giảng đường T1–T5, Phòng Lab, Sảnh',
    depreciation_rate: 20,
    depreciationYears: 5
  },
  {
    code: 'CAT-HVAC',
    name: 'Thiết bị Làm mát, Thông gió & Điều hòa',
    description: 'Bảo dưỡng 3–6 tháng/lần • SLA major • Toàn bộ 5 tầng (Phòng học, Lab, VP, Thư viện, WC, Kho)',
    depreciation_rate: 15,
    depreciationYears: 7
  },
  {
    code: 'CAT-AUDIO',
    name: 'Thiết bị Âm thanh, Trợ giảng & Studio',
    description: 'Bảo dưỡng 6 tháng/lần • SLA major/critical • Giảng đường lớn, Hội thảo, Studio T5, Hành lang',
    depreciation_rate: 20,
    depreciationYears: 5
  },
  {
    code: 'CAT-IT',
    name: 'Máy tính, Thiết bị CNTT & Thực hành Lab',
    description: 'Bảo dưỡng 6 tháng/lần • SLA major • Phòng Lab T2–T4, Phòng Nghiên cứu, VP Khoa T4, Thư viện',
    depreciation_rate: 25,
    depreciationYears: 4
  },
  {
    code: 'CAT-NET',
    name: 'Hạ tầng Mạng, Viễn thông & Điện nhẹ',
    description: 'Bảo dưỡng 6 tháng/lần • SLA critical • Hành lang 5 tầng, Tủ kỹ thuật tầng, Phòng Lab, Phòng họp',
    depreciation_rate: 20,
    depreciationYears: 5
  },
  {
    code: 'CAT-SEC',
    name: 'Thiết bị An ninh, Giám sát & Kiểm soát Ra vào',
    description: 'Bảo dưỡng 6 tháng/lần • SLA critical • Cổng vào, Thư viện T1, Phòng thi, Phòng Lab, Tài vụ T4, Kho',
    depreciation_rate: 20,
    depreciationYears: 5
  },
  {
    code: 'CAT-OFFICE',
    name: 'Thiết bị Văn phòng & Hành chính Học vụ',
    description: 'Bảo dưỡng 6 tháng/lần • SLA minor/major • Phòng Đào tạo, Tài vụ, Tiếp SV, VP các Khoa T4, Phòng GV T5',
    depreciation_rate: 20,
    depreciationYears: 5
  },
  {
    code: 'CAT-POWER',
    name: 'Hệ thống Điện, Chiếu sáng & Nguồn Dự phòng',
    description: 'Bảo dưỡng 6 tháng/lần • SLA critical • Toàn bộ 5 tầng, Hộp kỹ thuật điện, Phòng Học Lớn & Studio',
    depreciation_rate: 15,
    depreciationYears: 7
  },
  {
    code: 'CAT-FIRE',
    name: 'Thiết bị Phòng cháy Chữa cháy & Cứu nạn',
    description: 'Bảo dưỡng 1–3 tháng/lần • SLA critical • Hành lang 5 tầng, Giảng đường, Phòng Lab, Kho KHO-01',
    depreciation_rate: 20,
    depreciationYears: 5
  },
  {
    code: 'CAT-FURN',
    name: 'Nội thất Giảng đường, Văn phòng, Thư viện & Kho',
    description: 'Bảo dưỡng 12 tháng/lần • SLA minor • Tất cả phòng học, Phòng Lab, Thư viện T1, VP T4, Kho',
    depreciation_rate: 10,
    depreciationYears: 10
  },
  {
    code: 'CAT-SPEC',
    name: 'Thiết bị Chuyên dụng Y tế',
    description: 'Bảo dưỡng 6 tháng/lần • SLA major • Phòng Y tế T3 (A1-YT-T3) & Trực cấp cứu Sảnh chính T1',
    depreciation_rate: 15,
    depreciationYears: 7
  }
];

export const CATALOG_SUPPLIERS = [
  { code: 'SUP-01', name: 'Công ty Cổ phần Công nghệ FPT', phone: '02473007300', email: 'contact@fpt.com.vn', address: 'Cầu Giấy, Hà Nội' },
  { code: 'SUP-02', name: 'Tập đoàn Điện máy & Cơ điện lạnh Daikin VN', phone: '18006777', email: 'service@daikin.com.vn', address: 'Ba Đình, Hà Nội' },
  { code: 'SUP-03', name: 'Công ty CP Nội thất Hòa Phát (The One) & Vinatech', phone: '02436649494', email: 'duan@noithattheone.vn', address: 'Thanh Xuân, Hà Nội' },
  { code: 'SUP-04', name: 'Công ty Thiết bị PCCC & Điện công nghiệp An Phát', phone: '02439726688', email: 'kythuat@anphatpccc.vn', address: 'Hoàng Mai, Hà Nội' },
  { code: 'SUP-05', name: 'Công ty Thiết bị Y tế & Văn phòng Minh Tâm', phone: '02438521199', email: 'support@minhtammed.vn', address: 'Đống Đa, Hà Nội' }
];

const part = (code, name, unit, stock, min_stock, price, supplierCode) => ({
  code,
  name,
  unit,
  stock,
  min_stock,
  price,
  supplierCode
});

/**
 * Exact 10 retained consumable / replacement spare parts (PHẦN IV).
 * PART-HDMI covers video signal cables connecting laptops/PCs to Smart TVs & Projectors.
 */
export const CATALOG_SPARE_PARTS = [
  part('PART-LAMP', 'Cụm bóng đèn máy chiếu 230W – 250W chính hãng', 'Cái', 2, 3, 1500000, 'SUP-01'),
  part('PART-FILT', 'Tấm lưới lọc bụi tĩnh điện máy chiếu', 'Tấm', 12, 5, 220000, 'SUP-01'),
  part('PART-RMT', 'Điều khiển từ xa đa năng (Máy chiếu / Điều hòa / TV)', 'Cái', 10, 5, 250000, 'SUP-02'),
  part('PART-HDMI', 'Cáp tín hiệu HDMI 2.0 chống nhiễu truyền hình ảnh lên TV / Máy chiếu (5m / 10m / 15m)', 'Sợi', 4, 6, 350000, 'SUP-01'),
  part('PART-PATCH', 'Dây nhảy mạng Cat6 Patch Cord đúc sẵn & Hộp hạt RJ45', 'Hộp/Bó', 9, 5, 280000, 'SUP-01'),
  part('PART-BATT12', 'Bình ắc quy khô 12V-7.5Ah / 12V-9Ah (cho đèn sự cố, loa kéo)', 'Bình', 8, 6, 420000, 'SUP-04'),
  part('PART-LEDDRV', 'Chấn lưu / Nguồn LED Driver & Bóng tuýp LED 1.2m dự phòng', 'Cái', 24, 15, 140000, 'SUP-04'),
  part('PART-MCB', 'Aptomat chống giật RCBO / MCB 1P–2P & Ổ cắm âm sàn', 'Cái', 14, 8, 190000, 'SUP-04'),
  part('PART-TONER', 'Hộp mực máy in Laser / Ống mực máy Photocopy', 'Hộp', 8, 5, 650000, 'SUP-05'),
  part('PART-ROFILT', 'Bộ lõi lọc thô 1-2-3 thay định kỳ cho cây lọc nước hành lang', 'Bộ', 6, 4, 290000, 'SUP-05')
];

const tpl = (templateCode, categoryCode, supplierCode, name, brand, model, price, warrantyMonths) => [
  templateCode,
  { templateCode, categoryCode, supplierCode, name, brand, model, price, warrantyMonths }
];

/**
 * Exact 55 retained equipment templates across the 11 canonical categories (PHẦN III).
 * Spec-only rows (STAGE-LGT, HYDRANT, CURTAIN, MED-BED, MED-CAB) preserve brand: '' without inventing brands.
 */
export const EQUIPMENT_TEMPLATES = Object.fromEntries([
  // 1. CAT-DISPLAY (4)
  tpl('PRJ-STD', 'CAT-DISPLAY', 'SUP-01', 'Máy chiếu siêu gần giảng đường', 'Panasonic', 'PT-TW370', 24500000, 24),
  tpl('SCR-ELEC', 'CAT-DISPLAY', 'SUP-01', 'Màn chiếu điện tự động 120" (kèm remote)', 'Dalite', 'PW120ES', 4200000, 12),
  tpl('TV-SMART', 'CAT-DISPLAY', 'SUP-01', 'Smart Tivi 4K 65" treo tường (kèm cáp HDMI truyền hình ảnh)', 'Samsung', 'Crystal UHD 65AU7700', 16500000, 24),
  tpl('SIGNAGE', 'CAT-DISPLAY', 'SUP-01', 'Màn hình quảng cáo & thông báo điện tử Standee 55"', 'LG', 'Digital Signage 55UH5F', 22000000, 24),

  // 2. CAT-HVAC (2)
  tpl('AC-CASS', 'CAT-HVAC', 'SUP-02', 'Điều hòa âm trần Cassette 4 hướng thổi 4HP', 'Daikin', 'FCNQ36MV1', 38500000, 24),
  tpl('FAN-EXH', 'CAT-HVAC', 'SUP-02', 'Quạt thông gió âm trần nối ống', 'Panasonic', 'FV-24CU8', 1250000, 12),

  // 3. CAT-AUDIO (4)
  tpl('SPK-CEIL', 'CAT-AUDIO', 'SUP-01', 'Loa âm trần thông báo hành lang & thư viện', 'TOA', 'PC-658R', 950000, 24),
  tpl('SPK-PORT', 'CAT-AUDIO', 'SUP-01', 'Loa kéo di động công suất lớn kèm 2 micro', 'Acnos', 'CB405GD', 7200000, 12),
  tpl('AMP-PRO', 'CAT-AUDIO', 'SUP-01', 'Cục đẩy công suất âm thanh hội trường', 'Crown', 'XLi 2500', 15500000, 24),
  tpl('MIXER-AU', 'CAT-AUDIO', 'SUP-01', 'Bàn trộn âm thanh Digital / Analog 16 kênh', 'Yamaha', 'MG16XU', 14500000, 24),

  // 4. CAT-IT (5)
  tpl('PC-LAB', 'CAT-IT', 'SUP-01', 'Bộ máy tính trạm thực hành sinh viên (PC + Màn 24")', 'Dell', 'OptiPlex 7010 + P2422H', 17500000, 36),
  tpl('SRV-RACK', 'CAT-IT', 'SUP-01', 'Máy chủ Rack Server quản lý phòng Lab & CSDL nội bộ', 'Dell', 'PowerEdge R450', 85000000, 36),
  tpl('NAS-STOR', 'CAT-IT', 'SUP-01', 'Thiết bị lưu trữ mạng tập trung học liệu (NAS)', 'Synology', 'DiskStation DS923+ (4-bay)', 24000000, 36),
  tpl('KIOSK-TC', 'CAT-IT', 'SUP-01', 'Kiosk tra cứu thông tin cảm ứng 32" chân đứng', 'GoodM', 'Kiosk G-320', 28500000, 24),
  tpl('KIT-IOT', 'CAT-IT', 'SUP-01', 'Bộ Kit thực hành Mạng nhúng – Vi điều khiển – IoT', 'Arduino / Raspberry Pi', 'Lab Suitcase', 6500000, 12),

  // 5. CAT-NET (7)
  tpl('WIFI-AP', 'CAT-NET', 'SUP-01', 'Bộ phát Wi-Fi 6 ốp trần chịu tải cao', 'Aruba', 'Instant On AP22', 4800000, 24),
  tpl('SW-CORE', 'CAT-NET', 'SUP-01', 'Switch mạng 24 cổng Gigabit PoE', 'Cisco', 'Catalyst C1000-24P', 14500000, 36),
  tpl('RTR-FW', 'CAT-NET', 'SUP-01', 'Router cân bằng tải & Tường lửa bảo mật', 'Fortinet', 'FortiGate 60F', 18500000, 36),
  tpl('RACK-CAB', 'CAT-NET', 'SUP-01', 'Tủ mạng Rack 27U đứng kèm PDU', 'Vietrack', 'ECP 27U D800', 7500000, 24),
  tpl('IP-PHONE', 'CAT-NET', 'SUP-01', 'Điện thoại bàn IP nội bộ phòng ban', 'Yealink', 'SIP-T31P', 1450000, 12),
  tpl('HDMI-MTX', 'CAT-NET', 'SUP-01', 'Bộ chia / Ma trận chuyển mạch tín hiệu HDMI 4x4', 'Aten', 'VM0404HA', 6200000, 12),
  tpl('VCAM-PTZ', 'CAT-NET', 'SUP-01', 'Camera hội nghị truyền hình trực tuyến PTZ', 'Logitech', 'Rally Camera', 22500000, 24),

  // 6. CAT-SEC (6)
  tpl('CAM-DOME', 'CAT-SEC', 'SUP-01', 'Camera IP Dome hồng ngoại 4MP ốp trần (có mic)', 'Hikvision', 'DS-2CD2143G2-IU', 2650000, 24),
  tpl('CAM-BULL', 'CAT-SEC', 'SUP-01', 'Camera IP thân trụ hồng ngoại xa 40m hành lang', 'Hikvision', 'DS-2CD2T43G2-4I', 3100000, 24),
  tpl('CAM-PTZ', 'CAT-SEC', 'SUP-01', 'Camera IP Speed Dome quay quét 360° Zoom quang 25x', 'Hikvision', 'DS-2DE4425IW-DE', 11800000, 24),
  tpl('NVR-REC', 'CAT-SEC', 'SUP-01', 'Đầu ghi hình mạng NVR 32 kênh kèm ổ cứng giám sát', 'Hikvision', 'DS-7732NXI-I4 (2x HDD 6TB)', 16500000, 24),
  tpl('DOOR-ACC', 'CAT-SEC', 'SUP-01', 'Bộ khóa từ & đầu đọc thẻ từ / vân tay / khuôn mặt', 'ZKTeco', 'SpeedFace-V5L + Khóa từ 280kg', 6900000, 12),
  tpl('BARCODE', 'CAT-SEC', 'SUP-01', 'Đầu đọc mã vạch / RFID mượn trả sách & kho', 'Zebra', 'DS2208', 2400000, 24),

  // 7. CAT-OFFICE (7)
  tpl('MFP-COPY', 'CAT-OFFICE', 'SUP-05', 'Máy photocopy đa chức năng A3/A4 tốc độ cao', 'Ricoh', 'IM 4000', 46000000, 24),
  tpl('PRT-LASER', 'CAT-OFFICE', 'SUP-05', 'Máy in Laser mạng LAN in đảo mặt tự động', 'HP', 'LaserJet Pro 4003dn', 6800000, 12),
  tpl('SCN-ADF', 'CAT-OFFICE', 'SUP-05', 'Máy quét tài liệu hai mặt tốc độ cao (ADF)', 'Fujitsu', 'fi-8170', 14200000, 12),
  tpl('SHREDDER', 'CAT-OFFICE', 'SUP-05', 'Máy hủy tài liệu giấy vụn bảo mật', 'Silicon', 'PS-890C', 4800000, 12),
  tpl('QUEUE-SYS', 'CAT-OFFICE', 'SUP-05', 'Hệ thống lấy số thứ tự & màn hình LED gọi quầy', 'GoodM', 'QMS-03', 15000000, 12),
  tpl('TIME-ATT', 'CAT-OFFICE', 'SUP-05', 'Máy chấm công khuôn mặt & vân tay cán bộ', 'Ronald Jack', 'FacePro-008', 4500000, 12),
  tpl('WATER-DISP', 'CAT-OFFICE', 'SUP-05', 'Cây nước nóng lạnh / Máy lọc nước uống công cộng', 'Karofi', 'KAD-D66', 6200000, 24),

  // 8. CAT-POWER (4)
  tpl('LED-PANEL', 'CAT-POWER', 'SUP-04', 'Bộ đèn Panel LED 600x600 chiếu sáng phòng', 'Rạng Đông', 'P08 600x600 40W', 650000, 24),
  tpl('STAGE-LGT', 'CAT-POWER', 'SUP-04', 'Hệ thống đèn sân khấu Par LED + Moving Head + Bàn DMX', '', 'Par LED 54x3W + Beam 230 + DMX 512', 36000000, 12),
  tpl('EMG-LIGHT', 'CAT-POWER', 'SUP-04', 'Đèn chiếu sáng sự cố 2 mắt & Đèn chỉ dẫn EXIT', 'Kentom', 'KT-2200 + Exit KT-650', 780000, 12),
  tpl('PWR-PANEL', 'CAT-POWER', 'SUP-04', 'Tủ điện phân phối tầng (DB) kèm công tơ đo đếm thông minh', 'Schneider', 'Acti9 Enclosure + Smart Meter', 18000000, 24),

  // 9. CAT-FIRE (5)
  tpl('EXT-POWD', 'CAT-FIRE', 'SUP-04', 'Bình chữa cháy bột khô ABC 4kg (MFZL4)', 'Tomoken', 'TMK-VJ-ABC 4kg', 480000, 12),
  tpl('EXT-CO2', 'CAT-FIRE', 'SUP-04', 'Bình chữa cháy khí CO2 5kg (MT5)', 'Tomoken', 'TMK-VJ-CO2 5kg', 850000, 12),
  tpl('FIRE-PNL', 'CAT-FIRE', 'SUP-04', 'Tủ trung tâm báo cháy tự động 20 kênh', 'Hochiki', 'HCP-1008E', 14500000, 24),
  tpl('SMOKE-DET', 'CAT-FIRE', 'SUP-04', 'Cụm đầu báo khói quang học, chuông & nút nhấn khẩn cấp', 'Hochiki', 'SLV-24N + Chuông FBB-150I', 1200000, 12),
  tpl('HYDRANT', 'CAT-FIRE', 'SUP-04', 'Tủ họng nước chữa cháy vách tường (cuộn vòi + lăng phun)', '', 'Tủ PCCC 500x600 + Vòi D50 20m', 2600000, 12),

  // 10. CAT-FURN (7)
  tpl('DESK-STU', 'CAT-FURN', 'SUP-03', 'Bộ bàn ghế sinh viên 2–4 chỗ khung thép mặt gỗ Melamine', 'Hòa Phát (The One)', 'BSV105', 1650000, 12),
  tpl('DESK-LEC', 'CAT-FURN', 'SUP-03', 'Bộ bàn ghế giảng viên & bục gỗ thuyết trình', 'Hòa Phát', 'BGV103 + Bục phát biểu LT01', 3200000, 12),
  tpl('DESK-OFF', 'CAT-FURN', 'SUP-03', 'Cụm bàn làm việc văn phòng, bàn họp & ghế xoay lưới', 'Hòa Phát', 'LUX140 + Ghế GL217', 4800000, 12),
  tpl('SHELF-LIB', 'CAT-FURN', 'SUP-03', 'Giá sách sắt thư viện 2 mặt 5 tầng sơn tĩnh điện', 'Hòa Phát', 'GS2B2', 4500000, 24),
  tpl('RACK-WH', 'CAT-FURN', 'SUP-03', 'Kệ sắt tải nặng Selective 4 tầng chứa thiết bị kho', 'Vinatech', '200kg/tầng', 2900000, 24),
  tpl('CAB-FILE', 'CAT-FURN', 'SUP-03', 'Tủ sắt hồ sơ 2 cánh / Két sắt chống cháy / Tủ Locker SV', 'Hòa Phát', 'TU09K2 / Locker TU984-3K', 3800000, 24),
  tpl('CURTAIN', 'CAT-FURN', 'SUP-03', 'Hệ rèm cuốn cản sáng chống chói màn chiếu', '', 'Rèm cuốn Polyester cản sáng 100%', 2200000, 12),

  // 11. CAT-SPEC (4 — Medical Only)
  tpl('MED-BED', 'CAT-SPEC', 'SUP-05', 'Giường bệnh inox nâng đầu kèm đệm y tế & tủ đầu giường', '', 'Inox 304 1 tay quay', 4800000, 24),
  tpl('MED-CAB', 'CAT-SPEC', 'SUP-05', 'Tủ thuốc y tế inox kính 2 buồng & Xe tiêm sơ cứu', '', 'Inox 304 chuẩn Bộ Y tế', 5200000, 24),
  tpl('MED-DIAG', 'CAT-SPEC', 'SUP-05', 'Bộ thiết bị khám sơ cứu (Máy đo huyết áp, SpO2, Nhiệt kế, Cân)', 'Omron / Beurer', 'HEM-7156 + FT90', 4100000, 24),
  tpl('MED-AED', 'CAT-SPEC', 'SUP-05', 'Máy sốc tim tự động ngoài lồng ngực (AED) cấp cứu', 'Nihon Kohden', 'AED-3100', 39000000, 36)
]);

// Reusable functional presets across Building A1
const DEPT = {
  FACILITY: 'Phòng Quản Lý Cơ Sở Vật Chất',
  LECTURE: 'Khối Giảng Đường Trung Tâm',
  LIBRARY: 'Trung Tâm Thông Tin – Thư Viện',
  IT: 'Khoa Công Nghệ Thông Tin',
  RND: 'Viện Nghiên Cứu & Phát Triển'
};

const STANDARD_LECTURE_ITEMS = [
  ['PRJ-STD', 1], ['SCR-ELEC', 1], ['AC-CASS', 2], ['WIFI-AP', 1], ['CAM-DOME', 1],
  ['LED-PANEL', 1], ['SMOKE-DET', 1], ['EXT-POWD', 1], ['DESK-LEC', 1], ['DESK-STU', 2], ['CURTAIN', 1]
];

const SEMINAR_ITEMS = [
  ['PRJ-STD', 1], ['SCR-ELEC', 1], ['TV-SMART', 1], ['AC-CASS', 2], ['WIFI-AP', 1],
  ['CAM-DOME', 1], ['LED-PANEL', 1], ['SMOKE-DET', 1], ['DESK-LEC', 1], ['DESK-STU', 2], ['CURTAIN', 1]
];

const SMART_CLASSROOM_ITEMS = [
  ['PRJ-STD', 1], ['SCR-ELEC', 1], ['TV-SMART', 1], ['VCAM-PTZ', 1], ['AC-CASS', 2], ['WIFI-AP', 1],
  ['CAM-DOME', 1], ['DOOR-ACC', 1], ['LED-PANEL', 1], ['SMOKE-DET', 1], ['DESK-LEC', 1], ['DESK-STU', 2]
];

const BASE_LAB_ITEMS = [
  ['PC-LAB', 6], ['PRJ-STD', 1], ['SCR-ELEC', 1], ['AC-CASS', 2], ['FAN-EXH', 2], ['SW-CORE', 2], ['RACK-CAB', 1],
  ['DOOR-ACC', 1], ['CAM-DOME', 1], ['LED-PANEL', 1], ['SMOKE-DET', 1], ['EXT-CO2', 2], ['DESK-LEC', 1], ['CURTAIN', 1]
];

const RESEARCH_TOPIC_ITEMS = [
  ['TV-SMART', 1], ['KIT-IOT', 1], ['AC-CASS', 1], ['WIFI-AP', 1],
  ['LED-PANEL', 1], ['SMOKE-DET', 1], ['DESK-OFF', 2], ['CAB-FILE', 1]
];

const STUDY_GROUP_ITEMS = [
  ['TV-SMART', 1], ['AC-CASS', 1], ['WIFI-AP', 1], ['LED-PANEL', 1],
  ['SMOKE-DET', 1], ['DESK-STU', 2], ['DESK-OFF', 1], ['CURTAIN', 1]
];

const CAPSTONE_PROJECT_ITEMS = [
  ['PRJ-STD', 1], ['SCR-ELEC', 1], ['KIT-IOT', 2], ['AC-CASS', 1], ['WIFI-AP', 1],
  ['LED-PANEL', 1], ['SMOKE-DET', 1], ['EXT-CO2', 1], ['DESK-OFF', 2], ['CAB-FILE', 1]
];

const CREATIVE_SPACE_ITEMS = [
  ['TV-SMART', 1], ['AC-CASS', 1], ['WIFI-AP', 1], ['LED-PANEL', 1],
  ['SMOKE-DET', 1], ['DESK-STU', 2], ['CURTAIN', 1]
];

const MEETING_ROOM_ITEMS = [
  ['TV-SMART', 1], ['VCAM-PTZ', 1], ['HDMI-MTX', 1], ['IP-PHONE', 1], ['AC-CASS', 1],
  ['WIFI-AP', 1], ['LED-PANEL', 1], ['SMOKE-DET', 1], ['DESK-OFF', 2], ['CURTAIN', 1]
];

const RESTROOM_ITEMS = [['FAN-EXH', 2], ['LED-PANEL', 1]];

const plan = (department, description, items, extra = {}) => ({
  department,
  description,
  items,
  ...extra
});

const restroomPlan = (description) => plan(DEPT.FACILITY, description, RESTROOM_ITEMS, { skipQuota: true });

/**
 * Room-by-room placement plan for all 91 rooms in Building A1.
 * Every room gets functionally accurate equipment strictly from EQUIPMENT_TEMPLATES.
 */
export const ROOM_EQUIPMENT_PLAN = {
  // ==================== CORE DEMO & WAREHOUSE ====================
  'KHO-01': plan(
    DEPT.FACILITY,
    'Kho thiết bị dự phòng trung tâm Tòa A1 & vật tư kỹ thuật',
    [
      ['RACK-WH', 2], ['DOOR-ACC', 1], ['CAM-DOME', 1], ['BARCODE', 1], ['FAN-EXH', 1],
      ['LED-PANEL', 1], ['SMOKE-DET', 1], ['EXT-POWD', 1], ['EXT-CO2', 1],
      ['PRJ-STD', 2, { status: EQUIPMENT_STATUSES.IN_STOCK, customFirstCode: 'EQ-PRJ-KHO-01', customFirstQr: 'QR-EQ-PRJ-KHO-01' }],
      ['SCR-ELEC', 1, { status: EQUIPMENT_STATUSES.IN_STOCK }],
      ['TV-SMART', 1, { status: EQUIPMENT_STATUSES.IN_STOCK }],
      ['AC-CASS', 1, { status: EQUIPMENT_STATUSES.IN_STOCK }],
      ['SPK-PORT', 2, { status: EQUIPMENT_STATUSES.IN_STOCK }],
      ['PC-LAB', 2, { status: EQUIPMENT_STATUSES.IN_STOCK }],
      ['WIFI-AP', 2, { status: EQUIPMENT_STATUSES.IN_STOCK }],
      ['SW-CORE', 1, { status: EQUIPMENT_STATUSES.IN_STOCK }],
      ['PRT-LASER', 1, { status: EQUIPMENT_STATUSES.IN_STOCK }]
    ],
    { skipQuota: true }
  ),

  'A1-101': plan(
    DEPT.LECTURE,
    'Phòng học thông minh tiêu chuẩn Tầng 1',
    [
      ['PRJ-STD', 1, { customFirstCode: 'EQ-PRJ-101', customFirstQr: 'QR-EQ-PRJ-101-VERIFIED' }],
      ['SCR-ELEC', 1],
      ['AC-CASS', 1],
      ['AC-CASS', 1, { status: EQUIPMENT_STATUSES.BROKEN, customFirstCode: 'EQ-AC-101-B', customFirstQr: 'QR-EQ-AC-101-B', estimated_repair_cost: 3500000 }],
      ['DOOR-ACC', 1], ['CAM-DOME', 2], ['WIFI-AP', 1], ['LED-PANEL', 1], ['SMOKE-DET', 1], ['DESK-LEC', 1], ['DESK-STU', 2]
    ],
    { explicitQuota: { 'CAT-DISPLAY': 2, 'CAT-HVAC': 2, 'CAT-SEC': 3, 'CAT-NET': 1 } }
  ),

  // ==================== FLOOR 1 (10 BLUEPRINT ROOMS) ====================
  'A1-PH-TB': plan(DEPT.LECTURE, 'Phòng học lý thuyết & tự học liên thông góc Tây Bắc (65 chỗ)', STANDARD_LECTURE_ITEMS),
  'A1-PTV': plan(DEPT.LIBRARY, 'Thư viện trung tâm lớn (250 chỗ đọc, mượn trả mã vạch & tra cứu số)', [
    ['AC-CASS', 4], ['BARCODE', 2], ['KIOSK-TC', 2], ['NAS-STOR', 1], ['SIGNAGE', 1],
    ['WIFI-AP', 3], ['SPK-CEIL', 2], ['CAM-DOME', 2], ['SHELF-LIB', 4],
    ['CAB-FILE', 2, { customName: 'Tủ Locker sắt gửi đồ sinh viên cửa Thư viện' }],
    ['WATER-DISP', 1], ['LED-PANEL', 2], ['SMOKE-DET', 2], ['EXT-POWD', 2]
  ]),
  'A1-K1': plan(DEPT.FACILITY, 'Kho kỹ thuật mạng trung tâm & lưu trữ giám sát an ninh Tầng 1', [
    ['RTR-FW', 1], ['SW-CORE', 1], ['RACK-CAB', 1], ['NVR-REC', 1], ['DOOR-ACC', 1],
    ['RACK-WH', 1], ['FAN-EXH', 1], ['LED-PANEL', 1], ['SMOKE-DET', 1], ['EXT-CO2', 1]
  ], { skipQuota: true }),
  'A1-K2': plan(DEPT.FACILITY, 'Kho kỹ thuật điện phân phối & vật tư bảo trì Tầng 1', [
    ['PWR-PANEL', 1], ['RACK-WH', 2], ['FAN-EXH', 1], ['LED-PANEL', 1], ['SMOKE-DET', 1], ['EXT-POWD', 1], ['EXT-CO2', 1]
  ], { skipQuota: true }),
  'A1-PTH2': plan(DEPT.LIBRARY, 'Phòng tự học lớn mở rộng góc Tây Nam (120 chỗ)', [
    ['AC-CASS', 2], ['WIFI-AP', 2], ['CAM-DOME', 1], ['WATER-DISP', 1], ['LED-PANEL', 2],
    ['SMOKE-DET', 1], ['EXT-POWD', 1], ['DESK-STU', 3], ['CURTAIN', 1]
  ]),
  'A1-KHO-TAY': plan(DEPT.FACILITY, 'Kho phụ & điểm trực PCCC hành lang cánh Tây Tầng 1', [
    ['RACK-WH', 1], ['FAN-EXH', 1], ['CAM-BULL', 1], ['EMG-LIGHT', 1], ['HYDRANT', 1], ['EXT-POWD', 2], ['SMOKE-DET', 1]
  ], { skipQuota: true }),
  'A1-CV': plan('Phòng Hành Chính – Bảo Vệ', 'Đại sảnh cổng vào chính, tra cứu thông tin, an ninh & trực PCCC trung tâm', [
    ['SIGNAGE', 2], ['KIOSK-TC', 1], ['CAM-PTZ', 1], ['CAM-BULL', 2], ['TIME-ATT', 1],
    ['IP-PHONE', 1], ['SPK-CEIL', 2], ['FIRE-PNL', 1], ['MED-AED', 1], ['EMG-LIGHT', 2], ['HYDRANT', 1]
  ]),
  'A1-WC-NAM': restroomPlan('Khu vệ sinh nam cánh Đông Tầng 1'),
  'A1-WC-NU': restroomPlan('Khu vệ sinh nữ cánh Đông Tầng 1'),
  'A1-PH-DN': plan(DEPT.LECTURE, 'Giảng đường lý thuyết lớn góc Đông Nam (120 chỗ)', [
    ['PRJ-STD', 2], ['SCR-ELEC', 2], ['AC-CASS', 2], ['SPK-CEIL', 2], ['WIFI-AP', 2], ['CAM-DOME', 2],
    ['LED-PANEL', 2], ['SMOKE-DET', 1], ['EXT-POWD', 1], ['DESK-LEC', 1], ['DESK-STU', 3], ['CURTAIN', 2]
  ]),

  // ==================== FLOOR 2 (22 ROOMS INCL. A1-201) ====================
  'A1-201': plan(DEPT.IT, 'Phòng thực hành mạng máy tính & quản trị Server nội bộ', [...BASE_LAB_ITEMS, ['SRV-RACK', 1], ['RTR-FW', 1]]),
  'A1-202': plan(DEPT.LECTURE, 'Phòng học lý thuyết tiêu chuẩn Tầng 2', STANDARD_LECTURE_ITEMS),
  'A1-203': plan(DEPT.IT, 'Phòng thực hành máy tính & ngoại ngữ đa phương tiện', BASE_LAB_ITEMS),
  'A1-204': plan(DEPT.IT, 'Phòng thực hành AI & Đồ họa đa phương tiện', [...BASE_LAB_ITEMS, ['HDMI-MTX', 1]]),
  'A1-205': plan(DEPT.RND, 'Phòng nghiên cứu chuyên đề Tầng 2', RESEARCH_TOPIC_ITEMS),
  'A1-206': plan(DEPT.LECTURE, 'Phòng tự học & thảo luận nhóm Tầng 2', STUDY_GROUP_ITEMS),
  'A1-207': plan(DEPT.LECTURE, 'Phòng Seminar học thuật Tầng 2', SEMINAR_ITEMS),
  'A1-208': plan(DEPT.LECTURE, 'Phòng bảo vệ đồ án chuyên ngành Tầng 2', SEMINAR_ITEMS),
  'A1-209': plan(DEPT.LECTURE, 'Phòng diễn đàn khoa học Tầng 2', SEMINAR_ITEMS),
  'A1-210': plan(DEPT.LECTURE, 'Phòng Workshop quốc tế Tầng 2', SEMINAR_ITEMS),
  'A1-211': plan(DEPT.LECTURE, 'Phòng học lý thuyết góc Đông Bắc Tầng 2', STANDARD_LECTURE_ITEMS),
  'A1-212': plan(DEPT.LECTURE, 'Phòng học lý thuyết góc Đông Bắc Tầng 2', STANDARD_LECTURE_ITEMS),
  'A1-213': plan(DEPT.IT, 'Phòng thực hiện đồ án tốt nghiệp Tầng 2', CAPSTONE_PROJECT_ITEMS),
  'A1-214': plan(DEPT.LECTURE, 'Không gian sáng tạo & làm việc nhóm sinh viên Tầng 2', CREATIVE_SPACE_ITEMS),
  'A1-215': plan(DEPT.LECTURE, 'Phòng học thông minh Smart Classroom 1 (Tầng 2)', SMART_CLASSROOM_ITEMS),
  'A1-216': plan(DEPT.LECTURE, 'Phòng học thông minh Smart Classroom 2 (Tầng 2)', SMART_CLASSROOM_ITEMS),
  'A1-217': plan(DEPT.LECTURE, 'Phòng học tương tác trực tuyến 1 (Tầng 2)', SMART_CLASSROOM_ITEMS),
  'A1-218': plan(DEPT.LECTURE, 'Phòng học tương tác trực tuyến 2 (Tầng 2)', SMART_CLASSROOM_ITEMS),
  'A1-NC-01': plan(DEPT.RND, 'Phòng Nghiên cứu & Phát triển 1 (Dãy Bắc Trung tâm Tầng 2)', [
    ['PC-LAB', 2], ['KIT-IOT', 2], ['TV-SMART', 1], ['AC-CASS', 2], ['WIFI-AP', 1], ['DOOR-ACC', 1],
    ['CAM-DOME', 1], ['WATER-DISP', 1], ['LED-PANEL', 2], ['SMOKE-DET', 1], ['EXT-CO2', 1], ['DESK-OFF', 2], ['CAB-FILE', 2]
  ]),
  'A1-NC-02': plan(DEPT.RND, 'Trung tâm Nghiên cứu Ứng dụng 2 (Dãy Nam Trung tâm Tầng 2)', [
    ['PC-LAB', 2], ['KIT-IOT', 2], ['TV-SMART', 1], ['AC-CASS', 2], ['FAN-EXH', 1], ['WIFI-AP', 1],
    ['DOOR-ACC', 1], ['CAM-DOME', 1], ['LED-PANEL', 2], ['SMOKE-DET', 1], ['EXT-CO2', 1], ['DESK-OFF', 2], ['CAB-FILE', 2]
  ]),
  'A1-WC-NU-T2': restroomPlan('Khu vệ sinh nữ Tầng 2'),
  'A1-WC-NAM-T2': restroomPlan('Khu vệ sinh nam Tầng 2'),

  // ==================== FLOOR 3 (23 ROOMS) ====================
  'A1-301': plan(DEPT.LECTURE, 'Phòng học lý thuyết tiêu chuẩn Tầng 3', STANDARD_LECTURE_ITEMS),
  'A1-302': plan(DEPT.LECTURE, 'Phòng học lý thuyết tiêu chuẩn Tầng 3', STANDARD_LECTURE_ITEMS),
  'A1-303': plan(DEPT.IT, 'Phòng Lab Vi điều khiển, Mạng nhúng & Thực hành IoT 1', [...BASE_LAB_ITEMS, ['KIT-IOT', 3]]),
  'A1-304': plan(DEPT.IT, 'Phòng Lab Máy tính, AI & Thực hành Hệ thống nhúng 2', [...BASE_LAB_ITEMS, ['KIT-IOT', 3]]),
  'A1-305': plan(DEPT.RND, 'Phòng nghiên cứu chuyên đề Tầng 3', RESEARCH_TOPIC_ITEMS),
  'A1-306': plan(DEPT.LECTURE, 'Phòng tự học & thảo luận nhóm Tầng 3', STUDY_GROUP_ITEMS),
  'A1-307': plan(DEPT.LECTURE, 'Phòng Seminar học thuật Tầng 3', SEMINAR_ITEMS),
  'A1-308': plan(DEPT.LECTURE, 'Phòng bảo vệ đồ án Tầng 3', SEMINAR_ITEMS),
  'A1-309': plan(DEPT.LECTURE, 'Phòng diễn đàn khoa học Tầng 3', SEMINAR_ITEMS),
  'A1-310': plan(DEPT.LECTURE, 'Phòng Workshop kỹ năng Tầng 3', SEMINAR_ITEMS),
  'A1-311': plan(DEPT.LECTURE, 'Phòng học lý thuyết góc Đông Bắc Tầng 3', STANDARD_LECTURE_ITEMS),
  'A1-312': plan(DEPT.LECTURE, 'Phòng học lý thuyết góc Đông Bắc Tầng 3', STANDARD_LECTURE_ITEMS),
  'A1-313': plan(DEPT.IT, 'Phòng thực hiện đồ án tốt nghiệp Tầng 3', CAPSTONE_PROJECT_ITEMS),
  'A1-314': plan(DEPT.LECTURE, 'Không gian sáng tạo sinh viên Tầng 3', CREATIVE_SPACE_ITEMS),
  'A1-315': plan(DEPT.LECTURE, 'Phòng học thông minh Smart Classroom 1 (Tầng 3)', SMART_CLASSROOM_ITEMS),
  'A1-316': plan(DEPT.LECTURE, 'Phòng học thông minh Smart Classroom 2 (Tầng 3)', SMART_CLASSROOM_ITEMS),
  'A1-317': plan(DEPT.LECTURE, 'Phòng học tương tác trực tuyến 1 (Tầng 3)', SMART_CLASSROOM_ITEMS),
  'A1-318': plan(DEPT.LECTURE, 'Phòng học tương tác trực tuyến 2 (Tầng 3)', SMART_CLASSROOM_ITEMS),
  'A1-319': plan(DEPT.LECTURE, 'Giảng đường lý thuyết trung tâm Tầng 3', STANDARD_LECTURE_ITEMS),
  'A1-NC-T3': plan(DEPT.RND, 'Phòng Nghiên cứu & Phát triển Tầng 3', [
    ['PC-LAB', 2], ['KIT-IOT', 2], ['TV-SMART', 1], ['AC-CASS', 2], ['WIFI-AP', 1], ['DOOR-ACC', 1],
    ['CAM-DOME', 1], ['LED-PANEL', 2], ['SMOKE-DET', 1], ['EXT-CO2', 1], ['DESK-OFF', 2], ['CAB-FILE', 2]
  ]),
  'A1-YT-T3': plan('Trạm Y Tế Học Đường', 'Phòng Y tế & Sơ cấp cứu sinh viên, giảng viên Tầng 3', [
    ['MED-BED', 2], ['MED-CAB', 1], ['MED-DIAG', 1], ['MED-AED', 1], ['AC-CASS', 1], ['FAN-EXH', 1],
    ['IP-PHONE', 1], ['WATER-DISP', 1], ['WIFI-AP', 1], ['LED-PANEL', 1], ['SMOKE-DET', 1], ['DESK-OFF', 1], ['CAB-FILE', 1]
  ]),
  'A1-WC-NU-T3': restroomPlan('Khu vệ sinh nữ Tầng 3'),
  'A1-WC-NAM-T3': restroomPlan('Khu vệ sinh nam Tầng 3'),

  // ==================== FLOOR 4 (22 ROOMS) ====================
  'A1-401': plan(DEPT.LECTURE, 'Phòng học lý thuyết tiêu chuẩn Tầng 4', STANDARD_LECTURE_ITEMS),
  'A1-402': plan(DEPT.LECTURE, 'Phòng học lý thuyết tiêu chuẩn Tầng 4', STANDARD_LECTURE_ITEMS),
  'A1-403': plan(DEPT.IT, 'Phòng Lab Mạng nâng cao & Điện toán đám mây Tầng 4', [...BASE_LAB_ITEMS, ['SRV-RACK', 1], ['HDMI-MTX', 1]]),
  'A1-404': plan(DEPT.IT, 'Phòng Lab An toàn thông tin & Tường lửa mạng Tầng 4', [...BASE_LAB_ITEMS, ['RTR-FW', 1]]),
  'A1-405': plan(DEPT.IT, 'Văn phòng Khoa Công nghệ thông tin', [
    ['NAS-STOR', 1], ['PRT-LASER', 1], ['SHREDDER', 1], ['IP-PHONE', 1], ['WATER-DISP', 1],
    ['AC-CASS', 1], ['WIFI-AP', 1], ['LED-PANEL', 1], ['SMOKE-DET', 1], ['DESK-OFF', 2], ['CAB-FILE', 2]
  ]),
  'A1-406': plan('Khoa Kinh Tế & Quản Trị', 'Văn phòng Khoa Kinh tế', [
    ['PRT-LASER', 1], ['SHREDDER', 1], ['IP-PHONE', 1], ['WATER-DISP', 1], ['AC-CASS', 1],
    ['WIFI-AP', 1], ['LED-PANEL', 1], ['SMOKE-DET', 1], ['DESK-OFF', 2], ['CAB-FILE', 2]
  ]),
  'A1-407': plan(DEPT.LECTURE, 'Phòng Seminar chuyên đề Tầng 4', SEMINAR_ITEMS),
  'A1-408': plan(DEPT.LECTURE, 'Phòng bảo vệ khóa luận tốt nghiệp Tầng 4', SEMINAR_ITEMS),
  'A1-409': plan('Ban Chủ Nhiệm Liên Khoa', 'Phòng họp Khoa trực tuyến & giao ban chuyên môn', MEETING_ROOM_ITEMS),
  'A1-410': plan('Hội Đồng Khoa Học & Đào Tạo', 'Phòng họp Hội đồng khoa học', MEETING_ROOM_ITEMS),
  'A1-411': plan(DEPT.LECTURE, 'Phòng học lý thuyết góc Đông Bắc Tầng 4', STANDARD_LECTURE_ITEMS),
  'A1-412': plan(DEPT.LECTURE, 'Phòng học lý thuyết góc Đông Bắc Tầng 4', STANDARD_LECTURE_ITEMS),
  'A1-413': plan('Khoa Ngoại Ngữ', 'Văn phòng Khoa Ngoại ngữ', [
    ['MFP-COPY', 1], ['PRT-LASER', 1], ['IP-PHONE', 1], ['WATER-DISP', 1], ['AC-CASS', 1],
    ['WIFI-AP', 1], ['LED-PANEL', 1], ['SMOKE-DET', 1], ['DESK-OFF', 2], ['CAB-FILE', 2]
  ]),
  'A1-414': plan('Phòng Khảo Thí & Đảm Bảo Chất Lượng', 'Tổ Khảo thí, lưu trữ đề thi bảo mật & Đảm bảo chất lượng', [
    ['PRT-LASER', 1], ['SCN-ADF', 1], ['SHREDDER', 1], ['DOOR-ACC', 1], ['CAM-DOME', 2],
    ['IP-PHONE', 1], ['AC-CASS', 1], ['WIFI-AP', 1], ['LED-PANEL', 1], ['SMOKE-DET', 1], ['DESK-OFF', 2],
    ['CAB-FILE', 2, { customName: 'Tủ sắt niêm phong đề thi & Két chống cháy Khảo thí' }]
  ]),
  'A1-415': plan('Phòng Công Tác Sinh Viên', 'Khu Tiếp sinh viên một cửa 1 (Lấy số thứ tự & giải quyết học vụ)', [
    ['QUEUE-SYS', 1], ['KIOSK-TC', 1], ['TV-SMART', 1], ['PRT-LASER', 1], ['IP-PHONE', 1],
    ['CAM-DOME', 1], ['AC-CASS', 1], ['WIFI-AP', 1], ['LED-PANEL', 1], ['SMOKE-DET', 1], ['DESK-OFF', 2]
  ]),
  'A1-416': plan('Phòng Công Tác Sinh Viên', 'Khu Tiếp sinh viên một cửa 2 (Học bổng & chế độ chính sách)', [
    ['QUEUE-SYS', 1], ['TV-SMART', 1], ['PRT-LASER', 1], ['IP-PHONE', 1], ['CAM-DOME', 1],
    ['AC-CASS', 1], ['WIFI-AP', 1], ['LED-PANEL', 1], ['SMOKE-DET', 1], ['DESK-OFF', 2], ['CAB-FILE', 1]
  ]),
  'A1-417': plan('Ban Cố Vấn Học Tập', 'Phòng Tư vấn học vụ & hỗ trợ học tập sinh viên', [
    ['TV-SMART', 1], ['IP-PHONE', 1], ['WATER-DISP', 1], ['AC-CASS', 1], ['WIFI-AP', 1],
    ['LED-PANEL', 1], ['SMOKE-DET', 1], ['DESK-OFF', 2], ['CAB-FILE', 1]
  ]),
  'A1-418': plan('Phòng Kế Hoạch – Tài Vụ', 'Phòng Kế hoạch Tài vụ (Thu học phí, lưu trữ chứng từ & két sắt chống cháy)', [
    ['PRT-LASER', 1], ['SCN-ADF', 1], ['SHREDDER', 1], ['DOOR-ACC', 1], ['CAM-DOME', 2], ['IP-PHONE', 1],
    ['AC-CASS', 1], ['WIFI-AP', 1], ['LED-PANEL', 1], ['SMOKE-DET', 1], ['EXT-CO2', 1], ['DESK-OFF', 2],
    ['CAB-FILE', 2, { customName: 'Két sắt chống cháy & Tủ sắt bảo mật chứng từ Tài vụ' }]
  ]),
  'A1-PĐT': plan('Phòng Quản Lý Đào Tạo', 'Phòng Đào tạo trung tâm (Điều phối lịch giảng dạy & hồ sơ học vụ)', [
    ['MFP-COPY', 1], ['PRT-LASER', 1], ['SCN-ADF', 1], ['SHREDDER', 1], ['TIME-ATT', 1], ['IP-PHONE', 2], ['WATER-DISP', 1],
    ['AC-CASS', 2], ['WIFI-AP', 1], ['CAM-DOME', 1], ['LED-PANEL', 2], ['SMOKE-DET', 1], ['DESK-OFF', 3], ['CAB-FILE', 3]
  ]),
  'A1-PHT': plan('Văn Phòng Trường & Hợp Tác Quốc Tế', 'Phòng Hội thảo Khoa học Quốc tế (90 chỗ)', [
    ['PRJ-STD', 1], ['SCR-ELEC', 1], ['TV-SMART', 1], ['MIXER-AU', 1], ['AMP-PRO', 1], ['HDMI-MTX', 1], ['VCAM-PTZ', 1],
    ['AC-CASS', 2], ['WIFI-AP', 2], ['CAM-DOME', 1], ['LED-PANEL', 2], ['SMOKE-DET', 1], ['EXT-POWD', 1], ['DESK-LEC', 1], ['DESK-OFF', 2], ['CURTAIN', 2]
  ]),
  'A1-WC-NU-T4': restroomPlan('Khu vệ sinh nữ Tầng 4'),
  'A1-WC-NAM-T4': restroomPlan('Khu vệ sinh nam Tầng 4'),

  // ==================== FLOOR 5 (12 ROOMS) ====================
  'A1-501': plan('Đoàn Thanh Niên – Hội Sinh Viên', 'Phòng sinh hoạt chung, CLB văn nghệ & giao lưu sinh viên (80 chỗ)', [
    ['TV-SMART', 1], ['SPK-PORT', 1], ['AC-CASS', 2], ['WIFI-AP', 1], ['WATER-DISP', 1],
    ['SHELF-LIB', 2], ['LED-PANEL', 2], ['SMOKE-DET', 1], ['EXT-POWD', 1], ['DESK-STU', 2]
  ]),
  'A1-507': plan('Đoàn Thanh Niên – Hội Sinh Viên', 'Phòng đa năng & sinh hoạt Câu lạc bộ học thuật (60 chỗ)', [
    ['PRJ-STD', 1], ['SCR-ELEC', 1], ['SPK-PORT', 1], ['AC-CASS', 2], ['WIFI-AP', 1],
    ['CAM-DOME', 1], ['LED-PANEL', 1], ['SMOKE-DET', 1], ['DESK-LEC', 1], ['DESK-STU', 2], ['CURTAIN', 1]
  ]),
  'A1-PHL': plan(DEPT.LECTURE, 'Phòng Học Lớn & Hội trường đa năng Tầng 5 (180 chỗ, sân khấu âm thanh ánh sáng)', [
    ['PRJ-STD', 2], ['SCR-ELEC', 2], ['AMP-PRO', 2], ['MIXER-AU', 1], ['STAGE-LGT', 1], ['HDMI-MTX', 1],
    ['AC-CASS', 3], ['WIFI-AP', 2], ['CAM-DOME', 2], ['LED-PANEL', 2], ['EMG-LIGHT', 2], ['SMOKE-DET', 2],
    ['EXT-POWD', 2], ['DESK-LEC', 1], ['DESK-STU', 4], ['CURTAIN', 2]
  ]),
  'A1-HOP': plan('Ban Giám Hiệu & Hội Đồng Trường', 'Phòng họp chuyên môn & Hội đồng Tầng 5 (20 chỗ)', MEETING_ROOM_ITEMS),
  'A1-PGV': plan('Hội Đồng Giảng Viên', 'Phòng nghỉ & làm việc chung của Giảng viên Tầng 5', [
    ['MFP-COPY', 1], ['PRT-LASER', 1], ['TIME-ATT', 1], ['IP-PHONE', 1], ['WATER-DISP', 1],
    ['AC-CASS', 2], ['WIFI-AP', 1], ['LED-PANEL', 2], ['SMOKE-DET', 1], ['DESK-OFF', 3], ['CAB-FILE', 2]
  ]),
  'A1-XTC': plan('Khoa Kiến Trúc & Mỹ Thuật Ứng Dụng', 'Xưởng thực hành thủ công & chế tác mô hình Tầng 5', [
    ['FAN-EXH', 2], ['RACK-WH', 2], ['WIFI-AP', 1], ['CAM-DOME', 1], ['LED-PANEL', 1], ['SMOKE-DET', 1], ['EXT-POWD', 2], ['DESK-OFF', 2]
  ]),
  'A1-503': plan('Trung Tâm Truyền Thông & Học Liệu Số', 'Studio thu âm, quay bài giảng E-learning & truyền thông Tầng 5', [
    ['MIXER-AU', 1], ['STAGE-LGT', 1], ['TV-SMART', 1], ['HDMI-MTX', 1], ['VCAM-PTZ', 1], ['DOOR-ACC', 1],
    ['AC-CASS', 1], ['FAN-EXH', 1], ['WIFI-AP', 1], ['LED-PANEL', 1], ['SMOKE-DET', 1], ['EXT-CO2', 1], ['DESK-OFF', 1]
  ]),
  'A1-504': plan('Trung Tâm Truyền Thông & Học Liệu Số', 'Rạp chiếu phim tư liệu & trình chiếu học thuật Tầng 5 (45 chỗ)', [
    ['PRJ-STD', 1], ['SCR-ELEC', 1], ['AMP-PRO', 1], ['HDMI-MTX', 1], ['AC-CASS', 2], ['FAN-EXH', 1],
    ['CAM-DOME', 1], ['EMG-LIGHT', 1], ['SMOKE-DET', 1], ['EXT-CO2', 1], ['CURTAIN', 2]
  ]),
  'A1-KHO-T5': plan(DEPT.FACILITY, 'Phòng kho thiết bị sự kiện & tủ điện kỹ thuật Tầng 5', [
    ['PWR-PANEL', 1], ['SW-CORE', 1], ['RACK-CAB', 1], ['RACK-WH', 2], ['DOOR-ACC', 1],
    ['FAN-EXH', 1], ['LED-PANEL', 1], ['SMOKE-DET', 1], ['EXT-POWD', 1], ['EXT-CO2', 1]
  ], { skipQuota: true }),
  'A1-SBC': plan(DEPT.FACILITY, 'Sảnh ban công ngắm cảnh & không gian mở mặt Nam Tầng 5', [
    ['SIGNAGE', 1], ['CAM-BULL', 2], ['SPK-CEIL', 2], ['WIFI-AP', 1], ['WATER-DISP', 1], ['EMG-LIGHT', 2], ['HYDRANT', 1], ['EXT-POWD', 1]
  ]),
  'A1-WC-NU-T5': restroomPlan('Khu vệ sinh nữ Tầng 5'),
  'A1-WC-NAM-T5': restroomPlan('Khu vệ sinh nam Tầng 5')
};

const normalizeAsciiSlug = (roomCode) =>
  String(roomCode || '')
    .toUpperCase()
    .replace(/Đ/g, 'D')
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Deterministically builds Equipment documents & per-room required_equipment quotas
 * across all 91 rooms in Building A1.
 */
export const buildBuildingCatalogDataset = ({
  categoriesByCode,
  roomsByCode,
  suppliersByCode,
  referenceDate = new Date()
}) => {
  const equipmentDocs = [];
  const roomUpdates = [];
  let globalSeq = 1;

  for (const [roomCode, roomSpec] of Object.entries(ROOM_EQUIPMENT_PLAN)) {
    const roomDoc = roomsByCode.get(roomCode.toUpperCase());
    if (!roomDoc) continue;

    const roomSlug = normalizeAsciiSlug(roomCode).replace(/^A1-/, '');
    const categoryCountInRoom = new Map();
    const templateSeqInRoom = new Map();

    for (const [templateCode, qty = 1, options = {}] of roomSpec.items || []) {
      const itemTpl = EQUIPMENT_TEMPLATES[templateCode];
      if (!itemTpl) {
        throw new Error(`[CatalogBuilder] Unknown equipment template: ${templateCode}`);
      }
      const catDoc = categoriesByCode.get(itemTpl.categoryCode);
      if (!catDoc) {
        throw new Error(`[CatalogBuilder] Missing category: ${itemTpl.categoryCode}`);
      }
      const supDoc = suppliersByCode.get(itemTpl.supplierCode) || null;
      const itemStatus = options.status || EQUIPMENT_STATUSES.IN_USE;
      const cleanTplCode = templateCode.replace(/[^A-Z0-9]/g, '');

      for (let i = 0; i < qty; i += 1) {
        const nextIdx = (templateSeqInRoom.get(templateCode) || 0) + 1;
        templateSeqInRoom.set(templateCode, nextIdx);

        const code = i === 0 && options.customFirstCode
          ? options.customFirstCode
          : `EQ-${roomSlug}-${cleanTplCode}-${String(nextIdx).padStart(2, '0')}`;
        const qr_code = i === 0 && options.customFirstQr ? options.customFirstQr : `QR-${code}`;
        const serial_number = `SN-${cleanTplCode}-${String(20260000 + globalSeq)}`;

        // Staggered purchase & warranty dates (~every 65th active item expires within ~22 days for UC-6.1 demo)
        const isExpiringSoonDemo = itemStatus === EQUIPMENT_STATUSES.IN_USE && globalSeq % 65 === 0;
        const purchaseMonthsAgo = isExpiringSoonDemo
          ? Math.max(1, itemTpl.warrantyMonths - 1)
          : 4 + (globalSeq % 8);
        const purchaseDate = new Date(referenceDate.getTime() - purchaseMonthsAgo * 30 * 24 * 3600 * 1000);
        const warrantyExpiry = isExpiringSoonDemo
          ? new Date(referenceDate.getTime() + (12 + (globalSeq % 14)) * 24 * 3600 * 1000)
          : new Date(purchaseDate.getTime() + itemTpl.warrantyMonths * 30.4 * 24 * 3600 * 1000);

        const depRate = catDoc.depreciation_rate || 20;
        const yearsUsed = Math.max(0, (referenceDate.getTime() - purchaseDate.getTime()) / (365.25 * 24 * 3600 * 1000));
        const remainingValue = itemStatus === EQUIPMENT_STATUSES.IN_STOCK
          ? itemTpl.price
          : Math.max(Math.round(itemTpl.price * 0.2), Math.round(itemTpl.price * (1 - (yearsUsed * depRate) / 100)));

        const baseName = options.customName || itemTpl.name;
        equipmentDocs.push({
          code,
          qr_code,
          name: qty > 1 ? `${baseName} #${nextIdx}` : baseName,
          serial_number,
          brand: itemTpl.brand,
          model: itemTpl.model,
          category_id: catDoc._id,
          room_id: roomDoc._id,
          supplier_id: supDoc ? supDoc._id : null,
          price: itemTpl.price,
          remaining_value: remainingValue,
          estimated_repair_cost: options.estimated_repair_cost || 0,
          purchase_date: purchaseDate,
          warranty_expiry: warrantyExpiry,
          warranty_status: 'active',
          depreciation_rate: depRate,
          status: itemStatus,
          specs: {
            catalog_code: templateCode,
            warranty_months: itemTpl.warrantyMonths,
            ...(templateCode === 'TV-SMART' ? { video_connection: 'Cáp tín hiệu HDMI 2.0 (PART-HDMI)' } : {})
          }
        });

        if (itemStatus === EQUIPMENT_STATUSES.IN_USE) {
          categoryCountInRoom.set(itemTpl.categoryCode, (categoryCountInRoom.get(itemTpl.categoryCode) || 0) + 1);
        }
        globalSeq += 1;
      }
    }

    const quotaPairs = roomSpec.skipQuota
      ? []
      : roomSpec.explicitQuota
        ? Object.entries(roomSpec.explicitQuota)
        : Array.from(categoryCountInRoom.entries());

    const required_equipment = quotaPairs
      .map(([catCode, quantity]) => {
        const cDoc = categoriesByCode.get(catCode);
        return cDoc ? { category_id: cDoc._id, quantity } : null;
      })
      .filter(Boolean);

    roomUpdates.push({
      roomId: roomDoc._id,
      code: roomDoc.code,
      department: roomSpec.department || roomDoc.department,
      description: roomSpec.description || roomDoc.description || '',
      required_equipment
    });
  }

  return { equipmentDocs, roomUpdates };
};
