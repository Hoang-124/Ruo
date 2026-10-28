# Ruo — Hệ Thống Quản Lý Thiết Bị & Vật Tư Đại Học (UEMS)

> **RUO (University Equipment Management System — UEMS | Version 4.0)**  
> Nền tảng số hóa quản lý toàn diện vòng đời thiết bị và cơ sở vật chất đại học: **Sơ đồ mặt bằng CAD 2D 5 tầng (Tòa A1)**, **Định danh & Kiểm kê QR**, **Luân chuyển có phê duyệt**, **Điều phối sửa chữa SLA & Bảo hành**, **Quản lý kho linh kiện**, **Thanh lý RACI 5 bước**, **Ma trận phân quyền RBAC động** và **Sổ cái kiểm toán chuỗi băm SHA-256 bất biến**.

---

## MỤC LỤC TỔNG QUAN

1. [Giới Thiệu Đề Án & Giải Pháp Cốt Lõi](#1-giới-thiệu-đề-án--giải-pháp-cốt-lõi)
2. [Kiến Trúc Hệ Thống & Công Nghệ Sử Dụng](#2-kiến-trúc-hệ-thống--công-nghệ-sử-dụng)
3. [Ma Trận 4 Vai Trò Chính Quy & Tài Khoản Demo](#3-ma-trận-4-vai-trò-chính-quy--tài-khoản-demo)
4. [Ma Trận 87 Nghiệp Vụ & Phân Bổ Nhân Sự (Master Task Matrix)](#4-ma-trận-87-nghiệp-vụ--phân-bổ-nhân-sự-master-task-matrix)
5. [Cấu Trúc Thư Mục Dự Án](#5-cấu-trúc-thư-mục-dự-án)
6. [Đặc Tả Cơ Sở Dữ Liệu MongoDB](#6-đặc-tả-cơ-sở-dữ-liệu-mongodb)
7. [Danh Mục RESTful API Endpoints](#7-danh-mục-restful-api-endpoints)
8. [Hướng Dẫn Cài Đặt, Khởi Chạy & Kiểm Thử](#8-hướng-dẫn-cài-đặt-khởi-chạy--kiểm-thử)
9. [Quy Chuẩn Thiết Kế Giao Diện & Mã Nguồn](#9-quy-chuẩn-thiết-kế-giao-diện--mã-nguồn)

---

## 1. GIỚI THIỆU ĐỀ ÁN & GIẢI PHÁP CỐT LÕI

Công tác quản lý thiết bị và vật tư tại trường đại học thường đối mặt với 4 điểm nghẽn lớn:
1. **Thiết bị thất lạc vị trí:** Thiết bị thường xuyên được điều chuyển giữa các phòng học và kho dự phòng mà không có biên bản điện tử đồng bộ.
2. **Khó phân biệt tài sản cùng chủng loại:** Các thiết bị giống nhau (máy chiếu, điều hòa, PC phòng máy) không có định danh riêng lẻ gắn liền với hồ sơ gốc.
3. **Đứt gãy lịch sử vòng đời:** Thiếu sự liên kết giữa ngày mua, hạn bảo hành, lịch sử sửa chữa, linh kiện thay thế và tỷ lệ hao mòn ($R$-ratio) để làm căn cứ thanh lý.
4. **Rủi ro phân quyền & kiểm toán:** Thiếu cơ chế phân quyền động theo thời gian thực và nhật ký kiểm toán chống chỉnh sửa phục vụ công tác thanh tra.

### 4 Trụ Cột Kỹ Thuật Của Ruo (UEMS)
- **Trụ cột 1 — Không gian CAD 2D & Định danh QR (`Spatial CAD & QR Identity`):** Trực quan hóa mặt bằng 5 tầng Tòa nhà A1 (`P101` – `P508`) ngay trên trang chủ; mỗi thiết bị sở hữu mã `QR-EQ-*` duy nhất để quét tra cứu dưới 1 giây.
- **Trụ cột 2 — Luân chuyển, Sửa chữa SLA & Linh kiện (`Controlled Operations`):** Quy trình điều chuyển 3 bước (Tạo phiếu → Quản lý duyệt → KTV bàn giao), điều phối sửa chữa gắn đồng hồ đếm ngược SLA (`ON_TRACK` / `AT_RISK` / `OVERDUE`) và duyệt xuất kho linh kiện tự động trừ tồn.
- **Trụ cột 3 — Vòng đời Tài sản, Kiểm kê QR & Thanh lý RACI 5 bước (`Asset Lifecycle & RACI`):** Theo dõi trọn vẹn dòng đời (Tiếp nhận → Phân bổ → Sửa chữa → Bảo dưỡng → Thanh lý), tự động tính chỉ số hao mòn $R = \frac{\text{Chi phí sửa lũy kế}}{\text{Nguyên giá}}$ (đề xuất thanh lý khi $R \ge 60\%$).
- **Trụ cột 4 — Live RBAC Policy & Chuỗi khối Kiểm toán SHA-256 (`Security & Audit Chain`):** Ma trận quyền hạn động áp dụng tức thời mà không cần khởi động lại máy chủ; mọi biến động dữ liệu đều được nối chuỗi băm mật mã học (`prev_hash` → `hash`).

---

## 2. KIẾN TRÚC HỆ THỐNG & CÔNG NGHỆ SỬ DỤNG

```
+----------------------------------------------------------------------------------------------------+
|                                    CLIENT TIER (React 19 + Vite)                                    |
|  - Design System: Obsidian Dark & Clean Academic Light Mode (Vanilla CSS Tokens)                   |
|  - Spatial CAD 2D: FloorPlan2D & RoomPodCard (Sơ đồ mặt bằng 5 tầng Tòa A1 tương tác trực tiếp)    |
|  - Modules: Equipment Lifecycle, QR Stocktaking, Transfer Queue, SLA Repair Kanban, RBAC Matrix    |
|  - Strict Native Inline SVG Architecture (100% SVG thuần, không phụ thuộc thư viện icon ngoài)     |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  │ RESTful API (JWT Access + Refresh Token)
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                                   APPLICATION TIER (Node.js + Express)                              |
|  +─────────────────────────+──────────────────────────+─────────────────────────+                   |
|  |    Security & Access    |     Business Engines     |   Services & Workers    |                   |
|  | - Dynamic RBAC Guard    | - Facility Domain Rules  | - SLA Deadline Reactor  |                   |
|  | - Brute-force Lockout   | - QR & Batch Validator   | - Warranty Expiry Alert |                   |
|  | - Session Revocation    | - Transfer & Repair Flow | - Nodemailer OTP/Alert  |                   |
|  | - SHA-256 Audit Chain   | - RACI 5-Step Disposal   | - CSV/PDF Report Engine |                   |
|  +─────────────────────────+──────────────────────────+─────────────────────────+                   |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  │ Mongoose ODM (Indexes & Validation)
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                                 PERSISTENCE TIER (MongoDB Collections)                              |
|  users • roles • refresh_tokens • password_resets • departments • rooms • categories               |
|  suppliers • repair_units • equipments • equipment_movements • import_sessions                     |
|  repairs • repair_logs • spare_parts • parts_requests • preventive_maintenances                    |
|  inventory_sessions • inventory_logs • disposals • notifications • audit_logs                      |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. MA TRẬN 4 VAI TRÒ CHÍNH QUY & TÀI KHOẢN DEMO

Hệ thống tuân thủ nguyên tắc **Phân tách nhiệm vụ (Separation of Duties — SoD)** gồm 4 vai trò chính quy và luồng tự đăng ký có kiểm duyệt (`UC-1.0` & `UC-10.7`):

| Họ và Tên | Vai Trò (`role`) | Email Đăng Nhập | Mã Cán Bộ | Mật Khẩu | Phạm Vi Nghiệp Vụ Trọng Tâm |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Ban Giám Hiệu / Quản Trị Hệ Thống** | `admin` | `admin@ruo.edu.vn` | `AD001` | `Ruo@2026` | Quản trị người dùng, phê duyệt bổ nhiệm vai trò đặc quyền, cấu hình ma trận RBAC động, quản lý phòng học & Master Data, ký duyệt thanh lý BGH (`QĐ-TL`), đối soát sổ cái SHA-256 |
| **Cán Bộ Quản Lý Cơ Sở Vật Chất** | `facility_manager` | `manager@ruo.edu.vn` | `QL001` | `Ruo@2026` | Quản lý danh mục & nhập lô thiết bị, duyệt điều chuyển phòng, điều phối phiếu sửa chữa SLA, duyệt xuất kho linh kiện, lập đợt kiểm kê QR, thẩm định thanh lý HC |
| **Kỹ Thuật Viên Vận Hành** | `technician` | `technician@ruo.edu.vn` | `KT001` | `Ruo@2026` | Tiếp nhận & xử lý ca sửa chữa, ghi nhật ký kỹ thuật, lập phiếu lĩnh linh kiện, xác nhận bàn giao điều chuyển thực địa, quét QR kiểm kê & đề xuất thanh lý |
| **Giảng Viên / Cán Bộ Sử Dụng** | `lecturer` | `lecturer@ruo.edu.vn` | `GV001` | `Ruo@2026` | Tra cứu sơ đồ CAD 5 tầng & thiết bị phòng học, quét QR tra cứu nhanh, gửi phiếu báo hỏng tại phòng, theo dõi tiến độ xử lý SLA và đánh giá nghiệm thu |

> **Chính sách bảo mật xác thực:**
> - Đăng nhập bằng **Email** hoặc **Mã cán bộ** (`AD001`, `QL001`, `KT001`, `GV001`).
> - Tự đăng ký (`UC-1.0`): Tài khoản **Giảng viên** được kích hoạt ngay; tài khoản đăng ký vai trò **Kỹ thuật viên** hoặc **Quản lý CSVC** tự động vào trạng thái `pending_approval` chờ Admin phê duyệt bổ nhiệm (`UC-10.7`).
> - Khóa bảo vệ tự động **15 phút** khi đăng nhập sai mật khẩu 5 lần liên tiếp (`UC-1.1`).

---

## 4. MA TRẬN 87 NGHIỆP VỤ & PHÂN BỔ NHÂN SỰ (MASTER TASK MATRIX)

Dự án được quy hoạch gồm **87 nghiệp vụ** (`Must: 62 | Should: 25`) chia thành **4 Phase (13 Epics)** và phân bổ đều cho **5 thành viên**:

| Thành Viên | Số Nghiệp Vụ | Phân Hệ Phụ Trách Chính |
| :--- | :---: | :--- |
| **Hoàng** | **17** | System Bootstrap (Seed Data), Ma trận phân quyền động RBAC (`UC-12.1` – `UC-12.2`), Vòng đời Thiết bị, Import hàng loạt & Kiểm kê QR (`UC-3.1` – `UC-3.11`, QR Lookup), Kiểm toán chuỗi băm SHA-256 (`UC-13.1` – `UC-13.2`) |
| **Uyên** | **18** | Xác thực & Hồ sơ cá nhân (`UC-1.0` – `UC-1.6`), Quản trị người dùng & Phê duyệt bổ nhiệm (`UC-10.1` – `UC-10.7`), Trung tâm thông báo & Email tự động (`UC-9.1` – `UC-9.4`) |
| **Tùng** | **17** | Quản lý Phòng học & Trạng thái (`UC-2.1` – `UC-2.6`), Mặt bằng Spatial CAD 2D 5 tầng (`UC-2.7` & CAD Dashboard), Dashboard KPI & Hệ thống Báo cáo Thống kê (`UC-8.1` – `UC-8.9`) |
| **Nguyên** | **17** | Báo hỏng, Điều phối & Nhật ký Sửa chữa (`UC-5.1` – `UC-5.9`), Yêu cầu & Kho Linh kiện (`UC-5.10` – `UC-5.12`), Theo dõi Bảo hành (`UC-6.1` – `UC-6.3`), Cảnh báo tiến độ SLA (`UC-7.1` – `UC-7.2`) |
| **Quang** | **18** | Danh mục nền Master Data (`UC-11.1` – `UC-11.4`), Quy trình Điều chuyển Thiết bị (`UC-4.1` – `UC-4.5`), Bảo trì Dự phòng (`UC-7.3` – `UC-7.6`), Thanh lý RACI 5 bước (`UC-7.7` – `UC-7.11`) |
| **TỔNG CỘNG** | **87** | **100% Nghiệp vụ chuẩn hóa theo đặc tả UEMS** |

### Bảng Tổng Hợp 13 Epics Theo Phase Triển Khai

| Phase | Epic | Mã Use Case | Mô Tả Nghiệp Vụ Trọng Tâm | Phụ Trách | Số Lượng |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **Phase 0** | **System Bootstrap** | `Seed Initializer` | Khởi tạo 4 tài khoản mẫu, Tòa A1 5 tầng, các phòng học CAD, kho thiết bị QR, NCC, linh kiện | Hoàng | 1 |
| **Phase 1** | **Authentication** | `UC-1.0` → `UC-1.6` | Tự đăng ký & chờ duyệt vai trò, Đăng nhập/Đăng xuất, Quên mật khẩu OTP, Đổi mật khẩu, Xem/Cập nhật hồ sơ | Uyên | 7 |
| **Phase 1** | **Room & Facility** | `UC-2.1` → `UC-2.6` | Tạo phòng (`P101`–`P508`), Danh sách & Chi tiết phòng kèm thiết bị, Cập nhật thông số, Ngừng hoạt động & Đổi trạng thái phòng | Tùng | 6 |
| **Phase 1** | **Spatial CAD** | `UC-2.7` + `CAD Map` | Thẻ `RoomPodCard` inline SVG và sơ đồ mặt bằng CAD 5 tầng tương tác ngay trên trang chủ cho cả 4 vai trò | Tùng | 2 |
| **Phase 1** | **User Management** | `UC-10.1` → `UC-10.7` | Tạo tài khoản, Danh bạ phân tab realtime, Chi tiết hoạt động, Đổi role thu hồi phiên, Khóa/Mở khóa, Cấp lại mật khẩu, Duyệt bổ nhiệm | Uyên | 7 |
| **Phase 1** | **Master Catalog** | `UC-11.1` → `UC-11.4` | Quản lý danh mục Chủng loại thiết bị, Cấu trúc tòa nhà/tầng, Nhà cung cấp, Đơn vị sửa chữa | Quang | 4 |
| **Phase 1** | **Dynamic RBAC** | `UC-12.1` → `UC-12.2` | Ma trận phân quyền 4 vai trò, bật/tắt quyền theo module với hiệu lực tức thời (Live Policy) & chống tự khóa Admin | Hoàng | 2 |
| **Phase 2** | **Equipment & QR Audit** | `UC-3.1` → `UC-3.11` + `QR` | Thêm/Sửa/Tra cứu đa chiều tài sản, Timeline vòng đời, Import/Validate hàng loạt, Đợt kiểm kê QR đối soát & Xuất biên bản | Hoàng | 12 |
| **Phase 3** | **Equipment Transfer** | `UC-4.1` → `UC-4.5` | Tạo lệnh điều chuyển, Quản lý phê duyệt/từ chối, KTV xác nhận hoàn tất cập nhật phòng, Lịch sử & Hàng đợi điều chuyển | Quang | 5 |
| **Phase 3** | **Repair & Spare Parts** | `UC-5.1` → `UC-5.12` | Báo hỏng, Giao việc SLA, KTV nhận việc, Ghi log sửa chữa, Nghiệm thu, Lịch sử sửa, Cảnh báo quá hạn, Xin lĩnh & Duyệt xuất linh kiện | Nguyên | 12 |
| **Phase 3** | **Warranty & SLA** | `UC-6.1` → `UC-7.2` | Huy hiệu bảo hành, Cảnh báo sắp hết BH (30/60/90 ngày), Gia hạn BH sau sửa, Đồng hồ đếm ngược & Phân loại rủi ro SLA | Nguyên | 5 |
| **Phase 3** | **Preventive & RACI Disposal** | `UC-7.3` → `UC-7.11` | Lịch & Kế hoạch bảo dưỡng định kỳ, Checklist bảo trì, Lịch sử phòng; Quy trình thanh lý RACI 5 bước ($R \ge 60\%$) | Quang | 9 |
| **Phase 4** | **Dashboard & Reports** | `UC-8.1` → `UC-8.9` | Thẻ KPI tổng quan, Xu hướng chi phí sửa, Chỉ số sức khỏe MTBF, Báo cáo theo phòng/trạng thái/tần suất hỏng/bảo hành/SLA, Xuất CSV/PDF | Tùng | 9 |
| **Phase 4** | **Notifications & Email** | `UC-9.1` → `UC-9.4` | Trung tâm thông báo realtime, Đánh dấu đã đọc, Gửi email tự động Nodemailer, Quản lý mẫu template email | Uyên | 4 |
| **Phase 4** | **Immutable Audit** | `UC-13.1` → `UC-13.2` | Sổ cái kiểm toán chuỗi băm SHA-256 bất biến và thuật toán kiểm tra toàn vẹn từ khối Genesis | Hoàng | 2 |

---

## 5. CẤU TRÚC THƯ MỤC DỰ ÁN

```
d:/Ruo/
├── client/                                   # Giao diện người dùng (React 19 + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/                        # Modals & Drawers quản trị (UserDetail, RoleChange, Lock, ResetPwd, RoleApproval)
│   │   │   ├── auth/                         # MandatoryPasswordChangeModal
│   │   │   ├── common/                       # SvgIcons, Logo, RepairStepper, EquipmentLifecycleModal, EquipmentQrModal
│   │   │   ├── layout/                       # AppHeader (Thanh điều hướng, Thông báo, Hồ sơ)
│   │   │   ├── rooms/                        # RoomDetailModal
│   │   │   ├── spatial/                      # FloorPlan2D, RoomPodCard (Mặt bằng CAD 2D Tòa A1)
│   │   │   └── ui/                           # UserProfileModal, CommandPaletteModal, LogoutConfirmModal
│   │   ├── config/                           # navigation.js (Cấu hình điều hướng & phân quyền hiển thị theo 4 vai trò)
│   │   ├── context/                          # AuthContext, ToastContext
│   │   ├── lib/                              # api.js (HTTP client chuẩn hóa), router.js
│   │   ├── pages/
│   │   │   ├── admin/                        # UserManagementPage, RBACMatrixPage, MasterDataPage, DisposalApprovalPage, AuditLogPage
│   │   │   ├── auth/                         # LoginPage (Đăng nhập, Tự đăng ký, Quên mật khẩu OTP)
│   │   │   ├── dashboard/                    # Dashboard điều hành & tích hợp mặt bằng CAD 5 tầng
│   │   │   ├── equipments/                   # EquipmentsPage (Danh mục, Bộ lọc, Import lô, Vòng đời), DisposalProposePage
│   │   │   ├── facility/                     # WarehouseStockPage, MovementsPage
│   │   │   ├── incidents/                    # TicketKanbanPage (Điều phối sự cố & SLA)
│   │   │   ├── inventory/                    # InventoryPage (Đợt kiểm kê & Quét QR đối soát)
│   │   │   ├── lecturer/                     # ReportIssuePage, LecturerTicketsPage
│   │   │   ├── rooms/                        # RoomListPage, RoomFormModal, RoomStatusModal, RoomDeactivateModal, EquipmentTransferModal
│   │   │   ├── technician/                   # TechnicianTasksPage, SparePartsPage, MovementTasksPage, QRScannerPage
│   │   │   └── transfers/                    # TransferHistoryPage
│   │   ├── App.jsx                           # App Shell & Route Guards
│   │   └── main.jsx                          # Entry point
│   └── vite.config.js                        # Cấu hình Vite & API Proxy
│
├── server/                                   # Máy chủ API (Node.js + Express + Mongoose)
│   ├── src/
│   │   ├── config/                           # constants.js, db.js
│   │   ├── controllers/                      # 14 Controllers xử lý nghiệp vụ
│   │   ├── domain/facility/                  # Pure domain rules & validators cho Phòng học & Mặt bằng CAD
│   │   ├── middlewares/                      # authMiddleware (JWT, optionalProtect, Live RBAC), errorMiddleware, securityMiddleware
│   │   ├── models/                           # 21 Mongoose Models
│   │   ├── routes/                           # 15 tệp định tuyến RESTful API
│   │   ├── seeds/                            # seedDatabase.js, seedTransferDemo.js
│   │   ├── services/                         # auditService, emailService, slaReactor
│   │   ├── tests/                            # Bộ kịch bản kiểm thử tích hợp theo từng Use Case (UC-1, UC-3, UC-10, UC-12...)
│   │   └── server.js                         # Khởi tạo HTTP Server & Graceful Shutdown
│   └── test/                                 # Bộ Unit Tests (61 test cases cho domain/facility)
│
├── DATABASE_SCHEMA.md                        # Đặc tả chi tiết Schema cơ sở dữ liệu
├── dbdiagram.dbml                            # Sơ đồ quan hệ dữ liệu DBML
├── package.json                              # Scripts điều phối chạy đồng thời (Concurrently)
└── README.md                                 # Tài liệu hướng dẫn dự án
```

---

## 6. ĐẶC TẢ CƠ SỞ DỮ LIỆU MONGODB

Hệ thống bao gồm **21 Mongoose Models** tại `server/src/models/`, phân tách rõ ràng theo 6 miền dữ liệu:

| Phân Hệ Dữ Liệu | Model / Collection | Vai Trò Lưu Trữ Chính |
| :--- | :--- | :--- |
| **1. Định Danh & Phân Quyền** | `User` (`users`) | Hồ sơ cán bộ/giảng viên, vai trò, trạng thái (`active`, `pending_approval`, `locked`), điểm tín nhiệm |
| | `Role` (`roles`) | Ma trận quyền hạn động (`permissions[]`) cho 4 vai trò |
| | `RefreshToken` (`refresh_tokens`) | Quản lý phiên đăng nhập và thu hồi token trên từng thiết bị |
| | `PasswordReset` (`password_resets`) | Lưu trữ mã OTP 6 chữ số có thời hạn (TTL 15 phút) và bộ đếm chống vét cạn |
| **2. Phòng Học & Danh Mục Nền** | `Room` (`rooms`) | Phòng học Tòa A1 (`P101`–`P508`), tầng (`1`–`5`), sức chứa, tọa độ CAD, trạng thái phòng |
| | `Department` (`departments`) | Danh mục khoa, phòng ban chức năng |
| | `Category` (`categories`) | Chủng loại thiết bị, tiền tố mã tài sản, định mức khấu hao |
| | `Supplier` (`suppliers`) | Nhà cung cấp thiết bị và đầu mối bảo hành |
| | `RepairUnit` (`repair_units`) | Đơn vị đối tác bảo dưỡng và sửa chữa chuyên môn |
| **3. Thiết Bị & Luân Chuyển** | `Equipment` (`equipments`) | Hồ sơ tài sản, mã `qr_code`, serial, nguyên giá, hạn bảo hành, tỷ lệ hao mòn, vị trí phòng |
| | `EquipmentMovement` (`equipment_movements`) | Nhật ký và quy trình phê duyệt điều chuyển thiết bị (`PENDING` → `APPROVED` → `COMPLETED`) |
| | `ImportSession` (`import_sessions`) | Phiên kiểm tra và nhập hàng loạt thiết bị từ Excel/CSV |
| **4. Sửa Chữa, Linh Kiện & Bảo Trì** | `Repair` (`repairs`) | Phiếu báo hỏng, mức độ ưu tiên, KTV phụ trách, hạn SLA, chi phí và đánh giá nghiệm thu |
| | `RepairLog` (`repair_logs`) | Nhật ký chi tiết từng bước khắc phục kỹ thuật |
| | `SparePart` (`spare_parts`) | Danh mục vật tư, linh kiện thay thế và ngưỡng cảnh báo tồn kho tối thiểu |
| | `PartsRequest` (`parts_requests`) | Phiếu yêu cầu xuất kho linh kiện gắn với phiếu sửa chữa |
| | `PreventiveMaintenance` (`preventive_maintenances`) | Kế hoạch và biên bản checklist bảo dưỡng định kỳ |
| **5. Kiểm Kê & Thanh Lý** | `InventorySession` (`inventory_sessions`) | Đợt kiểm kê tài sản theo tầng hoặc phạm vi phòng học |
| | `InventoryLog` (`inventory_logs`) | Kết quả quét QR đối soát từng thiết bị (`MATCHED`, `MISSING`, `DAMAGED`, `MISPLACED`) |
| | `Disposal` (`disposals`) | Hồ sơ thanh lý tài sản theo quy trình RACI 5 bước và số quyết định `QĐ-TL` |
| **6. Thông Báo & Kiểm Toán** | `Notification` (`notifications`) | Thông báo nội bộ theo người nhận và trạng thái đã đọc |
| | `AuditLog` (`audit_logs`) | Sổ cái kiểm toán bất biến liên kết chuỗi băm SHA-256 (`prev_hash`, `hash`) |

---

## 7. DANH MỤC RESTFUL API ENDPOINTS

### 7.1. Xác Thực, Người Dùng & Phân Quyền RBAC (`/api/auth`, `/api/admin`, `/api/roles`)
- `POST /api/auth/register` — Tự đăng ký tài khoản & khởi tạo yêu cầu duyệt vai trò (`UC-1.0`)
- `POST /api/auth/login` — Đăng nhập bằng Email hoặc Mã cán bộ (`UC-1.1`)
- `POST /api/auth/logout` — Đăng xuất và thu hồi Refresh Token (`UC-1.2`)
- `POST /api/auth/forgot-password/request` | `/verify` | `/reset` — Khôi phục mật khẩu qua OTP Email (`UC-1.3`)
- `POST /api/auth/change-password` — Đổi mật khẩu cá nhân (`UC-1.4`)
- `GET /api/auth/me` & `PUT /api/auth/me` — Xem và cập nhật hồ sơ cá nhân (`UC-1.5`, `UC-1.6`)
- `GET /api/auth/users` & `POST /api/auth/users` — Danh bạ và tạo mới người dùng (`UC-10.1`, `UC-10.2`)
- `GET /api/auth/users/:id` — Chi tiết hồ sơ và lịch sử hoạt động (`UC-10.3`)
- `PATCH /api/auth/users/:id/role` — Thay đổi vai trò trực tiếp & thu hồi phiên (`UC-10.4`)
- `PATCH /api/auth/users/:id/lock` — Khóa / Mở khóa tài khoản (`UC-10.5`)
- `POST /api/auth/users/:id/reset-password` — Cấp mật khẩu tạm thời bắt buộc đổi (`UC-10.6`)
- `POST /api/auth/users/:id/approve` — Phê duyệt hoặc từ chối bổ nhiệm vai trò đặc quyền (`UC-10.7`)
- `GET /api/roles` & `PUT /api/roles/:id/permissions` — Tra cứu & cập nhật ma trận quyền hạn RBAC động (`UC-12.1`, `UC-12.2`)

### 7.2. Phòng Học, Mặt Bằng CAD & Danh Mục Nền (`/api/facilities`, `/api/master-data`, `/api/admin`)
- `GET /api/facilities/cad-canvas` — Dữ liệu mặt bằng CAD 2D 5 tầng Tòa A1 kèm thống kê thiết bị theo phòng (`UC-2.7`)
- `GET /api/facilities/rooms` & `POST /api/facilities/rooms` — Tra cứu và thêm phòng học mới (`UC-2.1`, `UC-2.2`)
- `GET /api/facilities/rooms/:code` — Chi tiết phòng học, danh sách thiết bị & lịch sử điều chuyển/sửa chữa (`UC-2.3`)
- `PUT /api/facilities/rooms/:id` — Cập nhật thông số phòng học (`UC-2.4`)
- `PUT /api/facilities/rooms/:id/deactivate` — Ngừng hoạt động phòng học có kiểm tra ràng buộc thiết bị (`UC-2.5`)
- `PUT /api/facilities/rooms/:id/status` — Chuyển đổi trạng thái phòng (`AVAILABLE` / `MAINTENANCE` / `INACTIVE`) (`UC-2.6`)
- `CRUD /api/admin/categories` | `/buildings` | `/suppliers` | `/repair-units` — Quản trị danh mục nền Master Data (`UC-11.1` – `UC-11.4`)

### 7.3. Thiết Bị, Vòng Đời, Import Hàng Loạt & Kiểm Kê QR (`/api/equipments`, `/api/inventory-sessions`)
- `GET /api/equipments` & `POST /api/equipments` — Tra cứu đa chiều (phân trang, lọc tầng/phòng/tầm giá/bảo hành) và tạo mới thiết bị (`UC-3.1`, `UC-3.2`)
- `GET /api/equipments/:id` & `PUT /api/equipments/:id` — Chi tiết thông số và cập nhật thiết bị kèm tự động ghi vết điều chuyển (`UC-3.3`, `UC-3.4`)
- `GET /api/equipments/:id/lifecycle` — Dòng thời gian (Lifecycle Timeline) tổng hợp 5 giai đoạn của thiết bị (`UC-3.5`)
- `POST /api/equipments/import/validate` & `POST /api/equipments/import` — Kiểm tra lỗi từng dòng và nhập hàng loạt thiết bị (`UC-3.6`, `UC-3.7`)
- `PUT /api/equipments/:id/dispose` — Ghi nhận quyết định thanh lý trực tiếp trên tài sản (`UC-3.8`)
- `GET /api/equipments/qr/:qrCode` — Quét và tra cứu nhanh thiết bị qua mã QR (`QR Lookup`)
- `GET /api/inventory-sessions` & `POST /api/inventory-sessions` — Quản lý và khởi tạo đợt kiểm kê (`UC-3.9`)
- `POST /api/inventory-sessions/:id/scan` & `PUT /api/inventory-sessions/:id/reconcile` — Quét QR đối soát thực địa và chốt biên bản kiểm kê (`UC-3.10`, `UC-3.11`)

### 7.4. Luân Chuyển Thiết Bị & Thanh Lý RACI (`/api/transfers`, `/api/disposals`)
- `GET /api/transfers` & `POST /api/transfers` — Danh sách và tạo phiếu yêu cầu điều chuyển (`UC-4.1`)
- `GET /api/transfers/pending` — Hàng đợi phiếu điều chuyển chờ Quản lý CSVC duyệt (`UC-4.5`)
- `PUT /api/transfers/:id/approve` & `PUT /api/transfers/:id/reject` — Phê duyệt hoặc từ chối điều chuyển (`UC-4.2`)
- `PUT /api/transfers/:id/complete` — Kỹ thuật viên xác nhận hoàn tất bàn giao phòng đích (`UC-4.3`)
- `GET /api/transfers/equipment/:id` — Lịch sử điều chuyển của từng thiết bị (`UC-4.4`)
- `GET /api/disposals` & `POST /api/disposals` — Tra cứu hồ sơ và KTV đề xuất thanh lý khi chi phí sửa chữa lũy kế / nguyên giá đạt ít nhất 60% ($R \ge 60\%$), hoặc có phiếu kết luận không thể sửa (`UC-7.7`)
- `PUT /api/disposals/:id/hc-approve` / `hc-reject` — Quản lý CSVC thẩm định hoặc từ chối hồ sơ (`UC-7.8`)
- `PUT /api/disposals/:id/bgh-approve` — Admin/BGH ký quyết định, chỉ sau khi CSVC thẩm định (`UC-7.9`)
- `PUT /api/disposals/:id/procurement` — Quản lý lập ngân sách và kế hoạch thiết bị thay thế (`UC-7.10`)
- `PUT /api/disposals/:id/receipt` — KTV ghi nhận thiết bị mới; hệ thống tạo tài sản + QR, phân bổ vào phòng cũ và chỉ lúc này mới chuyển thiết bị cũ sang `disposed` (`UC-7.11`)
- UI: KTV/Quản lý CSVC mở **Đề Xuất Thanh Lý** (`#/disposal_propose`); Admin mở **Phê Duyệt Thanh Lý (BGH)** (`#/disposal_approval`). Các bước được khóa theo trạng thái và vai trò; endpoint cũ `/approve` không bỏ qua thẩm định CSVC.
- Kiểm tra end-to-end: (1) đăng nhập **Technician** → `#/disposal_propose` → chọn thiết bị đủ điều kiện, gửi đề xuất; (2) **Manager/Quản lý CSVC** tại cùng trang → thẩm định; (3) **Admin/BGH** → `#/disposal_approval` → ký quyết định; (4) Manager lập dự trù ở `#/disposal_propose`; (5) Technician tiếp nhận tại cùng trang. Sau bước 5, hồ sơ hoàn tất, QR tài sản mới được tạo và tài sản cũ chuyển sang `disposed`.

### 7.5. Sửa Chữa SLA, Linh Kiện & Bảo Hành (`/api/repairs`, `/api/spare-parts`, `/api/parts-requests`)
- `GET /api/repairs` & `POST /api/repairs` — Danh sách và tạo phiếu báo hỏng thiết bị (`UC-5.1`, `UC-5.2`)
- `PUT /api/repairs/:id/assign` & `PUT /api/repairs/:id/accept` — Giao việc SLA và KTV tiếp nhận sửa chữa (`UC-5.3`, `UC-5.4`)
- `POST /api/repairs/:id/logs` & `PUT /api/repairs/:id/outcome` — Ghi nhật ký sửa chữa và báo cáo kết quả (`UC-5.5`, `UC-5.6`)
- `PUT /api/repairs/:id/close` & `POST /api/repairs/:id/feedback` — Nghiệm thu đóng phiếu và đánh giá chất lượng (`UC-5.6`)
- `GET /api/spare-parts` & `PUT /api/spare-parts/:id/stock` — Quản lý danh mục và tồn kho linh kiện (`UC-5.12`)
- `GET /api/parts-requests`, `POST /api/parts-requests` & `PUT /api/parts-requests/:id/approve` — Lập phiếu xin lĩnh và duyệt xuất kho linh kiện (`UC-5.10`, `UC-5.11`)

### 7.6. Báo Cáo, Thông Báo & Kiểm Toán SHA-256 (`/api/reports`, `/api/notifications`, `/api/audit`)
- `GET /api/dashboard/kpi`, `/api/dashboard/repair-cost?year=2026&period=month|quarter`, `/api/dashboard/health-score` — KPI, chi phí và MTBF (`UC-8.1` – `UC-8.3`).
- `GET /api/reports/by-room`, `/by-status`, `/repair-frequency?year=2026`, `/warranty-expiring?days=30`, `/overdue-repairs` — Báo cáo trên menu **Báo Cáo**, dành cho Manager/Admin (`UC-8.4` – `UC-8.8`).
- `GET /api/reports/export?type=equipment&format=csv|print`; kiểm kê dùng `type=inventory&sessionId=<id>` — CSV mở bằng Excel hoặc bản in lưu PDF (`UC-8.9`). Cấu hình tiêu đề trường qua `REPORT_INSTITUTION_NAME`. [Chi tiết nghiệm thu UC-8.1–UC-8.9](docs/uc8-review-2026-10-27.md).
- `GET /api/notifications`, `PUT /api/notifications/:id/read` & `PUT /api/notifications/read-all` — Trung tâm thông báo nội bộ (`UC-9.1`, `UC-9.2`)
- `GET /api/audit/logs`, `GET /api/audit/verify-chain` & `GET /api/audit/export/csv` — Tra cứu, đối soát chuỗi băm SHA-256 và xuất sổ cái kiểm toán (`UC-13.1`, `UC-13.2`)

---

## 8. HƯỚNG DẪN CÀI ĐẶT, KHỞI CHẠY & KIỂM THỬ

### 8.1. Yêu Cầu Môi Trường
- **Node.js**: `>= 18.0.0` (Khuyến nghị LTS `v20.x`)
- **MongoDB**: `>= 6.0` (Mặc định kết nối `mongodb://127.0.0.1:27017/ruo_db`)

### 8.2. Cài Đặt & Khởi Tạo Dữ Liệu Mẫu
Từ thư mục gốc của dự án (`d:/Ruo`):

```bash
# 1. Cài đặt dependencies cho Root, Server và Client
npm install
npm --prefix server install
npm --prefix client install

# 2. Cấu hình biến môi trường cho Server (nếu chưa có file .env)
cp server/.env.example server/.env

# 3. Khởi tạo dữ liệu gốc (4 tài khoản mẫu, Tòa A1 5 tầng, thiết bị QR, linh kiện)
npm run seed
npm run seed:transfer-demo # Tùy chọn: Bổ sung dữ liệu demo điều chuyển, không xóa dữ liệu hiện có
```

> **Lưu ý an toàn dữ liệu:** Khởi động backend không tự tạo/reset tài khoản demo và không xóa dữ liệu user/audit cũ. Chỉ chạy `npm run seed` khi chủ động khởi tạo database demo.

### 8.3. Khởi Chạy Đồng Thời Backend & Frontend
```bash
# Chạy đồng thời Server (Port 5000) và Client (Port 5173) bằng 1 lệnh duy nhất
npm run dev
```
- **Giao diện ứng dụng (Frontend):** `http://localhost:5173`
- **Kiểm tra trạng thái API (Healthcheck):** `http://localhost:5000/api/health`

### 8.4. Chạy Kiểm Thử Tự Động & Kiểm Tra Build
```bash
# Chạy bộ Unit Tests (61 test cases cho Domain Phòng học & Mặt bằng CAD)
npm --prefix server run test:unit

# Chạy bộ Integration Tests cho các Use Cases (Auth, User Mgmt, RBAC, Equipment)
npm test

# Kiểm tra biên dịch Production cho Frontend
npm run build
```

---

## 9. QUY CHUẨN THIẾT KẾ GIAO DIỆN & MÃ NGUỒN

1. **Hệ Thống Giao Diện Kép (`Dual Theme Design Tokens`):**
   - **Obsidian Dark Command Center:** Nền `#080c14`, bề mặt `#0f172a`, chữ `#f8fafc`, điểm nhấn Cyan/Navy hiện đại.
   - **Clean Academic Light Mode:** Nền `#f8fafc`, bề mặt `#ffffff`, chữ `#0f172a`, độ tương phản cao phục vụ làm việc hành chính.
2. **100% Native Inline SVG:** Toàn bộ biểu tượng điều hướng, trạng thái và sơ đồ mặt bằng CAD được xây dựng bằng SVG thuần nội bộ (`SvgIcons.jsx`, `FloorPlan2D.jsx`, `RoomPodCard.jsx`), tuyệt đối không phụ thuộc thư viện icon bên ngoài.
3. **Typography:** Sử dụng bộ font **Be Vietnam Pro** cho giao diện tiếng Việt và **JetBrains Mono** cho mã tài sản, mã QR, số serial và chuỗi băm SHA-256.

---

## GIẤY PHÉP & BẢN QUYỀN

Đề tài được nghiên cứu và phát triển bởi **Nhóm Phát Triển Ruo (Hoàng, Uyên, Tùng, Nguyên, Quang)**.  
Bản quyền © 2026. Mọi quyền được bảo lưu.
