# RUO — MASTER TASK MATRIX
## Hệ Thống Quản Lý Thiết Bị & Vật Tư — Phòng Hành Chính Đại Học

> **TỔNG KẾT BẢNG QUẢN LÝ DỰ ÁN RUO (Chuẩn 87 Nghiệp Vụ Toàn Diện)**
> - **Tổng số công việc:** 87 nghiệp vụ
> - **Tiến độ:** 7 / 87 (8.0% — Đã hoàn thành Auth UC-1.1 đến UC-1.6 + Seed Data)
> - **Độ ưu tiên:** Must: 58 | Should: 28 | Could: 1
> - **Phân loại triển khai:** FE/BE: 74 | BE: 8 | FE: 5
> - **Đối tượng sử dụng:** 3 vai trò — Quản lý HC (Manager), Nhân viên HC (Staff), Admin

---

| Epic | Phase | Feature | User Story | Actor | Priority | In Progress | Owner | Est | Dep | Acceptance Criteria | API/DB Notes | Review Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| System Bootstrap | Phase 0 | Seed Data Initializer | As system, I want to initialize master data | System | Must | Done | BE | M | none | Khởi tạo 3 tài khoản, Tòa A1, 108 phòng CAD, kho TB QR, danh mục, NCC, đơn vị sửa, kho linh kiện | npm run seed | MongoDB all collections |
| Authentication | Phase 1 | UC-1.1: Login | As a user, I want to login | Manager, Staff, Admin | Must | Done | FE/BE | M | none | Email/mã NV + password; JWT Access (15p) + Refresh (7d); log IP; khóa 15p khi sai 5 lần | POST /api/auth/login | users |
| Authentication | Phase 1 | UC-1.2: Logout | As a user, I want to logout | Manager, Staff, Admin | Must | Done | FE/BE | S | UC-1.1 | Hủy token, blacklist; logout all devices | POST /api/auth/logout | Token blacklist |
| Authentication | Phase 1 | UC-1.3: Forgot Password | As a user, I want password reset | Manager, Staff | Should | Done | FE/BE | M | none | OTP 6 số (TTL 15p); rate limit 3/giờ | POST /api/auth/forgot-password | Nodemailer |
| Authentication | Phase 1 | UC-1.4: Change Password | As a user, I want to change password | Manager, Staff, Admin | Must | Done | FE/BE | S | UC-1.1 | >= 8 ký tự phức tạp; hủy session khác | POST /api/auth/change-password | BCrypt |
| Authentication | Phase 1 | UC-1.5: Profile View | As a user, I want to view profile | Manager, Staff, Admin | Must | Done | FE/BE | S | UC-1.1 | Họ tên, mã NV, email, phòng ban, SĐT, avatar | GET /api/auth/me | Profile |
| Authentication | Phase 1 | UC-1.6: Update Profile | As a user, I want to update info | Manager, Staff | Should | Done | FE/BE | S | UC-1.5 | Sửa SĐT, avatar; khóa cứng mã NV/email/PB | PUT /api/auth/me | Validation |
| Room & Facility | Phase 1 | UC-2.1: Create Room | As admin, I want to add room | Admin | Must | In Progress | FE/BE | M | none | Mã unique, tên, tòa, tầng, sức chứa, loại | POST /api/facilities/rooms | rooms |
| Room & Facility | Phase 1 | UC-2.2: Room List View | As a user, I want to browse rooms | All | Must | In Progress | FE/BE | M | none | Lọc tòa/tầng/loại/trạng thái; search | GET /api/facilities/rooms | Indexes |
| Room & Facility | Phase 1 | UC-2.3: Room Detail | As a user, I want room + equipment | All | Must | In Progress | FE/BE | M | UC-2.2 | Specs, TB kèm serial, lịch sử bảo trì | GET /api/facilities/rooms/:code | Populated |
| Room & Facility | Phase 1 | UC-2.4: Update Room | As admin, I want to update room | Admin | Must | In Progress | FE/BE | M | UC-2.2 | Sửa tên, loại, sức chứa; ghi log | PUT /api/facilities/rooms/:id | Audit |
| Room & Facility | Phase 1 | UC-2.5: Deactivate Room | As admin, I want to deactivate | Admin | Should | In Progress | FE/BE | S | UC-2.2 | Soft INACTIVE; TB ra trước | PUT /rooms/:id/deactivate | Soft |
| Room & Facility | Phase 1 | UC-2.6: Room Status | As admin, I want to toggle status | Admin | Must | In Progress | FE/BE | M | UC-2.2 | AVAILABLE ↔ MAINTENANCE ↔ INACTIVE | PUT /rooms/:id/status | Toggle |
| Spatial CAD | Phase 1 | UC-2.7: Room CAD Card | As a user, I want CAD room info | All | Must | In Progress | FE | M | none | Mã, tên, số TB, TB hỏng, trạng thái | FloorPlan2D | SVG |
| Spatial CAD | Phase 1 | CAD Mặt Bằng 2.5D | As a user, I want floor plan | All | Must | In Progress | FE/BE | L | none | 5 tầng, TB overlay | GET /cad-canvas | Overlay |
| Equipment | Phase 2 | UC-3.1: Create Equipment | As staff, I want to add equipment | Staff, Admin | Must | In Progress | FE/BE | M | none | Mã, QR, serial, hãng, model, giá, BH, phòng | POST /api/equipments | equipments |
| Equipment | Phase 2 | UC-3.2: Equipment Directory | As a user, I want to search | All | Must | In Progress | FE/BE | M | none | Lọc loại/trạng thái/phòng/giá; search | GET /api/equipments | Pagination |
| Equipment | Phase 2 | UC-3.3: Equipment Detail | As a user, I want full info | All | Must | In Progress | FE/BE | M | UC-3.2 | Specs, điều chuyển, sửa chữa, BH, khấu hao | GET /api/equipments/:id | Life-cycle |
| Equipment | Phase 2 | UC-3.4: Update Equipment | As staff, I want to update | Staff, Admin | Should | In Progress | FE/BE | S | UC-3.2 | Specs; đổi phòng → Transfer Log | PUT /api/equipments/:id | Tracking |
| Equipment | Phase 2 | UC-3.5: Lifecycle Timeline | As a user, I want history | All | Must | In Progress | FE/BE | M | UC-3.3 | Nhập→phân bổ→chuyển→hỏng→sửa→BH→TL | GET /equipments/:id/lifecycle | Aggregated |
| Equipment | Phase 2 | UC-3.6: Batch Import | As staff, I want Excel import | Staff, Admin | Must | In Progress | FE/BE | L | none | >100 dòng; validate, preview, chống trùng | POST /api/equipments/import | Bulk |
| Equipment | Phase 2 | UC-3.7: Batch Validation | As system, I want to validate | System | Must | In Progress | BE | M | UC-3.6 | Lỗi chi tiết theo dòng | POST /equipments/import/validate | Row errors |
| Equipment | Phase 2 | UC-3.8: Asset Disposal | As manager, I want to dispose | Manager, Admin | Should | In Progress | FE/BE | M | UC-3.3 | DISPOSED, QĐ, lý do, thu hồi | PUT /equipments/:id/dispose | Retirement |
| Equipment | Phase 2 | UC-3.9: Inventory Session | As manager, I want audit session | Manager | Must | In Progress | FE/BE | M | none | Draft/InProgress/Completed | POST /api/inventory-sessions | Sessions |
| Equipment | Phase 2 | UC-3.10: QR Stocktaking | As staff, I want to scan items | Staff | Must | In Progress | FE/BE | M | UC-3.9 | Khớp/Thất lạc/Hỏng/Sai vị trí | PUT /inventory-sessions/:id/scan | QR |
| Equipment | Phase 2 | UC-3.11: Inventory Report | As manager, I want audit report | Manager | Must | In Progress | FE/BE | M | UC-3.9 | PDF biên bản, chữ ký | GET /inventory-sessions/:id/export | PDF |
| Equipment | Phase 2 | QR Code & Scan | As a user, I want QR lookup | All | Must | In Progress | FE/BE | M | none | QR → info sub-second | GET /equipments/qr/:qrCode | Lookup |
| Transfer | Phase 3 | UC-4.1: Create Transfer | As staff, I want transfer request | Staff | Must | In Progress | FE/BE | M | UC-3.2 | TB, từ/đến phòng, lý do, người | POST /api/transfers | transfers |
| Transfer | Phase 3 | UC-4.2: Approve Transfer | As manager, I want to approve | Manager | Must | In Progress | FE/BE | M | UC-4.1 | Duyệt/từ chối; lý do | PUT /transfers/:id/approve | Approval |
| Transfer | Phase 3 | UC-4.3: Complete Transfer | As staff, I want to complete | Staff | Must | In Progress | FE/BE | M | UC-4.2 | Hoàn tất, auto update phòng | PUT /transfers/:id/complete | Update |
| Transfer | Phase 3 | UC-4.4: Transfer History | As a user, I want transfer log | All | Must | In Progress | FE/BE | S | UC-4.1 | Từ/đến, ngày, người, lý do | GET /transfers/equipment/:id | Log |
| Transfer | Phase 3 | UC-4.5: Pending Queue | As manager, I want pending list | Manager | Should | In Progress | FE/BE | M | UC-4.1 | Phiếu chờ duyệt | GET /api/transfers/pending | Queue |
| Repair | Phase 3 | UC-5.1: Report Damage | As staff, I want to report | Staff | Must | In Progress | FE/BE | M | none | TB, phòng, mô tả, 5 ảnh, mức độ | POST /api/repairs | repairs |
| Repair | Phase 3 | UC-5.2: Repair List | As a user, I want tickets | All | Must | In Progress | FE/BE | M | none | Lọc trạng thái/phòng/mức/hạn | GET /api/repairs | Filterable |
| Repair | Phase 3 | UC-5.3: Assign Repair | As manager, I want to assign | Manager | Must | In Progress | FE/BE | M | UC-5.2 | Giao việc; workload | PUT /repairs/:id/assign | Balance |
| Repair | Phase 3 | UC-5.4: Accept Repair | As staff, I want to start | Staff | Must | In Progress | FE/BE | S | UC-5.3 | Đang sửa; nơi, người mang | PUT /repairs/:id/accept | Timer |
| Repair | Phase 3 | UC-5.5: Log Repair | As staff, I want to log work | Staff | Must | In Progress | FE/BE | M | UC-5.4 | Nội dung, vật tư, chi phí, ảnh | PUT /repairs/:id/progress | Parts |
| Repair | Phase 3 | UC-5.6: Complete Repair | As staff, I want to finish | Staff | Must | In Progress | FE/BE | M | UC-5.4 | Người mang về, phòng, BH | PUT /repairs/:id/resolve | Return |
| Repair | Phase 3 | UC-5.7: Repair Timeline | As a user, I want visual | All | Should | In Progress | FE | S | UC-5.1 | Báo→Giao→Sửa→Xong | Timeline | Stepper |
| Repair | Phase 3 | UC-5.8: Repair History | As a user, I want per-equipment | All | Must | In Progress | FE/BE | M | UC-3.3 | Tất cả sửa chữa | GET /repairs/equipment/:id | Log |
| Repair | Phase 3 | UC-5.9: Overdue Alerts | As manager, I want overdue | Manager | Should | In Progress | FE/BE | M | UC-5.2 | Quá hạn; badge | GET /api/repairs/overdue | Filter |
| Repair | Phase 3 | UC-5.10: Parts Request | As staff, I want spare parts | Staff | Must | In Progress | FE/BE | M | UC-5.4 | Phiếu xuất kho linh kiện | POST /api/parts-requests | Parts |
| Repair | Phase 3 | UC-5.11: Parts Approval | As manager, I want to approve | Manager | Must | In Progress | FE/BE | M | UC-5.10 | Duyệt; trừ tồn kho | PUT /parts-requests/:id/approve | Stock |
| Repair | Phase 3 | UC-5.12: Parts Inventory | As admin, I want parts stock | Admin | Must | In Progress | FE/BE | M | none | CRUD linh kiện; cảnh báo hết | CRUD /api/parts | spare_parts |
| Warranty | Phase 3 | UC-6.1: Warranty Status | As a user, I want warranty | All | Must | In Progress | FE/BE | M | UC-3.3 | BH còn/hết, NCC | Equipment fields | Display |
| Warranty | Phase 3 | UC-6.2: Warranty Expiring | As manager, I want alerts | Manager | Must | In Progress | FE/BE | M | none | 30/60/90 ngày | GET /equipments/warranty-expiring | Filter |
| Warranty | Phase 3 | UC-6.3: Post-Repair BH | As staff, I want post-repair | Staff | Should | In Progress | FE/BE | S | UC-5.6 | BH mới sau sửa | PUT /repairs/:id | Post-repair |
| Deadline | Phase 3 | UC-7.1: Deadline Track | As a user, I want deadlines | Manager, Staff | Must | In Progress | FE/BE | M | UC-5.3 | PTC, hạn, còn lại | Repair fields | Countdown |
| Deadline | Phase 3 | UC-7.2: Warning | As manager, I want warning | Manager | Must | In Progress | BE | M | UC-7.1 | ON_TRACK/AT_RISK/OVERDUE | Background | SLA-lite |
| Preventive | Phase 3 | UC-7.3: Prev Calendar | As staff, I want schedule | Staff, Manager | Should | In Progress | FE/BE | M | none | Lịch bảo dưỡng; 3 ngày trước | GET /maintenance/plans | maint_plans |
| Preventive | Phase 3 | UC-7.4: Create Plan | As manager, I want plan | Manager | Should | In Progress | FE/BE | M | UC-7.3 | Phòng/TB, chu kỳ, checklist | POST /maintenance/plans | Generator |
| Preventive | Phase 3 | UC-7.5: Log Result | As staff, I want to log | Staff | Should | In Progress | FE/BE | M | UC-7.3 | Tick, đánh giá; hỏng→ticket | PUT /maintenance/plans/:id/log | Log |
| Preventive | Phase 3 | UC-7.6: Room History | As a user, I want room maint | Manager, Staff | Should | In Progress | FE/BE | M | UC-2.3 | Timeline; tổng chi phí | GET /rooms/:code/maint-history | Telemetry |
| RACI Disposal | Phase 3 | UC-7.7: Proposal (R) | As staff, I want to propose | Staff | Must | In Progress | FE/BE | L | UC-3.3 | R>=60% → hồ sơ | POST /api/disposals | disposals |
| RACI Disposal | Phase 3 | UC-7.8: HC Approve (A) | As manager, I want to review | Manager | Must | In Progress | FE/BE | M | UC-7.7 | Duyệt/bổ sung | PUT /disposals/:id/hc-approve | Step 2 |
| RACI Disposal | Phase 3 | UC-7.9: BGH Approve (A) | As admin, I want final call | Admin | Must | In Progress | FE/BE | M | UC-7.8 | Phê duyệt cuối | PUT /disposals/:id/bgh-approve | Step 3 |
| RACI Disposal | Phase 3 | UC-7.10: Procurement (C) | As manager, I want replace | Manager | Should | In Progress | FE/BE | M | UC-7.9 | Dự trù mua sắm | POST /disposals/:id/procurement | Step 4 |
| RACI Disposal | Phase 3 | UC-7.11: Receipt (I) | As staff, I want to receive | Staff | Should | In Progress | FE/BE | M | UC-7.10 | Nhập kho; QR mới | PUT /disposals/:id/receipt | Step 5 |
| Dashboard | Phase 4 | UC-8.1: KPI Cards | As manager, I want overview | Manager, Admin | Must | In Progress | FE/BE | M | none | TB hoạt động/hỏng/sửa, BH, phiếu | GET /dashboard/kpi | Agg |
| Dashboard | Phase 4 | UC-8.2: Repair Cost | As manager, I want cost trends | Manager, Admin | Must | In Progress | FE/BE | M | none | Chi phí tháng/quý/năm | GET /dashboard/repair-cost | Charts |
| Dashboard | Phase 4 | UC-8.3: Health Score | As manager, I want health | Manager, Admin | Should | In Progress | FE/BE | M | UC-3.3 | Hỏng, chi phí, MTBF | GET /dashboard/health-score | MTBF |
| Reports | Phase 4 | UC-8.4: By Room | As manager, I want per room | Manager, Admin | Must | In Progress | FE/BE | M | none | TB/phòng, tình trạng | GET /reports/by-room | Group |
| Reports | Phase 4 | UC-8.5: By Status | As manager, I want breakdown | Manager, Admin | Must | In Progress | FE/BE | M | none | 4 trạng thái | GET /reports/by-status | Charts |
| Reports | Phase 4 | UC-8.6: Repair Freq | As manager, I want frequency | Manager, Admin | Should | In Progress | FE/BE | M | none | Hỏng/loại/phòng | GET /reports/repair-frequency | Analytics |
| Reports | Phase 4 | UC-8.7: Warranty | As manager, I want warranty | Manager, Admin | Should | In Progress | FE/BE | S | UC-6.2 | Sắp hết BH | GET /reports/warranty-expiring | View |
| Reports | Phase 4 | UC-8.8: Overdue | As manager, I want overdue | Manager, Admin | Must | In Progress | FE/BE | M | UC-5.9 | Quá hạn sửa | GET /reports/overdue-repairs | Alert |
| Reports | Phase 4 | UC-8.9: Export | As manager, I want export | Manager, Admin | Must | In Progress | FE/BE | M | none | PDF/Excel, logo | GET /reports/export | PDFKit |
| Notifications | Phase 4 | UC-9.1: Center | As a user, I want notifs | All | Must | In Progress | FE/BE | M | none | Duyệt, sự cố, deadline, BH; badge | GET /notifications | Badge |
| Notifications | Phase 4 | UC-9.2: Mark Read | As a user, I want to mark | All | Should | In Progress | FE/BE | S | UC-9.1 | 1/tất cả đã đọc | PUT /notifications/read | State |
| Notifications | Phase 4 | UC-9.3: Email | As system, I want auto email | System | Should | In Progress | BE | M | none | HTML email; logo | emailService.js | Nodemailer |
| Notifications | Phase 4 | UC-9.4: Templates | As admin, I want templates | Admin | Should | In Progress | FE/BE | M | UC-9.3 | Placeholders động | PUT /admin/config/templates | Editor |
| User Mgmt | Phase 1 | UC-10.1: Create | As admin, I want to add user | Admin | Must | In Progress | FE/BE | M | UC-1.1 | Email/mã unique, role, password | POST /admin/users | Provision |
| User Mgmt | Phase 1 | UC-10.2: Directory | As admin, I want user list | Admin | Must | In Progress | FE/BE | M | UC-10.1 | Phân trang, filter, search | GET /admin/users | Index |
| User Mgmt | Phase 1 | UC-10.3: Detail | As admin, I want activity | Admin | Should | In Progress | FE/BE | S | UC-10.2 | Info, login, phiếu | GET /admin/users/:id | Activity |
| User Mgmt | Phase 1 | UC-10.4: Update | As admin, I want to update | Admin | Must | In Progress | FE/BE | M | UC-10.2 | Info, role → JWT | PUT /admin/users/:id | RBAC |
| User Mgmt | Phase 1 | UC-10.5: Toggle | As admin, I want lock/unlock | Admin | Must | In Progress | FE/BE | S | UC-10.2 | Active ↔ Locked | PUT /admin/users/:id/toggle | Status |
| User Mgmt | Phase 1 | UC-10.6: Reset PW | As admin, I want reset | Admin | Should | In Progress | FE/BE | S | UC-10.2 | Random; force change | POST /admin/users/:id/reset | Reset |
| Catalog | Phase 1 | UC-11.1: Categories | As admin, I want types | Admin | Must | In Progress | FE/BE | M | none | CRUD loại TB | CRUD /admin/categories | Master |
| Catalog | Phase 1 | UC-11.2: Rooms | As admin, I want rooms | Admin | Must | In Progress | FE/BE | M | none | CRUD phòng/tòa | CRUD /admin/buildings | Master |
| Catalog | Phase 1 | UC-11.3: Suppliers | As admin, I want suppliers | Admin | Should | In Progress | FE/BE | S | none | CRUD NCC | CRUD /admin/suppliers | Master |
| Catalog | Phase 1 | UC-11.4: Repair Units | As admin, I want repair cos | Admin | Should | In Progress | FE/BE | S | none | CRUD đơn vị sửa | CRUD /admin/repair-units | Master |
| RBAC | Phase 1 | UC-12.1: Matrix | As admin, I want RBAC | Admin | Must | In Progress | FE/BE | M | UC-1.1 | 3 roles, count, perms | GET /admin/roles | RBAC |
| RBAC | Phase 1 | UC-12.2: Perms | As admin, I want to modify | Admin | Must | In Progress | FE/BE | M | UC-12.1 | Tick/untick; warn | PUT /admin/roles/:id/perms | Policy |
| Audit | Phase 4 | UC-13.1: Trail | As admin, I want audit | Admin | Must | In Progress | FE/BE | L | none | SHA-256 chain | GET /audit/logs | audit_logs |
| Audit | Phase 4 | UC-13.2: Verify | As admin, I want integrity | Admin | Must | In Progress | BE | M | UC-13.1 | Genesis → current | GET /audit/verify-chain | Verify |
| Audit | Phase 4 | UC-13.3: Export | As admin, I want export | Admin | Should | In Progress | FE/BE | M | UC-13.1 | CSV/Excel, 10K | GET /audit/export | Export |
| System | Phase 4 | UC-14.1: Health | As admin, I want health | Admin | Must | In Progress | FE/BE | M | none | Online, reqs, repairs, alerts | GET /health | Telemetry |