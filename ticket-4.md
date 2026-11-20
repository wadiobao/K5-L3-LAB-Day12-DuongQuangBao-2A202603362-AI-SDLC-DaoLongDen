TICKET-04 — "Bình minh: phát hành v1.0.0" (Phase 4)
Loại: Non-functional + Release · Ưu tiên: Cao · Tag nộp: phase-4 + GitHub Release v1.0.0 · Contract: v1.3

Mục tiêu
Đưa game từ "chạy được" thành sản phẩm phát hành được: đo được hiệu năng, ổn định khi chạy lâu, có bảng xếp hạng, dễ tiếp cận, cài đặt dễ dàng. Mọi yêu cầu dưới đây đều có số đo cụ thể và được chấm tự động hoặc theo checklist.

Về sáng tạo: phần sáng tạo của bạn vẫn được giữ, miễn là luật, số liệu và Test Contract không bị đổi và đầu ra headless không đổi. Trong cảnh benchmark và soak test, nhân vật, kẻ địch và hiệu ứng sáng tạo thêm phải tắt (hoặc không ảnh hưởng số đo), để mọi bài được đo trên cùng một cảnh chuẩn.

1. Chế độ benchmark (bắt buộc)
Lệnh: <bench_cmd> --seed 42 --duration 30 --out bench.json

Cảnh benchmark (mọi bài giống nhau):

Mở cửa sổ 1280×720, không toàn màn hình; tắt vsync nếu engine cho phép (ghi rõ trong README nếu không tắt được).
Tải Đêm 1 với đầy đủ hiệu ứng và ánh sáng như lúc chơi thật.
Sinh đúng 200 Bóng Mực ở trạng thái wander, rải đều trên đảo (seed 42), và đúng 100 đom đóm (bench được phép vượt trần của gameplay). 3 đèn L1–L3 đang sáng với fuel 100.
Trong cảnh bench tắt: sinh thêm thực thể, sát thương, nhặt đom đóm, hao dầu và điều kiện kết thúc Đêm. Bóng Mực vẫn di chuyển theo luật wander bình thường.
Không có input người chơi. Mây đứng yên tại (0,0,0). Camera bay vòng tròn tâm (0,0,0), bán kính 30 m, ở độ cao Y = 15 m, luôn nhìn vào (0,0,0), xuất phát ở góc 0° (điểm (30,15,0)), quay ngược chiều kim đồng hồ khi nhìn từ trên xuống, 15 s một vòng.
3 s đầu là khởi động (không đo). Sau đó đo đúng --duration giây rồi tự thoát với mã 0.
Output bench.json:

{
  "contract_version": "1.3",
  "avg_fps": 87.3,
  "p1_low_fps": 52.1,
  "frame_ms_p95": 14.2,
  "frames": 2619,
  "load_ms": 2400,
  "peak_mem_mb": 512,
  "vsync_off": true,
  "renderer": "mô tả engine/renderer và phiên bản",
  "os": "tự điền"
}
Trường	Định nghĩa
frames	Số khung hình N trong khoảng đo
avg_fps	1000 × N / Σ dt_i, với dt_i là thời gian từng khung (ms)
p1_low_fps	k = max(1, ceil(0.01 × N)); lấy k giá trị dt lớn nhất; p1_low_fps = 1000 / trung bình của k giá trị đó
frame_ms_p95	Phân vị 95 của dt (ms)
load_ms	Từ lúc tiến trình bắt đầu tới khung hình đầu tiên của cảnh bench
peak_mem_mb	Bộ nhớ tiến trình (RSS) cao nhất trong lúc đo; ghi null nếu là bản web không đo được và giải thích
Ngưỡng đạt, đo trên máy chấm của giảng viên: avg_fps ≥ 60 · p1_low_fps ≥ 30 · load_ms ≤ 10000.

Máy chấm: giảng viên sẽ công bố cấu hình (CPU, GPU, RAM, hệ điều hành, chế độ nguồn) trước khi đo. Mọi bài được đo trên cùng máy này; số bạn tự đo chỉ để tham khảo.

2. Soak test (bắt buộc)
Lệnh: <soak_cmd> --seed 7 --nights 10 --out soak.json

Chạy headless 10 Đêm liên tiếp trong cùng một tiến trình (Đêm 1 → 2 → 3 xoay vòng), Đêm thứ i dùng seed 7 + i, mỗi Đêm chạy tới khi kết thúc hoặc hết thời lượng chuẩn. Input ngẫu nhiên theo seed: mỗi 30 tick chọn lại hướng di chuyển; mỗi tick xác suất 5% nhảy, 3% lướt, 2% tỏa sáng, 10% tương tác.
mem_start_mb: bộ nhớ tiến trình (RSS) sau khi tải xong Đêm đầu tiên. mem_end_mb: RSS sau khi reset xong Đêm cuối cùng.
Output:
{"nights": 10, "crashes": 0, "results": ["lost","won","lost"],
 "mem_start_mb": 120, "mem_end_mb": 131, "duration_s": 84.2}
Ngưỡng đạt: crashes = 0 và mem_end_mb ≤ 1.2 × mem_start_mb.
3. Bảng xếp hạng cục bộ
Sau màn hình Bình Minh (thắng Đêm 3) hoặc sau khi thua ở bất kỳ Đêm nào, cho nhập tên để lưu điểm.
Tên: 3–12 ký tự [A-Za-z0-9_]. Hỗ trợ tiếng Việt có dấu là điểm cộng, không bắt buộc.
Mỗi mục lưu: name, score (tổng điểm các Đêm đã thắng), nights_won (0–3), achieved_at (ISO 8601 có múi giờ), seed.
Giữ top 10. Sắp xếp theo score giảm dần; bằng điểm thì ai đạt trước đứng trên.
Lưu trên đĩa cục bộ, vẫn còn sau khi tắt và mở lại game.
Có màn hình Bảng xếp hạng từ menu chính.
Lệnh xuất: <run_cmd> --export-leaderboard out.json cho ra {"entries": [ ... ]} đúng thứ tự.
4. Dễ tiếp cận (accessibility)
Yêu cầu	Chi tiết
Đổi phím	Mọi hành động: di chuyển (4 hướng), nhảy, lướt, tương tác, tỏa sáng, tạm dừng. Phát hiện trùng phím và báo cho người dùng. Có nút "Khôi phục mặc định". Được lưu
Phụ đề / chỉ báo hình ảnh	Bóng Mực xuất hiện (kèm mũi tên chỉ hướng ở mép màn hình), gió sắp thổi, 10 s cuối, đèn có fuel < 30
Giảm chuyển động	Tắt rung camera và hiệu ứng chớp màn hình
Cỡ chữ UI	Tối thiểu 18 px ở 1280×720; tùy chọn chữ lớn (×1.25)
5. Đóng gói & tài liệu
Clone repo sạch → làm theo README tối đa 3 lệnh → chơi được. Giảng viên sẽ thử trên máy sạch.
README.md có: mô tả ngắn, ảnh chụp hoặc GIF, yêu cầu hệ thống, cài đặt, điều khiển, cách chạy test, headless, bench, soak.
CHANGELOG.md có mục cho cả 4 phase. CREDITS.md liệt kê mọi asset, âm thanh và công cụ AI tạo nội dung. Có LICENSE.
GitHub Release v1.0.0 có bản chạy được: file thực thi, thư mục web tĩnh hoặc Docker image kèm hướng dẫn.
6. Test Contract v1.3
contract_version: "1.3".
game.contract.json thêm bench_cmd và soak_cmd.
Mọi yêu cầu của v1.0–v1.2 vẫn giữ nguyên.
7. Retro & demo
Bản retro (1–2 trang, tên và vị trí tự chọn): tổng hợp Evaluation của 4 phase; điều gì hiệu quả hoặc không hiệu quả khi làm với AI; những lần AI sai và cách bạn phát hiện; harness nào (AGENTS.md, skill, hook) giúp nhiều nhất; tổng token/chi phí AI ước tính và bạn đã tiết kiệm token thế nào; nếu làm lại thì đổi gì.
Video demo .mp4 dưới 5 phút (đính kèm Release v1.0.0 hoặc docs/demo/demo.mp4): chơi trực tiếp một đoạn, cho thấy bằng chứng game chạy đúng (test, headless, bench).
Định nghĩa hoàn thành (DoD)
Có bằng chứng game chạy đúng các yêu cầu của phase (định dạng tự chọn).
Tag phase-4 và Release v1.0.0.
bench.json và soak.json do bạn tự chạy được commit vào repo.
Mọi test ẩn Phase 1–3 còn hiệu lực vẫn đạt.
Repo public, có đủ harness AI và tài liệu theo quy định nộp bài.
