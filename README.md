# Ruo — Hệ Thống Quản Lý Thiết Bị & Vật Tư Đại Học
> **RUO (University Equipment Management System — UEMS | Version 3.0)**  
> Nền tảng số hóa quản lý vòng đời thiết bị và vật tư cho Phòng Hành chính Đại học: Định danh QR, Theo dõi Vị trí & Luân chuyển, Quy trình Sửa chữa & Bảo hành, Xuất kho Linh kiện, Bảo trì Dự phòng, Thanh lý RACI 5 Bước, Kiểm kê QR Đối soát, Import Hàng loạt, Dashboard KPI, Thông báo & Email, Sổ cái Kiểm Toán SHA-256 bất biến.

---

## MỤC LỤC TỔNG QUAN

1. [Giới Thiệu Đề Án & Tầm Nhìn](#1-giới-thiệu-đề-án--tầm-nhìn)
2. [Sơ Đồ Kiến Trúc Hệ Thống](#2-sơ-đồ-kiến-trúc-hệ-thống)
3. [4 Trụ Cột Kỹ Thuật Nâng Cao](#3-4-trụ-cột-kỹ-thuật-nâng-cao)
4. [Ma Trận 3 Tác Nhân & Tài Khoản Trình Diễn](#4-ma-trận-3-tác-nhân--tài-khoản-trình-diễn)
5. [Cấu Trúc Thư Mục Dự Án](#5-cấu-trúc-thư-mục-dự-án)
6. [Đặc Tả Cơ Sở Dữ Liệu MongoDB](#6-đặc-tả-cơ-sở-dữ-liệu-mongodb)
7. [Danh Mục API Endpoints](#7-danh-mục-api-endpoints)
8. [Hướng Dẫn Cài Đặt & Chạy Cục Bộ](#8-hướng-dẫn-cài-đặt--chạy-cục-bộ)
9. [Bảng Phân Rã 64 Nghiệp Vụ](#9-bảng-phân-rã-64-nghiệp-vụ)
10. [Quy Chuẩn Thiết Kế Giao Diện & Mã Nguồn](#10-quy-chuẩn-thiết-kế-giao-diện--mã-nguồn)

---

## 1. GIỚI THIỆU ĐỀ ÁN & TẦM NHÌN

Hệ thống quản lý thiết bị và vật tư tại các trường đại học thường xuyên đối mặt với 4 điểm nghẽn nghiêm trọng:

1. **Thiết bị mất dấu:** Thường xuyên được điều chuyển giữa các phòng trong ngày, gây khó khăn cho việc quản lý. Có thiết bị bị mất dấu nhiều ngày, không ai biết đang ở đâu.
2. **Không phân biệt thiết bị cùng loại:** Ví dụ TV của phòng này với TV của phòng khác — khó truy vết khi đã bị luân chuyển.
3. **Thiếu lịch sử sửa chữa:** Thiết bị đã hỏng gì, đã sửa gì, bảo hành còn bao lâu — không có hồ sơ rõ ràng.
4. **Rủi ro thất thoát:** Thiếu nhật ký kiểm toán bất biến để chứng minh tính minh bạch trước thanh tra.

**Ruo (UEMS)** ra đời như một hệ thống chuyên biệt cho **Phòng Hành chính Đại học**, tích hợp **Định danh QR sub-second**, **Quy trình Luân chuyển có Duyệt**, **Theo dõi Sửa chữa & Bảo hành end-to-end**, **Kiểm kê QR Đối soát** và **Sổ cái Audit Trail SHA-256**.

---

## 2. SƠ ĐỒ KIẾN TRÚC HỆ THỐNG

```
+----------------------------------------------------------------------------------------------------+
|                                    CLIENT TIER (React 19 + Vite)                                    |
|  - Obsidian Dark Command Center & Clean Academic Light Mode (Design Tokens Vanilla CSS)            |
|  - Spatial CAD Canvas 2.5D (Sơ đồ mặt bằng 5 tầng Tòa A1 — overlay thiết bị theo phòng)          |
|  - Equipment Lifecycle Timeline & Repair Tracking Board                                             |
|  - Transfer Approval Queue & Warranty Expiring Dashboard                                            |
|  - Parts Requisition, Preventive Maintenance Calendar & RACI Disposal Flow                          |
|  - In-app Notification Center & Dashboard KPI Cards                                                 |
|  - 100% Native Inline SVG Components (Zero External Icon Library Overhead)                         |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  │ HTTP/RESTful APIs (JWT Bearer Token)
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                                   APPLICATION TIER (Node.js + Express)                              |
|  +─────────────────────────+──────────────────────────+─────────────────────────+                   |
|  |    Security & Access    |     Business Engines     |   Background Workers    |                   |
|  | - Dynamic RBAC Policy   | - Transfer Approval Flow | - Repair Deadline Check |                   |
|  | - JWT Access / Refresh  | - Repair Workflow Engine | - Warranty Expiry Alert |                   |
|  | - Rate Limiter & Helmet | - QR Identifier Service  | - Nodemailer Queue      |                   |
|  | - SHA-256 Audit Chain   | - Lifecycle Aggregator   |                         |                   |
|  |                         | - Parts Inventory Mgmt   |                         |                   |
|  |                         | - RACI Disposal 5-Step   |                         |                   |
|  |                         | - Preventive Maint Svc   |                         |                   |
|  +─────────────────────────+──────────────────────────+─────────────────────────+                   |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  │ Mongoose ODM (Atomic Transactions & Indexes)
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                                 PERSISTENCE TIER (MongoDB Collections)                              |
|  users • roles • rooms • equipments • equipment_transfers • repair_tickets                          |
|  spare_parts • parts_requests • maintenance_plans • disposals                                       |
|  equipment_categories • suppliers • repair_units • inventory_sessions                               |
|  notifications • audit_logs                                                                         |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. 4 TRỤ CỘT KỸ THUẬT NÂNG CAO

### Trụ Cột 1: Định Danh QR & Theo Dõi Vị Trí Thiết Bị
- Mỗi thiết bị có mã QR duy nhất bất biến (`QR-EQ-<timestamp>-<hash>`), dán trên thiết bị thực tế.
- Quét mã QR → tra cứu tức thời: thông tin tài sản, phòng hiện tại, nguyên giá, hạn bảo hành, lịch sử sửa chữa.
- Phân biệt được thiết bị cùng loại kể cả khi đã luân chuyển sang phòng khác.

### Trụ Cột 2: Quy Trình Luân Chuyển & Sửa Chữa Có Kiểm Soát
- **Luân chuyển thiết bị:** Tạo phiếu → Quản lý duyệt → Hoàn tất → Auto cập nhật phòng. Mỗi lần điều chuyển ghi: từ phòng, đến phòng, ngày giờ, người thực hiện, lý do.
- **Sửa chữa:** Báo hỏng → Giao việc → Nhận việc (ghi nơi sửa, người mang đi) → Log chi tiết sửa (vật tư, chi phí, ảnh) → Hoàn tất (người mang về, phòng trả, BH sau sửa).
- **Xuất kho linh kiện:** Khi sửa cần vật tư → Tạo phiếu yêu cầu → Manager duyệt → Trừ tồn kho → Cảnh báo hết hàng.
- **Bảo hành:** Theo dõi hạn bảo hành, cảnh báo sắp hết (30/60/90 ngày), ghi BH mới sau mỗi lần sửa.

### Trụ Cột 3: Vòng Đời Thiết Bị & Báo Cáo Thống Kê
- **Lifecycle Timeline:** Một màn hình tổng hợp toàn bộ quá trình của thiết bị từ lúc nhập về đến khi thanh lý.
- **Bảo trì dự phòng:** Lịch bảo dưỡng định kỳ (tháng/quý/năm), checklist kỹ thuật, tự tạo ticket sửa khi phát hiện hỏng.
- **Thanh lý RACI 5 bước:** Đề xuất (R) → HC duyệt (A) → BGH phê duyệt (A) → Dự trù mua sắm (C) → Nhập kho mới (I).
- **Dashboard KPI:** Tổng TB hoạt động/hỏng/sửa, BH sắp hết, chi phí sửa tích lũy, Equipment Health Score (MTBF).
- **Báo cáo:** Thiết bị theo phòng, theo tình trạng, tần suất hỏng, sắp hết BH, quá hạn sửa. Xuất PDF/Excel chuẩn in ấn.
- **Thông báo:** In-app notification center với badge đỏ + Email HTML tự động (Nodemailer) + Template builder.
- **Deadline Warning:** 3 cấp cảnh báo sửa chữa: ON_TRACK (xanh), AT_RISK (cam), OVERDUE (đỏ).

### Trụ Cột 4: Chuỗi Khối Kiểm Toán Bất Biến SHA-256
- Mọi thao tác trọng yếu (tạo/sửa thiết bị, luân chuyển, sửa chữa, thanh lý) đều được ghi nhật ký kiểm toán SHA-256.
- Khối dữ liệu chứa: `timestamp`, `userId`, `action`, `entity`, `ipAddress`, `dataDiff`, `prevHash`, `sha256Hash`.
- Endpoint đối soát toàn vẹn `GET /api/audit/verify-chain`.

---

## 4. MA TRẬN 3 TÁC NHÂN & TÀI KHOẢN TRÌNH DIỄN

Hệ thống phục vụ riêng cho **Phòng Hành chính** với 3 vai trò. Dưới đây là tài khoản có sẵn sau khi chạy `npm run seed`:

| Họ và Tên | Vai trò (Role) | Email Đăng Nhập | Mã Nhân Viên | Mật Khẩu | Đặc Quyền Chính |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Trần Bảo Hoàng** | **Quản lý Phòng HC** *(Manager)* | `hoang.tb@university.edu.vn` | `QL000001` | `Ruo@2026` | Duyệt phiếu luân chuyển, duyệt sửa chữa, xem báo cáo thống kê, theo dõi deadline & bảo hành |
| **Phạm Văn Hùng** | **Nhân viên Phòng HC** *(Staff)* | `hung.pv@university.edu.vn` | `NV000001` | `Ruo@2026` | Tạo/cập nhật thiết bị, ghi nhận hỏng, tạo phiếu luân chuyển, thực hiện sửa chữa, kiểm kê QR |
| **Ban Quản Trị** | **Quản trị viên** *(Admin)* | `admin@university.edu.vn` | `AD000001` | `Ruo@2026` | Quản trị tài khoản, phân quyền RBAC, danh mục hệ thống, kiểm toán SHA-256 |

> **Ghi chú đăng nhập:**
> - Đăng nhập bằng **Email** hoặc **Mã nhân viên**.
> - Mật khẩu mặc định: **`Ruo@2026`**.
> - **Khóa tạm 15 phút** nếu nhập sai quá 5 lần.

---

## 5. CẤU TRÚC THƯ MỤC DỰ ÁN

```
d:/Ruo/
├── client/                                 # Giao diện React 19 + Vite
│   ├── src/
│   │   ├── components/                     # Components dùng chung
│   │   │   ├── common/                    # FloorPlan2D, Building2DIso, SvgIcons, Logo
│   │   │   ├── layout/                    # AppHeader, Sidebar, DynamicIslandDock
│   │   │   └── ui/                        # EquipmentForm, SLABadge, StatCard, Modals
│   │   ├── context/                       # AuthContext, ToastContext
│   │   ├── mock/                          # campusBuildingData (108 phòng, 5 tầng)
│   │   ├── pages/
│   │   │   ├── auth/                      # LoginPage
│   │   │   ├── dashboard/                 # Dashboard KPI + Sơ đồ CAD
│   │   │   ├── equipments/                # Kho thiết bị, QR Scan, Lifecycle, Batch Import
│   │   │   ├── transfers/                 # Phiếu luân chuyển, Duyệt, Lịch sử
│   │   │   ├── repairs/                   # Phiếu sửa chữa, Timeline, Bảo hành
│   │   │   ├── parts/                     # Kho linh kiện, Phiếu xuất kho
│   │   │   ├── maintenance/               # Bảo trì dự phòng, Lịch bảo dưỡng
│   │   │   ├── disposals/                 # Thanh lý RACI 5 bước
│   │   │   ├── reports/                   # Báo cáo thống kê, Xuất PDF/Excel
│   │   │   ├── incidents/                 # Kanban board sửa chữa
│   │   │   ├── notifications/             # Trung tâm thông báo
│   │   │   └── admin/                     # User Directory, RBAC, Audit, Catalog, Templates
│   │   ├── App.jsx                        # Shell ứng dụng & Điều hướng
│   │   └── main.jsx                       # Điểm khởi động
│   └── vite.config.js                     # Proxy ngược sang Backend (port 5000)
│
├── server/                                 # API Node.js + Express + MongoDB
│   ├── src/
│   │   ├── config/                        # constants.js, db.js
│   │   ├── controllers/                   # auth, facility, equipment, transfer, repair, parts, maint, disposal, audit, notification
│   │   ├── middlewares/                   # JWT Auth, RBAC, Error Handler
│   │   ├── models/                        # User, Room, Equipment, Transfer, Repair, SparePart, MaintPlan, Disposal, AuditLog, Notification...
│   │   ├── routes/                        # RESTful routing
│   │   ├── seeds/                         # seedDatabase.js
│   │   ├── services/                      # slaReactor, deadlineChecker, emailService, notificationService
│   │   └── server.js                      # Entry point
│   └── .env.example                       # Mẫu biến môi trường
│
├── PROJECT_TASKS_MATRIX.md                 # Ma trận 64 nghiệp vụ
├── PROJECT_TASKS_SHEET.tsv                 # TSV import Google Sheets / Excel
├── PROJECT_TASKS_WBS.md                    # Đặc tả WBS 4 Phase
├── PROJECT_TASKS_3COLS.tsv                 # Danh sách 3 cột gọn
└── README.md                               # Tài liệu này
```

---

## 6. ĐẶC TẢ CƠ SỞ DỮ LIỆU MONGODB

| STT | Collection | Chức năng | Chỉ mục trọng yếu |
| :---: | :--- | :--- | :--- |
| **1** | `users` | Tài khoản nhân viên HC & admin | `{ email: 1 }`, `{ employeeCode: 1 }`, `{ role: 1 }` |
| **2** | `roles` | Ma trận vai trò & permissions | `{ name: 1 }` (unique) |
| **3** | `rooms` | Phòng học, tọa độ CAD 2.5D | `{ code: 1 }`, `{ building: 1, floorNumber: 1 }` |
| **4** | `equipments` | Thiết bị, mã QR, khấu hao, bảo hành | `{ assetCode: 1 }`, `{ qrCodeData: 1 }`, `{ room: 1, status: 1 }` |
| **5** | `equipment_categories` | Loại thiết bị (TV, Máy chiếu, Bàn...) | `{ code: 1 }` (unique) |
| **6** | `suppliers` | Nhà cung cấp thiết bị | `{ code: 1 }` (unique) |
| **7** | `repair_units` | Đơn vị sửa chữa bên ngoài | `{ code: 1 }` (unique) |
| **8** | `spare_parts` | Kho linh kiện thay thế (tên, SL, giá, NCC) | `{ code: 1 }`, `{ quantity: 1 }` |
| **9** | `parts_requests` | Phiếu yêu cầu xuất kho linh kiện | `{ repairTicket: 1 }`, `{ status: 1 }` |
| **10** | `equipment_transfers` | Phiếu luân chuyển thiết bị giữa các phòng | `{ equipment: 1 }`, `{ status: 1 }`, `{ fromRoom: 1, toRoom: 1 }` |
| **11** | `repair_tickets` | Phiếu sửa chữa, timeline, vật tư | `{ equipment: 1 }`, `{ status: 1 }`, `{ deadline: 1 }` |
| **12** | `maintenance_plans` | Kế hoạch bảo trì dự phòng (chu kỳ, checklist) | `{ nextDue: 1 }`, `{ targetType: 1 }` |
| **13** | `disposals` | Hồ sơ thanh lý RACI 5 bước | `{ equipment: 1 }`, `{ currentStep: 1 }` |
| **14** | `inventory_sessions` | Đợt kiểm kê chính thức (Draft/InProgress/Completed) | `{ status: 1 }`, `{ createdAt: -1 }` |
| **15** | `notifications` | Thông báo in-app (duyệt, sự cố, BH, deadline) | `{ userId: 1, isRead: 1 }`, `{ createdAt: -1 }` |
| **16** | `audit_logs` | Chuỗi băm kiểm toán SHA-256 | `{ timestamp: -1 }`, `{ sha256Hash: 1 }`, `{ action: 1 }` |

---

## 7. DANH MỤC API ENDPOINTS

### Phân Hệ 1: Xác Thực & Quản Trị (`/api/auth`, `/api/admin`)
- `POST /api/auth/login` — Đăng nhập, cấp JWT
- `POST /api/auth/logout` — Đăng xuất, blacklist token
- `POST /api/auth/forgot-password` — Gửi OTP qua email
- `POST /api/auth/change-password` — Đổi mật khẩu
- `GET /api/auth/me` — Thông tin profile
- `PUT /api/auth/me` — Cập nhật profile
- `GET /api/admin/users` — Danh sách người dùng
- `POST /api/admin/users` — Tạo tài khoản mới
- `PUT /api/admin/users/:id/toggle-status` — Khóa/mở tài khoản
- `GET /api/admin/roles` — Ma trận RBAC
- `PUT /api/admin/roles/:id/permissions` — Cập nhật quyền

### Phân Hệ 2: Phòng & CAD (`/api/facilities`)
- `GET /api/facilities/rooms` — Danh sách phòng
- `GET /api/facilities/rooms/:code` — Chi tiết phòng + thiết bị
- `POST /api/facilities/rooms` — Thêm phòng
- `PUT /api/facilities/rooms/:id` — Sửa phòng
- `PUT /api/facilities/rooms/:id/status` — Đổi trạng thái phòng
- `GET /api/facilities/cad-canvas` — Dữ liệu mặt bằng CAD

### Phân Hệ 3: Thiết Bị & QR (`/api/equipments`)
- `GET /api/equipments` — Danh mục thiết bị
- `POST /api/equipments` — Nhập thiết bị mới
- `GET /api/equipments/:id` — Chi tiết thiết bị
- `PUT /api/equipments/:id` — Cập nhật thiết bị
- `GET /api/equipments/:id/lifecycle` — Timeline vòng đời
- `GET /api/equipments/qr/:qrCode` — Tra cứu QR
- `POST /api/equipments/inventory` — Kiểm kê QR
- `PUT /api/equipments/:id/dispose` — Thanh lý
- `GET /api/equipments/warranty-expiring` — TB sắp hết BH
- `POST /api/equipments/import` — Import hàng loạt từ Excel/CSV
- `POST /api/equipments/import/validate` — Validate import data
- `POST /api/inventory-sessions` — Tạo đợt kiểm kê
- `PUT /api/inventory-sessions/:id/scan` — Quét QR kiểm kê
- `GET /api/inventory-sessions/:id/export` — Xuất biên bản kiểm kê PDF

### Phân Hệ 4: Luân Chuyển (`/api/transfers`)
- `POST /api/transfers` — Tạo phiếu luân chuyển
- `GET /api/transfers` — Danh sách phiếu
- `GET /api/transfers/pending` — Phiếu chờ duyệt
- `GET /api/transfers/equipment/:id` — Lịch sử luân chuyển TB
- `PUT /api/transfers/:id/approve` — Duyệt phiếu
- `PUT /api/transfers/:id/complete` — Hoàn tất luân chuyển

### Phân Hệ 5: Sửa Chữa & Bảo Hành (`/api/repairs`)
- `POST /api/repairs` — Báo hỏng
- `GET /api/repairs` — Danh sách phiếu sửa
- `GET /api/repairs/overdue` — TB quá hạn sửa
- `GET /api/repairs/equipment/:id` — Lịch sử sửa TB
- `PUT /api/repairs/:id/assign` — Giao việc
- `PUT /api/repairs/:id/accept` — Nhận việc
- `PUT /api/repairs/:id/progress` — Cập nhật tiến độ
- `PUT /api/repairs/:id/resolve` — Hoàn tất sửa

### Phân Hệ 5b: Linh Kiện (`/api/parts`, `/api/parts-requests`)
- `GET /api/parts` — Kho linh kiện
- `POST /api/parts` — Thêm linh kiện
- `PUT /api/parts/:id` — Cập nhật linh kiện
- `POST /api/parts-requests` — Yêu cầu xuất kho
- `PUT /api/parts-requests/:id/approve` — Duyệt xuất kho

### Phân Hệ 5c: Bảo Trì Dự Phòng (`/api/maintenance`)
- `GET /api/maintenance/plans` — Lịch bảo dưỡng
- `POST /api/maintenance/plans` — Tạo kế hoạch
- `PUT /api/maintenance/plans/:id/log` — Log kết quả checklist
- `GET /api/facilities/rooms/:code/maint-history` — Lịch sử bảo trì phòng

### Phân Hệ 5d: Thanh Lý RACI (`/api/disposals`)
- `POST /api/disposals` — Đề xuất thanh lý (R)
- `PUT /api/disposals/:id/hc-approve` — HC duyệt (A)
- `PUT /api/disposals/:id/bgh-approve` — BGH phê duyệt (A)
- `POST /api/disposals/:id/procurement` — Dự trù mua sắm (C)
- `PUT /api/disposals/:id/receipt` — Nhập kho mới (I)

### Phân Hệ 6: Báo Cáo & Kiểm Toán (`/api/reports`, `/api/audit`)
- `GET /api/reports/by-room` — TB theo phòng
- `GET /api/reports/by-status` — TB theo trạng thái
- `GET /api/reports/repair-frequency` — Tần suất hỏng
- `GET /api/reports/warranty-expiring` — Sắp hết BH
- `GET /api/reports/overdue-repairs` — Quá hạn sửa
- `GET /api/reports/export` — Xuất PDF/Excel
- `GET /api/dashboard/kpi` — KPI Cards tổng quan
- `GET /api/dashboard/repair-cost` — Chi phí sửa tích lũy
- `GET /api/dashboard/health-score` — Equipment Health Score
- `GET /api/notifications` — Trung tâm thông báo
- `PUT /api/notifications/read` — Đánh dấu đã đọc
- `PUT /api/admin/config/templates/:type` — Template builder
- `GET /api/audit/logs` — Nhật ký kiểm toán
- `GET /api/audit/verify-chain` — Đối soát SHA-256
- `GET /api/audit/export` — Xuất audit log

---

## 8. HƯỚNG DẪN CÀI ĐẶT & CHẠY CỤC BỘ

### 1. Yêu Cầu Môi Trường
- **Node.js**: `>= 18.0.0` (Khuyến nghị LTS v20.x)
- **MongoDB**: `>= 6.0` (Local `mongodb://localhost:27017` hoặc MongoDB Atlas)
- **Trình duyệt**: Chrome, Edge, Firefox, Safari

---

### 2. Khởi Động Backend

```bash
cd d:/Ruo/server
npm install
cp .env.example .env
npm run seed        # Nạp dữ liệu mẫu
npm run dev         # Port 5000
```

> Healthcheck: `http://localhost:5000/api/health`

---

### 3. Khởi Động Frontend

```bash
cd d:/Ruo/client
npm install
npm run dev         # Port 5173
```

> Truy cập: **`http://localhost:5173`**

---

## 9. BẢNG PHÂN RÃ 64 NGHIỆP VỤ

Dự án gồm **87 nghiệp vụ** chia thành 8 phân hệ chính:

| Phân hệ | Phạm vi | Số task |
| :--- | :--- | :---: |
| **PH1: Auth + User + Catalog + RBAC** | Login, Profile, User CRUD, Danh mục, Phân quyền | 18 |
| **PH2: Room & CAD** | CRUD phòng, Sơ đồ mặt bằng 2.5D | 8 |
| **PH3: Equipment & QR** | CRUD TB, Batch Import, Lifecycle, Kiểm kê QR, Thanh lý | 12 |
| **PH4: Transfer** | Tạo → Duyệt → Hoàn tất luân chuyển | 5 |
| **PH5: Repair + Parts + Warranty** | Sửa chữa, Xuất kho linh kiện, BH, Deadline | 17 |
| **PH6: Preventive + RACI Disposal** | Bảo trì dự phòng, Thanh lý 5 bước | 9 |
| **PH7: Dashboard + Reports + Notifs** | KPI, Thống kê, PDF/Excel, Thông báo, Email | 13 |
| **PH8: Audit + Health + Seed** | Kiểm toán SHA-256, Giám sát, Seed | 5 |
| **TỔNG** | | **87** |

Tra cứu chi tiết tại [PROJECT_TASKS_MATRIX.md](file:///d:/Ruo/PROJECT_TASKS_MATRIX.md) và [PROJECT_TASKS_WBS.md](file:///d:/Ruo/PROJECT_TASKS_WBS.md).

---

## 10. QUY CHUẨN THIẾT KẾ GIAO DIỆN & MÃ NGUỒN

### Hệ Thống Design Tokens & Bảng Màu Cao Cấp
- **Obsidian Dark Command Center:** Nền `#080c14`, bề mặt `#0f172a`, viền `rgba(255,255,255,0.08)`, chữ `#f8fafc`.
- **Clean Academic Light Mode:** Nền `#f8fafc`, bề mặt `#ffffff`, viền `#e2e8f0`, chữ `#0f172a`.
- **Màu nhận diện:** Navy (`#0284c7`), Emerald (`#10b981`), Hổ phách (`#f59e0b`), Đỏ (`#ef4444`).

### Nguyên Tắc Kỹ Thuật
1. **100% Native Inline SVG:** Tuyệt đối không cài thư viện icon ngoài.
2. **Full Output Enforcement:** Mọi code viết hoàn chỉnh 100%, không placeholder.
3. **Typography:** Be Vietnam Pro (nội dung) + JetBrains Mono (mã kỹ thuật, mã QR).

---

## GIẤY PHÉP & BẢN QUYỀN

Đề tài Đồ án Tốt nghiệp được nghiên cứu và phát triển bởi **Nhóm Phát Triển Ruo**.  
Bản quyền © 2026. Mọi quyền được bảo lưu.
