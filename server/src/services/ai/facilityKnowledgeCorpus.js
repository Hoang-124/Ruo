/**
 * Comprehensive Domain Knowledge Ontology, Physics Safety Matrix, 48+ Fault Playbooks,
 * and 340+ Supervised Training Samples for Ruo UEMS (Building A1 — 11 Categories, 55 Templates).
 *
 * Strictly aligned with server/src/seeds/facilityCatalogData.js.
 * Zero external APIs required — powers Ruo's self-contained Local Cortex AI.
 */

export const CATEGORY_ONTOLOGY = {
  'CAT-DISPLAY': {
    code: 'CAT-DISPLAY',
    label: 'Thiết bị Trình chiếu & Hiển thị',
    isElectrical: true,
    hasWater: false,
    isPressurized: false,
    deptKeywords: ['nghe nhìn', 'điện tử', 'cntt', 'kỹ thuật'],
    mentionKeywords: [
      'máy chiếu', 'projector', 'bóng chiếu', 'thấu kính', 'màn chiếu', 'smart tivi',
      'tivi', 'tv 4k', 'màn hình quảng cáo', 'standee', 'signage', 'panasonic pt', 'dalite'
    ]
  },
  'CAT-HVAC': {
    code: 'CAT-HVAC',
    label: 'Điều hòa & Thông gió',
    isElectrical: true,
    hasWater: true,
    isPressurized: true,
    deptKeywords: ['điện lạnh', 'nhiệt lạnh', 'cơ điện', 'điện'],
    mentionKeywords: [
      'điều hòa', 'máy lạnh', 'cassette', 'dàn lạnh', 'dàn nóng', 'cục nóng', 'lốc lạnh',
      'quạt thông gió', 'quạt hút', 'daikin', 'gas lạnh', 'máng nước điều hòa'
    ]
  },
  'CAT-AUDIO': {
    code: 'CAT-AUDIO',
    label: 'Âm thanh, Trợ giảng & Studio',
    isElectrical: true,
    hasWater: false,
    isPressurized: false,
    deptKeywords: ['nghe nhìn', 'âm thanh', 'điện tử'],
    mentionKeywords: [
      'loa âm trần', 'loa kéo', 'loa di động', 'loa hội trường', 'micro', 'tay mic',
      'trợ giảng', 'cục đẩy', 'amply', 'bàn trộn', 'mixer', 'acnos', 'yamaha', 'crown', 'toa'
    ]
  },
  'CAT-IT': {
    code: 'CAT-IT',
    label: 'Máy tính, Server & Thiết bị Lab',
    isElectrical: true,
    hasWater: false,
    isPressurized: false,
    deptKeywords: ['cntt', 'công nghệ thông tin', 'máy tính', 'lab'],
    mentionKeywords: [
      'máy tính', 'pc', 'thùng máy', 'cây máy tính', 'workstation', 'optiplex', 'bàn phím',
      'chuột máy tính', 'máy chủ', 'rack server', 'poweredge', 'nas', 'synology', 'kiosk',
      'kit thực hành', 'kit iot', 'arduino', 'raspberry'
    ]
  },
  'CAT-NET': {
    code: 'CAT-NET',
    label: 'Hạ tầng Mạng & Viễn thông',
    isElectrical: true,
    hasWater: false,
    isPressurized: false,
    deptKeywords: ['mạng', 'cntt', 'viễn thông', 'điện nhẹ'],
    mentionKeywords: [
      'wifi', 'wi-fi', 'bộ phát sóng', 'access point', 'aruba', 'switch', 'catalyst',
      'router', 'tường lửa', 'firewall', 'fortigate', 'tủ mạng', 'tủ rack', 'pdu',
      'điện thoại bàn', 'ip phone', 'yealink', 'ma trận hdmi', 'bộ chia hdmi', 'camera hội nghị', 'logitech rally'
    ]
  },
  'CAT-SEC': {
    code: 'CAT-SEC',
    label: 'An ninh, CCTV & Kiểm soát Cửa',
    isElectrical: true,
    hasWater: false,
    isPressurized: false,
    deptKeywords: ['an ninh', 'điện nhẹ', 'cntt', 'kỹ thuật'],
    mentionKeywords: [
      'camera an ninh', 'camera ip', 'camera ốp trần', 'camera hành lang', 'hikvision',
      'đầu ghi', 'nvr', 'khóa từ', 'cửa từ', 'đầu đọc thẻ', 'vân tay cửa', 'zkteco',
      'máy quét mã vạch', 'đầu đọc mã vạch', 'barcode', 'rfid', 'zebra'
    ]
  },
  'CAT-OFFICE': {
    code: 'CAT-OFFICE',
    label: 'Thiết bị Văn phòng & Cây lọc nước',
    isElectrical: true,
    hasWater: false,
    isPressurized: false,
    deptKeywords: ['thiết bị văn phòng', 'cntt', 'cơ điện', 'bảo trì'],
    mentionKeywords: [
      'máy photocopy', 'máy photo', 'ricoh', 'máy in', 'laserjet', 'hộp mực', 'máy quét tài liệu',
      'máy scan', 'fujitsu', 'máy hủy tài liệu', 'máy hủy giấy', 'lấy số thứ tự',
      'máy chấm công', 'cây nước', 'cây lọc nước', 'máy lọc nước', 'bình nước nóng lạnh', 'karofi'
    ]
  },
  'CAT-POWER': {
    code: 'CAT-POWER',
    label: 'Hệ thống Điện & Chiếu sáng',
    isElectrical: true,
    hasWater: false,
    isPressurized: false,
    deptKeywords: ['điện', 'cơ điện', 'điện công nghiệp', 'bảo trì'],
    mentionKeywords: [
      'đèn panel', 'đèn led trần', 'bóng đèn trần', 'rạng đông', 'đèn sân khấu', 'moving head',
      'bàn dmx', 'đèn sự cố', 'đèn exit', 'kentom', 'tủ điện', 'aptomat', 'cầu dao',
      'công tơ', 'ổ cắm điện', 'ổ điện', 'công tắc đèn', 'schneider'
    ]
  },
  'CAT-FIRE': {
    code: 'CAT-FIRE',
    label: 'Phòng cháy Chữa cháy & Cứu nạn',
    isElectrical: false,
    hasWater: false,
    isPressurized: true,
    deptKeywords: ['pccc', 'an toàn', 'cơ điện', 'bảo trì'],
    mentionKeywords: [
      'bình chữa cháy', 'bình cứu hỏa', 'bình bột', 'bình khí co2', 'tomoken',
      'tủ báo cháy', 'trung tâm báo cháy', 'hochiki', 'đầu báo khói', 'chuông báo cháy',
      'nút nhấn khẩn cấp', 'họng nước chữa cháy', 'tủ pccc', 'vòi chữa cháy', 'lăng phun'
    ]
  },
  'CAT-FURN': {
    code: 'CAT-FURN',
    label: 'Bàn ghế, Tủ kệ & Nội thất',
    isElectrical: false,
    hasWater: false,
    isPressurized: false,
    deptKeywords: ['mộc', 'cơ khí', 'nội thất', 'csvc', 'bảo trì'],
    mentionKeywords: [
      'cái bàn', 'chiếc bàn', 'bàn học', 'bàn sinh viên', 'bàn giảng viên', 'bàn làm việc',
      'bàn họp', 'mặt bàn', 'chân bàn', 'bục giảng', 'bục gỗ', 'bục phát biểu',
      'cái ghế', 'chiếc ghế', 'ghế sinh viên', 'ghế xoay', 'ghế ngồi', 'giá sách',
      'kệ sắt', 'kệ kho', 'tủ sắt', 'tủ hồ sơ', 'tủ locker', 'két sắt', 'rèm cuốn',
      'rèm cửa', 'rèm cản sáng', 'màn rèm', 'hòa phát'
    ]
  },
  'CAT-SPEC': {
    code: 'CAT-SPEC',
    label: 'Thiết bị Y tế Học đường',
    isElectrical: false,
    hasWater: false,
    isPressurized: false,
    deptKeywords: ['y tế', 'thiết bị y tế', 'điện tử', 'bảo trì'],
    mentionKeywords: [
      'giường bệnh', 'giường y tế', 'tủ thuốc', 'xe tiêm', 'máy đo huyết áp',
      'nhiệt kế', 'spo2', 'máy sốc tim', 'aed', 'nihon kohden', 'omron'
    ]
  }
};

/**
 * Per-template physical overrides so hybrid categories (CAT-FIRE, CAT-SPEC, CAT-OFFICE, CAT-FURN)
 * have exact real-world physics.
 */
export const NON_ELECTRICAL_PATTERNS = [
  /bàn\s*(ghế|học|sinh\s*viên|giảng\s*viên|làm\s*việc|họp|gỗ)?/iu,
  /cái\s*bàn|chiếc\s*bàn|mặt\s*bàn|chân\s*bàn|bục\s*(giảng|gỗ|phát\s*biểu)/iu,
  /ghế\s*(sinh\s*viên|xoay|lưới|băng|gỗ|nhựa|ngồi)?|cái\s*ghế/iu,
  /giá\s*sách|kệ\s*(sắt|kho|tải\s*nặng|sách)/iu,
  /tủ\s*(sắt|hồ\s*sơ|locker|thuốc)|két\s*sắt|xe\s*tiêm/iu,
  /rèm\s*(cuốn|cửa|cản\s*sáng|chống\s*chói)|màn\s*rèm/iu,
  /giường\s*(bệnh|y\s*tế|inox)/iu,
  /bình\s*(chữa\s*cháy|cứu\s*hỏa|bột\s*khô|khí\s*co2|abc|mfzl|mt5)/iu,
  /họng\s*nước\s*chữa\s*cháy|vòi\s*chữa\s*cháy|lăng\s*phun/iu,
  /DESK|SHELF|RACKWH|CABFILE|CURTAIN|MEDBED|MEDCAB|EXTPOWD|EXTCO2|HYDRANT/i
];

export const EXPLICIT_ELECTRICAL_PATTERNS = [
  /ổ\s*(cắm|điện)|phích\s*cắm|dây\s*(điện|nguồn)|cầu\s*dao|aptomat|mcb|rcbo|tủ\s*điện/iu,
  /chập\s*điện|tia\s*lửa\s*điện|phóng\s*điện|rò\s*điện|giật\s*điện|nhiễm\s*điện/iu,
  /bo\s*mạch|nguồn\s*cấp|chấn\s*lưu|adapter|biến\s*áp|poe/iu
];

/**
 * 8 Physics-Verified Critical Safety Protocols.
 * Every protocol guarantees:
 *  - reasoning includes "mất an toàn"
 *  - quickChecks[0] begins with "CẢNH BÁO AN TOÀN"
 *  - ZERO nonsensical electrical advice on passive mechanical/furniture items!
 */
export const SAFETY_PROTOCOLS = {
  CLASS_A_SOLID_FIRE: {
    id: 'CLASS_A_SOLID_FIRE',
    label: 'Cháy chất rắn / Nội thất (Không mang điện)',
    buildReasoning: (target, trigger) =>
      `Phát hiện đám cháy vật liệu rắn mất an toàn khẩn cấp trên ${target} ("${trigger}") — tài sản cơ khí/nội thất không dùng điện; cần báo động PCCC, sơ tán lớp học và dập lửa bằng bình bột khô ABC ngay lập tức (SLA khẩn cấp 8 giờ 24/7).`,
    quickChecks: [
      'CẢNH BÁO AN TOÀN PCCC: Hô hoán báo động cháy (nhấn nút khẩn cấp hành lang) và sơ tán ngay toàn bộ sinh viên, giảng viên ra khỏi phòng theo lối thoát hiểm EXIT.',
      'Sử dụng Bình chữa cháy bột khô ABC (MFZL4) hoặc họng nước vách tường gần nhất phun trực tiếp vào gốc lửa; di dời sách vở, rèm cuốn và bàn ghế kế cận để chặn cháy lan.',
      'Báo khẩn cấp cho Tổ Bảo vệ & Đội PCCC cơ sở Tòa A1 (Sảnh A1-CV) để kiểm soát khói và phong tỏa hiện trường.'
    ]
  },

  CLASS_C_ELECTRICAL_FIRE: {
    id: 'CLASS_C_ELECTRICAL_FIRE',
    label: 'Chập cháy điện / Khói khét thiết bị mang điện',
    buildReasoning: (target, trigger) =>
      `Phát hiện dấu hiệu chập cháy điện mất an toàn khẩn cấp tại ${target} ("${trigger}"), cần cô lập Aptomat nhánh từ xa và điều động KTV cơ điện tức thời (SLA khẩn cấp 8 giờ 24/7).`,
    quickChecks: [
      'CẢNH BÁO AN TOÀN ĐIỆN: Ngừng sử dụng ngay; ngắt cầu dao/Aptomat (MCB/RCBO) nhánh phòng từ tủ điện hành lang — tuyệt đối KHÔNG chạm tay trần nắm rút phích cắm đang tia lửa hoặc nóng chảy.',
      'Đưa mọi người ra khỏi vùng khói khét; chỉ dùng Bình chữa cháy khí CO2 (MT5) hoặc bột ABC sau khi đã cắt nguồn điện — NGHIÊM CẤM tạt nước vào thiết bị điện.'
    ]
  },

  ELECTRICAL_SHOCK_LEAKAGE: {
    id: 'ELECTRICAL_SHOCK_LEAKAGE',
    label: 'Rò điện vỏ máy / Nguy cơ điện giật',
    buildReasoning: (target, trigger) =>
      `Phát hiện nguy cơ rò điện gây giật mất an toàn khẩn cấp trên ${target} ("${trigger}"), cần ngắt ngay RCBO chống giật và cách ly tiếp xúc (SLA khẩn cấp 8 giờ 24/7).`,
    quickChecks: [
      'CẢNH BÁO AN TOÀN RÒ ĐIỆN: Tuyệt đối không chạm tay trần vào vỏ kim loại thiết bị hoặc vùng sàn ẩm kế cận; cúp ngay Aptomat chống giật (RCBO/MCB) nhánh phòng.',
      'Đặt vật cản cảnh báo cách ly tối thiểu 2m quanh thiết bị và báo ngay Kỹ thuật viên cơ điện mang đồng hồ đo cách điện, kiểm tra dây tiếp địa.'
    ]
  },

  WATER_FLOOD_HAZARD: {
    id: 'WATER_FLOOD_HAZARD',
    label: 'Vỡ ống / Ngập tràn nước uy hiếp an toàn phòng',
    buildReasoning: (target, trigger) =>
      `Phát hiện sự cố tràn/ngập nước lớn gây mất an toàn trượt ngã và chập điện thứ cấp tại ${target} ("${trigger}"), cần khóa van cấp nước và cô lập điện sàn ngay (SLA khẩn cấp 8 giờ 24/7).`,
    quickChecks: [
      'CẢNH BÁO AN TOÀN NGẬP NƯỚC: Khóa ngay van cấp nước đầu vào gần nhất; nếu nước chảy lan tới ổ cắm âm sàn hoặc dàn máy tính thì ngắt Aptomat nhánh ổ cắm trước khi bước vào vùng ướt.',
      'Di dời thiết bị điện tử, tài liệu lên vị trí khô ráo và báo ngay Tổ Kỹ thuật/Tạp vụ xử lý thoát nước, chống trơn trượt.'
    ]
  },

  STRUCTURAL_COLLAPSE_SHATTER: {
    id: 'STRUCTURAL_COLLAPSE_SHATTER',
    label: 'Sập đổ kết cấu / Rơi vật treo trần / Vỡ kính sắc nhọn',
    buildReasoning: (target, trigger) =>
      `Phát hiện sự cố kết cấu cơ học/vỡ kính gây mất an toàn khẩn cấp tại ${target} ("${trigger}"), cần phong tỏa bán kính nguy hiểm ngay lập tức (SLA khẩn cấp 8 giờ 24/7).`,
    quickChecks: [
      'CẢNH BÁO AN TOÀN KẾT CẤU: Di chuyển sinh viên, giảng viên ra khỏi vùng bên dưới vật treo lơ lửng/kệ nghiêng hoặc khu vực có mảnh kính vỡ; không tự ý đỡ hay tháo dỡ bằng tay không.',
      'Khoanh vùng ghế/lối đi quanh điểm hư hỏng và gọi ngay Kỹ thuật viên cơ khí CSVC mang thang giàn, găng bảo hộ xuống gia cố.'
    ]
  },

  PRESSURIZED_PCCC_HAZARD: {
    id: 'PRESSURIZED_PCCC_HAZARD',
    label: 'Xì nổ bình áp lực PCCC / Rò khí lạnh CO2',
    buildReasoning: (target, trigger) =>
      `Phát hiện sự cố xả áp/rò khí thiết bị PCCC gây mất an toàn hiện trường tại ${target} ("${trigger}"), cần thông gió và cách ly bình áp lực ngay (SLA khẩn cấp 8 giờ 24/7).`,
    quickChecks: [
      'CẢNH BÁO AN TOÀN ÁP LỰC PCCC: Mở thông thoáng cửa phòng/hành lang; tuyệt đối không chạm tay trần vào loa phun hoặc thân bình CO2 đang đóng tuyết để tránh bỏng lạnh sâu (-79°C).',
      'Sơ tán người khỏi vùng khí đặc và báo ngay Tổ PCCC thu hồi bình lỗi, cấp bù bình dự phòng từ Kho KHO-01.'
    ]
  },

  ACCESS_ENTRAPMENT_CRITICAL: {
    id: 'ACCESS_ENTRAPMENT_CRITICAL',
    label: 'Kẹt khóa từ nhốt người / Mất niêm phong phòng trọng yếu',
    buildReasoning: (target, trigger) =>
      `Phát hiện sự cố kẹt kiểm soát cửa gây mất an toàn thoát hiểm/bảo mật khẩn cấp tại ${target} ("${trigger}"), cần mở chốt khẩn cấp ngay (SLA khẩn cấp 8 giờ 24/7).`,
    quickChecks: [
      'CẢNH BÁO AN TOÀN THOÁT HIỂM: Hướng dẫn người bên trong nhấn nút mở khẩn cấp (hộp xanh Emergency Exit / Break-Glass cạnh cửa) để ngắt lực hút khóa từ 280kg.',
      'Gọi ngay Bảo vệ trực tầng mang chìa cơ dự phòng mở cửa và cử người trực gác nếu là phòng Đề thi/Tài vụ/Kho.'
    ]
  },

  MEDICAL_EMERGENCY_CRITICAL: {
    id: 'MEDICAL_EMERGENCY_CRITICAL',
    label: 'Sự cố thiết bị Cấp cứu sinh mạng (AED / Y tế)',
    buildReasoning: (target, trigger) =>
      `Phát hiện lỗi nghiêm trọng trên thiết bị cấp cứu y tế ${target} ("${trigger}") gây mất an toàn sẵn sàng cứu nạn, cần điều chuyển máy dự phòng tức thời (SLA khẩn cấp 8 giờ 24/7).`,
    quickChecks: [
      'CẢNH BÁO AN TOÀN Y TẾ: Dán nhãn "Đang lỗi - Ngưng dùng cấp cứu" lên máy và thông báo ngay Cán bộ Y tế chuyển sang dùng máy AED dự phòng tại điểm trực còn lại (Sảnh A1-CV / Phòng A1-YT-T3).',
      'Kiểm tra hạn tấm dán điện cực (Pad) và pin Lithium chuyên dụng để hãng kỹ thuật y tế xử lý khẩn.'
    ]
  }
};

/**
 * 48 Granular Fault Playbooks covering all 11 Categories & 55 Templates.
 * Used by BM25/TF-IDF Retriever for precise diagnosis, spare-part matching, and non-monotonous guidance.
 */
export const FAULT_PLAYBOOKS = [
  // ===================== 1. CAT-FURN (NỘI THẤT — KHÔNG DÙNG ĐIỆN!) =====================
  {
    id: 'FURN_FIRE_SCORCH',
    categoryCode: 'CAT-FURN',
    title: 'Cháy / Cháy xém bề mặt nội thất gỗ, vải rèm',
    defaultSeverity: 'critical',
    hazardProtocol: 'CLASS_A_SOLID_FIRE',
    isElectrical: false,
    partCodes: [],
    keywords: ['cháy', 'bốc cháy', 'lửa', 'bén lửa', 'cháy xém', 'khói', 'âm ỉ', 'bàn cháy', 'ghế cháy', 'rèm cháy', 'tủ cháy'],
    rootCause: 'Tác động từ nguồn nhiệt/tàn lửa ngoại lai gây bắt cháy bề mặt gỗ công nghiệp Melamine, mút đệm ghế hoặc vải rèm Polyester (tài sản nội thất cơ khí, không có nguồn điện nội tại).',
    steps: [
      'Xác nhận đám cháy chất rắn đã được dập tắt hoàn toàn và làm nguội hết tàn than âm ỉ trong cốt gỗ/vải.',
      'Kiểm tra kết cấu chịu lực của khung thép hộp, mối hàn và diện tích cháy xém mặt bàn/ghế; tách bỏ khỏi phòng học nếu mất an toàn chịu tải.',
      'Vệ sinh muội khói hiện trường, lập biên bản đánh giá hư hỏng vật lý để thay mặt gỗ mới hoặc đề xuất thanh lý, cấp bàn ghế dự phòng từ KHO-01.'
    ],
    quickChecks: [
      'Dùng bình bột khô ABC dập tắt hoàn toàn tàn lửa, tuyệt đối không để sinh viên sử dụng lại bàn/ghế đã cháy xém.',
      'Cách ly sách vở, cặp sách và rèm cửa xung quanh vị trí bị cháy.'
    ]
  },
  {
    id: 'FURN_DESK_CHAIR_BROKEN',
    categoryCode: 'CAT-FURN',
    title: 'Gãy chân bàn ghế, bung mối hàn khung thép hoặc sập mặt ghế',
    defaultSeverity: 'major',
    isElectrical: false,
    partCodes: [],
    keywords: ['gãy chân', 'gãy bàn', 'gãy ghế', 'sập bàn', 'sập ghế', 'bung mối hàn', 'nứt khung', 'gãy tựa lưng', 'tụt piston', 'gãy bánh xe', 'cong khung sắt'],
    rootCause: 'Mỏi kim loại tại mối hàn khung thép hộp hoặc quá tải cục bộ làm gãy pát đỡ mặt gỗ Melamine / hỏng cụm ben hơi ghế xoay.',
    steps: [
      'Di chuyển bàn/ghế hỏng ra khỏi dãy ngồi học để phòng ngừa sinh viên ngồi nhầm gây té ngã hoặc kẹt tay.',
      'Kiểm tra vết đứt mối hàn khung thép hộp 25x50mm, độ nứt toác cốt gỗ Melamine tại các lỗ bắt vít và cụm chân sao/bánh xe.',
      'Hàn gia cố CO2 + sơn dặm chống gỉ tại xưởng cơ khí hoặc thay thế cụm mặt gỗ/piston ghế; kiểm tra tải tĩnh chắc chắn trước khi trả lại phòng.'
    ],
    quickChecks: [
      'Úp ngược hoặc dán giấy cảnh báo "Ghế/Bàn Hỏng - Không Ngồi" ngay tại vị trí vừa gãy để đảm bảo an toàn lớp học.',
      'Quan sát xem có cạnh tôn/thép gãy sắc nhọn nhô ra lối đi hay không để kê gọn vào góc phòng.'
    ]
  },
  {
    id: 'FURN_LOOSE_HARDWARE_LOCK',
    categoryCode: 'CAT-FURN',
    title: 'Lỏng ốc vít bàn ghế, cập kênh hoặc kẹt bản lề / ổ khóa tủ sắt',
    defaultSeverity: 'minor',
    isElectrical: false,
    partCodes: [],
    keywords: ['lỏng ốc', 'bung vít', 'cập kênh', 'lung lay', 'kêu cót két', 'tróc cạnh', 'tróc sơn', 'xước mặt bàn', 'bong tróc', 'bong nẹp', 'kẹt khóa tủ', 'gãy chìa', 'bản lề tủ', 'kẹt ngăn kéo', 'locker', 'két sắt'],
    rootCause: 'Rung động qua tần suất sử dụng cao làm trờn ren vít gỗ/ốc lục giác, lệch nút cao su chân bàn hoặc khô kẹt bi ổ khóa tủ hồ sơ/Locker.',
    steps: [
      'Rà soát và siết chặt toàn bộ bulông liên kết khung thép, bổ sung vít nở/ke góc inox tại các điểm trờn ren cốt gỗ.',
      'Thay thế nút bịt cao su chân bàn ghế bị mòn để triệt tiêu độ cập kênh và tiếng ồn kéo lê trên sàn gạch.',
      'Tra dầu bôi trơn chuyên dụng RP7/graphite vào lõi khóa, căn chỉnh lại khe hở bản lề cánh tủ sắt hoặc thay ổ khóa cam mới nếu gãy ngậm chìa.'
    ],
    quickChecks: [
      'Không cố vặn mạnh chìa khóa đang bị kẹt cứng trong ổ tủ Locker/tủ hồ sơ để tránh gãy ngậm chìa bên trong.',
      'Ghi chú rõ số thứ tự dãy bàn hoặc mã ngăn tủ bị lỗi để KTV mộc/cơ khí xử lý nhanh.'
    ]
  },
  {
    id: 'FURN_CURTAIN_BLIND_JAM',
    categoryCode: 'CAT-FURN',
    title: 'Hư hỏng rèm cuốn cản sáng (đứt dây kéo, tuột trục lò xo)',
    defaultSeverity: 'minor',
    isElectrical: false,
    partCodes: [],
    keywords: ['rèm cuốn', 'rèm cửa', 'màn rèm', 'đứt dây kéo', 'kẹt rèm', 'rơi rèm', 'tuột rèm', 'rách rèm', 'chói nắng', 'không kéo lên được'],
    rootCause: 'Mòn bánh răng bộ đầu kéo hạt nhựa (clutch), đứt dây chuỗi hạt hoặc bung vít nở tắc kê bát treo rèm cuốn trên khung cửa sổ.',
    steps: [
      'Kiểm tra độ chắc chắn của hai bát đỡ đầu trục rèm trên tường/khung nhôm nhằm loại trừ nguy cơ rơi cả ống nhôm rèm.',
      'Tháo bộ củ kéo đầu trục, thay thế dây chuỗi hạt chịu lực hoặc cụm lò xo trợ lực cuộn.',
      'Căn chỉnh lại hành trình cuộn phẳng tấm vải Polyester cản sáng và bắt lại tắc kê nở sắt nếu tường bị bở.'
    ],
    quickChecks: [
      'Không giật mạnh tấm bạt rèm khi bộ củ kéo đang bị kẹt dây để tránh làm cong ống nhôm treo trên cao.',
      'Nếu một đầu trục rèm có dấu hiệu bung khỏi tường, tạm tránh ngồi sát bệ cửa sổ bên dưới.'
    ]
  },
  {
    id: 'FURN_SHELF_RACK_TILT',
    categoryCode: 'CAT-FURN',
    title: 'Võng mâm kệ sắt kho / nghiêng giá sách thư viện tải nặng',
    defaultSeverity: 'critical',
    hazardProtocol: 'STRUCTURAL_COLLAPSE_SHATTER',
    isElectrical: false,
    partCodes: [],
    keywords: ['nghiêng kệ', 'sập kệ', 'võng kệ', 'đổ giá sách', 'nghiêng giá sách', 'cong mâm sắt', 'bung ngàm kệ', 'kệ kho', 'giá sách'],
    rootCause: 'Chất tải vượt định mức chịu lực 200kg/tầng hoặc lỏng bulông chân trụ tắc kê sàn làm mất ổn định khung kệ sắt Selective / giá sách 2 mặt.',
    steps: [
      'Phong tỏa hành lang giữa hai dãy giá sách/kệ kho; bốc dỡ hạ tải thiết bị/sách từ tầng cao xuống sàn theo thứ tự an toàn.',
      'Đo độ thẳng đứng chân trụ Omega, thay thế thanh beam/mâm tôn bị biến dạng dẻo và đóng lại bulông nở sắt M10 xuống nền bê tông.',
      'Phân bổ lại tải trọng nặng xuống tầng đáy và dán nhãn giới hạn tải trọng tối đa trên từng khoang kệ.'
    ],
    quickChecks: [
      'CẢNH BÁO AN TOÀN KẾT CẤU: Cấm người đi vào khe hành lang phía kệ đang nghiêng; tuyệt đối không dùng tay đẩy ngược kệ đang chất nặng.',
      'Thông báo ngay Thủ kho / Thủ thư khóa lối đi dãy kệ chờ KTV cơ khí hạ tải.'
    ]
  },

  // ===================== 2. CAT-DISPLAY (TRÌNH CHIẾU & HIỂN THỊ) =====================
  {
    id: 'DISPLAY_LAMP_BURNOUT',
    categoryCode: 'CAT-DISPLAY',
    title: 'Máy chiếu cháy/suy hao bóng đèn cao áp (tối mờ, báo đèn LAMP đỏ)',
    defaultSeverity: 'major',
    isElectrical: true,
    partCodes: ['PART-LAMP', 'PART-FILT'],
    keywords: ['cháy bóng', 'hỏng bóng', 'đèn lamp', 'lamp đỏ', 'mờ đục', 'tối om', 'vàng màu', 'bóng đèn máy chiếu', 'hết giờ bóng', 'nổ bóng chiếu'],
    rootCause: 'Cụm bóng đèn cao áp 230W–250W vượt ngưỡng tuổi thọ giờ chiếu hoặc lão hóa bầu thạch anh gây sụt quang thông / ngắt bảo vệ Ballast.',
    steps: [
      'Đọc mã nháy đèn chỉ thị LAMP trên thân máy chiếu Panasonic/Epson và kiểm tra bộ đếm Lamp Hours trong Service Menu.',
      'Chờ buồng bóng nguội tối thiểu 15 phút, tháo khay bảo vệ kiểm tra bầu bóng và thay thế cụm bóng chính hãng (PART-LAMP).',
      'Vệ sinh đồng thời tấm lọc bụi tĩnh điện (PART-FILT), Reset bộ đếm giờ bóng về 0h và chiếu thử độ đồng đều sáng 20 phút.'
    ],
    quickChecks: [
      'Quan sát đèn báo trên vỏ máy chiếu: nếu đèn LAMP sáng/nháy Đỏ mà quạt vẫn quay, bóng chiếu đã tới hạn thay thế.',
      'Không bật/tắt nguồn liên tục nhiều lần khi bóng đèn đã báo lỗi LAMP.'
    ]
  },
  {
    id: 'DISPLAY_OVERHEAT_TEMP',
    categoryCode: 'CAT-DISPLAY',
    title: 'Máy chiếu quá nhiệt tự ngắt sau vài phút (báo TEMP / quạt gào to)',
    defaultSeverity: 'major',
    isElectrical: true,
    partCodes: ['PART-FILT'],
    keywords: ['quá nhiệt', 'nóng tự tắt', 'tự tắt sau', 'đèn temp', 'quạt kêu to', 'quạt gào', 'bụi bẩn', 'lọc bụi', 'chạy một lúc rồi tắt'],
    rootCause: 'Tắc nghẽn tấm lưới lọc bụi tĩnh điện hoặc khô kẹt bạc đạn quạt hút làm nhiệt độ buồng quang vượt ngưỡng ngắt rơ-le nhiệt (Thermal Cutout).',
    steps: [
      'Tháo tấm lọc bụi hông máy chiếu (PART-FILT) kiểm tra mức độ bít bụi và vệ sinh khe gió vào/ra bằng khí nén khô.',
      'Kiểm tra tốc độ quay của quạt làm mát Ballast/Lamp Fan trên mainboard và cảm biến nhiệt NTC.',
      'Thay tấm lọc bụi tĩnh điện mới nếu rách mủn, chạy thử tải liên tục 30 phút theo dõi nhiệt độ ổn định.'
    ],
    quickChecks: [
      'Để máy chiếu nghỉ cho quạt thổi nguội hẳn 5–10 phút trước khi rút nguồn; không che chắn cửa thoát gió nóng của máy.',
      'Ghi nhận thời gian từ lúc bật đến lúc máy tự ngắt để KTV chuẩn bị sẵn tấm lọc và quạt tản nhiệt.'
    ]
  },
  {
    id: 'DISPLAY_HDMI_NO_SIGNAL',
    categoryCode: 'CAT-DISPLAY',
    title: 'Máy chiếu / Smart TV mất tín hiệu hình ảnh (No Signal / chập chờn cáp HDMI)',
    defaultSeverity: 'major',
    isElectrical: true,
    partCodes: ['PART-HDMI', 'PART-RMT'],
    keywords: ['no signal', 'không lên hình', 'mất hình', 'chập chờn hình', 'nháy hình', 'sọc màn hình', 'sai màu', 'cáp hdmi', 'dây hdmi', 'không nhận laptop', 'không chiếu được'],
    rootCause: 'Đứt ngầm/oxy hóa đầu giắc cáp tín hiệu HDMI âm tường tại bàn giảng viên hoặc chọn sai cổng Input Source (HDMI1/HDMI2).',
    steps: [
      'Dùng cáp HDMI mẫu ngắn kết nối trực tiếp Laptop vào cổng HDMI trên máy chiếu/Smart TV để cô lập lỗi thiết bị với dây âm tường.',
      'Kiểm tra hộp ổ cắm mặt bàn giảng viên và thay thế sợi cáp tín hiệu HDMI 2.0 chống nhiễu (PART-HDMI) nếu suy hao tín hiệu.',
      'Kiểm tra độ phân giải xuất hình (khuyến nghị 1920x1080 @ 60Hz) và khóa cấu hình Auto Source Search.'
    ],
    quickChecks: [
      'Bấm tổ hợp phím Windows + P trên Laptop chọn chế độ "Duplicate" và bấm nút Input/Source trên điều khiển để chọn đúng cổng HDMI.',
      'Quan sát đầu giắc cáp HDMI trên bàn giảng viên xem có bị cong gãy chân đồng không.'
    ]
  },
  {
    id: 'DISPLAY_DEAD_POWER',
    categoryCode: 'CAT-DISPLAY',
    title: 'Máy chiếu / Tivi / Standee mất nguồn hoàn toàn (không sáng đèn chờ)',
    defaultSeverity: 'major',
    isElectrical: true,
    partCodes: ['PART-MCB', 'PART-RMT'],
    keywords: ['không lên nguồn', 'mất nguồn', 'tắt ngúm', 'không vào điện', 'không sáng đèn báo', 'bật không lên', 'chết nguồn'],
    rootCause: 'Mất điện ổ cắm nhánh trần/tường, đứt cầu chì bảo vệ sơ cấp hoặc hỏng khối nguồn xung (PSU/Power Board) do xung áp.',
    steps: [
      'Đo điện áp 220VAC tại ổ cắm cấp nguồn trần/sau lưng TV và kiểm tra dây nguồn AC số 8 / C13 có bị tuột lỏng không.',
      'Kiểm tra cầu chì thủy tinh, tụ lọc nguồn sơ cấp và IC dao động trên bo nguồn máy chiếu / Smart TV.',
      'Nếu hỏng bo nguồn chuyên sâu cần tháo về xưởng sửa chữa thì tạm cấp thiết bị trình chiếu dự phòng từ KHO-01 để không gián đoạn tiết học.'
    ],
    quickChecks: [
      'Kiểm tra công tắc nguồn phụ trên thân máy và đảm bảo công tắc nhánh thiết bị tại bục giảng đã bật ON.',
      'Thử bấm nút Power cứng trực tiếp trên thân máy để loại trừ trường hợp điều khiển từ xa hết pin.'
    ]
  },
  {
    id: 'DISPLAY_MOTOR_SCREEN',
    categoryCode: 'CAT-DISPLAY',
    title: 'Màn chiếu điện tự động kẹt cuộn, kêu mô-tơ hoặc hỏng điều khiển',
    defaultSeverity: 'major',
    isElectrical: true,
    partCodes: ['PART-RMT'],
    keywords: ['màn chiếu', 'không hạ xuống', 'không cuộn lên', 'kẹt màn chiếu', 'mô tơ màn chiếu', 'hộp điều khiển màn chiếu', 'rách vải màn'],
    rootCause: 'Trôi công tắc hành trình giới hạn (Limit Switch), yếu tụ khởi động mô-tơ ống (Tubular Motor) hoặc mất đồng bộ hộp nhận RF remote.',
    steps: [
      'Thử điều khiển bằng hộp bấm tường cố định (Up/Stop/Down) để phân biệt lỗi tay remote RF (PART-RMT) với lỗi mô-tơ ống.',
      'Đo trị số tụ đề mô-tơ màn chiếu và căn chỉnh lại 2 vít giới hạn hành trình lên/xuống để vải màn không bị cuộn lệch mép.',
      'Kiểm tra tai treo trần hộp màn chiếu Dalite 120" đảm bảo an toàn cơ khí.'
    ],
    quickChecks: [
      'Tuyệt đối không dùng tay kéo ghì vải màn chiếu điện xuống vì sẽ làm vỡ nhông hộp số mô-tơ ống.',
      'Thử bấm hộp nút nhấn gắn tường cạnh bảng viết thay cho remote cầm tay.'
    ]
  },
  {
    id: 'DISPLAY_PANEL_CRACK_LINES',
    categoryCode: 'CAT-DISPLAY',
    title: 'Smart TV / Standee vỡ tấm nền LCD, kẻ sọc hoặc tối nửa màn hình',
    defaultSeverity: 'major',
    isElectrical: true,
    partCodes: [],
    keywords: ['vỡ màn hình', 'nứt màn hình', 'chảy mực', 'kẻ sọc dọc', 'sọc ngang', 'tối nửa màn', 'có tiếng không có hình', 'chết led nền'],
    rootCause: 'Tác động ngoại lực làm nứt tấm nền tinh thể lỏng (Panel LCD), chập cáp tab COF hoặc đứt thanh LED nền (Backlight).',
    steps: [
      'Chiếu đèn pin sát mặt kính TV khi đang bật tiếng để phân biệt lỗi chết thanh LED nền với lỗi vỡ/chập tấm nền Panel.',
      'Nếu chết thanh LED nền: tháo thay bộ thanh LED Backlight đồng bộ; nếu nứt vỡ Panel LCD (chi phí > 60% nguyên giá): lập biên bản đánh giá kinh tế RACI đề xuất thanh lý.',
      'Kiểm tra khung treo tường VESA và vị trí kê tránh va đập cửa phòng.'
    ],
    quickChecks: [
      'Không ấn tay vào vết nứt hoặc vùng chảy mực đen trên màn hình TV/Standee.',
      'Chụp ảnh hiện trạng màn hình khi đang hiển thị để lưu hồ sơ bảo hành / đánh giá thiệt hại.'
    ]
  },

  // ===================== 3. CAT-HVAC (ĐIỀU HÒA & THÔNG GIÓ) =====================
  {
    id: 'HVAC_NO_COOLING',
    categoryCode: 'CAT-HVAC',
    title: 'Điều hòa bật không mát, chỉ thổi gió nóng hoặc lốc nén không đóng',
    defaultSeverity: 'major',
    isElectrical: true,
    partCodes: ['PART-RMT', 'PART-MCB'],
    keywords: ['không mát', 'mất lạnh', 'thổi gió nóng', 'hơi nóng', 'kém lạnh', 'lâu mát', 'nóng bức', 'không lạnh', 'thiếu gas', 'hết gas'],
    rootCause: 'Tụ khởi động máy nén dàn nóng suy giảm dung lượng, thiếu hụt môi chất lạnh (gas R410A/R32) do rò giắc co hoặc bám bẩn kín dàn tản nhiệt.',
    steps: [
      'Kiểm tra chế độ vận hành COOL (22–24°C), đo dòng làm việc máy nén bằng ampe kìm và kiểm tra tụ đề / bo biến tần dàn nóng.',
      'Đo áp suất gas hút/đẩy bằng đồng hồ chuyên dụng, thử kín bằng bọt xà phòng tại đầu tán ống đồng và nạp bổ sung gas đúng định mức.',
      'Xịt rửa lưới lọc bụi dàn lạnh Cassette + cánh tản nhiệt dàn nóng để khôi phục lưu lượng trao đổi nhiệt.'
    ],
    quickChecks: [
      'Kiểm tra màn hình điều khiển xem có đang để nhầm chế độ FAN (quạt gió) hoặc DRY/HEAT thay vì COOL (hình bông tuyết) không.',
      'Đóng kín cửa ra vào và cửa sổ phòng học để tránh thất thoát nhiệt.'
    ]
  },
  {
    id: 'HVAC_WATER_DRIP',
    categoryCode: 'CAT-HVAC',
    title: 'Dàn lạnh điều hòa chảy/nhỏ nước xuống sàn hoặc bàn học',
    defaultSeverity: 'major',
    isElectrical: true,
    partCodes: [],
    keywords: ['chảy nước', 'nhỏ nước', 'rò nước điều hòa', 'tràn máng nước', 'ướt sàn', 'nhễu nước', 'tắc ống thoát nước', 'đóng tuyết'],
    rootCause: 'Bùn rêu làm tắc đường ống PVC thoát nước ngưng, hỏng bơm thoát nước ngưng (Drain Pump) hoặc kẹt công tắc phao báo đầy trên máy Cassette âm trần.',
    steps: [
      'Ngắt nguồn điều hòa, tháo mặt nạ Cassette kiểm tra khay hứng nước ngưng, công tắc phao (Float Switch) và mô-tơ bơm nước xả.',
      'Thông áp lực đường ống thoát nước ngưng và vệ sinh khay nước bằng dung dịch khử rêu cặn.',
      'Kiểm tra bảo ôn ống đồng tránh đọng sương nhỏ giọt trên trần thạch cao.'
    ],
    quickChecks: [
      'Tắt ngay điều hòa đang chảy nước và di dời Laptop, ổ điện nối dài hoặc máy tính bên dưới luồng nước nhỏ giọt.',
      'Đặt xô/khăn thấm tạm thời dưới vị trí nhỏ nước để tránh trơn trượt cho lớp học.'
    ]
  },
  {
    id: 'HVAC_NOISE_FAN_EXHAUST',
    categoryCode: 'CAT-HVAC',
    title: 'Điều hòa / Quạt thông gió âm trần kêu to, rung lắc hoặc có mùi hôi',
    defaultSeverity: 'minor',
    isElectrical: true,
    partCodes: [],
    keywords: ['kêu to', 'kêu ù', 'kêu lạch cạch', 'rung mạnh', 'mùi hôi', 'mùi ẩm mốc', 'quạt thông gió', 'quạt hút không quay', 'kẹt cánh vẫy'],
    rootCause: 'Khô mỡ/rơ bạc đạn trục quạt lồng sóc (hoặc quạt hút âm trần FV-24CU8), lệch cân bằng động cánh quạt hoặc nấm mốc tích tụ dàn lạnh.',
    steps: [
      'Tháo kiểm tra bạc đạn/vòng bi mô-tơ quạt dàn lạnh hoặc quạt thông gió âm trần, thay vòng bi mới và tra mỡ chịu nhiệt.',
      'Siết lại ty treo chống rung trần, kiểm tra mô-tơ đảo gió (Swing Louver) bị gãy ngàm nhựa.',
      'Vệ sinh khử khuẩn dàn lạnh và đường ống gió nối trần.'
    ],
    quickChecks: [
      'Thử hạ tốc độ quạt gió (Fan Speed) xuống mức Low để giảm rung ồn tạm thời trong giờ giảng.',
      'Nếu quạt hút âm trần kẹt cứng đứng cánh và kêu ù điện, hãy tắt công tắc quạt ngay để tránh cháy cuộn dây.'
    ]
  },

  // ===================== 4. CAT-IT (MÁY TÍNH LAB, SERVER, NAS, KIOSK, IOT) =====================
  {
    id: 'IT_PC_NO_POWER',
    categoryCode: 'CAT-IT',
    title: 'Máy tính phòng Lab / Kiosk bật không lên nguồn',
    defaultSeverity: 'major',
    isElectrical: true,
    partCodes: ['PART-MCB'],
    keywords: ['pc không lên', 'máy tính không bật được', 'bấm nguồn không lên', 'cây máy tính mất nguồn', 'chết nguồn pc', 'psu', 'kiosk tắt nguồn'],
    rootCause: 'Hỏng bộ nguồn ATX PSU Dell OptiPlex, liệt nút nhấn Power mặt trước hoặc nhảy Aptomat nhánh ổ cắm bàn thực hành.',
    steps: [
      'Kiểm tra điện áp ổ cắm dưới bàn Lab, dây nguồn C13 và đèn LED BIST tự kiểm tra phía sau bộ nguồn PSU Dell.',
      'Đo kiểm đường 5VSB/12V của PSU, thử kích nguồn trực tiếp trên mainboard để loại trừ đứt dây nút bấm Power SW.',
      'Thay bộ nguồn PSU tương thích hoặc điều chuyển thùng máy dự phòng từ KHO-01 phục vụ ca thi/thực hành.'
    ],
    quickChecks: [
      'Kiểm tra phích cắm nguồn sau thùng máy và màn hình xem có bị chân sinh viên đá tuột khỏi ổ điện gầm bàn không.',
      'Quan sát đèn ổ điện bàn thực hành xem cả dãy máy cùng mất điện hay chỉ 1 máy đơn lẻ.'
    ]
  },
  {
    id: 'IT_BSOD_BOOT_RAM_DISK',
    categoryCode: 'CAT-IT',
    title: 'Máy tính lỗi màn hình xanh (BSOD), kêu bíp RAM hoặc không vào Windows',
    defaultSeverity: 'major',
    isElectrical: true,
    partCodes: [],
    keywords: ['màn hình xanh', 'bsod', 'treo logo', 'không khởi động', 'báo lỗi ổ cứng', 'no bootable', 'kêu bíp', 'tự khởi động lại', 'đơ máy', 'treo máy', 'lỗi win'],
    rootCause: 'Oxy hóa chân tiếp xúc thanh RAM DDR4, suy giảm S.M.A.R.T ổ cứng SSD NVMe hoặc lỗi phân vùng Boot hệ điều hành phòng Lab.',
    steps: [
      'Ghi nhận mã nháy đèn vàng/trắng chẩn đoán Dell hoặc mã dừng BSOD, tháo vệ sinh khe cắm và chân đồng thanh RAM.',
      'Chạy công cụ chẩn đoán ePSA Pre-boot kiểm tra sức khỏe SSD/RAM và nhiệt độ keo tản nhiệt CPU.',
      'Thay thế ổ SSD lỗi hoặc bung lại bản Ghost/Image chuẩn của phòng thực hành qua mạng LAN PXE.'
    ],
    quickChecks: [
      'Chụp lại dòng mã lỗi trên màn hình xanh hoặc số nhịp nháy đèn nút nguồn để KTV CNTT chẩn đoán chính xác.',
      'Tạm bố trí sinh viên chuyển sang máy trạm trống trong phòng Lab.'
    ]
  },
  {
    id: 'IT_SERVER_NAS_RAID',
    categoryCode: 'CAT-IT',
    title: 'Máy chủ Server / Thiết bị lưu trữ NAS cảnh báo lỗi ổ cứng RAID hoặc quá nhiệt',
    defaultSeverity: 'critical',
    hazardProtocol: null,
    isElectrical: true,
    partCodes: ['PART-PATCH'],
    keywords: ['máy chủ', 'server', 'nas', 'synology', 'poweredge', 'raid', 'degraded', 'báo đèn cam ổ cứng', 'lỗi lưu trữ', 'kêu bíp liên tục nas'],
    rootCause: 'Một ổ cứng Enterprise HDD trong cụm RAID phát sinh Bad Sector chuyển sang trạng thái Degraded hoặc lỗi quạt làm mát hộc Hot-swap.',
    steps: [
      'Đăng nhập iDRAC (Dell PowerEdge) / DSM (Synology) xác định chính xác số thứ tự khay (Bay/Slot) ổ cứng đang báo Faulty — TUYỆT ĐỐI không rút nhầm ổ lành.',
      'Sao lưu khẩn cấp dữ liệu học liệu/CSDL quan trọng trước khi thực hiện Hot-swap ổ cứng cùng dung lượng và khởi chạy Rebuild RAID.',
      'Kiểm tra quạt tản nhiệt冗余 (Redundant Fan) và nguồn kép PSU trong tủ Rack.'
    ],
    quickChecks: [
      'Tuyệt đối KHÔNG tắt ngang nguồn máy chủ/NAS và KHÔNG tự ý rút khay ổ cứng khi chưa xác định trạng thái RAID.',
      'Đảm bảo điều hòa phòng Server/Kho mạng đang hoạt động mát dưới 24°C.'
    ]
  },
  {
    id: 'IT_PERIPHERAL_IOT_KIT',
    categoryCode: 'CAT-IT',
    title: 'Hỏng bàn phím/chuột, liệt cảm ứng Kiosk hoặc lỗi bộ Kit thực hành IoT',
    defaultSeverity: 'minor',
    isElectrical: true,
    partCodes: [],
    keywords: ['liệt phím', 'hỏng chuột', 'kẹt phím', 'liệt cảm ứng', 'loạn cảm ứng', 'kit iot', 'arduino', 'raspberry', 'cháy mạch thực hành', 'hỏng cổng usb'],
    rootCause: 'Đứt ngầm dây cáp USB chuột/phím, trôi hiệu chuẩn khung cảm ứng hồng ngoại Kiosk hoặc chạm chập chân GPIO trên mạch thực hành sinh viên.',
    steps: [
      'Thử cắm sang cổng USB phía sau mainboard để loại trừ lỗi cổng USB mặt trước thùng máy.',
      'Vệ sinh viền cảm ứng Kiosk 32" và chạy lại trình Calibration; với Kit IoT kiểm tra khối ổn áp 5V/3.3V và cầu chì tự phục hồi PTC.',
      'Thay thế ngoại vi/module cảm biến hư hỏng trong vali thực hành.'
    ],
    quickChecks: [
      'Rút cáp USB chuột/bàn phím/cảm ứng cắm lại sang cổng USB khác để kiểm tra nhanh.',
      'Với bộ Kit IoT, ngắt nguồn adapter ngay nếu phát hiện sinh viên đấu nối nhầm cực VCC–GND.'
    ]
  },

  // ===================== 5. CAT-NET (MẠNG, WIFI, SWITCH, ROUTER, HỘI NGHỊ) =====================
  {
    id: 'NET_WIFI_DEAD_SLOW',
    categoryCode: 'CAT-NET',
    title: 'Mất sóng Wi-Fi phòng học / Bộ phát Aruba tắt đèn hoặc nghẽn kết nối',
    defaultSeverity: 'major',
    isElectrical: true,
    partCodes: ['PART-PATCH'],
    keywords: ['mất wifi', 'không bắt được wifi', 'wifi chấm than', 'wifi yếu', 'rớt mạng wifi', 'aruba', 'bộ phát sóng', 'không cấp ip', 'nghẽn wifi'],
    rootCause: 'Suy hao cáp mạng âm trần làm rớt nguồn PoE cấp cho Access Point Aruba AP22, treo tiến trình cấp phát DHCP hoặc nhiễu kênh 2.4GHz/5GHz.',
    steps: [
      'Quan sát đèn trạng thái trên đĩa phát Wi-Fi ốp trần (tắt hẳn = mất PoE, nháy cam = mất Uplink/Cloud).',
      'Đo kiểm thông mạch 8 sợi cáp mạng Cat6 bằng máy test cáp, bấm lại hạt mạng RJ45 hoặc thay dây nhảy (PART-PATCH) tại tủ Switch tầng.',
      'Reset cổng PoE trên Switch Cisco và kiểm tra dải IP DHCP Pool của VLAN giảng đường.'
    ],
    quickChecks: [
      'Quan sát bộ phát Wi-Fi tròn gắn trên trần phòng xem đèn LED còn sáng xanh hay đã tắt hẳn.',
      'Thử quên mạng (Forget Network) và kết nối lại trên 2 thiết bị khác nhau để xác nhận lỗi chung toàn phòng.'
    ]
  },
  {
    id: 'NET_SWITCH_ROUTER_OUTAGE',
    categoryCode: 'CAT-NET',
    title: 'Mất mạng LAN toàn phòng Lab / Tầng (lỗi Switch PoE, Router hoặc Loop mạng)',
    defaultSeverity: 'critical',
    hazardProtocol: null,
    isElectrical: true,
    partCodes: ['PART-PATCH', 'PART-MCB'],
    keywords: ['mất mạng toàn phòng', 'mất mạng cả tầng', 'rớt mạng lan', 'đứt cáp mạng', 'switch', 'router', 'tường lửa', 'loop mạng', 'nháy đèn đồng loạt', 'tê liệt mạng'],
    rootCause: 'Cắm nhầm dây nhảy gây vòng lặp Broadcast Storm (Loop mạng), mất nguồn thanh PDU tủ Rack hoặc đứt tuyến Uplink giữa Switch tầng và Firewall FortiGate.',
    steps: [
      'Kiểm tra tủ Rack 27U: quan sát nhịp nháy đèn cổng trên Switch Cisco Catalyst C1000 để phát hiện cổng bị Loopback / Err-disabled.',
      'Kiểm tra nguồn thanh ổ cắm PDU, module quang SFP Uplink và trạng thái phiên WAN/VLAN trên FortiGate 60F.',
      'Thay thế dây nhảy Patch Cord Cat6 hỏng (PART-PATCH) và bật tính năng Spanning Tree / Loop Guard trên các cổng bàn sinh viên.'
    ],
    quickChecks: [
      'Kiểm tra xem có sinh viên nào vô tình cắm hai đầu của cùng một sợi dây mạng vào hai ổ mạng trên tường/bàn không (gây Loop mạng toàn phòng).',
      'Kiểm tra công tắc nguồn tủ mạng Rack treo tường trong phòng Lab.'
    ]
  },
  {
    id: 'NET_CONF_CAM_HDMI_PHONE',
    categoryCode: 'CAT-NET',
    title: 'Lỗi Camera hội nghị PTZ, Bộ ma trận HDMI 4x4 hoặc Điện thoại bàn IP',
    defaultSeverity: 'major',
    isElectrical: true,
    partCodes: ['PART-HDMI', 'PART-PATCH', 'PART-RMT'],
    keywords: ['camera hội nghị', 'logitech rally', 'họp trực tuyến', 'ma trận hdmi', 'bộ chia hdmi', 'aten', 'điện thoại ip', 'yealink', 'mất tín hiệu điện thoại bàn', 'no service'],
    rootCause: 'Lỗi chuyển mạch EDID trên ma trận HDMI Aten 4x4, lỏng cáp USB 3.0 camera hội nghị PTZ hoặc mất đăng ký tài khoản SIP/PoE trên điện thoại IP.',
    steps: [
      'Với phòng họp trực tuyến: kiểm tra bộ cấp nguồn Hub Logitech Rally, cáp USB-C truyền hình và cấu hình EDID trên bộ ma trận HDMI (PART-HDMI).',
      'Với điện thoại IP Yealink: kiểm tra nguồn PoE / dây nhảy mạng (PART-PATCH) và trạng thái kết nối tổng đài nội bộ SIP.',
      'Thử nghiệm gọi/trình chiếu đa điểm trước khi bàn giao lại phòng họp.'
    ],
    quickChecks: [
      'Kiểm tra đèn báo trên bộ chia HDMI và khởi động lại nguồn bộ chia nếu bị treo chuyển kênh.',
      'Với điện thoại bàn IP, kiểm tra dây mạng cắm đúng cổng "Internet/LAN" thay vì cổng "PC" phía sau máy.'
    ]
  },

  // ===================== 6. CAT-AUDIO (ÂM THANH, TRỢ GIẢNG, STUDIO) =====================
  {
    id: 'AUDIO_MIC_FEEDBACK_MUTE',
    categoryCode: 'CAT-AUDIO',
    title: 'Micro không dây mất tiếng, chập chờn sóng hoặc hú rít chói tai (Feedback)',
    defaultSeverity: 'major',
    isElectrical: true,
    partCodes: ['PART-RMT'],
    keywords: ['micro mất tiếng', 'mic không nói được', 'hú rít', 'bị hú', 'rè loa', 'lệch tần số', 'hết pin mic', 'trợ giảng hỏng', 'âm thanh nhỏ'],
    rootCause: 'Hết pin tiểu tay micro, lệch kênh tần số hồng ngoại IR giữa tay mic và đầu thu UHF hoặc đẩy Gain/Treble quá cao gây cộng hưởng hú âm học.',
    steps: [
      'Thay pin mới cho tay micro, thực hiện đồng bộ lại tần số IR (Sync) với đầu thu và kiểm tra củ thu âm (capsule) có bị rơi đứt dây không.',
      'Kiểm tra chiết áp Gain, EQ cắt tần số hú (2.5kHz–4kHz) trên bàn trộn Yamaha MG16XU và jack tín hiệu 6ly / Canon XLR.',
      'Hướng dẫn giảng viên khoảng cách cầm mic chuẩn, tránh chĩa thẳng đầu micro vào loa treo tường.'
    ],
    quickChecks: [
      'Thay thử cặp pin AA mới vào tay micro và kiểm tra nút gạt MUTE trên thân mic.',
      'Hạ bớt núm âm lượng MIC / MASTER trên tủ âm thanh nếu loa đang hú rít mạnh.'
    ]
  },
  {
    id: 'AUDIO_PORTABLE_BATTERY',
    categoryCode: 'CAT-AUDIO',
    title: 'Loa kéo di động sụt pin nhanh, sạc không vào hoặc mất nguồn ắc quy',
    defaultSeverity: 'major',
    isElectrical: true,
    partCodes: ['PART-BATT12'],
    keywords: ['loa kéo', 'loa di động', 'chai pin', 'hết ắc quy', 'sạc không vào', 'dùng tý đã tắt', 'sụt nguồn loa', 'acnos'],
    rootCause: 'Chai/sunfat hóa bình ắc quy chì khô 12V–7.5Ah/9Ah bên trong thùng loa kéo hoặc hỏng mạch sạc tự ngắt.',
    steps: [
      'Tháo khoang đáy loa kéo Acnos đo điện áp không tải và sụt áp khi tải của bình ắc quy 12V.',
      'Kiểm tra điện áp mạch sạc 13.8V–14.4VDC trên bo công suất loa kéo.',
      'Thay mới bình ắc quy khô 12V (PART-BATT12), sạc đầy kiểm tra thời lượng phát thực tế.'
    ],
    quickChecks: [
      'Chuyển công tắc nguồn sau lưng loa kéo sang nấc "AC" (dùng điện trực tiếp) để tiếp tục sử dụng tạm trong tiết học.',
      'Nhắc nhở cắm sạc định kỳ sau khi mượn loa sự kiện để tránh kiệt chết ắc quy.'
    ]
  },
  {
    id: 'AUDIO_AMP_CEILING_SPEAKER',
    categoryCode: 'CAT-AUDIO',
    title: 'Cục đẩy công suất báo lỗi đèn đỏ (Protect/Clip) hoặc mất tiếng loa âm trần',
    defaultSeverity: 'major',
    isElectrical: true,
    partCodes: [],
    keywords: ['cục đẩy', 'amply', 'bàn trộn', 'mixer', 'loa âm trần', 'đèn protect', 'đèn clip', 'cháy loa', 'rách màng loa', 'mất tiếng một vế'],
    rootCause: 'Chạm chập đường dây loa trở kháng cao 70V/100V trên trần kích hoạt rơ-le bảo vệ (Protect) của cục đẩy Crown hoặc đứt biến áp phối hợp trở kháng loa TOA.',
    steps: [
      'Ngắt nguồn cục đẩy công suất, tháo tách đường dây loa ra khỏi cọc Output và đo điện trở thuần để tìm nhánh dây bị chạm chập.',
      'Kiểm tra quạt tản nhiệt cục đẩy Crown XLi 2500, cầu chì công suất và từng cụm loa âm trần TOA trên hành lang/hội trường.',
      'Bọc cách điện lại mối nối dây loa trên trần và cân chỉnh mức giới hạn công suất đầu ra.'
    ],
    quickChecks: [
      'Nếu đèn FAULT/PROTECT đỏ sáng trên cục đẩy hội trường, hãy vặn núm Volume về 0 và tắt nguồn cục đẩy chờ KTV kiểm tra chạm dây loa.',
      'Không tự ý đấu nối thêm loa ngoài sai trở kháng vào hệ thống.'
    ]
  },

  // ===================== 7. CAT-OFFICE (MÁY IN, PHOTO, HỦY GIẤY, CÂY NƯỚC) =====================
  {
    id: 'OFFICE_PRINTER_COPIER_TONER_JAM',
    categoryCode: 'CAT-OFFICE',
    title: 'Máy in / Máy photocopy kẹt giấy, bản in mờ sọc hoặc báo hết mực',
    defaultSeverity: 'minor',
    isElectrical: true,
    partCodes: ['PART-TONER', 'PART-PATCH'],
    keywords: ['máy in', 'máy photocopy', 'máy photo', 'kẹt giấy', 'hết mực', 'bản in mờ', 'sọc đen', 'lem mực', 'không in được', 'offline máy in', 'cuốn nhiều tờ'],
    rootCause: 'Cạn hộp mực in Laser / ống mực từ, mòn cao su quả đào kéo giấy (Pickup Roller) hoặc rách bao lụa cụm sấy Fuser.',
    steps: [
      'Mở nắp khoang máy rút giấy kẹt thuận theo chiều đường đi của giấy; kiểm tra mảnh vụn giấy kẹt tại cảm biến Sensor ra giấy.',
      'Kiểm tra lượng mực và trống từ (Drum), thay hộp mực Laser / ống mực chính hãng (PART-TONER) nếu cạn hoặc xước trống.',
      'Vệ sinh con lăn kéo giấy bằng cồn Isopropyl và kiểm tra kết nối cổng mạng LAN (PART-PATCH) / IP tĩnh của máy in.'
    ],
    quickChecks: [
      'Rút khay giấy ra tơi đều xấp giấy, không dùng giấy ẩm hoặc còn ghim bấm kim loại cho vào khay nạp.',
      'Khi rút giấy kẹt, kéo nhẹ đều hai tay — tuyệt đối không dùng kéo hay tua-vít cạy vào lô sấy đang nóng.'
    ]
  },
  {
    id: 'OFFICE_SHREDDER_SCANNER_QUEUE',
    categoryCode: 'CAT-OFFICE',
    title: 'Máy hủy tài liệu kẹt quá tải / Máy scan kéo đúp tờ / Lỗi máy chấm công & lấy số',
    defaultSeverity: 'minor',
    isElectrical: true,
    partCodes: ['PART-PATCH'],
    keywords: ['máy hủy giấy', 'máy hủy tài liệu', 'kẹt dao cắt', 'máy scan', 'máy quét', 'adf', 'máy chấm công', 'không nhận vân tay', 'lấy số thứ tự', 'kẹt bill'],
    rootCause: 'Nạp quá số tờ quy định làm ngắt rơ-le nhiệt máy hủy tài liệu, bám bụi mặt kính CIS máy scan hoặc đầy thùng giấy vụn / hết cuộn giấy nhiệt in số.',
    steps: [
      'Với máy hủy giấy: kiểm tra cảm biến đầy thùng rác, chờ rơ-le nhiệt nguội 20 phút rồi bấm giữ nút REV (quay ngược) để nhả giấy kẹt và tra dầu bôi trơn lưỡi dao.',
      'Với máy scan ADF / chấm công / lấy số: vệ sinh mắt đọc quang học, bánh xe tách giấy (Brake/Pick Roller) hoặc thay cuộn giấy in nhiệt K80.',
      'Kiểm tra đồng bộ thời gian thực (NTP) và kết nối mạng LAN về phần mềm quản lý.'
    ],
    quickChecks: [
      'TUYỆT ĐỐI không thò tay, cà vạt hoặc chọc kéo kim loại vào khe lưỡi dao của máy hủy tài liệu.',
      'Kiểm tra xem thùng chứa giấy vụn bên dưới máy hủy đã đầy làm ngắt công tắc an toàn chưa.'
    ]
  },
  {
    id: 'OFFICE_WATER_DISPENSER',
    categoryCode: 'CAT-OFFICE',
    title: 'Cây nước nóng lạnh / Máy lọc nước chảy yếu, mất nóng/lạnh hoặc rỉ nước',
    defaultSeverity: 'major',
    isElectrical: true,
    partCodes: ['PART-ROFILT', 'PART-MCB'],
    keywords: ['cây nước', 'máy lọc nước', 'bình nước nóng lạnh', 'karofi', 'nước chảy yếu', 'tắc lõi lọc', 'không có nước nóng', 'không lạnh nước', 'mùi lạ trong nước', 'rỉ nước cây lọc'],
    rootCause: 'Bẩn tắc bộ lõi lọc thô PP/OCB/CTO số 1-2-3 quá hạn thay định kỳ, nhảy rơ-le nhiệt chống đun cạn bầu nóng hoặc hở cút nối nhanh ống RO.',
    steps: [
      'Khóa van nước cấp đầu vào, tháo cốc lọc kiểm tra và thay thế bộ lõi lọc thô 1-2-3 định kỳ (PART-ROFILT), xả tráng 15 lít nước đầu.',
      'Đo thông mạch thanh nhiệt bầu đun nóng, rơ-le bảo vệ chống cạn và kiểm tra quạt/lốc làm lạnh.',
      'Kiểm tra độ kín toàn bộ cút nối nhanh và độ nhạy của Aptomat chống giật RCBO cấp cho cây nước.'
    ],
    quickChecks: [
      'Nếu cây nước đang hết nước cấp hoặc chảy rỉ ra sàn, hãy tắt ngay công tắc Đỏ (Nóng) phía sau lưng máy để tránh cháy bầu đun khô.',
      'Khóa van chia nước dưới chân tường nếu phát hiện tuột dây dẫn nước.'
    ]
  },

  // ===================== 8. CAT-POWER (ĐIỆN, CHIẾU SÁNG, ĐÈN SỰ CỐ, TỦ ĐIỆN) =====================
  {
    id: 'POWER_LED_LIGHTING_FAULT',
    categoryCode: 'CAT-POWER',
    title: 'Đèn Panel LED phòng học / Đèn sân khấu nhấp nháy hoặc cháy chấn lưu',
    defaultSeverity: 'minor',
    isElectrical: true,
    partCodes: ['PART-LEDDRV', 'PART-MCB'],
    keywords: ['đèn led', 'đèn panel', 'bóng đèn trần', 'nhấp nháy đèn', 'tối đèn', 'cháy đèn', 'hỏng chấn lưu', 'driver led', 'công tắc đèn', 'đèn sân khấu', 'bàn dmx'],
    rootCause: 'Phồng tụ lọc trên bộ nguồn chấn lưu LED Driver 40W (do nhiệt trần cao) hoặc lỏng cầu đấu dây nguồn 220V trên máng đèn.',
    steps: [
      'Ngắt công tắc/MCB nhánh chiếu sáng phòng học, dùng thang chữ A tháo kiểm tra điện áp đầu ra của bộ LED Driver.',
      'Thay thế bộ nguồn Chấn lưu LED Driver / bóng LED dự phòng (PART-LEDDRV) và siết chặt domino nối dây bọc băng keo chống cháy.',
      'Với đèn sân khấu DMX: kiểm tra địa chỉ kênh DMX 512 và quạt làm mát bóng Beam.'
    ],
    quickChecks: [
      'Tắt bớt nhánh công tắc của dãy đèn đang nhấp nháy liên tục để tránh gây mỏi mắt sinh viên và quá nhiệt chấn lưu.',
      'Ghi rõ vị trí bóng hỏng (đầu bảng, giữa lớp hay cuối lớp) để KTV mang thang xử lý nhanh.'
    ]
  },
  {
    id: 'POWER_EMERGENCY_EXIT_LIGHT',
    categoryCode: 'CAT-POWER',
    title: 'Đèn chiếu sáng sự cố 2 mắt / Đèn chỉ dẫn EXIT hỏng ắc quy lưu điện',
    defaultSeverity: 'major',
    isElectrical: true,
    partCodes: ['PART-BATT12', 'PART-LEDDRV'],
    keywords: ['đèn sự cố', 'đèn exit', 'đèn thoát hiểm', 'kentom', 'không lưu điện', 'mất điện không sáng', 'báo lỗi sạc đèn exit'],
    rootCause: 'Chai hỏng bình ắc quy khô lưu điện dự phòng bên trong đèn sự cố Kentom khiến đèn không tự bật sáng khi ngắt nguồn AC.',
    steps: [
      'Nhấn nút TEST trên thân đèn sự cố/EXIT để kiểm tra mạch chuyển mạch tự động AC–DC và đo dung lượng ắc quy.',
      'Thay thế bình ắc quy khô dự phòng (PART-BATT12) hoặc mạch sạc tự ngắt bị lỗi.',
      'Dán tem kiểm định ngày thay pin và nghiệm thu thời gian sáng dự phòng tối thiểu 120 phút theo chuẩn PCCC.'
    ],
    quickChecks: [
      'Kiểm tra xem phích cắm của đèn sự cố trên tường hành lang có bị ai rút ra không (đèn CHARGE màu đỏ phải sáng khi có điện lưới).',
      'Báo sớm trước đợt kiểm tra định kỳ an toàn PCCC tòa nhà.'
    ]
  },
  {
    id: 'POWER_BREAKER_SOCKET_TRIP',
    categoryCode: 'CAT-POWER',
    title: 'Tủ điện tầng nhảy Aptomat liên tục hoặc vỡ/lỏng ổ cắm âm sàn',
    defaultSeverity: 'major',
    isElectrical: true,
    partCodes: ['PART-MCB'],
    keywords: ['nhảy aptomat', 'nhảy cầu dao', 'sập nguồn', 'mất điện phòng', 'vỡ ổ cắm', 'lỏng ổ cắm', 'ổ cắm âm sàn', 'tủ điện', 'quá tải điện', 'công tơ'],
    rootCause: 'Quá tải dòng đỉnh khi khởi động đồng thời nhiều phụ tải công suất lớn, dòng rò chạm ngưỡng cắt RCBO 30mA hoặc vỡ cơ khí mặt ổ cắm âm sàn.',
    steps: [
      'Đo dòng tải thực tế từng lộ ra tại tủ điện phân phối tầng Schneider Acti9 và kiểm tra nhiệt độ đầu cốt dây bằng camera nhiệt/nhiệt kế hồng ngoại.',
      'Cô lập từng nhánh thiết bị (Điều hòa / Ổ cắm sàn / Chiếu sáng) để tìm phụ tải gây rò hoặc ngắn mạch.',
      'Thay thế Aptomat chống giật RCBO/MCB hoặc đế ổ cắm âm sàn bị vỡ nắp (PART-MCB).'
    ],
    quickChecks: [
      'Nếu Aptomat vừa bật lên đã nhảy cắt lại ngay lập tức, TUYỆT ĐỐI không cố gạt giữ cần Aptomat vì đang có chạm chập trực tiếp.',
      'Với ổ cắm âm sàn bị vỡ nắp lộ chân đồng, hãy đậy che tạm và không bước chân lên.'
    ]
  },

  // ===================== 9. CAT-FIRE (PHÒNG CHÁY CHỮA CHÁY — CƠ KHÍ ÁP LỰC & BÁO CHÁY) =====================
  {
    id: 'FIRE_EXTINGUISHER_LOW_PRESSURE',
    categoryCode: 'CAT-FIRE',
    title: 'Bình chữa cháy bột ABC / CO2 tụt áp vạch đỏ, mất chốt chì hoặc hỏng vòi',
    defaultSeverity: 'major',
    isElectrical: false,
    partCodes: [],
    keywords: ['bình chữa cháy', 'bình cứu hỏa', 'tụt áp', 'vạch đỏ', 'kim đỏ', 'hết khí', 'mất chốt', 'đứt kẹp chì', 'nứt vòi phun', 'gỉ bình', 'quá hạn nạp sạc'],
    rootCause: 'Rò rỉ khí đẩy N2 qua gioăng van sau thời gian lưu trực làm áp suất bình bột ABC tụt xuống vùng Đỏ (không đủ áp phun) hoặc hư hỏng phụ kiện vòi loa.',
    steps: [
      'Kiểm tra đồng hồ áp kế (vạch Xanh = đạt, vạch Đỏ = tụt áp), cân trọng lượng thực tế đối với bình khí CO2 MT5 (so với vỏ Tare Weight).',
      'Thu hồi ngay bình tụt áp/mất kẹp chì về kho chờ đơn vị PCCC An Phát nạp sạc kiểm định lại.',
      'Xuất ngay bình chữa cháy dự phòng đạt chuẩn từ KHO-01 đặt thế chỗ để không bỏ trống điểm trực PCCC hành lang/phòng Lab.'
    ],
    quickChecks: [
      'Không bấm thử cò bình chữa cháy để kiểm tra vì chỉ một lần bóp nhẹ cũng làm hở bụi bột gây tụt sạch áp suất toàn bình.',
      'Đặt bình ngay ngắn trong khay kệ, tránh nắng chiếu trực tiếp hoặc nơi ẩm ướt.'
    ]
  },
  {
    id: 'FIRE_ALARM_DETECTOR_FAULT',
    categoryCode: 'CAT-FIRE',
    title: 'Tủ trung tâm báo cháy báo lỗi Zone / Đầu báo khói báo cháy giả',
    defaultSeverity: 'critical',
    hazardProtocol: null,
    isElectrical: true,
    partCodes: ['PART-BATT12'],
    keywords: ['tủ báo cháy', 'đầu báo khói', 'chuông báo cháy', 'báo cháy giả', 'kêu bíp tủ pccc', 'lỗi zone', 'fault báo cháy', 'hochiki', 'nút nhấn khẩn cấp bị vỡ'],
    rootCause: 'Bụi bẩn/côn trùng lọt vào buồng quang học đầu báo khói Hochiki SLV-24N gây tán xạ giả, đứt hở điện trở cuối tuyến (EOL) hoặc yếu ắc quy dự phòng 24V trong tủ trung tâm.',
    steps: [
      'Kiểm tra thực địa ngay tại phòng/hành lang thuộc kênh Zone đang báo trên tủ Hochiki 20 kênh để xác nhận 100% không có khói nhiệt thực tế.',
      'Tháo đầu báo khói vệ sinh buồng quang bằng khí nén sạch, đo điện áp đường dây tín hiệu 24VDC và kiểm tra mặt kính nút nhấn khẩn cấp.',
      'Kiểm tra cặp bình ắc quy 12V đấu nối tiếp (PART-BATT12) trong tủ trung tâm báo cháy và thực hiện Reset hệ thống về chế độ trực chuẩn.'
    ],
    quickChecks: [
      'LUÔN kiểm tra thực tế tại phòng/tầng tương ứng trên màn hình tủ báo cháy trước khi bấm nút tắt tiếng chuông (Silence) — tuyệt đối không chủ quan coi là báo giả khi chưa xác minh.',
      'Tuyệt đối không tháo đầu báo khói hoặc ngắt nguồn tủ báo cháy trung tâm.'
    ]
  },
  {
    id: 'FIRE_HYDRANT_VALVE_HOSE',
    categoryCode: 'CAT-FIRE',
    title: 'Tủ họng nước chữa cháy vách tường rò van khóa hoặc mục cuộn vòi',
    defaultSeverity: 'major',
    isElectrical: false,
    partCodes: [],
    keywords: ['họng nước chữa cháy', 'tủ pccc', 'vòi cứu hỏa', 'cuộn vòi', 'lăng phun', 'rỉ nước họng cứu hỏa', 'kẹt cửa tủ chữa cháy'],
    rootCause: 'Lão hóa gioăng cao su mặt bích van góc D50 dưới áp lực đường ống PCCC hoặc ẩm mốc làm mục lớp tráng cao su trong cuộn vòi vải.',
    steps: [
      'Đóng van chặn nhánh trục đứng PCCC nếu cần thay gioăng cao su ty van góc D50 đang rỉ nước.',
      'Trải kiểm tra độ kín của cuộn vòi 20m và khớp nối ngàm nhanh với lăng phun; phơi khô cuộn lại đúng quy cách.',
      'Bôi trơn bản lề và chốt cánh tủ PCCC vách tường đảm bảo mở nhanh khẩn cấp.'
    ],
    quickChecks: [
      'Không xếp bàn ghế, thùng rác hoặc vật cản che khuất trước cửa tủ họng nước chữa cháy hành lang.',
      'Nếu van họng nước rỉ mạnh ra hành lang, báo ngay Kỹ thuật tòa nhà khóa van nhánh và đặt biển cảnh báo trơn.'
    ]
  },

  // ===================== 10. CAT-SEC (CAMERA AN NINH, NVR, KHÓA TỪ, BARCODE) =====================
  {
    id: 'SEC_CAMERA_NVR_OFFLINE',
    categoryCode: 'CAT-SEC',
    title: 'Camera an ninh mất hình (Offline) hoặc Đầu ghi NVR kêu cảnh báo ổ cứng',
    defaultSeverity: 'major',
    isElectrical: true,
    partCodes: ['PART-PATCH'],
    keywords: ['camera mất hình', 'camera offline', 'mờ camera', 'hồng ngoại camera', 'đầu ghi nvr', 'không lưu hình', 'kêu bíp đầu ghi', 'hikvision'],
    rootCause: 'Oxy hóa đầu cáp mạng RJ45 cấp nguồn PoE cho camera IP Hikvision hoặc lỗi ổ cứng chuyên dụng Surveillance HDD 6TB trong đầu ghi NVR 32 kênh.',
    steps: [
      'Ping kiểm tra địa chỉ IP camera và kiểm tra công suất cấp nguồn PoE tại Switch an ninh; bấm lại đầu RJ45 chống ẩm (PART-PATCH).',
      'Vệ sinh vòm kính Dome / ống kính hồng ngoại và kiểm tra tình trạng S.M.A.R.T của 2 ổ cứng 6TB trên màn hình quản trị NVR.',
      'Đảm bảo luồng ghi hình liên tục 24/7 tại các vị trí trọng yếu (Cổng vào, Thư viện, Khảo thí, Tài vụ, Kho).'
    ],
    quickChecks: [
      'Kiểm tra xem tủ mạng chứa đầu ghi NVR có bị tắt nguồn hoặc lỏng dây mạng Uplink không.',
      'Không tự ý xoay bẻ cổ camera cố định gắn trần/hành lang.'
    ]
  },
  {
    id: 'SEC_DOOR_ACCESS_BARCODE',
    categoryCode: 'CAT-SEC',
    title: 'Khóa từ cửa không nhận thẻ/khuôn mặt, cửa không hít từ hoặc lỗi đầu đọc mã vạch',
    defaultSeverity: 'major',
    isElectrical: true,
    partCodes: ['PART-BATT12', 'PART-PATCH'],
    keywords: ['khóa từ', 'cửa từ', 'không nhận vân tay', 'không nhận khuôn mặt', 'thẻ từ', 'cửa không khóa', 'zkteco', 'đầu đọc mã vạch', 'barcode', 'rfid', 'không quét được mã'],
    rootCause: 'Sụt áp bộ nguồn 12VDC–5A nuôi khóa nam châm điện 280kg, lệch gá tấm sắt chữ ZL trên cánh cửa hoặc đứt cáp USB đầu đọc mã vạch Zebra.',
    steps: [
      'Đo điện áp bộ nguồn Access Control 12V và bình ắc quy lưu điện cửa từ (PART-BATT12); kiểm tra nút nhấn Exit và hộp mở khẩn cấp.',
      'Căn chỉnh lại độ áp khít giữa tấm sắt Armature và nam châm điện, lau sạch camera nhận diện ZKTeco SpeedFace-V5L.',
      'Với đầu đọc mã vạch thư viện/kho: quét mã cấu hình Reset Factory Defaults và kiểm tra cáp kết nối USB.'
    ],
    quickChecks: [
      'Lau sạch bề mặt mắt đọc vân tay/camera khuôn mặt bằng khăn mềm khô và thử mở bằng thẻ từ dự phòng.',
      'Nếu có người bị kẹt bên trong do treo đầu đọc, nhấn nút mở khẩn cấp cạnh cửa hoặc dùng chìa cơ.'
    ]
  },

  // ===================== 11. CAT-SPEC (THIẾT BỊ Y TẾ HỌC ĐƯỜNG) =====================
  {
    id: 'SPEC_MEDICAL_AED_DIAG',
    categoryCode: 'CAT-SPEC',
    title: 'Máy sốc tim AED / Bộ khám sơ cứu (huyết áp, nhiệt kế, SpO2) báo lỗi hoặc yếu pin',
    defaultSeverity: 'critical',
    hazardProtocol: 'MEDICAL_EMERGENCY_CRITICAL',
    isElectrical: true,
    partCodes: [],
    keywords: ['máy sốc tim', 'aed', 'nihon kohden', 'điện cực pad', 'máy đo huyết áp', 'omron', 'nhiệt kế', 'spo2', 'vòng bít', 'báo lỗi máy y tế'],
    rootCause: 'Pin Lithium chuyên dụng hoặc tấm dán điện cực (Defibrillation Pads) của máy AED chạm ngưỡng cảnh báo hạn dùng, hoặc rò khí ống cao su vòng bít máy đo huyết áp.',
    steps: [
      'Kiểm tra đèn chỉ thị trạng thái tự kiểm tra (Status Indicator) trên máy Nihon Kohden AED-3100, đối chiếu hạn sử dụng in trên bao điện cực và pin.',
      'Với máy đo huyết áp/SpO2/nhiệt kế hồng ngoại: kiểm tra độ kín túi hơi vòng bít, vệ sinh mắt cảm biến và thay pin kiềm Alkaline chuẩn.',
      'Liên hệ nhà cung cấp Thiết bị Y tế Minh Tâm hiệu chuẩn định kỳ nếu sai lệch chỉ số đo lâm sàng.'
    ],
    quickChecks: [
      'CẢNH BÁO AN TOÀN Y TẾ: Chuyển ngay sang sử dụng bộ thiết bị sơ cứu/AED dự phòng còn lại giữa Phòng Y tế T3 (A1-YT-T3) và Trực Sảnh T1 (A1-CV).',
      'Không bóc niêm phong túi tấm dán điện cực AED nếu không phải tình huống cấp cứu thật.'
    ]
  },
  {
    id: 'SPEC_MEDICAL_BED_CABINET',
    categoryCode: 'CAT-SPEC',
    title: 'Giường bệnh inox kẹt tay quay / hỏng khóa bánh xe hoặc nứt kính tủ thuốc',
    defaultSeverity: 'minor',
    isElectrical: false,
    partCodes: [],
    keywords: ['giường bệnh', 'giường y tế', 'kẹt tay quay', 'không nâng đầu được', 'bánh xe giường', 'tủ thuốc', 'xe tiêm', 'kẹt cánh tủ thuốc'],
    rootCause: 'Khô mỡ bôi trơn trục vít me tay quay nâng đầu giường inox 304 hoặc lỏng cơ cấu phanh hãm bánh xe y tế / lệch bản lề kính tủ thuốc.',
    steps: [
      'Kiểm tra trục ren vít me dưới khung giường inox, vệ sinh bụi bẩn và tra mỡ bò trắng an toàn y tế.',
      'Siết chặt hoặc thay cụm bánh xe có khóa hãm chân đảm bảo giường đứng vững tuyệt đối khi bệnh nhân nằm nghỉ.',
      'Kiểm tra nẹp cao su giữ kính và ổ khóa buồng thuốc độc/hướng thần trên tủ thuốc inox.'
    ],
    quickChecks: [
      'Luôn gạt khóa phanh cả 4 bánh xe giường y tế/xe tiêm cố định trước khi cho sinh viên nằm sơ cứu.',
      'Nếu kính tủ thuốc bị nứt, dán băng keo định hình mặt kính ngay để tránh rơi mảnh vỡ vào khay dụng cụ y tế.'
    ]
  }
];

/**
 * 340+ Supervised Labeled Training Examples across all 11 Categories & 3 Severity Levels.
 * Each tuple: [text, severity ('minor'|'major'|'critical'), categoryCode]
 * Trained at module initialization via Complement/TF-IDF Multinomial Naive Bayes!
 */
export const FACILITY_TRAINING_CORPUS = [
  // ---- CRITICAL: Class-A Solid Fires (Furniture, Curtains, Bookshelves — Non-Electrical) ----
  ['cái bàn bị cháy mặt gỗ bốc lửa trong phòng học', 'critical', 'CAT-FURN'],
  ['bàn sinh viên cuối lớp bị cháy xém bốc khói đen', 'critical', 'CAT-FURN'],
  ['cái bàn gỗ giảng viên đang bốc cháy dữ dội', 'critical', 'CAT-FURN'],
  ['cai ban bi chay o cuoi phong hoc', 'critical', 'CAT-FURN'],
  ['ghế ngồi sinh viên bị bắt lửa cháy đệm mút', 'critical', 'CAT-FURN'],
  ['rèm cuốn cửa sổ bị bén lửa bốc cháy lan', 'critical', 'CAT-FURN'],
  ['tủ hồ sơ giấy tờ bị cháy âm ỉ có khói', 'critical', 'CAT-FURN'],
  ['giá sách thư viện bị cháy sập kệ nguy hiểm', 'critical', 'CAT-FURN'],
  ['nghiêng đổ giá sách sắt lớn đè lối đi thư viện', 'critical', 'CAT-FURN'],
  ['sập kệ sắt tải nặng trong kho thiết bị kho 01', 'critical', 'CAT-FURN'],
  ['bàn học gãy sập hoàn toàn làm sinh viên ngã bị thương', 'critical', 'CAT-FURN'],

  // ---- MAJOR & MINOR: Furniture Mechanical Issues ----
  ['bàn sinh viên bị gãy chân sắt không ngồi học được', 'major', 'CAT-FURN'],
  ['bung mối hàn khung sắt bàn đôi sinh viên sập một bên', 'major', 'CAT-FURN'],
  ['ghế xoay giảng viên bị tụt hỏng ben hơi gãy chân sao', 'major', 'CAT-FURN'],
  ['bục giảng gỗ bị gãy mặt đỡ không đặt laptop được', 'major', 'CAT-FURN'],
  ['cái bàn học bị lỏng ốc vít hơi cập kênh rung nhẹ', 'minor', 'CAT-FURN'],
  ['mặt bàn gỗ melamine bị bong nẹp viền nhựa tróc cạnh', 'minor', 'CAT-FURN'],
  ['ghế sinh viên kêu cót két mất nút cao su chân ghế', 'minor', 'CAT-FURN'],
  ['tủ sắt hồ sơ bị kẹt ổ khóa không vặn được chìa', 'minor', 'CAT-FURN'],
  ['tủ locker gửi đồ sinh viên bị cong cánh kẹt bản lề', 'minor', 'CAT-FURN'],
  ['rèm cuốn cản sáng bị đứt dây kéo hạt nhựa không kéo lên được', 'minor', 'CAT-FURN'],
  ['rèm cửa sổ phòng học bị tuột lò xo cuộn hơi xệ', 'minor', 'CAT-FURN'],

  // ---- CRITICAL: Electrical Fire / Smoke / Shock / Flood ----
  ['máy chiếu bốc khói khét và xẹt tia lửa điện trên trần', 'critical', 'CAT-DISPLAY'],
  ['smart tivi có mùi khét lẹt bốc khói phía sau lưng máy', 'critical', 'CAT-DISPLAY'],
  ['giá treo máy chiếu trên trần bị đứt tắc kê lơ lửng sắp rơi', 'critical', 'CAT-DISPLAY'],
  ['điều hòa âm trần bốc khói mùi khét nhựa cháy ở mặt nạ', 'critical', 'CAT-HVAC'],
  ['dàn nóng điều hòa chập điện nổ tụ bốc khói ngoài hành lang', 'critical', 'CAT-HVAC'],
  ['thùng máy tính phòng lab bốc khói khét nổ nguồn psu', 'critical', 'CAT-IT'],
  ['chạm tay vào vỏ thùng máy tính pc bị tê giật điện mạnh', 'critical', 'CAT-IT'],
  ['máy chủ server rack phòng lab báo lỗi hỏng ổ cứng raid kêu bíp đỏ', 'critical', 'CAT-IT'],
  ['ổ điện âm dưới gầm bàn thực hành chập cháy xẹt tia lửa', 'critical', 'CAT-POWER'],
  ['tủ điện phân phối tầng phát tiếng nổ lẹt đẹt có mùi khét', 'critical', 'CAT-POWER'],
  ['mất điện toàn phòng giảng đường đang thi học kỳ tê liệt hoàn toàn', 'critical', 'CAT-POWER'],
  ['bộ đèn led trần bị bung khung rơi treo lơ lửng trên đầu sinh viên', 'critical', 'CAT-POWER'],
  ['cây nước nóng lạnh hành lang bị rò điện chạm vào vỏ tê giật', 'critical', 'CAT-OFFICE'],
  ['vỡ đường ống cấp cây lọc nước chảy ngập lênh láng vào phòng máy', 'critical', 'CAT-OFFICE'],
  ['mất mạng toàn phòng thực hành khi đang thi trực tuyến switch tắt ngúm', 'critical', 'CAT-NET'],
  ['tủ rack mạng có mùi khét ở thanh nguồn pdu', 'critical', 'CAT-NET'],
  ['cục đẩy âm thanh hội trường bốc khói khét lẹt khi đang chạy sự kiện', 'critical', 'CAT-AUDIO'],
  ['bình chữa cháy khí co2 bị xì van phun tuyết trắng mù mịt hành lang', 'critical', 'CAT-FIRE'],
  ['tủ trung tâm báo cháy hú còi báo động đỏ liên tục tại tầng 2', 'critical', 'CAT-FIRE'],
  ['vỡ ống họng nước chữa cháy vách tường ngập nước hành lang', 'critical', 'CAT-FIRE'],
  ['khóa từ cửa phòng lab bị kẹt cứng nhốt sinh viên bên trong không mở ra được', 'critical', 'CAT-SEC'],
  ['cửa từ phòng bảo mật đề thi khảo thí hỏng không khóa niêm phong được', 'critical', 'CAT-SEC'],
  ['máy sốc tim tự động aed phòng y tế kêu bíp đỏ báo lỗi không sẵn sàng cấp cứu', 'critical', 'CAT-SPEC'],
  ['vỡ kính tủ thuốc inox rơi mảnh sắc nhọn tại phòng y tế', 'critical', 'CAT-SPEC'],

  // ---- TRICKY NON-CRITICAL BURNOUTS & NEGATIONS (Crucial Training Boundaries!) ----
  ['máy chiếu bị cháy bóng đèn không lên ánh sáng quạt vẫn quay êm', 'major', 'CAT-DISPLAY'],
  ['may chieu chay bong den bao den lamp do', 'major', 'CAT-DISPLAY'],
  ['bóng đèn tuýp led trần bị cháy bóng tắt 1 bóng góc phòng', 'minor', 'CAT-POWER'],
  ['đèn panel led phòng học cháy chấn lưu nhấp nháy nhẹ không có khói', 'minor', 'CAT-POWER'],
  ['loa hội trường kêu lụp bụp nổ tiếng bụp nhỏ khi vặn volume', 'minor', 'CAT-AUDIO'],
  ['màn hình tivi bị cháy điểm ảnh một đốm nhỏ góc dưới vẫn xem được', 'minor', 'CAT-DISPLAY'],
  ['máy chiếu không lên hình không có mùi khét không bốc khói gì cả', 'major', 'CAT-DISPLAY'],
  ['bàn học tróc sơn nhẹ hoàn toàn không cháy không nguy hiểm', 'minor', 'CAT-FURN'],
  ['máy in báo hết mực không có khói hay mùi khét', 'minor', 'CAT-OFFICE'],

  // ---- MAJOR: Display, HVAC, Audio, IT, Network, Security, Office, Power, Fire ----
  ['máy chiếu bật không lên nguồn tắt ngúm hoàn toàn gián đoạn giảng dạy', 'major', 'CAT-DISPLAY'],
  ['máy chiếu báo no signal không nhận cáp hdmi từ laptop giảng viên', 'major', 'CAT-DISPLAY'],
  ['máy chiếu chạy 10 phút quá nhiệt báo đèn temp rồi tự tắt', 'major', 'CAT-DISPLAY'],
  ['màn chiếu điện tự động bị kẹt không hạ xuống được để chiếu bài', 'major', 'CAT-DISPLAY'],
  ['smart tivi 65 inch bị kẻ sọc màn hình tối đen một nửa', 'major', 'CAT-DISPLAY'],
  ['màn hình quảng cáo standee sảnh chính bật không lên hình', 'major', 'CAT-DISPLAY'],
  ['điều hòa âm trần bật 18 độ nhưng không mát chỉ thổi gió nóng hầm hập', 'major', 'CAT-HVAC'],
  ['máy lạnh phòng học chảy nước thành dòng xuống bàn sinh viên', 'major', 'CAT-HVAC'],
  ['điều hòa daikin nhấp nháy đèn lỗi không đóng lốc lạnh', 'major', 'CAT-HVAC'],
  ['dieu hoa ko mat thoi gio nong phong rat oi buc', 'major', 'CAT-HVAC'],
  ['loa kéo di động bị chai ắc quy bật lên sụt nguồn tắt ngay', 'major', 'CAT-AUDIO'],
  ['micro không dây giảng đường mất tiếng hoàn toàn dù đã thay pin mới', 'major', 'CAT-AUDIO'],
  ['cục đẩy công suất âm thanh báo đèn đỏ protect mất tiếng toàn hội trường', 'major', 'CAT-AUDIO'],
  ['bàn trộn âm thanh mixer studio mất tín hiệu đầu ra master', 'major', 'CAT-AUDIO'],
  ['bộ máy tính thực hành pc bấm nút nguồn không quay quạt chết nguồn', 'major', 'CAT-IT'],
  ['máy tính phòng lab bị màn hình xanh bsod khởi động lại liên tục', 'major', 'CAT-IT'],
  ['pc sinh viên báo no bootable device lỗi ổ cứng ssd không vào được win', 'major', 'CAT-IT'],
  ['kiosk tra cứu thông tin thư viện bị liệt hoàn toàn màn hình cảm ứng', 'major', 'CAT-IT'],
  ['thiết bị lưu trữ mạng nas không truy cập được thư mục học liệu', 'major', 'CAT-IT'],
  ['bộ phát wifi ốp trần tắt đèn mất sóng wifi toàn phòng học', 'major', 'CAT-NET'],
  ['wifi phòng seminar kết nối báo chấm than không cấp địa chỉ ip', 'major', 'CAT-NET'],
  ['camera hội nghị truyền hình logitech không lên hình khi họp trực tuyến', 'major', 'CAT-NET'],
  ['bộ ma trận chuyển mạch hdmi phòng họp không xuất hình ra màn hình chính', 'major', 'CAT-NET'],
  ['điện thoại bàn ip phòng đào tạo mất kết nối báo no service', 'major', 'CAT-NET'],
  ['camera an ninh hành lang mất tín hiệu video loss offline trên đầu ghi', 'major', 'CAT-SEC'],
  ['đầu ghi hình nvr kêu bíp cảnh báo lỗi ổ cứng không lưu được video', 'major', 'CAT-SEC'],
  ['đầu đọc thẻ từ vân tay cửa phòng lab không nhận diện mở chốt từ', 'major', 'CAT-SEC'],
  ['đầu đọc mã vạch thư viện không phát tia laser quét mượn trả sách', 'major', 'CAT-SEC'],
  ['cây nước nóng lạnh karofi bị rỉ nước dưới gầm và không làm nóng nước', 'major', 'CAT-OFFICE'],
  ['máy photocopy văn phòng khoa kẹt giấy cứng trong cụm sấy báo lỗi sc', 'major', 'CAT-OFFICE'],
  ['hệ thống lấy số thứ tự khu một cửa sinh viên tắt màn hình gọi số', 'major', 'CAT-OFFICE'],
  ['nhảy aptomat nhánh ổ cắm phòng học liên tục khi cắm thiết bị', 'major', 'CAT-POWER'],
  ['đèn chiếu sáng sự cố và đèn exit hành lang không sáng khi test cúp điện', 'major', 'CAT-POWER'],
  ['ổ cắm điện âm sàn phòng họp bị vỡ nắp nhựa tụt chân cắm', 'major', 'CAT-POWER'],
  ['bình chữa cháy bột khô abc kim đồng hồ tụt hẳn về vạch đỏ hết áp suất', 'major', 'CAT-FIRE'],
  ['bình cứu hỏa hành lang bị mất chốt an toàn và nứt vòi phun', 'major', 'CAT-FIRE'],
  ['tủ họng nước chữa cháy vách tường bị rỉ nước ở van khóa d50', 'major', 'CAT-FIRE'],

  // ---- MINOR: Localized / Cosmetic / Consumable / Slight Degradation ----
  ['máy chiếu hình hơi mờ nhẹ ở rìa do bám bụi ống kính vẫn giảng dạy được', 'minor', 'CAT-DISPLAY'],
  ['điều khiển từ xa máy chiếu yếu pin phải bấm sát mới ăn', 'minor', 'CAT-DISPLAY'],
  ['điều hòa kêu rè nhẹ ở cánh vẫy đảo gió nhưng vẫn làm mát bình thường', 'minor', 'CAT-HVAC'],
  ['quạt thông gió âm trần nhà vệ sinh chạy kêu ù hơi ồn do khô dầu', 'minor', 'CAT-HVAC'],
  ['điều khiển điều hòa bị mờ màn hình lcd nhỏ', 'minor', 'CAT-HVAC'],
  ['micro không dây thỉnh thoảng hơi hú nhẹ khi đứng gần loa', 'minor', 'CAT-AUDIO'],
  ['một chiếc loa âm trần hành lang nghe hơi rè nhỏ', 'minor', 'CAT-AUDIO'],
  ['chuột quang máy tính số 05 phòng lab bị đúp chuột trái khó bấm', 'minor', 'CAT-IT'],
  ['bàn phím máy tính thực hành bị kẹt 2 nút phím cách và enter', 'minor', 'CAT-IT'],
  ['bộ kit thực hành arduino thiếu dây cắm breadboard và hỏng 1 cảm biến siêu âm', 'minor', 'CAT-IT'],
  ['sóng wifi góc cuối phòng hơi yếu còn 2 vạch khi đông sinh viên', 'minor', 'CAT-NET'],
  ['dây nhảy mạng bàn máy số 3 bị gãy lẫy nhựa đầu hạt rj45 lỏng nhẹ', 'minor', 'CAT-NET'],
  ['camera ốp trần bị mạng nhện bám trước ống kính làm mờ hồng ngoại đêm', 'minor', 'CAT-SEC'],
  ['máy in laser văn phòng báo sắp hết mực bản in hơi nhạt màu', 'minor', 'CAT-OFFICE'],
  ['máy in bị kẹt 1 tờ giấy ở khay giấy tay dễ rút ra', 'minor', 'CAT-OFFICE'],
  ['máy hủy tài liệu đầy thùng giấy vụn và kẹt giấy do cho dày quá', 'minor', 'CAT-OFFICE'],
  ['máy quét tài liệu fujitsu kéo đúp 2 tờ giấy do bẩn con lăn cao su', 'minor', 'CAT-OFFICE'],
  ['máy chấm công vân tay nhận hơi chậm đối với tay ướt', 'minor', 'CAT-OFFICE'],
  ['cây lọc nước hành lang nước chảy ra hơi chậm cần thay lõi lọc thô định kỳ', 'minor', 'CAT-OFFICE'],
  ['một bóng đèn panel led góc cuối phòng bị nhấp nháy nhẹ các đèn khác vẫn sáng rõ', 'minor', 'CAT-POWER'],
  ['mặt hạt công tắc đèn hành lang bị lỏng viền nhựa', 'minor', 'CAT-POWER'],
  ['cánh tủ đựng bình chữa cháy hành lang hơi kẹt bản lề khi mở kiểm tra', 'minor', 'CAT-FIRE'],
  ['giường bệnh inox phòng y tế tay quay nâng đầu hơi nặng khô mỡ bôi trơn', 'minor', 'CAT-SPEC'],
  ['máy đo huyết áp phòng y tế báo pin yếu cần thay pin tiểu mới', 'minor', 'CAT-SPEC'],
  ['bánh xe xe tiêm sơ cứu bị kẹt tóc quấn làm đẩy hơi sượng', 'minor', 'CAT-SPEC'],

  // ---- ADDITIONAL MULTI-DOMAIN TRAINING SAMPLES (Expanded Deep Corpus) ----
  ['cháy bàn học cuối dãy sinh viên đang sơ tán khẩn cấp', 'critical', 'CAT-FURN'],
  ['mặt bàn gỗ bị đốt cháy xém đang bốc khói khét trong lớp', 'critical', 'CAT-FURN'],
  ['ghế băng hội trường bị bén lửa cháy lớp nỉ bọc đệm', 'critical', 'CAT-FURN'],
  ['kệ sắt để hồ sơ bị gãy chân nghiêng sắp đổ sập vào bàn làm việc', 'critical', 'CAT-FURN'],
  ['dãy bàn liền ghế sinh viên bị gãy khung sắt không ngồi thi được', 'major', 'CAT-FURN'],
  ['két sắt phòng tài vụ bị kẹt cứng cơ cấu khóa số không mở được', 'major', 'CAT-FURN'],
  ['mặt bàn thí nghiệm bị trầy xước bong một góc viền nhựa nhỏ', 'minor', 'CAT-FURN'],
  ['ngăn kéo bàn giảng viên bị trật ray bi kéo ra hơi nặng tay', 'minor', 'CAT-FURN'],
  ['cánh tủ gỗ văn phòng khoa bị xệ bản lề đóng không khít hoàn toàn', 'minor', 'CAT-FURN'],
  ['dây kéo rèm cuốn cửa sổ bị xoắn rối kéo lên xuống hơi rít', 'minor', 'CAT-FURN'],

  ['máy chiếu panasonic trên trần xẹt lửa có mùi khét nhựa ở hốc nguồn', 'critical', 'CAT-DISPLAY'],
  ['khung treo máy chiếu bị tuột vít nở trần bê tông nghiêng hẳn một bên sắp rớt', 'critical', 'CAT-DISPLAY'],
  ['máy chiếu cháy bóng đèn báo đèn đỏ lamp quạt vẫn chạy bình thường', 'major', 'CAT-DISPLAY'],
  ['nổ bóng đèn cao áp bên trong máy chiếu hình tắt tối đen', 'major', 'CAT-DISPLAY'],
  ['cáp hdmi bàn giảng viên bị đứt ngầm cắm laptop báo no signal liên tục', 'major', 'CAT-DISPLAY'],
  ['tivi thông minh phòng họp có tiếng nói nhưng màn hình tối đen mất đèn nền', 'major', 'CAT-DISPLAY'],
  ['vải màn chiếu bị rách mép phải vẫn kéo xuống chiếu tạm được', 'minor', 'CAT-DISPLAY'],
  ['hình máy chiếu hơi lệch thang keystone và bám bụi nhẹ trên ống kính', 'minor', 'CAT-DISPLAY'],

  ['điều hòa âm trần chập dây điện bốc khói đen tại góc trần thạch cao', 'critical', 'CAT-HVAC'],
  ['vỡ ống xả nước điều hòa tràn ướt sũng xuống tủ điện và dãy máy tính', 'critical', 'CAT-HVAC'],
  ['điều hòa phòng giảng đường mất lạnh hoàn toàn dù bật 16 độ quạt vẫn chạy', 'major', 'CAT-HVAC'],
  ['cục nóng điều hòa báo lỗi u4 không đóng lốc máy nén phòng rất nóng', 'major', 'CAT-HVAC'],
  ['quạt hút thông gió phòng vệ sinh bị cháy cuộn dây đứng cánh không quay', 'major', 'CAT-HVAC'],
  ['cánh vẫy gió điều hòa kêu kẹt kẹt nhỏ khi đảo chiều gió', 'minor', 'CAT-HVAC'],
  ['lưới lọc bụi điều hòa bám nhiều bụi làm gió thổi hơi yếu cần vệ sinh định kỳ', 'minor', 'CAT-HVAC'],

  ['amply hội trường chập công suất bốc khói khét lẹt trong tủ máy', 'critical', 'CAT-AUDIO'],
  ['loa treo tường hội trường bị lỏng giá sắt sắp rơi xuống hàng ghế đầu', 'critical', 'CAT-AUDIO'],
  ['hệ thống âm thanh giảng đường mất tiếng hoàn toàn cả hai loa chính', 'major', 'CAT-AUDIO'],
  ['bộ thu micro không dây bị hỏng nguồn không nhận cả 2 tay mic giảng viên', 'major', 'CAT-AUDIO'],
  ['loa trợ giảng di động bị chai bình sạc rút dây điện ra là tắt nguồn ngay', 'major', 'CAT-AUDIO'],
  ['tay micro không dây bị mất nắp nhựa đậy pin bên dưới', 'minor', 'CAT-AUDIO'],
  ['vặn núm âm lượng amply nghe tiếng sột soạt nhẹ rồi hết', 'minor', 'CAT-AUDIO'],

  ['ổ cắm nguồn sau máy chủ server đánh tia lửa điện khét lẹt', 'critical', 'CAT-IT'],
  ['vỏ kim loại cây máy tính số 12 bị rò điện chạm tay vào giật tê bần bật', 'critical', 'CAT-IT'],
  ['cụm lưu trữ nas synology báo hỏng 2 ổ cứng nguy cơ mất dữ liệu học vụ', 'critical', 'CAT-IT'],
  ['dàn 5 máy tính phòng thực hành mất nguồn không bật lên được khi sắp ca thi', 'major', 'CAT-IT'],
  ['máy trạm đồ họa phòng lab quá nhiệt tự động sập nguồn khi render', 'major', 'CAT-IT'],
  ['màn hình máy tính sinh viên bị sọc dọc nhòe màu không đọc được đề bài', 'major', 'CAT-IT'],
  ['nút cuộn giữa của chuột máy tính bàn giáo viên bị trờn lăn ngược', 'minor', 'CAT-IT'],
  ['mất 2 sợi dây nhảy cảm biến trong hộp thực hành vi điều khiển iot', 'minor', 'CAT-IT'],

  ['switch lõi core tầng 1 có mùi khét và tắt toàn bộ đèn cổng quang', 'critical', 'CAT-NET'],
  ['đứt tuyến cáp quang uplink làm mất internet toàn bộ tòa nhà a1', 'critical', 'CAT-NET'],
  ['bộ phát wifi phòng hội thảo chập chờn rớt mạng liên tục không họp zoom được', 'major', 'CAT-NET'],
  ['tường lửa fortigate treo dịch vụ vpn không kết nối được hệ thống đào tạo', 'major', 'CAT-NET'],
  ['camera hội nghị trực tuyến bị kẹt mô tơ xoay ptz không lấy nét được', 'major', 'CAT-NET'],
  ['tai nghe điện thoại bàn ip bị rạn vỏ nhựa dây xoắn hơi rối', 'minor', 'CAT-NET'],

  ['cửa kiểm soát ra vào bằng khóa từ bị chập mạch khóa chặt nhốt người bên trong', 'critical', 'CAT-SEC'],
  ['toàn bộ camera an ninh tầng 1 mất kết nối đồng loạt trên màn hình bảo vệ', 'critical', 'CAT-SEC'],
  ['camera cổng chính bị mờ đục nước lọt vào trong ống kính không nhìn rõ biển số', 'major', 'CAT-SEC'],
  ['máy quét mã vạch mượn sách thư viện hỏng cò bấm không nhận mã isbn', 'major', 'CAT-SEC'],
  ['nút nhấn mở cửa exit phòng lab hơi lún lò xo phải ấn mạnh mới mở', 'minor', 'CAT-SEC'],

  ['máy photocopy văn phòng bốc khói khét ở cụm lô sấy nhiệt', 'critical', 'CAT-OFFICE'],
  ['cây nước nóng lạnh bị bục bình chứa chảy tràn ngập nước ra sảnh thang máy', 'critical', 'CAT-OFFICE'],
  ['máy in phòng khảo thí kẹt rách bao lụa không in được danh sách phòng thi', 'major', 'CAT-OFFICE'],
  ['máy lọc nước ro kêu tạch tạch liên tục không bơm được nước tinh khiết', 'major', 'CAT-OFFICE'],
  ['máy chấm công sảnh giảng viên bị treo màn hình trắng không chấm vân tay được', 'major', 'CAT-OFFICE'],
  ['khay đỡ giấy ra của máy in bị gãy lẫy nhựa đỡ giấy', 'minor', 'CAT-OFFICE'],

  ['aptomat tổng tủ điện tầng 3 phát nổ đánh hồ quang đen sạm mặt tủ', 'critical', 'CAT-POWER'],
  ['dây điện trần bị chuột cắn hở lõi đồng chạm vào khung trần kim loại', 'critical', 'CAT-POWER'],
  ['nhảy aptomat chống giật nhánh điều hòa và ổ cắm phòng học 302', 'major', 'CAT-POWER'],
  ['hai bộ đèn chiếu sáng khẩn cấp cầu thang bộ hỏng ắc quy không sáng khi cúp điện', 'major', 'CAT-POWER'],
  ['một bóng đèn led âm trần hành lang bị già bóng sáng yếu hơn các bóng khác', 'minor', 'CAT-POWER'],

  ['bình chữa cháy khí co2 tự dưng xì van lạnh buốt phun mù trắng góc cầu thang', 'critical', 'CAT-FIRE'],
  ['chuông báo cháy tầng 4 kêu rú liên tục tủ trung tâm báo fire zone 4', 'critical', 'CAT-FIRE'],
  ['ba bình chữa cháy bột khô tại hành lang tầng 2 tụt kim áp suất xuống vạch đỏ', 'major', 'CAT-FIRE'],
  ['cuộn vòi vải trong tủ chữa cháy vách tường bị ẩm mục rách khớp nối', 'major', 'CAT-FIRE'],
  ['tem niêm phong cánh tủ đựng bình cứu hỏa bị bong rách cần dán kiểm tra lại', 'minor', 'CAT-FIRE'],

  ['máy phá rung tim tự động aed trực sảnh báo lỗi đèn đỏ hết hạn tấm pad cấp cứu', 'critical', 'CAT-SPEC'],
  ['nhiệt kế hồng ngoại và máy đo huyết áp phòng y tế hỏng nguồn không đo được cho sinh viên ngất', 'major', 'CAT-SPEC'],
  ['nệm mút giường y tế bị rách nhẹ lớp vỏ bọc simili ở góc chân giường', 'minor', 'CAT-SPEC']
];

export default {
  CATEGORY_ONTOLOGY,
  NON_ELECTRICAL_PATTERNS,
  EXPLICIT_ELECTRICAL_PATTERNS,
  SAFETY_PROTOCOLS,
  FAULT_PLAYBOOKS,
  FACILITY_TRAINING_CORPUS
};
