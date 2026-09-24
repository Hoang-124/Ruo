/**
 * Campus Building Master Data: Tòa Nhà A1 (5 Tầng)
 * Chuẩn kiến trúc: Các phòng bố trí dọc theo các mép ngoài tòa nhà (đón ánh sáng & gió tự nhiên),
 * Trung tâm là trục hành lang giao thông chính (3.5m), lõi thang máy và cầu thang thoát hiểm.
 */

export const ROOM_CATEGORIES = {
  academic: {
    id: 'academic',
    name: 'Học tập',
    color: '#38BDF8', // Blue
    badgeBg: 'rgba(56, 189, 248, 0.15)',
    border: 'rgba(56, 189, 248, 0.4)'
  },
  lab: {
    id: 'lab',
    name: 'Thí nghiệm / Thực hành',
    color: '#10B981', // Green
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(16, 185, 129, 0.4)'
  },
  admin: {
    id: 'admin',
    name: 'Hành chính',
    color: '#A855F7', // Purple
    badgeBg: 'rgba(168, 85, 247, 0.15)',
    border: 'rgba(168, 85, 247, 0.4)'
  },
  event: {
    id: 'event',
    name: 'Sự kiện / Hội trường',
    color: '#F59E0B', // Orange
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.4)'
  },
  public_service: {
    id: 'public_service',
    name: 'Công cộng / Dịch vụ',
    color: '#14B8A6', // Teal / Cyan
    badgeBg: 'rgba(20, 184, 166, 0.15)',
    border: 'rgba(20, 184, 166, 0.4)'
  },
  utility: {
    id: 'utility',
    name: 'Tiện ích',
    color: '#94A3B8', // Gray / Slate
    badgeBg: 'rgba(148, 163, 184, 0.15)',
    border: 'rgba(148, 163, 184, 0.4)'
  }
};

export const CAMPUS_FLOORS = {
  1: {
    level: 1,
    floorCode: 'Tầng 1 / 5',
    title: 'Tầng trệt — Khu công cộng',
    shortDesc: 'Các phòng bố trí dọc mép Bắc & mép Nam, sảnh đón tiếp và hành lang trung tâm',
    topRooms: [
      {
        id: 'R_101',
        code: 'A1-TV',
        name: 'Thư viện',
        floor: 1,
        capacity: 200,
        area: 280,
        category: 'public_service',
        flexSpan: 2.2, // spans wider along perimeter
        image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=600&q=80',
        equipments: ['200 khoang tự học', 'Hệ thống tra cứu số OPAC', 'Wifi chuyên dụng 500 kết nối', 'Kệ sách chuyên ngành'],
        occupiedAt: [{ start: 420, end: 1260, title: 'Mở cửa phục vụ bạn đọc tự do', user: 'Sinh viên & Giảng viên toàn trường' }]
      },
      {
        id: 'R_102',
        code: 'A1-PĐN',
        name: 'Phòng đọc nhóm',
        floor: 1,
        capacity: 20,
        area: 45,
        category: 'public_service',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80',
        equipments: ['Bàn thảo luận module tròn', 'Smart TV 55 inch chia sẻ màn hình', 'Bảng trắng di động'],
        occupiedAt: [{ start: 510, end: 690, title: 'Thảo luận nhóm Đồ án K67', user: 'Nhóm SV Nguyễn Hoàng Long' }]
      },
      {
        id: 'R_103',
        code: 'A1-MTS',
        name: 'Mượn / Trả sách',
        floor: 1,
        capacity: null,
        area: 35,
        category: 'public_service',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1507842229451-7f01be44c069?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy quét mã vạch RFID tự động', 'Quầy thủ thư tiếp nhận', 'Máy khử trùng sách bằng tia UV'],
        occupiedAt: [{ start: 450, end: 1020, title: 'Tiếp nhận mượn trả tài liệu học tập', user: 'Thủ thư Nguyễn Thị Lan' }]
      },
      {
        id: 'R_104',
        code: 'A1-YT',
        name: 'Phòng y tế',
        floor: 1,
        capacity: null,
        area: 40,
        category: 'utility',
        flexSpan: 0.9,
        image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=600&q=80',
        equipments: ['4 giường bệnh theo dõi sức khỏe', 'Tủ thuốc sơ cứu tiêu chuẩn', 'Máy đo huyết áp & bình oxy'],
        occupiedAt: [{ start: 450, end: 1020, title: 'Thường trực sơ cứu y tế học đường', user: 'Bác sĩ Nguyễn Thu Hà' }]
      },
      {
        id: 'R_1_WC',
        code: 'A1-WC-T1',
        name: 'Khu vệ sinh',
        floor: 1,
        capacity: null,
        area: 40,
        category: 'utility',
        flexSpan: 0.9,
        image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
        equipments: ['Phân khu WC Nam & Nữ riêng biệt', 'Hệ thống khử khuẩn tự động', 'Lavabo cảm ứng'],
        occupiedAt: []
      }
    ],
    bottomRooms: [
      {
        id: 'R_105',
        code: 'A1-CT',
        name: 'Căng tin chính',
        floor: 1,
        capacity: 150,
        area: 220,
        category: 'public_service',
        flexSpan: 2.0,
        image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80',
        equipments: ['Khu quầy line tự chọn dinh dưỡng', 'Bàn ăn 150 chỗ tiêu chuẩn', 'Khu rửa tay diệt khuẩn'],
        occupiedAt: [{ start: 420, end: 1140, title: 'Phục vụ ăn sáng, trưa và ăn nhẹ cho SV', user: 'Tổ Quản Lý Dịch Vụ Căn Tin' }]
      },
      {
        id: 'R_106',
        code: 'A1-CF',
        name: 'Cafe & Căng tin',
        floor: 1,
        capacity: 40,
        area: 60,
        category: 'public_service',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy pha cafe Espresso tự động', 'Quầy nước giải khát & bánh ngọt', 'Bàn tròn thư giãn'],
        occupiedAt: [{ start: 420, end: 1200, title: 'Phục vụ đồ uống & nghỉ chân', user: 'Quầy Cà Phê Học Thuật' }]
      },
      {
        id: 'R_1_SANH',
        code: 'A1-SẢNH',
        name: 'Sảnh chính',
        floor: 1,
        capacity: 100,
        area: 120,
        category: 'public_service',
        flexSpan: 1.2,
        image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80',
        equipments: ['Cửa kính tự động ra vào', 'Cổng từ kiểm soát thẻ RFID', 'Màn hình LED thông báo'],
        occupiedAt: []
      },
      {
        id: 'R_107',
        code: 'A1-TT',
        name: 'Quầy thông tin',
        floor: 1,
        capacity: null,
        area: 25,
        category: 'public_service',
        flexSpan: 0.9,
        image: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80',
        equipments: ['Kiosk tra cứu bản đồ & lịch học', 'Quầy lễ tân giải đáp thắc mắc', 'Hộp thư tiếp nhận ý kiến'],
        occupiedAt: [{ start: 450, end: 1020, title: 'Chỉ dẫn & hướng dẫn tân sinh viên', user: 'Đội Hỗ Trợ Sinh Viên' }]
      },
      {
        id: 'R_108',
        code: 'A1-BV',
        name: 'Phòng bảo vệ',
        floor: 1,
        capacity: null,
        area: 25,
        category: 'utility',
        flexSpan: 0.9,
        image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
        equipments: ['Màn hình quan sát 32 camera toàn tòa nhà', 'Bộ đàm bảo vệ chuyên dụng', 'Bàn trực ban an ninh'],
        occupiedAt: [{ start: 0, end: 1440, title: 'Trực an ninh & bảo vệ tòa nhà 24/7', user: 'Đội Bảo Vệ Trực Ban' }]
      },
      {
        id: 'R_109',
        code: 'A1-KT',
        name: 'Kho kỹ thuật',
        floor: 1,
        capacity: null,
        area: 35,
        category: 'utility',
        flexSpan: 0.9,
        statusOverride: 'maintenance',
        image: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80',
        equipments: ['Tủ điện hạ thế trung tâm tòa nhà', 'Máy bơm tăng áp & cứu hỏa', 'Kho vật tư điện thoại & mạng'],
        occupiedAt: []
      }
    ]
  },

  2: {
    level: 2,
    floorCode: 'Tầng 2 / 5',
    title: 'Tầng 2 — Phòng học lý thuyết',
    shortDesc: 'Dãy phòng học 201-205 ở mép Bắc, dãy phòng 206-208 & bộ môn ở mép Nam',
    topRooms: [
      {
        id: 'R_201',
        code: 'A1-201',
        name: 'Phòng học 201',
        floor: 2,
        capacity: 60,
        area: 75,
        category: 'academic',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy chiếu Laser 4K Sony', '2x Điều hòa Inverter Daikin 18.000 BTU', 'Micro không dây Shure', 'Bảng từ chống lóa'],
        occupiedAt: [{ start: 450, end: 690, title: 'Giải Tích 1 • Toán Cao Cấp', user: 'PGS. TS. Trần Đình Hưng • 07:30 - 11:30' }]
      },
      {
        id: 'R_202',
        code: 'A1-202',
        name: 'Phòng học 202',
        floor: 2,
        capacity: 60,
        area: 75,
        category: 'academic',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy chiếu Full HD', 'Hệ thống âm thanh trợ giảng', 'Điều hòa 2 chiều'],
        occupiedAt: [{ start: 780, end: 1020, title: 'Vật Lý Đại Cương', user: 'TS. Lê Đức Anh • 13:00 - 17:00' }]
      },
      {
        id: 'R_203',
        code: 'A1-203',
        name: 'Phòng học 203',
        floor: 2,
        capacity: 60,
        area: 75,
        category: 'academic',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy chiếu tương tác thông minh', 'Mic cổ ngỗng bục giảng', 'Bàn ghế học sinh viên chuẩn ergonomic'],
        occupiedAt: []
      },
      {
        id: 'R_204',
        code: 'A1-204',
        name: 'Phòng học 204',
        floor: 2,
        capacity: 60,
        area: 75,
        category: 'academic',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy chiếu 4K Laser', 'Bảng chống lóa 3 cánh', '2 điều hòa Inverter'],
        occupiedAt: [{ start: 450, end: 690, title: 'Nhập Môn Lập Trình C/C++', user: 'ThS. Nguyễn Văn Nam • 07:30 - 11:30' }]
      },
      {
        id: 'R_205',
        code: 'A1-205',
        name: 'Phòng học 205',
        floor: 2,
        capacity: 45,
        area: 60,
        category: 'academic',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=600&q=80',
        equipments: ['Màn hình TV 75 inch trình chiếu', 'Bục giảng điện tử', 'Điều hòa 24.000 BTU'],
        occupiedAt: []
      },
      {
        id: 'R_2_WC',
        code: 'A1-WC-T2',
        name: 'Khu vệ sinh',
        floor: 2,
        capacity: null,
        area: 40,
        category: 'utility',
        flexSpan: 0.9,
        image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
        equipments: ['Phân khu WC Nam & Nữ', 'Thiết bị vệ sinh tiết kiệm nước', 'Lavabo rửa tay'],
        occupiedAt: []
      }
    ],
    bottomRooms: [
      {
        id: 'R_206',
        code: 'A1-206',
        name: 'Phòng học 206',
        floor: 2,
        capacity: 60,
        area: 75,
        category: 'academic',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy chiếu Laser siêu nét', 'Bảng từ chống lóa', 'Hệ thống quạt thông gió'],
        occupiedAt: [{ start: 450, end: 690, title: 'Kinh Tế Vi Mô', user: 'TS. Phạm Thị Mai • 07:30 - 11:30' }]
      },
      {
        id: 'R_207',
        code: 'A1-207',
        name: 'Phòng học 207',
        floor: 2,
        capacity: 60,
        area: 75,
        category: 'academic',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy chiếu Laser 4K', 'Mic không dây Shure', 'Điều hòa Inverter'],
        occupiedAt: []
      },
      {
        id: 'R_208',
        code: 'A1-208',
        name: 'Phòng học 208',
        floor: 2,
        capacity: 60,
        area: 75,
        category: 'academic',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy chiếu Sony 4K', 'Bục giảng đa phương tiện', 'Bảng trượt liên hoàn'],
        occupiedAt: [{ start: 780, end: 1020, title: 'Tiếng Anh Học Thuật 2', user: 'ThS. Hoàng Thu Thủy • 13:00 - 17:00' }]
      },
      {
        id: 'R_209',
        code: 'A1-TH',
        name: 'Phòng tự học',
        floor: 2,
        capacity: 30,
        area: 45,
        category: 'public_service',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80',
        equipments: ['Bàn tự học module cá nhân', 'Ổ cắm sạc laptop từng vị trí', 'Wifi tốc độ cao'],
        occupiedAt: [{ start: 420, end: 1260, title: 'Phòng tự học tự do cho sinh viên', user: 'Sinh viên các khoa' }]
      },
      {
        id: 'R_210',
        code: 'A1-BM1',
        name: 'Phòng bộ môn 1',
        floor: 2,
        capacity: null,
        area: 35,
        category: 'admin',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=600&q=80',
        equipments: ['Bàn làm việc giảng viên Bộ môn Toán - Tin', 'Tủ tài liệu đề thi', 'Máy in bài giảng'],
        occupiedAt: [{ start: 450, end: 1020, title: 'Giảng viên chấm bài & soạn giáo án', user: 'Tổ Bộ Môn Toán - Tin' }]
      },
      {
        id: 'R_211',
        code: 'A1-BM2',
        name: 'Phòng bộ môn 2',
        floor: 2,
        capacity: null,
        area: 35,
        category: 'admin',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=600&q=80',
        equipments: ['Bàn làm việc giảng viên Bộ môn Ngoại ngữ', 'Khu vực tiếp sinh viên tư vấn đồ án', 'Tủ sách chuyên khảo'],
        occupiedAt: [{ start: 450, end: 1020, title: 'Tư vấn học tập & nghiên cứu khoa học', user: 'Tổ Bộ Môn Ngoại Ngữ' }]
      }
    ]
  },

  3: {
    level: 3,
    floorCode: 'Tầng 3 / 5',
    title: 'Tầng 3 — Thí nghiệm & Thực hành',
    shortDesc: 'Dãy phòng thí nghiệm Hóa - Lý - Sinh ở mép Bắc, 3 phòng máy tính & xưởng cơ khí ở mép Nam',
    topRooms: [
      {
        id: 'R_301_LAB',
        code: 'A1-TN-HÓA',
        name: 'PTN Hóa học',
        floor: 3,
        capacity: 40,
        area: 85,
        category: 'lab',
        flexSpan: 1.1,
        image: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=600&q=80',
        equipments: ['Tủ hút khí độc hóa học', 'Hệ thống cấp thoát nước chuyên dụng', 'Bồn rửa mắt khẩn cấp', 'Tủ lưu trữ hóa chất'],
        occupiedAt: [{ start: 450, end: 690, title: 'Thực Hành Hóa Đại Cương & Vô Cơ', user: 'TS. Vũ Phương Thảo • 07:30 - 11:30' }]
      },
      {
        id: 'R_302_LAB',
        code: 'A1-TN-LÝ',
        name: 'PTN Vật lý',
        floor: 3,
        capacity: 40,
        area: 85,
        category: 'lab',
        flexSpan: 1.1,
        image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
        equipments: ['Bộ thí nghiệm quang học Laser', 'Bàn thí nghiệm từ trường & điện xoay chiều', 'Máy hiện sóng Tektronix'],
        occupiedAt: [{ start: 780, end: 1020, title: 'Thực Hành Vật Lý Quang & Điện Từ', user: 'ThS. Đỗ Tuấn Anh • 13:00 - 17:00' }]
      },
      {
        id: 'R_303_LAB',
        code: 'A1-TN-SINH',
        name: 'PTN Sinh học',
        floor: 3,
        capacity: 35,
        area: 75,
        category: 'lab',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=600&q=80',
        equipments: ['35 kính hiển vi quang học Olympus', 'Tủ ủ ấm vi sinh', 'Máy ly tâm lạnh', 'Tủ sấy tiệt trùng'],
        occupiedAt: []
      },
      {
        id: 'R_301',
        code: 'A1-301',
        name: 'Phòng học 301',
        floor: 3,
        capacity: 60,
        area: 75,
        category: 'academic',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy chiếu Laser 4K', 'Điều hòa 2 chiều', 'Bảng từ chống lóa'],
        occupiedAt: [{ start: 450, end: 690, title: 'Hóa Sinh Học Đại Cương', user: 'PGS. TS. Trần Bảo Ngọc • 07:30 - 11:30' }]
      },
      {
        id: 'R_302',
        code: 'A1-302',
        name: 'Phòng học 302',
        floor: 3,
        capacity: 60,
        area: 75,
        category: 'academic',
        flexSpan: 1.0,
        image: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy chiếu Full HD', 'Hệ thống âm thanh bục giảng', 'Bàn ghế học sinh viên'],
        occupiedAt: []
      },
      {
        id: 'R_3_WC',
        code: 'A1-WC-T3',
        name: 'Khu vệ sinh',
        floor: 3,
        capacity: null,
        area: 40,
        category: 'utility',
        flexSpan: 0.8,
        image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
        equipments: ['Khu vệ sinh khử mùi áp lực âm', 'Bồn rửa hóa chất khẩn cấp', 'Lavabo'],
        occupiedAt: []
      }
    ],
    bottomRooms: [
      {
        id: 'R_304_PM1',
        code: 'A1-PM1',
        name: 'Phòng máy tính 1',
        floor: 3,
        capacity: 50,
        area: 95,
        category: 'lab',
        flexSpan: 1.2,
        image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80',
        equipments: ['50 máy tính Dell Core i7 / 16GB RAM / SSD', 'Mạng LAN Gigabit', 'Phần mềm quản lý phòng máy NetOp'],
        occupiedAt: [{ start: 450, end: 690, title: 'Thực Hành Cơ Sở Dữ Liệu SQL', user: 'TS. Bùi Quốc Toàn • 07:30 - 11:30' }]
      },
      {
        id: 'R_305_PM2',
        code: 'A1-PM2',
        name: 'Phòng máy tính 2',
        floor: 3,
        capacity: 50,
        area: 95,
        category: 'lab',
        flexSpan: 1.2,
        image: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80',
        equipments: ['50 máy tính cấu hình cao cho đồ họa & AI', '2 điều hòa công nghiệp', 'Máy chiếu màn hình lớn'],
        occupiedAt: [{ start: 780, end: 1020, title: 'Lập Trình Web Full-Stack', user: 'ThS. Đặng Thị Lan • 13:00 - 17:00' }]
      },
      {
        id: 'R_306_PM3',
        code: 'A1-PM3',
        name: 'Phòng máy tính 3',
        floor: 3,
        capacity: 50,
        area: 95,
        category: 'lab',
        flexSpan: 1.2,
        image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=600&q=80',
        equipments: ['50 máy tính chuyên thực hành mạng & an ninh', 'Hệ thống Switch Cisco chia VLAN', 'Đường truyền cáp quang'],
        occupiedAt: []
      },
      {
        id: 'R_307_CK',
        code: 'A1-XCK',
        name: 'Xưởng cơ khí',
        floor: 3,
        capacity: 30,
        area: 110,
        category: 'lab',
        flexSpan: 1.3,
        image: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80',
        equipments: ['3 máy tiện CNC mini', 'Bàn gia công nguội & kẹp ê-tô', 'Máy hàn Mig/Tig', 'Dụng cụ bảo hộ lao động'],
        occupiedAt: [{ start: 450, end: 690, title: 'Thực Hành Gia Công Cơ Khí Chế Tạo', user: 'Kỹ sư Hoàng Văn Đạt • 07:30 - 11:30' }]
      },
      {
        id: 'R_303',
        code: 'A1-303',
        name: 'Phòng học 303',
        floor: 3,
        capacity: 60,
        area: 75,
        category: 'academic',
        flexSpan: 1.1,
        image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80',
        equipments: ['Máy chiếu Sony Laser', 'Bảng từ viết bút dạ', '2 điều hòa Inverter'],
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
