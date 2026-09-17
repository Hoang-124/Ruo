# Ruo — Hệ Thống Quản Lý Cơ Sở Vật Chất Đại Học Thông Minh
> **RUO (University Facilities Management System — UFMS | Version 2.0)**  
> Nền tảng Enterprise số hóa toàn diện điều hành không gian kiến trúc, lịch biểu học thuật và vòng đời tài sản đại học trên kiến trúc Digital Twin, Động cơ Giải thuật CSP, Đếm ngược SLA Giờ Hành Chính và Chuỗi Khối Kiểm Toán SHA-256.

---

## 📑 MỤC LỤC TỔNG QUAN

1. [Giới Thiệu Đề Án & Tầm Nhìn](#1-giới-thiệu-đề-án--tầm-nhìn)
2. [Sơ Đồ Kiến Trúc Hệ Thống (System Architecture)](#2-sơ-đồ-kiến-trúc-hệ-thống-system-architecture)
3. [6 Trụ Cột Kỹ Thuật Nâng Cao (Điểm Nhấn Đồ Án)](#3-6-trụ-cột-kỹ-thuật-nâng-cao-điểm-nhấn-đồ-án)
4. [Ma Trận 7 Tác Nhân (Actors) & Tài Khoản Trình Diễn (Demo Accounts)](#4-ma-trận-7-tác-nhân-actors--tài-khoản-trình-diễn-demo-accounts)
5. [Cấu Trúc Thư Mục Dự Án (Monorepo Layout)](#5-cấu-trúc-thư-mục-dự-án-monorepo-layout)
6. [Đặc Tả Cơ Sở Dữ Liệu 12 Collections (MongoDB Mongoose)](#6-đặc-tả-cơ-sở-dữ-liệu-12-collections-mongodb-mongoose)
7. [Danh Mục API Endpoints Chuẩn RESTful](#7-danh-mục-api-endpoints-chuẩn-restful)
8. [Hướng Dẫn Cài Đặt & Chạy Cục Bộ (Getting Started)](#8-hướng-dẫn-cài-đặt--chạy-cục-bộ-getting-started)
9. [Bảng Phân Rã 103 Nhiệm Vụ & Phân Công 5 Thành Viên](#9-bảng-phân-rã-103-nhiệm-vụ--phân-công-5-thành-viên)
10. [Quy Chuẩn Thiết Kế Giao Diện & Tiêu Chuẩn Mã Nguồn](#10-quy-chuẩn-thiết-kế-giao-diện--tiêu-chuẩn-mã-nguồn)

---

## 1. GIỚI THIỆU ĐỀ ÁN & TẦM NHÌN

Hệ thống quản lý cơ sở vật chất tại các trường đại học lớn thường xuyên đối mặt với 5 điểm nghẽn nghiêm trọng:
1. **Xung đột phòng học:** Trùng giờ giữa lớp chính khóa, hội thảo đột xuất và hoạt động tự học của sinh viên.
2. **Lãng phí công suất giảng đường:** Lớp 40 sinh viên ngồi phòng 150 chỗ, trong khi lớp 100 sinh viên thiếu phòng.
3. **Thất lạc & Chậm trễ xử lý hỏng hóc:** Thiết bị hư hỏng không có cơ chế theo dõi tiến độ sửa chữa, đùn đẩy trách nhiệm.
4. **Kiểm kê thủ công:** Tốn hàng tuần lễ ghi chép sổ sách đối soát tài sản cơ sở vật chất.
5. **Rủi ro thất thoát tài sản công:** Thiếu nhật ký kiểm toán bất biến để chứng minh tính minh bạch trước thanh tra.

**Ruo (UFMS)** ra đời như một hệ sinh thái chuyển đổi số hoàn chỉnh, tích hợp thuật toán thông minh **CSP (Constraint Satisfaction Problem)**, cơ chế **Bảo trì SLA chuẩn giờ hành chính**, định danh **QR Code sub-second**, quy trình thanh lý **5 Bước RACI** và sổ cái **Audit Trail SHA-256**.

---

## 2. SƠ ĐỒ KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE)

```
+----------------------------------------------------------------------------------------------------+
|                                    CLIENT TIER (React 19 + Vite)                                    |
|  - Obsidian Dark Command Center & Clean Academic Light Mode (Design Tokens Vanilla CSS)           |
|  - Spatial CAD Canvas 2.5D (Pure SVG Digital Twin) & Interactive Floor Scrubber                   |
|  - Weekly Visual Calendar Grid RFC-5545 (Color-coded: Class, Approved, Maint, Empty)              |
|  - SLA Kanban Reactor Board & Drag-Drop CSP Timetable Grid                                         |
|  - 100% Native Inline SVG Components (Zero External Icon Library Overhead)                        |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  │ HTTP/RESTful APIs (JWT Bearer Token)
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                                   APPLICATION TIER (Node.js + Express)                              |
|  +─────────────────────────+──────────────────────────+─────────────────────────+                   |
|  |    Security & Access    |     Business Engines     |   Background Workers    |                   |
|  | - Dynamic RBAC Policy   | - CSP Timetable Solver   | - 60s No-Show Sweeper   |                   |
|  | - JWT Access / Refresh  | - SLA Reactor (07:30)    | - SLA Early Warning     |                   |
|  | - Rate Limiter & Helmet | - 4-Rule Escalation      | - Nodemailer Queue      |                   |
|  | - SHA-256 Audit Chain   | - RACI Disposal Machine  | - SIS Sync Webhook Mock |                   |
|  +─────────────────────────+──────────────────────────+─────────────────────────+                   |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  │ Mongoose ODM (Atomic Transactions & Indexes)
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                                 PERSISTENCE TIER (MongoDB 12 Collections)                          |
|  users • roles • rooms • equipments • bookings • booking_series • booking_exceptions               |
|  borrow_requests • tickets • maintenance_plans • asset_disposals • audit_logs                      |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. 6 TRỤ CỘT KỸ THUẬT NÂNG CAO (ĐIỂM NHẤN ĐỒ ÁN)

### 🧩 Trụ Cột 1: Động Cơ Xếp Thời Khóa Biểu CSP (Constraint Satisfaction Problem)
- **Giải thuật:** Backtracking kết hợp **MRV (Minimum Remaining Values)** ưu tiên xếp lớp có miền phòng hẹp nhất trước + **Degree Heuristic** ưu tiên môn sĩ số lớn và phòng Lab chuyên dụng.
- **Hàm mục tiêu phạt mềm (Soft Penalty Optimization):**
  $$\text{Penalty} = W_{\text{waste}} \times \left(\frac{\text{Capacity}_{\text{room}} - \text{Size}_{\text{class}}}{\text{Capacity}_{\text{room}}} \times 100\right) + W_{\text{dist}} \times \text{BuildingMismatchPenalty}$$
- **Hiệu quả thực nghiệm:** Phân bổ tự động **100% lớp học phần chỉ trong 2 - 5ms**, cam kết **0 xung đột** thời gian và đạt tỷ lệ tối ưu sử dụng ghế ngồi **> 85%**.

### ⏱️ Trụ Cột 2: Kanban SLA Reactor Tính Chuẩn Giờ Hành Chính
- **Quy tắc đếm ngược:** Chỉ tính thời gian trong khung giờ làm việc: **07:30 – 17:00 (Thứ 2 đến Thứ 6)**. Đóng băng đồng hồ ban đêm và các ngày cuối tuần. Riêng mức sự cố `Critical` tính 24/7 liên tục ($\le 4$h).
- **Hệ thống cảnh báo sớm 3 giai đoạn (Early Warning Matrix):**
  - `ON_TRACK` (0% - 70% hạn định): Badge xanh lục ổn định.
  - `AT_RISK` (70% - 100% hạn định): Badge cam nhấp nháy, tự động đẩy WebSocket thông báo nhắc nhở kỹ thuật viên.
  - `OVERDUE` ($> 100\%$ hạn định): Badge đỏ đậm, gửi email báo cáo Trưởng phòng CSVC và trừ điểm KPI.
- **Nghiệm thu 2 chiều (Double Confirmation):** Người báo hỏng đánh giá 1 - 5 sao và bấm xác nhận trước khi đóng ticket; hệ thống tự động nghiệm thu sau 48h nếu không có phản hồi.

### 🛡️ Trụ Cột 3: Phân Luồng Duyệt Đa Cấp Tự Động (4-Rule Escalation Engine)
Hệ thống tự động đánh giá đơn đặt phòng qua 4 ngưỡng định lượng để quyết định thẩm quyền phê duyệt:
1. `RULE_CURRICULUM`: Slot mượn trùng với thời khóa biểu chính khóa đã đóng băng.
2. `RULE_SCALE`: Quy mô mượn đồng thời $\ge 3$ phòng hoặc số lượng tham dự $\ge 300$ người.
3. `RULE_OFF_HOURS`: Khung giờ mượn sau 21:00 tối hoặc rơi vào Thứ Bảy, Chủ Nhật.
4. `RULE_HIGH_VALUE`: Mượn trang thiết bị có nguyên giá $> 50.000.000$ VNĐ.
$\rightarrow$ Tự động chuyển quyền thẩm định từ Quản lý CSVC lên **Phòng Đào Tạo & Ban Giám Hiệu**.

### 📅 Trụ Cột 4: Đặt Lịch Định Kỳ Chuẩn iCalendar (RFC-5545) & Khắc Phục Xung Đột
- Tránh bùng nổ dữ liệu bằng cấu trúc kế thừa:
  - Bảng cha `booking_series`: Lưu thông tin lặp tuần cho cả học kỳ (15 tuần).
  - Bảng con `booking_exceptions`: Chỉ lưu các ngày nghỉ lễ, ngày dời phòng (`MODIFIED`) hoặc buổi hủy (`CANCELLED`).
- Cung cấp 2 chế độ sửa lịch linh hoạt:
  - *Chế độ 1 (Chỉ buổi này):* Sinh ngoại lệ độc lập, giữ nguyên toàn bộ chuỗi còn lại.
  - *Chế độ 2 (Buổi này và các buổi sau):* Cắt chuỗi tại thời điểm hiện tại và tạo chuỗi mới.

### ⚙️ Trụ Cột 5: Quy Trình Thanh Lý Tài Sản 5 Bước Theo Ma Trận RACI ($R \ge 60\%$)
- **Chỉ số tỷ lệ sửa chữa (Repair Ratio):**
  $$R = \left(\frac{\text{Chi phí ước tính linh kiện thay thế}}{\text{Giá trị sổ sách còn lại của thiết bị}}\right) \times 100\%$$
- Khi $R \ge 60\%$, thiết bị tự động khóa mượn (`PENDING_DISPOSAL`) và kích hoạt quy trình 5 bước:
  - **Bước 1 (Responsible - Kỹ thuật viên):** Lập biên bản giám định kỹ thuật hiện trường, ghi nhận $R \ge 60\%$.
  - **Bước 2 (Accountable - Quản lý CSVC):** Tra cứu hồ sơ gốc tài sản, lập Tờ trình Đề xuất Thanh lý.
  - **Bước 3 (Approver - Hội đồng Thanh lý & BGH):** Thẩm định pháp lý và ký phê duyệt thanh lý.
  - **Bước 4 (Consulted - P. Đào tạo & Kế hoạch):** Lập dự trù ngân sách mua sắm lô máy mới thay thế.
  - **Bước 5 (Informed - Thủ kho & IT Admin):** Nhập kho tài sản mới, dán mã QR và cập nhật danh mục.

### ⛓️ Trụ Cột 6: Chuỗi Khối Kiểm Toán Bất Biến SHA-256 (Tamper-Proof Audit Trail)
- Mọi thao tác trọng yếu (Đăng nhập, duyệt đơn, bàn giao thiết bị, thanh lý, cập nhật cấu hình) đều được đóng gói thành một khối dữ liệu kiểm toán.
- Khối dữ liệu chứa: `timestamp`, `userId`, `action`, `entity`, `ipAddress`, `dataDiff`, `prevHash` và `sha256Hash`.
- Cung cấp endpoint đối soát toàn vẹn `GET /api/audit/verify-chain`, phát hiện ngay lập tức vị trí khối bị can thiệp trái phép nếu cơ sở dữ liệu bị chỉnh sửa trực tiếp.

---

## 4. MA TRẬN 7 TÁC NHÂN (ACTORS) & TÀI KHOẢN TRÌNH DIỄN (DEMO ACCOUNTS)

Hệ thống cung cấp sẵn bộ dữ liệu tài khoản thực tế sau khi chạy `npm run seed`:

| Vai trò (Role) | Email Đăng Nhập | Mật Khẩu | Mã Cán Bộ / MSSV | Đặc Quyền Nghiệp Vụ Chính |
| :--- | :--- | :---: | :---: | :--- |
| **Sinh viên** *(Student)* | `sv.hoang@hcmut.edu.vn` | `Ruo@2026` | 2011001 | Đặt tối đa 2 phòng/ngày, đặt trước $\le 2$ tuần, Check-in QR tại cửa, Báo cáo sự cố thiết bị. |
| **Giảng viên** *(Lecturer)* | `gv.tung@hcmut.edu.vn` | `Ruo@2026` | CB-1024 | Đặt tối đa 5 phòng/ngày, đặt trước 4 tuần, Đặt lịch chuỗi cả kỳ RFC-5545, Mượn thiết bị giảng dạy. |
| **Quản lý CSVC** *(Facility Staff)* | `csvc.nguyen@hcmut.edu.vn` | `Ruo@2026` | NV-2001 | Thẩm định đơn mượn phòng/thiết bị, CRUD danh mục Tòa nhà/Phòng/Tài sản, Điều phối kiểm kê QR. |
| **Kỹ thuật viên** *(Maintenance Staff)* | `kt.quang@hcmut.edu.vn` | `Ruo@2026` | KT-3001 | Tiếp nhận ticket sự cố, bấm giờ xử lý SLA, xuất kho vật tư, lập đề xuất thanh lý máy $R \ge 60\%$. |
| **Phòng Đào tạo** *(Academic Affairs)* | `daotao.uyen@hcmut.edu.vn` | `Ruo@2026` | DT-4001 | Động cơ CSP xếp TKB, Phê duyệt đơn chuyển cấp Escalation, Phân bổ phòng thi, Khóa lịch chính khóa. |
| **Quản trị hệ thống** *(System Admin)* | `admin.hoang@hcmut.edu.vn` | `Ruo@2026` | AD-0001 | Quản trị Người dùng, Phân quyền ma trận RBAC, Cấu hình hệ thống, Đối soát Audit Log SHA-256. |
| **Hệ thống ngoài** *(External SIS/Mock)* | *Automated Service* | *N/A* | SYS-SYNC | Nhận webhook đồng bộ lịch học SIS, tự động kích hoạt gửi Email/SMS cảnh báo. |

---

## 5. CẤU TRÚC THƯ MỤC DỰ ÁN (MONOREPO LAYOUT)

```
d:/Ruo/
├── client/                                 # Giao diện người dùng React 19 + Vite
│   ├── public/                             # Tài nguyên tĩnh
│   ├── src/
│   │   ├── assets/                         # SVG icons thuần, tài nguyên đồ họa
│   │   ├── components/                     # Components dùng chung (Header, Island, Modals...)
│   │   ├── modules/                        # Giao diện 5 phân hệ nghiệp vụ chính
│   │   │   ├── auth/                       # Đăng nhập, Quên mật khẩu, Profile
│   │   │   ├── rooms/                      # CAD Canvas 2.5D, Calendar Grid, Đặt phòng
│   │   │   ├── equipments/                 # Kho thiết bị, Quét mã QR, Mượn trả
│   │   │   ├── incidents/                  # Kanban SLA Board, Timeline, Đánh giá sao
│   │   │   ├── academic/                   # Bảng phân bổ CSP, Kéo thả TKB, Lịch thi
│   │   │   └── admin/                      # User Directory, RBAC Matrix, Audit Log
│   │   ├── styles/                         # Vanilla CSS Design Tokens (Theme Dark/Light)
│   │   ├── App.jsx                         # Shell ứng dụng & Bộ điều hướng phân hệ
│   │   └── main.jsx                        # Điểm khởi động ứng dụng
│   ├── index.html                          # HTML5 Semantic Template chuẩn SEO
│   ├── package.json                        # Dependencies Frontend
│   └── vite.config.js                      # Cấu hình proxy ngược sang Backend (port 5000)
│
├── server/                                 # Máy chủ API Node.js + Express + MongoDB
│   ├── src/
│   │   ├── config/
│   │   │   ├── constants.js                # Hằng số nghiệp vụ (SLA hours, RACI steps, Roles)
│   │   │   └── db.js                       # Kết nối Mongoose ODM với MongoDB
│   │   ├── controllers/                    # 8 Controllers điều phối Request/Response
│   │   ├── middlewares/                    # Xác thực JWT Bearer, Dynamic RBAC, Error Handler
│   │   ├── models/                         # 12 Mongoose Schemas & Bảng chỉ mục
│   │   ├── routes/                         # Định tuyến RESTful phân theo phân hệ
│   │   ├── seeds/
│   │   │   └── seedDatabase.js             # Bộ nạp dữ liệu đại học mẫu thực tế
│   │   ├── services/                       # Động cơ nghiệp vụ nâng cao (CSP, SLA, Sweeper)
│   │   └── server.js                       # Điểm khởi động Express Server
│   ├── .env.example                        # Mẫu biến môi trường
│   └── package.json                        # Dependencies Backend
│
├── PROJECT_TASKS_MATRIX.md                 # Ma trận 103 nghiệp vụ chi tiết chuẩn Markdown
├── PROJECT_TASKS_SHEET.tsv                 # Dữ liệu TSV sẵn sàng import Google Sheets / Excel
├── PROJECT_TASKS_WBS.md                    # Đặc tả WBS 5 Sprint phân bổ cho nhóm 5 sinh viên
└── README.md                               # Tài liệu hướng dẫn dự án chính
```

---

## 6. ĐẶC TẢ CƠ SỞ DỮ LIỆU 12 COLLECTIONS (MONGODB MONGOOSE)

| STT | Tên Collection | Chức năng nghiệp vụ | Các chỉ mục trọng yếu (Indexes) |
| :---: | :--- | :--- | :--- |
| **1** | `users` | Tài khoản, hồ sơ sinh viên/giảng viên, điểm uy tín | `{ email: 1 }`, `{ employeeCode: 1 }`, `{ role: 1 }` |
| **2** | `roles` | Ma trận vai trò và danh sách permissions phân cấp | `{ name: 1 }` (unique) |
| **3** | `rooms` | Không gian phòng học, tọa độ CAD 2.5D, telemetry | `{ code: 1 }`, `{ building: 1, floorNumber: 1 }`, `{ type: 1 }` |
| **4** | `equipments` | Danh mục tài sản, mã QR định danh, khấu hao | `{ assetCode: 1 }`, `{ qrCodeData: 1 }`, `{ room: 1, status: 1 }` |
| **5** | `bookings` | Buổi đặt phòng đơn lẻ, trạng thái duyệt, check-in | `{ room: 1, startTime: 1, endTime: 1 }`, `{ user: 1, status: 1 }` |
| **6** | `booking_series` | Chuỗi lịch định kỳ cả học kỳ chuẩn RFC-5545 | `{ lecturer: 1 }`, `{ room: 1 }`, `{ dayOfWeek: 1 }` |
| **7** | `booking_exceptions`| Buổi ngoại lệ bị đổi phòng/hủy của chuỗi định kỳ | `{ seriesId: 1, exceptionDate: 1 }` (compound unique) |
| **8** | `borrow_requests` | Đơn đăng ký mượn thiết bị di động | `{ equipment: 1, status: 1 }`, `{ user: 1 }` |
| **9** | `tickets` | Phiếu sự cố kỹ thuật, mốc đếm ngược SLA | `{ ticketCode: 1 }`, `{ status: 1, "slaTracking.resolutionDeadline": 1 }` |
| **10**| `maintenance_plans`| Kế hoạch bảo dưỡng dự phòng định kỳ | `{ targetType: 1, nextDueDate: 1 }` |
| **11**| `asset_disposals` | Hồ sơ thanh lý tài sản hư hỏng $R \ge 60\%$ | `{ proposalCode: 1 }`, `{ equipment: 1 }`, `{ rRatio: 1 }` |
| **12**| `audit_logs` | Chuỗi băm kiểm toán SHA-256 bất biến | `{ timestamp: -1 }`, `{ sha256Hash: 1 }`, `{ action: 1 }` |

---

## 7. DANH MỤC API ENDPOINTS CHUẨN RESTFUL

### 🔐 Phân Hệ 1: Xác Thực & Người Dùng (`/api/auth`, `/api/admin/users`)
- `POST /api/auth/login`: Đăng nhập hệ thống, cấp Access Token (15m) + Refresh Token (7d).
- `POST /api/auth/logout`: Đăng xuất, đưa token vào Blacklist.
- `POST /api/auth/forgot-password`: Gửi mã OTP 6 số qua email.
- `POST /api/auth/change-password`: Đổi mật khẩu tài khoản.
- `GET /api/auth/me`: Lấy thông tin tài khoản đang đăng nhập kèm điểm uy tín.
- `GET /api/admin/users`: Danh sách người dùng (phân trang, lọc theo vai trò, khoa).
- `POST /api/admin/users`: Tạo tài khoản mới, gửi mật khẩu khởi tạo.
- `PUT /api/admin/users/:id/toggle-status`: Khóa hoặc kích hoạt tài khoản.
- `POST /api/admin/users/import`: Import danh sách sinh viên/giảng viên hàng loạt từ Excel.

### 🏢 Phân Hệ 2: Không Gian Phòng & Bản Đồ CAD (`/api/facilities`)
- `GET /api/facilities/rooms`: Danh sách phòng học kèm bộ lọc đa tiêu chí.
- `GET /api/facilities/rooms/:code`: Xem chi tiết thông số kỹ thuật, telemetry IoT và lịch phòng.
- `POST /api/facilities/rooms`: Thêm mới phòng học vào sơ đồ mặt bằng.
- `GET /api/facilities/cad-canvas`: Dữ liệu mặt bằng Tầng 3 Tòa A1 phục vụ vẽ sơ đồ CAD 2.5D.
- `GET /api/facilities/rooms/search`: Thuật toán tìm kiếm phòng trống thông minh không trùng lịch.

### 📦 Phân Hệ 3: Thiết Bị & Kho QR Định Danh (`/api/equipments`)
- `GET /api/equipments`: Danh mục thiết bị toàn trường, lọc theo trạng thái và vị trí.
- `POST /api/equipments`: Nhập thiết bị mới, tự động sinh mã QR định danh duy nhất.
- `GET /api/equipments/qr/:qrCode`: Tra cứu thông tin máy tức thời khi quét mã QR.
- `POST /api/equipments/inventory`: Khởi tạo và đối soát đợt kiểm kê tài sản thực tế.
- `POST /api/equipments/borrow`: Đăng ký mượn thiết bị di động giảng dạy.
- `PUT /api/equipments/borrow/:id/return`: Trả thiết bị và bàn giao nghiệm thu kỹ thuật.

### 📅 Phân Hệ 4: Lịch Đặt Phòng Đơn & Định Kỳ (`/api/bookings`)
- `POST /api/bookings`: Đặt phòng đơn lẻ (khóa nguyên tử chống trùng lịch 409 Conflict).
- `GET /api/bookings/my`: Lịch sử đặt phòng của cá nhân.
- `POST /api/bookings/check-in`: Quét mã QR cửa phòng xác nhận có mặt trong 15 phút đầu.
- `POST /api/bookings/series`: Tạo chuỗi đặt phòng định kỳ cả học kỳ chuẩn RFC-5545.
- `PUT /api/bookings/series/:id`: Sửa lịch định kỳ (hỗ trợ sửa 1 buổi hoặc chuỗi tương lai).
- `GET /api/bookings/pending`: Hàng đợi duyệt đơn dành cho Quản lý CSVC.
- `PUT /api/bookings/:id/approval`: Phê duyệt hoặc từ chối đơn mượn phòng.

### 🛠️ Phân Hệ 5: Sự Cố Kỹ Thuật & Giám Sát SLA (`/api/incidents`, `/api/maintenance`)
- `POST /api/incidents`: Báo sự cố hư hỏng (đính kèm tối đa 5 ảnh hiện trường).
- `GET /api/incidents/kanban`: Bảng Kanban điều phối sự cố toàn trường theo hạn định SLA.
- `PUT /api/incidents/:id/assign`: Giao việc cho kỹ thuật viên theo chuyên môn và khối lượng tải.
- `PUT /api/incidents/:id/accept`: Kỹ thuật viên nhận việc, bắt đầu bấm giờ SLA thực tế.
- `PUT /api/incidents/:id/resolve`: Nghiệm thu kỹ thuật, tổng hợp vật tư đã thay thế.
- `PUT /api/incidents/:id/confirm`: Người báo đánh giá 1-5 sao và xác nhận hoàn tất.
- `POST /api/disposals`: Lập hồ sơ đề xuất thanh lý tài sản khi $R \ge 60\%$.
- `PUT /api/disposals/:id/step`: Chuyển bước phê duyệt thanh lý theo ma trận RACI.

### 🎓 Phân Hệ 6: Xếp Lịch CSP Đào Tạo & Kiểm Toán (`/api/academic`, `/api/audit`)
- `POST /api/academic/import-courses`: Import danh sách lớp học phần học kỳ.
- `POST /api/academic/csp/solve`: Kích hoạt bộ giải CSP xếp TKB tự động 0 xung đột.
- `PUT /api/academic/semesters/:code/freeze`: Khóa cứng lịch học toàn trường.
- `GET /api/academic/escalated`: Hàng đợi xem xét các đơn mượn vượt thẩm quyền chuyển cấp.
- `GET /api/audit/logs`: Xem danh sách nhật ký kiểm toán SHA-256 chuỗi khối.
- `GET /api/audit/verify-chain`: Chạy thuật toán kiểm tra tính toàn vẹn của chuỗi băm.
- `GET /api/reports/room-heatmap`: Báo cáo biểu đồ nhiệt tỷ lệ sử dụng phòng theo giờ.

---

## 8. HƯỚNG DẪN CÀI ĐẶT & CHẠY CỤC BỘ (GETTING STARTED)

### 1. Yêu Cầu Môi Trường
- **Node.js**: Phiên bản `>= 18.0.0` (Khuyến nghị Node LTS v20.x).
- **MongoDB**: Phiên bản `>= 6.0` (Chạy local `mongodb://localhost:27017` hoặc kết nối MongoDB Atlas).
- **Trình duyệt**: Chrome, Edge, Firefox, Safari (khuyến nghị chế độ hiển thị 1920x1080 hoặc laptop 14-inch).

---

### 2. Cấu Hình & Khởi Động Máy Chủ Backend

```bash
# Di chuyển vào thư mục server
cd d:/Ruo/server

# Cài đặt các gói thư viện
npm install

# Khởi tạo tệp cấu hình môi trường từ mẫu
cp .env.example .env

# Nạp dữ liệu mẫu thực tế vào MongoDB (Seed Data)
npm run seed

# Khởi chạy máy chủ Backend (Port 5000)
npm run dev
```

> Kiểm tra máy chủ Backend đã sẵn sàng tại: `http://localhost:5000/api/health`

---

### 3. Cấu Hình & Khởi Động Ứng Dụng Frontend

```bash
# Mở một cửa sổ Terminal mới và di chuyển vào thư mục client
cd d:/Ruo/client

# Cài đặt các gói thư viện Frontend
npm install

# Khởi chạy máy chủ phát triển Vite (Port 5173)
npm run dev
```

> Mở trình duyệt và truy cập: **`http://localhost:5173`**

---

## 9. BẢNG PHÂN RÃ 103 NHIỆM VỤ & PHÂN CÔNG 5 THÀNH VIÊN

Dự án được phân rã theo phương pháp **Horizontal Slicing** (Cắt theo phân hệ nghiệp vụ xuyên suốt từ Backend đến Frontend), phân bổ cho nhóm 5 thành viên:

| Thành Viên | Phân Hệ Phụ Trách Chính | Phạm Vi Nghiệp Vụ | Số Lượng Tác Vụ |
| :--- | :--- | :--- | :---: |
| **Hoàng** *(Team Leader)* | **Nền Tảng Cốt Lõi, Xác Thực, RBAC, Cấu Hình & Audit Log** | `Seed Data`, `UC-1.1` $\rightarrow$ `UC-1.6`, `UC-6.1` $\rightarrow$ `UC-6.18`, `Cryptographic Verification` | **26 Tasks** |
| **Tùng** | **Không Gian Phòng Học, CAD Twin 2.5D & Lịch Đặt Đơn/Chuỗi** | `UC-1.7` $\rightarrow$ `UC-1.14`, `UC-2.1` $\rightarrow$ `UC-2.3`, `UC-3.1` $\rightarrow$ `UC-3.6`, `CAD 2.5D`, `No-Show Sweeper` | **20 Tasks** |
| **Nguyên** | **Quản Lý Thiết Bị, Kho QR Định Danh & Vòng Đời Khấu Hao** | `UC-2.4` $\rightarrow$ `UC-2.8`, `UC-3.7` $\rightarrow$ `UC-3.13`, `UC-4.10`, `UC-4.11`, `QR Generator/Scan` | **15 Tasks** |
| **Quang** | **Quy Trình Duyệt Đa Cấp, Kanban SLA Sự Cố & Thanh Lý 5 Bước** | `UC-1.15` $\rightarrow$ `UC-1.18`, `UC-3.14` $\rightarrow$ `UC-3.21`, `UC-4.1` $\rightarrow$ `UC-4.9`, `4-Rule Escalation`, `5-Step RACI` | **26 Tasks** |
| **Uyên** | **Động Cơ CSP Đào Tạo, Báo Cáo BI, Thông Báo & Tích Hợp** | `UC-5.1` $\rightarrow$ `UC-5.10`, `UC-3.22` $\rightarrow$ `UC-3.25`, `UC-1.19` $\rightarrow$ `UC-1.20`, `UC-7.1` $\rightarrow$ `UC-7.3` | **16 Tasks** |
| **TỔNG CỘNG** | **TOÀN BỘ DỰ ÁN RUO (UFMS)** | **103 Nghiệp Vụ Chuẩn Hóa** | **103 Tasks** |

👉 Xem ma trận chi tiết 15 cột tại [PROJECT_TASKS_MATRIX.md](file:///d:/Ruo/PROJECT_TASKS_MATRIX.md) và tài liệu phân rã WBS tại [PROJECT_TASKS_WBS.md](file:///d:/Ruo/PROJECT_TASKS_WBS.md).

---

## 10. QUY CHUẨN THIẾT KẾ GIAO DIỆN & TIÊU CHUẨN MÃ NGUỒN

### 🎨 Hệ Thống Design Tokens & Bảng Màu Cao Cấp
- **Obsidian Dark Command Center:** Màu nền `#080c14`, thẻ bề mặt `#0f172a`, đường viền `rgba(255,255,255,0.08)`, chữ trắng ngà `#f8fafc`.
- **Clean Academic Light Mode:** Màu nền `#f8fafc`, bề mặt trắng tinh khiết `#ffffff`, đường viền `#e2e8f0`, chữ Oxford Navy `#0f172a`.
- **Màu sắc nhận diện giáo dục:** Xanh Navy Học thuật (`#0284c7`), Xanh Emerald Hoạt động (`#10b981`), Hổ phách Cảnh báo (`#f59e0b`), Đỏ Hồng Khẩn cấp (`#ef4444`).

### ⚡ Nguyên Tắc Kỹ Thuật Bất Biến
1. **100% Native Inline SVG:** Tuyệt đối không cài đặt hoặc import thư viện icon ngoài (`lucide-react`, `react-icons`...). Toàn bộ icon được viết trực tiếp bằng thẻ SVG chuẩn tối ưu hiệu năng.
2. **Không Viết Mã Giả (Full Output Enforcement):** Mọi controller, service và component đều được viết hoàn chỉnh 100%, không chứa chú thích dạng `// todo` hoặc lược bỏ code.
3. **Typography Đồng Bộ:** Sử dụng đồng nhất phông chữ **Be Vietnam Pro** cho tiêu đề, nội dung tiếng Việt và **JetBrains Mono** cho các chỉ số kỹ thuật, mã phòng, mã QR.

---

## 📜 GIẤY PHÉP & BẢN QUYỀN

Đề tài Đồ án Tốt nghiệp được nghiên cứu và phát triển bởi **Nhóm Phát Triển Ruo (UFMS Team)**.  
Bản quyền © 2026. Mọi quyền được bảo lưu.
