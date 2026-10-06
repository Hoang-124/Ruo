# GIẢI THÍCH CHI TIẾT 6 MODULE DATABASE — DỰ ÁN RUO

> 24 collections · 56 Use Cases · 3 Actors: Lecturer, Maintenance Staff, Admin

---

## MODULE 1: AUTH & USER MANAGEMENT

**File:** [1_auth.dbml](file:///d:/Ruo/dbml/1_auth.dbml)
**Actor:** Tất cả
**UC liên quan:** Log in, Log out, Recover password, Update personal profile, Change password

### 1.1 Bảng `users` — Tất cả người dùng hệ thống

Mỗi row = 1 tài khoản (giảng viên, nhân viên bảo trì, hoặc admin).

| Field | Type | Bắt buộc | Giải thích |
|:---|:---|:---:|:---|
| `_id` | ObjectId | ✅ | MongoDB tự tạo |
| `code` | String | ✅ | Mã định danh nội bộ. VD: `GV001`, `BT003`, `AD001`. Unique, không đổi được. |
| `email` | String | ✅ | Email đăng nhập. Unique. VD: `nguyenvana@university.edu.vn` |
| `password_hash` | String | ✅ | Mật khẩu đã mã hóa BCrypt (12 rounds). KHÔNG BAO GIỜ lưu plain text. |
| `full_name` | String | ✅ | Họ tên đầy đủ. VD: `Nguyễn Văn A` |
| `phone` | String | | SĐT. VD: `0901234567` |
| `avatar` | String | | URL ảnh đại diện trên cloud storage |
| `department` | String | ✅ | Khoa/Phòng ban. VD: `Khoa CNTT`, `Phòng Hành chính` |
| `role` | String | ✅ | Chỉ 1 trong 3 giá trị: `lecturer`, `maintenance_staff`, `admin` |
| `status` | String | ✅ | `active` = hoạt động, `locked` = bị khóa (sai pass 5 lần hoặc admin khóa) |
| `force_change_pw` | Boolean | ✅ | `true` = bắt đổi mật khẩu lần đăng nhập tiếp (khi admin reset hoặc forgot password) |
| `last_login_at` | Date | | Thời điểm đăng nhập gần nhất, cập nhật mỗi lần login thành công |
| `login_count` | Number | ✅ | Tổng số lần đăng nhập thành công. Default: 0 |
| `created_at` | Date | ✅ | Thời điểm tạo tài khoản |
| `updated_at` | Date | ✅ | Cập nhật khi sửa profile |

**Dữ liệu mẫu:**
```json
{
  "_id": "ObjectId('507f1f77bcf86cd799439011')",
  "code": "GV001",
  "email": "tranthib@hcmute.edu.vn",
  "password_hash": "$2b$12$LJ3G...",
  "full_name": "Trần Thị B",
  "phone": "0912345678",
  "avatar": "/uploads/avatars/gv001.jpg",
  "department": "Khoa CNTT",
  "role": "lecturer",
  "status": "active",
  "force_change_pw": false,
  "last_login_at": "2026-09-30T08:15:00Z",
  "login_count": 47,
  "created_at": "2026-01-15T00:00:00Z",
  "updated_at": "2026-09-28T10:30:00Z"
}
```

**Business Rules:**
- `code` không đổi được sau khi tạo
- `email` là trường duy nhất dùng để đăng nhập (không login bằng code)
- Khi `status = locked`, user không thể đăng nhập, chỉ Admin mới unlock được
- Khi Admin reset password → `force_change_pw = true` → user phải đổi pass ngay sau khi login

---

### 1.2 Bảng `roles` — Phân quyền chi tiết

Định nghĩa 3 vai trò cố định. Mỗi role có mảng `permissions` mà middleware kiểm tra trước mỗi API call.

| Field | Type | Giải thích |
|:---|:---|:---|
| `_id` | ObjectId | PK |
| `name` | String | `lecturer` hoặc `maintenance_staff` hoặc `admin`. Unique. |
| `permissions` | [String] | Mảng quyền theo format `resource:action`. VD: `equipment:create` |

**Dữ liệu mẫu (3 records mặc định):**

```json
// Role: Lecturer
{
  "name": "lecturer",
  "permissions": [
    "incident:create",        // Báo sự cố
    "incident:read_own",      // Xem sự cố mình đã báo
    "repair:rate",            // Đánh giá chất lượng sửa
    "room:read",              // Xem thông tin phòng
    "equipment:read",         // Xem thiết bị trong phòng
    "notification:read_own",  // Xem thông báo
    "profile:update"          // Sửa profile
  ]
}

// Role: Maintenance Staff
{
  "name": "maintenance_staff",
  "permissions": [
    "equipment:create", "equipment:read", "equipment:update", "equipment:import",
    "equipment:qr",
    "room:read", "room:layout",
    "transfer:create", "transfer:approve", "transfer:complete", "transfer:read",
    "repair:read", "repair:assign", "repair:log", "repair:close", "repair:escalate",
    "parts:request", "parts:approve",
    "warranty:read", "warranty:update",
    "maintenance:create", "maintenance:execute", "maintenance:log",
    "inventory:create", "inventory:scan", "inventory:reconcile",
    "disposal:propose", "disposal:approve_staff",
    "dashboard:read",
    "notification:read_own",
    "profile:update"
  ]
}

// Role: Admin
{
  "name": "admin",
  "permissions": [
    "user:create", "user:read", "user:update", "user:deactivate", "user:reset_password",
    "role:read", "role:update",
    "category:create", "category:read", "category:update",
    "supplier:create", "supplier:read", "supplier:update",
    "repair_unit:create", "repair_unit:read", "repair_unit:update",
    "spare_part:create", "spare_part:read", "spare_part:update",
    "equipment:create", "equipment:read", "equipment:import",
    "report:kpi", "report:export", "report:health",
    "audit:read", "audit:verify", "audit:export",
    "system:health", "system:config",
    "notification_template:read", "notification_template:update",
    "disposal:authorize",
    "notification:read_own",
    "profile:update"
  ]
}
```

**Cách middleware kiểm tra:**
```
User gọi API POST /api/repairs → cần permission "repair:assign"
  → Server đọc user.role = "maintenance_staff"
  → Tra roles collection → permissions có "repair:assign" ✅ → Cho phép
  → Nếu user.role = "lecturer" → permissions KHÔNG có "repair:assign" ❌ → 403 Forbidden
```

---

### 1.3 Bảng `refresh_tokens` — Quản lý phiên đăng nhập

Mỗi lần login tạo 1 cặp: **access_token** (JWT, 15 phút, KHÔNG lưu DB) + **refresh_token** (lưu DB, 7 ngày).

| Field | Type | Giải thích |
|:---|:---|:---|
| `_id` | ObjectId | PK |
| `user_id` | ObjectId | FK → users. User nào sở hữu token này. |
| `token` | String | Hash của refresh token (SHA-256). KHÔNG lưu token gốc. |
| `device_info` | String | User-Agent. VD: `Mozilla/5.0 (Windows NT 10.0) Chrome/120` |
| `ip_address` | String | IP lúc login. VD: `192.168.1.100` |
| `expires_at` | Date | Hết hạn sau 7 ngày. MongoDB TTL index tự xóa khi hết hạn. |
| `is_revoked` | Boolean | `true` = đã bị vô hiệu (user logout hoặc admin force logout). |
| `created_at` | Date | Thời điểm tạo |

**Business Rules:**
- Mỗi user có thể có **nhiều** refresh_tokens (đăng nhập trên nhiều thiết bị)
- **Logout 1 thiết bị:** `is_revoked = true` cho token đó
- **Logout tất cả:** `is_revoked = true` cho TẤT CẢ token của user_id đó
- Access token hết hạn → client gửi refresh_token → server kiểm tra DB → nếu valid → cấp access_token mới

**Dữ liệu mẫu:**
```json
{
  "user_id": "ObjectId('507f1f77bcf86cd799439011')",
  "token": "a1b2c3d4e5f6...",
  "device_info": "Chrome/120 on Windows",
  "ip_address": "192.168.1.50",
  "expires_at": "2026-10-07T08:15:00Z",
  "is_revoked": false,
  "created_at": "2026-09-30T08:15:00Z"
}
```

---

### 1.4 Bảng `login_history` — Lịch sử đăng nhập

Ghi lại MỌI lần đăng nhập (kể cả thất bại) để audit bảo mật.

| Field | Type | Giải thích |
|:---|:---|:---|
| `_id` | ObjectId | PK |
| `user_id` | ObjectId | FK → users |
| `ip_address` | String | IP đăng nhập |
| `user_agent` | String | Trình duyệt / thiết bị |
| `status` | String | `success` = thành công, `failed` = sai pass, `locked` = tài khoản bị khóa |
| `failure_reason` | String | Chỉ khi `status ≠ success`. VD: `wrong_password`, `account_locked`, `rate_limited` |
| `created_at` | Date | TTL 90 ngày — MongoDB tự xóa sau 3 tháng |

**Business Rules:**
- Dùng để phát hiện **brute force**: nếu 5 records liên tiếp có `status = failed` → lock user
- Admin có thể xem lịch sử đăng nhập của bất kỳ user nào
- Tự động xóa sau 90 ngày (TTL index) để không phình database

---

## MODULE 2: MASTER DATA & CATALOG

**File:** [2_master_data.dbml](file:///d:/Ruo/dbml/2_master_data.dbml)
**Actor:** Admin (tạo/sửa), Maint Staff & Lecturer (đọc)
**UC liên quan:** Define equipment category, Register supplier, Register repair unit, Stock spare parts, Check room equipment

### 2.1 Bảng `categories` — Phân loại thiết bị

Mỗi thiết bị thuộc 1 loại. Dùng để lọc, thống kê, lập kế hoạch bảo trì theo nhóm.

| Field | Type | Giải thích |
|:---|:---|:---|
| `_id` | ObjectId | PK |
| `code` | String | Mã loại. Unique. VD: `CAT-TV`, `CAT-AC`, `CAT-PC` |
| `name` | String | Tên hiển thị. VD: `Tivi`, `Điều hòa`, `Máy tính` |
| `description` | String | Mô tả thêm. VD: `Thiết bị hiển thị hình ảnh trong phòng học` |

**Dữ liệu mẫu:**
```json
[
  { "code": "CAT-TV",  "name": "Tivi",       "description": "Màn hình hiển thị" },
  { "code": "CAT-PJ",  "name": "Máy chiếu",  "description": "Projector phòng học" },
  { "code": "CAT-AC",  "name": "Điều hòa",   "description": "Máy lạnh / quạt" },
  { "code": "CAT-PC",  "name": "Máy tính",   "description": "Desktop / laptop" },
  { "code": "CAT-DK",  "name": "Bàn ghế",    "description": "Nội thất phòng học" },
  { "code": "CAT-TB",  "name": "Thiết bị Lab","description": "Dụng cụ phòng thí nghiệm" }
]
```

---

### 2.2 Bảng `suppliers` — Nhà cung cấp

Nơi mua thiết bị. Liên kết với `equipment` để biết TB mua từ đâu, và `spare_parts` để đặt linh kiện.

| Field | Type | Giải thích |
|:---|:---|:---|
| `_id` | ObjectId | PK |
| `code` | String | Mã NCC. VD: `SUP-001` |
| `name` | String | Tên công ty. VD: `Công ty TNHH Thiết bị Giáo dục ABC` |
| `phone` | String | SĐT liên hệ |
| `email` | String | Email |
| `address` | String | Địa chỉ |
| `contact` | String | Tên người liên hệ chính. VD: `Anh Minh - Phòng KD` |

---

### 2.3 Bảng `repair_units` — Đơn vị sửa chữa bên ngoài

Khi thiết bị hỏng nặng, cần gửi ra ngoài sửa. Bảng này lưu danh sách các xưởng/trung tâm sửa chữa.

| Field | Type | Giải thích |
|:---|:---|:---|
| `_id` | ObjectId | PK |
| `code` | String | VD: `RU-001` |
| `name` | String | VD: `Trung tâm BH Samsung`, `Xưởng điện lạnh Hùng Phát` |
| `specialty` | String | Chuyên môn. VD: `Điện lạnh`, `Điện tử`, `Máy tính` |
| `phone` | String | |
| `address` | String | |

---

### 2.4 Bảng `rooms` — Phòng học / Lab / Kho

Mỗi row = 1 phòng vật lý trong trường.

| Field | Type | Giải thích |
|:---|:---|:---|
| `_id` | ObjectId | PK |
| `code` | String | Mã phòng. VD: `A101`, `B305`, `LAB-201` |
| `name` | String | Tên phòng. VD: `Phòng học A101`, `Lab Mạng máy tính` |
| `building` | String | Tòa nhà. VD: `A`, `B`, `C` |
| `floor` | Number | Tầng. VD: `1`, `3`, `5` |
| `room_type` | String | `lecture` = phòng học, `lab` = phòng TN, `office` = văn phòng, `storage` = kho |
| `capacity` | Number | Sức chứa (người). VD: `40`, `30` |
| `area` | Number | Diện tích m². VD: `56.5` |
| `layout_image` | String | URL ảnh sơ đồ bố trí phòng (CAD). Maint Staff upload. |
| `department` | String | Khoa/bộ phận quản lý. VD: `Khoa CNTT` |
| `status` | String | `available` = đang dùng, `maintenance` = đang sửa, `inactive` = ngừng sử dụng |
| `created_at` | Date | |
| `updated_at` | Date | |

**Dữ liệu mẫu:**
```json
{
  "code": "A101",
  "name": "Phòng học A101",
  "building": "A",
  "floor": 1,
  "room_type": "lecture",
  "capacity": 40,
  "area": 56.5,
  "layout_image": "/uploads/rooms/A101_layout.png",
  "department": "Khoa CNTT",
  "status": "available"
}
```

---

### 2.5 Bảng `spare_parts` — Linh kiện / vật tư thay thế

Kho linh kiện dùng khi sửa chữa thiết bị.

| Field | Type | Giải thích |
|:---|:---|:---|
| `_id` | ObjectId | PK |
| `code` | String | Mã linh kiện. VD: `SP-BULB-01`, `SP-CABLE-HDMI` |
| `name` | String | Tên. VD: `Bóng đèn máy chiếu Epson`, `Cáp HDMI 2m` |
| `stock` | Number | Tồn kho hiện tại. Giảm khi xuất cho sửa chữa. |
| `min_stock` | Number | Ngưỡng cảnh báo. Khi `stock ≤ min_stock` → hệ thống cảnh báo hết hàng. |
| `price` | Number | Đơn giá (VNĐ). VD: `350000` |
| `unit` | String | Đơn vị tính. VD: `Cái`, `Bộ`, `Hộp`, `Mét` |
| `supplier_id` | ObjectId | FK → suppliers. Mua từ NCC nào. |

**Business Rules:**
- Khi `parts_request` được approve → `stock` tự động giảm theo số lượng xuất
- Khi `stock ≤ min_stock` → tạo notification cho Maint Staff
- Admin là người thêm/sửa danh mục linh kiện (UC: D-10 Stock spare parts)

---

## MODULE 3: EQUIPMENT, TRANSFER & DISPOSAL

**File:** [3_equipment.dbml](file:///d:/Ruo/dbml/3_equipment.dbml)
**Actor:** Maintenance Staff (chính), Admin (oversight)
**UC liên quan:** Register/Edit/Import equipment, Generate/Scan QR, Initiate/Approve/Complete transfer, Propose/Approve disposal, Plan procurement, Receive replacement

### 3.1 Bảng `equipment` — Thiết bị (BẢNG TRUNG TÂM)

**Bảng quan trọng nhất của hệ thống.** Mỗi row = 1 thiết bị vật lý có mã QR riêng.

| Field | Type | Giải thích |
|:---|:---|:---|
| `_id` | ObjectId | PK |
| `code` | String | Mã tài sản nội bộ. Unique. VD: `TB-2026-001`, `TB-2026-002`. Format: `TB-{năm}-{số thứ tự}` |
| `qr_code` | String | Nội dung mã QR. Unique. Thường = `code` hoặc URL: `https://ruo.edu.vn/e/TB-2026-001` |
| `serial_number` | String | S/N của nhà sản xuất. VD: `SN-EPSON-X51-2024-00123` |
| `name` | String | Tên thiết bị. VD: `Máy chiếu Epson X51+`, `Điều hòa Daikin 18000BTU` |
| `brand` | String | Hãng. VD: `Epson`, `Daikin`, `Dell` |
| `model` | String | Model. VD: `EB-X51+`, `FTXS50GVMV` |
| `category_id` | ObjectId | FK → categories. Thuộc loại nào (Máy chiếu, Điều hòa...) |
| `room_id` | ObjectId | FK → rooms. Đang ở phòng nào. Thay đổi khi transfer. |
| `supplier_id` | ObjectId | FK → suppliers. Mua từ NCC nào. |
| `price` | Number | Giá mua (VNĐ). VD: `15000000` (15 triệu) |
| `purchase_date` | Date | Ngày mua |
| `warranty_expiry` | Date | Hạn bảo hành. VD: `2028-06-15` |
| `warranty_status` | String | `active` = còn BH, `expired` = hết BH, `extended` = BH mở rộng (sau sửa chữa) |
| `images` | [String] | URLs ảnh thiết bị. Tối đa 5 ảnh. |
| `depreciation_rate` | Number | % khấu hao/năm. VD: `20` = 20%/năm → sau 5 năm = 0 |
| `status` | String | Trạng thái hiện tại (xem bên dưới) |
| `created_at` | Date | |
| `updated_at` | Date | |

**Các trạng thái (status) và chuyển đổi:**
```
active ──→ repairing ──→ active          (sửa xong, trả về)
active ──→ transferring ──→ active       (chuyển phòng xong)
active ──→ disposed                       (thanh lý hoàn tất)
active ──→ lost                           (mất khi kiểm kê)
repairing ──→ disposed                    (hỏng không sửa được)
```

**Dữ liệu mẫu:**
```json
{
  "code": "TB-2026-001",
  "qr_code": "TB-2026-001",
  "serial_number": "SN-EPSON-X51-001",
  "name": "Máy chiếu Epson EB-X51+",
  "brand": "Epson",
  "model": "EB-X51+",
  "category_id": "ObjectId → CAT-PJ",
  "room_id": "ObjectId → A101",
  "supplier_id": "ObjectId → SUP-001",
  "price": 15000000,
  "purchase_date": "2024-06-15",
  "warranty_expiry": "2026-06-15",
  "warranty_status": "active",
  "images": ["/uploads/equipment/tb-2026-001-1.jpg"],
  "depreciation_rate": 20,
  "status": "active"
}
```

---

### 3.2 Bảng `transfers` — Phiếu điều chuyển thiết bị

Khi cần chuyển thiết bị từ phòng A sang phòng B.

| Field | Type | Giải thích |
|:---|:---|:---|
| `_id` | ObjectId | PK |
| `equipment_id` | ObjectId | FK → equipment. TB nào cần chuyển. |
| `from_room_id` | ObjectId | FK → rooms. Phòng hiện tại. |
| `to_room_id` | ObjectId | FK → rooms. Phòng đích. |
| `requested_by` | ObjectId | FK → users. Maint Staff tạo phiếu. |
| `approved_by` | ObjectId | FK → users. Maint Staff senior duyệt. Null khi chưa duyệt. |
| `completed_by` | ObjectId | FK → users. Người xác nhận đã chuyển xong. |
| `reason` | String | Lý do. VD: `Phòng A101 đóng cửa sửa chữa, chuyển tạm sang A102` |
| `reject_reason` | String | Lý do từ chối (nếu rejected). VD: `Phòng đích đã đủ thiết bị` |
| `status` | String | `pending` → `approved` → `completed` hoặc `pending` → `rejected` |
| `created_at` | Date | Ngày tạo phiếu |
| `approved_at` | Date | Ngày duyệt |
| `completed_at` | Date | Ngày hoàn tất chuyển |

**Flow chi tiết:**
```
① Maint Staff tạo phiếu:
   status = 'pending'
   equipment.status = 'transferring'

② Maint Staff senior duyệt:
   approved_by = senior._id
   status = 'approved'
   approved_at = now()

   HOẶC từ chối:
   reject_reason = "Phòng đích không phù hợp"
   status = 'rejected'
   equipment.status = 'active' (hoàn lại)

③ Maint Staff hoàn tất:
   completed_by = staff._id
   status = 'completed'
   completed_at = now()
   equipment.room_id = to_room_id    ← CẬP NHẬT PHÒNG
   equipment.status = 'active'
```

---

### 3.3 Bảng `disposals` — Quy trình thanh lý

Khi thiết bị hết giá trị sử dụng hoặc hỏng không sửa được → thanh lý qua quy trình 5 bước.

| Field | Type | Giải thích |
|:---|:---|:---|
| `_id` | ObjectId | PK |
| `equipment_id` | ObjectId | FK → equipment. TB cần thanh lý. |
| `proposed_by` | ObjectId | FK → users. Maint Staff đề xuất. |
| `staff_approved_by` | ObjectId | FK → users. Maint Staff senior duyệt nội bộ. |
| `admin_approved_by` | ObjectId | FK → users. Admin phê duyệt cấp BGH. |
| `current_step` | Number | Bước hiện tại (1→5). |
| `reason` | String | Lý do thanh lý. VD: `Máy chiếu hỏng mainboard, chi phí sửa > 70% giá mới` |
| `decision_number` | String | Số quyết định thanh lý. VD: `QĐ-TL-2026-015` |
| `recovery_value` | Number | Giá trị thu hồi (bán phế liệu). VD: `500000` |
| `procurement_plan` | String | Kế hoạch mua TB thay thế. VD: `Mua máy chiếu Epson X51+ mới, dự kiến Q4/2026` |
| `replacement_equipment_id` | ObjectId | FK → equipment. TB mới thay thế (sau khi mua). |
| `status` | String | Trạng thái quy trình (xem flow) |
| `proposed_at` | Date | |
| `staff_approved_at` | Date | |
| `admin_approved_at` | Date | |
| `completed_at` | Date | |

**Flow 5 bước:**
```
Bước 1: PROPOSE      → Maint Staff đề xuất    → status: 'proposed'
Bước 2: STAFF REVIEW  → Staff senior duyệt     → status: 'staff_reviewing' → 'admin_reviewing'
Bước 3: ADMIN REVIEW  → Admin phê duyệt BGH    → status: 'admin_reviewing' → 'procuring'
Bước 4: PROCURE       → Lập kế hoạch mua mới   → status: 'procuring'
Bước 5: COMPLETE      → Nhận TB mới, hoàn tất   → status: 'completed'
                                                   equipment.status = 'disposed'
```

---

### 3.4 Bảng `import_sessions` — Lịch sử import hàng loạt

Khi Maint Staff/Admin upload file Excel để nhập nhiều thiết bị cùng lúc.

| Field | Type | Giải thích |
|:---|:---|:---|
| `_id` | ObjectId | PK |
| `uploaded_by` | ObjectId | FK → users. Ai upload. |
| `file_name` | String | Tên file gốc. VD: `thiet_bi_toa_A_2026.xlsx` |
| `total_rows` | Number | Tổng số dòng trong file |
| `success_count` | Number | Số dòng import thành công |
| `error_count` | Number | Số dòng lỗi |
| `errors` | [Object] | Chi tiết lỗi. VD: `[{row: 5, field: "code", message: "Mã TB-001 đã tồn tại"}]` |
| `status` | String | `validating` → `validated` → `importing` → `completed` hoặc `failed` |
| `created_at` | Date | |
| `completed_at` | Date | |

**Flow:**
```
Upload file → validating (kiểm tra format, trùng code)
  → validated (hiện preview cho user xác nhận)
  → importing (ghi vào equipment collection)
  → completed (thành công) hoặc failed (lỗi nghiêm trọng)
```

---

## MODULE 4: REPAIR FLOW

**File:** [4_repair.dbml](file:///d:/Ruo/dbml/4_repair.dbml)
**Actor:** Lecturer (báo sự cố + đánh giá), Maint Staff (xử lý)
**UC liên quan:** Report malfunction, Track resolution, Evaluate quality, Receive incident, Assign task, Log progress, Close ticket, Escalate overdue, Request/Approve parts

> ⚠️ **Đây là module phức tạp nhất** — kết nối cả 2 actor chính (Lecturer ↔ Maint Staff)

### 4.1 Bảng `repairs` — Phiếu sửa chữa (BẢNG PHỨC TẠP NHẤT)

Mỗi row = 1 sự cố → 1 quy trình sửa chữa hoàn chỉnh. Bảng chia thành **3 vùng logic**:

#### Vùng 1: INCIDENT (Lecturer báo sự cố)

| Field | Type | Giải thích |
|:---|:---|:---|
| `reported_by` | ObjectId | FK → users. **Lecturer** nào báo. |
| `incident_description` | String | Mô tả sự cố bằng ngôn ngữ thường. VD: `"Máy chiếu phòng A101 bật lên nhưng không lên hình, có tiếng kêu lạ"` |
| `incident_images` | [String] | Ảnh Lecturer chụp tại hiện trường. Tối đa 5. |
| `reported_at` | Date | Thời điểm Lecturer bấm gửi báo cáo. |

#### Vùng 2: REPAIR (Maint Staff xử lý kỹ thuật)

| Field | Type | Giải thích |
|:---|:---|:---|
| `equipment_id` | ObjectId | FK → equipment. TB bị hỏng (Staff xác nhận/liên kết). |
| `assigned_to` | ObjectId | FK → users. **Maint Staff** được giao sửa. |
| `repair_unit_id` | ObjectId | FK → repair_units. Gửi ra ngoài sửa ở đâu (nếu có). |
| `damage_level` | String | Staff đánh giá mức độ: `minor` (nhẹ, sửa tại chỗ), `major` (nặng), `critical` (cần thay TB) |
| `description` | String | Mô tả kỹ thuật. VD: `"Bóng đèn projector cháy, cần thay bóng Epson ELPLP96"` |
| `images` | [String] | Ảnh kỹ thuật (Staff chụp trong quá trình sửa) |
| `repair_location` | String | `on_site` = sửa tại chỗ, `external` = gửi ra xưởng |
| `carried_by` | ObjectId | Người mang TB đi xưởng (nếu external) |
| `returned_by` | ObjectId | Người mang TB về (nếu external) |
| `return_room_id` | ObjectId | FK → rooms. Trả về phòng nào. |
| `post_repair_warranty` | Date | BH mới sau sửa (xưởng cấp). VD: thêm 3 tháng. |
| `total_cost` | Number | Tổng chi phí sửa (VNĐ). Tính từ repair_logs + parts. |
| `deadline` | Date | Hạn hoàn thành. |
| `deadline_status` | String | `on_track` (đúng hạn), `at_risk` (sắp trễ, <2 ngày), `overdue` (quá hạn) |

#### Vùng 3: FEEDBACK (Lecturer đánh giá)

| Field | Type | Giải thích |
|:---|:---|:---|
| `feedback_rating` | Number | 1-5 sao. 1=Rất tệ, 5=Xuất sắc. |
| `feedback_comment` | String | Nhận xét. VD: `"Sửa nhanh trong 2 ngày, máy chạy tốt"` |
| `feedback_by` | ObjectId | FK → users. Lecturer đánh giá (thường = reported_by). |
| `feedback_at` | Date | Thời điểm đánh giá. |

#### Trạng thái (status flow):

```
reported ──→ assigned ──→ in_progress ──→ resolved ──→ closed
  (L báo)    (Staff giao)  (Staff sửa)   (Staff xong)  (L đánh giá)
```

**Dữ liệu mẫu hoàn chỉnh:**
```json
{
  "equipment_id": "ObjectId → TB-2026-001 (Máy chiếu A101)",
  
  "reported_by": "ObjectId → GV001 (Trần Thị B)",
  "incident_description": "Máy chiếu phòng A101 bật lên nhưng không lên hình, có tiếng kêu lạ",
  "incident_images": ["/uploads/incidents/inc-001-1.jpg"],
  "reported_at": "2026-09-28T08:30:00Z",
  
  "assigned_to": "ObjectId → BT002 (Nguyễn Văn Tùng)",
  "repair_unit_id": null,
  "damage_level": "major",
  "description": "Bóng đèn projector cháy, thay bóng Epson ELPLP96",
  "images": ["/uploads/repairs/rep-001-tech-1.jpg"],
  "repair_location": "on_site",
  "total_cost": 850000,
  "deadline": "2026-10-02T17:00:00Z",
  "deadline_status": "on_track",
  "status": "closed",
  
  "feedback_rating": 4,
  "feedback_comment": "Sửa xong trong 2 ngày, máy chạy tốt",
  "feedback_by": "ObjectId → GV001",
  "feedback_at": "2026-09-30T14:00:00Z"
}
```

---

### 4.2 Bảng `repair_logs` — Timeline sửa chữa

Mỗi lần có thay đổi trong quá trình sửa → ghi 1 log. Tạo thành **timeline** hoàn chỉnh.

| Field | Type | Giải thích |
|:---|:---|:---|
| `repair_id` | ObjectId | FK → repairs. Thuộc phiếu sửa nào. |
| `action` | String | `reported` · `assigned` · `in_progress` · `resolved` · `closed` · `escalated` |
| `performed_by` | ObjectId | FK → users. Ai thực hiện action này. |
| `description` | String | Chi tiết. VD: `"Đã kiểm tra, xác định bóng đèn cháy"` |
| `cost` | Number | Chi phí phát sinh lần này. VD: `350000` (tiền bóng đèn) |
| `parts_used` | [Object] | Linh kiện đã dùng. VD: `[{part_id: "SP-BULB-01", quantity: 1}]` |
| `images` | [String] | Ảnh tiến độ |
| `timestamp` | Date | Thời điểm |

**Timeline mẫu cho 1 phiếu sửa:**
```
09:00 → reported   (GV001): "Máy chiếu không lên hình"
09:30 → assigned   (BT001): "Giao cho Tùng xử lý"
10:15 → in_progress(BT002): "Đã kiểm tra, bóng đèn cháy. Xuất bóng từ kho."
                              cost: 350000, parts_used: [{SP-BULB-01, qty:1}]
14:00 → in_progress(BT002): "Đã thay bóng, kiểm tra hoạt động OK"
                              images: [ảnh máy chiếu hoạt động]
15:00 → resolved   (BT002): "Hoàn tất sửa chữa"
                              cost: 500000 (công thợ)
─── Ngày hôm sau ───
08:00 → closed     (GV001): feedback_rating: 4, "Sửa nhanh, máy tốt"
```

---

### 4.3 Bảng `parts_requests` — Phiếu yêu cầu linh kiện

Khi sửa chữa cần linh kiện → Staff tạo phiếu yêu cầu → cần được duyệt trước khi xuất kho.

| Field | Type | Giải thích |
|:---|:---|:---|
| `repair_id` | ObjectId | FK → repairs. Xuất cho phiếu sửa nào. |
| `requested_by` | ObjectId | FK → users. Staff yêu cầu. |
| `approved_by` | ObjectId | FK → users. Staff senior duyệt. |
| `items` | [Object] | Danh sách linh kiện: `[{part_id, quantity, unit_price}]` |
| `status` | String | `pending` → `approved` / `rejected` |
| `reject_reason` | String | Lý do từ chối (nếu có) |

**Flow:**
```
Staff tạo request: items = [{bóng đèn, qty: 1, giá: 350000}]
  → status: 'pending'
  → Senior duyệt: status = 'approved'
  → spare_parts.stock -= quantity   ← TỰ ĐỘNG TRỪ KHO
  → Tạo record trong repair_parts
```

---

### 4.4 Bảng `repair_parts` — Linh kiện đã xuất

Bản ghi thực tế linh kiện đã được xuất cho 1 phiếu sửa (sau khi request được approve).

| Field | Type | Giải thích |
|:---|:---|:---|
| `repair_id` | ObjectId | FK → repairs |
| `part_id` | ObjectId | FK → spare_parts. Linh kiện nào. |
| `request_id` | ObjectId | FK → parts_requests. Từ phiếu yêu cầu nào. |
| `quantity` | Number | Số lượng xuất |
| `unit_price` | Number | Giá tại thời điểm xuất (snapshot, không thay đổi dù spare_parts.price đổi sau) |

---

## MODULE 5: MAINTENANCE & INVENTORY

**File:** [5_maintenance.dbml](file:///d:/Ruo/dbml/5_maintenance.dbml)
**Actor:** Maintenance Staff
**UC liên quan:** Schedule/Execute/Log maintenance, Conduct/Reconcile inventory

### 5.1 Bảng `maintenance_plans` — Kế hoạch bảo trì định kỳ

Maint Staff lập lịch kiểm tra thiết bị/phòng theo chu kỳ để **phòng ngừa** sự cố.

| Field | Type | Giải thích |
|:---|:---|:---|
| `name` | String | Tên kế hoạch. VD: `"Bảo trì điều hòa tầng 3"`, `"Kiểm tra máy chiếu hàng quý"` |
| `target_type` | String | Bảo trì theo gì: `room` (tất cả TB trong phòng), `equipment` (TB cụ thể), `category` (tất cả TB cùng loại) |
| `target_ids` | [ObjectId] | Phòng/TB/loại nào. VD: target_type=room, target_ids=[A101, A102, A103] |
| `frequency` | String | `monthly` (hàng tháng), `quarterly` (hàng quý), `yearly` (hàng năm) |
| `checklist` | [Object] | Danh mục kiểm tra. VD: `[{item: "Kiểm tra gas", required: true}, {item: "Vệ sinh lọc", required: true}]` |
| `next_due` | Date | Lần bảo trì tiếp theo. Hệ thống tự tính dựa trên frequency. |
| `created_by` | ObjectId | FK → users. Staff tạo kế hoạch. |
| `status` | String | `active` = đang chạy, `paused` = tạm dừng |

**Dữ liệu mẫu:**
```json
{
  "name": "Bảo trì điều hòa tầng 3 tòa A",
  "target_type": "room",
  "target_ids": ["ObjectId→A301", "ObjectId→A302", "ObjectId→A303"],
  "frequency": "quarterly",
  "checklist": [
    { "item": "Kiểm tra gas lạnh", "required": true },
    { "item": "Vệ sinh lọc gió", "required": true },
    { "item": "Kiểm tra remote", "required": false },
    { "item": "Đo nhiệt độ làm lạnh", "required": true }
  ],
  "next_due": "2026-12-01",
  "status": "active"
}
```

---

### 5.2 Bảng `maintenance_logs` — Kết quả thực hiện bảo trì

Mỗi lần Staff thực hiện kiểm tra theo plan → ghi 1 log kết quả.

| Field | Type | Giải thích |
|:---|:---|:---|
| `plan_id` | ObjectId | FK → maintenance_plans. Thuộc kế hoạch nào. |
| `equipment_id` | ObjectId | FK → equipment. Kiểm tra TB nào. |
| `checked_by` | ObjectId | FK → users. Staff thực hiện. |
| `check_date` | Date | Ngày kiểm tra thực tế. |
| `checklist_results` | [Object] | Kết quả từng mục. VD: `[{item: "Kiểm tra gas", passed: true, note: "OK"}, {item: "Vệ sinh lọc", passed: false, note: "Lọc bẩn nặng, cần thay"}]` |
| `status` | String | `passed` = tất cả OK, `failed` = có mục fail, `needs_repair` = cần tạo phiếu sửa |
| `auto_repair_id` | ObjectId | FK → repairs. Nếu `needs_repair` → tự động tạo phiếu sửa, lưu ID ở đây. |
| `notes` | String | Ghi chú thêm. |

**Flow tự động tạo phiếu sửa:**
```
Staff kiểm tra điều hòa A301:
  checklist_results:
    ✅ Kiểm tra gas: passed
    ❌ Vệ sinh lọc: failed → note: "Lọc bẩn nặng, cần thay"
    ✅ Kiểm tra remote: passed
    ❌ Đo nhiệt độ: failed → note: "Làm lạnh yếu, chỉ được 26°C"

  → status: 'needs_repair'
  → HỆ THỐNG TỰ ĐỘNG TẠO phiếu repairs:
     equipment_id = điều hòa A301
     description = "Phát hiện qua bảo trì định kỳ: lọc bẩn + làm lạnh yếu"
     status = 'reported'
  → auto_repair_id = ID phiếu sửa vừa tạo
```

---

### 5.3 Bảng `inventory_sessions` — Đợt kiểm kê

Mỗi đợt kiểm kê = 1 session. Có phạm vi (scope) cụ thể.

| Field | Type | Giải thích |
|:---|:---|:---|
| `name` | String | Tên đợt. VD: `"Kiểm kê tầng 3 tòa A — Q4/2026"` |
| `scope_type` | String | Phạm vi: `building` (cả tòa), `floor` (1 tầng), `room` (phòng cụ thể) |
| `scope_ids` | [ObjectId] | ID phòng/tòa. Hệ thống tìm tất cả equipment trong scope. |
| `created_by` | ObjectId | FK → users. Staff tạo đợt kiểm kê. |
| `date` | Date | Ngày kiểm kê. |
| `status` | String | `draft` → `in_progress` → `completed` → `reconciled` |
| `completed_at` | Date | Ngày hoàn tất scan |

**Status flow:**
```
draft ──→ in_progress ──→ completed ──→ reconciled
(tạo)    (bắt đầu scan)  (scan hết)   (đối chiếu sai lệch, xử lý xong)
```

---

### 5.4 Bảng `inventory_logs` — Kết quả scan từng thiết bị

Mỗi lần Staff scan QR 1 thiết bị trong đợt kiểm kê → ghi 1 log.

| Field | Type | Giải thích |
|:---|:---|:---|
| `session_id` | ObjectId | FK → inventory_sessions. Thuộc đợt nào. |
| `equipment_id` | ObjectId | FK → equipment. TB nào. |
| `scanned_room_id` | ObjectId | FK → rooms. Scan ở phòng nào (vị trí thực tế). |
| `scanned_by` | ObjectId | FK → users. Staff scan. |
| `scanned_at` | Date | Thời điểm scan. |
| `status` | String | Kết quả đối chiếu |
| `note` | String | Ghi chú |

**Các kết quả kiểm kê:**
| Status | Ý nghĩa | Xử lý |
|:---|:---|:---|
| `matched` | TB đúng phòng, hoạt động tốt ✅ | Không cần làm gì |
| `wrong_location` | TB ở sai phòng ⚠️ | Tạo transfer hoặc cập nhật room_id |
| `damaged` | TB hỏng phát hiện khi kiểm kê 🔧 | Tạo phiếu repair |
| `missing` | TB trên hệ thống nhưng không tìm thấy ❌ | equipment.status = 'lost' |

---

## MODULE 6: NOTIFICATIONS & AUDIT

**File:** [6_system.dbml](file:///d:/Ruo/dbml/6_system.dbml)
**Actor:** Admin (Configure, Audit), System (tự động)
**UC liên quan:** Audit system activity, Verify chain integrity, Export audit, Configure notification template, Monitor system health

### 6.1 Bảng `notifications` — Thông báo in-app

Mỗi row = 1 thông báo cho 1 user. Hiện badge đỏ khi chưa đọc.

| Field | Type | Giải thích |
|:---|:---|:---|
| `user_id` | ObjectId | FK → users. Gửi cho ai. |
| `type` | String | Loại thông báo (xem bảng dưới). |
| `title` | String | Tiêu đề ngắn. VD: `"Sự cố mới: Máy chiếu A101"` |
| `message` | String | Nội dung. VD: `"GV Trần Thị B báo máy chiếu phòng A101 không lên hình"` |
| `reference_type` | String | Liên kết đến loại nào: `repair`, `transfer`, `disposal`, `equipment`, `parts_request` |
| `reference_id` | ObjectId | ID document gốc → click thông báo sẽ nhảy đến trang chi tiết |
| `is_read` | Boolean | `false` = chưa đọc (badge đỏ), `true` = đã đọc |

**Ma trận thông báo — Ai nhận gì:**

| Type | Trigger | Gửi cho | Reference |
|:---|:---|:---|:---|
| `incident_reported` | Lecturer báo sự cố | Tất cả Maint Staff | repair |
| `repair_assigned` | Staff giao việc sửa | Staff được giao | repair |
| `repair_resolved` | Sửa xong | Lecturer (người báo) | repair |
| `feedback_requested` | Nhắc đánh giá (sau 24h) | Lecturer | repair |
| `transfer_approval` | Phiếu chuyển cần duyệt | Staff senior | transfer |
| `warranty_expiring` | BH còn ≤ 30 ngày | Maint Staff | equipment |
| `deadline_overdue` | Sửa chữa quá hạn | Staff + Admin | repair |
| `parts_approved` | Phiếu linh kiện được duyệt | Staff (người yêu cầu) | parts_request |
| `disposal_step` | Thanh lý chuyển bước | Người duyệt bước tiếp | disposal |

---

### 6.2 Bảng `notification_templates` — Template email

Admin tùy chỉnh nội dung email cho từng loại thông báo. Dùng placeholder để chèn dữ liệu động.

| Field | Type | Giải thích |
|:---|:---|:---|
| `type` | String | Unique. Mỗi loại notification có 1 template. |
| `subject` | String | Tiêu đề email. VD: `"[RUO] Sự cố mới: {{equipmentName}} tại {{roomCode}}"` |
| `body_html` | String | HTML email body. Dùng placeholder `{{...}}` |
| `placeholders` | [String] | Danh sách placeholder khả dụng |
| `is_active` | Boolean | `true` = gửi email loại này, `false` = tắt (chỉ thông báo in-app) |
| `updated_by` | ObjectId | FK → users. Admin sửa lần cuối. |

**Ví dụ template:**
```html
Subject: [RUO] Sự cố mới: {{equipmentName}} tại {{roomCode}}

Body:
<h2>Sự cố thiết bị mới</h2>
<p>Giảng viên <strong>{{reporterName}}</strong> vừa báo sự cố:</p>
<ul>
  <li>Thiết bị: {{equipmentName}} ({{equipmentCode}})</li>
  <li>Phòng: {{roomCode}}</li>
  <li>Mô tả: {{incidentDescription}}</li>
  <li>Thời gian: {{reportedAt}}</li>
</ul>
<p><a href="{{repairUrl}}">Xem chi tiết & xử lý</a></p>

Placeholders: [reporterName, equipmentName, equipmentCode,
               roomCode, incidentDescription, reportedAt, repairUrl]
```

---

### 6.3 Bảng `audit_logs` — Nhật ký kiểm toán (SHA-256 Chain)

Ghi lại **MỌI thay đổi** trong hệ thống. Không ai có thể xóa/sửa — đảm bảo tính minh bạch.

| Field | Type | Giải thích |
|:---|:---|:---|
| `action` | String | Loại hành động: `create`, `update`, `delete`, `approve`, `transfer`, `escalate`, `feedback` |
| `target_table` | String | Collection bị ảnh hưởng. VD: `equipment`, `repairs`, `transfers` |
| `entity_id` | ObjectId | ID record bị ảnh hưởng |
| `user_id` | ObjectId | FK → users. Ai thực hiện |
| `old_value` | Mixed | Giá trị cũ (JSON snapshot) — null nếu `create` |
| `new_value` | Mixed | Giá trị mới (JSON snapshot) — null nếu `delete` |
| `ip_address` | String | IP người thực hiện |
| `hash_sha256` | String | Hash của bản ghi hiện tại |
| `previous_hash` | String | Hash của bản ghi trước đó → **tạo chuỗi liên kết** |

**Cách tạo chuỗi SHA-256:**
```
Record #1 (đầu tiên):
  data = "create|equipment|TB-001|admin|2026-01-15"
  hash = SHA256(data) = "a1b2c3..."
  previous_hash = "GENESIS"

Record #2:
  data = "update|equipment|TB-001|staff|2026-03-20" + "a1b2c3..."
  hash = SHA256(data) = "d4e5f6..."
  previous_hash = "a1b2c3..."    ← trỏ về Record #1

Record #3:
  data = "transfer|equipment|TB-001|staff|2026-06-01" + "d4e5f6..."
  hash = SHA256(data) = "g7h8i9..."
  previous_hash = "d4e5f6..."    ← trỏ về Record #2
```

**Verify integrity (UC: D-15):**
```
Admin bấm "Verify" → Server duyệt từ Record #1:
  Tính lại hash Record #1 → so với hash đã lưu → khớp ✅
  Tính lại hash Record #2 (dùng hash Record #1) → so → khớp ✅
  Tính lại hash Record #3 (dùng hash Record #2) → so → khớp ✅
  → "Chuỗi audit hoàn toàn nguyên vẹn" ✅

Nếu ai đó sửa Record #2 trong DB:
  Tính lại hash Record #2 → KHÔNG KHỚP ❌
  → "Phát hiện giả mạo tại record #2" 🚨
```

**Dữ liệu mẫu:**
```json
{
  "action": "approve",
  "target_table": "transfers",
  "entity_id": "ObjectId → transfer #15",
  "user_id": "ObjectId → BT001 (Staff senior)",
  "old_value": { "status": "pending" },
  "new_value": { "status": "approved", "approved_by": "BT001" },
  "ip_address": "192.168.1.50",
  "hash_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "previous_hash": "d7a8f...b3c1",
  "created_at": "2026-09-30T10:15:00Z"
}
```

---

## TỔNG KẾT LIÊN KẾT GIỮA CÁC MODULE

```
┌─────────────┐
│  Module 1   │ users._id được tham chiếu bởi TẤT CẢ module
│  AUTH       │ (ghi trong note, không vẽ đường để tránh rối)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Module 2   │ categories, rooms, suppliers, repair_units, spare_parts
│  MASTER     │ = dữ liệu nền tảng, ít thay đổi
└──────┬──────┘
       │ được tham chiếu bởi ↓
       ▼
┌─────────────┐         ┌─────────────┐
│  Module 3   │────────→│  Module 4   │
│  EQUIPMENT  │  TB._id │  REPAIR     │
│  TRANSFER   │         │  (Lecturer  │
│  DISPOSAL   │←────────│   ↔ Staff)  │
└──────┬──────┘  status └──────┬──────┘
       │                       │ auto_repair_id
       │                       ▼
       │              ┌─────────────┐
       │              │  Module 5   │
       └─────────────→│  MAINT &    │
         equipment_id │  INVENTORY  │
                      └──────┬──────┘
                             │ mọi thay đổi
                             ▼
                      ┌─────────────┐
                      │  Module 6   │
                      │  SYSTEM     │
                      │  (Audit +   │
                      │  Notif)     │
                      └─────────────┘
```
