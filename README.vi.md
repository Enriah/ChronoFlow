# ChronoFlow

[English](./README.md) · [Tải bản mới nhất](https://github.com/Enriah/ChronoFlow/releases/latest) · [Lịch sử thay đổi](./CHANGELOG.md)

![ChronoFlow](./ChronoFlow.png)

ChronoFlow là ứng dụng desktop Windows hoạt động theo hướng local-first, giúp biến kế hoạch trong ngày thành các event có thời điểm rõ ràng và các phiên tập trung độc lập. Schedule, Planner, Event Timeline, Session, báo cáo, theme và hiệu ứng động cùng nằm trong một ứng dụng Tauri, không yêu cầu tài khoản đám mây.

## Tải và cài đặt

Bản desktop hiện tại là **ChronoFlow 0.1.0**, dành cho Windows 10/11 x64.

- [Tải bộ cài Windows khuyến nghị (.exe)](https://github.com/Enriah/ChronoFlow/releases/latest/download/ChronoFlow_0.1.0_x64-setup.exe)
- [Tải gói Windows Installer (.msi)](https://github.com/Enriah/ChronoFlow/releases/latest/download/ChronoFlow_0.1.0_x64_en-US.msi)
- [Xem tất cả bản phát hành và release notes](https://github.com/Enriah/ChronoFlow/releases)

Chạy một trong hai bộ cài, hoàn tất trình hướng dẫn rồi mở ChronoFlow từ Start Menu. Windows SmartScreen có thể báo nhà phát hành chưa được nhận diện vì bản cộng đồng chưa được ký code-signing; hãy kiểm tra file được tải đúng từ trang Releases của repository này trước khi tiếp tục.

## Mỗi phần dùng để làm gì?

| Khu vực | Chức năng |
| --- | --- |
| **Schedule** | Theo dõi kế hoạch đang chạy trong hôm nay. EventTrack chiếm vùng chính; Today's Timeline là bảng dọc nhỏ bên phải để đối chiếu nhanh. |
| **Planner** | Tạo và chỉnh các khối lịch theo ngày cùng Event Timeline. Công việc của ngày hiện tại tự đồng bộ sang Schedule. |
| **Sessions** | Máy tính giờ tập trung hoạt động độc lập, có flow step, checklist, ghi chú, số lần gián đoạn và action được cấp phép. Session không nằm trong Schedule. |
| **Session Templates** | Lưu cấu hình Session dùng lại gồm thời lượng, action, flow step và mẫu ghi chú. Template không tự tạo lịch trong Planner/Schedule. |
| **Reports** | Chỉ tính dữ liệu thật từ Session đã hoàn thành: thời gian tập trung, tổng theo dự án, planned/actual và lịch sử gần đây. |
| **Themes** | Quản lý bảng màu, background, typography, bề mặt widget và hiệu ứng Visual Engine. |
| **Settings** | Quản lý developer action, âm báo timer, tùy chọn floating widget và sao lưu/khôi phục dữ liệu. |

## Hướng dẫn sử dụng

### 1. Khai báo action nếu cần tự động mở tài nguyên

Vào **Settings → Developer Actions → Add Action**. Chọn app, file, folder, URL hoặc command; sau đó chọn trạng thái bật và yêu cầu xác nhận trước khi chạy. Command luôn bắt buộc xác nhận và được phân loại mức độ an toàn.

Chỉ action đã đăng ký và đang bật mới có thể bind vào event. Cơ chế này ngăn văn bản lịch trở thành một trình chạy lệnh không giới hạn.

### 2. Lập kế hoạch trong Planner

Mở **Planner**, chọn ngày rồi tạo schedule block. Nhập tên, thời điểm bắt đầu, thời lượng và các event. Duration nhận giá trị phút tùy ý; chỉ giá trị dưới 5 mới được chuẩn hóa về 5 phút.

Event Timeline hỗ trợ action, reminder, checklist, note và alert. Có thể đặt event trên nhiều track, thay đổi snap/zoom và chỉnh thời gian tương đối trong schedule block.

### 3. Lập lịch nhanh bằng văn bản

Chọn **Quick Add** trong Planner. Bộ parser chạy hoàn toàn cục bộ, theo cú pháp xác định và không sử dụng AI/API.

```text
Day 06/07/2026, from "09:30" to "10:30", "Fix CI Pipeline",
event(from "09:45" to "09:50", name "Open Chrome", action "Chrome"),
event(from "10:00" to "10:05", name "Check logs", reminder),
event(from "10:15" to "10:25", name "Verify", checklist "check health|check logs|check dashboard")
```

Parser sẽ kiểm tra ngày/giờ, phát hiện event chồng nhau hoặc nằm ngoài schedule, tìm action đang bật và mở bản preview cho phép chỉnh sửa trước khi tạo.

### 4. Theo dõi lịch hôm nay

Planner item có ngày là hôm nay sẽ xuất hiện trong **Schedule**. EventTrack lấy các event đã đặt và kích hoạt action được bind khi đến giờ. Bảng nhỏ bên phải hiển thị thứ tự các khối công việc trong ngày.

### 5. Chạy Session riêng

Vào **Sessions → New session** để tạo phiên tập trung thủ công. Thêm flow step, checklist, ghi chú và action rồi bắt đầu timer. Có thể lưu cấu hình hữu ích thành Session Template. Khi Session kết thúc, dữ liệu thực tế mới được đưa vào Reports.

## Theme và hiệu ứng động

Các theme có sẵn gồm Minimal Dark, Cyber Dev, Terminal, Sakura Day, Enchanted Realm, Maple Forest, Sakura Evening và Deep Galaxy. Visual Engine hỗ trợ aurora, electricity, fog, lá phong, matrix, rain, cánh hoa sakura, snow và stars.

Canvas hiệu ứng nằm trên background nhưng dưới widget. Màu hiệu ứng tự thích nghi với theme sáng/tối để vẫn nhìn thấy rõ mà không làm giảm độ đọc của nội dung.

## Những phần đã cải tiến và tối ưu

- Tách Session timer khỏi Schedule để hai tính năng có trách nhiệm rõ ràng.
- Thiết kế Schedule thành EventTrack lớn và Today's Timeline nhỏ gọn bên phải.
- Mở rộng modal Planner và cho Duration nhận phút tùy ý, chỉ ép tối thiểu 5 phút.
- Thêm Event Timeline với track, zoom, snap, action, reminder, checklist, note và alert.
- Thêm Strict Quick Planner để tạo kế hoạch bằng text, có validation và preview xác nhận.
- Chuẩn hóa action launcher theo registry cục bộ và quyền Tauri rõ ràng.
- Làm rõ Session Template là cấu hình tái sử dụng cho Session thủ công.
- Loại placeholder trong Reports; số liệu chỉ đến từ Session đã hoàn thành.
- Đồng bộ switch, button, spacing, bề mặt không trong suốt và token theme.
- Mở rộng theme fantasy, maple, sakura và galaxy.
- Tách từng effect thành module riêng để debug và bảo trì độc lập.
- Giảm tải GPU bằng FPS/render scale thích ứng, cache sprite/texture, primitive vẽ nhẹ hơn, dừng khi tab nền và giảm blur khi effect hoạt động.
- Loại bỏ Companion, wake word, widget cũ, alias editor và asset không còn nằm trong luồng sản phẩm.

Xem [CHANGELOG.md](./CHANGELOG.md) để đọc tóm tắt theo phiên bản.

## Dữ liệu và quyền riêng tư

ChronoFlow hoạt động local-first. Schedule, Planner, Session, template, action, theme và tùy chọn widget được lưu trên thiết bị. Bản production hiện tại không có AI Companion hay bộ nhớ đám mây và không yêu cầu đăng nhập.

Trước khi cài lại hoặc chuyển máy, vào **Settings → Data / Backup** để xuất bản sao lưu. Dùng chức năng import để phục hồi dữ liệu được hỗ trợ.

## Dành cho nhà phát triển

### Yêu cầu

- Node.js 22 LTS trở lên
- pnpm 10
- Rust stable qua [rustup](https://rustup.rs/)
- Microsoft C++ Build Tools và WebView2 trên Windows

### Cài và chạy

```bash
git clone https://github.com/Enriah/ChronoFlow.git
cd ChronoFlow
pnpm install
pnpm tauri dev
```

### Kiểm tra và đóng gói

```bash
pnpm lint
pnpm build
cargo check --manifest-path src-tauri/Cargo.toml
pnpm tauri build
```

File cài đặt Windows được tạo tại:

```text
src-tauri/target/release/bundle/msi/
src-tauri/target/release/bundle/nsis/
```

## Cấu trúc chính

```text
src/
  components/               UI và settings dùng chung
  core/                     State/domain của Session
  features/
    developer-actions/      Registry action được cho phép
    event-timeline/         Editor và runtime của timeline
    quick-planner/          Parser text cục bộ và preview
    schedule/               EventTrack của hôm nay
    sessions/               Editor và timer runtime
    session-templates/      Template cho Session thủ công
  models/                   Model TypeScript cần được lưu
  services/                 Audio, persistence, scheduler, action, widget
  store/                    Zustand stores
  themes/                   Cấu hình theme và provider
  visual-engine/            Canvas renderer và module effect riêng
  widgets/                  Planner, timeline và floating widget
src-tauri/
  capabilities/             Quyền Tauri v2
  src/                      Native command bằng Rust
.github/workflows/          Quy trình build GitHub Release
```

## Tạo release

Workflow `release.yml` tự build bộ cài Windows và xuất bản GitHub Release khi push tag phiên bản:

```bash
git tag -a v0.1.0 -m "ChronoFlow 0.1.0"
git push origin v0.1.0
```

Tag cần đồng bộ với phiên bản trong `src-tauri/tauri.conf.json`. Không commit trực tiếp `.exe` hoặc `.msi` vào Git.

## Giấy phép

ChronoFlow được phát hành theo [MIT License](./LICENSE).
