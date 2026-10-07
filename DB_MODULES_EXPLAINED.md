# GIẢI THÍCH CHI TIẾT 6 MODULE DATABASE — DỰ ÁN RUO

> **20 collections · 48 Use Cases · 5 Actors:** Guest, Lecturer, Facility Manager, Technician, Admin
> (cộng actor trừu tượng **User** = mọi người đã đăng nhập)
>
> Sơ đồ: [dbdiagram.dbml](file:///d:/Ruo/dbdiagram.dbml) (bản gộp) · [dbml/](file:///d:/Ruo/dbml) (6 module) · [Actor_UseCase.drawio](file:///d:/Ruo/Actor_UseCase.drawio) (6 trang: tổng quan + mỗi actor 1 trang)

---

## 0. THAY ĐỔI SO VỚI BẢN CŨ (theo góp ý mentor)

| # | Góp ý | Thay đổi |
|---|---|---|
| 1 | Maintenance Staff quá rộng | Tách thành **Facility Manager** (giao việc, duyệt, quyết định) và **Technician** (đi làm thực địa) |
| 2 | Gộp audit log và login | Bỏ `login_history`. Đăng nhập / đăng xuất / đặt lại mật khẩu ghi vào `audit_logs` |
| 3 | Maintenance plan không liên quan equipment | Bỏ `maintenance_plans`, `maintenance_logs`. Kiểm kê kiêm luôn việc kiểm tra định kỳ |
| 4 | Use case rườm rà | 48 UC, mỗi UC là 1 động từ cụ thể. Vẽ 1 trang tổng quan (8 gói) + mỗi actor 1 trang riêng |
| 5 | `notification_templates` thừa | Bỏ. Nội dung thông báo là hằng số trong code |
| 6 | Sửa xong đồ ở đâu, kho dự phòng | Kho = `rooms.room_type = 'warehouse'`, định mức `rooms.required_equipment`. `transfers` đổi thành `equipment_movements` ghi mọi lần di chuyển |

**Phát sinh thêm khi phân tích:**
- Thêm `password_resets`: code đã dùng để lưu OTP nhưng thiết kế cũ thiếu.
- Bỏ `repair_parts`: trùng dữ liệu với `parts_requests.items`.

**Tổng:** 24 − 5 (bỏ) + 1 (thêm) = **20 collections**.

| Module | Collections |
|---|---|
| 1. Auth & User | `users`, `roles`, `refresh_tokens`, `password_resets` |
| 2. Master Data | `categories`, `suppliers`, `repair_units`, `rooms`, `spare_parts` |
| 3. Equipment, Movement & Disposal | `equipment`, `equipment_movements`, `disposals`, `import_sessions` |
| 4. Repair | `repairs`, `repair_logs`, `parts_requests` |
| 5. Inventory | `inventory_sessions`, `inventory_logs` |
| 6. Notification & Audit | `notifications`, `audit_logs` |

---

## 1. PHÂN CÔNG ACTOR

| Actor | Vai trò | UC chính |
|---|---|---|
| **Guest** | Chưa đăng nhập | Register account, Log in, Recover password |
| **User** | Mọi người đã đăng nhập | Log out, Update profile, Change password |
| **Lecturer** | Giảng viên, người dùng phòng | Report malfunction, Track repair status, Evaluate repair quality, View room equipment |
| **Facility Manager** | Quản lý CSVC: **giao việc và duyệt** | Assign repair task, Approve parts request, Select spare equipment, Assign post-repair location, Order equipment transfer, Register equipment, Create inventory session, Propose disposal… (17 UC) |
| **Technician** | Kỹ thuật viên: **đi làm** | Accept repair task, Update repair progress, Request spare parts, Report repair outcome, Replace with spare equipment, Confirm equipment movement, Scan equipment QR |
| **Admin** | Quản trị hệ thống | Tài khoản, phân quyền, danh mục, duyệt thanh lý cuối, báo cáo, kiểm toán (15 UC) |

**Nguyên tắc:** người làm không tự duyệt việc của mình.
- Technician xin linh kiện → Facility Manager duyệt.
- Facility Manager đề xuất thanh lý → Admin duyệt.
- Facility Manager ra lệnh điều chuyển → Technician thực hiện và xác nhận.

---

## 2. VÒNG ĐỜI THIẾT BỊ & KHO DỰ PHÒNG

```
                  ┌──── Technician mang đồ dự phòng ra thay ◄──── in_stock (KHO)
                  ▼                                                   ▲
in_use ──báo hỏng──► broken ──FM giao việc──► repairing               │
                                                 │                    │
                     ┌── repaired ───────────────┤                    │
                     │   Có phòng nào thiếu loại này không?           │
                     │     ├─ có    → in_use (về phòng đang thiếu)    │
                     │     └─ không → ────────────────────────────────┘
                     │
                     └── unrepairable ──► pending_disposal ──Admin duyệt──► disposed
                                                │
                                                └──Admin từ chối──► repairing
```

**Quy tắc "phòng đủ":** phòng **đủ** khi với mọi `category_id` trong `rooms.required_equipment`, số thiết bị `status = in_use` có `room_id` là phòng đó ≥ `quantity`.

**Thứ tự gợi ý nơi đến khi sửa xong** (UC *Assign post-repair location*; hệ thống gợi ý, Facility Manager xác nhận):
1. Phòng gốc, nếu phòng gốc đang thiếu loại này.
2. Phòng khác đang thiếu, ưu tiên phòng thiếu nhiều nhất.
3. Kho (`room_type = 'warehouse'`) cùng tòa nhà.

### 2.1 Kịch bản mẫu: máy chiếu A1-302 hỏng, sửa xong vào kho

| Bước | Ai làm (UC) | Dữ liệu thay đổi |
|---|---|---|
| 1 | Lecturer — *Report malfunction* | Tạo `repairs` (`source = lecturer_report`, `status = reported`). `equipment[MC-01].status = broken` |
| 2 | Facility Manager — *Assign repair task* + *Select spare equipment* | `repairs.assigned_by/assigned_to/deadline`, `replacement_equipment_id = MC-09` (đang `in_stock` ở kho A1-K01). `status = assigned`. Tạo 2 `equipment_movements` `pending`: `replacement` (MC-09: A1-K01 → A1-302) và `repair_out` (MC-01: A1-302 → A1-K01) |
| 3 | Technician — *Replace with spare equipment* | 2 movement → `completed`. MC-09: `room_id = A1-302`, `in_use`. MC-01: `room_id = A1-K01`, `repairing`. `repairs.status = in_progress` |
| 4 | Technician — *Update repair progress*, *Request spare parts* | Thêm `repair_logs`. Tạo `parts_requests` `pending` |
| 5 | Facility Manager — *Approve parts request* | `parts_requests.status = approved`, trừ `spare_parts.stock` |
| 6 | Technician — *Report repair outcome* | `repairs.outcome = repaired`, `status = resolved` |
| 7 | Facility Manager — *Assign post-repair location* | A1-302 đã đủ máy chiếu (có MC-09), không phòng nào thiếu → `destination_room_id = A1-K01`. Tạo movement `to_stock` |
| 8 | Technician — *Confirm equipment movement* | Movement `completed`. `equipment[MC-01].status = in_stock` |
| 9 | Lecturer — *Evaluate repair quality* → FM — *Close repair ticket* | `feedback_rating`, `repairs.status = closed` |

### 2.2 Kịch bản: không sửa được

| Bước | Ai làm (UC) | Dữ liệu thay đổi |
|---|---|---|
| 1 | Technician — *Report repair outcome* | `repairs.outcome = unrepairable`, `status = unrepairable`. `equipment.status = pending_disposal` |
| 2 | Facility Manager — *Propose disposal* | Tạo `disposals` (`repair_id`, `status = proposed`) |
| 3a | Admin — *Approve disposal request* (đồng ý) | `disposals.status = approved → completed`, `decision_number`. `equipment.status = disposed` |
| 3b | Admin — *Approve disposal request* (từ chối) | `disposals.status = rejected`, `reject_reason`. `equipment.status = repairing` để thử sửa lại hoặc gửi đơn vị khác |

### 2.3 Trường hợp biên

| Tình huống | Xử lý |
|---|---|
| Kho hết đồ cùng loại | Bỏ qua *Select spare equipment*, `replacement_equipment_id = null`. Phòng hiện "đang thiếu" trên dashboard |
| Gửi đơn vị ngoài sửa | Movement `repair_out` có `to_room_id = null`. `equipment.room_id = null`, `repairs.repair_unit_id` có giá trị |
| Đơn vị ngoài trả đồ | Movement `repair_return` về kho hoặc phòng theo `destination_room_id` |
| Kiểm kê thấy đồ hỏng | `inventory_logs.status = damaged` → tự tạo `repairs` với `source = inventory_check`, gắn `inventory_logs.repair_id` |
| Kiểm kê không thấy đồ | `inventory_logs.status = missing`. Sau khi FM đối soát → `equipment.status = lost` |

---

## MODULE 1: AUTH & USER

**File:** [1_auth.dbml](file:///d:/Ruo/dbml/1_auth.dbml)
**Actor:** Guest, User, Admin
**UC:** Register account, Log in, Recover password, Log out, Update profile, Change password, Create user account, Assign user role, Lock user account, Reset user password, Configure role permissions

### 1.1 `users` — Tài khoản

| Field | Type | Bắt buộc | Giải thích |
|:---|:---|:---:|:---|
| `_id` | ObjectId | ✅ | MongoDB tự tạo |
| `code` | String | ✅ | Mã nội bộ: `GV001` (Lecturer), `QL001` (Facility Manager), `KT001` (Technician), `AD001` (Admin). Unique, không đổi được |
| `email` | String | ✅ | Email đăng nhập. Unique |
| `password_hash` | String | ✅ | BCrypt 12 rounds. Không bao giờ lưu plain text |
| `full_name` | String | ✅ | Họ tên |
| `phone` | String | | SĐT |
| `avatar` | String | | URL ảnh đại diện |
| `department` | String | ✅ | Khoa / Phòng ban. Để dạng String, không tách bảng |
| `role` | String | ✅ | `lecturer` · `facility_manager` · `technician` · `admin` |
| `status` | String | ✅ | `active` · `locked` (Admin khoá) |
| `force_change_pw` | Boolean | ✅ | `true` khi Admin reset mật khẩu → bắt đổi ở lần đăng nhập sau |
| `failed_login_attempts` | Number | ✅ | Số lần sai liên tiếp. Default 0 |
| `lock_until` | Date | | Sai 5 lần → khoá tạm 15 phút. Đăng nhập đúng thì reset về `null` |
| `last_login_at` | Date | | Lần đăng nhập thành công gần nhất |
| `created_at`, `updated_at` | Date | ✅ | |

**Business Rules:**
- *Register account* (Guest) chỉ tạo được `role = lecturer`, bắt buộc xác thực email qua OTP. Báo trùng ngay khi nhập email / mã.
- Tài khoản `facility_manager`, `technician`, `admin` chỉ Admin tạo (*Create user account*).
- `lock_until` là khoá **tạm** do sai mật khẩu. `status = locked` là khoá **hẳn** do Admin, chỉ Admin mở được.
- Bỏ `login_count`: số lần đăng nhập đếm được từ `audit_logs` (`action = login_success`).

### 1.2 `roles` — Ma trận quyền

| Field | Type | Giải thích |
|:---|:---|:---|
| `_id` | ObjectId | PK |
| `name` | String | Unique: 4 role ở trên |
| `permissions` | [String] | Dạng `resource:action` |

```json
// lecturer
["incident:create", "incident:read_own", "repair:rate", "room:read", "equipment:read"]

// facility_manager
["equipment:create", "equipment:update", "equipment:import", "equipment:qr",
 "warranty:read", "warranty:update",
 "repair:read", "repair:assign", "repair:close",
 "parts:approve", "spare_part:update",
 "movement:order", "placement:decide",
 "inventory:create", "inventory:reconcile",
 "disposal:propose", "dashboard:read"]

// technician
["repair:read_assigned", "repair:accept", "repair:log", "repair:report_outcome",
 "parts:request", "movement:confirm", "inventory:scan", "equipment:read"]

// admin
["user:create", "user:update", "user:lock", "user:reset_password", "role:update",
 "category:*", "supplier:*", "repair_unit:*", "room:*",
 "disposal:approve", "dashboard:read", "report:export",
 "audit:read", "audit:verify", "audit:export"]
```

**Kiểm tra quyền:** Technician gọi `PATCH /repairs/:id/assign` → cần `repair:assign` → role `technician` không có → `403`. Đây chính là ràng buộc "người làm không tự giao việc".

### 1.3 `refresh_tokens`

| Field | Type | Giải thích |
|:---|:---|:---|
| `user_id` | ObjectId | FK → `users` |
| `token_hash` | String | Hash của refresh token, không lưu token gốc |
| `device_info`, `ip_address` | String | Thiết bị đăng nhập |
| `expires_at` | Date | TTL 7 ngày |
| `is_revoked` | Boolean | `true` khi Log out, đổi mật khẩu hoặc Admin khoá tài khoản |

### 1.4 `password_resets` — OTP *(mới)*

| Field | Type | Giải thích |
|:---|:---|:---|
| `email` | String | Email nhận OTP |
| `otp_hash` | String | OTP 6 số đã hash |
| `purpose` | String | `register` (xác thực email khi đăng ký) · `reset_password` |
| `attempts` | Number | Số lần nhập sai. Sai **3 lần** → OTP vô hiệu |
| `expires_at` | Date | TTL 15 phút, MongoDB tự xoá |
| `is_used` | Boolean | Dùng xong thì `true`. Gửi OTP mới thì OTP cũ chưa dùng cũng chuyển `true` |

**Rule:** chỉ đối chiếu với OTP **mới nhất** chưa dùng (sort `_id` giảm dần). Giới hạn gửi OTP theo IP.

> `login_history` đã bỏ → xem `audit_logs` (Module 6).

---

## MODULE 2: MASTER DATA

**File:** [2_master_data.dbml](file:///d:/Ruo/dbml/2_master_data.dbml)
**Actor:** Admin (Define equipment category, Register supplier, Register repair unit, Register room), Facility Manager (Update spare parts stock)

### 2.1 `categories` — Loại thiết bị
| Field | Type | Giải thích |
|:---|:---|:---|
| `code` | String | Unique. VD `PROJ`, `TV`, `AC` |
| `name` | String | Máy chiếu, TV, Điều hoà… |
| `description` | String | |

### 2.2 `suppliers` — Nhà cung cấp
`code` (unique), `name`, `phone`, `email`, `address`, `contact` (người liên hệ).

### 2.3 `repair_units` — Đơn vị sửa chữa ngoài
`code` (unique), `name`, `specialty` (chuyên môn), `phone`, `address`.

### 2.4 `rooms` — Phòng & Kho

| Field | Type | Bắt buộc | Giải thích |
|:---|:---|:---:|:---|
| `code` | String | ✅ | Unique. VD `A1-302`, kho `A1-K01` |
| `name` | String | ✅ | |
| `building`, `floor` | String, Number | ✅ | Tòa, tầng |
| `room_type` | String | ✅ | `lecture` · `lab` · `office` · **`warehouse`** |
| `capacity`, `area` | Number | | Sức chứa, m² |
| `layout_image` | String | | Sơ đồ phòng |
| `department` | String | | Khoa quản lý |
| `required_equipment` | Array | | **Định mức thiết bị:** `[{ category_id, quantity }]`. Kho thì để rỗng |
| `status` | String | ✅ | `available` · `maintenance` · `inactive` |

```json
{
  "code": "A1-302", "room_type": "lecture", "building": "A1", "floor": 3,
  "required_equipment": [
    { "category_id": "ObjectId('…PROJ')", "quantity": 1 },
    { "category_id": "ObjectId('…AC')",   "quantity": 2 }
  ]
}
{ "code": "A1-K01", "room_type": "warehouse", "building": "A1", "floor": 1, "required_equipment": [] }
```

**Vì sao nhúng (embed) định mức, không tách bảng:** định mức luôn được đọc cùng phòng, mỗi phòng chỉ có vài dòng, và không có truy vấn nào cần đọc định mức tách khỏi phòng.

### 2.5 `spare_parts` — Linh kiện
| Field | Type | Giải thích |
|:---|:---|:---|
| `code`, `name` | String | |
| `stock` | Number | Tồn kho. Tự trừ khi `parts_requests` được duyệt |
| `min_stock` | Number | Tồn kho < ngưỡng → cảnh báo Facility Manager |
| `price`, `unit` | Number, String | |
| `supplier_id` | ObjectId | FK → `suppliers` |

> **Linh kiện ≠ đồ dự phòng.** Linh kiện (bóng đèn máy chiếu, cáp HDMI) nằm trong `spare_parts`. Đồ dự phòng là **thiết bị nguyên chiếc** trong `equipment` với `status = in_stock`.

---

## MODULE 3: EQUIPMENT, MOVEMENT & DISPOSAL

**File:** [3_equipment.dbml](file:///d:/Ruo/dbml/3_equipment.dbml)
**Actor:** Facility Manager, Technician, Admin

### 3.1 `equipment` — Thiết bị

| Field | Type | Bắt buộc | Giải thích |
|:---|:---|:---:|:---|
| `code` | String | ✅ | Mã tài sản. Unique |
| `qr_code` | String | ✅ | Unique, in tem bằng *Print QR label* |
| `serial_number`, `name`, `brand`, `model` | String | | |
| `category_id` | ObjectId | ✅ | FK → `categories` |
| `room_id` | ObjectId | | **Vị trí hiện tại** (phòng hoặc kho). `null` = đang ở đơn vị sửa ngoài |
| `supplier_id` | ObjectId | | FK → `suppliers` |
| `price`, `purchase_date`, `depreciation_rate` | | | Giá, ngày mua, % khấu hao/năm |
| `warranty_expiry`, `warranty_status` | Date, String | | `active` · `expired` · `extended` |
| `images` | Array | | |
| `status` | String | ✅ | Xem bảng dưới |

| `status` | Ý nghĩa | `room_id` trỏ tới |
|---|---|---|
| `in_use` | Đang dùng trong phòng | Phòng học / lab / văn phòng |
| `in_stock` | Đồ dự phòng trong kho | Kho |
| `broken` | Đã báo hỏng, chưa giao việc | Phòng đang đặt |
| `repairing` | Đang sửa | Kho hoặc `null` (sửa ngoài) |
| `pending_disposal` | Không sửa được, chờ Admin duyệt thanh lý | Kho |
| `disposed` | Đã thanh lý | Giữ vị trí cuối cùng |
| `lost` | Kiểm kê không thấy | Giữ vị trí cuối cùng |

**Rule:** chỉ thay đổi `room_id` thông qua `equipment_movements` có `status = completed`, không sửa tay. Nhờ vậy lịch sử vị trí luôn đầy đủ.

### 3.2 `equipment_movements` — Mọi lần di chuyển *(thay cho `transfers`)*

| Field | Type | Giải thích |
|:---|:---|:---|
| `equipment_id` | ObjectId | FK → `equipment` |
| `type` | String | `transfer` (phòng → phòng) · `replacement` (kho → phòng thay đồ hỏng) · `repair_out` (đưa đi sửa) · `repair_return` (sửa ngoài trả về) · `to_stock` (sửa xong cất kho) |
| `from_room_id` | ObjectId | Nullable (VD `repair_return` từ đơn vị ngoài) |
| `to_room_id` | ObjectId | Nullable (VD `repair_out` ra đơn vị ngoài) |
| `repair_id` | ObjectId | Gắn với phiếu sửa nếu di chuyển do sửa chữa |
| `ordered_by` | ObjectId | Facility Manager ra lệnh |
| `performed_by` | ObjectId | Technician thực hiện |
| `reason` | String | |
| `status` | String | `pending` → `completed` / `cancelled` |
| `created_at`, `completed_at` | Date | |

```json
{ "equipment_id": "MC-09", "type": "replacement", "from_room_id": "A1-K01", "to_room_id": "A1-302",
  "repair_id": "R-2026-0145", "ordered_by": "QL001", "performed_by": "KT003", "status": "completed" }
```

**Truy vấn "thiết bị X đã đi những đâu":** `find({ equipment_id: X }).sort({ completed_at: 1 })`.

**Vì sao không còn bước duyệt:** Facility Manager là người có thẩm quyền nên lệnh của FM có hiệu lực luôn. Technician chỉ xác nhận đã chuyển. Bản cũ để cùng một người vừa tạo vừa duyệt nên bước duyệt không có ý nghĩa.

### 3.3 `disposals` — Thanh lý (2 cấp)

| Field | Type | Giải thích |
|:---|:---|:---|
| `equipment_id` | ObjectId | FK → `equipment` |
| `repair_id` | ObjectId | Phiếu sửa đã kết luận `unrepairable` |
| `proposed_by` | ObjectId | Facility Manager |
| `approved_by` | ObjectId | Admin |
| `reason`, `reject_reason` | String | |
| `decision_number` | String | Số quyết định thanh lý |
| `recovery_value` | Number | Giá trị thu hồi |
| `status` | String | `proposed` → `approved` → `completed`, hoặc `rejected` |

Bỏ khỏi bản cũ: `staff_approved_by`, `current_step`, `procurement_plan`, `replacement_equipment_id`. Việc mua sắm nằm ngoài hệ thống; đồ mới mua về thì FM dùng *Register equipment*.

### 3.4 `import_sessions` — Nhập Excel
`uploaded_by` (FM), `file_name`, `total_rows`, `success_count`, `error_count`, `errors [{ row, field, message }]`, `status` (`validating` · `validated` · `importing` · `completed` · `failed`).

---

## MODULE 4: REPAIR

**File:** [4_repair.dbml](file:///d:/Ruo/dbml/4_repair.dbml)
**Actor:** Lecturer, Facility Manager, Technician

### 4.1 `repairs` — Phiếu sửa chữa

| Nhóm | Field | Giải thích |
|:---|:---|:---|
| Báo hỏng | `equipment_id` | Đồ hỏng |
| | `source` | `lecturer_report` · `inventory_check` |
| | `reported_by` | Lecturer, hoặc Technician nếu phát hiện khi kiểm kê |
| | `incident_description`, `incident_images`, `reported_at` | |
| Giao việc (FM) | `assigned_by`, `assigned_to` | Facility Manager → Technician |
| | `replacement_equipment_id` | Đồ trong kho lấy ra thay. Nullable |
| | `deadline` | Quá hạn thì hệ thống tự gửi thông báo `deadline_overdue` |
| Xử lý (Technician) | `repair_unit_id` | Nếu gửi sửa ngoài |
| | `damage_level` | `minor` · `major` · `critical` |
| | `description`, `total_cost` | |
| | `outcome` | `repaired` · `unrepairable` |
| Nơi đến (FM) | `destination_room_id` | Phòng hoặc kho khi sửa xong |
| Đánh giá (Lecturer) | `feedback_rating`, `feedback_comment`, `feedback_at` | 1–5 sao |
| | `status` | `reported` → `assigned` → `in_progress` → `resolved` / `unrepairable` → `closed` |

Bỏ khỏi bản cũ: `carried_by`, `returned_by`, `return_room_id`, `repair_location`, vì việc di chuyển đã ghi ở `equipment_movements`.

### 4.2 `repair_logs` — Nhật ký sửa
`repair_id`, `action`, `performed_by`, `description`, `cost`, `images`, `timestamp`. Bỏ `parts_used` vì trùng với `parts_requests`.

### 4.3 `parts_requests` — Yêu cầu linh kiện

| Field | Type | Giải thích |
|:---|:---|:---|
| `repair_id` | ObjectId | FK → `repairs` |
| `requested_by` | ObjectId | Technician |
| `approved_by` | ObjectId | Facility Manager |
| `items` | Array | `[{ part_id, qty, unit_price }]`. `unit_price` chốt tại lúc duyệt |
| `status` | String | `pending` · `approved` · `rejected` |
| `reject_reason` | String | |

**Rule:** khi `approved` thì trừ `spare_parts.stock` theo `items`. Linh kiện đã dùng cho 1 phiếu = mọi `items` của các request `approved` thuộc phiếu đó. Vì vậy không cần bảng `repair_parts`.

---

## MODULE 5: INVENTORY

**File:** [5_inventory.dbml](file:///d:/Ruo/dbml/5_inventory.dbml)
**Actor:** Facility Manager (Create inventory session, Reconcile inventory result), Technician (Scan equipment QR)

### 5.1 `inventory_sessions` — Đợt kiểm kê
`name`, `scope_type` (`building` · `floor` · `room`), `scope_ids`, `created_by` (FM), `date`, `status` (`draft` → `in_progress` → `completed` → `reconciled`), `completed_at`.

### 5.2 `inventory_logs` — Kết quả quét

| Field | Type | Giải thích |
|:---|:---|:---|
| `session_id` | ObjectId | FK → `inventory_sessions` |
| `equipment_id` | ObjectId | FK → `equipment` |
| `scanned_room_id` | ObjectId | Phòng thực tế nơi quét thấy |
| `scanned_by` | ObjectId | Technician |
| `status` | String | `matched` · `missing` · `damaged` · `wrong_location` |
| `repair_id` | ObjectId | Phiếu sửa tự tạo khi `damaged` |
| `note` | String | |

**Đối soát (FM):**
- `wrong_location` → tạo movement `transfer` để sửa lại vị trí.
- `missing` → `equipment.status = lost`.
- `damaged` → phiếu sửa đã tự tạo, đi theo luồng sửa chữa.

> `maintenance_plans`, `maintenance_logs` đã bỏ. Kiểm kê định kỳ đóng vai trò kiểm tra tình trạng thiết bị.

---

## MODULE 6: NOTIFICATION & AUDIT

**File:** [6_system.dbml](file:///d:/Ruo/dbml/6_system.dbml)
**Actor:** Admin (View audit log, Verify audit chain, Export audit log), System

### 6.1 `notifications`

| Field | Type | Giải thích |
|:---|:---|:---|
| `user_id` | ObjectId | Người nhận |
| `type` | String | Xem bảng dưới |
| `title`, `message` | String | Sinh từ hằng số trong code |
| `reference_type`, `reference_id` | String, ObjectId | Link tới document gốc |
| `is_read` | Boolean | |

| `type` | Gửi cho | Khi nào |
|---|---|---|
| `incident_reported` | Facility Manager | Lecturer báo hỏng hoặc kiểm kê phát hiện hỏng |
| `repair_assigned` | Technician | FM giao việc |
| `replacement_needed` | Technician | FM chọn đồ dự phòng cần mang ra phòng |
| `parts_request` | Facility Manager | Technician xin linh kiện |
| `repair_resolved` | Lecturer, FM | Sửa xong |
| `repair_unrepairable` | Facility Manager | Không sửa được |
| `movement_ordered` | Technician | FM ra lệnh di chuyển |
| `disposal_request` | Admin | FM đề xuất thanh lý |
| `warranty_expiring` | Facility Manager | Còn 30 ngày hết bảo hành |
| `deadline_overdue` | FM, Technician | Phiếu quá hạn |

> `notification_templates` đã bỏ: chỉ có 10 loại thông báo cố định, để dạng hằng số trong code là đủ.

### 6.2 `audit_logs` — Nhật ký kiểm toán *(đã gộp `login_history`)*

| Field | Type | Giải thích |
|:---|:---|:---|
| `action` | String | `create` · `update` · `delete` · `approve` · **`login_success`** · **`login_failed`** · **`logout`** · **`password_reset`** |
| `target_table`, `entity_id` | String, ObjectId | Collection và record bị tác động. Với login thì là `users` |
| `user_id` | ObjectId | Nullable: đăng nhập bằng email không tồn tại |
| `actor_email` | String | Email đã nhập khi đăng nhập |
| `old_value`, `new_value` | JSON | |
| `ip_address`, `user_agent` | String | |
| `hash_sha256` | String | `SHA256(previous_hash + canonical_json(bản ghi))` |
| `previous_hash` | String | Hash của bản ghi trước, tạo thành chuỗi |
| `created_at` | Date | |

**Rules:**
- **Không đặt TTL**: xoá bất kỳ bản ghi nào sẽ làm gãy chuỗi hash.
- *Verify audit chain*: tính lại hash từng bản ghi theo thứ tự. Lệch ở đâu thì đó là chỗ dữ liệu bị sửa.
- Thống kê đăng nhập (số lần, lần sai, IP lạ) lấy bằng `find({ action: /^login_/ })`.

---

## PHỤ LỤC: TRUY VẾT UC → COLLECTION

| Gói UC | Ghi (C/U) | Đọc (R) |
|---|---|---|
| Authentication | `users`, `password_resets`, `refresh_tokens`, `audit_logs` | `roles` |
| Repair | `repairs`, `repair_logs`, `parts_requests`, `spare_parts`, `notifications` | `equipment`, `users` |
| Warehouse & Movement | `equipment_movements`, `equipment`, `spare_parts` | `rooms` |
| Equipment Registry | `equipment`, `import_sessions` | `categories`, `suppliers`, `rooms` |
| Inventory | `inventory_sessions`, `inventory_logs`, `repairs` | `equipment` |
| Disposal | `disposals`, `equipment` | `repairs` |
| Administration | `users`, `roles`, `categories`, `suppliers`, `repair_units`, `rooms` | — |
| Reporting & Audit | — | Tất cả |

Mọi collection đều có ít nhất 1 gói UC ghi dữ liệu → không có bảng thừa.
