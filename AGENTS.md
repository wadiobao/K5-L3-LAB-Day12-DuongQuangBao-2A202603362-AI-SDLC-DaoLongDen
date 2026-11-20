# AGENTS.md — Quy Chuẩn & Harness Dự Án Đảo Đèn Lồng (Phase 2 / Contract v1.1)

## 1. Thông Tin Dự Án
- **Tên dự án**: Đảo Đèn Lồng (Lantern Island)
- **Tác giả**: Dương Quang Bảo (MSSV: 2A202603362)
- **Trạng thái**: Phase 3 — TICKET-03: "Đèn cạn dầu", Test Contract v1.2.

---

## 2. Lệnh Build & Chạy Chuẩn (Tối đa 3 lệnh)
- **Cài đặt dependencies**: `pnpm install`
- **Biên dịch**: `pnpm build`
- **Khởi chạy Web 3D**: `pnpm preview` (hoặc `pnpm dev`)
- **Chạy Headless Test Contract v1.1**:
  ```bash
  pnpm headless --seed <int> --night <1|2|3> [--scenario <file.json>] [--inputs <file.json>] --ticks <int> --out <file.jsonl> [--snapshot-every <int>]
  ```
- **Chạy kiểm thử tự động**: `pnpm test`
- **Chạy xác thực & xuất bằng chứng**: `pnpm verify`

---

## 3. Kiến Trúc Decoupled & 12 Bước Xử Lý Tick
- **`src/core/terrain.ts`**: Hệ thống hình học địa hình 3 Đêm (Đảo Bến $R=40\text{m}$, Đảo Cau $R=28\text{m}$ nối cầu tre và bục nhảy, Đảo Chuông 3 tầng $Y=0,3,6\text{m}$ và dốc nghiêng).
- **`src/core/engine.ts`**: Tuân thủ nghiêm ngặt 12 bước tuần tự:
  1. Đọc input & Pause $\rightarrow$
  2. Giảm bộ đếm (TTL, Cooldowns, Invuln) $\rightarrow$
  3. Di chuyển Mây (Nhảy, Lướt, Bục nhảy, Gió, Rơi vực $Y < -10$) $\rightarrow$
  4. Nhặt đom đóm & Bùa Gió $\rightarrow$
  5. Tương tác nạp Đèn Lồng $\rightarrow$
  6. Vùng an toàn 6m đẩy quái $\rightarrow$
  7. Tỏa Sáng $\rightarrow$
  8. Di chuyển Bóng Mực & Gió Lạc $\rightarrow$
  9. Va chạm (Gió Lạc cướp trước, Bóng Mực gây hit sau) $\rightarrow$
  10. Sinh thực thể theo lịch $\rightarrow$
  11. Xét Thắng/Thua $\rightarrow$
  12. Ghi Snapshot.

---

## 4. Định Tuyến Kỹ Năng (Dual-Skill Harness)
- **Kiến trúc Game 3D & Toán học Camera**: Áp dụng `.agents/skills/3d-games/SKILL.md`.
- **Hiệu năng WebGL, VRAM Disposal & InstancedMesh**: Áp dụng `.agents/skills/three-best-practices/SKILL.md`.

---

## 5. Quy Ước Bắt Buộc
- **Mã lỗi**: File scenario/inputs sai format $\rightarrow$ thoát mã `2`. Hoàn thành bình thường $\rightarrow$ thoát mã `0`.
- **Trạng thái Bóng Mực**: Bắt buộc dùng đúng 6 từ khóa: `spawning`, `wander`, `chase`, `drain`, `recoil`, `stunned`.
- **Không bao giờ commit credentials**: `.env`, API key.
