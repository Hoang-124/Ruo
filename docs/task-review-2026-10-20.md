# Đối chiếu task.text — 20/10/2026

Phạm vi là **11 mục trong `../task.text`**: Room & Facility, CAD và Dashboard. `../TASKS_TUNG.md` mô tả một phiên bản phân công khác có Booking; không dùng tài liệu đó để thay đổi yêu cầu hiện tại.

## Kết quả theo yêu cầu

| Mục | Kết quả sau rà soát |
| --- | --- |
| UC-2.1 — Tạo phòng | Có form và API chỉ Admin; kiểm tra mã P101–P508, tầng khớp mã, một tòa A1, tên, sức chứa, loại phòng; kiểm tra trùng mã và tên mã tương đương A1-xxx. Có audit. |
| UC-2.2 — Danh sách | Có phân trang, lọc tầng/loại/trạng thái và tìm theo mã/tên. API đọc cho cả bốn vai trò. |
| UC-2.3 — Chi tiết | Có thông số, serial, QR, lịch sử bảo trì và di chuyển. Sửa số phiếu đang mở để đếm toàn bộ dữ liệu, độc lập với 20 bản ghi lịch sử gần nhất. Giao diện ghi rõ giới hạn lịch sử. |
| UC-2.4 — Sửa phòng | Có sửa tên, loại, sức chứa, chức năng; kiểm tra dữ liệu, giữ nguyên định danh và ghi giá trị trước/sau vào audit. |
| UC-2.5 — Ngừng phòng | Có chặn khi còn thiết bị, soft status. Thiết bị lost/disposed không được xem là còn hiện diện. Bổ sung chặn điều chuyển vào phòng inactive cả khi tạo lệnh và khi hoàn tất lệnh đã duyệt. |
| UC-2.6 — Đổi trạng thái | Có ba trạng thái và kiểm tra thiết bị trước inactive. Sửa lỗi payload có khoảng trắng (`" inactive "`) vượt qua truy vấn thiết bị. |
| UC-2.7 — CAD card | Có SVG pod hiển thị mã, số thiết bị, số hỏng, trạng thái. Bổ sung thông tin thật của phòng vào dữ liệu pod. |
| CAD trang đầu | Cả bốn vai trò đều vào Dashboard có CAD năm tầng. Bỏ thiết bị/trạng thái vận hành giả khi không tải được dữ liệu; sửa mã phòng Tài vụ tầng 4 bị trùng thư viện tầng 1; phòng chưa có hình học trên bản vẽ có nút chọn riêng. |
| UC-8.1 — KPI | Hoàn thiện API `/api/dashboard/kpi` và giao diện Admin/Manager. Tổng hợp toàn bộ dữ liệu, không còn tính trên trang 100 thiết bị. Có tổng tài sản, tỷ lệ hoạt động, thiết bị hỏng, ca sửa quá hạn và giá trị kho. |
| UC-8.2 — Chi phí | Hoàn thiện `/api/dashboard/repair-cost?year=2026&period=month\|quarter`, biểu đồ SVG, bảng số liệu, đổi năm/kỳ, xử lý tải/lỗi/thử lại. Có kỳ không phát sinh = 0 và ranh giới kỳ theo giờ Việt Nam. |
| UC-8.3 — Sức khỏe | Hoàn thiện `/api/dashboard/health-score?page=1&limit=20`, bảng phân trang và điểm trung bình. Đếm số phiếu sự cố thực tế, không dùng `repair_count` có thể cũ; thiếu tuổi hoặc chưa có sự cố được biểu diễn rõ. |

## Quy ước tính toán

- `totalEquipment`: tất cả tài sản đã đăng ký, kể cả đã thanh lý/thất lạc. `activeEquipment`: loại disposed/lost.
- Tỷ lệ hoạt động = `in_use / activeEquipment × 100`; không có tài sản thì 0%.
- Giá trị kho = nguyên giá thiết bị `in_stock` + `stock × price` của linh kiện. Đây là giá trị theo giá lưu trong hệ thống, không phải giá trị khấu hao.
- Ca sửa quá hạn: chỉ reported/assigned/in_progress, có deadline và deadline đã qua. Không tính phiếu closed/resolved/unrepairable hoặc deadline null.
- Chi phí sửa chữa lấy từ `RepairLog.cost` tại `timestamp`. Không cộng lại `Repair.total_cost` vì đây là tổng tích lũy của cùng nhật ký.
- Chi phí linh kiện lấy từ yêu cầu **đã duyệt**, tại `approved_at`, theo số lượng và `unit_price` đã lưu. Khi duyệt mới, server ghi giá trong danh mục, không tin giá do client gửi. Thay đổi giá danh mục về sau không làm đổi lịch sử này.
- Chi phí nhật ký cần loại trừ linh kiện đã xuất kho. Giao diện nhập nhật ký và báo cáo đều nêu rõ để tránh nhập trùng. Dữ liệu cũ có giá 0/thiếu giá được cảnh báo; không tự suy đoán giá lịch sử. Dữ liệu thiếu ngày ghi nhận/duyệt cần được bổ sung đúng nguồn trước khi xuất hiện trong kỳ báo cáo.
- MTBF hiện là **ước tính theo ngày lịch** = tuổi từ ngày mua (hoặc ngày tạo khi không có ngày mua) / số phiếu sự cố. Hệ thống chưa lưu tổng giờ vận hành/thời gian dừng máy nên không thể tính MTBF theo thời gian chạy thực tế.
- Điểm sức khỏe là quy ước tham khảo: `100 × tuổi / (tuổi + 30 × số sự cố)`, giới hạn 0–100. Không có sự cố và biết tuổi: điểm 100 nhưng MTBF để null. Tuổi không hợp lệ/tương lai: điểm và MTBF null. Công thức được công khai trong API/giao diện; không xem đây là một chuẩn đánh giá kỹ thuật.

## API và tương thích

Các API Dashboard chỉ cho `admin` và `facility_manager`; trả 401 nếu chưa đăng nhập, 403 cho lecturer/technician.

Route cũ `/api/reports/dashboard`, `/equipment-health`, `/repair-costs` trỏ đến handler đúng. Hai route `/api/reports/by-room` và `/by-status` đã có dữ liệu nhóm phù hợp. Các route báo cáo, kể cả thống kê/xuất CSV, đều được giới hạn vai trò ở backend.

Không cài thêm thư viện biểu đồ/icon. Biểu đồ dùng SVG và component có sẵn. Bổ sung index theo timestamp nhật ký và status/approved_at của yêu cầu linh kiện.

## Kiểm tra đã thực hiện

- `npm.cmd test`: đạt, gồm unit test phòng/Dashboard và 12 bộ kiểm thử UC backend cũ. Script mặc định giờ chạy cả unit test để không bỏ sót các lỗi hồi quy mới.
- Frontend: **64/64 test**, gồm hiển thị Dashboard theo cả bốn vai trò, KPI, đổi tháng/quý, xử lý lỗi/thử lại, dữ liệu CAD và phòng chưa có vị trí trên bản vẽ.
- `npm.cmd --prefix server run test:task-scope`: **8/8 nhóm kiểm thử HTTP + MongoDB thật**, dữ liệu 260 thiết bị. Kiểm tra phân quyền, KPI không cắt 100 dòng, chi phí ranh giới năm/quý, MTBF, serial/QR, lịch sử, audit, lọc phòng, chặn chuyển thiết bị vào phòng inactive và giữ nguyên user/audit khi khởi động.
- `npm.cmd run build`: đạt.
- `npm.cmd --prefix client run lint`: không có lỗi chặn; dự án vẫn có cảnh báo lint tại nhiều component cũ. Các file mới về phân tích Dashboard vượt qua kiểm tra lint riêng.
- `git diff --check`: đạt.

Database kiểm thử có tên ngẫu nhiên `ruo_task_test_*`, tự xóa sau khi chạy. Không chạy seed trên database ứng dụng. Có thể chạy lại với MongoDB kiểm thử riêng:

```powershell
$env:TEST_MONGO_URI = 'mongodb://127.0.0.1:27028'
npm.cmd --prefix server run test:task-scope
```

Trong sandbox Windows của phiên này, Vitest không đọc được cấu hình qua esbuild do quyền thư mục cha. Bộ frontend đã chạy bằng API Vitest với cấu hình tương đương (jsdom + globals), từ thư mục `client`:

```powershell
node --input-type=module -e "import { startVitest } from 'vitest/node'; const ctx = await startVitest('test', [], { run: true, config: false, environment: 'jsdom', globals: true }); await ctx?.close();"
```

Không có trình duyệt kết nối khả dụng trong phiên này, nên chưa kiểm tra bố cục bằng mắt/screenshot. Component test và build không thay thế hoàn toàn kiểm tra giao diện trên trình duyệt thật.

MongoDB kiểm thử đã được shutdown, các database fixture đã được xóa. Thư mục lưu trữ tạm `../.tmp/ruo-review-mongo` còn lại vì lệnh dọn tiến trình/thư mục bị chính sách phê duyệt sandbox chặn; không có thay đổi dữ liệu ứng dụng.

## Giới hạn cần biết khi nghiệm thu

- Phòng mới chưa có vị trí hình học được chọn qua danh sách ngay dưới CAD; không tự bịa tọa độ. Muốn mọi phòng P101–P508 có hình học chính xác cần bản vẽ/vị trí thực tế.
- Lịch sử chi tiết phòng đang hiển thị 20 dòng gần nhất; chỉ số tổng đã được tính riêng không bị giới hạn này.
- Kiểm thử hiện bao phủ nghiệp vụ theo chuỗi yêu cầu. Chưa chứng minh tính nguyên tử khi nhiều người đồng thời ngừng phòng và phân bổ/điều chuyển thiết bị; các luồng ghi đa collection hiện chưa dùng chung transaction/khóa phòng.
- Sửa thêm một lỗi bảo toàn dữ liệu ở `server/src/config/db.js`: khởi động thường chỉ kết nối DB; không còn xóa user/audit legacy, tạo hoặc reset tài khoản demo. Test đã tái hiện việc mất dữ liệu trước bản sửa và xác minh dữ liệu được giữ nguyên sau bản sửa. Database demo mới cần được khởi tạo riêng bằng script seed hiện có; script đó có thao tác xóa dữ liệu, chỉ dùng cho database demo có thể bỏ. Dữ liệu legacy cần migration riêng có sao lưu, không tự xóa khi khởi động.
- Đây là nghiệm thu phạm vi task và các lỗi liên quan đã tìm được, không phải chứng nhận toàn bộ hệ thống sẵn sàng production.
