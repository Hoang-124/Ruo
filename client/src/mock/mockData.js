/**
 * Mock Database for UFMS (University Facilities Management System)
 * Full-coverage dataset for 7 Actors & 12 Collections
 */

export const USERS = {
  admin: {
    id: 'USR_001',
    code: 'AD000001',
    name: 'Ban Giám Hiệu / Quản Trị Hệ Thống',
    role: 'admin',
    roleTitle: 'Ban Giám Hiệu (Admin)',
    email: 'admin@ruo.edu.vn',
    department: 'Ban Giám Hiệu & Quản Trị Hệ Thống',
    phone: '0901 234 567',
    avatar: 'AD',
    stats: {
      onlineUsers: 48,
      apiRequestsMin: 320,
      activeRoles: 3,
      auditLogsToday: 320
    }
  },
  manager: {
    id: 'USR_002',
    code: 'QL000001',
    name: 'Trưởng Phòng HC-QT Lê Hoàng Hải',
    role: 'manager',
    roleTitle: 'Quản Lý Phòng / Trưởng Phòng HC-QT',
    email: 'manager@ruo.edu.vn',
    department: 'Phòng Hành Chính - Quản Trị CSVC',
    phone: '0912 345 678',
    avatar: 'LH',
    stats: {
      pendingTransfers: 3,
      pendingDisposals: 1,
      totalRooms: 45,
      activeStaff: 12
    }
  },
  staff: {
    id: 'USR_003',
    code: 'NV000001',
    name: 'Kỹ Thuật Viên Trần Minh Tuấn',
    role: 'staff',
    roleTitle: 'Kỹ Thuật Viên CSVC',
    email: 'staff@ruo.edu.vn',
    department: 'Tổ Kỹ Thuật & Bảo Trì Thiết Bị',
    phone: '0987 654 321',
    avatar: 'TT',
    stats: {
      pendingTransfers: 2,
      openTickets: 5,
      slaOverdueCount: 0,
      totalEquipments: 1240
    }
  },
  // Backward compatibility aliases
  maintenance_staff: {
    id: 'USR_003',
    code: 'NV000001',
    name: 'Kỹ Thuật Viên Trần Minh Tuấn',
    role: 'staff',
    roleTitle: 'Kỹ Thuật Viên CSVC',
    email: 'staff@ruo.edu.vn',
    department: 'Tổ Kỹ Thuật CSVC',
    phone: '0987 654 321',
    avatar: 'TT',
    stats: { pendingTransfers: 2, openTickets: 5, slaOverdueCount: 0, totalEquipments: 1240 }
  },
  facility_staff: {
    id: 'USR_002',
    code: 'QL000001',
    name: 'Trưởng Phòng HC-QT Lê Hoàng Hải',
    role: 'manager',
    roleTitle: 'Quản Lý Phòng / Trưởng Phòng HC-QT',
    email: 'manager@ruo.edu.vn',
    department: 'Phòng Hành Chính - Quản Trị',
    phone: '0912 345 678',
    avatar: 'LH',
    stats: { pendingTransfers: 3, pendingDisposals: 1, totalRooms: 45, activeStaff: 12 }
  },
  maintenance: {
    id: 'USR_003',
    code: 'NV000001',
    name: 'Kỹ Thuật Viên Trần Minh Tuấn',
    role: 'staff',
    roleTitle: 'Kỹ Thuật Viên CSVC',
    email: 'staff@ruo.edu.vn',
    department: 'Tổ Kỹ Thuật CSVC',
    phone: '0987 654 321',
    avatar: 'TT',
    stats: { pendingTransfers: 2, openTickets: 5, slaOverdueCount: 0, totalEquipments: 1240 }
  },
  lecturer: {
    id: 'USR_003',
    code: 'NV000001',
    name: 'Kỹ Thuật Viên Trần Minh Tuấn',
    role: 'staff',
    roleTitle: 'Kỹ Thuật Viên CSVC',
    email: 'staff@ruo.edu.vn',
    department: 'Tổ Kỹ Thuật CSVC',
    phone: '0987 654 321',
    avatar: 'TT',
    stats: { pendingTransfers: 2, openTickets: 5, slaOverdueCount: 0, totalEquipments: 1240 }
  }
};

export const ROOMS = [
  {
    id: 'ROOM_01',
    code: 'A1-302',
    name: 'Phòng Học Lý Thuyết 302',
    building: 'Tòa A1',
    floor: 3,
    capacity: 45,
    area: 60,
    type: 'theory',
    typeName: 'Phòng Lý Thuyết',
    status: 'available',
    equipments: ['Máy chiếu Sony 4K', '2x Điều hòa Daikin 18000BTU', 'Hệ thống âm thanh không dây', 'Bảng từ chống lóa'],
    image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80',
    utilizationRate: 82,
    todaySlots: [
      { time: '07:30 - 09:30', title: 'Lập Trình Web Nâng Cao', user: 'TS. Nguyễn Văn Nam', type: 'curriculum' },
      { time: '09:45 - 11:45', title: 'Slot trống', type: 'available' },
      { time: '13:00 - 15:00', title: 'Học nhóm đồ án tốt nghiệp', user: 'SV Trần Bảo Hoàng', type: 'booked' },
      { time: '15:15 - 17:15', title: 'Slot trống', type: 'available' }
    ]
  },
  {
    id: 'ROOM_02',
    code: 'A1-105',
    name: 'Phòng Lab Máy Tính Chuyên Dụng 1',
    building: 'Tòa A1',
    floor: 1,
    capacity: 35,
    area: 75,
    type: 'lab',
    typeName: 'Lab Máy Tính',
    status: 'maintenance',
    equipments: ['35x PC Dell i7/16GB/RTX3060', 'Máy chiếu tương tác', 'Switch Gigabit Cisco', 'Điều hòa trung tâm'],
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80',
    utilizationRate: 94,
    maintenanceReason: 'Bảo dưỡng và vệ sinh hệ thống điều hòa & cập nhật image phòng máy',
    todaySlots: [
      { time: 'Cả ngày', title: 'Đang bảo trì kỹ thuật', type: 'maintenance' }
    ]
  },
  {
    id: 'ROOM_03',
    code: 'A1-405',
    name: 'Hội Trường Đa Năng A1',
    building: 'Tòa A1',
    floor: 4,
    capacity: 180,
    area: 220,
    type: 'hall',
    typeName: 'Hội Trường',
    status: 'available',
    equipments: ['Màn hình LED P2 300 inch', 'Dàn loa Line Array JBL', '6x Mic không dây Shure', 'Hệ thống ánh sáng sân khấu'],
    image: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=600&q=80',
    utilizationRate: 68,
    todaySlots: [
      { time: '08:00 - 11:30', title: 'Hội thảo Khoa học Sinh viên 2026', user: 'Đoàn Thanh Niên', type: 'booked' },
      { time: '13:30 - 17:00', title: 'Slot trống', type: 'available' }
    ]
  },
  {
    id: 'ROOM_04',
    code: 'A1-201',
    name: 'Phòng Thí Nghiệm Vi Mạch & IoT',
    building: 'Tòa A1',
    floor: 2,
    capacity: 25,
    area: 55,
    type: 'lab',
    typeName: 'Lab Thí Nghiệm',
    status: 'available',
    equipments: ['Máy hiện sóng số Tektronix', 'Bộ kit lập trình STM32/ESP32', 'Trạm hàn thiếc Weller', 'Bộ phân tích logic'],
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
    utilizationRate: 75,
    todaySlots: [
      { time: '07:30 - 11:30', title: 'Thực hành Thiết kế Vi mạch', user: 'PGS. TS. Trần Đình Hưng', type: 'curriculum' },
      { time: '13:00 - 16:30', title: 'Nghiên cứu Lab IoT', user: 'TS. Lê Đức Anh', type: 'booked' }
    ]
  },
  {
    id: 'ROOM_05',
    code: 'A1-304',
    name: 'Phòng Học Thông Minh Smart Classroom',
    building: 'Tòa A1',
    floor: 3,
    capacity: 40,
    area: 65,
    type: 'smart',
    typeName: 'Smart Classroom',
    status: 'available',
    equipments: ['Smartboard cảm ứng 86 inch', 'Camera tracking giảng viên', 'Mic mảng đa hướng trần', 'Bàn ghế thông minh di động'],
    image: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=600&q=80',
    utilizationRate: 89,
    todaySlots: [
      { time: '09:00 - 11:00', title: 'Slot trống', type: 'available' },
      { time: '13:30 - 16:30', title: 'Hybrid Lecture với ĐH Ngoại Thương', user: 'ThS. Vũ Thị Ngọc', type: 'booked' }
    ]
  },
  {
    id: 'ROOM_06',
    code: 'A1-502',
    name: 'Phòng Hội Thảo Chuyên Đề A1-502',
    building: 'Tòa A1',
    floor: 5,
    capacity: 60,
    area: 80,
    type: 'theory',
    typeName: 'Phòng Lý Thuyết',
    status: 'available',
    equipments: ['Máy chiếu Epson Laser', '2x Điều hòa Panasonic', 'Hệ thống âm thanh hội thảo'],
    image: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=600&q=80',
    utilizationRate: 70,
    todaySlots: [
      { time: '08:00 - 10:00', title: 'Slot trống', type: 'available' },
      { time: '14:00 - 17:00', title: 'Buổi bảo vệ đồ án chuyên ngành', user: 'Bộ môn CNPM', type: 'booked' }
    ]
  }
];

export const TICKETS = [
  {
    id: 'TCK-2026-0042',
    roomCode: 'A1-302',
    equipmentName: 'Máy chiếu Sony 4K',
    title: 'Máy chiếu nhấp nháy liên tục và mất tín hiệu HDMI',
    description: 'Khi cắm cổng HDMI từ laptop của giảng viên, màn chiếu chớp xanh rồi tắt hẳn sau 2 phút, đèn quạt kêu rất to.',
    priority: 'critical', // critical, high, medium, low
    priorityLabel: 'Khẩn cấp (Critical)',
    status: 'in_progress', // open, assigned, in_progress, resolved, closed
    statusLabel: 'Đang xử lý',
    reporterName: 'TS. Nguyễn Văn Nam',
    reporterRole: 'Giảng viên',
    reportedAt: '17/09/2026 07:45',
    slaRemainingMinutes: 45,
    slaTotalHours: 4, // 4 hours for critical 24/7
    slaState: 'at_risk', // on_track, at_risk, overdue
    assignedTo: 'Phạm Văn Hùng (Kỹ thuật điện lạnh - máy chiếu)',
    images: ['https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=400&q=80'],
    timeline: [
      { time: '07:45', event: 'Giảng viên gửi phản ánh sự cố' },
      { time: '07:55', event: 'QL CSVC phân công cho kỹ thuật viên Phạm Văn Hùng' },
      { time: '08:05', event: 'Kỹ thuật viên tiếp nhận và khảo sát hiện trường' }
    ]
  },
  {
    id: 'TCK-2026-0039',
    roomCode: 'B2-105',
    equipmentName: 'Điều hòa Daikin 18000BTU',
    title: 'Điều hòa chảy nước ở dàn lạnh và không mát',
    description: 'Nước nhỏ giọt trực tiếp xuống dãy bàn máy tính số 3, gây nguy cơ chập điện nguy hiểm.',
    priority: 'high',
    priorityLabel: 'Ưu tiên Cao (High)',
    status: 'assigned',
    statusLabel: 'Đã phân công',
    reporterName: 'Trần Bảo Hoàng',
    reporterRole: 'Sinh viên',
    reportedAt: '16/09/2026 15:30',
    slaRemainingMinutes: 190,
    slaTotalHours: 8,
    slaState: 'on_track',
    assignedTo: 'Nguyễn Văn Cường (Kỹ thuật điện lạnh)',
    images: [],
    timeline: [
      { time: '15:30 (16/09)', event: 'Sinh viên báo sự cố kèm ảnh hiện trường' },
      { time: '16:00 (16/09)', event: 'Đã tiếp nhận và lên lịch khắc phục ca sáng hôm nay' }
    ]
  },
  {
    id: 'TCK-2026-0035',
    roomCode: 'A3-401',
    equipmentName: 'Ghế giảng đường',
    title: 'Gãy tay tựa và lỏng ốc vít 2 ghế dãy đầu',
    description: 'Ghế ngồi bị nghiêng sang một bên, sinh viên ngồi dễ bị ngã.',
    priority: 'low',
    priorityLabel: 'Bình thường (Low)',
    status: 'open',
    statusLabel: 'Mới tạo',
    reporterName: 'Lê Minh Quân',
    reporterRole: 'Sinh viên',
    reportedAt: '17/09/2026 08:10',
    slaRemainingMinutes: 2800,
    slaTotalHours: 48,
    slaState: 'on_track',
    assignedTo: 'Chưa phân công',
    images: [],
    timeline: [
      { time: '08:10', event: 'Đã tiếp nhận yêu cầu từ sinh viên' }
    ]
  },
  {
    id: 'TCK-2026-0028',
    roomCode: 'C1-201',
    equipmentName: 'Bộ đèn LED chiếu sáng',
    title: 'Chập bóng đèn trần phòng học, phát ra tiếng nổ lách tách',
    description: 'Bóng đèn ở giữa phòng chập cháy, đã ngắt cầu dao tạm thời.',
    priority: 'high',
    priorityLabel: 'Ưu tiên Cao (High)',
    status: 'in_progress',
    statusLabel: 'Đang xử lý',
    reporterName: 'ThS. Vũ Thị Ngọc',
    reporterRole: 'Giảng viên',
    reportedAt: '15/09/2026 14:00',
    slaRemainingMinutes: -120, // Negative means overdue!
    slaTotalHours: 16,
    slaState: 'overdue', // Overdue pulse badge
    assignedTo: 'Lê Đức Thắng (Điện lưới)',
    images: [],
    timeline: [
      { time: '14:00 (15/09)', event: 'Báo sự cố' },
      { time: '09:00 (16/09)', event: 'Chờ cấp phát bóng đèn LED thay thế từ kho' }
    ]
  },
  {
    id: 'TCK-2026-0020',
    roomCode: 'B1-102',
    equipmentName: 'Micro không dây',
    title: 'Mic bị mất tiếng và rò rỉ pin',
    description: 'Đã thay pin mới nhưng đèn tín hiệu không sáng.',
    priority: 'medium',
    priorityLabel: 'Trung bình (Medium)',
    status: 'resolved',
    statusLabel: 'Đã sửa xong (Chờ xác nhận)',
    reporterName: 'TS. Hoàng Văn Bách',
    reporterRole: 'Giảng viên',
    reportedAt: '14/09/2026 09:30',
    slaRemainingMinutes: 0,
    slaTotalHours: 24,
    slaState: 'on_track',
    assignedTo: 'Phạm Văn Hùng',
    images: [],
    timeline: [
      { time: '14/09', event: 'Tiếp nhận sự cố' },
      { time: '15/09', event: 'Thay thế bo mạch thu phát sóng mic' },
      { time: '16/09 16:30', event: 'Kỹ thuật viên bấm RESOLVED. Chờ người dùng nghiệm thu 2 chiều' }
    ]
  }
];

export const PENDING_REQUESTS = [
  {
    id: 'REQ_01',
    type: 'room_booking',
    user: 'Trần Bảo Hoàng',
    role: 'Sinh viên',
    roomCode: 'A1-302',
    date: '20/09/2026',
    timeSlot: '13:30 - 15:30',
    purpose: 'Học nhóm Đồ án Tốt nghiệp (5 thành viên)',
    participants: 5,
    submittedAt: '17/09/2026 07:15',
    isEscalated: false,
    escalationReason: null
  },
  {
    id: 'REQ_02',
    type: 'series_booking',
    user: 'TS. Nguyễn Văn Nam',
    role: 'Giảng viên',
    roomCode: 'B2-105',
    date: 'Thứ Tư hàng tuần (15 tuần)',
    timeSlot: '07:30 - 11:30',
    purpose: 'Giảng dạy học phần Chuyên Đề Mạng Nâng Cao',
    participants: 35,
    submittedAt: '16/09/2026 14:20',
    isEscalated: false,
    escalationReason: null
  },
  {
    id: 'REQ_03',
    type: 'room_booking',
    user: 'CLB Tin Học Sinh Viên',
    role: 'Sinh viên',
    roomCode: 'A1-405 (Hội Trường)',
    date: '22/09/2026 (Chủ Nhật)',
    timeSlot: '18:00 - 22:00',
    purpose: 'Chung kết Cuộc thi Hackathon Toàn Trường',
    participants: 250,
    submittedAt: '16/09/2026 10:00',
    isEscalated: true,
    escalationReason: 'Sử dụng ngoài giờ hành chính sau 21h & ngày Chủ Nhật (RULE_OFF_HOURS)'
  },
  {
    id: 'REQ_04',
    type: 'equipment_borrow',
    user: 'TS. Nguyễn Văn Nam',
    role: 'Giảng viên',
    roomCode: 'Kho Thiết Bị Trung Tâm',
    equipmentName: 'Máy chiếu di động 4K Epson EB-L12000Q',
    date: '21/09/2026 - 25/09/2026 (5 ngày)',
    purpose: 'Hội nghị Quốc tế IEEE ComSoc tại trường',
    value: '65.000.000 VNĐ',
    submittedAt: '17/09/2026 08:00',
    isEscalated: true,
    escalationReason: 'Thiết bị có nguyên giá > 50.000.000 VNĐ (RULE_HIGH_VALUE)'
  }
];

export const EQUIPMENTS = [
  {
    id: 'EQ_001',
    assetCode: 'TS-2021-MC01',
    name: 'Máy Chiếu Laser Sony VPL-FHZ85',
    category: 'Máy chiếu',
    originalPrice: 42000000,
    remainingValue: 14000000,
    purchaseDate: '2021-03-15',
    locationRoom: 'A1-302',
    status: 'in_use',
    repairCount: 3,
    estimatedRepairCost: 3500000,
    // R ratio: 3.5m / 14m = 25% -> <40%: Repair
  },
  {
    id: 'EQ_002',
    assetCode: 'TS-2019-DH04',
    name: 'Điều Hòa Trung Tâm Daikin VRV 24000BTU',
    category: 'Điện lạnh',
    originalPrice: 38000000,
    remainingValue: 8000000,
    purchaseDate: '2019-06-10',
    locationRoom: 'B2-105',
    status: 'damaged',
    repairCount: 6,
    estimatedRepairCost: 5200000,
    // R ratio: 5.2m / 8m = 65% -> >=60%: Trigger Disposal Proposal!
  },
  {
    id: 'EQ_003',
    assetCode: 'TS-2022-PC12',
    name: 'Bộ Máy Tính Để Bàn Dell OptiPlex 7090 i7',
    category: 'Máy tính',
    originalPrice: 22000000,
    remainingValue: 13000000,
    purchaseDate: '2022-09-01',
    locationRoom: 'B2-105',
    status: 'available',
    repairCount: 1,
    estimatedRepairCost: 800000
  },
  {
    id: 'EQ_004',
    assetCode: 'TS-2018-OS02',
    name: 'Máy Hiện Sóng Kỹ Thuật Số Tektronix TBS2000B',
    category: 'Thiết bị đo kiểm',
    originalPrice: 55000000,
    remainingValue: 7000000,
    purchaseDate: '2018-11-20',
    locationRoom: 'B1-201',
    status: 'damaged',
    repairCount: 5,
    estimatedRepairCost: 4900000,
    // R ratio: 4.9m / 7m = 70% -> >=60%: Trigger Disposal!
  }
];

export const EQUIPMENT_SEED_DATA = [
  ...EQUIPMENTS,
  {
    id: 'EQ_005',
    assetCode: 'TS-2023-SB01',
    name: 'Màn Hình Cảm Ứng Tương Tác Maxhub 86 inch 4K',
    category: 'Màn hình & Bảng số',
    originalPrice: 85000000,
    remainingValue: 68000000,
    purchaseDate: '2023-01-12',
    locationRoom: 'A1-405',
    status: 'in_use',
    repairCount: 0,
    estimatedRepairCost: 0
  },
  {
    id: 'EQ_006',
    assetCode: 'TS-2020-SW08',
    name: 'Switch L3 Cisco Catalyst 9200L 48-port PoE+',
    category: 'Thiết bị mạng & Viễn thông',
    originalPrice: 62000000,
    remainingValue: 21000000,
    purchaseDate: '2020-08-25',
    locationRoom: 'Phòng Server C1',
    status: 'in_use',
    repairCount: 2,
    estimatedRepairCost: 2100000
  },
  {
    id: 'EQ_007',
    assetCode: 'TS-2022-MIC01',
    name: 'Kính Hiển Vi Quang Học 3 Mắt Olympus CX23',
    category: 'Thiết bị Lab & Đo kiểm',
    originalPrice: 28000000,
    remainingValue: 19500000,
    purchaseDate: '2022-04-10',
    locationRoom: 'B1-204 (Lab Vi sinh)',
    status: 'available',
    repairCount: 0,
    estimatedRepairCost: 0
  },
  {
    id: 'EQ_008',
    assetCode: 'TS-2017-AM03',
    name: 'Hệ Thống Âm Thanh Hội Thảo Đa Vùng Shure MXW',
    category: 'Âm thanh & Ánh sáng',
    originalPrice: 45000000,
    remainingValue: 5000000,
    purchaseDate: '2017-10-15',
    locationRoom: 'Hội Trường Trụ Sở A',
    status: 'disposal_pending',
    repairCount: 7,
    estimatedRepairCost: 4200000
  }
];

export const AUDIT_LOGS = [
  {
    id: 'LOG_9021',
    timestamp: '17/09/2026 08:02:14',
    user: 'Lê Thị Mai (Quản lý CSVC)',
    ip: '10.20.4.15',
    action: 'TRANSFER_CREATE',
    entity: 'Transfer',
    target: 'TRF-2026-008',
    diff: {
      action: 'Điều chuyển 10x Laptop Dell Precision sang A1-102',
      fromRoom: 'KHO_TONG',
      toRoom: 'A1-102'
    }
  },
  {
    id: 'LOG_9020',
    timestamp: '17/09/2026 07:55:00',
    user: 'Lê Thị Mai (Quản lý CSVC)',
    ip: '10.20.1.22',
    action: 'TICKET_ASSIGN',
    entity: 'Ticket',
    target: 'TCK-2026-0042',
    diff: {
      statusBefore: 'OPEN',
      statusAfter: 'ASSIGNED',
      assignedTo: 'Phạm Văn Hùng'
    }
  },
  {
    id: 'LOG_9019',
    timestamp: '16/09/2026 16:45:22',
    user: 'Admin',
    ip: '10.20.0.1',
    action: 'RBAC_PERMISSION_UPDATE',
    entity: 'Role',
    target: 'Lecturer',
    diff: {
      addedPermissions: ['ticket:create', 'equipment:read'],
      updatedBy: 'AD000001'
    }
  },
  {
    id: 'LOG_9018',
    timestamp: '16/09/2026 14:30:10',
    user: 'Phạm Văn Hùng (Kỹ thuật)',
    ip: '10.20.2.11',
    action: 'MAINTENANCE_LOG_RECORD',
    entity: 'MaintenanceLog',
    target: 'ML-2026-0034',
    diff: {
      item: 'Bảo trì hệ thống điều hòa A1-302',
      status: 'COMPLETED'
    }
  }
];

export const NOTIFICATIONS = [
  {
    id: 'NOTIF_01',
    title: 'Phiếu điều chuyển thiết bị đã được duyệt',
    message: 'Phiếu điều chuyển TRF-2026-008 (10x Laptop Dell sang A1-102) đã được quản trị viên duyệt và sẵn sàng bàn giao.',
    time: '35 phút trước',
    read: false,
    type: 'success'
  },
  {
    id: 'NOTIF_02',
    title: 'Cảnh báo tiến độ SLA sự cố',
    message: 'Ticket TCK-2026-0042 (Khẩn cấp tại A1-302) chỉ còn 45 phút trước khi vi phạm thời gian cam kết.',
    time: '1 giờ trước',
    read: false,
    type: 'warning'
  },
  {
    id: 'NOTIF_03',
    title: 'Thông báo bảo dưỡng định kỳ',
    message: 'Khu vực Lab B2-105 sẽ tiến hành bảo dưỡng hệ thống điều hòa và máy chiếu trong sáng nay.',
    time: '3 giờ trước',
    read: true,
    type: 'info'
  }
];

