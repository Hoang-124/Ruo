# DATABASE SCHEMA — RUO (56 Use Cases · 3 Actors)

> MongoDB Collections · **24 collections** · Mongoose ODM
> Actors: **Lecturer** · **Maintenance Staff** · **Admin** (+ User kế thừa)

---

## 1. users

| Field | Type | Note |
|:---|:---|:---|
| _id | ObjectId | PK |
| code | String | Unique, mã nhân viên / giảng viên |
| email | String | Unique |
| password_hash | String | BCrypt |
| full_name | String | |
| phone | String | SĐT |
| avatar | String | URL ảnh |
| department | String | Khoa / Phòng ban |
| role | String | `lecturer` · `maintenance_staff` · `admin` |
| status | String | `active` · `locked` |
| force_change_pw | Boolean | Buộc đổi pass lần đầu |
| last_login_at | Date | |
| login_count | Number | Số lần đăng nhập |
| created_at | Date | |
| updated_at | Date | |

> **Thay đổi:** Bỏ `role_id` FK, dùng `role` String trực tiếp (chỉ 3 role cố định). Thêm `login_count`.

## 2. roles

| Field | Type | Note |
|:---|:---|:---|
| _id | ObjectId | PK |
| name | String | Unique: `lecturer` · `maintenance_staff` · `admin` |
| permissions | [String] | Mảng quyền chi tiết |

> **3 roles mặc định:**
> - `lecturer` — `['incident:create', 'incident:read_own', 'repair:rate', 'room:read', 'equipment:read']`
> - `maintenance_staff` — `['equipment:*', 'room:*', 'transfer:*', 'repair:*', 'parts:*', 'maintenance:*', 'inventory:*', 'disposal:propose,approve_staff', 'dashboard:read']`
> - `admin` — `['user:*', 'role:*', 'catalog:*', 'report:*', 'audit:*', 'system:*', 'disposal:authorize', 'equipment:read,create,import']`

## 3. rooms

| Field | Type | Note |
|:---|:---|:---|
| _id | ObjectId | PK |
| code | String | Unique, mã phòng |
| name | String | Tên phòng |
| building | String | Tòa nhà |
| floor | Number | Tầng |
| room_type | String | `lecture` · `lab` · `office` · `storage` |
| capacity | Number | Sức chứa |
| area | Number | Diện tích m² |
| layout_image | String | URL ảnh sơ đồ bố trí phòng |
| department | String | Khoa / bộ phận quản lý |
| status | String | `available` · `maintenance` · `inactive` |
| created_at | Date | |
| updated_at | Date | |

> **Thay đổi:** Thêm `layout_image` (UC: Inspect room layout), `department` (liên kết Lecturer).

## 4. categories

| Field | Type | Note |
|:---|:---|:---|
| _id | ObjectId | PK |
| code | String | Unique |
| name | String | TV, Máy chiếu, Bàn... |
| description | String | |

## 5. suppliers

| Field | Type | Note |
|:---|:---|:---|
| _id | ObjectId | PK |
| code | String | Unique |
| name | String | Tên NCC |
| phone | String | |
| email | String | |
| address | String | |
| contact | String | Người liên hệ |

## 6. repair_units

| Field | Type | Note |
|:---|:---|:---|
| _id | ObjectId | PK |
| code | String | Unique |
| name | String | Tên đơn vị sửa |
| specialty | String | Chuyên môn |
| phone | String | |
| address | String | |

## 7. equipment

| Field | Type | Note |
|:---|:---|:---|
| _id | ObjectId | PK |
| code | String | Unique, mã tài sản |
| qr_code | String | Unique, nội dung QR |
| serial_number | String | |
| name | String | |
| brand | String | Hãng sản xuất |
| model | String | Model |
| category_id | ObjectId | FK → categories |
| room_id | ObjectId | FK → rooms |
| supplier_id | ObjectId | FK → suppliers |
| price | Number | Giá mua |
| purchase_date | Date | Ngày mua |
| warranty_expiry | Date | Hạn bảo hành |
| warranty_status | String | `active` · `expired` · `extended` |
| images | [String] | URLs ảnh |
| depreciation_rate | Number | % khấu hao/năm |
| status | String | `active` · `repairing` · `disposed` · `transferring` · `lost` |
| created_at | Date | |
| updated_at | Date | |

> **Thay đổi:** Thêm `warranty_status`, thêm `transferring` vào status enum.

## 8. transfers

| Field | Type | Note |
|:---|:---|:---|
| _id | ObjectId | PK |
| equipment_id | ObjectId | FK → equipment |
| from_room_id | ObjectId | FK → rooms |
| to_room_id | ObjectId | FK → rooms |
| requested_by | ObjectId | FK → users (Maint Staff) |
| approved_by | ObjectId | FK → users (Maint Staff senior) |
| completed_by | ObjectId | FK → users |
| reason | String | Lý do điều chuyển |
| reject_reason | String | Lý do từ chối |
| status | String | `pending` · `approved` · `rejected` · `completed` |
| created_at | Date | |
| approved_at | Date | |
| completed_at | Date | |

## 9. repairs

| Field | Type | Note |
|:---|:---|:---|
| _id | ObjectId | PK |
| equipment_id | ObjectId | FK → equipment |
| reported_by | ObjectId | FK → users (**Lecturer** báo sự cố) |
| incident_description | String | Mô tả sự cố gốc từ Lecturer |
| incident_images | [String] | Ảnh Lecturer chụp khi báo |
| reported_at | Date | Thời điểm Lecturer báo |
| assigned_to | ObjectId | FK → users (Maint Staff) |
| repair_unit_id | ObjectId | FK → repair_units |
| damage_level | String | `minor` · `major` · `critical` |
| description | String | Mô tả kỹ thuật từ Maint Staff |
| images | [String] | Ảnh kỹ thuật (tối đa 5) |
| repair_location | String | `on_site` · `external` |
| carried_by | ObjectId | FK → users, người mang đi |
| returned_by | ObjectId | FK → users, người mang về |
| return_room_id | ObjectId | FK → rooms |
| post_repair_warranty | Date | BH mới sau sửa |
| total_cost | Number | Tổng chi phí |
| deadline | Date | Hạn hoàn thành |
| deadline_status | String | `on_track` · `at_risk` · `overdue` |
| status | String | `reported` · `assigned` · `in_progress` · `resolved` · `closed` |
| feedback_rating | Number | 1–5 sao (Lecturer đánh giá) |
| feedback_comment | String | Nhận xét từ Lecturer |
| feedback_by | ObjectId | FK → users (Lecturer) |
| feedback_at | Date | Thời điểm đánh giá |
| created_at | Date | |
| updated_at | Date | |

> **Thay đổi lớn:**
> - Thêm `incident_*` (3 fields) — tách biệt Lecturer báo sự cố vs Staff xử lý kỹ thuật
> - Thêm `feedback_*` (4 fields) — Lecturer đánh giá chất lượng sửa chữa
> - Thêm status `closed` — trạng thái cuối sau khi Lecturer đánh giá

## 10. repair_logs

| Field | Type | Note |
|:---|:---|:---|
| _id | ObjectId | PK |
| repair_id | ObjectId | FK → repairs |
| action | String | `reported` · `assigned` · `in_progress` · `resolved` · `closed` · `escalated` |
| performed_by | ObjectId | FK → users |
| description | String | Nội dung công việc |
| cost | Number | Chi phí lần này |
| parts_used | [{ part_id, quantity }] | Vật tư đã dùng |
| images | [String] | Ảnh tiến độ |
| timestamp | Date | |

## 11. spare_parts

| Field | Type | Note |
|:---|:---|:---|
| _id | ObjectId | PK |
| code | String | Unique, mã linh kiện |
| name | String | |
| stock | Number | Tồn kho hiện tại |
| min_stock | Number | Ngưỡng cảnh báo |
| price | Number | Đơn giá |
| unit | String | Cái, bộ, hộp |
| supplier_id | ObjectId | FK → suppliers |

## 12. parts_requests

| Field | Type | Note |
|:---|:---|:---|
| _id | ObjectId | PK |
| repair_id | ObjectId | FK → repairs |
| requested_by | ObjectId | FK → users (Maint Staff) |
| approved_by | ObjectId | FK → users (Maint Staff senior) |
| items | [{ part_id, quantity, unit_price }] | Danh sách linh kiện |
| status | String | `pending` · `approved` · `rejected` |
| reject_reason | String | |
| created_at | Date | |
| approved_at | Date | |

## 13. repair_parts

| Field | Type | Note |
|:---|:---|:---|
| _id | ObjectId | PK |
| repair_id | ObjectId | FK → repairs |
| part_id | ObjectId | FK → spare_parts |
| request_id | ObjectId | FK → parts_requests |
| quantity | Number | |
| unit_price | Number | Giá tại thời điểm xuất |

## 14. maintenance_plans

| Field | Type | Note |
|:---|:---|:---|
| _id | ObjectId | PK |
| name | String | Tên kế hoạch |
| target_type | String | `room` · `equipment` · `category` |
| target_ids | [ObjectId] | Phòng/TB/loại nào |
| frequency | String | `monthly` · `quarterly` · `yearly` |
| checklist | [{ item, required }] | Danh mục kiểm tra |
| next_due | Date | Lần tiếp theo |
| created_by | ObjectId | FK → users (Maint Staff) |
| status | String | `active` · `paused` |
| created_at | Date | |

## 15. maintenance_logs

| Field | Type | Note |
|:---|:---|:---|
| _id | ObjectId | PK |
| plan_id | ObjectId | FK → maintenance_plans |
| equipment_id | ObjectId | FK → equipment |
| checked_by | ObjectId | FK → users (Maint Staff) |
| check_date | Date | |
| checklist_results | [{ item, passed, note }] | Kết quả từng mục |
| status | String | `passed` · `failed` · `needs_repair` |
| auto_repair_id | ObjectId | FK → repairs, nếu tạo ticket |
| notes | String | |

## 16. disposals

| Field | Type | Note |
|:---|:---|:---|
| _id | ObjectId | PK |
| equipment_id | ObjectId | FK → equipment |
| proposed_by | ObjectId | FK → users (Maint Staff — đề xuất) |
| staff_approved_by | ObjectId | FK → users (Maint Staff senior — duyệt nội bộ) |
| admin_approved_by | ObjectId | FK → users (Admin — phê duyệt cuối BGH) |
| current_step | Number | 1→5 |
| reason | String | |
| decision_number | String | Số QĐ thanh lý |
| recovery_value | Number | Giá trị thu hồi |
| procurement_plan | String | Kế hoạch mua thay thế |
| replacement_equipment_id | ObjectId | FK → equipment |
| status | String | `proposed` · `staff_reviewing` · `admin_reviewing` · `procuring` · `completed` |
| proposed_at | Date | |
| staff_approved_at | Date | |
| admin_approved_at | Date | |
| completed_at | Date | |

> **Thay đổi:** `hc_approved_by` → `staff_approved_by`, `bgh_approved_by` → `admin_approved_by`

## 17. inventory_sessions

| Field | Type | Note |
|:---|:---|:---|
| _id | ObjectId | PK |
| name | String | Tên đợt kiểm kê |
| scope_type | String | `building` · `floor` · `room` |
| scope_ids | [ObjectId] | Phạm vi kiểm kê |
| created_by | ObjectId | FK → users (Maint Staff) |
| date | Date | Ngày kiểm kê |
| status | String | `draft` · `in_progress` · `completed` · `reconciled` |
| completed_at | Date | |
| created_at | Date | |

> **Thay đổi:** Thêm `reconciled` vào status.

## 18. inventory_logs

| Field | Type | Note |
|:---|:---|:---|
| _id | ObjectId | PK |
| session_id | ObjectId | FK → inventory_sessions |
| equipment_id | ObjectId | FK → equipment |
| scanned_room_id | ObjectId | FK → rooms |
| scanned_by | ObjectId | FK → users (Maint Staff) |
| scanned_at | Date | |
| status | String | `matched` · `missing` · `damaged` · `wrong_location` |
| note | String | |

## 19. notifications

| Field | Type | Note |
|:---|:---|:---|
| _id | ObjectId | PK |
| user_id | ObjectId | FK → users |
| type | String | `incident_reported` · `repair_assigned` · `repair_resolved` · `repair_closed` · `transfer_approval` · `warranty_expiring` · `deadline_overdue` · `parts_approved` · `disposal_step` · `feedback_requested` |
| title | String | |
| message | String | |
| reference_type | String | `repair` · `transfer` · `disposal` · `equipment` · `parts_request` |
| reference_id | ObjectId | Link đến document gốc |
| is_read | Boolean | Default false |
| created_at | Date | |

> **Thay đổi:** Thêm types cho Lecturer flow: `incident_reported`, `repair_resolved`, `feedback_requested`.

## 20. audit_logs

| Field | Type | Note |
|:---|:---|:---|
| _id | ObjectId | PK |
| action | String | `create` · `update` · `delete` · `approve` · `transfer` · `escalate` · `feedback` |
| target_table | String | Collection nào |
| entity_id | ObjectId | Record nào |
| user_id | ObjectId | FK → users |
| old_value | Mixed | JSON giá trị cũ |
| new_value | Mixed | JSON giá trị mới |
| ip_address | String | |
| hash_sha256 | String | Hash hiện tại |
| previous_hash | String | Hash trước (tạo chuỗi) |
| created_at | Date | |

## 21. refresh_tokens

| Field | Type | Note |
|:---|:---|:---|
| _id | ObjectId | PK |
| user_id | ObjectId | FK → users |
| token | String | Refresh token hash |
| device_info | String | User-Agent / device |
| ip_address | String | IP khi login |
| expires_at | Date | TTL 7 ngày |
| is_revoked | Boolean | true = đã logout |
| created_at | Date | |

> **TTL Index:** `{ expires_at: 1 }, { expireAfterSeconds: 0 }`

## 22. notification_templates

| Field | Type | Note |
|:---|:---|:---|
| _id | ObjectId | PK |
| type | String | Unique: `incident_reported` · `repair_assigned` · `repair_resolved` · `feedback_requested` · `transfer_approval` · `warranty_alert` · `deadline_warning` · `disposal_step` |
| subject | String | Tiêu đề email |
| body_html | String | Nội dung HTML với placeholders |
| placeholders | [String] | `['userName', 'equipmentName', 'roomCode', ...]` |
| is_active | Boolean | Bật/tắt |
| updated_by | ObjectId | FK → users (Admin) |
| updated_at | Date | |

## 23. import_sessions

| Field | Type | Note |
|:---|:---|:---|
| _id | ObjectId | PK |
| uploaded_by | ObjectId | FK → users (Maint Staff / Admin) |
| file_name | String | Tên file gốc |
| total_rows | Number | |
| success_count | Number | |
| error_count | Number | |
| errors | [{ row, field, message }] | Chi tiết lỗi |
| status | String | `validating` · `validated` · `importing` · `completed` · `failed` |
| created_at | Date | |
| completed_at | Date | |

## 24. login_history

| Field | Type | Note |
|:---|:---|:---|
| _id | ObjectId | PK |
| user_id | ObjectId | FK → users |
| ip_address | String | |
| user_agent | String | |
| status | String | `success` · `failed` · `locked` |
| failure_reason | String | `wrong_password` · `account_locked` · `rate_limited` |
| created_at | Date | |

> **TTL Index:** `{ created_at: 1 }, { expireAfterSeconds: 7776000 }` — 90 ngày.

---

## QUAN HỆ CHÍNH

```
users.role ──→ roles.name (validate)
equipment ──→ rooms, categories, suppliers
transfers ──→ equipment, rooms×2, users×3 (Maint Staff)
repairs ──→ equipment, users (Lecturer=reported_by, MaintStaff=assigned_to), repair_units, rooms
repair_logs ──→ repairs, users
spare_parts ──→ suppliers
parts_requests ──→ repairs, users×2
repair_parts ──→ repairs, spare_parts, parts_requests
maintenance_plans ──→ users (Maint Staff)
maintenance_logs ──→ maintenance_plans, equipment, users, repairs
disposals ──→ equipment, users×3 (MaintStaff×2 + Admin)
inventory_sessions ──→ users (Maint Staff)
inventory_logs ──→ inventory_sessions, equipment, rooms, users
notifications ──→ users (all actors)
audit_logs ──→ users (all actors)
```

---

## INDEXES ĐỀ XUẤT

### Unique
| Collection | Index |
|:---|:---|
| users | `{ code: 1 }`, `{ email: 1 }` |
| rooms | `{ code: 1 }` |
| equipment | `{ code: 1 }`, `{ qr_code: 1 }` |
| categories | `{ code: 1 }` |
| suppliers | `{ code: 1 }` |
| repair_units | `{ code: 1 }` |
| spare_parts | `{ code: 1 }` |
| notification_templates | `{ type: 1 }` |

### Compound
| Collection | Index | Dùng cho |
|:---|:---|:---|
| equipment | `{ room_id: 1, status: 1 }` | TB theo phòng |
| equipment | `{ warranty_status: 1, warranty_expiry: 1 }` | Check warranty |
| transfers | `{ status: 1, created_at: -1 }` | Pending mới nhất |
| repairs | `{ status: 1, deadline: 1 }` | Quá hạn sửa |
| repairs | `{ reported_by: 1, status: 1 }` | Lecturer xem sự cố |
| repairs | `{ assigned_to: 1, status: 1 }` | Workload Staff |
| repairs | `{ status: 1, feedback_rating: 1 }` | Thống kê quality |
| repair_logs | `{ repair_id: 1, timestamp: -1 }` | Timeline |
| maintenance_plans | `{ status: 1, next_due: 1 }` | Lịch bảo trì |
| notifications | `{ user_id: 1, is_read: 1, created_at: -1 }` | Badge đỏ |
| audit_logs | `{ target_table: 1, entity_id: 1, created_at: -1 }` | Tra lịch sử |

### TTL
| Collection | Index | TTL |
|:---|:---|:---|
| refresh_tokens | `{ expires_at: 1 }` | 0 (theo field) |
| login_history | `{ created_at: 1 }` | 7776000 (90 ngày) |

### Text Search
| Collection | Index |
|:---|:---|
| equipment | `{ name: 'text', code: 'text', serial_number: 'text' }` |
| rooms | `{ name: 'text', code: 'text' }` |
| users | `{ full_name: 'text', code: 'text', email: 'text' }` |
| spare_parts | `{ name: 'text', code: 'text' }` |

---

## CHECKLIST UC (56 Use Cases)

### Auth (User → kế thừa bởi cả 3 actor)
| UC | Collection | ✅ |
|:---|:---|:---:|
| Log in | users, refresh_tokens, login_history | ✅ |
| Log out | refresh_tokens | ✅ |
| Recover password | users + Nodemailer OTP | ✅ |
| Update personal profile | users | ✅ |
| Change password | users | ✅ |

### Lecturer (4 UCs)
| UC | Collection | ✅ |
|:---|:---|:---:|
| Report equipment malfunction | repairs (incident_*), notifications | ✅ |
| Track incident resolution | repairs, repair_logs | ✅ |
| Evaluate repair quality | repairs (feedback_*) | ✅ |
| Check room equipment | equipment, rooms | ✅ |

### Maintenance Staff (28 UCs)
| UC | Collection | ✅ |
|:---|:---|:---:|
| Register new equipment | equipment | ✅ |
| Edit equipment record | equipment | ✅ |
| Import equipment batch | import_sessions, equipment | ✅ |
| Generate QR label | equipment.qr_code | ✅ |
| Scan equipment QR code | equipment | ✅ |
| Inspect room layout | rooms.layout_image | ✅ |
| Initiate equipment transfer | transfers | ✅ |
| Approve transfer request | transfers | ✅ |
| Complete equipment transfer | transfers, equipment | ✅ |
| Receive incident report | repairs, notifications | ✅ |
| Assign repair task | repairs, repair_logs | ✅ |
| Log repair progress | repair_logs | ✅ |
| Close repair ticket | repairs | ✅ |
| Escalate overdue repair | repairs, notifications | ✅ |
| Request spare parts | parts_requests | ✅ |
| Approve parts request | parts_requests, repair_parts, spare_parts | ✅ |
| Check warranty status | equipment | ✅ |
| Record warranty change | repairs, equipment | ✅ |
| Schedule preventive maintenance | maintenance_plans | ✅ |
| Execute maintenance checklist | maintenance_logs | ✅ |
| Log maintenance result | maintenance_logs, repairs | ✅ |
| Conduct inventory session | inventory_sessions | ✅ |
| Reconcile inventory result | inventory_sessions, inventory_logs | ✅ |
| Propose equipment disposal | disposals | ✅ |
| Approve disposal request | disposals | ✅ |
| Plan equipment procurement | disposals | ✅ |
| Receive replacement equipment | disposals, equipment | ✅ |
| Analyze equipment dashboard | Aggregation | ✅ |

### Admin (19 UCs)
| UC | Collection | ✅ |
|:---|:---|:---:|
| Register user account | users | ✅ |
| Assign user role | users, roles | ✅ |
| Deactivate user account | users | ✅ |
| Reset user password | users | ✅ |
| Search user directory | users | ✅ |
| Configure role permissions | roles | ✅ |
| Define equipment category | categories | ✅ |
| Register supplier | suppliers | ✅ |
| Register repair unit | repair_units | ✅ |
| Stock spare parts | spare_parts | ✅ |
| Generate KPI report | Aggregation | ✅ |
| Export statistical report | Aggregation + PDF/Excel | ✅ |
| Assess equipment health score | Aggregation | ✅ |
| Audit system activity | audit_logs | ✅ |
| Verify audit chain integrity | audit_logs (SHA-256) | ✅ |
| Export audit records | audit_logs | ✅ |
| Monitor system health | Aggregation | ✅ |
| Configure notification template | notification_templates | ✅ |
| Authorize final disposal | disposals | ✅ |

---

## INCIDENT → REPAIR FLOW

```
Lecturer                    Maint Staff                  System
   │                            │                           │
   ├─ Report malfunction ──→    │                           │
   │  (incident_*)              │                           │
   │                            │←── notification ──────────┤
   │                            ├─ Receive incident         │
   │                            ├─ Assign repair task       │
   │                            ├─ Log repair progress      │
   │                            ├─ Close repair ticket ─→   │
   │                            │                           │
   │←── notification ───────────┤     (repair resolved)     │
   │                            │                           │
   ├─ Evaluate repair ──→      │                           │
   │  (feedback_*)              │                           │
   └─ Track status (anytime)    │                           │
```
