# ADR-001: Chuyển Đổi Mô Hình Nhiên Liệu Đèn & Luật Thắng Bình Minh (Ticket-03)

- **Trạng thái**: Accepted (Phase 3 — Contract v1.2)
- **Ngày**: 2026-11-20
- **Bối cảnh**: Playtest từ Phase 2 cho thấy người chơi có kỹ năng tốt có thể thắp sáng hết 5 đèn trong ~2 phút rồi kết thúc Đêm sớm (`all_lit`), làm mất sự căng thẳng ở nửa sau của màn chơi. TICKET-03 yêu cầu đổi cốt lõi từ *"thắp hết đèn là thắng"* sang *"giữ đảo sáng tới bình minh"* kết hợp cơ chế cạn dầu và Bóng Mực hút dầu.

## Quyết Định Thiết Kế

1. **Biểu diễn Nhiên liệu bằng Số nguyên 1/60 (`fuelSixtieths: 0..6000`)**:
   - **Vấn đề**: Trừ `1/60` (tự hao) và `5/60` (Bóng Mực hút) bằng số thực IEEE-754 qua hàng nghìn tick gây tích tụ sai số tại các ngưỡng quan trọng `30.0` (vùng an toàn) và `0.0` (tắt đèn).
   - **Quyết định**: Lưu trữ nội bộ bằng số nguyên `fuelSixtieths` (`100` fuel = `6000`). Mỗi tick trừ chính xác `1` (hao) và `5` (hút). Chỉ chia 60 và làm tròn 1 chữ số thập phân khi xuất snapshot/event.

2. **Mở Rộng State Machine Đèn & Bóng Mực**:
   - **Đèn**: Bổ sung `ever_lit` và `relit_count`. Khi `fuelSixtieths <= 0` ngay sau Bước 2, đèn tắt (`deposited = 0`, giữ `ever_lit = true`), chi phí thắp lại giảm từ `10` xuống `5`.
   - **Bóng Mực**: Thêm trạng thái `drain`. Đèn có `fuel < 30` mất vùng an toàn 6m; Bóng Mực ở `wander` tự động ưu tiên đèn yếu gần nhất và chuyển `drain` trong bán kính `2m`.

3. **Thay Thế Luật Thắng Sớm Bằng Sinh Tồn Tới Bình Minh**:
   - Loại bỏ hoàn toàn lý do kết thúc `all_lit`.
   - Tại tick kết thúc thời gian (`240s / 270s / 300s`), sau khi ưu tiên kiểm tra `no_flames`, nếu số đèn đang sáng đạt $\ge \lceil 0.6 \times \text{tổng đèn} \rceil$ (`3/5`, `4/6`, `5/7`) thì thắng với `reason: "dawn_survived"`.

4. **Khả Năng Tiếp Cận (Colorblind Mode)**:
   - Tách biệt hoàn toàn trạng thái đèn bằng hình học (đèn tắt xẹp 20% + vết rách giấy, đèn yếu nhấp nháy 1 Hz + thanh dầu 3D) kèm tùy chọn `"Bảng màu dễ phân biệt"` (`#00B3FF` cho Bóng Mực, `#FFFFFF` + `⚠` cho cảnh báo UI).

## Hệ Quả & Tương Thích
- Các bài test cũ kỳ vọng `+10` điểm/đom đóm nạp và thắng sớm `all_lit` đã được cập nhật kèm ghi chú lý do trong `tests/unit/core.test.ts`.
- Toàn bộ bài test Phase 1–2 không bị thay thế (nhảy, lướt, rơi vực, bùa gió, gió lạc, tất định) vẫn giữ nguyên và đạt 100%.
