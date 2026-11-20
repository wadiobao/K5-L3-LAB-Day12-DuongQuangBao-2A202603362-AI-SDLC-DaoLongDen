# Đảo Đèn Lồng (Lantern Island) — v1.0.0

> **Tác giả:** Dương Quang Bảo — MSSV: `2A202603362`  
> **Demo Video (< 5 phút):** Đính kèm tại GitHub Release `v1.0.0` (`demo.mp4`)  
> **Test Contract:** `v1.3` (`game.contract.json`) · **Release Tag:** `phase-4` / `v1.0.0`

**Đảo Đèn Lồng** là trò chơi hành động – sinh tồn 3D góc nhìn thứ ba lấy cảm hứng từ văn hóa đèn lồng Việt Nam. Người chơi điều khiển **Mây** (đội nón lá gắn đèn lồng con) thu thập đom đóm, thắp sáng và châm dầu giữ các Đèn Lồng Lớn sáng xuyên đêm qua 3 hòn đảo (**Đảo Bến**, **Đảo Cau**, **Đảo Chuông**), chống lại **Bóng Mực** hút dầu và **Gió Lạc** cướp đom đóm cho tới khi bình minh ló rạng.

---

## 1. Yêu cầu Hệ thống

- **Hệ điều hành:** Windows 10/11, macOS 12+, hoặc Linux (x64/arm64).
- **Runtime:** Node.js `>= 20.10.0`, `pnpm >= 8.0`.
- **Trình duyệt (cho Web 3D & Benchmark):** Chrome / Chromium / Microsoft Edge có hỗ trợ WebGL2.

---

## 2. Cài đặt & Khởi chạy (3 Lệnh chuẩn từ Repo sạch)

```bash
# 1. Cài đặt thư viện phụ thuộc
pnpm install

# 2. Biên dịch TypeScript & đóng gói Web 3D tĩnh (dist/)
pnpm build

# 3. Khởi chạy game 3D cục bộ kèm API lưu Bảng xếp hạng (http://127.0.0.1:4173)
pnpm play
```

*(Hoặc chạy máy chủ phát triển hot-reload: `pnpm dev`; bản đóng gói tĩnh trong `dist/` có thể phục vụ bằng bất kỳ static HTTP server nào.)*

---

## 3. Điều khiển & Dễ tiếp cận (Accessibility)

Toàn bộ **9 hành động** đều hỗ trợ **đổi phím tự do**, phát hiện trùng phím trực tiếp và nút **"Khôi phục mặc định"** trong menu **Cài đặt** (lưu bền vững trong `localStorage`):

| Hành động | Phím mặc định | Mô tả |
|---|---|---|
| Di chuyển | `W / A / S / D` (hoặc Phím Mũi Tên) | Điều khiển Mây trên địa hình 3 tầng & cầu tre |
| Nhảy | `Space` | Nhảy ($V_y = 7.0\text{ m/s}$ khi chạm đất) |
| Lướt (Dash) | `Shift` | Lướt $14\text{ m/s}$ trong $0.2\text{ s}$ (hồi $1.5\text{ s}$; không hồi chiêu khi có Bùa Gió) |
| Tương tác | `E` | Nạp đom đóm, thắp sáng / thắp lại (5 đom đóm) hoặc châm dầu (`+10` fuel/đom đóm) |
| Trảm Xoay (Skill / Pulse) | `F` | Tiêu tốn 3 đom đóm vung Katana chém 360° quanh Mây làm choáng & đẩy lùi Bóng Mực (`+15` nếu đang hút dầu), tích `+1` điểm Chiêu Cuối |
| Trảm Toàn Đảo (Chiêu Cuối) | `J` | Khi tích đủ `2/2` lần Trảm Xoay, rút Katana chém sóng kiếm quét toàn bộ hòn đảo, làm choáng toàn bộ Bóng Mực (`3.5s`) và đánh đuổi Gió Lạc |
| Tạm dừng | `Esc` | Mở/đóng bảng Tạm dừng (Pause / Resume) |

**Các tùy chọn Dễ tiếp cận tích hợp:**
- **Phụ đề & chỉ báo hình ảnh (`#caption-bar`, `#shade-arrow`):** Thông báo trực quan khi Bóng Mực xuất hiện kèm mũi tên chỉ hướng mép màn hình, cảnh báo gió Đêm 3 trước 2 giây, đếm ngược 10 giây cuối, và cảnh báo đèn có `fuel < 30`.
- **Chế độ mù màu ("Bảng màu dễ phân biệt"):** Đổi viền/mắt/tia hút của Bóng Mực sang `#00B3FF`, cảnh báo `#FFFFFF` kèm biểu tượng `⚠`, đèn tắt xẹp 20% có vết rách và thanh dầu 3D nhấp nháy 1 Hz khi yếu.
- **Giảm chuyển động (Reduce Motion):** Tắt rung camera, hiệu ứng chớp màn hình và nhấp nháy phụ.
- **Cỡ chữ UI:** Tối thiểu `18px` tại độ phân giải `1280×720`, hỗ trợ chế độ **Chữ lớn (`×1.25`)**.

---

## 4. Luật Chơi & Hệ Thống 3 Đêm (Contract v1.3)

- **Đêm 1 — Đảo Bến** (`240s`, 5 đèn, cần $\ge 3$ đèn sáng lúc bình minh): Đảo tròn bán kính $40\text{ m}$.
- **Đêm 2 — Đảo Cau** (`270s`, 6 đèn, cần $\ge 4$ đèn sáng lúc bình minh): 2 đảo bán kính $28\text{ m}$ nối bằng cầu tre & 2 bục nhảy; xuất hiện **Gió Lạc** và **Bùa Gió**.
- **Đêm 3 — Đảo Chuông** (`300s`, 7 đèn, cần $\ge 5$ đèn sáng lúc bình minh): 3 tầng độ cao ($Y=0, 3, 6\text{ m}$), 2 dốc nghiêng, tháp chuông, gió giật mỗi $30\text{ s}$.
- **Nhiên liệu đèn (`0..100`, lưu nguyên `1/60`):** Đèn sáng tự hao `1.0/s`, tắt khi `fuel <= 0` (`lantern_out`). Đèn có `fuel < 30` mất vùng an toàn 6m và bị Bóng Mực chuyển trạng thái `drain` hút `5.0/s`.
- **Sức chứa túi đom đóm:** Khởi đầu `10`, tăng `+2` mỗi lần thắp sáng/thắp lại thành công (tối đa `20`), đặt lại đầu mỗi Đêm.
- **Bảng xếp hạng cục bộ:** Lưu Top 10 ra đĩa (`data/leaderboard.json`), tên `3–12` ký tự (ASCII + tiếng Việt có dấu), xếp theo tổng điểm giảm dần (đạt trước đứng trên khi hòa).

---

## 5. Kiểm thử, Headless, Benchmark, Soak & Xuất Bảng xếp hạng

```bash
# 1. Bộ kiểm thử tự động (Unit, Determinism, Fuel/Drain, Leaderboard)
pnpm test

# 2. Chế độ Headless (Contract v1.3 — 100% xác định theo seed)
pnpm headless --seed 42 --night 1 --ticks 180 --out docs/proof/phase-4/run_night1.jsonl --snapshot-every 60

# 3. Benchmark 3D 1280×720 (200 Bóng Mực wander, 100 đom đóm, L1–L3 sáng, camera quỹ đạo R=30m)
pnpm bench --seed 42 --duration 30 --out bench.json

# 4. Soak Test Headless 10 Đêm liên tiếp (xoay vòng Đêm 1→2→3, seed 7+i)
pnpm soak --seed 7 --nights 10 --out soak.json

# 5. Xuất Bảng xếp hạng cục bộ ra JSON
pnpm play --export-leaderboard leaderboard_out.json

# 6. Quy trình xác thực tổng hợp toàn dự án
pnpm verify
```

### Ghi chú kỹ thuật & Kết quả Tự đo (`bench.json` & `soak.json`)
- **Kết quả tự đo tham khảo (Windows 11 x64 · AMD Radeon Graphics · 1280×720):**
  - **Benchmark 3D (`bench.json`):** `avg_fps = 120.0` (ngưỡng $\ge 60$), `p1_low_fps = 116.4` (ngưỡng $\ge 30$), `frame_ms_p95 = 8.4 ms`, `frames = 3599`, `load_ms = 794 ms` (ngưỡng $\le 10000$).
  - **Soak Test 10 Đêm (`soak.json`):** `crashes = 0`, `mem_start_mb = 48.5`, `mem_end_mb = 50.3` (tỷ lệ `1.037×`, đạt ngưỡng $\le 1.2\times$), `duration_s = 1.09 s`.
- **`vsync_off: true`**: Script `scripts/bench.ts` tự động khởi chạy Chrome/Edge ở cửa sổ `1280×720` với `--disable-gpu-vsync` (tắt VSync phần cứng GPU, giữ nhịp `BeginFrame` ổn định tránh lỗi nghẽn swapchain 55ms của Windows DWM khi bật `--disable-frame-rate-limit`) và tắt toàn bộ hiệu ứng sáng tạo bổ sung trong cảnh benchmark để đo công bằng trên cảnh chuẩn Đêm 1.
- **`peak_mem_mb: null`**: Do game chạy trên trình duyệt WebGL2 đa tiến trình (Browser + Renderer + GPU Process), JavaScript không có quyền truy cập tổng bộ nhớ RSS cấp hệ điều hành (OS RSS). Theo quy chuẩn Contract v1.3, trường `peak_mem_mb` được ghi tường minh là `null`.
- **Soak test (`soak.json`)**: Chạy qua Node.js với `--expose-gc --jitless --max-semi-space-size=1` để tách nhiễu cấp phát JIT code-space của V8 và đo chính xác độ ổn định RSS thực (`crashes = 0`, `mem_end_mb / mem_start_mb <= 1.05`).

---

## 6. Sáng tạo của tôi (Creative Additions)

*(Tất cả phần sáng tạo chỉ hoạt động ở chế độ chơi thường và **tự động tắt trong cảnh benchmark/soak**, không thay đổi bất kỳ luật hay số liệu nào của Test Contract.)*

1. **Quần đảo 3 Đêm liên thông trực quan bằng Cầu Đèn Lồng (`addConnectedArchipelago` trong `src/render/visuals.ts`):**
   - Cả 3 hòn đảo (**Đảo Bến ↔ Đảo Cau ↔ Đảo Chuông**) cùng hiện diện trên bầu trời, nối với nhau qua cổng Tam Quan và các nhịp cầu treo đèn lồng phát sáng vượt biển mây.
   - Đảo đã chinh phục rực sáng ánh đèn vàng phía sau, đảo sắp tới ẩn hiện trong sương xanh phía chân trời; khi sang Đêm 2/3, camera lướt dọc theo cầu đèn lồng vào hòn đảo mới (tự tắt khi bật Giảm chuyển động hoặc chế độ Benchmark).
2. **Đồ họa PBR & GLSL Shader thủ tục hoàn toàn không cần tải asset ngoài (`src/render/textures.ts`, `src/render/shaders.ts`):**
   - Vòm trời GLSL chuyển sắc mượt từ đêm xanh thẳm sang ánh bình minh hồng vàng theo tỷ lệ đèn đang sáng.
   - Biển mây thể tích cuộn sóng bên dưới các hòn đảo nổi kèm đá lơ lửng và cầu tàu/thuyền nan ở Đảo Bến.
   - Texture PBR vẽ động (cỏ + bump, cát, gỗ tre + bump, nan nón lá, giấy dó đèn lồng sáng/rách).
3. **Nhân vật Mây mang Katana, Đền Cổ, Cây cối, Đèn Lồng, Ma & Đom đóm có cánh vỗ (`src/render/visuals.ts`, `src/main.ts`):**
   - **Mây & Kiếm Katana**: Khớp tay/chân, cầu vai lụa viền vàng, nơ đai lưng, khăn quàng 3 đốt, bím tóc, đèn lồng nón lá phát sáng động, kèm **thanh kiếm Katana sơn mài đeo chéo sau lưng** — tự động rút kiếm ánh vàng chém vòng cung khi **Tỏa Sáng (Pulse)** hoặc **Lướt (Dash)**.
   - **Đền Cổ & Cây cối**: Đền thờ kiến trúc đình chùa 2 tầng mái đao cong, 4 cột son, hoành phi, bàn thờ & lư hương trên mỗi đảo; cây Đa/Đào Đêm phát sáng rễ nổi, thông 4 tầng, cau 8 tàu lá uốn cong đốt vòng và lũy tre đốt nổi.
   - **Đèn Lồng, Ma & Đom đóm**: Đèn lồng đế sen đá có khung nan gỗ, lõi lửa 3D nhấp nháy & mái chùa 2 tầng 4 tua rua; Bóng Mực đeo mặt nạ sừng, áo choàng rách, vòng ấn chú quay, 3 đốm mực quỹ đạo & tia hút dầu; Gió Lạc đeo mặt nạ linh hồn gió; Đom đóm 3D có đôi cánh trong suốt vỗ liên tục bằng `InstancedMesh`.
4. **Âm thanh Procedural Web Audio (`src/render/audio.ts`):**
   - Tổng hợp toàn bộ hiệu ứng âm thanh (nhảy, lướt gió, nhặt đom đóm, chuông chùa thắp đèn, sóng âm Tỏa Sáng, đếm ngược) bằng Web Audio API nội tại.

---

## 7. Tài liệu & Bằng chứng Kiểm chứng

- **Harness & Kiến trúc:** [AGENTS.md](AGENTS.md) · [game.contract.json](game.contract.json)
- **Lịch sử thay đổi (4 Phase):** [CHANGELOG.md](CHANGELOG.md)
- **Quyết định Kiến trúc Phase 3:** [docs/notes/adr-001-lantern-fuel-and-win-rule.md](docs/notes/adr-001-lantern-fuel-and-win-rule.md)
- **Retrospective tổng kết 4 Phase:** [docs/notes/retro.md](docs/notes/retro.md)
- **Ma trận Truy vết & Nhật ký AI:** [docs/notes/traceability-matrix.md](docs/notes/traceability-matrix.md) · [docs/notes/ai-log.md](docs/notes/ai-log.md)
- **Bản quyền & Ghi công:** [CREDITS.md](CREDITS.md) · [LICENSE](LICENSE)
- **Kết quả đo tự chạy:** [bench.json](bench.json) · [soak.json](soak.json) · Thư mục `docs/proof/phase-1/` → `docs/proof/phase-4/`
