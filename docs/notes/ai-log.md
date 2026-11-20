# AI Usage Log & Token Cost Tracking — Phase 1

## 1. Nhật Ký Tiến Trình SDLC & Can Thiệp AI
- **Giai đoạn**: Khởi tạo kiến trúc, thiết lập Harness, Core Simulation Engine và Three.js Interactive View.
- **Mô hình AI sử dụng**: Gemini 3.8 Flash (Medium) & Claude Opus 5.5.
- **Kỹ năng Harness tích hợp**:
  - `3d-games` (Kiến trúc & Toán học Game 3D).
  - `three-best-practices` (Tối ưu hóa Three.js WebGL & VRAM).

## 2. Ước Tính Token & Chi Phí
| Phase | Lượt tương tác (Turns) | Input Tokens ước tính | Output Tokens ước tính | Chi phí ước tính (USD) |
|---|---|---|---|---|
| **Phase 1 (PRD-0)** | 8 turns | ~42,000 | ~7,500 | ~$0.025 |

### Biện pháp tiết kiệm Token đã áp dụng:
1. **Thiết kế trước khi code**: Định nghĩa schema và tuning một lần trong `game.contract.json` giúp giảm thiểu việc chỉnh sửa lặp lại.
2. **Batch Operations**: Chạy song song các thao tác ghi file, kiểm thử và sinh bằng chứng trong cùng một turn.
3. **Decoupled Architecture**: Phân tách triệt để Core Engine giúp việc viết test không phải nạp context của thư viện đồ họa Three.js.

## 3. Nhật Ký Lỗi & Hiệu Chỉnh Harness
- **Lỗi phát hiện**: Tránh hiện tượng non-determinism khi sinh vị trí thực thể.
- **Hiệu chỉnh**: Cài đặt lớp `PRNG` (Mulberry32) nhận `--seed` trực tiếp từ CLI, bảo đảm 100% tính tất định giữa các lần chạy độc lập.
