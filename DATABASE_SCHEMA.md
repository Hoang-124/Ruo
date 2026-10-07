# DATABASE SCHEMA — RUO

> MongoDB · Mongoose ODM · **20 collections** · **48 Use Cases**
> Actors: **Guest** · **Lecturer** · **Facility Manager** · **Technician** · **Admin** (+ **User** = mọi người đã đăng nhập)
>
> ⚙️ File này được **sinh tự động** từ [dbdiagram.dbml](file:///d:/Ruo/dbdiagram.dbml). Muốn sửa schema thì sửa DBML rồi chạy `node scripts/docs/gen_schema_md.mjs`.
> Giải thích nghiệp vụ, vòng đời thiết bị và kịch bản mẫu: [DB_MODULES_EXPLAINED.md](file:///d:/Ruo/DB_MODULES_EXPLAINED.md).

## Mục lục

- **1. AUTH & USER**: [`users`](#users) · [`roles`](#roles) · [`refresh_tokens`](#refresh_tokens) · [`password_resets`](#password_resets)
- **2. MASTER DATA**: [`categories`](#categories) · [`suppliers`](#suppliers) · [`repair_units`](#repair_units) · [`rooms`](#rooms) · [`spare_parts`](#spare_parts)
- **3. EQUIPMENT, MOVEMENT & DISPOSAL**: [`equipment`](#equipment) · [`equipment_movements`](#equipment_movements) · [`disposals`](#disposals) · [`import_sessions`](#import_sessions)
- **4. REPAIR FLOW**: [`repairs`](#repairs) · [`repair_logs`](#repair_logs) · [`parts_requests`](#parts_requests)
- **5. INVENTORY**: [`inventory_sessions`](#inventory_sessions) · [`inventory_logs`](#inventory_logs)
- **6. NOTIFICATION & AUDIT**: [`notifications`](#notifications) · [`audit_logs`](#audit_logs)

---

## 1. AUTH & USER

### users

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| _id | ObjectId | PK |  |
| code | String | Unique | Mã NV / GV |
| email | String | Unique |  |
| password_hash | String |  | BCrypt |
| full_name | String |  |  |
| phone | String |  |  |
| avatar | String |  |  |
| department | String |  | Khoa / Phòng ban |
| role | String |  | `lecturer` · `facility_manager` · `technician` · `admin` |
| status | String |  | `active` · `locked` |
| force_change_pw | Boolean |  |  |
| failed_login_attempts | Number |  | 5 lần sai → khoá 15 phút |
| lock_until | DateTime |  |  |
| last_login_at | DateTime |  |  |
| created_at | DateTime |  |  |
| updated_at | DateTime |  |  |

### roles

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| _id | ObjectId | PK |  |
| name | String | Unique | `lecturer` · `facility_manager` · `technician` · `admin` |
| permissions | Array |  | Mảng quyền |

### refresh_tokens

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| _id | ObjectId | PK |  |
| user_id | ObjectId | FK → `users` |  |
| token_hash | String |  |  |
| device_info | String |  |  |
| ip_address | String |  |  |
| expires_at | DateTime |  | TTL 7 ngày |
| is_revoked | Boolean |  |  |
| created_at | DateTime |  |  |

### password_resets

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| _id | ObjectId | PK |  |
| email | String |  |  |
| otp_hash | String |  | BCrypt OTP 6 số |
| purpose | String |  | `register` · `reset_password` |
| attempts | Number |  | Tối đa 3 lần nhập sai |
| expires_at | DateTime |  | TTL 15 phút |
| is_used | Boolean |  |  |
| created_at | DateTime |  |  |

---

## 2. MASTER DATA

### categories

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| _id | ObjectId | PK |  |
| code | String | Unique |  |
| name | String |  |  |
| description | String |  |  |

### suppliers

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| _id | ObjectId | PK |  |
| code | String | Unique |  |
| name | String |  |  |
| phone | String |  |  |
| email | String |  |  |
| address | String |  |  |
| contact | String |  |  |

### repair_units

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| _id | ObjectId | PK |  |
| code | String | Unique |  |
| name | String |  |  |
| specialty | String |  |  |
| phone | String |  |  |
| address | String |  |  |

### rooms

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| _id | ObjectId | PK |  |
| code | String | Unique |  |
| name | String |  |  |
| building | String |  |  |
| floor | Number |  |  |
| room_type | String |  | `lecture` · `lab` · `office` · `warehouse` |
| capacity | Number |  |  |
| area | Number |  | m² |
| layout_image | String |  | Sơ đồ phòng |
| department | String |  |  |
| required_equipment | Array |  | Định mức: [{ category_id, quantity }] |
| status | String |  | `available` · `maintenance` · `inactive` |
| created_at | DateTime |  |  |
| updated_at | DateTime |  |  |

### spare_parts

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| _id | ObjectId | PK |  |
| code | String | Unique |  |
| name | String |  |  |
| stock | Number |  |  |
| min_stock | Number |  | Ngưỡng cảnh báo |
| price | Number |  |  |
| unit | String |  | Cái, bộ, hộp |
| supplier_id | ObjectId | FK → `suppliers` |  |

---

## 3. EQUIPMENT, MOVEMENT & DISPOSAL

### equipment

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| _id | ObjectId | PK |  |
| code | String | Unique | Mã tài sản |
| qr_code | String | Unique |  |
| serial_number | String |  |  |
| name | String |  |  |
| brand | String |  |  |
| model | String |  |  |
| category_id | ObjectId | FK → `categories` |  |
| room_id | ObjectId | FK → `rooms` | Vị trí hiện tại (phòng hoặc kho). null = đang ở đơn vị sửa ngoài |
| supplier_id | ObjectId | FK → `suppliers` |  |
| price | Number |  |  |
| purchase_date | DateTime |  |  |
| warranty_expiry | DateTime |  |  |
| warranty_status | String |  | `active` · `expired` · `extended` |
| images | Array |  |  |
| depreciation_rate | Number |  | % / năm |
| status | String |  | `in_use` · `in_stock` · `broken` · `repairing` · `pending_disposal` · `disposed` · `lost` |
| created_at | DateTime |  |  |
| updated_at | DateTime |  |  |

### equipment_movements

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| _id | ObjectId | PK |  |
| equipment_id | ObjectId | FK → `equipment` |  |
| type | String |  | `transfer` · `replacement` · `repair_out` · `repair_return` · `to_stock` |
| from_room_id | ObjectId | FK → `rooms` | nullable |
| to_room_id | ObjectId | FK → `rooms` | nullable (repair_out ra đơn vị ngoài) |
| repair_id | ObjectId | FK → `repairs` | nullable, gắn khi di chuyển do sửa chữa |
| ordered_by | ObjectId | FK → `users` | Facility Manager |
| performed_by | ObjectId | FK → `users` | Technician |
| reason | String |  |  |
| status | String |  | `pending` · `completed` · `cancelled` |
| created_at | DateTime |  |  |
| completed_at | DateTime |  |  |

### disposals

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| _id | ObjectId | PK |  |
| equipment_id | ObjectId | FK → `equipment` |  |
| repair_id | ObjectId | FK → `repairs` | Phiếu sửa kết luận unrepairable |
| proposed_by | ObjectId | FK → `users` | Facility Manager |
| approved_by | ObjectId | FK → `users` | Admin |
| reason | String |  |  |
| reject_reason | String |  |  |
| decision_number | String |  | Số QĐ thanh lý |
| recovery_value | Number |  |  |
| status | String |  | `proposed` · `approved` · `rejected` · `completed` |
| proposed_at | DateTime |  |  |
| approved_at | DateTime |  |  |
| completed_at | DateTime |  |  |

### import_sessions

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| _id | ObjectId | PK |  |
| uploaded_by | ObjectId | FK → `users` | Facility Manager |
| file_name | String |  |  |
| total_rows | Number |  |  |
| success_count | Number |  |  |
| error_count | Number |  |  |
| errors | Array |  | [{ row, field, message }] |
| status | String |  | `validating` · `validated` · `importing` · `completed` · `failed` |
| created_at | DateTime |  |  |
| completed_at | DateTime |  |  |

---

## 4. REPAIR FLOW

### repairs

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| _id | ObjectId | PK |  |
| equipment_id | ObjectId | FK → `equipment` | Đồ hỏng |
| source | String |  | `lecturer_report` · `inventory_check` |
| reported_by | ObjectId | FK → `users` | Lecturer hoặc Technician khi kiểm kê |
| incident_description | String |  | Mô tả sự cố gốc |
| incident_images | Array |  |  |
| reported_at | DateTime |  |  |
| assigned_by | ObjectId | FK → `users` | Facility Manager |
| assigned_to | ObjectId | FK → `users` | Technician |
| replacement_equipment_id | ObjectId | FK → `equipment` | Đồ trong kho lấy ra thay, nullable |
| repair_unit_id | ObjectId | FK → `repair_units` | nullable, khi gửi sửa ngoài |
| damage_level | String |  | `minor` · `major` · `critical` |
| description | String |  | Mô tả kỹ thuật |
| total_cost | Number |  |  |
| deadline | DateTime |  |  |
| outcome | String |  | `repaired` · `unrepairable` |
| destination_room_id | ObjectId | FK → `rooms` | Sửa xong về đâu (phòng hoặc kho) |
| status | String |  | `reported` · `assigned` · `in_progress` · `resolved` · `unrepairable` · `closed` |
| feedback_rating | Number |  | 1-5 sao (Lecturer) |
| feedback_comment | String |  |  |
| feedback_at | DateTime |  |  |
| created_at | DateTime |  |  |
| updated_at | DateTime |  |  |

### repair_logs

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| _id | ObjectId | PK |  |
| repair_id | ObjectId | FK → `repairs` |  |
| action | String |  | `reported` · `assigned` · `in_progress` · `resolved` · `unrepairable` · `closed` |
| performed_by | ObjectId | FK → `users` |  |
| description | String |  |  |
| cost | Number |  |  |
| images | Array |  |  |
| timestamp | DateTime |  |  |

### parts_requests

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| _id | ObjectId | PK |  |
| repair_id | ObjectId | FK → `repairs` |  |
| requested_by | ObjectId | FK → `users` | Technician |
| approved_by | ObjectId | FK → `users` | Facility Manager |
| items | Array |  | [{ part_id → spare_parts, qty, unit_price }]. Đã duyệt = đã xuất kho |
| status | String |  | `pending` · `approved` · `rejected` |
| reject_reason | String |  |  |
| created_at | DateTime |  |  |
| approved_at | DateTime |  |  |

---

## 5. INVENTORY

### inventory_sessions

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| _id | ObjectId | PK |  |
| name | String |  |  |
| scope_type | String |  | `building` · `floor` · `room` |
| scope_ids | Array |  |  |
| created_by | ObjectId | FK → `users` | Facility Manager |
| date | DateTime |  |  |
| status | String |  | `draft` · `in_progress` · `completed` · `reconciled` |
| completed_at | DateTime |  |  |
| created_at | DateTime |  |  |

### inventory_logs

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| _id | ObjectId | PK |  |
| session_id | ObjectId | FK → `inventory_sessions` |  |
| equipment_id | ObjectId | FK → `equipment` |  |
| scanned_room_id | ObjectId | FK → `rooms` |  |
| scanned_by | ObjectId | FK → `users` | Technician |
| scanned_at | DateTime |  |  |
| status | String |  | `matched` · `missing` · `damaged` · `wrong_location` |
| repair_id | ObjectId | FK → `repairs` | Phiếu sửa tự tạo khi damaged |
| note | String |  |  |

---

## 6. NOTIFICATION & AUDIT

### notifications

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| _id | ObjectId | PK |  |
| user_id | ObjectId | FK → `users` |  |
| type | String |  | `incident_reported` · `repair_assigned` · `repair_resolved` · `repair_unrepairable` · `replacement_needed` · `movement_ordered` · `parts_request` · `disposal_request` · `warranty_expiring` · `deadline_overdue` |
| title | String |  |  |
| message | String |  |  |
| reference_type | String |  | `repair` · `equipment_movement` · `disposal` · `equipment` · `parts_request` |
| reference_id | ObjectId |  |  |
| is_read | Boolean |  |  |
| created_at | DateTime |  |  |

### audit_logs

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| _id | ObjectId | PK |  |
| action | String |  | `create` · `update` · `delete` · `approve` · `login_success` · `login_failed` · `logout` · `password_reset` |
| target_table | String |  |  |
| entity_id | ObjectId |  |  |
| user_id | ObjectId | FK → `users` | nullable (đăng nhập sai email) |
| actor_email | String |  |  |
| old_value | JSON |  |  |
| new_value | JSON |  |  |
| ip_address | String |  |  |
| user_agent | String |  |  |
| hash_sha256 | String |  |  |
| previous_hash | String |  | SHA-256 chain, không đặt TTL |
| created_at | DateTime |  |  |
