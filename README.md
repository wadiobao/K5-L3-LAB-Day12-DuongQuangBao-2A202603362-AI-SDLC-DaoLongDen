# Day 12 — AI SDLC: Đảo Đèn Lồng (Lantern Island)

> **Cá nhân:** Dương Quang Bảo — MSSV: 2A202603362  
> **Demo Video:** [Đang cập nhật trước hạn chốt Release v1.0.0]  
> **Test Contract Version:** v1.0 (Headless Runner hỗ trợ 60Hz deterministic simulation)

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

- **W / A / S / D** (hoặc Phím Mũi Tên): Di chuyển nhân vật Mây trên Đảo Bến.
- **E** hoặc **Space**: Tương tác nạp đom đóm vào Đèn Lồng Lớn (khi đứng trong bán kính $3.0\text{m}$).
- **F**: Kích hoạt kỹ năng **Tỏa Sáng (Pulse)** để làm choáng và đẩy lùi Bóng Mực (tiêu tốn 1 đom đóm).

---

## 3. Hệ Thống Điểm Số & Luật Chơi

- **Mục tiêu**: Thắp sáng toàn bộ 5 Đèn Lồng Lớn trên Đảo Bến trước khi trời rạng đông (300 giây) và bảo vệ 3 ngọn lửa sinh mệnh.
- **Cơ chế điểm số**:
  - Nhặt 1 đom đóm: `+10` điểm.
  - Thắp sáng 1 Đèn Lồng Lớn (nạp đủ 5 đom đóm): `+200` điểm.
  - Làm choáng 1 Bóng Mực bằng Tỏa Sáng: `+50` điểm.
  - Thắng game: Thưởng `+5` điểm / giây còn lại và `+100` điểm / ngọn lửa còn lại.
- **Thua game**: Khi mất hết 3 ngọn lửa (bị Bóng Mực chạm 3 lần) hoặc hết thời gian 300 giây.

---

## 4. Kiểm Thử Tự Động & Chế Độ Headless (Test Contract v1.0)

Game hỗ trợ chế độ chạy không giao diện (headless) với tần số 60 tick/giây theo đúng chuẩn Test Contract v1.0:

```bash
# Chạy headless kịch bản cơ bản
pnpm headless --seed 42 --night 1 --ticks 180 --out docs/proof/phase-1/run_basic.jsonl --snapshot-every 60

# Chạy headless kèm file kịch bản (scenario) và file input
pnpm headless --seed 42 --night 1 --scenario tests/scenarios/case1_scenario.json --inputs tests/scenarios/case1_inputs.json --ticks 120 --out docs/proof/phase-1/run_scenario.jsonl

# Chạy toàn bộ bộ kiểm thử tự động
pnpm test

# Chạy quy trình xác thực toàn diện và xuất báo cáo kiểm chứng
pnpm verify

# Đo lường hiệu năng Core Simulation Engine
npx tsx scripts/benchmark.ts
```

---

## 5. Sáng Tạo Của Tôi (Rubric Hạng mục F)

Tuân thủ nghiêm ngặt quy định không làm biến đổi output của Headless Test Contract, các tính năng sáng tạo độc đáo được triển khai ở tầng hiển thị WebGL:
1. **Đèn lồng nón lá của Mây phát quang động**: Chiếc lồng đèn nhỏ treo dưới nón lá của Mây tự động tăng độ sáng phát quang và chuyển đổi sắc thái từ vàng ấm ($0$ đom đóm) sang cam rực rỡ ($10$ đom đóm) khi Mây gom đầy túi đom đóm.
2. **Hệ thống âm thanh Procedural Web Audio**: Tự động tổng hợp âm thanh chuông gió khi nhặt đom đóm, tiếng chuông đồng trầm khi thắp đèn và sóng âm khi tỏa sáng trực tiếp bằng Web Audio API, 100% không sử dụng file ngoài và không vướng bản quyền.
3. **Tối ưu hóa GPU InstancedMesh**: Toàn bộ đom đóm bay lượn trên đảo được gom vào 1 InstancedMesh duy nhất, cắt giảm draw calls từ 50+ xuống còn đúng 1 lệnh vẽ GPU.

---

## 6. Cấu Trúc Tài Liệu & Bằng Chứng

- **Harness Guidelines**: [AGENTS.md](AGENTS.md)
- **Thông số Test Contract**: [game.contract.json](game.contract.json)
- **Ma trận Truy vết Yêu cầu**: [docs/notes/traceability-matrix.md](docs/notes/traceability-matrix.md)
- **Giả định Thiết kế**: [docs/notes/phase-1-assumptions.md](docs/notes/phase-1-assumptions.md)
- **Nhật ký Sử dụng AI & Chi phí Token**: [docs/notes/ai-log.md](docs/notes/ai-log.md)
- **Bằng chứng Kiểm chứng Phase 1**: Thư mục `docs/proof/phase-1/`
