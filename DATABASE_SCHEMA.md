# DATABASE SCHEMA — RUO

> Normalized Database Architecture · **26 Tables / Entities** · **95 Use Cases**
> Main Actors: **Guest** · **Lecturer** · **Facility Manager** · **Technician** · **Admin**
>
> ⚙️ File này được **sinh tự động** từ [dbdiagram.dbml](file:///c:/Users/Dang/Documents/wdp/Ruo/dbdiagram.dbml). Khi điều chỉnh schema, cập nhật DBML rồi chạy `node scripts/docs/gen_schema_md.mjs`.

## Mục lục

- **1. AUTHENTICATION & RBAC**: [`roles`](#roles) · [`permissions`](#permissions) · [`role_permissions`](#role_permissions) · [`users`](#users) · [`refresh_tokens`](#refresh_tokens) · [`password_resets`](#password_resets)
- **2. ORGANIZATION / MASTER DATA**: [`departments`](#departments) · [`categories`](#categories) · [`suppliers`](#suppliers) · [`repair_units`](#repair_units) · [`rooms`](#rooms) · [`room_required_equipment`](#room_required_equipment)
- **4. SPARE PARTS**: [`spare_parts`](#spare_parts)
- **5. EQUIPMENT / ASSETS**: [`equipment`](#equipment)
- **6. EQUIPMENT MOVEMENTS**: [`equipment_movements`](#equipment_movements)
- **7. IMPORT SESSIONS**: [`import_sessions`](#import_sessions)
- **8. REPAIR FLOW**: [`repairs`](#repairs)
- **9. REPAIR LOGS**: [`repair_logs`](#repair_logs) · [`parts_requests`](#parts_requests) · [`parts_request_items`](#parts_request_items)
- **11. PREVENTIVE MAINTENANCE**: [`preventive_maintenance`](#preventive_maintenance)
- **12. DISPOSAL**: [`disposals`](#disposals)
- **13. INVENTORY**: [`inventory_sessions`](#inventory_sessions) · [`inventory_logs`](#inventory_logs)
- **14. NOTIFICATIONS**: [`notifications`](#notifications)
- **15. AUDIT LOG**: [`audit_logs`](#audit_logs)

---

## 1. AUTHENTICATION & RBAC

### roles

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| id | int | PK |  |
| name | system_role | Unique |  |
| description | varchar | - |  |
| created_at | timestamp | - |  |
| updated_at | timestamp | - |  |

### permissions

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| id | int | PK |  |
| code | varchar | Unique | Example: equipment.create |
| module | varchar | - |  |
| action | varchar | - |  |
| description | varchar | - |  |

### role_permissions

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| role_id | int | FK → `roles` |  |
| permission_id | int | FK → `permissions` |  |

### users

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| id | int | PK |  |
| code | varchar | Unique | Mã NV / GV |
| email | varchar | Unique |  |
| password_hash | varchar | - | BCrypt |
| full_name | varchar | - |  |
| phone | varchar | - |  |
| avatar | varchar | - |  |
| department_id | int | FK → `departments` |  |
| role_id | int | FK → `roles` |  |
| status | user_role_status | - |  |
| force_change_pw | boolean | - |  |
| failed_login_attempts | int | - |  |
| lock_until | timestamp | - |  |
| last_login_at | timestamp | - |  |
| created_at | timestamp | - |  |
| updated_at | timestamp | - |  |

### refresh_tokens

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| id | int | PK |  |
| user_id | int | FK → `users` |  |
| token_hash | varchar | Unique |  |
| device_info | varchar | - |  |
| ip_address | varchar | - |  |
| expires_at | timestamp | - |  |
| is_revoked | boolean | - |  |
| created_at | timestamp | - |  |

### password_resets

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| id | int | PK |  |
| user_id | int | FK → `users` |  |
| email | varchar | - |  |
| otp_hash | varchar | - | BCrypt OTP |
| purpose | varchar | - | `register` · `reset_password` |
| attempts | int | - |  |
| expires_at | timestamp | - |  |
| is_used | boolean | - |  |
| created_at | timestamp | - |  |

---

## 2. ORGANIZATION / MASTER DATA

### departments

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| id | int | PK |  |
| code | varchar | Unique |  |
| name | varchar | - |  |
| description | varchar | - |  |
| status | varchar | - | `active` · `inactive` |
| created_at | timestamp | - |  |
| updated_at | timestamp | - |  |

### categories

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| id | int | PK |  |
| code | varchar | Unique |  |
| name | varchar | - |  |
| description | varchar | - |  |
| created_at | timestamp | - |  |
| updated_at | timestamp | - |  |

### suppliers

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| id | int | PK |  |
| code | varchar | Unique |  |
| name | varchar | - |  |
| phone | varchar | - |  |
| email | varchar | - |  |
| address | varchar | - |  |
| contact | varchar | - |  |
| created_at | timestamp | - |  |
| updated_at | timestamp | - |  |

### repair_units

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| id | int | PK |  |
| code | varchar | Unique |  |
| name | varchar | - |  |
| specialty | varchar | - |  |
| phone | varchar | - |  |
| email | varchar | - |  |
| address | varchar | - |  |
| created_at | timestamp | - |  |
| updated_at | timestamp | - |  |

### rooms

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| id | int | PK |  |
| code | varchar | Unique |  |
| name | varchar | - |  |
| building | varchar | - |  |
| floor | int | - |  |
| room_type | varchar | - | `lecture` · `lab` · `office` · `warehouse` |
| capacity | int | - |  |
| area | decimal | - |  |
| layout_image | varchar | - |  |
| department_id | int | FK → `departments` |  |
| status | varchar | - | `available` · `maintenance` · `inactive` |
| created_at | timestamp | - |  |
| updated_at | timestamp | - |  |

### room_required_equipment

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| room_id | int | FK → `rooms` |  |
| category_id | int | FK → `categories` |  |
| quantity | int | - |  |

---

## 4. SPARE PARTS

### spare_parts

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| id | int | PK |  |
| code | varchar | Unique |  |
| name | varchar | - |  |
| stock | int | - |  |
| min_stock | int | - |  |
| price | decimal | - |  |
| unit | varchar | - | `piece` · `set` · `box` |
| supplier_id | int | FK → `suppliers` |  |
| created_at | timestamp | - |  |
| updated_at | timestamp | - |  |

---

## 5. EQUIPMENT / ASSETS

### equipment

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| id | int | PK |  |
| code | varchar | Unique | Mã tài sản |
| qr_code | varchar | Unique |  |
| serial_number | varchar | - |  |
| name | varchar | - |  |
| brand | varchar | - |  |
| model | varchar | - |  |
| category_id | int | FK → `categories` |  |
| room_id | int | FK → `rooms` |  |
| current_repair_unit_id | int | FK → `repair_units` |  |
| supplier_id | int | FK → `suppliers` |  |
| price | decimal | - |  |
| purchase_date | date | - |  |
| warranty_expiry | date | - |  |
| warranty_status | varchar | - | `active` · `expired` · `extended` |
| images | json | - |  |
| depreciation_rate | decimal | - |  |
| status | equipment_status | - |  |
| import_session_id | int | FK → `import_sessions` |  |
| created_at | timestamp | - |  |
| updated_at | timestamp | - |  |

---

## 6. EQUIPMENT MOVEMENTS

### equipment_movements

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| id | int | PK |  |
| equipment_id | int | FK → `equipment` |  |
| room_id | int | FK → `rooms` | Phòng tại thời điểm tiếp nhận sự cố |
| type | movement_type | - |  |
| from_room_id | int | FK → `rooms` |  |
| to_room_id | int | FK → `rooms` |  |
| repair_id | int | FK → `repairs` |  |
| ordered_by | int | FK → `users` |  |
| performed_by | int | FK → `users` |  |
| reason | varchar | - |  |
| status | movement_status | - |  |
| created_at | timestamp | - |  |
| completed_at | timestamp | - |  |

---

## 7. IMPORT SESSIONS

### import_sessions

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| id | int | PK |  |
| uploaded_by | int | FK → `users` |  |
| file_name | varchar | - |  |
| total_rows | int | - |  |
| success_count | int | - |  |
| error_count | int | - |  |
| errors | json | - |  |
| status | import_status | - |  |
| created_at | timestamp | - |  |
| completed_at | timestamp | - |  |

---

## 8. REPAIR FLOW

### repairs

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| id | int | PK |  |
| equipment_id | int | FK → `equipment` |  |
| source | varchar | - | `lecturer_report` · `inventory_check` |
| reported_by | int | FK → `users` |  |
| incident_description | varchar | - |  |
| incident_images | json | - |  |
| reported_at | timestamp | - |  |
| assigned_by | int | FK → `users` |  |
| assigned_to | int | FK → `users` |  |
| replacement_equipment_id | int | FK → `equipment` |  |
| repair_unit_id | int | FK → `repair_units` |  |
| damage_level | varchar | - | `minor` · `major` · `critical` |
| description | varchar | - |  |
| total_cost | decimal | - |  |
| deadline | timestamp | - |  |
| outcome | varchar | - | `repaired` · `unrepairable` |
| destination_room_id | int | FK → `rooms` |  |
| status | repair_status | - |  |
| feedback_rating | int | - |  |
| feedback_comment | varchar | - |  |
| feedback_at | timestamp | - |  |
| created_at | timestamp | - |  |
| updated_at | timestamp | - |  |

---

## 9. REPAIR LOGS

### repair_logs

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| id | int | PK |  |
| repair_id | int | FK → `repairs` |  |
| action | varchar | - | `reported` · `assigned` · `in_progress` · `resolved` · `unrepairable` · `closed` |
| performed_by | int | FK → `users` |  |
| description | varchar | - |  |
| cost | decimal | - |  |
| images | json | - |  |
| timestamp | timestamp | - |  |

### parts_requests

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| id | int | PK |  |
| repair_id | int | FK → `repairs` |  |
| requested_by | int | FK → `users` |  |
| approved_by | int | FK → `users` |  |
| status | parts_request_status | - |  |
| reject_reason | varchar | - |  |
| created_at | timestamp | - |  |
| approved_at | timestamp | - |  |

### parts_request_items

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| id | int | PK |  |
| parts_request_id | int | FK → `parts_requests` |  |
| part_id | int | FK → `spare_parts` |  |
| quantity | int | - |  |
| unit_price | decimal | - | Price at time of request/issue |

---

## 11. PREVENTIVE MAINTENANCE

### maintenance_plans

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| id | ObjectId | PK |  |
| title | varchar | - | Tên kế hoạch |
| building | varchar | - | Mã tòa nhà |
| floor | int | - | Tầng áp dụng |
| room_ids | ObjectId[] | FK → `rooms` | Rỗng trong yêu cầu nghĩa là toàn bộ tầng |
| category_ids | ObjectId[] | FK → `equipment_categories` | Rỗng nghĩa là mọi loại thiết bị |
| frequency | varchar | - | `monthly` · `quarterly` |
| start_date | timestamp | - | Ngày bắt đầu chu kỳ |
| checklist | varchar[] | - | Các mục kiểm tra áp dụng cho từng thiết bị |
| created_by | ObjectId | FK → `users` | Facility Manager lập kế hoạch |
| is_active | boolean | - |  |
| created_at | timestamp | - |  |
| updated_at | timestamp | - |  |

### preventive_maintenance

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| id | ObjectId | PK |  |
| plan_id | ObjectId | FK → `maintenance_plans` | Kế hoạch định kỳ; rỗng cho dữ liệu cũ |
| room_id | ObjectId | FK → `rooms` | Phòng tại thời điểm kiểm tra |
| equipment_id | ObjectId | FK → `equipment` |  |
| cycle_start | timestamp | - | Mỗi thiết bị chỉ ghi một lần trong một chu kỳ |
| checked_by | ObjectId | FK → `users` |  |
| check_date | timestamp | - |  |
| status | varchar | - | `passed` · `failed` |
| notes | varchar | - |  |
| checklist_results | json | - | Kết quả từng mục và ghi chú lỗi |
| repair_id | ObjectId | FK → `repairs` | Phiếu sửa chữa tự tạo khi có mục không đạt |
| created_at | timestamp | - |  |

---

## 12. DISPOSAL

### disposals

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| id | int | PK |  |
| equipment_id | int | FK → `equipment` |  |
| repair_id | int | FK → `repairs` |  |
| proposed_by | int | FK → `users` |  |
| approved_by | int | FK → `users` |  |
| reason | varchar | - |  |
| reject_reason | varchar | - |  |
| decision_number | varchar | - |  |
| recovery_value | decimal | - |  |
| status | disposal_status | - |  |
| proposed_at | timestamp | - |  |
| approved_at | timestamp | - |  |
| completed_at | timestamp | - |  |

---

## 13. INVENTORY

### inventory_sessions

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| id | int | PK |  |
| name | varchar | - |  |
| scope_type | varchar | - | `building` · `floor` · `room` |
| scope_ids | json | - |  |
| created_by | int | FK → `users` |  |
| date | date | - |  |
| status | inventory_status | - |  |
| completed_at | timestamp | - |  |
| created_at | timestamp | - |  |

### inventory_logs

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| id | int | PK |  |
| session_id | int | FK → `inventory_sessions` |  |
| equipment_id | int | FK → `equipment` |  |
| scanned_room_id | int | FK → `rooms` |  |
| scanned_by | int | FK → `users` |  |
| scanned_at | timestamp | - |  |
| status | varchar | - | `matched` · `missing` · `damaged` · `wrong_location` |
| repair_id | int | FK → `repairs` |  |
| note | varchar | - |  |

---

## 14. NOTIFICATIONS

### notifications

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| id | int | PK |  |
| user_id | int | FK → `users` |  |
| type | varchar | - | `incident_reported` · `repair_assigned` · `repair_resolved` · `repair_unrepairable` · `replacement_needed` · `movement_ordered` · `parts_request` · `disposal_request` · `warranty_expiring` · `deadline_overdue` |
| title | varchar | - |  |
| message | varchar | - |  |
| reference_type | varchar | - | `repair` · `equipment_movement` · `disposal` · `equipment` · `parts_request` |
| reference_id | int | - |  |
| is_read | boolean | - |  |
| created_at | timestamp | - |  |

---

## 15. AUDIT LOG

### audit_logs

| Field | Type | Khoá | Ghi chú |
|:---|:---|:---|:---|
| id | int | PK |  |
| action | varchar | - | `create` · `update` · `delete` · `approve` · `login_success` · `login_failed` · `logout` · `password_reset` |
| target_table | varchar | - |  |
| entity_id | int | - |  |
| user_id | int | FK → `users` |  |
| actor_email | varchar | - |  |
| old_value | json | - |  |
| new_value | json | - |  |
| ip_address | varchar | - |  |
| user_agent | varchar | - |  |
| hash_sha256 | varchar | - |  |
| previous_hash | varchar | - |  |
| created_at | timestamp | - |  |
