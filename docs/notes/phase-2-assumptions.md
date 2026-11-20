# Phase 2 Assumptions & Standardized Calibration (Ticket-02)

## 1. Bản Đồ Chuẩn 3 Đêm
- **Đêm 1 — Đảo Bến**:
  - Tâm $(0, 0, 0)$, bán kính $40\text{ m}$ (ngoài 40m là rơi vực $Y < -10$).
  - 5 Đèn Lồng: `L1(0, 0, 25)`, `L2(23.8, 0, 7.7)`, `L3(14.7, 0, -20.2)`, `L4(-14.7, 0, -20.2)`, `L5(-23.8, 0, 7.7)`.
  - Đom đóm: 20 ban đầu, trần 30, mỗi 240 ticks sinh thêm 1 con.
- **Đêm 2 — Đảo Cau**:
  - Đảo A tâm $(0,0,0)$ ($R=28\text{m}$), Đảo B tâm $(70,0,0)$ ($R=28\text{m}$).
  - Cầu tre: $x \in [26, 44], z \in [-2, 2]$.
  - Bục nhảy: $(20, 0, 18)$ phóng sang Đảo B; $(50, 0, -18)$ phóng sang Đảo A ($V_y = 14\text{ m/s}, V_{\text{ngang}} = 24\text{ m/s}$).
  - 6 Đèn Lồng: L1..L6. Bùa Gió `C1` tại $(35, 0, 0)$.
- **Đêm 3 — Đảo Chuông**:
  - Bán kính $45\text{ m}$, 3 tầng cao độ ($Y=0, 3, 6\text{m}$).
  - 2 dốc nghiêng rộng 3m tại $30^\circ$ và $150^\circ$ nối từ $R=30$ ($Y=0$) lên $R=24$ ($Y=3$).
  - Bục nhảy tại $(0, 3, 13)$ phóng lên Tầng 2 ($V_y = 12\text{ m/s}, V_z = -8\text{ m/s}$).
  - Tháp chuông ở tâm Tầng 2 ($R \le 2\text{m}, Y \in [6, 14]$) là vật cản cứng.
  - 7 Đèn Lồng: L1..L7. Bùa Gió `C1(30, 0, 25)` và `C2(-30, 0, 25)`.

## 2. Thông Số Chuẩn Hóa
- **Nhảy**: $V_y = 7.0\text{ m/s}$, trọng lực $-20\text{ m/s}^2$.
- **Lướt (Dash)**: $14.0\text{ m/s}$ trong 12 ticks ($0.2\text{s}$), hồi chiêu 90 ticks ($1.5\text{s}$).
- **Đèn Lồng**: Chi phí 10 đom đóm, tương tác trong $2.0\text{m}$, vùng an toàn $6.0\text{m}$ đẩy quái ra mép trong 30 ticks.
- **Tỏa Sáng**: Chi phí 3 đom đóm, hồi chiêu 180 ticks ($3.0\text{s}$), đẩy lùi 4m trong 15 ticks đầu, choáng 120 ticks.
- **Rơi Vực ($Y < -10$)**: $-1$ ngọn lửa, mất toàn bộ đom đóm, chờ 60 ticks rồi hồi sinh tại $(0,0,0)$ với 90 ticks bất tử.
