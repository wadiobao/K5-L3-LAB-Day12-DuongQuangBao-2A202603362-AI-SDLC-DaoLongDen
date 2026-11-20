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
| **Tổng cộng** | 13 turns | ~77,000 | ~14,000 | ~$0.046 |

### Biện pháp tiết kiệm Token đã áp dụng:
1. **Module hóa địa hình (`src/core/terrain.ts`)**: Tách biệt logic hình học 3 Đêm ra khỏi engine, giúp code ngắn gọn, dễ debug và giảm context size khi kiểm thử.
2. **Strict Step Ordering**: Sắp xếp 12 bước tuần tự ngay từ đầu giúp giải quyết dứt điểm các lỗi logic tương tác trong 1 lần chạy test.

## 3. Nhật Ký Lỗi & Tinh Chỉnh Harness
- **Lỗi phát hiện**: Bất đồng bộ thứ tự giảm bộ đếm `dashCooldownTicks` và `charmTicks` trong cùng tick kích hoạt.
- **Tinh chỉnh**: Khẳng định quy tắc: Các bộ đếm giảm ở Bước 2, trong khi hành động kích hoạt ở Bước 3 và Bước 4; giá trị snapshot cuối tick phản ánh chính xác sau khi đã kích hoạt.
