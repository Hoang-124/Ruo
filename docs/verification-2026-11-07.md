# Kết quả hoàn tất sửa lỗi — 07/11/2026

Báo cáo này thay thế các giới hạn nghiệm thu MongoDB, lint và dependency ghi trong báo cáo 05/11. Mã nguồn vẫn ở nhánh xtung, chưa commit/push.

## Kết quả thực tế

| Kiểm tra | Kết quả |
|---|---|
| Backend unit | 198/198 đạt |
| Backend use case | 12 script đạt |
| MongoDB integration | 17/17 đạt trên replica set MongoDB 9.0.4, cổng 27028 |
| Frontend | 30 file, 131/131 test đạt trên Vitest 5.1.0 |
| Production build | Đạt |
| Lint | 0 cảnh báo; script dùng `oxlint --deny-warnings` |
| `git diff --check` | Đạt |
| `npm audit` | 0 lỗ hổng tại root, server và client tại thời điểm kiểm tra |

## Phần đã hoàn tất thêm

- Kiểm chứng trên MongoDB thật: hai yêu cầu tiếp nhận thanh lý đồng thời chỉ tạo một tài sản; lỗi sau khi tạo tài sản không để lại tài sản mồ côi; lỗi lưu thiết bị rollback phiếu điều chuyển; hai yêu cầu xuất kho cạnh tranh không xuất vượt tồn.
- Sửa test đếm mã tài sản theo dạng chữ hoa đúng với quy tắc chuẩn hóa model. Không thay đổi hành vi nghiệp vụ để làm test qua.
- Nâng Vite lên 8.3.5, Vitest lên 5.1.0; cập nhật Testing Library cho React 19 và bổ sung peer dependency DOM. Patch dependency tương thích ở root và server, không dùng audit fix --force.
- Sửa tham chiếu callback và dependencies của hooks; tránh loader tải lại do tham chiếu toast/currentUser đổi mỗi render.
- Tách AuthProvider/ToastProvider khỏi module hook/context để hỗ trợ Fast Refresh; cập nhật nơi import.
- Khởi tạo lại state modal theo người dùng và lần mở, có test hồi quy; chuyển đọc thời gian render sang state cập nhật theo timer; loại bỏ mã không dùng.
- 19 ngoại lệ tại dòng gọi loader trong effect được ghi rõ lý do: đồng bộ dữ liệu từ API và bật loading trước khi chờ response. Không tắt lint rule toàn dự án. Những ngoại lệ này không phải tuyên bố mọi effect trong ứng dụng đã được chuyển sang kiến trúc mới.

## Chạy lại

```powershell
npm --prefix server test
# TEST_MONGO_URI phải trỏ tới replica set kiểm thử đang chạy.
$env:TEST_MONGO_URI = 'mongodb://127.0.0.1:27028/?replicaSet=ruoReview'
npm --prefix server run test:task-scope
npm --prefix client test -- --run
npm --prefix client run lint
npm run build
```

Test DB tạo tên database ngẫu nhiên riêng và chỉ xóa database của chính lần chạy. Không seed/reset dữ liệu ứng dụng. Phiên mongod kiểm thử được chạy độc lập với service MongoDB ứng dụng.

Yêu cầu Node >=22.12.0 đã được ghi trong package client và README. Tham khảo [hướng dẫn migration Vitest chính thức](https://vitest.dev/guide/migration/). Máy kiểm thử dùng Node 24.21.0.

## Giới hạn còn lại

- Chưa thử camera vật lý/tem in thực tế; đã kiểm thử decoder độc lập đọc SVG QR, nhánh thiếu BarcodeDetector và từ chối quyền camera.
- Các transaction nghiệp vụ cần MongoDB replica set như README. Cài lại MongoDB không tự chuyển database ứng dụng standalone thành replica set; cấu hình ứng dụng hiện có không bị sửa trong lượt này.
- Kết quả audit là snapshot advisory tại thời điểm chạy, không phải cam kết không còn mọi rủi ro bảo mật.
