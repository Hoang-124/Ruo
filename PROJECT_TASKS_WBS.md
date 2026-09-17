# RUO (UFMS) — KẾ HOẠCH PHÂN RÃ CÔNG VIỆC & ĐẶC TẢ CHI TIẾT TÁC VỤ (WBS)
## University Facilities Management System — Version 2.0
> Tài liệu kỹ thuật phục vụ quản lý dự án Agile/Scrum, phân chia công việc cho nhóm 5 sinh viên và bảo vệ Đồ án Tốt nghiệp trước Hội đồng.

---

## MỤC LỤC TỔNG QUAN

1. [Tổng Quan Kiến Trúc & Chiến Lược Phân Rã (Horizontal Slicing)](#1-tong-quan-kien-truc--chien-luoc-phan-ra)
2. [Bảng Phân Công Trách Nhiệm 5 Thành Viên Trong Nhóm](#2-bang-phan-cong-trach-nhiem-5-thanh-vien)
3. [Lộ Trình Phát Triển 5 Sprint (Agile/Scrum 10 Tuần)](#3-lo-trinh-phat-trien-5-sprint)
4. [Đặc Tả Chi Tiết Nhiệm Vụ 95 Use Cases Theo 5 Phân Hệ](#4-dac-ta-chi-tiet-nhiem-vu-95-use-cases)
   - [Module 1: Nền Tảng Cốt Lõi, Xác Thực, RBAC & Quản Trị Hệ Thống (Thành Viên 1)](#module-1-nen-tang-cot-loi-xac-thuc-rbac--quan-tri-he-thong)
   - [Module 2: Quản Lý Không Gian Phòng & Đặt Phòng Đơn/Định Kỳ (Thành Viên 2)](#module-2-quan-ly-khong-gian-phong--dat-phong-dondinh-ky)
   - [Module 3: Quản Lý Kho Thiết Bị, Định Danh QR & Vòng Đời Tài Sản (Thành Viên 3)](#module-3-quan-ly-kho-thiet-bi-dinh-danh-qr--vong-doi-tai-san)
   - [Module 4: Điều Hành Phân Luồng Duyệt Đa Cấp & Kanban SLA Reactor (Thành Viên 4)](#module-4-dieu-hanh-phan-luong-duyet-da-cap--kanban-sla-reactor)
   - [Module 5: Xếp Thời Khóa Biểu CSP, Báo Cáo Thống Kê & Tích Hợp (Thành Viên 5)](#module-5-xep-thoi-khoa-bieu-csp-bao-cao-thong-ke--tich-hop)
5. [Quy Chuẩn Kỹ Thuật 5 Trụ Cột Nâng Cao (Điểm Nhấn Hội Đồng Bảo Vệ)](#5-quy-chuan-ky-thuat-5-tru-cot-nang-cao)
6. [Đặc Tả 12 Collections MongoDB & Chỉ Mục Tối Ưu](#6-dac-ta-12-collections-mongodb)

---

## 1. TỔNG QUAN KIẾN TRÚC & CHIẾN LƯỢC PHÂN RÃ

### 1.1 Nguyên Tắc "Horizontal Slicing" (Cắt Theo Lớp Tính Năng)
- **Tuyệt đối không chia việc theo Actor** (ví dụ: người làm từ A-Z cho Sinh viên, người làm Giảng viên) vì sẽ dẫn đến:
  - Trùng lặp code nghiêm trọng (duplicate controllers, duplicate views).
  - Xung đột Git triền miên khi merge branch.
  - Không tái sử dụng được Business Logic dùng chung.
- **Áp dụng Horizontal Slicing:** Mỗi thành viên phụ trách trọn vẹn 1 Feature Module (từ Mongoose Schema, Service/Controller API đến React UI Component) và cung cấp RESTful endpoints cho các thành viên khác tích hợp.

### 1.2 Ma Trận Tác Nhân (7 Actors) & 95 Use Cases
- **1. Student (Sinh viên):** 20 Use Cases (BaseUser).
- **2. Lecturer (Giảng viên):** 20 (Kế thừa) + 8 bổ sung = 28 Use Cases.
- **3. Facility Staff (Quản lý CSVC):** 25 Use Cases.
- **4. Maintenance Staff (Kỹ thuật bảo trì):** 11 Use Cases.
- **5. Academic Affairs (Phòng Đào tạo):** 10 Use Cases.
- **6. System Admin (Quản trị hệ thống):** 18 Use Cases.
- **7. External System (Hệ thống tích hợp giả lập):** 3 Use Cases.
- **Tổng cộng:** 95 Use Cases (28 Cơ bản - 29.5%, 46 Trung bình - 48.4%, 21 Nâng cao - 22.1%).

---

## 2. BẢNG PHÂN CÔNG TRÁCH NHIỆM 5 THÀNH VIÊN

| Thành viên | Vị trí / Phân hệ đảm nhiệm | Phạm vi Use Case | Công nghệ trọng tâm |
| :--- | :--- | :--- | :--- |
| **Thành Viên 1** *(Team Leader)* | **Core Architecture, Auth, User & RBAC, System Admin** | `UC-1.1` $\rightarrow$ `UC-1.6`<br>`UC-6.1` $\rightarrow$ `UC-6.18` *(24 UCs)* | Node.js Express Core, JWT, BCrypt, Dynamic RBAC Middleware, SHA-256 Audit Log Engine, MongoDB Collections: `users`, `roles`, `audit_logs`. |
| **Thành Viên 2** | **Phân Hệ Quản Lý Phòng & Lịch Đặt Phòng (Room Module)** | `UC-1.7` $\rightarrow$ `UC-1.14`<br>`UC-2.1` $\rightarrow$ `UC-2.3`<br>`UC-3.1` $\rightarrow$ `UC-3.6` *(20 UCs)* | Spatial CAD Canvas 2.5D, FullCalendar / Grid UI, Optimistic Locking, Conflict Checking Engine, RFC-5545 Series/Exceptions, Collections: `rooms`, `bookings`, `booking_series`, `booking_exceptions`. |
| **Thành Viên 3** | **Phân Hệ Quản Lý Thiết Bị, Kho QR & Tài Sản (Equipment Module)** | `UC-2.4` $\rightarrow$ `UC-2.8`<br>`UC-3.7` $\rightarrow$ `UC-3.13`<br>`UC-4.10`, `UC-4.11` *(17 UCs)* | QR Code Generator & Scanner, Multer File/Image Storage, Inventory Reconciliation Engine, Life-cycle Depreciation Calculator, Collections: `equipments`, `borrow_requests`. |
| **Thành Viên 4** | **Quy Trình Duyệt Đa Cấp, Ticket Sự Cố & Bảo Trì SLA (Workflow)** | `UC-1.15` $\rightarrow$ `UC-1.18`<br>`UC-3.14` $\rightarrow$ `UC-3.21`<br>`UC-4.1` $\rightarrow$ `UC-4.9` *(17 UCs)* | SLA Business Hours Engine (07:30 - 17:00), Escalation Rules Evaluator, Double Confirmation State Machine, RACI 5-Step Disposal ($R \ge 60\%$), Collections: `tickets`, `maintenance_plans`, `asset_disposals`. |
| **Thành Viên 5** | **Phân Hệ Đào Tạo CSP, Báo Cáo Thống Kê & UI/UX Design** | `UC-5.1` $\rightarrow$ `UC-5.10`<br>`UC-3.22` $\rightarrow$ `UC-3.25`<br>`UC-7.1` $\rightarrow$ `UC-7.3` *(17 UCs)* | CSP Backtracking + MRV/LCV Heuristics, Drag & Drop Timetable Grid, Recharts / Heatmaps, PDFKit / ExcelJS Exporter, External SIS Webhook & Nodemailer Mock. |

---

## 3. LỘ TRÌNH PHÁT TRIỂN 5 SPRINT (AGILE / SCRUM 10 TUẦN)

### Sprint 1 (Tuần 1 - 2): Nền Tảng Cốt Lõi, Xác Thực & Layout Chuẩn
- **Mục tiêu:** Dựng khung hệ thống, kết nối MongoDB, hoàn thành module Auth JWT & RBAC, dựng khung giao diện React Base Layout (Obsidian Dark / Clean Light Mode).
- **Sản phẩm bàn giao:** Đăng nhập, đăng xuất, đổi mật khẩu, xem profile, phân quyền route bảo vệ theo vai trò, khung điều hướng Dynamic Island.

### Sprint 2 (Tuần 3 - 4): Danh Mục Không Gian Phòng & Quản Lý Thiết Bị
- **Mục tiêu:** Hoàn thành CRUD danh mục Tòa nhà, Tầng, Phòng học (CAD 2.5D Coordinates) và Kho thiết bị mã QR.
- **Sản phẩm bàn giao:** Giao diện CAD Canvas mặt bằng tầng, bộ lọc tìm kiếm phòng/thiết bị đa tiêu chí, tính năng quét/in mã QR định danh tài sản.

### Sprint 3 (Tuần 5 - 6): Nghiệp Vụ Đặt Phòng Đơn, Định Kỳ & Mượn Thiết Bị
- **Mục tiêu:** Triển khai nghiệp vụ đặt phòng có kiểm tra xung đột thời gian thực (Conflict Checking), chuỗi đặt lịch định kỳ RFC-5545, quy trình mượn trả thiết bị di động, cơ chế Check-in QR 15 phút và phạt No-Show.
- **Sản phẩm bàn giao:** Đặt phòng đơn, chuỗi định kỳ của Giảng viên, đơn mượn thiết bị, giao diện quét QR Check-in cửa phòng.

### Sprint 4 (Tuần 7 - 8): Ticket Sự Cố SLA, Phân Luồng Duyệt 2 Cấp & Động Cơ CSP
- **Mục tiêu:** Xây dựng hệ thống điều phối ticket sự cố với đồng hồ đếm ngược SLA chuẩn giờ hành chính, phân luồng Escalation tự động lên Phòng Đào tạo, giải thuật CSP xếp TKB tự động và quy trình thanh lý $R \ge 60\%$.
- **Sản phẩm bàn giao:** Kanban Board điều phối kỹ thuật, Engine CSP xếp phòng học kỳ không xung đột, tiến trình thanh lý 5 bước theo ma trận RACI.

### Sprint 5 (Tuần 9 - 10): Báo Cáo, Thống Kê, Audit Log SHA-256 & Nghiệm Thu
- **Mục tiêu:** Xây dựng Dashboard biểu đồ thống kê (Heatmap, tỷ lệ lấp đầy), xuất báo cáo PDF/Excel chuẩn in ấn, chuỗi băm kiểm toán SHA-256 bất biến, kiểm thử tải đồng thời và hoàn thiện tài liệu bảo vệ đồ án.
- **Sản phẩm bàn giao:** Báo cáo đồ án hoàn chỉnh, hệ thống chạy mượt mà 100% chức năng sẵn sàng bảo vệ trước Hội đồng.

---

## 4. ĐẶC TẢ CHI TIẾT NHIỆM VỤ 95 USE CASES

---

### MODULE 1: NỀN TẢNG CỐT LÕI, XÁC THỰC, RBAC & QUẢN TRỊ HỆ THỐNG
**Phụ trách:** Thành Viên 1 (Team Leader) | **Tổng Use Cases:** 24 UCs

#### 1. Nhóm Xác Thực & Hồ Sơ (UC-1.1 $\rightarrow$ UC-1.6)
- **`UC-1.1: Đăng nhập hệ thống`** *(Cơ bản)*
  - *Backend:* Endpoint `POST /api/auth/login`. Kiểm tra email/MSSV + mật khẩu qua BCrypt. Sinh JWT Access Token (15 phút) và Refresh Token (7 ngày). Ghi log IP, thiết bị, thời gian.
  - *Frontend:* Form đăng nhập đồng bộ font Be Vietnam Pro, hiển thị thông báo lỗi, lưu token vào memory/cookie, chuyển hướng theo Role.
  - *DoD:* Đăng nhập đúng cấp token, đăng nhập sai quá 5 lần khóa tạm 15 phút.
- **`UC-1.2: Đăng xuất`** *(Cơ bản)*
  - *Backend:* Endpoint `POST /api/auth/logout`. Đưa Refresh Token vào blacklist trên MongoDB/Redis. Hỗ trợ cờ `logoutAllDevices`.
  - *Frontend:* Xóa state Auth, điều hướng về màn hình đăng nhập.
- **`UC-1.3: Quên mật khẩu`** *(Trung bình)*
  - *Backend:* Endpoint `POST /api/auth/forgot-password`. Sinh mã OTP 6 số ngẫu nhiên (TTL 15 phút), giới hạn 3 lần/giờ, gửi mail qua Nodemailer.
  - *Frontend:* Modal nhập email $\rightarrow$ nhập OTP $\rightarrow$ đặt mật khẩu mới.
- **`UC-1.4: Đổi mật khẩu`** *(Cơ bản)*
  - *Backend:* Endpoint `POST /api/auth/change-password`. Validate: $\ge 8$ ký tự, chữ hoa, chữ thường, số, ký tự đặc biệt. Hủy tất cả phiên đăng nhập khác.
- **`UC-1.5: Xem hồ sơ cá nhân`** *(Cơ bản)*
  - *Backend:* Endpoint `GET /api/auth/me`. Populate phòng ban, vai trò, điểm uy tín mượn phòng.
  - *Frontend:* Card hiển thị hồ sơ sinh viên/giảng viên, huy hiệu điểm uy tín.
- **`UC-1.6: Cập nhật hồ sơ`** *(Cơ bản)*
  - *Backend:* Endpoint `PUT /api/auth/me`. Cho phép sửa số điện thoại, avatar URL. Khóa cứng MSSV, email trường, khoa/viện.

#### 2. Nhóm Quản Trị Người Dùng & Phân Quyền RBAC (UC-6.1 $\rightarrow$ UC-6.11)
- **`UC-6.1: Thêm người dùng mới`** *(Trung bình)*
  - *Backend:* `POST /api/admin/users`. Kiểm tra trùng lặp email/MSSV, tạo mật khẩu tạm ngẫu nhiên, gắn vai trò mặc định, gửi email kích hoạt.
- **`UC-6.2: Xem danh sách người dùng`** *(Trung bình)*
  - *Backend:* `GET /api/admin/users` với pagination, filter theo Role, Khoa/Viện, Status (Active/Locked), search theo tên/MSSV.
- **`UC-6.3: Xem chi tiết người dùng`** *(Cơ bản)*
  - *Backend:* `GET /api/admin/users/:id` kèm lịch sử login, 5 đơn đặt phòng gần nhất, ticket sự cố đã gửi.
- **`UC-6.4: Cập nhật thông tin & đổi vai trò`** *(Trung bình)*
  - *Backend:* `PUT /api/admin/users/:id`. Khi đổi vai trò, lập tức thu hồi toàn bộ token cũ để áp dụng quyền mới ngay lập tức.
- **`UC-6.5: Vô hiệu hóa / Kích hoạt tài khoản`** *(Cơ bản)*
  - *Backend:* `PUT /api/admin/users/:id/toggle-status`. Khi Deactivate, tự động hủy các booking tương lai. Không xóa cứng trong DB.
- **`UC-6.6: Reset mật khẩu người dùng`** *(Cơ bản)*
  - *Backend:* `POST /api/admin/users/:id/reset-password`. Sinh mật khẩu ngẫu nhiên, gắn cờ bắt buộc đổi mật khẩu ở lần đăng nhập tới.
- **`UC-6.7: Import người dùng hàng loạt (Batch CSV/Excel)`** *(Nâng cao)*
  - *Backend:* `POST /api/admin/users/import`. Đọc file Excel > 1.000 dòng, validate cú pháp, kiểm tra trùng lặp, trả về danh sách hợp lệ và danh sách lỗi.
  - *Frontend:* Giao diện kéo thả file, bảng xem trước (Preview Grid) trước khi xác nhận import.
- **`UC-6.8: Xem danh sách vai trò (Roles Matrix)`** *(Cơ bản)*
  - *Backend:* `GET /api/admin/roles`. Hiển thị danh sách vai trò, số lượng user và mảng permissions.
- **`UC-6.9: Tạo vai trò tùy chỉnh`** *(Trung bình)*
  - *Backend:* `POST /api/admin/roles`. Cung cấp cây phân quyền (Permission Tree) dạng checkbox theo module.
- **`UC-6.10: Cập nhật permission của vai trò`** *(Trung bình)*
  - *Backend:* `PUT /api/admin/roles/:id/permissions`. Cảnh báo số lượng người dùng bị ảnh hưởng, áp dụng tức thì.
- **`UC-6.11: Gán vai trò cho người dùng`** *(Cơ bản)*
  - *Backend:* `POST /api/admin/roles/assign`. Hỗ trợ gán nhiều vai trò đồng thời hoặc gán hàng loạt cho nhóm user.

#### 3. Nhóm Cấu Hình Hệ Thống & Kiểm Toán Bất Biến (UC-6.12 $\rightarrow$ UC-6.18)
- **`UC-6.12: Cấu hình quy tắc đặt phòng`** *(Trung bình)*
  - *Backend:* Lưu trữ cấu hình: số phòng tối đa/ngày theo role, thời gian đặt trước tối đa, khung giờ mở cửa hệ thống (06:00 - 22:00).
- **`UC-6.13: Cấu hình luồng duyệt & Escalation Triggers`** *(Nâng cao)*
  - *Backend:* Cấu hình ngưỡng chuyển cấp: mượn trùng lịch chính khóa, mượn $\ge 3$ phòng, mượn sau 21h, thiết bị $> 50$ triệu.
- **`UC-6.14: Cấu hình template thông báo Email/In-app`** *(Trung bình)*
  - *Backend:* Soạn mẫu email với các biến động `{{userName}}`, `{{roomName}}`, `{{timeSlot}}`.
- **`UC-6.15: Quản lý danh mục tham chiếu hệ thống (CRUD Master Data)`** *(Cơ bản)*
  - *Backend:* CRUD loại phòng, loại thiết bị, phân loại sự cố, tòa nhà, khoa/phòng ban.
- **`UC-6.16: Xem nhật ký kiểm toán bất biến (Audit Log)`** *(Nâng cao)*
  - *Backend:* `GET /api/audit/logs`. Hiển thị lịch sử ghi vết SHA-256 chuỗi khối (prevHash $\rightarrow$ sha256Hash), thông tin IP, diff trước/sau.
- **`UC-6.17: Xuất dữ liệu audit log (CSV/Excel)`** *(Trung bình)*
  - *Backend:* `GET /api/audit/export`. Giới hạn export tối đa 10.000 bản ghi phục vụ thanh tra an toàn thông tin.
- **`UC-6.18: Dashboard tổng quan hệ thống Admin`** *(Trung bình)*
  - *Backend:* Tổng hợp số user active, số booking hôm nay, số ticket mở, tỷ lệ sử dụng phòng, cảnh báo vi phạm SLA.

---

### MODULE 2: QUẢN LÝ KHÔNG GIAN PHÒNG & ĐẶT PHÒNG ĐƠN/ĐỊNH KỲ
**Phụ trách:** Thành Viên 2 | **Tổng Use Cases:** 20 UCs

#### 1. Quản Lý Danh Mục Phòng Học (UC-3.1 $\rightarrow$ UC-3.6)
- **`UC-3.1: Thêm phòng học mới`** *(Trung bình)*
  - *Backend:* `POST /api/facilities/rooms`. Mã phòng duy nhất (A1-302), tòa nhà, tầng, sức chứa $> 0$, loại phòng, danh sách thiết bị cố định, tải tối đa 10 ảnh.
- **`UC-3.2: Xem danh sách phòng học`** *(Cơ bản)*
  - *Backend:* `GET /api/facilities/rooms` có phân trang, bộ lọc: tòa nhà, tầng, loại phòng, khoảng sức chứa, trạng thái.
- **`UC-3.3: Xem chi tiết phòng học`** *(Trung bình)*
  - *Backend:* `GET /api/facilities/rooms/:code`. Trả về thông số kỹ thuật, thiết bị kèm serial, lịch sử mượn, lịch bảo trì và tỷ lệ sử dụng tháng.
- **`UC-3.4: Cập nhật thông tin phòng học`** *(Trung bình)*
  - *Backend:* `PUT /api/facilities/rooms/:id`. Cảnh báo nếu sức chứa mới nhỏ hơn số người của các đơn mượn tương lai đã duyệt.
- **`UC-3.5: Ngừng sử dụng phòng (Deactivate)`** *(Cơ bản)*
  - *Backend:* Đổi trạng thái sang `INACTIVE`. Bắt buộc kiểm tra hủy/chuyển lịch các đơn mượn tương lai trước khi ngưng.
- **`UC-3.6: Cập nhật trạng thái vận hành phòng`** *(Trung bình)*
  - *Backend:* Chuyển đổi giữa `AVAILABLE`, `MAINTENANCE`, `INACTIVE`. Tự động phát thông báo đến người có lịch bị ảnh hưởng.

#### 2. Tra Cứu & Đặt Phòng Đơn Lẻ (UC-1.7 $\rightarrow$ UC-1.14)
- **`UC-1.7: Tìm kiếm phòng trống thông minh`** *(Nâng cao)*
  - *Backend:* Query loại trừ phòng đã có lịch chính khóa, lịch đã duyệt hoặc đang bảo trì trong khung giờ chỉ định. Thuật toán sắp xếp ưu tiên sức chứa sát nhất với số người yêu cầu (tránh lãng phí ghế).
- **`UC-1.8: Xem chi tiết phòng phía Client`** *(Cơ bản)*
  - *Frontend:* Modal thông tin phòng với hình ảnh thực tế, thông số telemetry điện năng, nhiệt độ, danh sách thiết bị.
- **`UC-1.9: Xem lịch phòng trực quan (Calendar Grid)`** *(Trung bình)*
  - *Frontend:* Bản đồ lịch theo tuần/tháng với mã màu phân biệt: Xanh (Chính khóa), Cam (Đã duyệt), Đỏ (Bảo trì), Trắng (Trống). Click slot trống để đặt.
- **`UC-1.10: Tạo yêu cầu đặt phòng (Optimistic Locking)`** *(Nâng cao)*
  - *Backend:* `POST /api/bookings`. Validate ràng buộc: (1) Check trùng giờ nguyên tử (Atomic Check), (2) Không bảo trì, (3) Không trùng chính khóa, (4) SV đặt $\le 2$ phòng/ngày, (5) Không đặt trước quá 2 tuần. Trạng thái `PENDING`.
- **`UC-1.11: Chỉnh sửa yêu cầu đặt phòng`** *(Trung bình)*
  - *Backend:* Chỉ sửa khi status là `PENDING` hoặc `APPROVED` (nếu còn $> 24$h trước giờ sử dụng). Re-validate trùng lịch. Nếu đã Approved thì chuyển về Pending để duyệt lại.
- **`UC-1.12: Hủy đặt phòng & Ghi nhận Late Cancellation`** *(Trung bình)*
  - *Backend:* Bắt buộc nhập lý do. Nếu hủy gấp $< 2$ tiếng trước ca mượn, ghi nhận vi phạm "Late Cancellation" vào hồ sơ sinh viên để trừ điểm uy tín.
- **`UC-1.13: Xem lịch sử đặt phòng cá nhân`** *(Cơ bản)*
  - *Backend:* `GET /api/bookings/my` hỗ trợ filter theo trạng thái, sắp xếp theo thời gian mới nhất.
- **`UC-1.14: Check-in phòng học bằng mã QR & Phạt No-Show`** *(Nâng cao)*
  - *Backend:* `POST /api/bookings/check-in`. Sinh viên quét mã QR tại cửa phòng trong 15 phút đầu. Sau 15 phút không check-in, service tự động chuyển sang `NO_SHOW`, giải phóng phòng và trừ điểm uy tín.

#### 3. Đặt Lịch Định Kỳ Cả Học Kỳ Chuẩn RFC-5545 (UC-2.1 $\rightarrow$ UC-2.3)
- **`UC-2.1: Tạo chuỗi đặt phòng định kỳ (Booking Series)`** *(Nâng cao)*
  - *Backend:* Giảng viên chọn phòng, thứ trong tuần, khung giờ, tần suất (hàng tuần / 2 tuần 1 lần) từ tuần X đến tuần Y. Hệ thống sinh danh sách các instances, tự động kiểm tra conflict cho từng buổi, cho phép chọn giải pháp bỏ qua buổi trùng hoặc đổi phòng. Lưu 1 bản ghi `booking_series` cha.
- **`UC-2.2: Chỉnh sửa lịch định kỳ (2 Chế độ linh hoạt)`** *(Nâng cao)*
  - *Backend:* Chế độ 1: Chỉ sửa 1 buổi cụ thể (tạo bản ghi `booking_exceptions` không phá vỡ chuỗi). Chế độ 2: Sửa buổi này và tất cả các buổi sau (cập nhật endDate chuỗi cũ, tạo chuỗi mới).
- **`UC-2.3: Hủy lịch định kỳ`** *(Trung bình)*
  - *Backend:* Hủy toàn bộ chuỗi hoặc hủy 1 buổi ngoại lệ đơn lẻ. Tự động giải phóng tất cả các slot phòng trong tương lai.

---

### MODULE 3: QUẢN LÝ KHO THIẾT BỊ, ĐỊNH DANH QR & VÒNG ĐỜI TÀI SẢN
**Phụ trách:** Thành Viên 3 | **Tổng Use Cases:** 17 UCs

#### 1. Quản Lý Danh Mục Trang Thiết Bị & Khấu Hao (UC-3.7 $\rightarrow$ UC-3.13)
- **`UC-3.7: Thêm thiết bị mới vào kho`** *(Trung bình)*
  - *Backend:* `POST /api/equipments`. Mã tài sản duy nhất, tên, chủng loại, hãng, model, serial, ngày mua, nguyên giá (VNĐ), hạn bảo hành, phòng bố trí hoặc kho lưu trữ.
- **`UC-3.8: Xem danh sách thiết bị & Tra cứu đa tiêu chí`** *(Cơ bản)*
  - *Backend:* Bộ lọc theo chủng loại, trạng thái (`AVAILABLE`, `BORROWED`, `MAINTENANCE`, `PENDING_DISPOSAL`, `DISPOSED`), vị trí phòng/kho, khoảng giá trị.
- **`UC-3.9: Xem chi tiết vòng đời thiết bị`** *(Trung bình)*
  - *Backend:* Xem thông số, lịch sử điều chuyển vị trí, lịch sử sửa chữa, người đang mượn và tỷ lệ khấu hao theo thời gian.
- **`UC-3.10: Cập nhật thông tin & Ghi log di chuyển (Movement Log)`** *(Trung bình)*
  - *Backend:* Khi đổi vị trí phòng học của thiết bị, tự động ghi lại nhật ký điều chuyển kèm người thực hiện và timestamp.
- **`UC-3.11: Thanh lý thiết bị theo quyết định`** *(Cơ bản)*
  - *Backend:* Chuyển trạng thái sang `DISPOSED`. Đính kèm số quyết định, lý do, ngày hoàn tất và giá trị thanh lý thu hồi. Không cho phép thanh lý thiết bị đang được mượn.
- **`UC-3.12: Đợt kiểm kê tài sản định kỳ & Đối soát sai lệch`** *(Nâng cao)*
  - *Backend:* Khởi tạo đợt kiểm kê theo phạm vi phòng/tòa nhà/toàn trường. Sinh danh sách đối soát. Nhân viên quét mã QR từng máy để xác nhận: Khớp vị trí, Thất lạc, Hỏng hóc, Sai vị trí. Xuất biên bản kiểm kê chuẩn PDF.
- **`UC-3.13: Gán / Luân chuyển thiết bị vào phòng học`** *(Cơ bản)*
  - *Backend:* Chuyển thiết bị từ kho vào phòng học hoặc giữa các phòng. Kiểm tra điều kiện thiết bị phải khả dụng.

#### 2. Mượn Trả Thiết Bị Chuyên Dụng (UC-2.4 $\rightarrow$ UC-2.8)
- **`UC-2.4: Tìm kiếm thiết bị mượn giảng dạy/nghiên cứu`** *(Cơ bản)*
  - *Backend:* Tìm kiếm máy chiếu di động, laptop chuyên dụng, mic không dây, thiết bị đo kiểm. Lọc theo khoảng ngày mượn.
- **`UC-2.5: Tạo yêu cầu mượn thiết bị`** *(Trung bình)*
  - *Backend:* `POST /api/equipments/borrow`. Chọn thiết bị, ngày mượn, ngày trả dự kiến ($\le 7$ ngày). Kiểm tra giảng viên không có thiết bị quá hạn chưa trả. Nếu nguyên giá $> 50.000.000$ VNĐ, tự động gắn cờ Escalation.
- **`UC-2.6: Gia hạn mượn thiết bị`** *(Trung bình)*
  - *Backend:* Gia hạn tối đa 1 lần thêm $\le 7$ ngày. Kiểm tra thiết bị chưa có ai đặt mượn tiếp theo mới cho phép gia hạn.
- **`UC-2.7: Trả thiết bị & Bàn giao nghiệm thu`** *(Trung bình)*
  - *Backend:* Cán bộ CSVC kiểm tra tình trạng vật lý. Nếu tốt $\rightarrow$ chuyển `AVAILABLE`. Nếu phát hiện hư hỏng $\rightarrow$ tự động tạo ticket bảo trì và ghi nhận biên bản hư hại.
- **`UC-2.8: Xem lịch sử mượn trả thiết bị`** *(Cơ bản)*
  - *Backend:* `GET /api/equipments/borrow/history`. Thống kê danh sách các đợt mượn, tình trạng bàn giao và biên bản phát sinh.

#### 3. Tra Cứu Lịch Sử Bảo Trì Thiết Bị (UC-4.10, UC-4.11)
- **`UC-4.10: Xem lịch sử bảo trì theo phòng học`** *(Cơ bản)*
  - *Backend:* Timeline các lần sửa điện nước, máy lạnh, bảo dưỡng định kỳ của phòng, chi phí vật tư đã tiêu hao.
- **`UC-4.11: Xem lịch sử bảo dưỡng & Đánh giá tuổi thọ thiết bị`** *(Trung bình)*
  - *Backend:* Thống kê số lần phát sinh sự cố, tổng chi phí sửa chữa lũy kế, tính toán chỉ số $R$ và dự báo tuổi thọ còn lại.

---

### MODULE 4: ĐIỀU HÀNH PHÂN LUỒNG DUYỆT ĐA CẤP & KANBAN SLA REACTOR
**Phụ trách:** Thành Viên 4 | **Tổng Use Cases:** 17 UCs

#### 1. Hàng Đợi Duyệt Đa Cấp & Cơ Chế Leo Thang (UC-3.14 $\rightarrow$ UC-3.17)
- **`UC-3.14: Xem hàng đợi yêu cầu chờ duyệt`** *(Cơ bản)*
  - *Frontend:* Dashboard tổng hợp các đơn mượn phòng/thiết bị ở trạng thái `PENDING`. Sắp xếp ưu tiên: Giảng viên > Sinh viên, thời gian gửi, mức độ khẩn cấp.
- **`UC-3.15: Duyệt / Từ chối đơn mượn phòng (Race Condition Handling)`** *(Nâng cao)*
  - *Backend:* Kiểm tra lại tình trạng phòng tại thời điểm bấm duyệt để chống race condition. Phê duyệt $\rightarrow$ chuyển `APPROVED`, khóa slot lịch, gửi mail kèm mã QR Check-in. Từ chối $\rightarrow$ bắt buộc nhập lý do. Thỏa điều kiện chuyển cấp $\rightarrow$ chuyển lên Phòng Đào tạo.
- **`UC-3.16: Duyệt đơn mượn thiết bị`** *(Cơ bản)*
  - *Backend:* Thẩm định trạng thái khả dụng của thiết bị, chuyển trạng thái sang `RESERVED`, thông báo người mượn đến nhận.
- **`UC-3.17: Phê duyệt hàng loạt (Batch Approval)`** *(Trung bình)*
  - *Backend:* Cho phép chọn nhiều đơn hợp lệ cùng lúc. Hệ thống kiểm tra tuần tự từng đơn và trả về báo cáo kết quả: X thành công, Y thất bại kèm lý do cụ thể.

#### 2. Điều Hành Ticket Sự Cố & Kanban SLA Reactor (UC-1.15 $\rightarrow$ UC-1.18, UC-3.18 $\rightarrow$ UC-3.21, UC-4.1 $\rightarrow$ UC-4.5)
- **`UC-1.15: Báo cáo sự cố hỏng hóc cơ sở vật chất`** *(Trung bình)*
  - *Backend:* `POST /api/incidents`. Chọn phòng/thiết bị, loại sự cố, mô tả chi tiết, đính kèm tối đa 5 ảnh ($\le 5$MB/ảnh), chọn mức độ ưu tiên (`critical`, `high`, `medium`, `low`). Tự động khởi chạy đồng hồ đếm ngược SLA.
- **`UC-1.16: Xem trạng thái xử lý sự cố (Timeline View)`** *(Cơ bản)*
  - *Frontend:* Dòng thời gian trực quan: Khởi tạo $\rightarrow$ Đã gán việc $\rightarrow$ Đang xử lý $\rightarrow$ Đã khắc phục $\rightarrow$ Đã đóng.
- **`UC-1.17: Bổ sung thông tin / Trao đổi 2 chiều`** *(Cơ bản)*
  - *Backend:* Gửi comment, hình ảnh làm rõ nguyên nhân giữa người báo hỏng và kỹ thuật viên.
- **`UC-1.18: Nghiệm thu 2 chiều & Đánh giá chất lượng xử lý`** *(Trung bình)*
  - *Backend:* Sau khi kỹ thuật viên bấm `RESOLVED`, người báo hỏng thực tế nghiệm thu: Đánh giá 1 - 5 sao và xác nhận đóng ticket (`CLOSED`). Nếu hiện trường chưa đạt, bấm "Chưa khắc phục xong" chuyển ticket về `IN_PROGRESS`. Tự động đóng sau 48h nếu không phản hồi.
- **`UC-3.18: Danh sách ticket bảo trì toàn trường`** *(Cơ bản)*
  - *Frontend:* Lọc đa chiều theo trạng thái, mức độ khẩn cấp, vị trí, nhân viên phụ trách, sắp xếp theo hạn định SLA.
- **`UC-3.19: Phân công ticket & Cân bằng tải công việc (Workload Balancing)`** *(Trung bình)*
  - *Backend:* Giao việc cho kỹ thuật viên phù hợp chuyên môn (điện lạnh, mạng máy tính, âm thanh). Hiển thị số lượng ticket đang xử lý của từng nhân viên để tránh quá tải. Hỗ trợ điều chuyển ticket.
- **`UC-3.20: Giám sát tiến độ SLA thời gian thực & Cảnh báo leo thang`** *(Nâng cao)*
  - *Backend:* Tính SLA theo giờ hành chính (07:30 - 17:00 ngày làm việc). Cảnh báo 3 giai đoạn: `ON_TRACK` (0% - 70%), `AT_RISK` (70% - 100%), `OVERDUE` ($> 100\%$). Khi quá hạn, tự động gửi email cảnh báo Trưởng phòng CSVC.
- **`UC-3.21: Xác nhận nghiệm thu & Đóng ticket từ phía CSVC`** *(Cơ bản)*
  - *Backend:* Quản lý CSVC xác nhận chi phí vật tư thay thế, đóng ticket, đưa phòng/thiết bị trở lại trạng thái `AVAILABLE`.
- **`UC-4.1: Giao diện Mobile/Tablet dành cho Kỹ thuật viên`** *(Cơ bản)*
  - *Frontend:* Danh sách ticket được giao, hiển thị đồng hồ đếm ngược SLA, đánh dấu nổi bật ticket khẩn cấp.
- **`UC-4.2: Nhận ticket & Bắt đầu bấm giờ xử lý`** *(Cơ bản)*
  - *Backend:* Chuyển từ `ASSIGNED` sang `IN_PROGRESS`, ghi nhận thời gian bắt đầu thực tế.
- **`UC-4.3: Cập nhật tiến độ & Yêu cầu vật tư thay thế`** *(Trung bình)*
  - *Backend:* Ghi chú hiện trường, ảnh trước/sau sửa chữa, cập nhật tỷ lệ hoàn thành (%), lập phiếu đề xuất xuất kho vật tư linh kiện.
- **`UC-4.4: Hoàn thành sửa chữa (Technical Resolution)`** *(Trung bình)*
  - *Backend:* Báo cáo nghiệm thu kỹ thuật, tổng hợp vật tư thực tế đã dùng, chi phí nhân công, ảnh chụp máy hoạt động bình thường, chuyển sang `RESOLVED`.
- **`UC-4.5: Từ chối / Trả lại ticket sự cố`** *(Cơ bản)*
  - *Backend:* Trả lại ticket kèm lý do (thiếu chuyên môn, thiếu vật tư đặc chủng, mô tả sai hiện trường) để chuyển người khác.

#### 3. Bảo Trì Dự Phòng Định Kỳ & Quy Trình Thanh Lý 5 Bước (UC-4.6 $\rightarrow$ UC-4.9)
- **`UC-4.6: Xem lịch bảo dưỡng dự phòng toàn trường`** *(Cơ bản)*
  - *Frontend:* Lịch bảo trì phòng (điện nước điều hòa) và thiết bị (vệ sinh tra keo tản nhiệt máy chiếu, kiểm định máy đo).
- **`UC-4.7: Thiết lập kế hoạch bảo trì định kỳ`** *(Trung bình)*
  - *Backend:* Chọn nhóm thiết bị, chu kỳ (tháng/quý/năm), checklist kỹ thuật. Tự động đối chiếu tránh trùng lịch học chính khóa.
- **`UC-4.8: Ghi nhận kết quả bảo trì định kỳ`** *(Trung bình)*
  - *Backend:* Tick checklist từng hạng mục, đánh giá tình trạng (Tốt, Cần theo dõi, Nguy cơ hỏng). Tự động sinh ticket nếu phát hiện lỗi nặng.
- **`UC-4.9: Đề xuất thanh lý tài sản hư hỏng theo chỉ số R >= 60%`** *(Nâng cao)*
  - *Backend:* Khi chi phí sửa chữa linh kiện ước tính $\ge 60\%$ giá trị sổ sách còn lại của thiết bị, khởi tạo Hồ sơ Đề xuất Thanh lý 5 bước theo ma trận RACI, khóa mượn tự động.

---

### MODULE 5: PHÂN HỆ ĐÀO TẠO CSP, BÁO CÁO THỐNG KÊ & TÍCH HỢP
**Phụ trách:** Thành Viên 5 | **Tổng Use Cases:** 17 UCs

#### 1. Phân Bổ Phòng Học Kỳ Chính Khóa Bằng Giải Thuật CSP (UC-5.1 $\rightarrow$ UC-5.5)
- **`UC-5.1: Import danh sách lớp học phần từ Excel/CSV`** *(Trung bình)*
  - *Backend:* Đọc file chứa hàng trăm lớp học phần (Mã LHP, tên môn, giảng viên, sĩ số, số tiết, loại phòng yêu cầu). Kiểm tra tính hợp lệ cú pháp và đối soát sức chứa khả thi trước khi lưu.
- **`UC-5.2: Động cơ phân bổ phòng tự động (CSP + Weighted Greedy)`** *(Nâng cao)*
  - *Backend:* Bộ giải CSP áp dụng Backtracking + MRV (chọn lớp khó xếp trước) + LCV (chọn phòng vừa khít sức chứa nhất để tránh lãng phí ghế) + Ràng buộc mềm gom cụm khoa/viện theo tòa nhà. Kết xuất bảng phân bổ 0 xung đột.
- **`UC-5.3: Phân bổ phòng thủ công (Drag & Drop Interface)`** *(Nâng cao)*
  - *Frontend:* Giao diện dạng lưới thời khóa biểu kéo thả. Hiển thị cảnh báo màu đỏ tức thời khi thả lớp học phần vào slot đã có lớp hoặc không đủ sức chứa.
- **`UC-5.4: Xem & Xuất bảng thời khóa biểu phân bổ`** *(Trung bình)*
  - *Frontend & Backend:* Xem theo góc nhìn: Phòng học, Giảng viên, Khoa/Viện. Xuất dữ liệu ra file Excel hoặc PDF bản in chính thức.
- **`UC-5.5: Khóa lịch chính khóa (Freeze Schedule)`** *(Cơ bản)*
  - *Backend:* Kích hoạt đóng băng lịch toàn trường. Khóa cứng toàn bộ các khung giờ đã gán, ngăn chặn sinh viên và giảng viên đặt đè.

#### 2. Phê Duyệt Cấp Cao & Kế Hoạch Bù Trừ (UC-5.6 $\rightarrow$ UC-5.8)
- **`UC-5.6: Xem danh sách yêu cầu vượt thẩm quyền (Escalated Queue)`** *(Cơ bản)*
  - *Frontend:* Tiếp nhận các đơn mượn do Quản lý CSVC chuyển cấp lên kèm lý do giải trình.
- **`UC-5.7: Phê duyệt yêu cầu đặc biệt`** *(Trung bình)*
  - *Backend:* Phòng Đào tạo duyệt các đơn mượn trùng lịch chính khóa, mượn $\ge 3$ phòng, mượn sau 21h, thiết bị $> 50$ triệu VNĐ.
- **`UC-5.8: Điều chỉnh phân bổ giữa kỳ & Kế hoạch bù trừ (Compensation Plan)`** *(Nâng cao)*
  - *Backend:* Khi phòng học bị sự cố đột xuất hoặc lớp tăng sĩ số: Tự động tìm phòng thay thế tương đương (Phương án A) hoặc tích hợp link học Online MS Teams/Zoom (Phương án B), tự động gửi thông báo khẩn đến toàn bộ sinh viên trong lớp.

#### 3. Phân Bổ Phòng Thi & Báo Cáo Chuyên Khoa (UC-5.9, UC-5.10)
- **`UC-5.9: Phân bổ phòng thi kết thúc học phần tự động`** *(Nâng cao)*
  - *Backend:* Ràng buộc: chia đôi sĩ số phòng để đảm bảo khoảng cách ngồi thi, mỗi phòng $\ge 2$ giám thị, sinh viên cùng lớp không ngồi chung phòng nếu thi trắc nghiệm, giãn cách 30 phút giữa 2 ca thi để dọn phòng, phòng thi bắt buộc có camera giám sát.
- **`UC-5.10: Báo cáo phân tích sử dụng giảng đường theo Khoa/Viện`** *(Trung bình)*
  - *Backend:* Thống kê số giờ giảng dạy, tỷ lệ tận dụng phòng Lab chuyên ngành, so sánh định mức giữa các khoa để Ban Giám Hiệu phân bổ ngân sách nâng cấp CSVC công bằng.

#### 4. Báo Cáo Thống Kê Hoạt Động Toàn Trường (UC-3.22 $\rightarrow$ UC-3.25)
- **`UC-3.22: Báo cáo tỷ lệ sử dụng phòng & Biểu đồ nhiệt (Heatmap)`** *(Trung bình)*
  - *Frontend:* Biểu đồ nhiệt hiển thị tỷ lệ lấp đầy theo giờ trong tuần (07:00 - 21:00), biểu đồ cột so sánh giữa các tòa nhà, xếp hạng phòng được mượn nhiều nhất.
- **`UC-3.23: Báo cáo tình trạng tài sản & Cảnh báo bảo hành`** *(Cơ bản)*
  - *Backend:* Thống kê tỷ lệ thiết bị theo trạng thái hoạt động, danh sách thiết bị sắp hết hạn bảo hành, nhóm thiết bị hay hỏng nhất.
- **`UC-3.24: Báo cáo hiệu suất xử lý sự cố & Cam kết SLA`** *(Trung bình)*
  - *Backend:* Biểu đồ MTTR (Mean Time To Repair), tỷ lệ hoàn thành đúng hạn SLA theo từng tháng, điểm đánh giá hài lòng trung bình.
- **`UC-3.25: Xuất báo cáo tổng hợp PDF & Excel chuẩn in ấn`** *(Trung bình)*
  - *Backend:* Xuất file PDF có đầy đủ header trường, logo, bảng số liệu, chữ ký duyệt và file Excel phục vụ lưu trữ văn thư.

#### 5. Hệ Thống Thông Báo & Mock Tích Hợp Bên Ngoài (UC-1.19, UC-1.20, UC-7.1 $\rightarrow$ UC-7.3)
- **`UC-1.19: Trung tâm thông báo người dùng`** *(Cơ bản)*
  - *Frontend:* Badge chuông thông báo, danh sách thông báo kết quả duyệt đơn, tiến độ sự cố, nhắc nhở check-in trước 10 phút.
- **`UC-1.20: Đánh dấu đã đọc thông báo`** *(Cơ bản)*
  - *Backend:* Đánh dấu 1 hoặc tất cả thông báo đã đọc, cập nhật số lượng chưa đọc.
- **`UC-7.1: Mock Webhook đồng bộ thời khóa biểu SIS`** *(Trung bình)*
  - *Backend:* Endpoint nhận dữ liệu TKB tập trung từ hệ thống đào tạo (~100 lớp học phần), tự động thêm mới/cập nhật.
- **`UC-7.2: Dịch vụ gửi Email thông báo tự động (Nodemailer)`** *(Cơ bản)*
  - *Backend:* Gửi email HTML chuẩn có logo trường, hỗ trợ gửi hàng loạt qua hàng đợi.
- **`UC-7.3: Dịch vụ gửi SMS Brandname thông báo khẩn cấp (Mock)`** *(Cơ bản)*
  - *Backend:* Ghi nhận lịch sử gửi tin nhắn SMS cảnh báo cúp điện toàn tòa nhà, báo cháy phục vụ trình diễn demo.

---

## 5. QUY CHUẨN KỸ THUẬT 5 TRỤ CỘT NÂNG CAO (ĐIỂM NHẤN HỘI ĐỒNG)

### Trụ Cột 1: Động Cơ Xếp TKB CSP (Constraint Satisfaction Problem)
- **Thuật toán cốt lõi:** Backtracking kết hợp **MRV (Minimum Remaining Values)** chọn biến có miền giá trị hẹp nhất trước + **Degree Heuristic** ưu tiên lớp sĩ số lớn và phòng thực hành chuyên dụng.
- **Hàm phạt (Soft Constraint Penalty Function):**
  $$P = W_{\text{waste}} \times P_{\text{waste}} + W_{\text{dist}} \times P_{\text{dist}}$$
  Trong đó:
  - $P_{\text{waste}} = \frac{\text{Capacity}_{\text{room}} - \text{Size}_{\text{class}}}{\text{Capacity}_{\text{room}}} \times 100$ (Phạt lãng phí ghế ngồi).
  - $P_{\text{dist}} = -50$ nếu cùng tòa nhà với Khoa quản lý; $P_{\text{dist}} = +30$ nếu khác tòa nhà.

### Trụ Cột 2: Cơ Chế Phân Luồng Duyệt 2 Cấp (Escalation Engine)
- Tự động thẩm định qua ma trận 4 quy tắc ngưỡng định lượng:
  1. `RULE_CURRICULUM`: Trùng lịch chính khóa đã đóng băng.
  2. `RULE_SCALE`: Mượn đồng thời $\ge 3$ phòng hoặc số lượng tham gia $\ge 300$ người.
  3. `RULE_OFF_HOURS`: Kết thúc sau 21:00 hoặc rơi vào ngày Thứ Bảy, Chủ Nhật.
  4. `RULE_HIGH_VALUE`: Mượn thiết bị có nguyên giá $> 50.000.000$ VNĐ.
  $\rightarrow$ Tự động chuyển thẩm quyền phê duyệt từ Quản lý CSVC lên **Phòng Đào Tạo**.

### Trụ Cột 3: Quản Lý Ticket Sự Cố Theo Cam Kết SLA Hành Chính
- **Business Hours Engine:** Đồng hồ tính giờ chỉ đếm trong khung giờ làm việc: **07:30 - 17:00 (Thứ Hai đến Thứ Sáu)**. Đóng băng đồng hồ ban đêm và cuối tuần. Riêng mức `Critical` tính 24/7 liên tục ($\le 4$h).
- **Hệ thống cảnh báo sớm 3 giai đoạn:**
  - `ON_TRACK` (0% - 70%): Badge xanh lá cây.
  - `AT_RISK` (70% - 100%): Badge cam nhấp nháy, đẩy WebSocket nhắc nhở trực tiếp.
  - `OVERDUE` ($> 100\%$): Badge đỏ đậm, gửi email cảnh báo Trưởng phòng CSVC, trừ điểm KPI kỹ thuật viên.
- **Nghiệm thu 2 chiều (Double Confirmation):** Người báo hỏng đánh giá 1 - 5 sao và bấm xác nhận trước khi đóng ticket. Tự động đóng sau 48h nếu không phản hồi.

### Trụ Cột 4: Đặt Lịch Định Kỳ & Cấu Trúc Ngoại Lệ Chuẩn iCalendar (RFC 5545)
- Thay vì sinh 15 bản ghi riêng lẻ cho 15 tuần (làm bùng nổ dữ liệu và khó sửa đổi):
  - Collection `booking_series`: Lưu 1 bản ghi cha duy nhất đại diện cho chuỗi lịch cả kỳ.
  - Collection `booking_exceptions`: Chỉ lưu các buổi ngoại lệ bị sửa giờ/đổi phòng (`MODIFIED`) hoặc bị hủy (`CANCELLED`).
  - Hỗ trợ 2 chế độ chỉnh sửa: (1) Chỉ buổi này (*This instance only*), và (2) Buổi này và tất cả buổi sau (*This and following*).

### Trụ Cột 5: Quy Trình 5 Bước Xử Lý Thiết Bị Hư Hỏng & Thanh Lý (R >= 60%)
- **Chỉ số Chi phí Sửa chữa (Repair Ratio):**
  $$R = \left(\frac{\text{Chi phí ước tính linh kiện thay thế}}{\text{Giá trị sổ sách còn lại của thiết bị}}\right) \times 100\%$$
  - Nếu $R < 40\%$: Bắt buộc xuất kho vật tư sửa chữa, kéo dài tuổi thọ tài sản.
  - Nếu $R \ge 60\%$: Khóa mượn ngay lập tức (`PENDING_DISPOSAL`) và kích hoạt **Tiến trình 5 bước theo Ma trận RACI**:
    - *Bước 1 (Kỹ thuật viên - Responsible):* Khảo sát hiện trường, tính $R \ge 60\%$, lập Biên bản Giám định Kỹ thuật.
    - *Bước 2 (Cán bộ CSVC - Accountable):* Tra cứu hồ sơ gốc tài sản, lập Hồ sơ Đề xuất Thanh lý theo đợt.
    - *Bước 3 (Hội đồng thanh lý & BGH - Approver):* Thẩm định tính pháp lý, ra quyết định phê duyệt chính thức.
    - *Bước 4 (CSVC & Phòng Đào tạo - Consulted):* Lập dự trù ngân sách mua sắm bổ sung (Procurement Plan).
    - *Bước 5 (Thủ kho & Admin - Informed):* Nhập kho lô máy mới, dán mã Barcode/QR, phân bổ vào phòng đưa vào sử dụng.

---

## 6. ĐẶC TẢ 12 COLLECTIONS MONGODB

```javascript
// 1. users: Tài khoản người dùng & điểm uy tín
{ email: 1 } (unique), { employeeCode: 1 } (unique), { role: 1 }

// 2. roles: Ma trận vai trò & mảng quyền phân cấp
{ name: 1 } (unique)

// 3. rooms: Không gian kiến trúc Digital Twin & cảm biến IoT
{ code: 1 } (unique), { building: 1, floorNumber: 1 }, { type: 1, capacity: 1 }

// 4. equipments: Danh mục tài sản định danh QR & định giá khấu hao
{ assetCode: 1 } (unique), { qrCodeData: 1 } (unique), { room: 1, status: 1 }

// 5. bookings: Buổi đặt phòng đơn lẻ
{ room: 1, startTime: 1, endTime: 1, status: 1 }, { user: 1, status: 1 }

// 6. booking_series: Chuỗi lịch định kỳ RFC-5545
{ lecturer: 1 }, { room: 1 }

// 7. booking_exceptions: Ngoại lệ của chuỗi đặt lịch
{ seriesId: 1, exceptionDate: 1 } (unique)

// 8. borrow_requests: Đơn mượn thiết bị di động
{ equipment: 1, status: 1 }, { user: 1 }

// 9. tickets: Phiếu sự cố kỹ thuật & đếm ngược SLA
{ ticketCode: 1 } (unique), { status: 1, priority: 1, "slaTracking.resolutionDeadline": 1 }

// 10. maintenance_plans: Kế hoạch bảo dưỡng dự phòng định kỳ
{ targetType: 1, nextDueDate: 1 }

// 11. asset_disposals: Hồ sơ thanh lý tài sản R >= 60%
{ equipment: 1 }, { proposalCode: 1 } (unique), { rRatio: 1 }

// 12. audit_logs: Chuỗi băm kiểm toán SHA-256 bất biến
{ createdAt: -1 }, { user: 1, action: 1 }, { sha256Hash: 1 } (unique)
```
