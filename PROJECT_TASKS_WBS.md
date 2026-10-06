# RUO — KẾ HOẠCH PHÂN RÃ CÔNG VIỆC & ĐẶC TẢ CHI TIẾT TÁC VỤ (WBS)
## Hệ Thống Quản Lý Thiết Bị & Vật Tư — Phòng Hành Chính Đại Học
> Tài liệu kỹ thuật phục vụ quản lý dự án, phân chia công việc và bảo vệ Đồ án Tốt nghiệp.

---

## MỤC LỤC TỔNG QUAN

1. [Tổng Quan Kiến Trúc & Chiến Lược Phân Rã](#1-tổng-quan-kiến-trúc--chiến-lược-phân-rã)
2. [Ma Trận 3 Tác Nhân & Phạm Vi Chức Năng](#2-ma-trận-3-tác-nhân--phạm-vi-chức-năng)
3. [Lộ Trình Phát Triển 4 Phase](#3-lộ-trình-phát-triển-4-phase)
4. [Đặc Tả Chi Tiết 87 Nghiệp Vụ Theo 8 Phân Hệ](#4-đặc-tả-chi-tiết-87-nghiệp-vụ)
   - [PH1: Nền Tảng, Xác Thực, RBAC & Quản Trị](#ph1-nền-tảng-xác-thực-rbac--quản-trị)
   - [PH2: Quản Lý Phòng & Sơ Đồ CAD](#ph2-quản-lý-phòng--sơ-đồ-cad)
   - [PH3: Quản Lý Thiết Bị, QR & Kiểm Kê](#ph3-quản-lý-thiết-bị-qr--kiểm-kê)
   - [PH4: Điều Chuyển Thiết Bị](#ph4-điều-chuyển-thiết-bị)
   - [PH5: Sửa Chữa, Linh Kiện & Bảo Hành](#ph5-sửa-chữa-linh-kiện--bảo-hành)
   - [PH6: Bảo Trì Dự Phòng & Thanh Lý RACI](#ph6-bảo-trì-dự-phòng--thanh-lý-raci)
   - [PH7: Dashboard, Báo Cáo & Thông Báo](#ph7-dashboard-báo-cáo--thông-báo)
   - [PH8: Kiểm Toán & Giám Sát](#ph8-kiểm-toán--giám-sát)

---

## 1. TỔNG QUAN KIẾN TRÚC & CHIẾN LƯỢC PHÂN RÃ

### 1.1 Bối Cảnh Và Vấn Đề
1. **Thiết bị mất dấu:** Điều chuyển liên tục, không ai biết đang ở đâu.
2. **Không phân biệt TB cùng loại:** TV phòng A vs TV phòng B.
3. **Thiếu lịch sử sửa chữa:** Hỏng gì, sửa gì, BH bao lâu — không rõ.
4. **Thiếu kiểm soát linh kiện:** Xuất kho linh kiện không có duyệt, không truy vết.
5. **Không có bảo trì dự phòng:** Chỉ sửa khi hỏng, không phòng ngừa.
6. **Rủi ro thất thoát:** Thiếu nhật ký kiểm toán bất biến.

### 1.2 Phạm Vi Hệ Thống
**Trong phạm vi:**
- Quản lý thiết bị & vật tư (TV, máy chiếu, bàn, ghế, máy lạnh...)
- Theo dõi vị trí & luân chuyển thiết bị (phiếu điều chuyển có duyệt)
- Sửa chữa end-to-end (báo hỏng → giao → sửa → hoàn tất + xuất kho linh kiện)
- Bảo hành & cảnh báo hết hạn
- Bảo trì dự phòng (lịch định kỳ, checklist, auto tạo ticket)
- Thanh lý tài sản quy trình RACI 5 bước
- Kiểm kê QR đối soát (phiên kiểm kê chính thức)
- Import hàng loạt thiết bị từ Excel/CSV
- Dashboard KPI & Báo cáo thống kê
- Thông báo in-app & email tự động
- Kiểm toán SHA-256 bất biến

**Ngoài phạm vi:**
- Đặt phòng (booking) và kiểm tra phòng trống
- Sinh viên/Giảng viên sử dụng hệ thống
- Xếp thời khóa biểu (CSP)

### 1.3 Nguyên Tắc Horizontal Slicing
Mỗi thành viên phụ trách trọn vẹn 1 Feature Module (Schema → Controller → React UI).

---

## 2. MA TRẬN 3 TÁC NHÂN & PHẠM VI CHỨC NĂNG

| Tác nhân | Vai trò | Phạm vi nghiệp vụ chính |
| :--- | :--- | :--- |
| **Quản lý Phòng HC** *(Manager / role: `lecturer`)* | Giám sát tổng thể | Duyệt điều chuyển, duyệt sửa chữa, duyệt xuất kho linh kiện, duyệt thanh lý, xem báo cáo, cảnh báo deadline & BH, tạo kế hoạch bảo trì |
| **Nhân viên Phòng HC** *(Staff / role: `maintenance`)* | Thao tác hằng ngày | Tạo/cập nhật TB, ghi nhận hỏng, tạo phiếu luân chuyển, thực hiện sửa chữa, yêu cầu linh kiện, kiểm kê QR, log bảo trì, đề xuất thanh lý |
| **Quản trị viên** *(Admin / role: `admin`)* | Quản trị hệ thống | Quản lý tài khoản, phân quyền RBAC, danh mục (loại TB, NCC, đơn vị sửa, kho linh kiện), kiểm toán SHA-256, cấu hình template email |

---

## 3. LỘ TRÌNH PHÁT TRIỂN 4 PHASE

### Phase 0: System Bootstrap — 1 task
- Seed Data, MongoDB, Express server setup

### Phase 1: Nền Tảng Cốt Lõi — 26 tasks
- Auth (UC-1.1–1.6), Room CRUD (UC-2.1–2.7), CAD 2.5D
- User Mgmt (UC-10.1–10.6), Catalog (UC-11.1–11.4), RBAC (UC-12.1–12.2)

### Phase 2: Thiết Bị & Kiểm Kê — 12 tasks
- Equipment CRUD (UC-3.1–3.5), Batch Import (UC-3.6–3.7)
- Asset Disposal (UC-3.8), Inventory Audit (UC-3.9–3.11), QR Scan

### Phase 3: Luân Chuyển + Sửa Chữa + Bảo Trì + Thanh Lý — 30 tasks
- Transfer (UC-4.1–4.5)
- Repair (UC-5.1–5.12 + Parts)
- Warranty (UC-6.1–6.3), Deadline (UC-7.1–7.2)
- Preventive Maint (UC-7.3–7.6)
- RACI Disposal (UC-7.7–7.11)

### Phase 4: Dashboard + Báo Cáo + Thông Báo + Audit — 18 tasks
- Dashboard KPI (UC-8.1–8.3)
- Reports (UC-8.4–8.9)
- Notifications (UC-9.1–9.4)
- Audit (UC-13.1–13.3), Health (UC-14.1)

---

## 4. ĐẶC TẢ CHI TIẾT 87 NGHIỆP VỤ

### PH1: Nền Tảng, Xác Thực, RBAC & Quản Trị

#### Auth (UC-1.1 → UC-1.6) — 6 tasks
| # | Use Case | Mô tả | Actor | Priority |
|:---:|:---|:---|:---|:---:|
| 1 | UC-1.1: Login | Email/mã NV + password; JWT Access (15p) + Refresh (7d); log IP; khóa 15p khi sai 5 lần | All | Must |
| 2 | UC-1.2: Logout | Hủy token, blacklist; logout all devices | All | Must |
| 3 | UC-1.3: Forgot Password | OTP 6 số (TTL 15p); rate limit 3/giờ | Manager, Staff | Should |
| 4 | UC-1.4: Change Password | >= 8 ký tự phức tạp; hủy session khác | All | Must |
| 5 | UC-1.5: Profile View | Họ tên, mã NV, email, phòng ban, SĐT, avatar | All | Must |
| 6 | UC-1.6: Update Profile | Sửa SĐT, avatar; khóa cứng mã NV/email/PB | Manager, Staff | Should |

#### User Management (UC-10.1 → UC-10.6) — 6 tasks
| # | Use Case | Mô tả | Actor | Priority |
|:---:|:---|:---|:---|:---:|
| 7 | UC-10.1: Create User | Email/mã NV unique, vai trò, sinh password ngẫu nhiên | Admin | Must |
| 8 | UC-10.2: User Directory | Phân trang, filter vai trò/trạng thái, search | Admin | Must |
| 9 | UC-10.3: User Detail | Thông tin, login history, phiếu đã tạo | Admin | Should |
| 10 | UC-10.4: Update User & Role | Sửa info, đổi role → thu hồi JWT | Admin | Must |
| 11 | UC-10.5: Toggle Status | Active ↔ Locked; soft lock | Admin | Must |
| 12 | UC-10.6: Reset Password | Sinh password ngẫu nhiên; force change | Admin | Should |

#### Catalog (UC-11.1 → UC-11.4) — 4 tasks
| # | Use Case | Mô tả | Actor | Priority |
|:---:|:---|:---|:---|:---:|
| 13 | UC-11.1: Equipment Category CRUD | Loại TB (TV, Máy chiếu, Bàn, Ghế, Máy lạnh...) | Admin | Must |
| 14 | UC-11.2: Room Directory CRUD | Phòng, tòa nhà | Admin | Must |
| 15 | UC-11.3: Supplier CRUD | Nhà cung cấp thiết bị | Admin | Should |
| 16 | UC-11.4: Repair Unit CRUD | Đơn vị sửa chữa (tên, SĐT, chuyên môn) | Admin | Should |

#### RBAC (UC-12.1 → UC-12.2) — 2 tasks
| # | Use Case | Mô tả | Actor | Priority |
|:---:|:---|:---|:---|:---:|
| 17 | UC-12.1: Roles Matrix View | 3 vai trò, user count, permissions | Admin | Must |
| 18 | UC-12.2: Update Permissions | Tick/untick quyền; cảnh báo affected users | Admin | Must |

---

### PH2: Quản Lý Phòng & Sơ Đồ CAD

#### Room CRUD (UC-2.1 → UC-2.6) — 6 tasks
| # | Use Case | Mô tả | Actor | Priority |
|:---:|:---|:---|:---|:---:|
| 19 | UC-2.1: Create Room | Mã phòng unique, tên, tòa, tầng, sức chứa, loại | Admin | Must |
| 20 | UC-2.2: Room List View | Lọc tòa/tầng/loại/trạng thái; search tên/mã | All | Must |
| 21 | UC-2.3: Room Detail View | Thông số, TB kèm serial, lịch sử bảo trì | All | Must |
| 22 | UC-2.4: Update Room Info | Sửa tên, loại, sức chứa; ghi log | Admin | Must |
| 23 | UC-2.5: Deactivate Room | Soft INACTIVE; TB ra trước | Admin | Should |
| 24 | UC-2.6: Update Room Status | AVAILABLE ↔ MAINTENANCE ↔ INACTIVE | Admin | Must |

#### CAD (UC-2.7 + 2.5D) — 2 tasks
| # | Use Case | Mô tả | Actor | Priority |
|:---:|:---|:---|:---|:---:|
| 25 | UC-2.7: Room CAD Card | Mã, tên, số TB, TB hỏng, trạng thái trên sơ đồ | All | Must |
| 26 | CAD Mặt Bằng 2.5D | Pods 5 tầng Tòa A1, overlay TB/trạng thái | All | Must |

---

### PH3: Quản Lý Thiết Bị, QR & Kiểm Kê

#### Equipment CRUD + Lifecycle (UC-3.1 → UC-3.5) — 5 tasks
| # | Use Case | Mô tả | Actor | Priority |
|:---:|:---|:---|:---|:---:|
| 27 | UC-3.1: Create Equipment | Mã, QR, serial, hãng, model, giá, BH, phòng | Staff, Admin | Must |
| 28 | UC-3.2: Equipment Directory | Lọc loại/trạng thái/phòng/giá; search | All | Must |
| 29 | UC-3.3: Equipment Detail | Specs, điều chuyển, sửa chữa, BH, khấu hao | All | Must |
| 30 | UC-3.4: Update Equipment | Specs; đổi phòng → auto Transfer Log | Staff, Admin | Should |
| 31 | UC-3.5: Lifecycle Timeline | Nhập → phân bổ → chuyển → hỏng → sửa → BH → TL | All | Must |

#### Batch Import (UC-3.6 → UC-3.7) — 2 tasks
| # | Use Case | Mô tả | Actor | Priority |
|:---:|:---|:---|:---|:---:|
| 32 | UC-3.6: Batch Import | Upload Excel/CSV >100 dòng; preview grid; chống trùng | Staff, Admin | Must |
| 33 | UC-3.7: Batch Validation | Validate từng dòng: mã trùng, loại, phòng; lỗi chi tiết | System | Must |

#### Disposal + Inventory (UC-3.8 → UC-3.11 + QR) — 5 tasks
| # | Use Case | Mô tả | Actor | Priority |
|:---:|:---|:---|:---|:---:|
| 34 | UC-3.8: Asset Disposal | Chuyển DISPOSED, số QĐ, lý do, giá trị thu hồi | Manager | Should |
| 35 | UC-3.9: Inventory Session | Tạo đợt kiểm kê (Draft/InProgress/Completed) | Manager | Must |
| 36 | UC-3.10: QR Stocktaking | Quét QR: Khớp/Thất lạc/Hỏng/Sai vị trí | Staff | Must |
| 37 | UC-3.11: Inventory Report | PDF biên bản: đã quét, thất lạc, sai vị trí, chữ ký | Manager | Must |
| 38 | QR Code & Scan | QR → tài sản, vị trí, giá, BH, sửa chữa (sub-second) | All | Must |

---

### PH4: Điều Chuyển Thiết Bị

#### Transfer (UC-4.1 → UC-4.5) — 5 tasks
| # | Use Case | Mô tả | Actor | Priority |
|:---:|:---|:---|:---|:---:|
| 39 | UC-4.1: Create Transfer | Phiếu: thiết bị, từ/đến phòng, lý do, người | Staff | Must |
| 40 | UC-4.2: Transfer Approval | Manager duyệt/từ chối; ghi lý do | Manager | Must |
| 41 | UC-4.3: Complete Transfer | Hoàn tất, auto update phòng trong Equipment | Staff | Must |
| 42 | UC-4.4: Transfer History | Lịch sử: từ/đến phòng, ngày, người, lý do | All | Must |
| 43 | UC-4.5: Pending Transfers | Dashboard phiếu chờ duyệt | Manager | Should |

---

### PH5: Sửa Chữa, Linh Kiện & Bảo Hành

#### Repair (UC-5.1 → UC-5.9) — 9 tasks
| # | Use Case | Mô tả | Actor | Priority |
|:---:|:---|:---|:---|:---:|
| 44 | UC-5.1: Report Damage | TB, phòng, mô tả, 5 ảnh, mức độ | Staff | Must |
| 45 | UC-5.2: Repair List | Lọc trạng thái/phòng/mức độ/hạn | All | Must |
| 46 | UC-5.3: Assign Repair | Giao việc; hiện workload NV | Manager | Must |
| 47 | UC-5.4: Accept & Start | Nhận việc → Đang sửa; nơi sửa, người mang | Staff | Must |
| 48 | UC-5.5: Log Repair | Nội dung sửa, vật tư, chi phí, ảnh | Staff | Must |
| 49 | UC-5.6: Complete Repair | Người mang về, phòng trả, BH sau sửa | Staff | Must |
| 50 | UC-5.7: Repair Timeline | Báo hỏng → Giao → Sửa → Xong (visual) | All | Should |
| 51 | UC-5.8: Equipment Repair History | Tất cả sửa chữa: ngày, lỗi, nơi, chi phí | All | Must |
| 52 | UC-5.9: Overdue Alerts | TB quá hạn sửa; badge cảnh báo | Manager | Should |

#### Parts / Linh Kiện (UC-5.10 → UC-5.12) — 3 tasks
| # | Use Case | Mô tả | Actor | Priority |
|:---:|:---|:---|:---|:---:|
| 53 | UC-5.10: Parts Requisition | Phiếu xuất kho linh kiện; liên kết ticket sửa | Staff | Must |
| 54 | UC-5.11: Parts Approval | Duyệt xuất kho; trừ tồn kho; ghi log | Manager | Must |
| 55 | UC-5.12: Parts Inventory | CRUD linh kiện (tên, SL, giá, NCC); cảnh báo hết | Admin | Must |

#### Warranty (UC-6.1 → UC-6.3) — 3 tasks
| # | Use Case | Mô tả | Actor | Priority |
|:---:|:---|:---|:---|:---:|
| 56 | UC-6.1: Warranty Status | Hạn BH, còn/hết, NCC, liên hệ | All | Must |
| 57 | UC-6.2: Warranty Expiring | TB hết BH trong 30/60/90 ngày | Manager | Must |
| 58 | UC-6.3: Post-Repair Warranty | BH mới sau sửa chữa | Staff | Should |

#### Deadline (UC-7.1 → UC-7.2) — 2 tasks
| # | Use Case | Mô tả | Actor | Priority |
|:---:|:---|:---|:---|:---:|
| 59 | UC-7.1: Deadline Tracking | Người PTC, hạn dự kiến, thời gian còn lại | Manager, Staff | Must |
| 60 | UC-7.2: Deadline Warning | ON_TRACK / AT_RISK / OVERDUE | Manager | Must |

---

### PH6: Bảo Trì Dự Phòng & Thanh Lý RACI

#### Preventive Maintenance (UC-7.3 → UC-7.6) — 4 tasks
| # | Use Case | Mô tả | Actor | Priority |
|:---:|:---|:---|:---|:---:|
| 61 | UC-7.3: Preventive Calendar | Lịch bảo dưỡng định kỳ; cảnh báo 3 ngày trước | Staff, Manager | Should |
| 62 | UC-7.4: Create Maint Plan | Nhóm phòng/TB, chu kỳ (tháng/quý/năm), checklist | Manager | Should |
| 63 | UC-7.5: Log Maint Result | Tick checklist, đánh giá; hỏng → auto ticket | Staff | Should |
| 64 | UC-7.6: Room Maint History | Timeline sửa chữa phòng; tổng chi phí | Manager, Staff | Should |

#### RACI 5-Step Disposal (UC-7.7 → UC-7.11) — 5 tasks
| # | Use Case | Mô tả | Actor | Priority |
|:---:|:---|:---|:---|:---:|
| 65 | UC-7.7: Disposal Proposal (R) | Tính R = sửa/giá trị; R>=60% → hồ sơ thanh lý | Staff | Must |
| 66 | UC-7.8: HC Approve (A) | Phòng HC xét duyệt; bổ sung chứng từ | Manager | Must |
| 67 | UC-7.9: BGH Approval (A) | BGH phê duyệt cuối cùng | Admin | Must |
| 68 | UC-7.10: Procurement (C) | Dự trù mua sắm thay thế | Manager | Should |
| 69 | UC-7.11: New Receipt (I) | Nhập kho mới; gắn QR mới | Staff | Should |

---

### PH7: Dashboard, Báo Cáo & Thông Báo

#### Dashboard KPI (UC-8.1 → UC-8.3) — 3 tasks
| # | Use Case | Mô tả | Actor | Priority |
|:---:|:---|:---|:---|:---:|
| 70 | UC-8.1: KPI Cards | TB hoạt động/hỏng/sửa, BH sắp hết, phiếu mở | Manager, Admin | Must |
| 71 | UC-8.2: Repair Cost Aggregation | Chi phí sửa tích lũy tháng/quý/năm; trung bình | Manager, Admin | Must |
| 72 | UC-8.3: Equipment Health Score | Số lần hỏng, chi phí lũy kế, MTBF | Manager, Admin | Should |

#### Reports (UC-8.4 → UC-8.9) — 6 tasks
| # | Use Case | Mô tả | Actor | Priority |
|:---:|:---|:---|:---|:---:|
| 73 | UC-8.4: By Room | TB theo phòng, theo tình trạng | Manager, Admin | Must |
| 74 | UC-8.5: By Status | Hoạt động/đang sửa/chờ TL/đã TL | Manager, Admin | Must |
| 75 | UC-8.6: Repair Frequency | Hỏng theo loại TB/theo phòng | Manager, Admin | Should |
| 76 | UC-8.7: Warranty Report | TB sắp hết BH | Manager, Admin | Should |
| 77 | UC-8.8: Overdue Report | TB quá hạn sửa | Manager, Admin | Must |
| 78 | UC-8.9: PDF/Excel Export | PDF/Excel chuẩn in, logo, timestamp | Manager, Admin | Must |

#### Notifications (UC-9.1 → UC-9.4) — 4 tasks
| # | Use Case | Mô tả | Actor | Priority |
|:---:|:---|:---|:---|:---:|
| 79 | UC-9.1: Notification Center | Duyệt phiếu, sự cố, deadline, BH; badge đỏ | All | Must |
| 80 | UC-9.2: Mark Read | Đánh dấu 1/tất cả đã đọc; badge update | All | Should |
| 81 | UC-9.3: Email Dispatcher | HTML email tự động: duyệt, BH, quá hạn; logo | System | Should |
| 82 | UC-9.4: Template Builder | Mẫu email/in-app với placeholders động | Admin | Should |

---

### PH8: Kiểm Toán & Giám Sát

#### Audit (UC-13.1 → UC-13.3) — 3 tasks
| # | Use Case | Mô tả | Actor | Priority |
|:---:|:---|:---|:---|:---:|
| 83 | UC-13.1: Immutable Audit Trail | SHA-256 chain cho CRUD, duyệt, luân chuyển | Admin | Must |
| 84 | UC-13.2: Cryptographic Verify | Toàn vẹn SHA-256 genesis → current | Admin | Must |
| 85 | UC-13.3: Audit Export | CSV/Excel, max 10K rows | Admin | Should |

#### System Health (UC-14.1) — 1 task
| # | Use Case | Mô tả | Actor | Priority |
|:---:|:---|:---|:---|:---:|
| 86 | UC-14.1: Health Monitor | Users online, API reqs, phiếu mở, overdue | Admin | Must |

#### Seed Data — 1 task
| # | Use Case | Mô tả | Actor | Priority |
|:---:|:---|:---|:---|:---:|
| 87 | Seed Data Initializer | 3 users, 108 phòng, kho TB, danh mục, NCC, đơn vị sửa, linh kiện | System | Must |

---

## TỔNG KẾT

| Phân hệ | Nhóm chức năng | Số task |
|:---|:---|:---:|
| **PH1** | Auth + User Mgmt + Catalog + RBAC | 18 |
| **PH2** | Room & CAD | 8 |
| **PH3** | Equipment + Batch Import + Inventory + QR | 12 |
| **PH4** | Transfer | 5 |
| **PH5** | Repair + Parts + Warranty + Deadline | 17 |
| **PH6** | Preventive Maintenance + RACI Disposal | 9 |
| **PH7** | Dashboard + Reports + Notifications | 13 |
| **PH8** | Audit + Health + Seed | 5 |
| | **TỔNG** | **87** |
