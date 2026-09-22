/**
 * Mock Database for UFMS (University Facilities Management System)
 * Full-coverage dataset for 7 Actors & 12 Collections
 */

export const USERS = {
  student: {
    id: 'USR_001',
    code: 'SV20220412',
    name: 'Trần Bảo Hoàng',
    role: 'student',
    roleTitle: 'Sinh viên',
    email: 'hoang.tb220412@university.edu.vn',
    department: 'Viện Công Nghệ Thông Tin & TT',
    className: 'K67-CNTT-02',
    phone: '0987 654 321',
    avatar: 'TH',
    reputeScore: 92, // Điểm uy tín
    stats: {
      upcomingBookings: 2,
      activeTickets: 1,
      totalBookedHours: 48,
    }
  },
  lecturer: {
    id: 'USR_002',
    code: 'CB198402',
    name: 'TS. Nguyễn Văn Nam',
    role: 'lecturer',
    roleTitle: 'Giảng viên',
    email: 'nam.nv@university.edu.vn',
    department: 'Khoa Kỹ Thuật Máy Tính',
    phone: '0912 345 678',
    avatar: 'NN',
    reputeScore: 98,
    stats: {
      seriesBookings: 3,
      borrowedEquipments: 2,
      teachingHoursWeek: 16
    }
  },
  facility_staff: {
    id: 'USR_003',
    code: 'NV201901',
    name: 'Lê Thị Mai',
    role: 'facility_staff',
    roleTitle: 'Quản lý CSVC',
    email: 'mai.lt@university.edu.vn',
    department: 'Phòng Cơ Sở Vật Chất',
    phone: '0903 112 233',
    avatar: 'LM',
    reputeScore: 100,
    stats: {
      pendingApprovals: 8,
      openTickets: 12,
      slaOverdueCount: 2,
      todayOccupancy: 78
    }
  },
  maintenance: {
    id: 'USR_004',
    code: 'KT201805',
    name: 'Phạm Văn Hùng',
    role: 'maintenance',
    roleTitle: 'Kỹ thuật viên Bảo trì',
    email: 'hung.pv@university.edu.vn',
    department: 'Tổ Kỹ Thuật & Sửa Chữa',
    phone: '0934 889 900',
    avatar: 'PH',
    reputeScore: 95,
    stats: {
      assignedTickets: 5,
      inProgressTickets: 3,
      completedMonth: 28,
      avgMTTR: '2.4h'
    }
  },
  academic_affairs: {
    id: 'USR_005',
    code: 'DT201509',
    name: 'Hoàng Quốc Dũng',
    role: 'academic_affairs',
    roleTitle: 'Chuyên viên Đào tạo',
    email: 'dung.hq@university.edu.vn',
    department: 'Phòng Quản Lý Đào Tạo',
    phone: '0945 667 788',
    avatar: 'HD',
    reputeScore: 100,
    stats: {
      totalCoursesSemester: 450,
      allocatedPercentage: 96.2,
      escalatedRequests: 3
    }
  },
  admin: {
    id: 'USR_000',
    code: 'AD000001',
    name: 'Ban Quản Trị Hệ Thống',
    role: 'admin',
    roleTitle: 'System Admin',
    email: 'admin@university.edu.vn',
    department: 'Trung Tâm Công Nghệ Thông Tin',
    phone: '024 3869 1234',
    avatar: 'AD',
    reputeScore: 100,
    stats: {
      onlineUsers: 142,
      apiRequestsMin: 850,
      activeRoles: 6,
      auditLogsToday: 320
    }
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

export const CSP_CLASSES_SAMPLE = [
  { id: 'IT3010', name: 'Kỹ Thuật Lập Trình', lecturer: 'TS. Lê Đức Anh', students: 42, type: 'theory', requiredLab: false, faculty: 'CNTT' },
  { id: 'IT3160', name: 'Kiến Trúc Máy Tính & Lab', lecturer: 'PGS. TS. Trần Đình Hưng', students: 35, type: 'lab', requiredLab: true, faculty: 'CNTT' },
  { id: 'IT4040', name: 'Phát Triển Ứng Dụng Web', lecturer: 'TS. Nguyễn Văn Nam', students: 40, type: 'theory', requiredLab: false, faculty: 'CNTT' },
  { id: 'EE2010', name: 'Lý Thuyết Mạch Điện', lecturer: 'TS. Vũ Hoàng Long', students: 58, type: 'theory', requiredLab: false, faculty: 'Điện' },
  { id: 'EE3050', name: 'Thí Nghiệm Đo Lường', lecturer: 'ThS. Đỗ Minh Tuấn', students: 24, type: 'lab', requiredLab: true, faculty: 'Điện' },
  { id: 'IT5000', name: 'Hội Thảo Tốt Nghiệp K67', lecturer: 'GS. TS. Nguyễn Hải Quân', students: 160, type: 'hall', requiredLab: false, faculty: 'CNTT' }
];

export const AUDIT_LOGS = [
  {
    id: 'LOG_9021',
    timestamp: '17/09/2026 08:02:14',
    user: 'TS. Nguyễn Văn Nam',
    ip: '10.20.4.15',
    action: 'BOOKING_CREATE',
    entity: 'BookingSeries',
    target: 'B2-105',
    diff: {
      action: 'Insert Series 15 weeks',
      dayOfWeek: 'Thứ Tư',
      timeSlot: '07:30 - 11:30'
    }
  },
  {
    id: 'LOG_9020',
    timestamp: '17/09/2026 07:55:00',
    user: 'Lê Thị Mai (Facility Staff)',
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
      addedPermissions: ['booking:series:create', 'equipment:borrow:request'],
      updatedBy: 'AD000001'
    }
  },
  {
    id: 'LOG_9018',
    timestamp: '16/09/2026 14:30:10',
    user: 'Hoàng Quốc Dũng (Academic)',
    ip: '10.20.2.11',
    action: 'SCHEDULE_FREEZE',
    entity: 'CurriculumSchedule',
    target: 'Semester 2026-1',
    diff: {
      state: 'LOCKED',
      totalSlotsLocked: 840
    }
  }
];

export const NOTIFICATIONS = [
  {
    id: 'NOTIF_01',
    title: 'Đơn đặt phòng đã được phê duyệt',
    message: 'Yêu cầu mượn phòng A1-302 ngày 20/09 của bạn đã được duyệt. Vui lòng check-in QR trong 15 phút đầu.',
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
    message: 'Khu vực Lab B2-105 sẽ tạm ngừng phục vụ từ 08:00 đến 17:00 hôm nay để bảo trì hệ thống điều hòa.',
    time: '3 giờ trước',
    read: true,
    type: 'info'
  }
];
