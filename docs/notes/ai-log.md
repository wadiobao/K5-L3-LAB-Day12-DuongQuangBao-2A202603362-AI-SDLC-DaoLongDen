# AI Usage Log & Token Cost Tracking — Phase 2

## 1. Nhật Ký Tiến Trình SDLC — Phase 2 (Ticket-02)
- **Giai đoạn**: Mở rộng 3 Đêm, chuẩn hóa số liệu bắt buộc, cài đặt vật lý Nhảy/Lướt, bục nhảy, rơi vực, Gió Lạc và Bùa Gió theo Test Contract v1.1.
- **Mô hình AI sử dụng**: Gemini 3.8 Flash (Medium) & Claude Opus 5.5.
- **Harness áp dụng**:
  - `3d-games`: Toán học dốc nghiêng $Y(r)$, giải thuật bục nhảy quán tính, camera damping.
  - `three-best-practices`: InstancedMesh, cấu trúc không sinh rác bộ nhớ.

## 2. Ước Tính Token & Chi Phí
| Phase | Lượt tương tác (Turns) | Input Tokens ước tính | Output Tokens ước tính | Chi phí ước tính (USD) |
|---|---|---|---|---|
| **Phase 1 (PRD-0)** | 8 turns | ~42,000 | ~7,500 | ~$0.025 |
| **Phase 2 (Ticket-02)**| 5 turns | ~35,000 | ~6,500 | ~$0.021 |
| **Phase 3 (Ticket-03)**| 3 turns | ~28,000 | ~7,200 | ~$0.020 |
| **Tổng cộng** | 16 turns | ~105,000 | ~21,200 | ~$0.066 |

### Biện pháp tiết kiệm Token đã áp dụng:
1. **Module hóa địa hình (`src/core/terrain.ts`)**: Tách biệt logic hình học 3 Đêm ra khỏi engine, giúp code ngắn gọn, dễ debug và giảm context size khi kiểm thử.
2. **Strict Step Ordering**: Sắp xếp 12 bước tuần tự ngay từ đầu giúp giải quyết dứt điểm các lỗi logic tương tác trong 1 lần chạy test.

## 3. Nhật Ký Lỗi & Tinh Chỉnh Harness
- **Lỗi 1 (Phase 2 initial)**: Bất đồng bộ thứ tự giảm bộ đếm `dashCooldownTicks` và `charmTicks` trong cùng tick kích hoạt $\rightarrow$ Đã đồng bộ rõ: Bước 2 giảm bộ đếm, Bước 3/4 kích hoạt mới.
- **Lỗi 2 (Phát hiện qua Self-Audit)**: Bóng Mực sinh tại tick 300 kẹt ở `spawning` và chưa phát `shade_spawned` $\rightarrow$ Thêm `spawnTicks` chuyển sang `wander` ở tick sau và phát `shade_spawned`.
- **Lỗi 3 (Phát hiện qua Self-Audit)**: Cộng `+10` điểm tại `mote_picked` thay vì `deposit` $\rightarrow$ Chuyển `+10 * depositAmount` sang Bước 5 (`deposit`).
- **Lỗi 4 (Phát hiện qua Self-Audit)**: Xung đột biến `pushTicks` giữa Vùng an toàn (Bước 6) và Đẩy lùi Tỏa Sáng (Bước 8) làm bóng chỉ bị đẩy `3.533m` thay vì `4.0m` $\rightarrow$ Tách riêng `safePushTicks` và `pulsePushTicks`.
- **Lỗi 5 (Phát hiện qua Self-Audit)**: Lướt trên không vẫn chịu trọng lực làm lệch độ cao `Y` $\rightarrow$ Đặt `vel[1] = 0` và bỏ qua trọng lực khi `dashTicks > 0`.
- **Lỗi 6 (Phát hiện qua Self-Audit)**: Edge-trigger `pause` bị bounce khi giữ `pause: true` 2 tick liên tiếp $\rightarrow$ Cập nhật `lastInput.pause` trước khi return sớm ở trạng thái `paused`.
- **Lỗi 7 (Phát hiện qua Self-Audit)**: Tầng 3D (`src/main.ts`, `index.html`) chưa được đồng bộ từ Phase 1 lên Phase 2 $\rightarrow$ Đã nâng cấp đầy đủ 3 Đêm, bảng màu chuẩn PRD-1, HUD 10 ô, Pause/Settings, Drifters, Charms, Jump Pads và VRAM disposal.
