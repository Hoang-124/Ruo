# DANH MỤC CHUẨN CƠ SỞ VẬT CHẤT & VẬT TƯ TÒA NHÀ ĐẠI HỌC (TÒA A1 — 5 TẦNG)

> **Bản chuẩn hóa & đồng bộ theo danh sách lược bỏ của người dùng (27/10/2026).**
> - Giữ nguyên mã mẫu, tên thiết bị, hãng/model (hoặc quy cách kỹ thuật gốc), đơn vị tính, nguyên giá tham khảo và thời hạn bảo hành của **55 dòng thiết bị thuộc 11 danh mục** và **10 dòng vật tư linh kiện** được giữ lại.
> - Đã định vị lại các thiết bị sự kiện/sân khấu vào mặt bằng kiến trúc thực tế Tòa A1 (`AMP-PRO` tại `A1-PHL`, `A1-PHT`, `A1-504`; `STAGE-LGT` tại `A1-PHL`, `A1-503`) và chuẩn hóa kết nối truyền hình ảnh lên Smart TV qua cáp tín hiệu `PART-HDMI`.
>
> **Tài liệu tham chiếu nghiệp vụ & dữ liệu chuẩn (Master Catalog)** dùng cho hệ thống **Ruo — Quản Lý Cơ Sở Vật Chất Đại Học (UEMS)**, phục vụ:
> 1. Khởi tạo dữ liệu mẫu (`facilityCatalogData.js` & `seedDatabase.js`) và nhập lô thiết bị hàng loạt (`UC-3.6 Batch Import`).
> 2. Thiết lập định mức trang bị bắt buộc theo từng loại phòng học (`rooms.required_equipment`).
> 3. Phân biệt rõ **Tài sản cố định gắn mã QR (`equipment`)** và **Vật tư tiêu hao / Linh kiện thay thế (`spare_parts`)**.
> 4. Đối chiếu lập kế hoạch bảo dưỡng định kỳ (`UC-7.3..7.5`), theo dõi bảo hành (`UC-6.1..6.3`) và thẩm định thanh lý RACI (`UC-7.7..7.11`).

---

## PHẦN I. NGUYÊN TẮC PHÂN LOẠI TRONG HỆ THỐNG

| Phân loại | Bảng dữ liệu | Định danh QR | Cách quản lý vòng đời | Ví dụ điển hình |
| :--- | :--- | :--- | :--- | :--- |
| **1. Không gian phòng ốc** | `rooms` | Mã phòng (ví dụ: `A1-101`, `A1-PTV`, `KHO-01`) | Quản lý theo tầng (1–5), loại phòng (`lecture`, `lab`, `office`, `warehouse`), sức chứa và định mức thiết bị | Giảng đường, Phòng Lab, Thư viện, VP Khoa, Studio, Phòng Y tế, Kho |
| **2. Tài sản cố định / Thiết bị** | `categories` + `equipment` | **Có tem QR riêng từng chiếc** (`QR-...`) + Số Serial | Theo dõi vị trí phòng, hạn bảo hành, lịch sử di chuyển, nhật ký sửa chữa, chi phí lũy kế và thanh lý khi $R \ge 60\%$ | Điều hòa âm trần Cassette, máy chiếu siêu gần, Smart TV, PC phòng Lab, camera, loa âm trần, bình PCCC |
| **3. Vật tư tiêu hao & Linh kiện** | `spare_parts` | Không dán QR lẻ từng chiếc | Quản lý theo **tồn kho số lượng (`stock`)**, ngưỡng cảnh báo tối thiểu (`min_stock`) và phiếu xin xuất kho sửa chữa (`parts_requests`) | Bóng đèn máy chiếu, cáp HDMI truyền hình ảnh lên TV/máy chiếu, hộp mực in, ắc quy đèn sự cố/loa kéo |

---

## PHẦN II. BẢNG TỔNG HỢP 11 DANH MỤC TÀI SẢN CỐ ĐỊNH (`categories`)

| STT | Mã danh mục | Tên danh mục chuẩn | Chu kỳ bảo dưỡng gợi ý | Cấp SLA mặc định khi hỏng | Khu vực phân bổ chính tại Tòa A1 |
| :-: | :--- | :--- | :--- | :--- | :--- |
| 1 | `CAT-DISPLAY` | Thiết bị Trình chiếu & Hiển thị Hình ảnh | 3 tháng / lần | `critical` (ảnh hưởng tiết dạy) | Giảng đường T1–T5, Phòng Lab, Phòng họp, Sảnh |
| 2 | `CAT-HVAC` | Thiết bị Làm mát, Thông gió & Điều hòa | 3 – 6 tháng / lần | `major` | Toàn bộ 5 tầng (Phòng học, Lab, VP, Thư viện, WC, Kho) |
| 3 | `CAT-AUDIO` | Thiết bị Âm thanh, Trợ giảng & Studio | 6 tháng / lần | `major` / `critical` | Phòng Học Lớn `A1-PHL`, Phòng Hội thảo `A1-PHT`, Studio `A1-503`, Rạp chiếu phim `A1-504`, Thư viện |
| 4 | `CAT-IT` | Máy tính, Thiết bị CNTT & Thực hành Lab | 6 tháng / lần | `major` | Phòng Lab T2–T4, Phòng Nghiên cứu, VP Khoa CNTT, Thư viện, Sảnh |
| 5 | `CAT-NET` | Hạ tầng Mạng, Viễn thông & Điện nhẹ | 6 tháng / lần | `critical` (mất mạng diện rộng) | Toàn bộ 5 tầng, Kho kỹ thuật mạng `A1-K1`, Phòng Lab, Phòng họp |
| 6 | `CAT-SEC` | Thiết bị An ninh, Giám sát & Kiểm soát Ra vào | 6 tháng / lần | `critical` | Sân cổng vào `A1-CV`, Thư viện `A1-PTV`, Phòng thi/Lab, Tài vụ `A1-418`, Khảo thí `A1-414`, Kho |
| 7 | `CAT-OFFICE` | Thiết bị Văn phòng & Hành chính Học vụ | 6 tháng / lần | `minor` / `major` | Phòng Đào tạo `A1-PĐT`, Tài vụ `A1-418`, Tiếp SV `A1-415..416`, VP các Khoa T4, Phòng GV `A1-PGV` |
| 8 | `CAT-POWER` | Hệ thống Điện, Chiếu sáng & Nguồn Dự phòng | 6 tháng / lần | `critical` | Toàn bộ 5 tầng, Kho kỹ thuật điện `A1-K2` & `A1-KHO-T5`, Phòng Học Lớn `A1-PHL`, Studio `A1-503` |
| 9 | `CAT-FIRE` | Thiết bị Phòng cháy Chữa cháy & Cứu nạn | 1 – 3 tháng / lần | `critical` (bắt buộc an toàn) | Sảnh trực `A1-CV`, Giảng đường, Phòng Lab, Phòng Nghiên cứu, Kho `KHO-01` |
| 10 | `CAT-FURN` | Nội thất Giảng đường, Văn phòng, Thư viện & Kho | 12 tháng / lần | `minor` | Tất cả phòng học, Phòng Lab, Thư viện `A1-PTV`, Văn phòng T4–T5, Kho |
| 11 | `CAT-SPEC` | Thiết bị Chuyên dụng Y tế | 6 tháng / lần | `major` | Phòng Y tế `A1-YT-T3` (Tầng 3) & Trực cấp cứu Sảnh chính `A1-CV` (Tầng 1) |

---

## PHẦN III. CHI TIẾT CÁC LOẠI THIẾT BỊ TRONG TỪNG NHÓM (`equipment`)

### 1. Nhóm `CAT-DISPLAY` — Thiết bị Trình chiếu & Hiển thị Hình ảnh

| Mã mẫu | Tên thiết bị | Hãng / Model tham khảo | ĐVT | Nguyên giá tham khảo (VNĐ) | Bảo hành | Vị trí lắp đặt tại Tòa A1 |
| :--- | :--- | :--- | :-: | --: | :-: | :--- |
| `PRJ-STD` | Máy chiếu siêu gần giảng đường | Panasonic PT-TW370 / Epson EB-L210SW | Chiếc | 24.500.000 | 24 tháng | Giảng đường lý thuyết T1–T5, Phòng Lab, Seminar, `KHO-01` |
| `SCR-ELEC` | Màn chiếu điện tự động 120" – 150" (kèm remote) | Dalite / Apollo PW120ES | Chiếc | 4.200.000 | 12 tháng | Giảng đường T1–T5, Phòng Lab, Phòng Hội thảo `A1-PHT`, `A1-PHL` |
| `TV-SMART` | Smart Tivi 4K 65" – 75" treo tường *(kết nối dây truyền hình ảnh HDMI `PART-HDMI`)* | Samsung Crystal UHD 65AU7700 / LG 75UQ8000 | Chiếc | 16.500.000 | 24 tháng | Phòng họp `A1-409..410`, `A1-HOP`, Tiếp SV `A1-415..417`, Smart Classroom, Phòng Nghiên cứu |
| `SIGNAGE` | Màn hình quảng cáo & thông báo điện tử Standee 55" | LG Digital Signage 55UH5F | Chiếc | 22.000.000 | 24 tháng | Sân cổng vào `A1-CV`, Thư viện `A1-PTV`, Sảnh ban công `A1-SBC` |

---

### 2. Nhóm `CAT-HVAC` — Thiết bị Làm mát, Thông gió & Điều hòa Không khí

| Mã mẫu | Tên thiết bị | Hãng / Model tham khảo | ĐVT | Nguyên giá tham khảo (VNĐ) | Bảo hành | Vị trí lắp đặt tại Tòa A1 |
| :--- | :--- | :--- | :-: | --: | :-: | :--- |
| `AC-CASS` | Điều hòa âm trần Cassette 4 hướng thổi 4HP – 5HP | Daikin FCNQ36MV1 / Mitsubishi FDT100 | Bộ | 38.500.000 | 24 tháng | Giảng đường T1–T5, Phòng Lab, Thư viện `A1-PTV`, Văn phòng T4–T5, Phòng Y tế `A1-YT-T3` |
| `FAN-EXH` | Quạt thông gió / Quạt hút mùi âm trần nối ống | Panasonic FV-24CU8 / Mitsubishi VD-15Z4T | Chiếc | 1.250.000 | 12 tháng | Phòng Lab T2–T4, Khu vệ sinh `WC` T1–T5, Xưởng `A1-XTC`, Studio `A1-503`, Kho |

---

### 3. Nhóm `CAT-AUDIO` — Thiết bị Âm thanh, Trợ giảng & Studio Thu âm

| Mã mẫu | Tên thiết bị | Hãng / Model tham khảo | ĐVT | Nguyên giá tham khảo (VNĐ) | Bảo hành | Vị trí lắp đặt tại Tòa A1 |
| :--- | :--- | :--- | :-: | --: | :-: | :--- |
| `SPK-CEIL` | Loa âm trần thông báo hành lang & thư viện | TOA PC-658R / Bosch LBC 3090 | Chiếc | 950.000 | 24 tháng | Sảnh cổng vào `A1-CV`, Thư viện `A1-PTV`, Giảng đường `A1-PH-DN`, Sảnh `A1-SBC` |
| `SPK-PORT` | Loa kéo di động công suất lớn kèm 2 micro | Acnos CB405GD / Dalton TS-15G600X | Chiếc | 7.200.000 | 12 tháng | Phòng Sinh hoạt CLB `A1-501`, Phòng Đa năng `A1-507`, Kho dự phòng `KHO-01` |
| `AMP-PRO` | Cục đẩy công suất âm thanh hội trường | Crown XLi 2500 / Yamaha PX8 | Chiếc | 15.500.000 | 24 tháng | Phòng Học Lớn `A1-PHL` (Tầng 5), Phòng Hội thảo `A1-PHT` (Tầng 4), Rạp chiếu phim `A1-504` |
| `MIXER-AU` | Bàn trộn âm thanh Digital / Analog 12 – 24 kênh | Yamaha MG16XU / Behringer X32 Producer | Chiếc | 14.500.000 | 24 tháng | Phòng Hội thảo `A1-PHT`, Phòng Học Lớn `A1-PHL`, Studio `A1-503` |

---

### 4. Nhóm `CAT-IT` — Máy tính, Thiết bị CNTT & Thực hành Chuyên ngành

| Mã mẫu | Tên thiết bị | Hãng / Model tham khảo | ĐVT | Nguyên giá tham khảo (VNĐ) | Bảo hành | Vị trí lắp đặt tại Tòa A1 |
| :--- | :--- | :--- | :-: | --: | :-: | :--- |
| `PC-LAB` | Bộ máy tính trạm thực hành sinh viên (PC + Màn 24") | Dell OptiPlex 7010 + Dell P2422H | Bộ | 17.500.000 | 36 tháng | Phòng Lab `A1-201`, `A1-203`, `A1-204`, `A1-303`, `A1-304`, `A1-403`, `A1-404`, Phòng Nghiên cứu |
| `SRV-RACK` | Máy chủ Rack Server quản lý phòng Lab & CSDL nội bộ | Dell PowerEdge R450 / HPE ProLiant DL360 | Chiếc | 85.000.000 | 36 tháng | Lab mạng `A1-201` (Tầng 2), Lab Mạng & Cloud `A1-403` (Tầng 4) |
| `NAS-STOR` | Thiết bị lưu trữ mạng tập trung học liệu (`NAS`) | Synology DiskStation DS923+ (4-bay) | Bộ | 24.000.000 | 36 tháng | Thư viện `A1-PTV` (Tầng 1), Văn phòng Khoa CNTT `A1-405` (Tầng 4) |
| `KIOSK-TC` | Kiosk tra cứu thông tin cảm ứng 32" chân đứng | GoodM Kiosk G-320 | Chiếc | 28.500.000 | 24 tháng | Thư viện `A1-PTV`, Sân cổng vào `A1-CV`, Khu Tiếp sinh viên `A1-415` |
| `KIT-IOT` | Bộ Kit thực hành Mạng nhúng – Vi điều khiển – IoT | Arduino / Raspberry Pi Lab Suitcase | Bộ | 6.500.000 | 12 tháng | Phòng Lab `A1-303`, `A1-304`, Phòng Nghiên cứu `A1-NC-01..02`, `A1-NC-T3`, Đồ án `A1-213`, `A1-313` |

---

### 5. Nhóm `CAT-NET` — Hạ tầng Mạng, Viễn thông & Điện nhẹ

| Mã mẫu | Tên thiết bị | Hãng / Model tham khảo | ĐVT | Nguyên giá tham khảo (VNĐ) | Bảo hành | Vị trí lắp đặt tại Tòa A1 |
| :--- | :--- | :--- | :-: | --: | :-: | :--- |
| `WIFI-AP` | Bộ phát Wi-Fi 6 ốp trần chịu tải cao | Aruba Instant On AP22 / UniFi U6 Pro | Chiếc | 4.800.000 | 24 tháng | Giảng đường T1–T5, Thư viện `A1-PTV`, Văn phòng T4–T5, `KHO-01` |
| `SW-CORE` | Switch mạng 24/48 cổng Gigabit / Switch PoE | Cisco Catalyst C1000-24P / Ruijie RG-S2910 | Chiếc | 14.500.000 | 36 tháng | Kho mạng `A1-K1`, `A1-KHO-T5`, Tất cả Phòng Lab T2–T4, `KHO-01` |
| `RTR-FW` | Router cân bằng tải & Tường lửa bảo mật | Fortinet FortiGate 60F / DrayTek Vigor3910 | Chiếc | 18.500.000 | 36 tháng | Kho kỹ thuật mạng `A1-K1`, Lab mạng `A1-201`, Lab ATTT `A1-404` |
| `RACK-CAB` | Tủ mạng Rack 12U treo tường / 27U–42U đứng (kèm PDU) | Vietrack / ECP 27U D800 | Chiếc | 7.500.000 | 24 tháng | Kho mạng `A1-K1`, `A1-KHO-T5`, Tất cả Phòng Lab T2–T4 |
| `IP-PHONE` | Điện thoại bàn IP nội bộ phòng ban | Yealink SIP-T31P / Grandstream GRP2602 | Chiếc | 1.450.000 | 12 tháng | Phòng Đào tạo `A1-PĐT`, Tài vụ `A1-418`, VP Khoa T4, Phòng Y tế `A1-YT-T3`, Sảnh `A1-CV` |
| `HDMI-MTX` | Bộ chia / Ma trận chuyển mạch tín hiệu HDMI 4x4 | Aten VM0404HA / Ugreen HDMI Splitter | Bộ | 6.200.000 | 12 tháng | Phòng Hội thảo `A1-PHT`, Phòng Học Lớn `A1-PHL`, Phòng họp `A1-409..410`, `A1-HOP`, Studio `A1-503` |
| `VCAM-PTZ` | Camera hội nghị truyền hình trực tuyến PTZ | Logitech Rally Camera / Poly Studio | Bộ | 22.500.000 | 24 tháng | Phòng họp `A1-409..410`, `A1-HOP`, Phòng Hội thảo `A1-PHT`, Smart Classroom, Studio `A1-503` |

---

### 6. Nhóm `CAT-SEC` — Thiết bị An ninh, Giám sát & Kiểm soát Ra vào

| Mã mẫu | Tên thiết bị | Hãng / Model tham khảo | ĐVT | Nguyên giá tham khảo (VNĐ) | Bảo hành | Vị trí lắp đặt tại Tòa A1 |
| :--- | :--- | :--- | :-: | --: | :-: | :--- |
| `CAM-DOME` | Camera IP Dome hồng ngoại 4MP ốp trần (có mic) | Hikvision DS-2CD2143G2-IU / Dahua | Chiếc | 2.650.000 | 24 tháng | Phòng học/phòng thi, Phòng Lab, Thư viện `A1-PTV`, Khảo thí `A1-414`, Tài vụ `A1-418`, `KHO-01` |
| `CAM-BULL` | Camera IP thân trụ hồng ngoại xa 40m ngoài hành lang | Hikvision DS-2CD2T43G2-4I | Chiếc | 3.100.000 | 24 tháng | Sân cổng vào `A1-CV`, Hành lang cánh Tây `A1-KHO-TAY`, Sảnh ban công `A1-SBC` |
| `CAM-PTZ` | Camera IP Speed Dome quay quét 360° Zoom quang 25x | Hikvision DS-2DE4425IW-DE | Chiếc | 11.800.000 | 24 tháng | Đại sảnh cổng vào `A1-CV` (Tầng 1) |
| `NVR-REC` | Đầu ghi hình mạng `NVR` 32 kênh kèm ổ cứng giám sát | Hikvision DS-7732NXI-I4 (2x HDD 6TB) | Bộ | 16.500.000 | 24 tháng | Kho kỹ thuật mạng & giám sát trung tâm `A1-K1` (Tầng 1) |
| `DOOR-ACC` | Bộ khóa từ & đầu đọc thẻ từ / vân tay / khuôn mặt | ZKTeco SpeedFace-V5L + Khóa nam châm 280kg | Bộ | 6.900.000 | 12 tháng | Phòng Lab T2–T4, Smart Classroom, Khảo thí `A1-414`, Tài vụ `A1-418`, Studio `A1-503`, Kho |
| `BARCODE` | Đầu đọc mã vạch / RFID mượn trả sách thư viện & kho | Zebra DS2208 / Honeywell 1470G | Chiếc | 2.400.000 | 24 tháng | Quầy Thủ thư `A1-PTV`, Kho thiết bị dự phòng `KHO-01` |

---

### 7. Nhóm `CAT-OFFICE` — Thiết bị Văn phòng, Hành chính & Phục vụ Học vụ

| Mã mẫu | Tên thiết bị | Hãng / Model tham khảo | ĐVT | Nguyên giá tham khảo (VNĐ) | Bảo hành | Vị trí lắp đặt tại Tòa A1 |
| :--- | :--- | :--- | :-: | --: | :-: | :--- |
| `MFP-COPY` | Máy photocopy đa chức năng A3/A4 tốc độ cao | Ricoh IM 4000 / Toshiba e-Studio 3528A | Chiếc | 46.000.000 | 24 tháng | Phòng Đào tạo `A1-PĐT`, VP Khoa Ngoại ngữ `A1-413`, Phòng Giáo viên `A1-PGV` |
| `PRT-LASER` | Máy in Laser mạng LAN in đảo mặt tự động | HP LaserJet Pro 4003dn / Canon LBP246dw | Chiếc | 6.800.000 | 12 tháng | VP Khoa `A1-405`, `A1-406`, `A1-413`, Khảo thí `A1-414`, Tiếp SV `A1-415..416`, Tài vụ `A1-418`, `A1-PGV` |
| `SCN-ADF` | Máy quét tài liệu hai mặt tốc độ cao (`ADF`) | Fujitsu fi-8170 / Brother ADS-3100 | Chiếc | 14.200.000 | 12 tháng | Phòng Đào tạo `A1-PĐT`, Tổ Khảo thí `A1-414`, Phòng Tài vụ `A1-418` |
| `SHREDDER` | Máy hủy tài liệu giấy vụn bảo mật | Silicon PS-890C / Bonsaii 3S30 | Chiếc | 4.800.000 | 12 tháng | Phòng Đào tạo `A1-PĐT`, Khảo thí `A1-414`, Tài vụ `A1-418`, VP Khoa `A1-405..406` |
| `QUEUE-SYS` | Hệ thống lấy số thứ tự & màn hình LED gọi quầy | GoodM QMS-03 | Bộ | 15.000.000 | 12 tháng | Khu Tiếp sinh viên một cửa `A1-415` & `A1-416` (Tầng 4) |
| `TIME-ATT` | Máy chấm công khuôn mặt & vân tay cán bộ | Ronald Jack FacePro-008 | Chiếc | 4.500.000 | 12 tháng | Sảnh cổng vào `A1-CV` (Tầng 1), Phòng Đào tạo `A1-PĐT` (Tầng 4), Phòng Giáo viên `A1-PGV` (Tầng 5) |
| `WATER-DISP` | Cây nước nóng lạnh / Máy lọc nước uống công cộng | Karofi KAD-D66 / Kangaroo KG49A3 | Chiếc | 6.200.000 | 24 tháng | Thư viện `A1-PTV`, Phòng Tự học `A1-PTH2`, Phòng Y tế `A1-YT-T3`, VP Khoa T4, `A1-501`, `A1-PGV`, `A1-SBC` |

---

### 8. Nhóm `CAT-POWER` — Hệ thống Điện, Chiếu sáng, Cơ điện & Điều khiển Phòng

| Mã mẫu | Tên thiết bị | Hãng / Model tham khảo | ĐVT | Nguyên giá tham khảo (VNĐ) | Bảo hành | Vị trí lắp đặt tại Tòa A1 |
| :--- | :--- | :--- | :-: | --: | :-: | :--- |
| `LED-PANEL` | Bộ đèn Panel LED 600x600 / Tuýp LED đôi chóa phản quang | Rạng Đông P08 600x600 40W / Philips | Bộ | 650.000 | 24 tháng | Tất cả giảng đường, Phòng Lab, Thư viện, Văn phòng, Khu vệ sinh & Kho |
| `STAGE-LGT` | Hệ thống đèn sân khấu Par LED + Moving Head + Bàn DMX | Par LED 54x3W + Beam 230 + DMX 512 | Hệ thống | 36.000.000 | 12 tháng | Phòng Học Lớn đa năng `A1-PHL` (Tầng 5), Studio Truyền thông `A1-503` (Tầng 5) |
| `EMG-LIGHT` | Đèn chiếu sáng sự cố 2 mắt & Đèn chỉ dẫn `EXIT` | Kentom KT-2200 + Exit KT-650 | Bộ | 780.000 | 12 tháng | Sân cổng vào `A1-CV`, `A1-KHO-TAY`, Phòng Học Lớn `A1-PHL`, Rạp phim `A1-504`, Sảnh `A1-SBC` |
| `PWR-PANEL` | Tủ điện phân phối tầng (`DB`) kèm công tơ đo đếm thông minh | Schneider Acti9 Enclosure + Smart Meter | Tủ | 18.000.000 | 24 tháng | Phòng kỹ thuật điện `A1-K2` (Tầng 1) & Phòng kho kỹ thuật `A1-KHO-T5` (Tầng 5) |

---

### 9. Nhóm `CAT-FIRE` — Thiết bị Phòng cháy Chữa cháy & An toàn Cứu nạn

| Mã mẫu | Tên thiết bị | Hãng / Model tham khảo | ĐVT | Nguyên giá tham khảo (VNĐ) | Bảo hành | Vị trí lắp đặt tại Tòa A1 |
| :--- | :--- | :--- | :-: | --: | --: | :--- |
| `EXT-POWD` | Bình chữa cháy bột khô ABC 4kg – 8kg (`MFZL4` / `MFZL8`) | Tomoken TMK-VJ-ABC 4kg | Bình | 480.000 | 12 tháng | Giảng đường lý thuyết T1–T5, Thư viện `A1-PTV`, Xưởng `A1-XTC`, Kho |
| `EXT-CO2` | Bình chữa cháy khí `CO2` 3kg – 5kg (`MT3` / `MT5`) | Tomoken TMK-VJ-CO2 5kg (chống hỏng mạch điện) | Bình | 850.000 | 12 tháng | Phòng Lab T2–T4, Phòng Nghiên cứu, Tài vụ `A1-418`, Studio `A1-503`, Rạp phim `A1-504`, Kho |
| `FIRE-PNL` | Tủ trung tâm báo cháy tự động 10–20 kênh / địa chỉ | Hochiki HCP-1008E / Chungmei CM-P1 | Tủ | 14.500.000 | 24 tháng | Đại sảnh trực Tầng 1 (`A1-CV`) |
| `SMOKE-DET` | Cụm đầu báo khói quang học, chuông & nút nhấn khẩn cấp | Hochiki SLV-24N + Chuông FBB-150I | Cụm | 1.200.000 | 12 tháng | Trần giảng đường, Phòng Lab, Thư viện, Văn phòng, Kho `KHO-01` |
| `HYDRANT` | Tủ họng nước chữa cháy vách tường (cuộn vòi + lăng phun) | Tủ PCCC 500x600 + Vòi D50 20m | Bộ | 2.600.000 | 12 tháng | Đại sảnh `A1-CV`, Hành lang cánh Tây `A1-KHO-TAY`, Sảnh ban công `A1-SBC` |

---

### 10. Nhóm `CAT-FURN` — Nội thất Giảng đường, Văn phòng, Thư viện & Kho

| Mã mẫu | Tên thiết bị | Hãng / Model tham khảo | ĐVT | Nguyên giá tham khảo (VNĐ) | Bảo hành | Vị trí lắp đặt tại Tòa A1 |
| :--- | :--- | :--- | :-: | --: | :-: | :--- |
| `DESK-STU` | Bộ bàn ghế sinh viên 2–4 chỗ khung thép mặt gỗ Melamine | Hòa Phát (The One) BSV105 | Bộ | 1.650.000 | 12 tháng | Giảng đường lý thuyết, Seminar, Smart Classroom & Phòng Tự học T1–T5 |
| `DESK-LEC` | Bộ bàn ghế giảng viên & bục gỗ thuyết trình | Hòa Phát BGV103 + Bục phát biểu LT01 | Bộ | 3.200.000 | 12 tháng | Tất cả giảng đường, Phòng Lab, Phòng Hội thảo `A1-PHT`, Phòng Học Lớn `A1-PHL` |
| `DESK-OFF` | Cụm bàn làm việc văn phòng, bàn họp & ghế xoay lưới | Hòa Phát LUX140 + Ghế GL217 | Bộ | 4.800.000 | 12 tháng | Văn phòng Khoa, Đào tạo `A1-PĐT`, Tài vụ `A1-418`, Tiếp SV, Phòng họp, Phòng GV `A1-PGV` |
| `SHELF-LIB` | Giá sách sắt thư viện 2 mặt 5 tầng sơn tĩnh điện | Hòa Phát GS2B2 | Kệ | 4.500.000 | 24 tháng | Phòng Thư viện `A1-PTV` (Tầng 1), Không gian sách mở `A1-501` (Tầng 5) |
| `RACK-WH` | Kệ sắt tải nặng V-lỗ / Selective 4 tầng chứa thiết bị kho | Vinatech 200kg/tầng | Kệ | 2.900.000 | 24 tháng | Kho trung tâm `KHO-01`, `A1-K1`, `A1-K2`, `A1-KHO-TAY`, `A1-KHO-T5`, Xưởng `A1-XTC` |
| `CAB-FILE` | Tủ sắt hồ sơ 2 cánh / Két sắt chống cháy / Tủ Locker SV | Hòa Phát TU09K2 / Locker TU984-3K | Chiếc | 3.800.000 | 24 tháng | Đào tạo `A1-PĐT`, Tài vụ `A1-418`, Khảo thí `A1-414`, VP Khoa, Cửa Thư viện `A1-PTV` |
| `CURTAIN` | Hệ rèm cuốn cản sáng chống chói màn chiếu | Rèm cuốn Polyester cản sáng 100% | Bộ | 2.200.000 | 12 tháng | Ô cửa sổ giảng đường, Phòng Lab, Phòng Hội thảo, Rạp chiếu phim `A1-504` |

---

### 11. Nhóm `CAT-SPEC` — Thiết bị Chuyên dụng Y tế

| Mã mẫu | Tên thiết bị | Hãng / Model tham khảo | ĐVT | Nguyên giá tham khảo (VNĐ) | Bảo hành | Vị trí lắp đặt tại Tòa A1 |
| :--- | :--- | :--- | :-: | --: | :-: | :--- |
| `MED-BED` | Giường bệnh inox nâng đầu kèm đệm y tế & tủ đầu giường | Inox 304 1 tay quay | Bộ | 4.800.000 | 24 tháng | Phòng Y tế `A1-YT-T3` (Tầng 3) |
| `MED-CAB` | Tủ thuốc y tế inox kính 2 buồng & Xe tiêm sơ cứu | Inox 304 chuẩn Bộ Y tế | Bộ | 5.200.000 | 24 tháng | Phòng Y tế `A1-YT-T3` (Tầng 3) |
| `MED-DIAG` | Bộ thiết bị khám sơ cứu (Máy đo huyết áp, SpO2, Nhiệt kế, Cân) | Omron HEM-7156 + Beurer FT90 | Bộ | 4.100.000 | 24 tháng | Phòng Y tế `A1-YT-T3` (Tầng 3) |
| `MED-AED` | Máy sốc tim tự động ngoài lồng ngực (`AED`) cấp cứu | Nihon Kohden AED-3100 / Zoll AED Plus | Chiếc | 39.000.000 | 36 tháng | Phòng Y tế `A1-YT-T3` (Tầng 3) & Đại sảnh chính `A1-CV` (Tầng 1) |

---

## PHẦN IV. DANH MỤC VẬT TƯ TIÊU HAO & LINH KIỆN SỬA CHỮA (`spare_parts`)

| STT | Mã linh kiện | Tên vật tư / Linh kiện thay thế | ĐVT | Tồn tối thiểu (`min_stock`) | Đơn giá tham khảo (VNĐ) | Phục vụ sửa chữa & kết nối nhóm thiết bị |
| :-: | :--- | :--- | :-: | :-: | --: | :--- |
| 1 | `PART-LAMP` | Cụm bóng đèn máy chiếu 230W – 250W chính hãng | Cái | 3 | 1.500.000 | Máy chiếu `CAT-DISPLAY` |
| 2 | `PART-FILT` | Tấm lưới lọc bụi tĩnh điện máy chiếu | Tấm | 5 | 220.000 | Máy chiếu `CAT-DISPLAY` |
| 3 | `PART-RMT` | Điều khiển từ xa đa năng (Máy chiếu / Điều hòa / TV) | Cái | 5 | 250.000 | `CAT-DISPLAY`, `CAT-HVAC` |
| 4 | `PART-HDMI` | Cáp tín hiệu HDMI 2.0 chống nhiễu truyền hình ảnh lên TV / Máy chiếu (5m / 10m / 15m) | Sợi | 6 | 350.000 | Truyền hình ảnh lên Smart TV & Máy chiếu `CAT-DISPLAY` |
| 5 | `PART-PATCH` | Dây nhảy mạng Cat6 Patch Cord đúc sẵn & Hộp hạt RJ45 | Hộp/Bó | 5 | 280.000 | Hạ tầng mạng & Phòng Lab `CAT-NET` |
| 6 | `PART-BATT12` | Bình ắc quy khô 12V-7.5Ah / 12V-9Ah (cho đèn sự cố, loa kéo) | Bình | 6 | 420.000 | Đèn sự cố `CAT-POWER`, Loa kéo `CAT-AUDIO` |
| 7 | `PART-LEDDRV` | Chấn lưu / Nguồn LED Driver & Bóng tuýp LED 1.2m dự phòng | Cái | 15 | 140.000 | Chiếu sáng giảng đường `CAT-POWER` |
| 8 | `PART-MCB` | Aptomat chống giật `RCBO` / `MCB` 1P–2P & Ổ cắm âm sàn | Cái | 8 | 190.000 | Hệ thống điện phòng học `CAT-POWER` |
| 9 | `PART-TONER` | Hộp mực máy in Laser / Ống mực máy Photocopy | Hộp | 5 | 650.000 | Máy in, Photocopy `CAT-OFFICE` |
| 10 | `PART-ROFILT` | Bộ lõi lọc thô 1-2-3 thay định kỳ cho cây lọc nước hành lang | Bộ | 4 | 290.000 | Máy lọc nước uống `CAT-OFFICE` |

---

## PHẦN V. ĐỊNH MỨC TRANG BỊ CHUẨN THEO LOẠI PHÒNG (`required_equipment`)

| Loại không gian trong Tòa A1 | Trang bị chuẩn từ danh mục giữ lại |
| :--- | :--- |
| **1. Phòng học lý thuyết (50–65 chỗ)** | `PRJ-STD` Máy chiếu siêu gần + `SCR-ELEC` Màn chiếu điện + `AC-CASS` Điều hòa âm trần Cassette + `WIFI-AP` Bộ phát Wi-Fi 6 + `CAM-DOME` Camera phòng thi + `LED-PANEL` Chiếu sáng + `SMOKE-DET` & `EXT-POWD` PCCC + `DESK-LEC`, `DESK-STU`, `CURTAIN` |
| **2. Phòng Seminar / Smart Classroom** | Bổ sung `TV-SMART` (kèm cáp HDMI `PART-HDMI` truyền hình ảnh lên TV), `VCAM-PTZ` Camera hội nghị PTZ và `DOOR-ACC` Khóa từ kiểm soát cửa (cho Smart Classroom) |
| **3. Phòng Lab CNTT & Nhúng (`A1-201..404`)** | Cụm `PC-LAB` + `PRJ-STD` + `SCR-ELEC` + `AC-CASS` + `FAN-EXH` Quạt hút thông gió + `SW-CORE` Switch PoE + `RACK-CAB` Tủ Rack + `DOOR-ACC` Khóa từ + `EXT-CO2` Bình CO₂ (kèm `SRV-RACK`, `RTR-FW`, `KIT-IOT` theo chuyên ngành) |
| **4. Thư viện trung tâm (`A1-PTV`, 250 chỗ)** | `BARCODE` Đầu đọc mã vạch + `KIOSK-TC` Kiosk tra cứu + `NAS-STOR` Lưu trữ học liệu + `SIGNAGE` Standee 55" + `AC-CASS` Điều hòa Cassette + `WIFI-AP` + `SPK-CEIL` + `CAM-DOME` + `SHELF-LIB` Giá sách sắt + `CAB-FILE` Tủ Locker + `WATER-DISP` |
| **5. Văn phòng Khoa / Đào tạo / Tài vụ (T4–T5)** | `MFP-COPY` / `PRT-LASER` + `SCN-ADF` + `SHREDDER` + `IP-PHONE` + `WATER-DISP` + `AC-CASS` + `DESK-OFF` + `CAB-FILE` (Tài vụ `A1-418` & Khảo thí `A1-414` trang bị thêm `DOOR-ACC`, `CAM-DOME` & Két chống cháy) |
| **6. Phòng Học Lớn (`A1-PHL`) & Studio (`A1-503`)** | `AMP-PRO` Cục đẩy công suất + `MIXER-AU` Bàn trộn âm thanh + `STAGE-LGT` Hệ thống đèn sân khấu DMX + `HDMI-MTX` Ma trận HDMI + `AC-CASS` (`A1-503` bổ sung `DOOR-ACC`, `VCAM-PTZ`, `EXT-CO2`) |
| **7. Phòng Y tế (`A1-YT-T3`, Tầng 3)** | `2` `MED-BED` Giường bệnh inox + `1` `MED-CAB` Tủ thuốc inox + `1` `MED-DIAG` Bộ khám sơ cứu + `1` `MED-AED` Máy sốc tim tự động + `AC-CASS` + `FAN-EXH` + `IP-PHONE` + `WATER-DISP` |
| **8. Kho thiết bị dự phòng (`KHO-01`, Tầng 1)** | Hạ tầng kho (`RACK-WH`, `DOOR-ACC`, `CAM-DOME`, `BARCODE`, `FAN-EXH`, `SMOKE-DET`, `EXT-POWD`, `EXT-CO2`) + Thiết bị dự phòng `in_stock` sẵn sàng điều chuyển (`PRJ-STD`, `SCR-ELEC`, `TV-SMART`, `AC-CASS`, `SPK-PORT`, `PC-LAB`, `WIFI-AP`, `SW-CORE`, `PRT-LASER`) |
