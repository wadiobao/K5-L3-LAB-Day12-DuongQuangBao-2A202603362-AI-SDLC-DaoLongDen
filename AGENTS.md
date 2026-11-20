# AGENTS.md — Quy Chuẩn & Harness Dự Án Đảo Đèn Lồng (v1.0.0 / Contract v1.3)

## 1. Thông Tin Dự Án
- **Tên dự án**: Đảo Đèn Lồng (Lantern Island)
- **Tác giả**: Dương Quang Bảo (MSSV: 2A202603362)
- **Trạng thái**: Phase 4 — Phát hành `v1.0.0`, Test Contract `v1.3`.

---

## 2. Lệnh Build, Chạy & Kiểm Thử Chuẩn
- **Cài đặt dependencies**: `pnpm install`
- **Biên dịch**: `pnpm build`
- **Khởi chạy Game Web 3D & API Bảng xếp hạng**: `pnpm play`
- **Xuất Bảng xếp hạng**: `pnpm play --export-leaderboard <out.json>`
- **Chạy Headless Test Contract v1.3**:
  ```bash
  pnpm headless --seed <int> --night <1|2|3> [--scenario <file.json>] [--inputs <file.json>] --ticks <int> --out <file.jsonl> [--snapshot-every <int>]
  ```
- **Chạy Benchmark 3D 1280×720**: `pnpm bench --seed 42 --duration 30 --out bench.json`
- **Chạy Soak Test Headless 10 Đêm**: `pnpm soak --seed 7 --nights 10 --out soak.json`
- **Chạy kiểm thử tự động**: `pnpm test`
- **Chạy xác thực & xuất bằng chứng**: `pnpm verify`

---

## 3. Kiến Trúc Decoupled & 12 Bước Xử Lý Tick
- **`src/core/terrain.ts`**: Hình học địa hình 3 Đêm (Đảo Bến $R=40\text{m}$, Đảo Cau $R=28\text{m}$ nối cầu tre & 2 bục nhảy, Đảo Chuông 3 tầng $Y=0,3,6\text{m}$ & 2 dốc nghiêng).
- **`src/core/leaderboard.ts`**: Chuẩn hóa kiểm tra tên (3–12 ký tự), sắp xếp Top 10, định dạng ISO-8601 có múi giờ.
- **`src/core/engine.ts`**: Không phụ thuộc Three.js/DOM, xác định 100% theo PRNG, tuân thủ nghiêm ngặt 12 bước tuần tự:
  1. Đọc input & Pause $\rightarrow$
  2. Giảm bộ đếm (TTL, Cooldowns, Invuln) & Trừ nhiên liệu đèn (`1/60` tự hao + `5/60` bị `drain`), tắt đèn `fuel <= 0` (`lantern_out`) $\rightarrow$
  3. Di chuyển Mây (Nhảy, Lướt, Bục nhảy, Gió, Rơi vực $Y < -10$) $\rightarrow$
  4. Nhặt đom đóm (theo `capacity`) & Bùa Gió $\rightarrow$
  5. Tương tác nạp / châm dầu / thắp lại Đèn Lồng $\rightarrow$
  6. Vùng an toàn 6m (chỉ khi `lit && fuel >= 30`) đẩy quái $\rightarrow$
  7. Tỏa Sáng (`+15` khi trúng `drain`, `+5` thường) $\rightarrow$
  8. Di chuyển Bóng Mực (`wander`/`chase`/`drain`/`recoil`/`stunned`) & Gió Lạc $\rightarrow$
  9. Va chạm (Gió Lạc cướp trước, Bóng Mực gây hit sau) $\rightarrow$
  10. Sinh thực thể theo lịch $\rightarrow$
  11. Xét Thắng (`dawn_survived` khi hết giờ với $\ge 60\%$ đèn sáng) / Thua $\rightarrow$
  12. Ghi Snapshot.

---

## 4. Định Tuyến Kỹ Năng (Dual-Skill Harness)
- **Kiến trúc Game 3D & Toán học Camera**: Áp dụng `.agents/skills/3d-games/SKILL.md`.
- **Hiệu năng WebGL, VRAM Disposal & InstancedMesh**: Áp dụng `.agents/skills/three-best-practices/SKILL.md`.

---

## 5. Quy Ước Bắt Buộc
- **Mã lỗi**: File scenario/inputs sai format $\rightarrow$ thoát mã `2`. Hoàn thành bình thường $\rightarrow$ thoát mã `0`.
- **Trạng thái Bóng Mực**: Bắt buộc dùng đúng 6 từ khóa: `spawning`, `wander`, `chase`, `drain`, `recoil`, `stunned`.
- **Cảnh Benchmark**: Tắt hoàn toàn yếu tố sáng tạo thêm để mọi bài đo công bằng trên cảnh chuẩn Đêm 1 (200 Bóng Mực, 100 đom đóm, L1–L3 sáng).
- **Bảo mật**: Không bao giờ commit `.env`, API key hoặc thông tin nhạy cảm.
