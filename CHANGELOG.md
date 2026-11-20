# CHANGELOG — Đảo Đèn Lồng

## [1.0.0 / Phase 4] — TICKET-04: "Bình minh: phát hành v1.0.0" (Contract v1.3)
### Added
- **Test Contract v1.3**: Cập nhật `game.contract.json` với `run_cmd` (`pnpm play`), `bench_cmd` (`pnpm bench`), `soak_cmd` (`pnpm soak`).
- **Chế độ Benchmark 3D (`pnpm bench`)**: Tự động mở cửa sổ `1280×720` tắt VSync (`--disable-gpu-vsync --disable-frame-rate-limit`), dựng cảnh chuẩn Đêm 1 (tắt hiệu ứng sáng tạo thêm, 200 Bóng Mực `wander` InstancedMesh, 100 đom đóm, L1–L3 sáng `fuel 100`, camera quỹ đạo $R=30\text{m}, Y=15\text{m}$ ngược chiều kim đồng hồ 15s/vòng, 3s khởi động + đo `--duration`), xuất báo cáo chuẩn `bench.json`.
- **Soak Test Headless (`pnpm soak`)**: Chạy 10 Đêm liên tiếp xoay vòng Đêm 1 → 2 → 3 với seed `7 + i`, input ngẫu nhiên xác định theo seed, theo dõi crash và tăng trưởng bộ nhớ RSS (`mem_end_mb <= 1.2 × mem_start_mb`), xuất `soak.json`.
- **Bảng xếp hạng cục bộ (Local Leaderboard)**: Lưu Top 10 ra đĩa (`data/leaderboard.json`) kèm kiểm tra tên `3–12` ký tự (ASCII + tiếng Việt có dấu), tổng điểm chiến dịch, `nights_won`, `achieved_at` chuẩn ISO-8601 có múi giờ, `seed`; hỗ trợ xuất qua `pnpm play --export-leaderboard <out.json>` và màn hình xem từ Menu chính.
- **Dễ tiếp cận (Accessibility)**:
  - Đổi phím toàn diện 9 hành động + phát hiện trùng phím + nút "Khôi phục mặc định" (lưu `localStorage`).
  - Phụ đề & chỉ báo hình ảnh: Bóng Mực xuất hiện + mũi tên mép màn hình, cảnh báo gió sắp thổi (2s trước), đếm ngược 10 giây cuối, cảnh báo đèn `fuel < 30`.
  - Tùy chọn **Giảm chuyển động (Reduce Motion)** tắt rung camera & hiệu ứng chớp.
  - Cỡ chữ UI tối thiểu `18px` tại `1280×720` + tùy chọn **Chữ lớn (×1.25)**.
- **Quần đảo 3 Đêm liên thông trực quan**: Hiển thị đồng thời Đảo Bến ↔ Đảo Cau ↔ Đảo Chuông nối với nhau qua cổng Tam Quan và cầu treo đèn lồng vượt biển mây (`addConnectedArchipelago`), kèm hiệu ứng camera lướt dọc cầu khi sang Đêm 2/3 và thanh tiến trình 3 đảo trên HUD (tự động tắt trong benchmark/soak, không thay đổi luật Test Contract v1.3).
- **Nâng cấp đồ họa & hoạt ảnh 3D**: PBR CanvasTextures (`src/render/textures.ts`), GLSL Sky Dome & Volumetric Cloud Sea + Particle Burst (`src/render/shaders.ts`), nhân vật Mây nhiều khớp kèm khăn bay 3 đốt, đèn lồng mái chùa 4 tua rua, tia hút dầu Bóng Mực, UnrealBloomPass post-processing.
- **Tài liệu phát hành**: Hoàn thiện `README.md`, `CREDITS.md`, `LICENSE`, `docs/notes/retro.md` và bằng chứng `docs/proof/phase-4/`.

---

## [Phase 3] — TICKET-03: "Đèn cạn dầu" (Contract v1.2)
### Breaking Changes (`[THAY THẾ]`)
- **Test Contract**: Nâng cấp từ `v1.1` lên `v1.2`.
- **Nhiên liệu đèn (Lantern Fuel)**: Đèn có `fuel` (`0..100`, lưu số nguyên `1/60`), tự hao `1.0/s`, tắt khi `fuel <= 0` (`lantern_out`). Cho phép châm dầu (`refuel`, `+10` fuel/đom đóm, bỏ qua đèn đầy). Đèn đã từng sáng (`ever_lit`) thắp lại tốn `5` đom đóm (`+40` điểm).
- **Vùng an toàn & Bóng Mực hút dầu (`drain`)**: Đèn có `fuel < 30` mất vùng an toàn 6m. Bóng Mực `wander` chủ động tới hút `5 fuel/s` (cộng dồn), phát `fuel_drain` mỗi 60 tick.
- **Luật thắng mới**: Bỏ thắng sớm `all_lit`. Rút ngắn thời lượng Đêm 1/2/3 xuống `240s / 270s / 300s`. Thắng khi sống tới bình minh với $\ge \lceil 0.6 \times \text{tổng đèn} \rceil$ đèn đang sáng (`dawn_survived`).
- **Công thức điểm mới**: `+5`/đom đóm nạp, `+100` thắp lần đầu, `+40` thắp lại, `+15` Tỏa Sáng trúng Bóng Mực đang `drain` (`+5` thường), thưởng bình minh `+50 + floor(fuel)` mỗi đèn sáng và `+50` mỗi Ngọn Lửa.

### Added
- **Sức chứa tăng dần**: `capacity = min(20, 10 + 2 * successful_lights)` đặt lại đầu mỗi Đêm.
- **Chế độ mù màu ("Bảng màu dễ phân biệt")**: Đổi Bóng Mực sang `#00B3FF`, cảnh báo `#FFFFFF` + `⚠`, đèn tắt xẹp 20% có vết rách và thanh dầu 3D nhấp nháy 1 Hz khi `< 30`.
- **Tài liệu**: Bổ sung [ADR-001](docs/notes/adr-001-lantern-fuel-and-win-rule.md).

---

## [Phase 2] — TICKET-02: "Ba hòn đảo" (Contract v1.1)
- Mở rộng thành 3 Đêm (Đảo Bến $R=40\text{m}$, Đảo Cau 2 đảo + cầu tre + bục nhảy, Đảo Chuông 3 tầng + dốc + gió).
- Bổ sung Nhảy, Lướt (Dash), rơi vực $Y < -10$, Gió Lạc (Drifter), Bùa Gió (Charm), Pause/Resume, HUD đầy đủ và bảng màu chuẩn.

## [Phase 1] — PRD-0 (Contract v1.0)
- Bản chơi được Đêm 1, kiến trúc Decoupled Core Engine 60Hz, Headless CLI v1.0, Three.js View, âm thanh procedural Web Audio.
