/**
 * Campus Building Master Data: Tòa Nhà A1 (5 Tầng)
 * Chuẩn kiến trúc: Các phòng bố trí dọc theo các mép ngoài tòa nhà (đón ánh sáng & gió tự nhiên),
 * Trung tâm là trục hành lang giao thông chính (3.5m), lõi thang máy và cầu thang thoát hiểm.
 */

export const ROOM_CATEGORIES = {
  academic: {
    id: 'academic',
    name: 'Học tập • Lý thuyết',
    color: '#0284C7', // Sky / Cobalt Blue
    badgeBg: 'rgba(2, 132, 199, 0.12)',
    border: 'rgba(2, 132, 199, 0.45)'
  },
  lab: {
    id: 'lab',
    name: 'Thí nghiệm / Thực hành',
    color: '#059669', // Emerald Green
    badgeBg: 'rgba(5, 150, 105, 0.12)',
    border: 'rgba(5, 150, 105, 0.45)'
  },
  admin: {
    id: 'admin',
    name: 'Nghiên cứu / Sáng tạo',
    color: '#7C3AED', // Royal Purple / Violet
    badgeBg: 'rgba(124, 58, 237, 0.12)',
    border: 'rgba(124, 58, 237, 0.45)'
  },
  event: {
    id: 'event',
    name: 'Hội thảo / Seminar',
    color: '#D97706', // Warm Amber Orange
    badgeBg: 'rgba(217, 119, 6, 0.12)',
    border: 'rgba(217, 119, 6, 0.45)'
  },
  public_service: {
    id: 'public_service',
    name: 'Smart Classroom / Tương tác',
    color: '#0D9488', // Deep Teal
    badgeBg: 'rgba(13, 148, 136, 0.12)',
    border: 'rgba(13, 148, 136, 0.45)'
  },
  utility: {
    id: 'utility',
    name: 'Khu vệ sinh & Tiện ích',
    color: '#64748B', // Slate
    badgeBg: 'rgba(100, 116, 139, 0.12)',
    border: 'rgba(100, 116, 139, 0.45)'
  }
};

export const CAMPUS_FLOORS = {
  1: {
    level: 1,
    floorCode: 'Tầng 1 / 5',
    title: 'Tầng trệt — Giếng trời trung tâm & Khối dịch vụ học tập',
    shortDesc: 'Mặt bằng kiến trúc hình vuông: Thư viện Bắc, Giếng trời trung tâm, 2 Đại sảnh Nam và 2 cụm thang bộ thoát hiểm đối xứng',
    topRooms: [
      {
        id: 'R_101',
        code: 'A1-PH-TB',
        name: 'PH (Phòng Học & Tự Học)',
        subName: 'Góc Tây Bắc • Gộp PH & PTH 1',
        floor: 1,
        capacity: 65,
        area: 95,
        category: 'academic',
        flexSpan: 1.2,
        image: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=600&q=80',
        equipments: ['65 bàn ghế đơn module di động', 'Máy chiếu Full HD & Bảng trượt 3 lớp', 'Hệ thống điều hòa Inverter 2 chiều', 'Trạm cắm sạc laptop thông minh'],
        occupiedAt: [{ start: 420, end: 1080, title: 'Học tập & Tự học sinh viên liên khóa', user: 'Sinh viên & Giảng viên' }]
      },
      {
        id: 'R_102',
        code: 'A1-PTV',
        name: 'PTV (Phòng Thư Viện)',
        subName: 'Thư viện trung tâm lớn',
        floor: 1,
        capacity: 250,
        area: 360,
        category: 'public_service',
        flexSpan: 3.0,
        image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=600&q=80',
        equipments: ['250 khoang đọc sách & tự học yên tĩnh', 'Hệ thống tra cứu số OPAC', 'Wifi chuyên dụng 500 kết nối đồng thời', 'Kệ sách chuyên ngành & quầy mượn trả RFID'],
        occupiedAt: [{ start: 420, end: 1260, title: 'Mở cửa phục vụ bạn đọc tự do', user: 'Sinh viên & Giảng viên toàn trường' }]
      },
      {
        id: 'R_103',
        code: 'A1-K1',
        name: 'Kho 1',
        subName: 'Kho thiết bị & tài liệu',
        floor: 1,
        capacity: null,
        area: 32,
        category: 'utility',
        flexSpan: 0.9,
        image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
        equipments: ['Kệ chứa phụ tùng & linh kiện thay thế', 'Tủ bảo mật tài liệu kỹ thuật', 'Hệ thống cảm biến nhiệt & PCCC tự động'],
        occupiedAt: []
      },
      {
        id: 'R_104',
        code: 'A1-K2',
        name: 'Kho 2',
        subName: 'Kho vật tư dự phòng',
        floor: 1,
        capacity: null,
        area: 32,
        category: 'utility',
        flexSpan: 0.9,
        image: 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=600&q=80',
        equipments: ['Kệ pallet chịu lực công nghiệp', 'Dụng cụ sửa chữa cơ điện chuyên dụng', 'Bình bọt chữa cháy khí CO2'],
        occupiedAt: []
      }
    ],
    bottomRooms: [
      {
        id: 'R_105',
        code: 'A1-PTH2',
        name: 'PTH 2 (Phòng Tự Học Lớn)',
        subName: 'Góc Tây Nam • Gộp PTH 2 & 3',
        floor: 1,
        capacity: 120,
        area: 180,
        category: 'academic',
        flexSpan: 2.0,
        image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80',
        equipments: ['120 chỗ ngồi bàn dài chống lóa cao cấp', 'Trạm cắm điện & cổng Type-C âm bàn', 'Hệ thống đèn LED quang thông 500 Lux', 'Máy lọc không khí công suất lớn'],
        occupiedAt: [{ start: 420, end: 1320, title: 'Khu tự học mở 24/7 cho sinh viên', user: 'Sinh viên toàn trường' }]
      },
      {
        id: 'R_106',
        code: 'A1-KHO-TAY',
        name: 'Kho Phụ',
        subName: 'Kho gầm thang Tây',
        floor: 1,
        capacity: null,
        area: 25,
        category: 'utility',
        flexSpan: 0.8,
        image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
        equipments: ['Thang nhôm rút chữ A cách điện', 'Bộ đồ nghề cơ điện bảo dưỡng nhanh', 'Bình cứu hỏa dự phòng tiêu chuẩn'],
        occupiedAt: []
      },
      {
        id: 'R_107',
        code: 'A1-CV',
        name: 'Sân Cổng Vào (CV)',
        subName: 'Sảnh tiếp đón & Cụm 3 cổng',
        floor: 1,
        capacity: 150,
        area: 220,
        category: 'public_service',
        flexSpan: 2.2,
        image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80',
        equipments: ['Cổng từ an ninh kiểm soát thẻ RFID', 'Màn hình LED thông báo lịch trình & bản đồ tầng', 'Hệ thống camera giám sát nhận diện AI'],
        occupiedAt: [{ start: 360, end: 1380, title: 'Cổng chính & luồng đón tiếp', user: 'Toàn trường & Khách liên hệ' }]
      },
      {
        id: 'R_108',
        code: 'A1-WC-NAM',
        name: 'NVS Nam (WC)',
        subName: 'Khu vệ sinh nam cánh Đông',
        floor: 1,
        capacity: null,
        area: 25,
        category: 'utility',
        flexSpan: 0.8,
        image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
        equipments: ['Bồn tiểu cảm ứng xả tự động', 'Lavabo vòi nước thông minh', 'Máy sấy tay siêu tốc diệt khuẩn'],
        occupiedAt: []
      },
      {
        id: 'R_109',
        code: 'A1-WC-NU',
        name: 'NVS Nữ (WC)',
        subName: 'Khu vệ sinh nữ cánh Đông',
        floor: 1,
        capacity: null,
        area: 25,
        category: 'utility',
        flexSpan: 0.8,
        image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
        equipments: ['Cabin vệ sinh khép kín tiêu chuẩn', 'Lavabo cảm ứng & gương đèn LED', 'Hệ thống xịt thơm & khử khuẩn liên tục'],
        occupiedAt: []
      },
      {
        id: 'R_110',
        code: 'A1-PH-DN',
        name: 'PH (Phòng Học Lớn)',
        subName: 'Góc Đông Nam • To bằng PTH 2',
        floor: 1,
        capacity: 120,
        area: 180,
        category: 'academic',
        flexSpan: 2.0,
        image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80',
        equipments: ['120 bàn ghế học viên tiêu chuẩn', '2 máy chiếu Laser kép & màn chiếu 150 inch', 'Micro không dây & giàn loa treo tường', 'Điều hòa trung tâm Daikin VRV'],
        occupiedAt: [{ start: 450, end: 1050, title: 'Giảng dạy lý thuyết chuyên ngành', user: 'Khoa Kinh tế & QTKD' }]
      }
    ]
  },

  2: {
    level: 2,
    floorCode: 'Tầng 2 / 5',
    title: 'Tầng 2 — Mặt bằng Giảng đường Đa Năng & Giếng trời thông tầng',
    shortDesc: 'Bố cục 18 phòng học phân chia theo 5 phân khu chức năng (Lý thuyết, Lab công nghệ, Hội thảo, Smart room, Nghiên cứu), 2 cầu thang đối xứng, 2 khu vệ sinh & 2 ban công thông gió',
    topRooms: [
      {
        id: 'R_201',
        code: 'A1-201',
        name: 'PH 201',
        subName: 'Góc Tây Bắc • Lý thuyết',
        floor: 2,
        capacity: 50,
        area: 65,
        category: 'academic',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy chiếu Laser 4K Sony', '2x Điều hòa Inverter Daikin 18.000 BTU', 'Micro không dây Shure', 'Bảng từ chống lóa'],
        occupiedAt: [{ start: 450, end: 690, title: 'Giải Tích 1 • Toán Cao Cấp', user: 'PGS. TS. Trần Đình Hưng • 07:30 - 11:30' }]
      },
      {
        id: 'R_202',
        code: 'A1-202',
        name: 'PH 202',
        subName: 'Góc Tây Bắc • Lý thuyết',
        floor: 2,
        capacity: 50,
        area: 65,
        category: 'academic',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy chiếu Full HD', 'Hệ thống âm thanh trợ giảng', 'Điều hòa 2 chiều'],
        occupiedAt: [{ start: 780, end: 1020, title: 'Vật Lý Đại Cương', user: 'TS. Lê Đức Anh • 13:00 - 17:00' }]
      },
      {
        id: 'R_203',
        code: 'A1-203',
        name: 'PH 203',
        subName: 'Cánh Tây • Lab Máy Tính & Ngoại Ngữ',
        floor: 2,
        capacity: 60,
        area: 75,
        category: 'lab',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=600&q=80',
        equipments: ['60 bộ PC Core i7 màn hình 27 inch', 'Máy chiếu tương tác thông minh', 'Tai nghe học tiếng Anh chuyên dụng', 'Điều hòa trung tâm'],
        occupiedAt: [{ start: 540, end: 720, title: 'Thực Hành Tin Học Đại Cương', user: 'ThS. Lê Hoàng Long • 09:00 - 12:00' }]
      },
      {
        id: 'R_207',
        code: 'A1-207',
        name: 'PH 207',
        subName: 'Dãy Bắc Trong • Seminar Học Thuật',
        floor: 2,
        capacity: 50,
        area: 65,
        category: 'event',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy chiếu 4K Laser', 'Bảng chống lóa 3 cánh', 'Hệ thống mic hội thảo đa hướng', '2 điều hòa Inverter'],
        occupiedAt: [{ start: 480, end: 700, title: 'Seminar Trí Tuệ Nhân Tạo Ứng Dụng', user: 'PGS. TS. Trần Đình Hưng • 08:00 - 11:40' }]
      },
      {
        id: 'R_208',
        code: 'A1-208',
        name: 'PH 208',
        subName: 'Dãy Bắc Trong • Bảo Vệ Đồ Án',
        floor: 2,
        capacity: 50,
        area: 65,
        category: 'event',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy chiếu Laser siêu nét', 'Bàn hội đồng chữ U bọc da', 'Màn hình trình chiếu phụ', 'Hệ thống quạt thông gió'],
        occupiedAt: []
      },
      {
        id: 'R_209',
        code: 'A1-209',
        name: 'PH 209',
        subName: 'Dãy Bắc Trong • Diễn Đàn Khoa Học',
        floor: 2,
        capacity: 50,
        area: 65,
        category: 'event',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=600&q=80',
        equipments: ['Màn hình LED Wall 100 inch', 'Bục giảng điện tử cảm ứng', 'Hệ thống âm thanh vòm hội nghị', 'Điều hòa 24.000 BTU'],
        occupiedAt: []
      },
      {
        id: 'R_210',
        code: 'A1-210',
        name: 'PH 210',
        subName: 'Dãy Bắc Trong • Workshop Quốc Tế',
        floor: 2,
        capacity: 50,
        area: 65,
        category: 'event',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy chiếu Laser 4K', 'Mic không dây kép Shure', 'Hệ thống cabin dịch đồng thời', 'Điều hòa Inverter'],
        occupiedAt: [{ start: 600, end: 750, title: 'Workshop Design System & AI', user: 'Chuyên gia Google • 10:00 - 12:30' }]
      },
      {
        id: 'R_211',
        code: 'A1-211',
        name: 'PH 211',
        subName: 'Góc Đông Bắc • Lý thuyết',
        floor: 2,
        capacity: 50,
        area: 65,
        category: 'academic',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy chiếu Sony 4K', 'Bục giảng đa phương tiện', 'Bảng trượt liên hoàn'],
        occupiedAt: [{ start: 780, end: 1020, title: 'Tiếng Anh Học Thuật 2', user: 'ThS. Hoàng Thu Thủy • 13:00 - 17:00' }]
      },
      {
        id: 'R_212',
        code: 'A1-212',
        name: 'PH 212',
        subName: 'Góc Đông Bắc • Lý thuyết',
        floor: 2,
        capacity: 50,
        area: 65,
        category: 'academic',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy chiếu 4K', 'Bảng từ chống lóa', 'Hệ thống quạt thông gió'],
        occupiedAt: []
      },
      {
        id: 'R_2_NC1',
        code: 'A1-NC-01',
        name: 'Phòng Nghiên Cứu 1',
        subName: 'Dãy Bắc Trung Tâm • Viện Nghiên Cứu & Phát Triển',
        floor: 2,
        capacity: 45,
        area: 160,
        category: 'admin',
        flexSpan: 2.0,
        image: 'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&w=600&q=80',
        equipments: ['Hệ thống Workstation tính toán mô phỏng GPU', 'Bảng kính tương tác 98 inch', 'Kính hiển vi quang học & đo lường laser', 'Điều hòa trung tâm & tủ lưu trữ mẫu thí nghiệm'],
        occupiedAt: [{ start: 480, end: 720, title: 'Dự án Nghiên Cứu AI & Big Data', user: 'Viện Nghiên Cứu Khoa Học • 08:00 - 12:00' }]
      },
      {
        id: 'R_2_WCNU',
        code: 'A1-WC-NU-T2',
        name: 'NVS Nữ',
        subName: 'Khu vệ sinh nữ Tầng 2',
        floor: 2,
        capacity: null,
        area: 25,
        category: 'utility',
        flexSpan: 0.8,
        image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
        equipments: ['Cabin vệ sinh khép kín tiêu chuẩn', 'Gương đèn LED & lavabo tự động', 'Hệ thống xịt thơm khử mùi tự động'],
        occupiedAt: []
      }
    ],
    bottomRooms: [
      {
        id: 'R_204',
        code: 'A1-204',
        name: 'PH 204',
        subName: 'Cánh Tây • Lab AI & Multimedia',
        floor: 2,
        capacity: 60,
        area: 75,
        category: 'lab',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80',
        equipments: ['60 máy trạm Workstation GPU RTX 4080', 'Bảng vẽ điện tử Wacom Pro', 'Máy chiếu Full HD kép', 'Điều hòa 2 chiều'],
        occupiedAt: [{ start: 780, end: 1020, title: 'Thực Hành Thị Giác Máy Tính', user: 'TS. Lê Đức Anh • 13:00 - 17:00' }]
      },
      {
        id: 'R_205',
        code: 'A1-205',
        name: 'PH 205',
        subName: 'Góc Tây Nam • Nghiên Cứu',
        floor: 2,
        capacity: 50,
        area: 65,
        category: 'admin',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=600&q=80',
        equipments: ['Bàn làm việc module cá nhân', 'Máy chiếu tương tác thông minh', 'Mic cổ ngỗng bục giảng', 'Bàn ghế học sinh viên chuẩn ergonomic'],
        occupiedAt: []
      },
      {
        id: 'R_206',
        code: 'A1-206',
        name: 'PH 206',
        subName: 'Góc Tây Nam • Tự Học & Thảo Luận',
        floor: 2,
        capacity: 50,
        area: 65,
        category: 'admin',
        statusOverride: 'maintenance',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy chiếu 4K Laser (đang thay bóng đèn)', 'Bảng chống lóa 3 cánh', '2 điều hòa Inverter'],
        occupiedAt: []
      },
      {
        id: 'R_215',
        code: 'A1-215',
        name: 'PH 215',
        subName: 'Dãy Nam Trong • Smart Classroom 1',
        floor: 2,
        capacity: 50,
        area: 65,
        category: 'public_service',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=600&q=80',
        equipments: ['Màn hình cảm ứng tương tác 86 inch', 'Hệ thống tracking camera giảng viên tự động', 'Bục giảng điện tử', 'Điều hòa 24.000 BTU'],
        occupiedAt: [{ start: 510, end: 705, title: 'Học Trực Tuyến Tương Tác Quốc Tế', user: 'Khoa CNTT • 08:30 - 11:45' }]
      },
      {
        id: 'R_216',
        code: 'A1-216',
        name: 'PH 216',
        subName: 'Dãy Nam Trong • Smart Classroom 2',
        floor: 2,
        capacity: 50,
        area: 65,
        category: 'public_service',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=600&q=80',
        equipments: ['Màn hình tương tác thông minh 75 inch', 'Bàn ghế module di động ghép nhóm', 'Hệ thống quạt thông gió'],
        occupiedAt: []
      },
      {
        id: 'R_217',
        code: 'A1-217',
        name: 'PH 217',
        subName: 'Dãy Nam Trong • Phòng Học Tương Tác 1',
        floor: 2,
        capacity: 50,
        area: 65,
        category: 'public_service',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy chiếu Laser 4K', 'Mic không dây Shure', 'Hệ thống bảng từ di động', 'Điều hòa Inverter'],
        occupiedAt: []
      },
      {
        id: 'R_218',
        code: 'A1-218',
        name: 'PH 218',
        subName: 'Dãy Nam Trong • Phòng Học Tương Tác 2',
        floor: 2,
        capacity: 50,
        area: 65,
        category: 'public_service',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy chiếu Sony 4K', 'Bục giảng đa phương tiện', 'Bảng trượt liên hoàn'],
        occupiedAt: []
      },
      {
        id: 'R_2_NC2',
        code: 'A1-NC-02',
        name: 'Phòng Nghiên Cứu 2',
        subName: 'Dãy Nam Trung Tâm • Trung Tâm Nghiên Cứu Ứng Dụng',
        floor: 2,
        capacity: 45,
        area: 160,
        category: 'admin',
        flexSpan: 2.0,
        image: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=600&q=80',
        equipments: ['Dàn máy trạm tính toán song song Cluster', 'Bàn nghiên cứu module chống rung', 'Hệ thống thiết bị đo kiểm vi mạch', 'Hệ thống quạt hút lọc khí phòng sạch'],
        occupiedAt: []
      },
      {
        id: 'R_213',
        code: 'A1-213',
        name: 'PH 213',
        subName: 'Góc Đông Nam • Đồ Án Tốt Nghiệp',
        floor: 2,
        capacity: 50,
        area: 65,
        category: 'admin',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy in 3D & thiết bị đo kiểm', 'Máy chiếu Full HD', 'Hệ thống âm thanh trợ giảng', 'Điều hòa 2 chiều'],
        occupiedAt: []
      },
      {
        id: 'R_214',
        code: 'A1-214',
        name: 'PH 214',
        subName: 'Góc Đông Nam • Không Gian Sáng Tạo',
        floor: 2,
        capacity: 50,
        area: 65,
        category: 'admin',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=600&q=80',
        equipments: ['Ghế lười & bàn làm việc nhóm linh hoạt', 'Máy chiếu Laser siêu nét', 'Bảng kính viết tường', 'Hệ thống quạt thông gió'],
        occupiedAt: []
      },
      {
        id: 'R_2_WCNAM',
        code: 'A1-WC-NAM-T2',
        name: 'NVS Nam',
        subName: 'Khu vệ sinh nam Tầng 2',
        floor: 2,
        capacity: null,
        area: 25,
        category: 'utility',
        flexSpan: 0.8,
        image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
        equipments: ['Cabin vệ sinh khép kín tiêu chuẩn', 'Lavabo cảm ứng & gương đèn LED', 'Hệ thống xịt thơm & khử khuẩn liên tục'],
        occupiedAt: []
      }
    ]
  },

  3: {
    level: 3,
    floorCode: 'Tầng 3 / 5',
    title: 'Tầng 3 — Giảng Đường, Phòng Y Tế & Giếng Trời Thông Tầng',
    shortDesc: 'Bố cục mặt bằng giống Tầng 2: Giếng trời trung tâm, dãy giảng đường đa năng, Phòng Nghiên Cứu 1 (Bắc), Phòng Y Tế & Phòng Học 319 (Nam)',
    topRooms: [
      {
        id: 'R_301',
        code: 'A1-301',
        name: 'PH 301',
        subName: 'Góc Tây Bắc • Lý thuyết',
        floor: 3,
        capacity: 50,
        area: 65,
        category: 'academic',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy chiếu Laser 4K Sony', '2x Điều hòa Inverter Daikin 18.000 BTU', 'Micro không dây Shure', 'Bảng từ chống lóa'],
        occupiedAt: [{ start: 450, end: 690, title: 'Hóa Sinh Học Đại Cương', user: 'PGS. TS. Trần Bảo Ngọc • 07:30 - 11:30' }]
      },
      {
        id: 'R_302',
        code: 'A1-302',
        name: 'PH 302',
        subName: 'Góc Tây Bắc • Lý thuyết',
        floor: 3,
        capacity: 50,
        area: 65,
        category: 'academic',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy chiếu Full HD', 'Hệ thống âm thanh trợ giảng', 'Điều hòa 2 chiều'],
        occupiedAt: []
      },
      {
        id: 'R_303',
        code: 'A1-303',
        name: 'PH 303',
        subName: 'Cánh Tây • Lab Máy Tính & PTN Hóa Lý',
        floor: 3,
        capacity: 60,
        area: 75,
        category: 'lab',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=600&q=80',
        equipments: ['Bộ thí nghiệm quang học Laser', 'Bàn thí nghiệm từ trường & điện xoay chiều', 'Máy hiện sóng Tektronix', 'Điều hòa trung tâm'],
        occupiedAt: [{ start: 780, end: 1020, title: 'Thực Hành Vật Lý Quang & Điện Từ', user: 'ThS. Đỗ Tuấn Anh • 13:00 - 17:00' }]
      },
      {
        id: 'R_307',
        code: 'A1-307',
        name: 'PH 307',
        subName: 'Dãy Bắc Trong • Seminar Học Thuật',
        floor: 3,
        capacity: 50,
        area: 65,
        category: 'event',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy chiếu 4K Laser', 'Bảng chống lóa 3 cánh', 'Hệ thống mic hội thảo đa hướng', '2 điều hòa Inverter'],
        occupiedAt: [{ start: 480, end: 700, title: 'Seminar Công Nghệ Sinh Học & Y Sinh', user: 'TS. Vũ Phương Thảo • 08:00 - 11:40' }]
      },
      {
        id: 'R_308',
        code: 'A1-308',
        name: 'PH 308',
        subName: 'Dãy Bắc Trong • Bảo Vệ Đồ Án',
        floor: 3,
        capacity: 50,
        area: 65,
        category: 'event',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=600&q=80',
        equipments: ['Màn hình trình chiếu 85 inch', 'Bàn hội đồng đánh giá luận văn', 'Hệ thống camera ghi hình', 'Điều hòa 24.000 BTU'],
        occupiedAt: []
      },
      {
        id: 'R_3_NC1',
        code: 'A1-NC-T3',
        name: 'Phòng Nghiên Cứu 1',
        subName: 'Dãy Bắc Trung Tâm • Viện Nghiên Cứu & Phát Triển',
        floor: 3,
        capacity: 45,
        area: 160,
        category: 'admin',
        flexSpan: 2.0,
        image: 'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&w=600&q=80',
        equipments: ['Hệ thống Workstation tính toán mô phỏng GPU', 'Bảng kính tương tác 98 inch', 'Kính hiển vi quang học Olympus & đo lường laser', 'Tủ sấy tiệt trùng vi sinh'],
        occupiedAt: [{ start: 480, end: 720, title: 'Nghiên Cứu Y Sinh & Vi Mạch', user: 'Viện Nghiên Cứu Khoa Học • 08:00 - 12:00' }]
      },
      {
        id: 'R_309',
        code: 'A1-309',
        name: 'PH 309',
        subName: 'Dãy Bắc Trong • Diễn Đàn Khoa Học',
        floor: 3,
        capacity: 50,
        area: 65,
        category: 'event',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80',
        equipments: ['Hệ thống micro không dây đa vùng', 'Máy chiếu tương tác Epson', 'Hệ thống quạt thông gió'],
        occupiedAt: []
      },
      {
        id: 'R_310',
        code: 'A1-310',
        name: 'PH 310',
        subName: 'Dãy Bắc Trong • Workshop Kỹ Năng',
        floor: 3,
        capacity: 50,
        area: 65,
        category: 'event',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80',
        equipments: ['Bàn ghế xếp nhóm linh hoạt', 'Bảng lật Flipchart & bảng từ', 'Máy chiếu Full HD'],
        occupiedAt: [{ start: 840, end: 1020, title: 'Workshop Đổi Mới Sáng Tạo', user: 'CLB Khởi Nghiệp Sinh Viên • 14:00 - 17:00' }]
      },
      {
        id: 'R_311',
        code: 'A1-311',
        name: 'PH 311',
        subName: 'Góc Đông Bắc • Lý thuyết',
        floor: 3,
        capacity: 50,
        area: 65,
        category: 'academic',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy chiếu Sony 4K', 'Bục giảng đa phương tiện', 'Bảng trượt liên hoàn'],
        occupiedAt: []
      },
      {
        id: 'R_312',
        code: 'A1-312',
        name: 'PH 312',
        subName: 'Góc Đông Bắc • Lý thuyết',
        floor: 3,
        capacity: 50,
        area: 65,
        category: 'academic',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy chiếu 4K', 'Bảng từ chống lóa', 'Hệ thống quạt thông gió'],
        occupiedAt: []
      },
      {
        id: 'R_3_WCNU',
        code: 'A1-WC-NU-T3',
        name: 'NVS Nữ',
        subName: 'Khu vệ sinh nữ Tầng 3',
        floor: 3,
        capacity: null,
        area: 25,
        category: 'utility',
        flexSpan: 0.8,
        image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
        equipments: ['Cabin vệ sinh khép kín tiêu chuẩn', 'Gương đèn LED & lavabo tự động', 'Hệ thống xịt thơm khử mùi tự động'],
        occupiedAt: []
      }
    ],
    bottomRooms: [
      {
        id: 'R_304',
        code: 'A1-304',
        name: 'PH 304',
        subName: 'Cánh Tây • Lab Máy Tính & AI',
        floor: 3,
        capacity: 60,
        area: 75,
        category: 'lab',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80',
        equipments: ['60 bộ PC Core i7 / 16GB RAM / SSD', 'Hệ thống Switch Cisco chia VLAN', 'Đường truyền cáp quang Gigabit'],
        occupiedAt: [{ start: 450, end: 690, title: 'Thực Hành Cơ Sở Dữ Liệu SQL', user: 'TS. Bùi Quốc Toàn • 07:30 - 11:30' }]
      },
      {
        id: 'R_305',
        code: 'A1-305',
        name: 'PH 305',
        subName: 'Góc Tây Nam • Nghiên Cứu',
        floor: 3,
        capacity: 50,
        area: 65,
        category: 'admin',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=600&q=80',
        equipments: ['Bàn làm việc module cá nhân', 'Máy chiếu tương tác thông minh', 'Mic cổ ngỗng bục giảng', 'Bàn ghế học sinh viên ergonomic'],
        occupiedAt: []
      },
      {
        id: 'R_306',
        code: 'A1-306',
        name: 'PH 306',
        subName: 'Góc Tây Nam • Tự Học & Thảo Luận',
        floor: 3,
        capacity: 50,
        area: 65,
        category: 'admin',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=600&q=80',
        equipments: ['Bàn tròn thảo luận nhóm', 'Bảng di động 2 mặt', 'Ổ cắm điện âm sàn từng bàn', '2 điều hòa Inverter'],
        occupiedAt: []
      },
      {
        id: 'R_315',
        code: 'A1-315',
        name: 'PH 315',
        subName: 'Dãy Nam Trong • Smart Classroom 1',
        floor: 3,
        capacity: 50,
        area: 65,
        category: 'public_service',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=600&q=80',
        equipments: ['Màn hình cảm ứng tương tác 86 inch', 'Hệ thống tracking camera giảng viên tự động', 'Bục giảng điện tử', 'Điều hòa 24.000 BTU'],
        occupiedAt: [{ start: 510, end: 705, title: 'Học Trực Tuyến Tương Tác Quốc Tế', user: 'Khoa Ngoại Ngữ • 08:30 - 11:45' }]
      },
      {
        id: 'R_316',
        code: 'A1-316',
        name: 'PH 316',
        subName: 'Dãy Nam Trong • Smart Classroom 2',
        floor: 3,
        capacity: 50,
        area: 65,
        category: 'public_service',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=600&q=80',
        equipments: ['Màn hình tương tác thông minh 75 inch', 'Bàn ghế module di động ghép nhóm', 'Hệ thống quạt thông gió'],
        occupiedAt: []
      },
      {
        id: 'R_3_YTE',
        code: 'A1-YT-T3',
        name: 'Phòng Y Tế',
        subName: 'Dãy Nam Trung Tâm • Trạm Y Tế & Sơ Cấp Cứu',
        floor: 3,
        capacity: 15,
        area: 78,
        category: 'utility',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=600&q=80',
        equipments: [
          'Giường bệnh sơ cấp cứu lưu bệnh nhân',
          'Tủ thuốc y tế & băng gạc vô trùng',
          'Bình oxy thở y tế khẩn cấp',
          'Máy đo huyết áp điện tử & nhiệt kế Omron',
          'Cáng cứu thương & nẹp cố định chấn thương',
          'Bàn làm việc y bác sĩ & hồ sơ sức khỏe'
        ],
        occupiedAt: [
          { start: 450, end: 1020, title: 'Trực Trạm Y Tế • Chăm Sóc Sức Khỏe Học Đường', user: 'BS. Nguyễn Phương Mai • 07:30 - 17:00' }
        ]
      },
      {
        id: 'R_319',
        code: 'A1-319',
        name: 'PH 319 (Phòng Học)',
        subName: 'Dãy Nam Trung Tâm • Giảng Đường Lý Thuyết',
        floor: 3,
        capacity: 45,
        area: 78,
        category: 'academic',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80',
        equipments: [
          'Máy chiếu Laser 4K Sony',
          'Hệ thống âm thanh trợ giảng & micro không dây',
          'Điều hòa trung tâm 2 chiều Inverter',
          'Bảng từ chống lóa cao cấp',
          '45 bộ bàn ghế học viên tiêu chuẩn'
        ],
        occupiedAt: [
          { start: 450, end: 690, title: 'Lập Trình Web Full-Stack', user: 'ThS. Đặng Thị Lan • 07:30 - 11:30' }
        ]
      },
      {
        id: 'R_317',
        code: 'A1-317',
        name: 'PH 317',
        subName: 'Dãy Nam Trong • Phòng Học Tương Tác 1',
        floor: 3,
        capacity: 50,
        area: 65,
        category: 'public_service',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy chiếu Laser 4K', 'Mic không dây Shure', 'Hệ thống bảng từ di động', 'Điều hòa Inverter'],
        occupiedAt: []
      },
      {
        id: 'R_318',
        code: 'A1-318',
        name: 'PH 318',
        subName: 'Dãy Nam Trong • Phòng Học Tương Tác 2',
        floor: 3,
        capacity: 50,
        area: 65,
        category: 'public_service',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy chiếu Sony 4K', 'Bục giảng đa phương tiện', 'Bảng trượt liên hoàn'],
        occupiedAt: []
      },
      {
        id: 'R_313',
        code: 'A1-313',
        name: 'PH 313',
        subName: 'Góc Đông Nam • Đồ Án Tốt Nghiệp',
        floor: 3,
        capacity: 50,
        area: 65,
        category: 'admin',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy in 3D & thiết bị đo kiểm', 'Máy chiếu Full HD', 'Hệ thống âm thanh trợ giảng', 'Điều hòa 2 chiều'],
        occupiedAt: []
      },
      {
        id: 'R_314',
        code: 'A1-314',
        name: 'PH 314',
        subName: 'Góc Đông Nam • Không Gian Sáng Tạo',
        floor: 3,
        capacity: 50,
        area: 65,
        category: 'admin',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=600&q=80',
        equipments: ['Ghế lười & bàn làm việc nhóm linh hoạt', 'Máy chiếu Laser siêu nét', 'Bảng kính viết tường', 'Hệ thống quạt thông gió'],
        occupiedAt: []
      },
      {
        id: 'R_3_WCNAM',
        code: 'A1-WC-NAM-T3',
        name: 'NVS Nam',
        subName: 'Khu vệ sinh nam Tầng 3',
        floor: 3,
        capacity: null,
        area: 25,
        category: 'utility',
        flexSpan: 0.8,
        image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
        equipments: ['Cabin vệ sinh khép kín tiêu chuẩn', 'Lavabo cảm ứng & gương đèn LED', 'Hệ thống xịt thơm & khử khuẩn liên tục'],
        occupiedAt: []
      }
    ]
  },

  4: {
    level: 4,
    floorCode: 'Tầng 4 / 5',
    title: 'Tầng 4 — Hành chính & Hội thảo',
    shortDesc: 'Văn phòng các khoa & đào tạo ở mép Bắc, phòng hội thảo 100 chỗ & tiếp SV ở mép Nam',
    topRooms: [
      {
        id: 'R_401_VP',
        code: 'A1-VP-CNTT',
        name: 'VP Khoa CNTT',
        floor: 4,
        capacity: null,
        area: 60,
        category: 'admin',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80',
        equipments: ['Bàn làm việc Trưởng khoa & Phó trưởng khoa', 'Bàn họp nội bộ khoa', 'Tủ hồ sơ quản lý sinh viên CNTT'],
        occupiedAt: [{ start: 450, end: 1020, title: 'Điều hành công tác đào tạo Khoa CNTT', user: 'Ban Chủ Nhiệm Khoa CNTT' }]
      },
      {
        id: 'R_402_VP',
        code: 'A1-VP-KT',
        name: 'VP Khoa Kinh tế',
        floor: 4,
        capacity: null,
        area: 60,
        category: 'admin',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=600&q=80',
        equipments: ['Bàn làm việc cán bộ Khoa Kinh tế', 'Khu vực tiếp giảng viên thỉnh giảng', 'Tủ sách giáo trình'],
        occupiedAt: [{ start: 450, end: 1020, title: 'Tiếp nhận xử lý công tác Khoa Kinh tế', user: 'Văn Phòng Khoa Kinh Tế' }]
      },
      {
        id: 'R_403_VP',
        code: 'A1-VP-NN',
        name: 'VP Khoa Ngoại ngữ',
        floor: 4,
        capacity: null,
        area: 60,
        category: 'admin',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80',
        equipments: ['Bàn làm việc cán bộ Khoa Ngoại ngữ', 'Khu vực quản lý chứng chỉ quốc tế', 'Tủ lưu trữ bài thi'],
        occupiedAt: [{ start: 450, end: 1020, title: 'Quản lý thi chuẩn đầu ra ngoại ngữ', user: 'Văn Phòng Khoa Ngoại Ngữ' }]
      },
      {
        id: 'R_404_DT',
        code: 'A1-PĐT',
        name: 'Phòng Đào tạo',
        floor: 4,
        capacity: null,
        area: 75,
        category: 'admin',
        flexSpan: 1.2,
        image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy chủ quản lý điểm & tín chỉ CSP', 'Máy in phôi văn bằng bảo mật', 'Khu tiếp nhận đăng ký học kỳ'],
        occupiedAt: [{ start: 450, end: 1050, title: 'Xét duyệt điều kiện tốt nghiệp & lịch thi', user: 'Phòng Quản Lý Đào Tạo' }]
      },
      {
        id: 'R_405_TV',
        code: 'A1-PTV',
        name: 'Phòng Tài vụ',
        floor: 4,
        capacity: null,
        area: 55,
        category: 'admin',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80',
        equipments: ['Két sắt bảo mật ngân quỹ', 'Quầy thu học phí & thanh toán chế độ SV', 'Phần mềm kế toán MISA'],
        occupiedAt: [{ start: 480, end: 1020, title: 'Thu học phí & chi trả học bổng sinh viên', user: 'Phòng Kế Hoạch - Tài Chính' }]
      },
      {
        id: 'R_4_WC',
        code: 'A1-WC-T4',
        name: 'Khu vệ sinh',
        floor: 4,
        capacity: null,
        area: 40,
        category: 'utility',
        flexSpan: 0.8,
        image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
        equipments: ['Phân khu WC Nam & Nữ chuẩn văn phòng', 'Gương soi cảm ứng LED', 'Hệ thống xà phòng tự động'],
        occupiedAt: []
      }
    ],
    bottomRooms: [
      {
        id: 'R_406_HK',
        code: 'A1-PHK',
        name: 'Phòng họp Khoa',
        floor: 4,
        capacity: 15,
        area: 40,
        category: 'admin',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&w=600&q=80',
        equipments: ['Bàn họp gỗ tự nhiên 15 chỗ', 'Micro hội nghị đa hướng', 'Smart TV 65 inch trình chiếu báo cáo'],
        occupiedAt: [{ start: 510, end: 690, title: 'Họp giao ban BCN Khoa CNTT định kỳ', user: 'Hội đồng Khoa CNTT' }]
      },
      {
        id: 'R_407_HT',
        code: 'A1-PHT',
        name: 'Phòng hội thảo',
        floor: 4,
        capacity: 100,
        area: 140,
        category: 'event',
        flexSpan: 1.6,
        image: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=600&q=80',
        equipments: ['Màn chiếu kép Sony Laser 4K 200 inch', 'Dàn âm thanh vòm JBL sân khấu', 'Bục phát biểu số tích hợp màn hình'],
        occupiedAt: [{ start: 810, end: 1050, title: 'Hội thảo Hướng nghiệp & Việc làm Công nghệ', user: 'Doanh nghiệp đối tác & Sinh viên K66' }]
      },
      {
        id: 'R_401',
        code: 'A1-401',
        name: 'Phòng học 401',
        floor: 4,
        capacity: 60,
        area: 75,
        category: 'academic',
        flexSpan: 1.1,
        image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy chiếu Laser 4K', 'Điều hòa Inverter Daikin', 'Bảng từ chống lóa'],
        occupiedAt: []
      },
      {
        id: 'R_402',
        code: 'A1-402',
        name: 'Phòng học 402',
        floor: 4,
        capacity: 60,
        area: 75,
        category: 'academic',
        flexSpan: 1.1,
        image: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy chiếu Full HD', 'Hệ thống âm thanh bục giảng', 'Bàn ghế học sinh viên'],
        occupiedAt: [{ start: 450, end: 690, title: 'Thương Mại Điện Tử & Marketing Số', user: 'TS. Lê Thị Mai • 07:30 - 11:30' }]
      },
      {
        id: 'R_408_TSV',
        code: 'A1-TSV',
        name: 'Tiếp sinh viên',
        floor: 4,
        capacity: null,
        area: 35,
        category: 'admin',
        flexSpan: 1.2,
        image: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=600&q=80',
        equipments: ['Quầy tư vấn giải đáp thắc mắc học vụ', 'Bàn tiếp sinh viên trao đổi riêng', 'Màn hình hiển thị số thứ tự'],
        occupiedAt: [{ start: 450, end: 1020, title: 'Tiếp nhận đơn khiếu nại & phúc khảo bài thi', user: 'Chuyên viên phòng Đào tạo' }]
      }
    ]
  },

  5: {
    level: 5,
    floorCode: 'Tầng 5 / 5',
    title: 'Tầng 5 — Sự kiện & Sinh hoạt',
    shortDesc: 'Hội trường lớn 300 chỗ & phòng đa năng ở mép Bắc, CLB sinh viên & sân thượng ở mép Nam',
    topRooms: [
      {
        id: 'R_5_TOP_HTL',
        code: 'A1-HTL',
        name: 'Hội trường lớn',
        floor: 5,
        capacity: 300,
        area: 360,
        category: 'event',
        flexSpan: 2.5,
        image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80',
        equipments: ['300 ghế nệm rạp hát cao cấp', 'Màn hình LED P2.5 trong nhà 300 inch', 'Dàn âm thanh Line Array công suất lớn', 'Hệ thống ánh sáng sân khấu DMX'],
        occupiedAt: [{ start: 450, end: 690, title: 'Lễ Khai Mạc Năm Học & Vinh Danh Thủ Khoa', user: 'Ban Giám Hiệu & Đoàn Trường • 07:30 - 11:30' }]
      },
      {
        id: 'R_501_ĐN1',
        code: 'A1-ĐN1',
        name: 'Phòng đa năng 1',
        floor: 5,
        capacity: 80,
        area: 100,
        category: 'event',
        flexSpan: 1.1,
        image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=600&q=80',
        equipments: ['Sàn gỗ thi đấu & tập luyện vũ đạo', 'Gương ốp tường khổ lớn', 'Dàn âm thanh di động Bluetooth', 'Điều hòa công suất lớn'],
        occupiedAt: [{ start: 780, end: 1020, title: 'Tập huấn kỹ năng mềm & thuyết trình trước đám đông', user: 'CLB Kỹ Năng SV' }]
      },
      {
        id: 'R_502_ĐN2',
        code: 'A1-ĐN2',
        name: 'Phòng đa năng 2',
        floor: 5,
        capacity: 60,
        area: 80,
        category: 'event',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=600&q=80',
        equipments: ['Bàn ghế xếp đa năng gập gọn', 'Máy chiếu Full HD', 'Bảng trắng di động phục vụ workshop'],
        occupiedAt: []
      },
      {
        id: 'R_503_ST',
        code: 'A1-STUDIO',
        name: 'Studio thu âm',
        floor: 5,
        capacity: 10,
        area: 35,
        category: 'event',
        flexSpan: 0.9,
        image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=600&q=80',
        equipments: ['Vách tiêu âm phòng thu chuyên nghiệp', 'Micro Shure SM7B thu âm', 'Bàn trộn âm thanh Rodecaster Pro II', 'Đèn livestream Studio'],
        occupiedAt: [{ start: 510, end: 690, title: 'Ghi âm podcast Radio Sinh viên & bài giảng trực tuyến', user: 'Ban Truyền Thông SV' }]
      },
      {
        id: 'R_5_TOP_WC',
        code: 'A1-WC-T5',
        name: 'Khu vệ sinh',
        floor: 5,
        capacity: null,
        area: 40,
        category: 'utility',
        flexSpan: 0.8,
        image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
        equipments: ['Khu vệ sinh VIP hội trường', 'Gương soi toàn thân', 'Hệ thống sấy tay tự động'],
        occupiedAt: []
      }
    ],
    bottomRooms: [
      {
        id: 'R_504_GYM',
        code: 'A1-GYM',
        name: 'Gym & Thể chất',
        floor: 5,
        capacity: 25,
        area: 75,
        category: 'public_service',
        flexSpan: 1.1,
        image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=600&q=80',
        equipments: ['3 máy chạy bộ điện', 'Dàn tạ đa năng tập thể hình', 'Thảm tập yoga', 'Tủ đồ locker cá nhân'],
        occupiedAt: [{ start: 420, end: 1260, title: 'Rèn luyện thể chất sinh viên & cán bộ', user: 'CLB Thể Hình & Yoga Trường' }]
      },
      {
        id: 'R_505_CLBHT',
        code: 'A1-CLB-HT',
        name: 'CLB Học thuật',
        floor: 5,
        capacity: 30,
        area: 45,
        category: 'public_service',
        flexSpan: 1.1,
        image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80',
        equipments: ['Bàn làm việc nhóm CLB AI & Lập trình', 'Màn hình trình chiếu đồ án', 'Kệ sách nghiên cứu sinh viên'],
        occupiedAt: [{ start: 840, end: 1140, title: 'Sinh hoạt CLB Lập Trình Thi Olympic Tin Học', user: 'CLB Tin Học Sinh Viên' }]
      },
      {
        id: 'R_506_CLBVN',
        code: 'A1-CLB-VN',
        name: 'CLB Văn nghệ',
        floor: 5,
        capacity: 30,
        area: 45,
        category: 'public_service',
        flexSpan: 1.1,
        image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
        equipments: ['Đàn Piano điện tử Yamaha', 'Trống cajon & guitar mộc', 'Gương tập múa', 'Tủ bảo quản đạo cụ biểu diễn'],
        occupiedAt: [{ start: 900, end: 1140, title: 'Tập luyện văn nghệ chào mừng ngày Nhà giáo', user: 'Đội Văn Nghệ Xung Kích' }]
      },
      {
        id: 'R_507_ĐH',
        code: 'A1-ĐOÀN',
        name: 'Phòng Đoàn – Hội',
        floor: 5,
        capacity: null,
        area: 40,
        category: 'admin',
        flexSpan: 1.1,
        image: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80',
        equipments: ['Bàn làm việc Ban chấp hành Đoàn trường', 'Tủ lưu trữ cờ, bằng khen & kỷ vật', 'Máy in tài liệu phong trào'],
        occupiedAt: [{ start: 450, end: 1020, title: 'Trực văn phòng Đoàn & duyệt kế hoạch Mùa hè xanh', user: 'BCH Đoàn Thanh Niên' }]
      },
      {
        id: 'R_508_ST',
        code: 'A1-ST',
        name: 'Sân thượng',
        floor: 5,
        capacity: null,
        area: 120,
        category: 'utility',
        flexSpan: 1.8,
        image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80',
        equipments: ['Khu vườn xanh sinh thái trên cao', 'Ghế băng nghỉ chân ngắm cảnh toàn trường', 'Lan can kính cường lực an toàn cao 1.6m'],
        occupiedAt: [{ start: 420, end: 1260, title: 'Không gian thư giãn mở ngắm khuôn viên', user: 'Tự do tham quan' }]
      }
    ]
  }
};

// Flatten rooms array for search, filtering, and inspector sync
Object.keys(CAMPUS_FLOORS).forEach((level) => {
  const fl = CAMPUS_FLOORS[level];
  const allRoomsOnFloor = [];
  if (fl.topRooms) allRoomsOnFloor.push(...fl.topRooms);
  if (fl.bottomRooms) allRoomsOnFloor.push(...fl.bottomRooms);
  fl.rooms = allRoomsOnFloor;
});

/**
 * Tổng quan quy hoạch công năng 5 tầng
 */
export const UNIVERSITY_BUILDING_SUMMARY = {
  buildingName: 'Tòa Nhà Đa Năng A1',
  campus: 'Khuôn Viên Đại Học Trung Tâm',
  totalFloors: 5,
  totalRooms: 55,
  grossFloorArea: '7.680 m²',
  buildingHeight: '21.5 m (5 Tầng)',
  designStandard: 'Bản vẽ mặt bằng kiến trúc phân khu theo mép tòa nhà',
  floors: [
    {
      level: 1,
      name: 'Tầng trệt — Khu công cộng',
      role: 'Thư viện 200 chỗ, Canteen 150 chỗ, Sảnh đón tiếp, Y tế, Quầy thông tin',
      badgeColor: '#14B8A6'
    },
    {
      level: 2,
      name: 'Tầng 2 — Phòng học lý thuyết',
      role: '8 Phòng học lý thuyết 60 chỗ (201-208), Phòng tự học, Phòng bộ môn',
      badgeColor: '#38BDF8'
    },
    {
      level: 3,
      name: 'Tầng 3 — Thí nghiệm & Thực hành',
      role: 'PTN Hóa, Lý, Sinh, 3 Phòng máy tính 50 máy, Xưởng thực hành cơ khí',
      badgeColor: '#10B981'
    },
    {
      level: 4,
      name: 'Tầng 4 — Hành chính & Hội thảo',
      role: 'Văn phòng các khoa (CNTT, Kinh tế, Ngoại ngữ), Phòng Đào tạo, Hội thảo 100 chỗ',
      badgeColor: '#A855F7'
    },
    {
      level: 5,
      name: 'Tầng 5 — Sự kiện & Sinh hoạt',
      role: 'Hội trường lớn 300 chỗ, Phòng đa năng, Studio thu âm, Gym thể chất, Sân thượng',
      badgeColor: '#F59E0B'
    }
  ]
};
