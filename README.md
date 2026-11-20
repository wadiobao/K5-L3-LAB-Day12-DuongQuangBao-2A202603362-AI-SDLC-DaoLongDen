# Day 12 — AI SDLC: Đảo Đèn Lồng (Lantern Island)

> **Cá nhân:** Dương Quang Bảo — MSSV: 2A202603362  
> **Demo Video:** [Đang cập nhật trước hạn chốt Release v1.0.0]  
> **Test Contract Version:** v1.1 (Hỗ trợ 3 Đêm, Nhảy/Lướt, Gió Lạc, Bùa Gió)

---

## 1. Cài đặt & Khởi chạy (Tối đa 3 lệnh)

Game chạy được trên mọi nền tảng (macOS, Linux, Windows):

```bash
# 1. Cài đặt thư viện phụ thuộc
pnpm install

# 2. Biên dịch mã nguồn
pnpm build

# 3. Khởi chạy game có giao diện Web 3D
pnpm preview
```
*(Hoặc chạy trực tiếp môi trường phát triển: `pnpm dev`)*

---

## 2. Điều Khiển Game (Controls)

- **W / A / S / D** (hoặc Phím Mũi Tên): Di chuyển nhân vật Mây.
- **Space**: Nhảy ($V_y = 7.0\text{ m/s}$, chỉ nhảy khi chạm đất).
- **Shift** (hoặc **J**): Lướt (Dash: tốc độ $14\text{ m/s}$ trong $0.2\text{ s}$, hồi chiêu $1.5\text{ s}$).
- **E**: Tương tác nạp đom đóm vào Đèn Lồng Lớn (trong bán kính $2.0\text{ m}$).
- **F**: Kích hoạt **Tỏa Sáng (Pulse)** làm choáng Bóng Mực và đẩy lùi (tiêu tốn 3 đom đóm, hồi chiêu $3.0\text{ s}$).
- **Esc** hoặc **P**: Tạm dừng game (Pause / Resume).

---

## 3. Hệ Thống 3 Đêm & Luật Chơi Chuẩn Hóa

- **Đêm 1 — Đảo Bến**: Đảo tròn bán kính $40\text{ m}$, 5 Đèn Lồng Lớn. Ngoài 40m là biển mây (rơi vực).
- **Đêm 2 — Đảo Cau**: 2 hòn đảo tròn bán kính $28\text{ m}$ nối bằng cầu tre không lan can và 2 bục nhảy ($V_y = 14\text{ m/s}, V_{\text{ngang}} = 24\text{ m/s}$). Xuất hiện **Gió Lạc** (bay 7m/s cướp đom đóm) và **Bùa Gió** (tăng tốc 7.2m/s, lướt không hồi chiêu).
- **Đêm 3 — Đảo Chuông**: Đảo 3 tầng cao độ ($Y=0, 3, 6\text{m}$), 2 dốc nghiêng $30^\circ$ và $150^\circ$, 1 bục nhảy lên tháp chuông, và gió giật 30s một lần.
- **Rơi khỏi đảo ($Y < -10$)**: Mất 1 ngọn lửa, rơi toàn bộ đom đóm, chờ 60 ticks rồi hồi sinh tại tâm đảo với 90 ticks bất tử.
- **Cơ chế điểm số chuẩn hóa**:
  - `+10` mỗi đom đóm nạp vào đèn.
  - `+100` mỗi Đèn Lồng được thắp sáng.
  - `+5` mỗi Bóng Mực trúng Tỏa Sáng.
  - Thắng: Thưởng `+ floor(giây còn lại) × 2` và `+ 50 × Ngọn Lửa còn lại`.

---

## 4. Chế Độ Headless (Test Contract v1.1)

```bash
# Chạy headless Đêm 1
pnpm headless --seed 42 --night 1 --ticks 180 --out docs/proof/phase-2/run_night1.jsonl --snapshot-every 60

# Chạy headless Đêm 2
pnpm headless --seed 42 --night 2 --ticks 180 --out docs/proof/phase-2/run_night2.jsonl --snapshot-every 60

# Chạy headless Đêm 3
pnpm headless --seed 42 --night 3 --ticks 180 --out docs/proof/phase-2/run_night3.jsonl --snapshot-every 60

# Chạy toàn bộ bộ kiểm thử tự động
pnpm test

# Chạy quy trình xác thực toàn diện
pnpm verify
```

---

## 5. Sáng Tạo Của Tôi (Rubric Hạng mục F)

1. **Đèn lồng nón lá của Mây phát quang động**: Đèn lồng nón lá của Mây thay đổi độ sáng và sắc thái màu từ vàng sang cam rực rỡ theo số đom đóm mang theo.
2. **Hệ thống âm thanh Procedural Web Audio**: Tự động tổng hợp âm thanh chuông gió, tiếng chuông chùa khi thắp đèn, tiếng sóng âm khi tỏa sáng, tiếng gió rít khi lướt (dash) hoàn toàn bằng Web Audio API nội tại.
3. **InstancedMesh GPU Optimization**: Gom toàn bộ đom đóm vào 1 draw call duy nhất.

---

## 6. Cấu Trúc Tài Liệu & Bằng Chứng

- **Harness Guidelines**: [AGENTS.md](AGENTS.md)
- **Thông số Test Contract v1.1**: [game.contract.json](game.contract.json)
- **Ma trận Truy vết Yêu cầu**: [docs/notes/traceability-matrix.md](docs/notes/traceability-matrix.md)
- **Giả định Thiết kế Phase 2**: [docs/notes/phase-2-assumptions.md](docs/notes/phase-2-assumptions.md)
- **Nhật ký Sử dụng AI & Chi phí Token**: [docs/notes/ai-log.md](docs/notes/ai-log.md)
- **Bằng chứng Kiểm chứng Phase 2**: Thư mục `docs/proof/phase-2/`
