# ChronoFlow

ChronoFlow là một ứng dụng quản lý lịch trình và công việc được xây dựng với hiệu ứng hình ảnh sống động, hỗ trợ tùy biến giao diện mạnh mẽ. Dự án sử dụng bộ công cụ hiện đại để mang lại trải nghiệm mượt mà và linh hoạt trên máy tính.

## 🚀 Công nghệ sử dụng

- **Frontend:** React 19 + TypeScript + Vite
- **Desktop Framework:** Tauri v2 (Rust)
- **Styling:** Tailwind CSS 4.0
- **State Management:** Zustand
- **Icons:** Lucide React
- **Date Handling:** date-fns

## 🛠️ Hướng dẫn cài đặt cho nhà phát triển

### Điều kiện tiên quyết
- **Node.js:** Phiên bản LTS mới nhất.
- **Rust:** Cần thiết để xây dựng ứng dụng Tauri. Cài đặt tại [rustup.rs](https://rustup.rs/).
- **pnpm:** Trình quản lý gói được khuyến khích sử dụng.

### Các bước thực hiện
1. **Clone dự án:**
   ```bash
   git clone <url-cua-du-an>
   cd ScheduleApp
   ```

2. **Cài đặt dependencies:**
   ```bash
   pnpm install
   ```

3. **Chạy ở chế độ phát triển (Development):**
   ```bash
   pnpm tauri dev
   ```

4. **Xây dựng ứng dụng (Build):**
   ```bash
   pnpm tauri build
   ```

## 🧩 Hướng dẫn Mod dự án

"Mod" trong dự án này có nghĩa là mở rộng hoặc chỉnh sửa các tính năng cốt lõi. Dưới đây là hướng dẫn cơ bản:

### Cấu trúc thư mục quan trọng
- `src/components/`: Nơi chứa các UI components. Bạn có thể thêm các widget mới tại đây.
- `src/store/`: Quản lý trạng thái ứng dụng bằng Zustand. Nếu bạn muốn thêm logic lưu trữ mới, hãy tạo một file `use...Store.ts` tại đây.
- `src/models/`: Định nghĩa các interface và kiểu dữ liệu cho lịch trình, tác vụ.
- `src/hooks/`: Các custom hooks xử lý logic như theo dõi phiên làm việc, thông báo.

### Thêm tính năng mới
1. **Định nghĩa Model:** Nếu tính năng mới cần dữ liệu mới, hãy cập nhật hoặc thêm file trong `src/models/`.
2. **Quản lý trạng thái:** Cập nhật store tương ứng trong `src/store/` để xử lý dữ liệu.
3. **Tạo UI:** Xây dựng component mới trong `src/components/` và tích hợp vào `Dashboard.tsx` hoặc các view tương ứng.

## 🎨 Hướng dẫn thêm Theme

Dự án hỗ trợ hệ thống theme linh hoạt. Bạn có thể dễ dàng thêm giao diện mới theo các bước sau:

### 1. Định nghĩa Theme mới
Mở file `src/themes/configs.ts` và tạo một đối tượng `ThemeConfig` mới. Ví dụ:

```typescript
export const myCustomTheme: ThemeConfig = {
  id: 'my-custom',
  name: 'My Custom Theme',
  type: 'custom',
  colors: {
    background: '#1a1a1a',
    surface: '#2d2d2d',
    surfaceHover: '#3d3d3d',
    primary: '#ff5555',
    primaryForeground: '#ffffff',
    text: '#f8f8f2',
    textSecondary: '#6272a4',
    border: '#44475a',
    accent: '#bd93f9',
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    titleFont: 'Inter, sans-serif',
  },
  ui: {
    radius: '8px',
    borderWeight: '1px',
    shadow: '0 4px 12px rgba(0,0,0,0.5)',
  },
  effects: {
    glow: true,
    scanlines: false,
    animations: true,
    // Màu sắc cho các hiệu ứng hạt (particles)
    rainColor: 'rgba(255, 85, 85, 0.3)',
    snowColor: 'rgba(255, 255, 255, 0.5)',
    sakuraColor: 'rgba(255, 183, 197, 0.5)',
    starsColor: 'rgba(189, 147, 249, 0.6)',
    matrixColor: 'rgba(80, 250, 123, 0.8)',
    electricityColor: 'rgba(139, 233, 253, 0.8)',
    fogColor: 'rgba(68, 71, 90, 0.2)',
  },
};
```

### 2. Đăng ký Theme
Thêm theme bạn vừa tạo vào mảng `themes` ở cuối file `src/themes/configs.ts`:

```typescript
export const themes = [
  minimalTheme, 
  neonTheme, 
  terminalTheme, 
  softTheme, 
  fantasyTheme,
  myCustomTheme // Thêm vào đây
];
```

### 3. Cập nhật Type (Nếu cần)
Nếu bạn sử dụng một `type` mới, hãy cập nhật kiểu dữ liệu `ThemeType` trong `src/themes/theme.types.ts`.

## 📄 Giấy phép

Dự án này được phân phối dưới giấy phép **MIT**. Xem file `LICENSE` để biết thêm chi tiết.
