# RUO UFMS - BỘ KIỂM THỬ TỰ ĐỘNG PHÂN HỆ QUẢN TRỊ NGƯỜI DÙNG (PHASE 1)

Tài liệu đặc tả và tổng hợp các bộ kiểm thử tự động (Automated Unit & E2E Test Suites) cho Phân hệ Quản trị Người dùng (User Management - UC-10) và Hồ sơ Cá nhân (Profile - UC-1.5/1.6).

---

## 1. Danh Sách Bộ Kiểm Thử (43 Test Cases)

| Mã Use Case | Tên Chức Năng | File Kiểm Thử | Số Lượng Test | Trạng Thái |
| :--- | :--- | :--- | :---: | :---: |
| **UC-1.5 / UC-1.6** | User Profile & Update Profile | `test_uc15_uc16.js` | 6 tests | ✅ PASS (100%) |
| **UC-10.1** | Create User & Provisioning | `test_uc10_1.js` | 6 tests | ✅ PASS (100%) |
| **UC-10.2** | User Directory & Activity Tabs | `test_uc10_2.js` | 5 tests | ✅ PASS (100%) |
| **UC-10.3** | User Detail & RBAC Update | `test_uc10_3.js` | 6 tests | ✅ PASS (100%) |
| **UC-10.4** | Update User Role & Invalidate Sessions | `test_uc10_4.js` | 6 tests | ✅ PASS (100%) |
| **UC-10.5** | Toggle Status & Force Reset Password | `test_uc10_5.js` | 6 tests | ✅ PASS (100%) |
| **UC-10.6** | Reset Password & Mandatory Next Login Change | `test_uc10_6.js` | 8 tests | ✅ PASS (100%) |

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

## 3. Cách Thức Chạy Kiểm Thử

```bash
# Chạy toàn bộ 43 test cases của phân hệ
npm test

# Chạy riêng kiểm thử UC-10.6
node server/src/tests/test_uc10_6.js
```
