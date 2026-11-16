# WorkSphere Frontend

Frontend hệ thống quản lý nhân sự, dự án, công việc và báo cáo doanh nghiệp (WorkSphere Enterprise).

---

## 🛠 Công nghệ sử dụng

- **Core**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Lucide React
- **State Management & Data**: Zustand, Axios, React Hook Form + Zod, Recharts
- **Hỗ trợ chạy song song**: Chạy với API Backend thật (Spring Boot) hoặc chế độ Mock Data.

---

## ⚙️ Cài đặt và Kết nối Backend

### 1. Cấu hình biến môi trường kết nối Backend
Đường dẫn kết nối API được cấu hình thông qua biến môi trường tại file:
- [FRONT_New/.env](file:///c:/Users/hocha/OneDrive/Documents/Desktop/nam%204/doan_fe/FRONT_New/.env) (hoặc [.env.development](file:///c:/Users/hocha/OneDrive/Documents/Desktop/nam%204/doan_fe/FRONT_New/.env.development))

Nội dung cấu hình:
```env
# URL API của Backend Spring Boot (mặc định port 8080)
VITE_API_BASE_URL=http://localhost:8080/api

# Tắt mock data để gửi toàn bộ request tới API backend thật:
VITE_USE_MOCK_API=false
```

> **Chi tiết các đường dẫn kết nối trong code:**
> - File cấu hình kết nối Axios: [src/services/api/client.ts](file:///c:/Users/hocha/OneDrive/Documents/Desktop/nam%204/doan_fe/FRONT_New/src/services/api/client.ts)
>   - Đọc `import.meta.env.VITE_API_BASE_URL` (nếu không có sẽ mặc định về `http://localhost:8080/api`).
>   - Gắn `Authorization: Bearer <accessToken>` tự động vào từng request khi người dùng đã đăng nhập.
> - Các file gọi endpoint tương ứng trong [src/services/api/](file:///c:/Users/hocha/OneDrive/Documents/Desktop/nam%204/doan_fe/FRONT_New/src/services/api):
>   - **Auth**: `/api/auth/login`, `/api/auth/me` (`auth.api.ts`)
>   - **Dự án**: `/api/projects` (`project.api.ts`)
>   - **Thành viên dự án**: `/api/projects/{projectId}/members` (`project-member.api.ts`)
>   - **Công việc**: `/api/tasks` (`task.api.ts`)
>   - **Phòng ban**: `/api/departments` (`department.api.ts`)
>   - **Người dùng**: `/api/users` (`user.api.ts`)
>   - **Báo cáo / Dashboard**: `/api/dashboard/overview`, `/api/dashboard/department-workload` (`dashboard.api.ts`)
>   - **Đánh giá KPI / HR**: `/api/hr/scorecards` (`hr.api.ts`)
>   - **Cấu hình Email**: `/api/email-config` (`email.api.ts`)
>   - **AI Planning**: `/api/ai/project-plan` (`ai.api.ts`)

---

## 🚀 Hướng dẫn khởi chạy hệ thống

### Bước 1: Khởi động Backend Spring Boot (`nam 4/doan`)
1. Đảm bảo dịch vụ **PostgreSQL** đang chạy với cơ sở dữ liệu `hrm_db` (user: `postgres`, password: `123456` theo cấu hình `application.yml`).
2. Khởi chạy ứng dụng Spring Boot trong thư mục `doan`:
   - Hoặc mở bằng IntelliJ IDEA / Eclipse và chạy `HrmApplication.java`.
   - Hoặc dùng terminal:
     ```bash
     mvn spring-boot:run
     ```
   - Backend sẽ chạy tại cổng: `http://localhost:8080` (Tài liệu Swagger UI: `http://localhost:8080/swagger-ui.html`).

### Bước 2: Cài đặt và Chạy Frontend (`nam 4/doan_fe/FRONT_New`)
1. Mở terminal tại thư mục `FRONT_New`:
   ```bash
   cd "FRONT_New"
   ```
2. Cài đặt các gói phụ thuộc (nếu chưa cài):
   ```bash
   npm install
   ```
3. Chạy giao diện phát triển (Development Server):
   ```bash
   npm run dev
   ```
   - Ứng dụng sẽ chạy tại địa chỉ: `http://localhost:5173` (hoặc cổng hiển thị trên terminal).

---

## 🔑 Tài khoản đăng nhập mặc định (Dữ liệu thật từ Database)

Khi kết nối với Backend thật (`VITE_USE_MOCK_API=false`), database khởi tạo sẵn các tài khoản với mật khẩu chung là **`123456`**:

| Vai trò | Email đăng nhập | Mật khẩu | Chức năng |
| :--- | :--- | :---: | :--- |
| **ADMIN** | `admin@hrm.com` | `123456` | Quản trị toàn hệ thống, phòng ban, phân quyền |
| **MANAGER (IT)** | `it.manager@hrm.com` | `123456` | Trưởng phòng CNTT, quản lý dự án & phân công |
| **MANAGER (Sales)** | `sales.manager@hrm.com` | `123456` | Trưởng phòng Kinh doanh & Tiếp thị |
| **EMPLOYEE (Dev)** | `dev1@hrm.com` | `123456` | Nhân viên Senior Dev, cập nhật tiến độ task |

*(Lưu ý: Nếu bật lại `VITE_USE_MOCK_API=true` trong file `.env`, hệ thống sẽ quay về chế độ dùng mock data offline với tài khoản demo mật khẩu `demo123`)*.

---

## 🧪 Build và Kiểm tra mã nguồn

```bash
# Kiểm tra types và build production
npm run build

# Xem thử bản build production
npm run preview
```
