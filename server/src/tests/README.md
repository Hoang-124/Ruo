# RUO UFMS - BỘ KIỂM THỬ TỰ ĐỘNG PHÂN HỆ QUẢN TRỊ NGƯỜI DÙNG (PHASE 1)

Tài liệu đặc tả và tổng hợp các bộ kiểm thử tự động (Automated Unit & E2E Test Suites) cho Phân hệ Quản trị Người dùng (User Management - UC-10) và Hồ sơ Cá nhân (Profile - UC-1.5/1.6).

---

## 1. Danh Sách Bộ Kiểm Thử (72 Test Cases)

| Mã Use Case | Tên Chức Năng | File Kiểm Thử | Số Lượng Test | Trạng Thái |
| :--- | :--- | :--- | :---: | :---: |
| **UC-1.5 / UC-1.6** | User Profile & Update Profile | `test_uc15_uc16.js` | 6 tests | ✅ PASS (100%) |
| **UC-10.1** | Create User & Provisioning | `test_uc10_1.js` | 6 tests | ✅ PASS (100%) |
| **UC-10.2** | User Directory & Activity Tabs | `test_uc10_2.js` | 5 tests | ✅ PASS (100%) |
| **UC-10.3** | User Detail & RBAC Update | `test_uc10_3.js` | 6 tests | ✅ PASS (100%) |
| **UC-10.4** | Update User Role & Invalidate Sessions | `test_uc10_4.js` | 6 tests | ✅ PASS (100%) |
| **UC-10.5** | Toggle Status & Force Reset Password | `test_uc10_5.js` | 6 tests | ✅ PASS (100%) |
| **UC-10.6** | Reset Password & Mandatory Next Login Change | `test_uc10_6.js` | 8 tests | ✅ PASS (100%) |
| **UC-10.7** | Role Approval, Appointment & Master Data | `test_uc10_7.js` | 7 tests | ✅ PASS (100%) |
| **UC-12.1** | Roles Matrix, Dynamic RBAC & Equipment Guards | `test_uc12_1.js` | 7 tests | ✅ PASS (100%) |
| **UC-12.2** | Update Perms, Module Toggles & Equipment Pagination | `test_uc12_2.js` | 7 tests | ✅ PASS (100%) |
| **UC-3.1** | Create Equipment & Initial Lifecycle | `test_uc3_1.js` | 8 tests | ✅ PASS (100%) |

---

## 2. Đặc Tả Nghiệp Vụ UC-10.6 (Reset Password & Enforce Password Change)

1. **Cấp mật khẩu ngẫu nhiên**:
   - Endpoint: `POST /api/auth/users/:id/reset-password` (hoặc `POST /api/admin/users/:id/reset-password`).
   - Tự động sinh mật khẩu ngẫu nhiên mạnh (chữ hoa, chữ thường, số, ký tự đặc biệt) có độ dài tùy chọn (mặc định 10 ký tự).
   - Đặt cờ `force_change_pw: true` trên tài khoản người dùng trong MongoDB.
   - Hủy bỏ toàn bộ Refresh Tokens hiện có (`revokeUserSessions`) để ngắt các phiên đăng nhập cũ.

2. **Quy trình đăng nhập bắt buộc đổi mật khẩu**:
   - Khi người dùng đăng nhập bằng mật khẩu tạm, API `/api/auth/login` trả về payload kèm cờ `force_change_pw: true`.
   - `AuthContext` ghi nhận trạng thái và kích hoạt component `MandatoryPasswordChangeModal`.
   - Giao diện bị khóa cứng (backdrop không thể đóng, phím Escape bị chặn) cho đến khi người dùng đổi mật khẩu mới thành công hoặc đăng xuất.

3. **Cập nhật mật khẩu mới**:
   - Endpoint: `PUT /api/auth/change-password`.
   - Kiểm tra mật khẩu hiện tại, chống trùng mật khẩu cũ, yêu cầu độ mạnh tối thiểu 6 ký tự.
   - Khi đổi thành công, hệ thống tự động gỡ bỏ cờ `force_change_pw: false` và cấp lại Access Token mới.

4. **Nhật ký kiểm toán (Audit Trail)**:
   - Mọi thao tác reset mật khẩu đều được lưu trữ tại bảng `AuditLog` với action `ADMIN_RESET_PASSWORD`, kèm ID người thực hiện và IP đăng nhập.

---

## 3. Đặc Tả Nghiệp Vụ UC-12.1 (Roles Matrix & Dynamic RBAC)

1. **Ma trận quyền hạn 4 vai trò chuẩn**:
   - Endpoint: `GET /api/admin/roles` (hoặc `GET /api/roles`).
   - Tự động đồng bộ và seed 4 vai trò chính thức: Admin (`admin`), Quản lý CSVC (`facility_manager`), Kỹ thuật viên (`technician`), Giảng viên (`lecturer`).
   - Hỗ trợ lọc theo vai trò qua query parameter (ví dụ `?name=lecturer`).

2. **Ràng buộc phân quyền động trên Collection Equipments**:
   - Endpoint: `POST /api/equipments`.
   - Kết hợp bảo vệ 2 tầng: `requireRole` (Admin, Quản lý, KTV) và `requirePermission('equipment:create')`.
   - Chặn lập tức các yêu cầu từ Giảng viên hoặc vai trò bị thu hồi quyền tạo thiết bị với mã lỗi HTTP 403.

---

## 4. Đặc Tả Nghiệp Vụ UC-12.2 (Update Perms, Module Toggles & Equipment Pagination)

1. **Điều chỉnh phân quyền động Live Policy**:
   - Endpoint: `PUT /api/admin/roles/:id/permissions` (hoặc `PUT /api/roles/:id`).
   - Hỗ trợ bật/tắt toàn bộ module (`action: 'ENABLE_MODULE' | 'DISABLE_MODULE' | 'TOGGLE_MODULE'`).
   - Phản hồi tức thời với cờ `liveEnforced: true`, `policyVersion`, và thống kê diff chi tiết (`added`, `revoked`).
   - Cơ chế bảo vệ **Admin Self-Lockout**: Không cho phép tước quyền `role:update` của chính Admin (`ADMIN_SELF_LOCKOUT_PREVENTED`).

2. **Phân trang Pagination & Live RBAC Guard trên GET /api/equipments**:
   - Trả về đầy đủ metadata: `page`, `limit`, `total`, `totalPages`, `hasPrevPage`, `hasNextPage`.
   - Bảo vệ phân quyền động: Khi người dùng được xác thực bị thu hồi `equipment:read`, hệ thống lập tức trả về HTTP 403 Forbidden.

---

## 5. Đặc Tả Nghiệp Vụ UC-3.1 (Create Equipment & Lifecycle Onboarding)

1. **Khởi tạo tài sản mới với ràng buộc toàn vẹn chuẩn**:
   - Endpoint: `POST /api/equipments`.
   - Mã tài sản (`code`): Tự động chuẩn hóa viết hoa, kiểm tra tính duy nhất (trả về HTTP 409 nếu trùng).
   - Mã QR chuẩn hóa (`qr_code`): Nếu để trống, tự động gán fallback định dạng chuẩn `QR-${cleanCode}`; kiểm tra tính duy nhất.
   - Ràng buộc thời hạn bảo hành: `warranty_expiry >= purchase_date` (trả về HTTP 400 nếu ngày hết hạn bảo hành trước ngày mua).
   - Tự động ghi nhận chuyển dịch ban đầu: Khi gắn tài sản vào phòng (`room_id`), tự động tạo bản ghi `EquipmentMovement` dạng `INITIAL_ALLOCATION` kèm ghi chú nhập kho ban đầu.
   - Khởi tạo vòng đời: Tự động đính kèm giai đoạn `ONBOARDING` vào lịch sử vòng đời của thiết bị.
   - Phân quyền nghiêm ngặt: Chỉ cho phép Admin, Quản lý CSVC và Kỹ thuật viên (chặn Giảng viên với mã lỗi HTTP 403).

2. **Truy vấn chi tiết thiết bị & Dòng thời gian vòng đời 5 giai đoạn**:
   - Endpoint: `GET /api/equipments/:id`.
   - Hỗ trợ tra cứu linh hoạt kép: Bằng MongoDB ObjectId hoặc bằng Mã tài sản viết hoa.
   - Dòng thời gian vòng đời hoàn chỉnh 5 giai đoạn: `ONBOARDING` (Nhập kho), `ALLOCATION` (Bàn giao/Chuyển phòng), `INCIDENT` (Báo cáo sự cố), `REPAIR` (Sửa chữa bảo dưỡng), `DISPOSAL` (Thanh lý tài sản).
   - Tính toán chỉ số bảo hành & Khấu hao: Bổ sung `warrantyInfo` (ngày còn lại, trạng thái hết hạn) và `depreciation` (tỷ lệ khấu hao đường thẳng, giá trị còn lại).

---

## 6. Cách Thức Chạy Kiểm Thử

```bash
# Chạy toàn bộ 72 test cases của hệ thống
npm test

# Chạy riêng kiểm thử UC-3.1 (Create Equipment & Initial Lifecycle)
npm run test:uc3_1
# hoặc
node src/tests/test_uc3_1.js

# Chạy riêng kiểm thử UC-12.1 (Roles Matrix & Dynamic RBAC)
npm run test:rbac

# Chạy riêng kiểm thử UC-12.2 (Update Perms & Equipment Pagination)
npm run test:rbac2
```
