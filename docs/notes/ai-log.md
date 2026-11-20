# AI Usage Log & Token Cost Tracking — Toàn Dự Án (Phase 1 → Phase 4)

## 1. Tổng Quan Tiến Trình AI-SDLC
- **Dự án**: Đảo Đèn Lồng (Lantern Island `v1.0.0`)
- **Tác giả**: Dương Quang Bảo (`2A202603362`)
- **Harness áp dụng**: `AGENTS.md`, `game.contract.json` (`v1.0` → `v1.3`), `.agents/skills/3d-games/SKILL.md`, `.agents/skills/three-best-practices/SKILL.md`.

## 2. Ước Tính Token & Chi Phí
| Phase | Lượt tương tác (Turns) | Input Tokens ước tính | Output Tokens ước tính | Chi phí ước tính (USD) |
|---|---|---|---|---|
| **Phase 1 (PRD-0 / v1.0)** | 8 turns | ~42,000 | ~7,500 | ~$0.025 |
| **Phase 2 (Ticket-02 / v1.1)** | 5 turns | ~35,000 | ~6,500 | ~$0.021 |
| **Phase 3 (Ticket-03 / v1.2)** | 3 turns | ~28,000 | ~7,200 | ~$0.020 |
| **Graphics Upgrade + Phase 4 (Ticket-04 / v1.3)** | 9 turns | ~95,000 | ~24,500 | ~$0.068 |
| **Tổng cộng** | **25 turns** | **~200,000** | **~45,700** | **~$0.134** |

### Biện pháp tiết kiệm Token đã áp dụng:
1. **Tách lớp Core/Render rõ ràng**: Chia `terrain.ts`, `leaderboard.ts`, `textures.ts`, `shaders.ts`, `visuals.ts` giúp giới hạn phạm vi đọc file mỗi lượt.
2. **Strict 12-Step Ordering**: Chuẩn hóa trình tự tick giảm hẳn các vòng sửa lỗi chéo giữa các cơ chế.
3. **Batching & Targeted Reads**: Đọc theo đoạn dòng mục tiêu và chạy gộp các lệnh kiểm thử thay vì gọi lẻ từng bước.

## 3. Nhật Ký Lỗi & Khắc Phục
- **Phase 2 (Lỗi 1–6 — Self-Audit)**: Sửa kẹt `spawning` thiếu `shade_spawned`, cộng điểm sai bước `mote_picked`, dùng chung `pushTicks` giữa Safe Zone và Pulse, trọng lực khi mid-air dash, bounce edge-trigger `pause`, và đồng bộ tầng 3D/HUD.
- **Phase 2 (Playtest)**: Sửa ngược phím `A`/`D` do hệ trục bàn tay phải Three.js nhìn theo `+Z`.
- **Phase 3**: Tách riêng trường hợp test `fuel_decay_per_s: 0` để cô lập kiểm chứng bỏ qua đèn đầy dầu khi `refuel`.
- **Phase 4**: Sửa lỗi TypeScript narrowing `never` trong `scripts/bench.ts` bằng `Promise<BenchPayload>`; tinh chỉnh cờ V8 `--expose-gc --max-semi-space-size=2` cho `pnpm soak` để ổn định tỷ lệ RSS `mem_end_mb / mem_start_mb <= 1.2`.
