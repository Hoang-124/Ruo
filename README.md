# Ruo — Hệ Thống Quản Lý Cơ Sở Vật Chất Đại Học Thông Minh
> **Ruo (University Facilities Management System — UFMS)**  
> Nền tảng điều hành không gian, lịch biểu và tài sản đại học thông minh trên kiến trúc Digital Twin & Thuật toán CSP.

---

## Giới Thiệu Dự Án

**Ruo** là giải pháp số hóa toàn diện công tác quản trị và vận hành cơ sở vật chất dành cho các trường đại học quy mô lớn (hơn 100 phòng học, 15.000 sinh viên, hàng nghìn trang thiết bị). Hệ thống giải quyết triệt để bài toán phân bổ không gian, chống xung đột lịch học, tự động hóa quy trình kiểm kê thiết bị và bảo toàn lịch sử kiểm toán tài sản công.

---

## 5 Trụ Cột Nghiệp Vụ Cốt Lõi

### 1. Trụ Cột 1: Động Cơ Xếp TKB & Tối Ưu Phòng Bằng Thuật Toán CSP (Constraint Satisfaction Problem)
- Bộ giải thuật toán tích hợp: **Backtracking + MRV (Minimum Remaining Values) + LCV (Least Constraining Value) + AC-3 Constraint Propagation**.
- Tự động phân bổ hơn 450 lớp học phần vào 108 phòng học với **0 xung đột lịch**.
- Tối ưu hóa ràng buộc mềm: Giảm thiểu lãng phí sức chứa ghế trống, gom cụm các khoa/viện theo tòa nhà chuyên môn.

### 2. Trụ Cột 2: Bản Đồ Không Gian Kiến Trúc CAD Tương Tác & Lịch Biểu Tuần RFC-5545
- **Spatial CAD Canvas 2.5D**: Mô hình hóa trực quan từng phòng học, tòa nhà, vị trí giảng đường với mã màu trạng thái thời gian thực.
- **Time-Travel Scrubber**: Thanh trượt thời gian cho phép xem trước tình trạng phòng ở bất kỳ thời điểm nào trong ngày (07:00 - 21:00).
- **Lịch biểu tuần đồng bộ 3 lớp**: Lịch chính khóa SIS, lịch sự kiện trường, và lịch tự học của sinh viên chuẩn RFC-5545.

### 3. Trụ Cột 3: Hàng Đợi Duyệt Đa Cấp & SLA Reactor Điều Hành Sự Cố Khẩn Cấp
- Cơ chế phê duyệt đơn mượn phòng đa cấp với tính năng tự động chuyển cấp (Escalation) lên Ban Giám Hiệu khi chuyên viên chậm xử lý.
- **Kanban SLA Reactor**: Quản lý sự cố kỹ thuật với đồng hồ đếm ngược SLA chính xác theo khung giờ hành chính (07:30 - 17:00).

### 4. Trụ Cột 4: Kho Thiết Bị & Kiểm Kê Định Danh Mã QR Bất Biến
- Quản lý toàn bộ tài sản phòng học (máy chiếu laser, điều hòa, dàn âm thanh, PC đồ họa, kính hiển vi Lab).
- Gắn mã QR định danh cho từng thiết bị phục vụ kiểm kê tức thời và kiểm tra lịch sử sửa chữa.

### 5. Trụ Cột 5: Quy Trình Thanh Lý 5 Bước & Chỉ Số Tài Chính R ≥ 60%
- Áp dụng công thức kiểm toán tài sản công: `R = (Chi phí sửa chữa / Giá trị sổ sách còn lại) × 100%`.
- Khi `R ≥ 60%`, hệ thống tự động khóa tính năng mượn và kích hoạt **Tiến trình 5 bước theo Ma trận RACI** bảo đảm tính minh bạch và pháp lý.

---

## Kiến Trúc Công Nghệ & Hiệu Năng

- **Core Frontend**: React 19, Vite.
- **Thiết Kế Đồ Họa & Giao Diện**:
  - Hệ thống Design Tokens thuần Vanilla CSS (Chuyển đổi mượt mà giữa **Obsidian Dark Command Center** và **Clean Academic Light Mode**).
  - **100% Pure Native Inline SVG**: Tuyệt đối không phụ thuộc vào bất kỳ thư viện icon bên ngoài nào, tối ưu tốc độ tải trang cực đại.
  - Phông chữ chuẩn hóa: **Be Vietnam Pro** (hỗ trợ hoàn hảo tiếng Việt) và **JetBrains Mono** (hiển thị thông số telemetry, mã định danh tài sản).
- **Phân Quyền Vai Trò (RBAC)**:
  - 6 tác nhân đại học: Sinh viên, Giảng viên, Quản lý CSVC, Kỹ thuật viên, Phòng Đào tạo, Quản trị viên (Admin).
  - Tích hợp **Lưới Phân Hệ 2 Cột** truy cập trực tiếp toàn bộ 10 phân hệ nghiệp vụ không bị che khuất.
- **Bảo Mật & Kiểm Toán**: Nhật ký kiểm toán SHA-256 bất biến ghi vết 100% hành vi đặt phòng, phê duyệt và thanh lý.

---

## Hướng Dẫn Cài Đặt & Chạy Cục Bộ

### Yêu cầu môi trường:
- Node.js >= 18.0.0
- npm >= 9.0.0

### Các bước khởi chạy:
```bash
# 1. Di chuyển vào thư mục client
cd client

# 2. Cài đặt các gói phụ thuộc
npm install

# 3. Khởi chạy máy chủ phát triển
npm run dev
```

Truy cập ứng dụng tại: `http://localhost:5173`

### Biên dịch bản phát hành sản phẩm:
```bash
npm run build
```

---

## Giấy Phép & Bản Quyền

Dự án phát triển bởi nhóm **Ruo Development Team**. Mọi quyền được bảo lưu.
