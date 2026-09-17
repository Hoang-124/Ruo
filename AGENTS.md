# QUY CHUẨN TỰ ĐỘNG HÓA VÀ ĐIỀU PHỐI SKILL — DỰ ÁN RUO

> Tệp cấu hình này tự động kích hoạt và áp dụng trong mọi lượt hội thoại (turns) của Antigravity tại dự án **Ruo (Hệ Thống Quản Lý Cơ Sở Vật Chất Đại Học)**.

---

## I. NGUYÊN TẮC KÍCH HOẠT TỰ ĐỘNG (AUTOMATIC SKILL INVOCATION)

Mỗi khi người dùng yêu cầu thực hiện bất kỳ công việc nào, hệ thống **bắt buộc tự động quét và kích hoạt các bộ kỹ năng (Skills)** phù hợp từ kho `.agents/skills/` trước khi tiến hành viết mã hoặc chỉnh sửa:

### 1. Phân hệ UI/UX & Frontend Development
*Mỗi khi thiết kế giao diện, chỉnh sửa CSS, tạo components, bố cục màn hình:*
- **`ui-ux-pro-max` & `ui-styling`**: Áp dụng chuẩn thiết kế chuyên sâu (palette màu giáo dục cao cấp, font scale chuẩn, spacing và card elevation).
- **`taste-skill` & `frontend-design`**: Chống thiết kế generic/slop, đảm bảo tính thẩm mỹ cấp agency cao cấp, micro-animations và responsive layout.
- **`awesome-design-md`**: Đối chiếu design tokens từ các hệ thống lớn (Linear, Stripe, Vercel, Supabase).

### 2. Phân hệ Phân tích & Lập Kế hoạch (Planning & Architecture)
*Mỗi khi lên kiến trúc tính năng mới, tạo module, hoặc phân tích nghiệp vụ 95 Use Cases:*
- **`using-superpowers`**: Tuân thủ kỷ luật quy trình, kiểm tra skill trước mọi hành động.
- **`brainstorming` & `writing-plans`**: Làm rõ yêu cầu, xác định các trường hợp biên (edge-cases) trước khi bắt tay vào code.
- **`codebase-design` & `domain-modeling`**: Thiết kế cấu trúc module sâu (deep modules), ranh giới rõ ràng giữa 5 phân hệ (Horizontal Slicing).

### 3. Phân hệ Lập trình & Xây dựng Tính năng (Coding & Build)
*Mỗi khi viết code React hoặc Node.js / MongoDB:*
- **`tdd` / `test-driven-development`**: Thiết lập điều kiện kiểm thử và logic chặt chẽ.
- **`ponytail`**: Ưu tiên giải pháp tối giản, tận dụng native API, tránh over-engineering hoặc cài thư viện thừa thãi.
- **`full-output-enforcement`**: Viết mã hoàn chỉnh 100%, tuyệt đối không viết placeholder `// todo` hoặc lược bỏ code.

### 4. Phân hệ Chẩn đoán & Sửa lỗi (Debugging)
*Mỗi khi phát sinh bug, lỗi biên dịch, lỗi runtime hoặc xung đột lịch:*
- **`systematic-debugging` & `diagnosing-bugs`**: Tìm nguyên nhân gốc rễ (root cause) dựa trên bằng chứng, không đoán mò hoặc sửa chắp vá.

### 5. Phân hệ Nghiệm thu & Kiểm toán (Verification & Review)
*Trước khi hoàn tất bất kỳ tính năng hoặc báo cáo kết quả:*
- **`verification-before-completion`**: Chạy lệnh build, kiểm tra syntax, kiểm tra log thực tế trước khi khẳng định đã hoàn thành.
- **`code-review`**: Tự kiểm duyệt tiêu chuẩn mã nguồn và đối chiếu với đặc tả Use Case.

### 6. Quy Tắc Bất Biến Về Biểu Tượng (Strict Native SVG Only)
- **TUYỆT ĐỐI KHÔNG DÙNG THƯ VIỆN ICON:** Cấm import hoặc cài đặt bất kỳ thư viện icon bên ngoài nào (như `lucide-react`, `react-icons`, `@heroicons/react`, FontAwesome...).
- **CHỈ SỬ DỤNG SVG THUẦN (Native Inline SVG):** Mọi biểu tượng, icon điều hướng, status indicator, action buttons trong toàn bộ dự án PHẢI được viết trực tiếp bằng SVG (inline SVG component hoặc tệp component SVG nội bộ).

---

## II. ĐỊNH DẠNG PHẢN HỒI MINH BẠCH

Mỗi khi agent bắt đầu xử lý một tác vụ, hãy thông báo ngắn gọn skill đang dẫn dắt quy trình:
> `[⚡ Áp dụng Skill: <tên-skill> — <mục đích>]`

Điều này đảm bảo người dùng luôn biết được chuẩn mực kỹ thuật nào đang được áp dụng tự động vào mã nguồn.
