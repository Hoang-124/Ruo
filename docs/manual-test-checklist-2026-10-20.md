# Checklist test lại 11 task trong task.text

Web: http://localhost:5173

Backend: http://localhost:5000/api/health

Phiên này chạy database demo riêng `ruo_manual_test_20261020` trên MongoDB cổng 27028. Các thao tác test sẽ lưu vào database này. Không chạy lại lệnh seed vì lệnh đó xóa dữ liệu của database đích.

## Tài khoản

Mật khẩu chung: `Ruo@2026`.

| Vai trò | Email |
| --- | --- |
| Admin | admin@ruo.edu.vn |
| Manager | manager@ruo.edu.vn |
| Technician | technician@ruo.edu.vn |
| Lecturer | lecturer@ruo.edu.vn |

Đăng xuất trước khi đổi vai trò, hoặc dùng các cửa sổ trình duyệt có phiên đăng nhập riêng. Mở bằng `localhost:5173` để khớp cấu hình CORS.

## Số liệu đối chiếu ban đầu

Kiểm tra dashboard trước khi điều chuyển, sửa chữa hoặc sửa dữ liệu. Các số sau là số liệu demo đã đối chiếu qua API ngày 20/10/2026:

- 78 phòng; phòng nhập sẵn dùng mã cũ `A1-*`, `KHO-01`. Tạo phòng mới phải theo quy tắc `P101`–`P508` của task.
- Phòng `A1-101`: 2 thiết bị, gồm máy chiếu `EQ-PRJ-101` đang dùng và điều hòa `EQ-AC-101-B` bị hỏng; có 2 phiếu sửa chữa và 1 lượt điều chuyển trong lịch sử.
- Phòng `A1-201`: trống. Kho `KHO-01`: 1 máy chiếu dự phòng.
- KPI: **3 thiết bị**, **33,33% hoạt động**, **1 bị hỏng**, **1 ca sửa quá hạn**, **40.200.000 đ giá trị kho** (24.500.000 đ thiết bị + 15.700.000 đ linh kiện).
- Năm 2026: tháng 9 có 500.000 đ công sửa + 850.000 đ linh kiện = **1.350.000 đ**; tháng 10 có **300.000 đ** công kiểm tra; tổng năm **1.650.000 đ**.
- Theo quý: Q3 = 1.350.000 đ; Q4 = 300.000 đ; Q1/Q2 = 0.
- Điều hòa: 2 sự cố, tuổi khoảng 730 ngày, MTBF khoảng 365 ngày, điểm **92/100**. Hai máy chiếu chưa có sự cố, điểm **100/100**, MTBF chưa xác định. Số ngày tăng theo thời gian.

## Checklist theo task

### 1. UC-2.1 — Thêm phòng (Admin)

- [ ] Vào Danh Mục Phòng Học → Thêm Phòng. Tạo `P508`, tên `Phòng test 508`, tầng 5, sức chứa 40, loại Phòng học. Lưu thành công, tải lại vẫn còn.
- [ ] Tòa nhà cố định A1. Chọn tầng không khớp mã phải bị chặn.
- [ ] Thử mã trùng `P508`, mã sai `P609`/`P509`, tên trống, sức chứa 0, âm hoặc 501: báo lỗi rõ, không tạo bản ghi.

### 2. UC-2.2 — Danh sách phòng (cả 4 vai trò)

- [ ] Tìm `A1-101` và một phần tên phòng; lọc tầng 1–5, loại, trạng thái riêng lẻ và kết hợp.
- [ ] Chuyển trang, đổi bộ lọc, Xóa Bộ Lọc: kết quả và tổng số khớp; đổi bộ lọc trở về trang đầu.
- [ ] Tìm chuỗi không tồn tại: hiển thị trạng thái không có kết quả.

### 3. UC-2.3 — Chi tiết phòng (cả 4 vai trò)

- [ ] Mở `A1-101`: đúng thông số phòng, 2 thiết bị có serial/QR, 2 phiếu sửa và 1 lượt điều chuyển.
- [ ] Mở `A1-201`: danh sách thiết bị trống hiển thị rõ, không lỗi.
- [ ] Lịch sử ghi rõ giới hạn 20 bản ghi gần nhất; mở lần lượt nhiều phòng không lẫn dữ liệu.

### 4. UC-2.4 — Sửa phòng (Admin)

- [ ] Sửa `P508`: đổi tên, loại, sức chứa và chức năng. Lưu, đóng/mở lại và tải lại trang: dữ liệu giữ nguyên.
- [ ] Mã phòng, tòa nhà, tầng không sửa được; giá trị không hợp lệ bị chặn.
- [ ] Kiểm tra nhật ký kiểm toán: có người thực hiện và giá trị trước/sau của lần sửa.

### 5. UC-2.5 — Ngừng sử dụng phòng (Admin)

- [ ] Thử ngừng `A1-101`: phải bị chặn và liệt kê 2 thiết bị cần di chuyển.
- [ ] Tạo lệnh điều chuyển: khi KTV chưa hoàn tất, thiết bị vẫn ở phòng cũ và phòng chưa được ngừng dùng.
- [ ] Sau khi hoàn tất điều chuyển toàn bộ thiết bị, thử lại: chuyển được sang INACTIVE.
- [ ] Thử ngừng phòng trống `P508`: thành công, phòng còn trong danh sách với trạng thái ngừng dùng.

### 6. UC-2.6 — Đổi trạng thái (Admin)

- [ ] Với `P508`, lần lượt đổi AVAILABLE → MAINTENANCE → INACTIVE → AVAILABLE; tải lại và đối chiếu danh sách/chi tiết/CAD.
- [ ] Với phòng còn thiết bị, chọn INACTIVE qua nút Trạng thái cũng phải bị chặn giống nút ngừng sử dụng.
- [ ] Phòng INACTIVE không được nhận điều chuyển mới; phòng được mở lại có thể nhận thiết bị.

### 7. UC-2.7 — Thẻ phòng CAD (cả 4 vai trò)

- [ ] Trước khi thay đổi dữ liệu, chọn `A1-101`: mã phòng, 2 thiết bị, 1 thiết bị cần chú ý và trạng thái khớp chi tiết.
- [ ] Đổi trạng thái hoặc hoàn tất điều chuyển rồi tải lại CAD: số lượng/trạng thái thay đổi đúng.
- [ ] Phòng mới chưa có vị trí trên bản vẽ vẫn truy cập được qua danh sách phòng bổ sung trên tầng tương ứng.

### 8. CAD ở trang đầu (cả 4 vai trò)

- [ ] Đăng nhập lần lượt 4 tài khoản: trang đầu có sơ đồ CAD, chọn được cả 5 tầng.
- [ ] Nhấn phòng: hiện danh sách thiết bị ngay tại trang, không bắt buộc chuyển sang trang danh mục.
- [ ] Chuyển tầng/phòng liên tục: không giữ thiết bị của phòng trước; phòng trống không có dữ liệu giả.

### 9. UC-8.1 — KPI (Admin, Manager)

- [ ] Đối chiếu đủ 5 KPI với số liệu ban đầu ở trên.
- [ ] Sau khi thay đổi trạng thái thiết bị hoặc hoàn tất sửa chữa, tải lại dashboard: KPI cập nhật đúng; ca đã đóng không còn bị tính quá hạn.
- [ ] Technician/Lecturer không thấy khối báo cáo quản trị. Gọi trực tiếp API dashboard bằng token của họ phải nhận 403.

### 10. UC-8.2 — Chi phí sửa chữa (Admin, Manager)

- [ ] Chọn năm 2026, Theo tháng: tháng 9/10 và tổng năm khớp số liệu đối chiếu.
- [ ] Chuyển Theo quý: Q3/Q4 khớp và tổng năm giữ nguyên; biểu đồ khớp bảng số liệu.
- [ ] Chọn năm 2025: các kỳ bằng 0, giao diện không lỗi.
- [ ] Phiếu linh kiện chưa duyệt không cộng vào chi phí; sau duyệt chỉ cộng một lần theo số lượng × đơn giá được lưu lúc duyệt. Không cộng lặp tổng chi phí của phiếu sửa vào nhật ký chi phí.

### 11. UC-8.3 — Health Score / MTBF (Admin, Manager)

- [ ] Điều hòa có 2 sự cố, điểm 92, MTBF khoảng 365 ngày; hai máy chiếu có 0 sự cố, điểm 100, MTBF chưa xác định.
- [ ] Thiết bị điểm thấp đứng trước. Khi dữ liệu vượt 20 thiết bị, kiểm tra chuyển trang không trùng/mất dòng.
- [ ] Công thức: MTBF = tuổi ngày / số sự cố; điểm = 100 × tuổi / (tuổi + 30 × số sự cố), làm tròn. Đây là ước tính theo tuổi lịch, không phải giờ vận hành thực tế.

## Kiểm tra chéo cuối cùng

- [ ] Manager/Technician/Lecturer xem được phòng nhưng không có quyền thêm/sửa/đổi trạng thái/ngừng dùng phòng.
- [ ] Tải lại trang vẫn giữ phiên đăng nhập và dữ liệu đã lưu; đăng xuất/đăng nhập vai trò khác không giữ quyền của vai trò trước.
- [ ] Thử màn hình hẹp: đọc được bảng, thao tác được bộ lọc, modal và nút đóng.
- [ ] Ghi lỗi theo mẫu: **UC — tài khoản — các bước — kỳ vọng — thực tế — ảnh/lỗi Console hoặc Network**.

Đã xác minh trong phiên chuẩn bị: HTTP frontend/backend 200, Vite biên dịch entry, đăng nhập cả 4 vai trò, các API phòng/CAD trả 200; API dashboard/report trả 200 cho Admin/Manager và 403 cho Technician/Lecturer. Checklist thao tác giao diện vẫn cần người dùng thực hiện.
