# Ruo Mobile — Bài Báo Cáo PRM (Tùng)

Ứng dụng Android **Flutter / Dart (`.dart`)**, mở trực tiếp thư mục `mobile` bằng **Android Studio** (plugin Flutter + Dart). Toàn bộ giao diện, hệ màu **Ruo UEMS V3.0**, bộ biểu tượng vector thuần (`CustomPainter`) và bản vẽ mặt bằng kiến trúc 2D nằm trong `lib/`; phần Kotlin (`MainActivity.kt`) chỉ mở bộ chọn tệp lưu CSV (SAF) và trình in PDF hệ thống của Android. Kết nối trực tiếp REST API Node.js / Express / MongoDB hiện có của dự án Ruo.

## Phạm vi Flutter Mobile

Đối chiếu theo **RUO — MASTER TASK MATRIX** (`Ruo - Task.pdf`, khớp 100% mã nguồn `server/` & `client/`):

| Mã UC | Hạng mục Android (`.dart`) | Phân quyền |
| --- | --- | --- |
| **UC-2.1** | Tạo phòng mới Tòa A1 (`P101..P508`, tầng `1..5`, sức chứa `1..500`, loại phòng, mô tả `<=500`) | `admin` |
| **UC-2.2** | Danh sách phòng, tìm kiếm tên/mã, lọc theo tầng, loại phòng, trạng thái | Cả 4 vai trò |
| **UC-2.3** | Chi tiết phòng, thông số, thiết bị hiện diện (Serial, mã QR, giá), lịch sử sửa chữa & điều chuyển (20 sự kiện gần nhất) | Cả 4 vai trò |
| **UC-2.4** | Cập nhật thông tin phòng (`name`, `room_type`, `capacity`, `description`; khóa `code`, `building`, `floor`) | `admin` |
| **UC-2.5** | Ngừng sử dụng phòng trống; chặn HTTP `409 HAS_EQUIPMENT` và liệt kê danh sách thiết bị cần điều chuyển | `admin` |
| **UC-2.6** | Chuyển đổi trạng thái phòng (`available` ↔ `maintenance` ↔ `inactive`) | `admin` |
| **UC-2.7** | Thẻ tương tác ô phòng (`RoomPodCard`): mã phòng, số thiết bị, thiết bị cần xử lý, phiếu mở, xem nhanh & mở chi tiết | Cả 4 vai trò |
| **CAD 2D** | Mặt bằng kiến trúc 2D Tòa A1 (5 tầng, giếng trời trung tâm, cầu thang Tây/Đông, phóng to 2 ngón, chấm cảnh báo tầng) — trang đầu tiên sau đăng nhập | Cả 4 vai trò |
| **UC-8.1** | Dashboard KPI tổng quan tài sản, tỷ lệ hoạt động, ca sửa quá hạn và giá trị kho | `admin`, `facility_manager` |
| **UC-8.2** | Xu hướng chi phí sửa chữa & linh kiện tách riêng theo năm, tháng / quý | `admin`, `facility_manager` |
| **UC-8.3** | Chỉ số sức khỏe thiết bị (`0–100`), MTBF theo tuổi ngày lịch, phân trang | `admin`, `facility_manager` |
| **UC-8.4** | Báo cáo phân bổ thiết bị theo phòng & thiết bị chưa phân phòng | `admin`, `facility_manager` |
| **UC-8.5** | Báo cáo phân bổ theo 7 trạng thái thiết bị (số lượng, tỷ trọng `%`, nguyên giá) | `admin`, `facility_manager` |
| **UC-8.6** | Tần suất hỏng hóc theo loại thiết bị và theo phòng (`incidentsPerEquipment`) | `admin`, `facility_manager` |
| **UC-8.7** | Thiết bị sắp hết hạn bảo hành (`0 / 30 / 60 / 90 / 365` ngày), thông tin nhà cung cấp, phân trang | `admin`, `facility_manager` |
| **UC-8.8** | Sự cố quá hạn SLA, lọc mức độ (`all / minor / major / critical`), phân trang | `admin`, `facility_manager` |
| **UC-8.9** | Xuất danh sách tài sản hoặc kết quả đợt kiểm kê ra **CSV UTF-8 BOM (Excel)** hoặc **In / Lưu PDF** | `admin`, `facility_manager` |

Đăng nhập, tự động làm mới phiên (`refresh-token`), đăng xuất và đổi mật khẩu bắt buộc (`force_change_pw`) là nền tảng xác thực. Tab **Nghiệp vụ** mở rộng giao diện di động theo quyền tài khoản:

| Phân hệ | Chức năng Flutter |
| --- | --- |
| Danh mục | Admin CRUD loại thiết bị, tòa nhà A1, nhà cung cấp và đơn vị sửa chữa; backend kiểm soát dữ liệu tham chiếu và trả lỗi validation. |
| Điều chuyển | KTV/Quản lý tạo phiếu; Quản lý duyệt/từ chối; KTV xác nhận hoàn tất; tra cứu lịch sử. |
| Bảo dưỡng | Quản lý lập kế hoạch theo tầng và chu kỳ; KTV ghi kết quả checklist, ghi chú lỗi. |
| Thanh lý | KTV/Quản lý đề xuất; Quản lý thẩm định; Admin nhập quyết định BGH; Quản lý lập dự trù; KTV tiếp nhận thiết bị thay thế. |
| Kiểm kê & QR | Tạo đợt kiểm kê, ghi nhận mã QR/mã tài sản, phân loại khớp/sai vị trí/hỏng/thất lạc, chốt đối soát, xem biên bản SHA-256 và tra cứu QR. |

Quét QR trong màn hình kiểm kê hiện nhận mã từ đầu đọc QR dạng bàn phím hoặc nhập thủ công; tra cứu QR gọi API thiết bị đang có. Giao diện không sử dụng camera vì project chưa cài plugin camera/barcode.

## Chạy trên Android Studio với dự án Ruo hiện có

1. **Backend**: tại thư mục `server`, chạy `npm ci` (nếu chưa cài), bật MongoDB local, cấu hình `.env` và chạy `npm run dev` (mặc định cổng `5000`).
2. **Android Studio**: chọn **Open** → mở thư mục `mobile` → đợi nhận diện Flutter SDK → chạy `flutter pub get`.
3. **Device Manager**: bật máy ảo Android (AVD), chọn cấu hình chạy `lib/main.dart`, nhấn **Run (▶)**.
4. **Kết nối máy chủ** (trên màn hình Đăng nhập):
   - Máy ảo Android kết nối backend thật: chọn chip **`Backend (:5000)`** (`http://10.0.2.2:5000/api`).
   - Máy ảo kết nối server demo độc lập: chọn chip **`Demo (:5001)`** (`http://10.0.2.2:5001/api`).
   - Điện thoại thật cùng Wi-Fi: nhập `http://<IP-LAN-PC>:5000/api`.

## Chạy Server Demo độc lập (không chạm dữ liệu `ruo_db`)

Tại **thư mục gốc `Ruo`** (khi MongoDB local đang chạy):

```powershell
$env:RUO_DEMO_PASSWORD='Demo-Prm-2026!'
node mobile/tool/demo-server.mjs
```

Script dùng trực tiếp model/controller/route thật của `server/`, tạo một database tạm ngẫu nhiên `ruo_mobile_demo_<uuid>` gồm 39 phòng (`P101..P507`, để trống `P108` cho lúc tạo phòng trực tiếp), 28 thiết bị, lịch sử sửa chữa, chi phí, bảo hành, SLA và đợt kiểm kê mẫu. Khi bấm `Ctrl+C`, script tự xóa đúng database tạm đó.

Tài khoản demo (mật khẩu bằng giá trị `RUO_DEMO_PASSWORD`):
- `admin@ruo.example` (Quản trị viên — toàn quyền CRUD phòng, xem CAD, Dashboard, Báo cáo)
- `facility_manager@ruo.example` (Quản lý CSVC — xem phòng/CAD, Dashboard, Báo cáo)
- `lecturer@ruo.example` (Giảng viên — xem phòng & mặt bằng CAD 2D)
- `technician@ruo.example` (Kỹ thuật viên — xem phòng & mặt bằng CAD 2D)

## Kịch bản thuyết trình PRM (5–7 phút)

1. **Đăng nhập Admin & Mặt bằng CAD 2D**: chuyển chế độ Sáng/Tối, duyệt 5 tầng Tòa A1 trên bản vẽ 2D, phóng to 2 ngón, chạm `P101` mở thẻ `RoomPodCard` → xem nhanh thiết bị và vào chi tiết lịch sử.
2. **Chặn ngừng sử dụng phòng còn thiết bị (UC-2.5)**: tại `P101`, bấm **Ngừng sử dụng** → hệ thống chặn `409 HAS_EQUIPMENT` và hiển thị danh sách thiết bị cần điều chuyển.
3. **Tạo, sửa & đổi trạng thái phòng (UC-2.1, 2.2, 2.4, 2.6)**: sang tab **Phòng học**, bấm **Thêm phòng** → nhập `P108` (tự động đồng bộ `Tầng 1`), tên `Phòng báo cáo PRM`, sức chứa `40` → lưu, tìm kiếm `P108`, sửa tên, chuyển sang **Đang bảo trì** rồi **Ngừng sử dụng**.
4. **Dashboard & Báo cáo (UC-8.1 → UC-8.9)**: mở tab **Tổng quan** (KPI, biểu đồ chi phí tháng/quý, điểm sức khỏe & MTBF) và tab **Báo cáo** (phân bổ phòng, trạng thái kèm `%`, tần suất hỏng, bảo hành, quá hạn SLA, xuất CSV Excel & In PDF).
5. **Kiểm chứng phân quyền (RBAC)**: thoát và đăng nhập `lecturer@ruo.example` → chỉ còn 2 tab (`Mặt bằng`, `Phòng học`) và ẩn toàn bộ nút thêm/sửa phòng.

## Kiểm thử & Đóng gói APK

Tại thư mục `mobile`:

```powershell
flutter analyze
flutter test
flutter build apk --debug
```

Chạy kiểm thử tích hợp đầu-cuối (E2E) trên máy ảo Android với `demo-server.mjs`:

```powershell
flutter drive --driver=test_driver/integration_test.dart --target=integration_test/demo_test.dart -d emulator-5554 --dart-define=RUO_TEST_PASSWORD=Demo-Prm-2026!
```

*(Lưu ý: chạy lại `flutter build apk --debug` sau `flutter drive` để file `build/app/outputs/flutter-apk/app-debug.apk` trỏ đúng `lib/main.dart`).*

## Cấu trúc mã nguồn Dart (`mobile/lib/`)

- `lib/main.dart`: khởi tạo ứng dụng, chuyển đổi Sáng/Tối, đăng nhập, đổi mật khẩu bắt buộc, điều hướng các tab theo RBAC.
- `lib/core/api.dart`: HTTP client, chuẩn hóa URL, tự động xoay vòng `refresh-token`, xử lý lỗi tiếng Việt.
- `lib/core/exports.dart` & `android/.../MainActivity.kt`: `MethodChannel` gọi hộp thoại lưu CSV và trình in PDF gốc của Android.
- `lib/features/cad_blueprint.dart`: bản vẽ kiến trúc 2D Tòa A1 5 tầng (`CustomPainter` + `InteractiveViewer`), ánh xạ `Pxxx` ↔ `A1-xxx`.
- `lib/features/rooms.dart`: mặt bằng CAD (`CadPage`), danh sách/bộ lọc phòng (`RoomsPage`), chi tiết & chặn thiết bị (`RoomDetailPage`), form tạo/sửa phòng (`RoomFormPage`).
- `lib/features/reports.dart`: tổng quan KPI/chi phí/sức khỏe (`DashboardPage`) và 6 chế độ báo cáo/xuất file (`ReportsPage`).
- `lib/features/operations.dart`: điều phối các phân hệ nghiệp vụ theo vai trò.
- `lib/features/operations_catalog.dart`: quản lý danh mục hệ thống.
- `lib/features/operations_transfers.dart`: tạo, duyệt, hoàn tất và tra cứu điều chuyển.
- `lib/features/operations_maintenance.dart`: kế hoạch và ghi nhận bảo dưỡng.
- `lib/features/operations_disposals.dart`: quy trình đề xuất và phê duyệt thanh lý.
- `lib/features/operations_inventory.dart`: kiểm kê, tra cứu QR và báo cáo kiểm kê.
- `lib/ui/tokens.dart`: hệ thống token màu sắc & typography Ruo UEMS V3.0 (Light Slate & Dark Warm Obsidian).
- `lib/ui/vectors.dart`: hệ thống icon vector & logo kiến trúc `RuoLogoMark` thuần Dart `CustomPainter` (không dùng thư viện icon ngoài).
- `lib/ui/common.dart`: thành phần dùng chung (`StatusBadge`, `SectionTitle`, `DataCard`, `EmptyNotice`, `AsyncPanel`).
