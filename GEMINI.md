# QUY CHUẨN TỰ ĐỘNG HÓA VÀ ĐIỀU PHỐI 11 BỘ SKILL — DỰ ÁN RUO

> Tệp cấu hình này tự động kích hoạt và áp dụng trong mọi lượt hội thoại (turns) của Antigravity tại dự án **Ruo (Hệ Thống Quản Lý Cơ Sở Vật Chất Đại Học)**.

---

## I. DANH MỤC 11 BỘ SKILL NỀN TẢNG ĐƯỢC TÍCH HỢP

Hệ thống luôn đối chiếu và kích hoạt tự động các kỹ năng từ `.agents/skills/` tương ứng với 11 kho chuẩn mực kỹ thuật sau:

1. **`obra/superpowers`** (`superpowers`): Quy trình kỷ luật kỹ thuật (`using-superpowers`, `brainstorming`, `writing-plans`, `test-driven-development`, `systematic-debugging`, `verification-before-completion`).
2. **`DietrichGebert/ponytail`** (`ponytail`): Triết lý kỹ thuật tối giản, thực dụng — ưu tiên Native Web/Node APIs, không cài đặt thư viện thừa, chống over-engineering.
3. **`juliusbrussee/caveman`** (`caveman`): Giao tiếp cô đọng, mật độ thông tin cao (high-signal, token-efficient) — bỏ văn phong rườm rà, đi thẳng vào kết quả, nguyên nhân và hành động kỹ thuật.
4. **`nextlevelbuilder/ui-ux-pro-max-skill`** (`ui-ux-pro-max`): Hệ thống hóa UI/UX chuyên sâu (bảng màu giáo dục đại học, thang chữ, khoảng cách, độ tương phản WCAG, đồng bộ Light/Dark mode).
5. **`mattpocock/skills`** (`matt-pocock-skills`): Thiết kế module sâu với giao diện hẹp (`codebase-design`), mô hình hóa nghiệp vụ (`domain-modeling`), `tdd`, chẩn đoán lỗi (`diagnosing-bugs`) và chất vấn thiết kế (`grill-me`).
6. **`nousresearch/hermes-agent`** (`hermes-agent`): Điều phối tác nhân tự chủ theo vòng lặp khép kín (closed-loop execution), quản trị ngữ cảnh thông minh, ủy quyền subagent khi nghiên cứu diện rộng và tự đúc kết quy trình.
7. **`anthropics/skills`** (`anthropic-skills`): Thiết kế frontend chỉn chu (`frontend-design`), kiểm thử ứng dụng web (`webapp-testing`) và chuẩn mực tích hợp công cụ.
8. **`leonxlnx/taste-skill`** (`taste-skill`): Thẩm mỹ thiết kế cấp độ agency ("Good Taste") — chống giao diện AI đại trà (anti-slop), chăm chút trạng thái tương tác (loading/empty/error/hover/focus) và nhịp điệu thị giác.
9. **`mvanhorn/last30days-skill`** (`last30days-skill`): Nghiên cứu thông tin mới nhất (30 ngày gần nhất) khi tra cứu công nghệ, thư viện, bảo mật hoặc xu hướng bên ngoài thay vì dựa vào kiến thức cũ.
10. **`voltagent/awesome-design-md`** (`awesome-design-md`): Chuẩn design tokens đối chiếu từ các hệ thống hàng đầu (Linear, Stripe, Vercel, Supabase) — đường viền sắc nét, phân tầng bề mặt tinh tế, thao tác bàn phím mượt mà.
11. **`garrytan/gstack`** (`gstack`): Mô hình đội ngũ kỹ thuật ảo đa vai trò:
    - `plan-ceo-review` (tư duy sản phẩm & trải nghiệm 10 sao),
    - `plan-eng-review` (kiến trúc, luồng dữ liệu, edge cases & ma trận kiểm thử),
    - `review` / `qa` / `cso` (kiểm toán code khắt khe, rà soát race condition, RBAC và bảo mật trước khi ship).

---

## II. NGUYÊN TẮC KÍCH HOẠT TỰ ĐỘNG THEO NGỮ CẢNH (AUTOMATIC SKILL INVOCATION)

### 1. Phân hệ UI/UX & Frontend Development
*Mỗi khi thiết kế giao diện, chỉnh sửa CSS, tạo components, bố cục màn hình:*
- **`ui-ux-pro-max`**, **`taste-skill`**, **`frontend-design` (`anthropics/skills`)** & **`awesome-design-md`**: Đảm bảo chuẩn thẩm mỹ cao cấp, đồng bộ design tokens, responsive layout và micro-interactions.

### 2. Phân hệ Phân tích, Kiến trúc & Nghiên cứu (Planning, Architecture & Research)
*Mỗi khi lên kiến trúc tính năng mới, tạo module, phân tích nghiệp vụ hoặc tra cứu giải pháp:*
- **`superpowers` (`brainstorming`, `writing-plans`)**, **`gstack` (`plan-ceo-review`, `plan-eng-review`)** & **`matt-pocock-skills` (`codebase-design`, `domain-modeling`, `grill-me`)**: Làm rõ yêu cầu, thiết kế deep modules, khóa chặt sơ đồ luồng dữ liệu và các trường hợp biên.
- **`last30days-skill`** & **`hermes-agent`**: Chủ động tra cứu tài liệu/xu hướng mới nhất và điều phối subagent khi cần khảo sát diện rộng.

### 3. Phân hệ Lập trình & Xây dựng Tính năng (Coding & Build)
*Mỗi khi viết code React hoặc Node.js / MongoDB:*
- **`tdd` (`matt-pocock-skills` / `superpowers`)** & **`ponytail`**: Viết logic kiểm thử chặt chẽ, tận dụng native API, giữ mã nguồn gọn sạch, hoàn chỉnh 100% không có placeholder `// todo`.

### 4. Phân hệ Chẩn đoán, Sửa lỗi & Kiểm toán Bảo mật (Debugging, QA & Security)
*Mỗi khi phát sinh bug, lỗi biên dịch, lỗi runtime, RBAC hoặc xung đột nghiệp vụ:*
- **`systematic-debugging` (`superpowers`)**, **`diagnosing-bugs` (`matt-pocock-skills`)** & **`gstack` (`investigate`, `cso`)**: Tìm nguyên nhân gốc rễ (root cause) dựa trên bằng chứng thực tế, kiểm tra ranh giới phân quyền RACI/RBAC và toàn vẹn dữ liệu.

### 5. Phân hệ Nghiệm thu & Giao tiếp (Verification, Review & Communication)
*Trước khi hoàn tất tính năng hoặc phản hồi người dùng:*
- **`verification-before-completion` (`superpowers`)** & **`gstack` (`review`, `qa`)**: Chạy lệnh kiểm thử/build và kiểm tra kết quả thực tế trước khi báo cáo hoàn thành.
- **`caveman`**: Trình bày phản hồi ngắn gọn, súc tích, tập trung vào thay đổi cốt lõi và bằng chứng kỹ thuật.

### 6. Quy Tắc Bất Biến Về Biểu Tượng (Strict Native SVG Only)
- **TUYỆT ĐỐI KHÔNG DÙNG THƯ VIỆN ICON:** Cấm import hoặc cài đặt bất kỳ thư viện icon bên ngoài nào (như `lucide-react`, `react-icons`, `@heroicons/react`, FontAwesome...).
- **CHỈ SỬ DỤNG SVG THUẦN (Native Inline SVG):** Mọi biểu tượng, icon điều hướng, status indicator, action buttons trong toàn bộ dự án PHẢI được viết trực tiếp bằng SVG (inline SVG component hoặc tệp component SVG nội bộ).

---

## III. ĐỊNH DẠNG PHẢN HỒI MINH BẠCH

Mỗi khi agent bắt đầu xử lý một tác vụ, hãy thông báo ngắn gọn các skill đang dẫn dắt quy trình ở dòng đầu tiên:
> `[⚡ Áp dụng Skill: <tên-skill> — <mục đích>]`
