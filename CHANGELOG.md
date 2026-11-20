# CHANGELOG — Đảo Đèn Lồng

## [Phase 3] — TICKET-03: "Đèn cạn dầu" (Contract v1.2)
### Breaking Changes (`[THAY THẾ]`)
- **Test Contract**: Nâng cấp từ `v1.1` lên `v1.2`.
- **Nhiên liệu đèn (Lantern Fuel)**: Đèn sáng không còn sáng vĩnh viễn. Đèn có `fuel` (`0..100`), tự hao `1.0/s`, tắt khi `fuel <= 0` (`lantern_out`). Cho phép châm dầu (`refuel`) khi đèn sáng chưa đầy dầu (`+10` fuel/đom đóm). Đèn đã từng sáng (`ever_lit`) thắp lại chỉ tốn `5` đom đóm.
- **Vùng an toàn & Bóng Mực hút dầu (`drain`)**: Đèn có `fuel < 30` mất vùng an toàn 6m. Bóng Mực ở trạng thái `wander` chủ động tới đèn yếu và chuyển `drain` hút `5 fuel/s` (cộng dồn nhiều con), phát sự kiện `fuel_drain` mỗi 60 tick.
- **Luật thắng mới**: Bỏ thắng sớm `all_lit`. Rút ngắn thời lượng Đêm 1/2/3 xuống `240s / 270s / 300s`. Thắng khi sống tới bình minh với $\ge \lceil 0.6 \times \text{tổng đèn} \rceil$ đèn đang sáng (`dawn_survived`).
- **Công thức điểm mới**: Thay thế toàn bộ điểm cũ — `+5`/đom đóm nạp (thay vì `+10`), `+100` thắp lần đầu, `+40` thắp lại, `+15` khi Tỏa Sáng trúng Bóng Mực đang `drain` (`+5` thường), bỏ thưởng thời gian, thưởng bình minh `+50 + floor(fuel)` mỗi đèn sáng và `+50` mỗi Ngọn Lửa.

### Added
- **Sức chứa tăng dần**: `capacity = min(20, 10 + 2 * successful_lights)` đặt lại đầu mỗi Đêm.
- **Chế độ mù màu ("Bảng màu dễ phân biệt")**: Lưu trong `localStorage`; đổi viền/mắt Bóng Mực sang `#00B3FF`, cảnh báo UI sang `#FFFFFF` kèm `⚠`, đèn tắt xẹp 20% có vết rách và thanh dầu 3D nhấp nháy 1 Hz khi `< 30`.
- **Tài liệu**: Bổ sung [ADR-001](docs/notes/adr-001-lantern-fuel-and-win-rule.md).

---

## [Phase 2] — TICKET-02: "Ba hòn đảo" (Contract v1.1)
- Mở rộng thành 3 Đêm (Đảo Bến $R=40\text{m}$, Đảo Cau 2 đảo + cầu tre + bục nhảy, Đảo Chuông 3 tầng + dốc + gió).
- Bổ sung Nhảy, Lướt (Dash), rơi vực $Y < -10$, Gió Lạc (Drifter), Bùa Gió (Charm), Pause/Resume, HUD đầy đủ và bảng màu chuẩn.

## [Phase 1] — PRD-0 (Contract v1.0)
- Bản chơi được Đêm 1, kiến trúc Decoupled Core Engine 60Hz, Headless CLI v1.0, Three.js View, âm thanh procedural Web Audio.
