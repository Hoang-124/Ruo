# Ruo — Hệ Thống Quản Lý Thiết Bị & Vật Tư Đại Học
> **RUO (University Equipment Management System — UEMS | Version 3.0)**  
> Nền tảng số hóa quản lý vòng đời thiết bị và vật tư cho Phòng Hành chính Đại học: Định danh QR, Theo dõi Vị trí & Luân chuyển, Quy trình Sửa chữa & Bảo hành, Xuất kho Linh kiện, Bảo trì Dự phòng, Thanh lý RACI 5 Bước, Kiểm kê QR Đối soát, Import Hàng loạt, Dashboard KPI, Thông báo & Email, Sổ cái Kiểm Toán SHA-256 bất biến.

---

## MỤC LỤC TỔNG QUAN

1. [Giới Thiệu Đề Án & Tầm Nhìn](#1-giới-thiệu-đề-án--tầm-nhìn)
2. [Sơ Đồ Kiến Trúc Hệ Thống](#2-sơ-đồ-kiến-trúc-hệ-thống)
3. [4 Trụ Cột Kỹ Thuật Nâng Cao](#3-4-trụ-cột-kỹ-thuật-nâng-cao)
4. [Ma Trận 4 Tác Nhân Chính Quy & Tài Khoản Trình Diễn](#4-ma-trận-4-tác-nhân-chính-quy--tài-khoản-trình-diễn)
5. [Cấu Trúc Thư Mục Dự Án](#5-cấu-trúc-thư-mục-dự-án)
6. [Đặc Tả Cơ Sở Dữ Liệu MongoDB](#6-đặc-tả-cơ-sở-dữ-liệu-mongodb)
7. [Danh Mục API Endpoints](#7-danh-mục-api-endpoints)
8. [Hướng Dẫn Cài Đặt & Chạy Cục Bộ](#8-hướng-dẫn-cài-đặt--chạy-cục-bộ)
9. [Bảng Phân Rã 68 Use Cases Theo Tác Nhân](#9-bảng-phân-rã-68-use-cases-theo-tác-nhân-actor_usecasedrawio)
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

## 4. MA TRẬN 4 TÁC NHÂN CHÍNH QUY & TÀI KHOẢN TRÌNH DIỄN

Hệ thống được thiết kế theo chuẩn phân tách nhiệm vụ độc lập (**Separation of Duties** — người làm không tự duyệt việc của mình), gồm 4 vai trò chính quy và 1 vai trò khách:

| Họ và Tên | Vai trò (Role) | Email Đăng Nhập | Mã Định Danh | Mật Khẩu | Đặc Quyền Nghiệp Vụ Chính |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Ban Giám Hiệu / Quản Trị Hệ Thống** | `admin` | `admin@ruo.edu.vn` | `AD001` | `Ruo@2026` | Quản trị người dùng, phân quyền ma trận RBAC động, quản lý danh mục nền (Master Data), phê duyệt thanh lý cuối cùng (Ban hành QĐ-TL), tra cứu sổ cái kiểm toán SHA-256 |
| **Cán Bộ Quản Lý Cơ Sở Vật Chất** | `facility_manager` | `facility_manager@ruo.edu.vn` | `QL001` | `Ruo@2026` | Điều phối sửa chữa (Kanban SLA), giao việc kỹ thuật viên, cấp thiết bị dự phòng từ KHO-01, duyệt linh kiện, ra lệnh điều chuyển, kiểm kê và lập hồ sơ đề xuất thanh lý (R ≥ 60%) |
| **Kỹ Thuật Viên Vận Hành** | `technician` | `technician@ruo.edu.vn` | `KT001` | `Ruo@2026` | Tiếp nhận nhiệm vụ, cập nhật nhật ký sửa chữa, đề xuất lĩnh linh kiện, xác nhận di chuyển thiết bị thực địa, quét QR tra cứu thông số kỹ thuật |
| **Giảng Viên / Cán Bộ Sử Dụng** | `lecturer` | `lecturer@ruo.edu.vn` | `GV001` | `Ruo@2026` | Tra cứu thiết bị phòng học, tạo phiếu báo hỏng sự cố thực địa, theo dõi tiến độ khắc phục SLA và đánh giá chất lượng sửa chữa (1-5 sao) |
| **Khách Vãng Lai** | `guest` | *(Không cần đăng nhập)* | — | — | Đăng nhập tài khoản trường, yêu cầu gửi mã OTP khôi phục mật khẩu |

> **Quy chuẩn bảo mật đăng nhập:**
> - Hỗ trợ đăng nhập linh hoạt bằng **Email trường** hoặc **Mã định danh (MSSV/Mã CB)**.
> - Mật khẩu khởi tạo đồng bộ: **`Ruo@2026`**.
> - **Khóa tạm 15 phút** tự động nếu nhập sai mật khẩu 5 lần liên tiếp.
> - **OTP 6 chữ số** gửi qua email thật (SMTP) với cơ chế chống brute-force và rate-limit 3 lần/giờ.

---

## 5. CẤU TRÚC THƯ MỤC DỰ ÁN

```
d:/Ruo/
├── client/                                 # Giao diện React 19 + Vite (Vanilla CSS Tokens)
│   ├── src/
│   │   ├── components/                     # Components dùng chung
│   │   │   ├── common/                    # FloorPlan2D, SvgIcons, Logo
│   │   │   ├── layout/                    # AppHeader
│   │   │   └── ui/                        # UserProfileModal, CommandPaletteModal, LogoutConfirmModal
│   │   ├── config/                        # navigation.js (Single source of truth cho 4 vai trò & 20 tabs)
│   │   ├── context/                       # AuthContext, ToastContext
│   │   ├── lib/                           # api.js, router.js
│   │   ├── pages/
│   │   │   ├── admin/                     # UserManagementPage, RBACMatrixPage, MasterDataPage, DisposalApprovalPage, AuditLogPage
│   │   │   ├── auth/                      # LoginPage
│   │   │   ├── dashboard/                 # Dashboard tổng quan điều hành & Sơ đồ phòng học 2D
│   │   │   ├── equipments/                # EquipmentsPage (Quản lý thiết bị & QR), DisposalProposePage (Đề xuất thanh lý)
│   │   │   ├── facility/                  # WarehouseStockPage (Kho KHO-01), MovementsPage (Lệnh điều chuyển)
│   │   │   ├── incidents/                 # TicketKanbanPage (Phiếu sửa chữa 6 trạng thái SLA)
│   │   │   ├── inventory/                 # InventoryPage (Kiểm kê CSVC & Quét QR đối soát)
│   │   │   ├── lecturer/                  # ReportIssuePage, LecturerTicketsPage
│   │   │   └── technician/                # TechnicianTasksPage, SparePartsPage, MovementTasksPage, QRScannerPage
│   │   ├── App.jsx                        # Shell ứng dụng & Bộ điều hướng RBAC Guard
│   │   └── main.jsx                       # Entry point
│   └── vite.config.js                     # Cấu hình build & Proxy
│
├── server/                                 # API Node.js + Express + MongoDB
│   ├── src/
│   │   ├── config/                        # constants.js (4 roles, statuses), db.js
│   │   ├── controllers/                   # auth, equipment, movement, repair, sparePart, disposal, inventory, masterData, audit, notification, role, facility
│   │   ├── middlewares/                   # authMiddleware (JWT, RBAC Guard nghiêm ngặt không universal override)
│   │   ├── models/                        # 20 Mongoose Models chuẩn hóa theo dbdiagram.dbml
│   │   ├── routes/                        # RESTful API routing
│   │   ├── seeds/                         # seedDatabase.js (Khởi tạo 4 tài khoản và dữ liệu KHO-01)
│   │   ├── services/                      # emailService, auditService, slaReactor
│   │   ├── tests/                         # backendVerification.js, test_uc37_qr.js, test_login_scenarios.js...
│   │   └── server.js                      # Entry point
│   └── .env.example                       # Biến môi trường
│
├── Actor_UseCase.drawio                   # Sơ đồ 68 Use Cases chi tiết cho 5 Actor
├── DATABASE_SCHEMA.md                     # Đặc tả chi tiết 20 Collections MongoDB
├── dbdiagram.dbml                         # Mô hình dữ liệu DBML chuẩn hóa 20 bảng
└── README.md                               # Tài liệu hướng dẫn này
```

---

## 6. ĐẶC TẢ CƠ SỞ DỮ LIỆU MONGODB (20 COLLECTIONS)

Hệ thống được chuẩn hóa chính xác **20 Collections** chia thành 6 Phân hệ nghiệp vụ theo `dbdiagram.dbml` và `DATABASE_SCHEMA.md`:

| Phân hệ | Collection | Chức năng nghiệp vụ |
| :--- | :--- | :--- |
| **01. Xác Thực & Người Dùng** | `users` | Tài khoản người dùng, mã định danh, vai trò, mật khẩu hash bcrypt |
| | `roles` | Ma trận quyền hạn RBAC động theo 4 vai trò chính quy |
| | `user_sessions` | Phiên đăng nhập RFC-7519 jti, thu hồi phiên an toàn |
| | `password_resets` | Mã OTP khôi phục mật khẩu, hash an toàn, chống brute-force |
| **02. Cơ Sở Vật Chất & Danh Mục** | `rooms` | Danh mục phòng học, hội trường, phòng lab và Kho KHO-01 |
| | `equipment_categories`| Danh mục chủng loại thiết bị và định mức khấu hao |
| | `suppliers` | Danh mục nhà cung cấp trang thiết bị |
| | `repair_units` | Đơn vị cung cấp dịch vụ sửa chữa chuyên trách |
| **03. Thiết Bị & Điều Động** | `equipments` | Hồ sơ thiết bị, mã QR duy nhất, khấu hao (R-ratio), bảo hành |
| | `equipment_movements` | Lệnh luân chuyển thiết bị giữa các phòng học và kho dự phòng |
| | `disposals` | Hồ sơ thanh lý tài sản (Đề xuất FM → Phê duyệt BGH QĐ-TL) |
| **04. Sự Cố & Sửa Chữa** | `repair_tickets` | Phiếu sự cố, mức độ hỏng, giao việc KTV, hạn SLA, đánh giá 1-5 sao |
| | `repair_logs` | Nhật ký từng bước xử lý kỹ thuật của kỹ thuật viên |
| | `spare_parts` | Danh mục linh kiện thay thế, tồn kho tối thiểu |
| | `parts_requests` | Phiếu xin cấp phát linh kiện từ kỹ thuật viên chờ FM duyệt |
| **05. Kiểm Kê CSVC** | `inventory_sessions` | Đợt kiểm kê tài sản chính thức của trường |
| | `inventory_details` | Chi tiết đối soát mã QR thực địa theo từng thiết bị |
| **06. Hệ Thống & Kiểm Toán** | `notifications` | Thông báo sự kiện trong hệ thống (in-app alerts) |
| | `audit_logs` | Sổ cái kiểm toán SHA-256 bất biến (Tamper-evident Blockchain-like) |
| | `system_configs` | Cấu hình tham số hệ thống toàn trường |

---

## 7. DANH MỤC API ENDPOINTS CHÍNH

### Phân Hệ 1: Xác Thực & Quản Trị Hệ Thống (`/api/auth`, `/api/roles`, `/api/audit`)
- `POST /api/auth/login` — Đăng nhập bằng Email hoặc Mã định danh
- `POST /api/auth/logout` — Đăng xuất và thu hồi phiên người dùng
- `POST /api/auth/forgot-password/request` — Yêu cầu gửi OTP khôi phục mật khẩu
- `POST /api/auth/forgot-password/verify` — Xác thực mã OTP 6 số
- `POST /api/auth/forgot-password/reset` — Đặt lại mật khẩu mới
- `GET /api/auth/me` — Xem hồ sơ người dùng
- `PUT /api/auth/me` — Cập nhật thông tin hồ sơ (SĐT, Avatar)
- `POST /api/auth/change-password` — Đổi mật khẩu cá nhân
- `GET /api/auth/users` — Quản lý danh sách người dùng (Admin)
- `POST /api/auth/users` — Tạo tài khoản người dùng mới (Admin)
- `PUT /api/auth/users/:id/role` — Cập nhật vai trò tài khoản (Admin)
- `PUT /api/auth/users/:id/toggle-lock` — Khóa hoặc mở khóa tài khoản (Admin)
- `POST /api/auth/users/:id/reset-password` — Đặt lại mật khẩu mặc định (Admin)
- `GET /api/roles` — Lấy danh sách ma trận phân quyền vai trò (Admin)
- `PUT /api/roles/:roleName/permissions` — Cập nhật ma trận phân quyền (Admin)
- `GET /api/audit/logs` — Tra cứu nhật ký kiểm toán SHA-256 (Admin)
- `GET /api/audit/verify-chain` — Đối soát chuỗi băm mật mã học (Admin)
- `GET /api/audit/export/csv` — Xuất khẩu sổ cái kiểm toán ra file CSV (Admin)

### Phân Hệ 2: Danh Mục & Mặt Bằng CAD (`/api/master-data`, `/api/facilities`)
- `GET /api/master-data/categories` — Danh mục loại thiết bị
- `POST /api/master-data/categories` — Thêm loại thiết bị mới
- `GET /api/master-data/suppliers` — Danh mục nhà cung cấp
- `POST /api/master-data/suppliers` — Thêm nhà cung cấp mới
- `GET /api/master-data/repair-units` — Danh mục đơn vị sửa chữa
- `POST /api/master-data/repair-units` — Thêm đơn vị sửa chữa mới
- `GET /api/master-data/rooms` — Danh mục phòng học & Kho KHO-01
- `POST /api/master-data/rooms` — Thêm phòng học mới
- `GET /api/facilities/cad-canvas` — Mặt bằng CAD số hóa 2D Tòa A1

### Phân Hệ 3: Thiết Bị & Điều Động (`/api/equipments`, `/api/movements`, `/api/disposals`)
- `GET /api/equipments` — Danh sách thiết bị (hỗ trợ phân trang, lọc phòng, lọc trạng thái)
- `POST /api/equipments` — Đăng ký thiết bị mới kèm sinh mã QR
- `GET /api/equipments/:id` — Chi tiết thiết bị & lịch sử bảo hành
- `PUT /api/equipments/:id` — Cập nhật thông tin thiết bị
- `PUT /api/equipments/:id/warranty` — Cập nhật thời hạn bảo hành
- `GET /api/equipments/qr/:qrCode` — Tra cứu nhanh thông số thực địa qua mã QR
- `POST /api/equipments/batch-import` — Import hàng loạt thiết bị từ dữ liệu JSON
- `GET /api/movements` — Danh sách lệnh điều chuyển thiết bị
- `POST /api/movements` — Tạo lệnh điều chuyển thiết bị giữa các phòng (Facility Manager)
- `PUT /api/movements/:id/confirm` — Kỹ thuật viên xác nhận hoàn tất di chuyển thiết bị
- `GET /api/disposals` — Danh sách hồ sơ thanh lý thiết bị
- `POST /api/disposals` — Lập hồ sơ đề xuất thanh lý thiết bị hao mòn R ≥ 60% (Facility Manager)
- `PUT /api/disposals/:id/approve` — Ban Giám Hiệu phê duyệt thanh lý và ban hành QĐ-TL (Admin)
- `PUT /api/disposals/:id/reject` — Ban Giám Hiệu từ chối thanh lý kèm lý do (Admin)

### Phân Hệ 4: Báo Hỏng, Sửa Chữa & Linh Kiện (`/api/repairs`, `/api/spare-parts`)
- `POST /api/repairs` — Giảng viên tạo phiếu báo hỏng thiết bị thực địa
- `GET /api/repairs` — Danh sách phiếu sửa chữa (hỗ trợ lọc theo trạng thái, người phụ trách)
- `GET /api/repairs/:id` — Xem chi tiết phiếu sửa chữa
- `PUT /api/repairs/:id/assign` — Facility Manager giao việc cho KTV và cấp đồ dự phòng
- `PUT /api/repairs/:id/accept` — Kỹ thuật viên tiếp nhận việc sửa chữa
- `POST /api/repairs/:id/logs` — Kỹ thuật viên cập nhật nhật ký khắc phục
- `PUT /api/repairs/:id/outcome` — KTV báo cáo kết quả hoàn thành hoặc không thể sửa
- `PUT /api/repairs/:id/close` — Facility Manager nghiệm thu và đóng phiếu sửa chữa
- `POST /api/repairs/:id/feedback` — Giảng viên đánh giá chất lượng sửa chữa (1-5 sao)
- `GET /api/spare-parts` — Danh mục kho linh kiện vật tư
- `PUT /api/spare-parts/:id/stock` — Cập nhật số lượng tồn kho linh kiện
- `GET /api/spare-parts/requests` — Danh sách yêu cầu cấp phát linh kiện
- `POST /api/spare-parts/requests` — KTV tạo yêu cầu cấp linh kiện cho ca sửa chữa
- `PUT /api/spare-parts/requests/:id/approve` — Facility Manager duyệt xuất kho linh kiện

### Phân Hệ 5: Kiểm Kê Cơ Sở Vật Chất (`/api/inventory-sessions`)
- `GET /api/inventory-sessions` — Danh sách các đợt kiểm kê
- `POST /api/inventory-sessions` — Khởi tạo đợt kiểm kê CSVC mới
- `GET /api/inventory-sessions/:id` — Chi tiết tiến độ kiểm kê
- `POST /api/inventory-sessions/:id/scan` — Quét mã QR thực địa đối soát thiết bị
- `PUT /api/inventory-sessions/:id/reconcile` — Hoàn tất và đối soát đợt kiểm kê

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

### Phân Hệ 6: Báo Cáo & Sổ Cái Kiểm Toán (`/api/reports`, `/api/audit`, `/api/notifications`)
- `GET /api/reports/by-room` — Thống kê thiết bị phân bổ theo phòng
- `GET /api/reports/by-status` — Thống kê tình trạng hoạt động thiết bị
- `GET /api/reports/repair-frequency` — Thống kê tần suất hỏng hóc theo chủng loại
- `GET /api/reports/export/csv` — Xuất khẩu báo cáo dạng file CSV chuẩn
- `GET /api/dashboard/kpi` — Thẻ chỉ số KPI thời gian thực
- `GET /api/dashboard/health-score` — Điểm sức khỏe vận hành thiết bị toàn trường
- `GET /api/notifications` — Danh sách thông báo nội bộ
- `PUT /api/notifications/:id/read` — Đánh dấu thông báo đã đọc
- `GET /api/audit/logs` — Nhật ký kiểm toán SHA-256
- `GET /api/audit/verify-chain` — Đối soát chuỗi băm bất biến
- `GET /api/audit/export/csv` — Xuất sổ cái kiểm toán dạng CSV

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
npm run seed        # Nạp 4 tài khoản chuẩn và dữ liệu kho KHO-01
npm run dev         # Khởi động máy chủ backend tại Port 5000
```

> Kiểm tra trạng thái máy chủ: `http://localhost:5000/api/health`

---

### 3. Khởi Động Frontend

```bash
cd d:/Ruo/client
npm install
npm run build       # Biên dịch và kiểm tra tính toàn vẹn 20 phân hệ
npm run dev         # Khởi động giao diện tại Port 5173
```

> Truy cập ứng dụng: **`http://localhost:5173`**

---

## 9. BẢNG PHÂN RÃ 68 USE CASES THEO TÁC NHÂN (ACTOR_USECASE.DRAWIO)

Hệ thống được thiết kế và mô hình hóa đầy đủ **68 Use Cases** chia theo 5 trang sơ đồ trong `Actor_UseCase.drawio`:

| STT | Tác Nhân (Actor) | Phạm Vi Nghiệp Vụ Chính | Số Use Cases |
| :---: | :--- | :--- | :---: |
| **1** | **Admin (BGH & Quản Trị)** | Quản trị tài khoản, ma trận phân quyền RBAC động, danh mục nền (Master Data), phê duyệt thanh lý cuối cùng (ban hành QĐ-TL), sổ cái kiểm toán SHA-256 | **19 UCs** |
| **2** | **Facility Manager (Quản Lý CSVC)** | Điều phối Kanban SLA, giao việc KTV, xuất kho dự phòng KHO-01, duyệt linh kiện, ra lệnh điều chuyển, kiểm kê thực địa, lập đề xuất thanh lý R ≥ 60% | **18 UCs** |
| **3** | **Technician (Kỹ Thuật Viên)** | Tiếp nhận sửa chữa, ghi nhật ký khắc phục, xin linh kiện thay thế, xác nhận điều chuyển thiết bị, quét mã QR thực địa | **12 UCs** |
| **4** | **Lecturer (Giảng Viên / Cán Bộ)** | Tra cứu thiết bị phòng học, tạo phiếu báo hỏng sự cố, theo dõi tiến độ SLA, đánh giá nghiệm thu 1-5 sao | **11 UCs** |
| **5** | **Guest (Khách Vãng Lai)** | Đăng nhập tài khoản trường (Email/Mã số), gửi OTP qua email thật (SMTP), đặt lại mật khẩu với rate-limiting | **8 UCs** |
| **TỔNG** | | **68 Use Cases hoàn chỉnh** | **68 UCs** |

Tra cứu chi tiết sơ đồ tại file [Actor_UseCase.drawio](file:///d:/Ruo/Actor_UseCase.drawio) và đặc tả cơ sở dữ liệu tại [DATABASE_SCHEMA.md](file:///d:/Ruo/DATABASE_SCHEMA.md).

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
