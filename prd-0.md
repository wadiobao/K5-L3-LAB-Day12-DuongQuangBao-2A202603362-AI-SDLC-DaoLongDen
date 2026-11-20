PRD-0 · Đảo Đèn Lồng
Bản mô tả đầu tiên từ khách hàng. Phần yêu cầu cố ý ở mức tổng quát. Phần Test Contract v1.0 ở cuối là bắt buộc và chính xác, vì bài của các bạn sẽ được chạy và chấm tự động.

Tag nộp: phase-1
Contract v1.0
Khoảng 60 phút
Đúng yêu cầu > phức tạp
1Chúng tôi muốn gì
Chúng tôi muốn một game 3D tên là Đảo Đèn Lồng.

Người chơi điều khiển Mây, người giữ đèn nhỏ tuổi của một hòn đảo giữa biển mây. Đêm nay sương đen đã nuốt hết ánh sáng của đảo. Mây phải chạy khắp đảo thu thập những đốm sáng (đom đóm) rồi mang về thắp lại các Đèn Lồng Lớn.

Trong bóng tối có Bóng Mực, những sinh vật bằng mực đen sống trong sương. Chúng đuổi theo Mây; bị chúng chạm vào thì mất máu. Mây có thể tỏa sáng để xua chúng đi, nhưng việc đó tốn ánh sáng. Bóng Mực sợ những chiếc đèn.

Thắp hết đèn thì thắng. Mất hết máu thì thua. Có điểm số.

2Phạm vi Phase 1
Một màn chơi: Đêm 1 – Đảo Bến, một hòn đảo tròn có 5 Đèn Lồng Lớn.
Nhân vật đi lại, nhảy, camera 3D.
Đom đóm xuất hiện rải rác trên đảo, nhặt được.
Nạp ánh sáng vào đèn để thắp đèn.
Bóng Mực xuất hiện và đuổi người chơi.
Tỏa sáng để xua Bóng Mực.
Thắng, thua, điểm số, giao diện hiển thị thông tin cần thiết (HUD).
Có thể chơi lại sau khi thắng hoặc thua.
3Cảm giác & phong cách
Không khí đêm, ấm áp, cổ tích
Đảo sáng dần lên khi thắp đèn
Ánh sáng vàng cam ấm là thứ tốt
Màu tím đen là nguy hiểm
Phong cách đồ họa đơn giản nhưng đẹp. Không cần đồ họa chân thực.
Mây đội nón lá có treo một chiếc đèn lồng nhỏ.
Không bạo lực, không máu me.
Tự do sáng tạo (khuyến khích)
PRD-0 chỉ là khung. Ngoài những gì đã nêu, bạn được tự do sáng tạo thêm: nhân vật phụ, loại Bóng Mực hay đom đóm khác nhau, cơ chế nhỏ, sự kiện bất ngờ, câu chuyện, hiệu ứng, âm thanh, cách thể hiện ánh sáng, chi tiết trên đảo. Hãy làm cho game mang dấu ấn của bạn.

Không phá những gì PRD-0 và Test Contract đã yêu cầu. Phần thêm không được làm đổi đầu ra headless theo contract (ví dụ thực thể thêm nên tắt khi chạy headless).
Nói rõ trong README (một mục ngắn "Sáng tạo của tôi") bạn đã thêm gì, và có bằng chứng ngắn rằng phần cũ vẫn đúng.
Làm lõi đúng trước, sáng tạo sau, và cân nhắc token: một ý sáng tạo nhỏ, gọn, chạy đúng hơn nhiều ý dở dang.
4Không bắt buộc công nghệ
Bạn được tự chọn engine, ngôn ngữ và framework. Game phải chạy được trên laptop (macOS hoặc Linux; nếu bạn dùng Windows thì phải có cách chạy trên macOS/Linux cho giảng viên, ví dụ Docker hoặc bản web).

5Bàn giao Phase 1
Nộp bằng tag git phase-1 trên repo public.

Game chơi được Đêm 1 từ đầu tới thắng/thua.
README.md: cách cài đặt và chạy (tối đa 3 lệnh), điều khiển, cách tính điểm của bạn.
game.contract.json và chế độ headless theo Test Contract v1.0 dưới đây.
Bằng chứng game chạy đúng yêu cầu, cùng ghi chép ngắn (giả định, nhật ký dùng AI). Định dạng tự chọn.
Harness AI bạn đã dùng (AGENTS.md hoặc tương đương, skills, hooks…).
6Lưu ý
Game tốt là game đúng yêu cầu của khách hàng, không phải game phức tạp hay đẹp nhất.
Cân nhắc kỹ quota token. Đốt nhiều token không làm bài tốt hơn.
Không có bằng chứng thì chưa xong. "Agent bảo chạy rồi" không phải bằng chứng.
Chỗ PRD-0 còn mơ hồ: tự giả định hợp lý và ghi lại.
Sáng tạo thêm được khuyến khích, nhưng không được làm hỏng phần lõi và Test Contract.
Bắt buộc
Test Contract v1.0
Mọi bài nộp phải có một chế độ chạy không giao diện (headless) để giảng viên chạy kiểm thử tự động, bất kể công nghệ.

A. File game.contract.json ở gốc repo
{
  "contract_version": "1.0",
  "team": "mssv-ho-ten",
  "build_cmd": "lệnh cài đặt/biên dịch",
  "run_cmd": "lệnh mở game có giao diện",
  "headless_cmd": "lệnh chạy headless (sẽ được nối thêm tham số)",
  "tuning": {
    "player_speed": 0,
    "carry_capacity": 0,
    "lantern_cost": 0,
    "lantern_count_night1": 5,
    "pickup_radius": 0,
    "interact_radius": 0,
    "pulse_cost": 0,
    "pulse_radius": 0,
    "night1_duration_s": 0,
    "flames": 0,
    "invuln_s": 0,
    "hit_drop_ratio": 0,
    "pulse_stun_s": 0,
    "pulse_push_m": 0,
    "pulse_cooldown_s": 0,
    "safe_radius": 0,
    "shade_speed": 0,
    "shade_hit_radius": 0,
    "fall_enabled": false,
    "score": { "per_mote": 0, "per_lantern": 0, "per_stun": 0,
               "per_second_left": 0, "per_flame_left": 0 }
  }
}
tuning: bạn điền đúng các số mà game của bạn đang dùng. Nếu game không có khái niệm đó, điền null (hoặc false) và giải thích trong README. Bài test Phase 1 sinh tình huống dựa trên các số này, nên khai sai sẽ làm trượt test.
Ý nghĩa: hit_drop_ratio là tỉ lệ đom đóm đánh rơi khi bị chạm (0 nếu không rơi); safe_radius là bán kính quanh đèn mà Bóng Mực không vào được; fall_enabled cho biết rơi khỏi đảo có bị phạt hay không; score.* là điểm cho mỗi sự kiện.
Lệnh phải chạy được trên macOS/Linux sau build_cmd. Docker được phép.
B. Tham số headless
<headless_cmd> --seed <int> --night 1 [--scenario <file.json>] [--inputs <file.json>]
               --ticks <int> --out <file.jsonl> [--snapshot-every <int, mặc định 10>]
Logic game chạy ở 60 tick/giây cố định (1 tick = 1/60 giây), không cần cửa sổ, không cần GPU, nhanh nhất có thể.
Dừng khi chạy đủ --ticks hoặc khi game kết thúc (thắng/thua). Thoát với mã 0.
Lỗi → mã thoát khác 0, thông báo lỗi ra stderr. File inputs/scenario sai định dạng → mã thoát 2.
Đơn vị độ dài là mét; trục Y hướng lên; mặt đất đảo ở Y = 0; người chơi xuất phát tại (0, 0, 0).
Mô hình tick (để mọi bài đếm giống nhau)
Snapshot tick 0 là trạng thái sau khi dựng scenario, trước khi áp dụng input.
Bước thứ k (k = 0 … N−1) đọc input của tick k và tạo ra trạng thái k+1. Sự kiện xảy ra trong bước đó ghi tick = k+1. --ticks N thực hiện đúng N bước.
time_left_s = thời lượng Đêm − (số bước đã chạy) / 60.
Quy ước vị trí
player.pos là chân nhân vật; shade.pos là tâm Bóng Mực; lantern.pos là chân cột đèn; vị trí đom đóm là điểm trên mặt đất (độ cao lơ lửng chỉ là hiển thị).
Mọi khoảng cách trong tuning đo giữa các điểm này, theo mặt phẳng ngang XZ, không cộng thêm kích thước nhân vật. "Trong bán kính r" nghĩa là khoảng cách ≤ r.
C. File inputs
{
  "frames": [
    { "tick": 0,   "move": [0, 1], "cam_yaw_deg": 0 },
    { "tick": 120, "move": [0, 0], "interact": true },
    { "tick": 121, "interact": false },
    { "tick": 200, "pulse": true },
    { "tick": 201, "pulse": false }
  ]
}
Giá trị mặc định trước frame đầu tiên: move [0,0], cam_yaw_deg 0, mọi nút false.
Mỗi frame chỉ đổi các trường có mặt trong frame đó; trường vắng mặt giữ giá trị cũ.
tick của các frame phải tăng nghiêm ngặt (không trùng, không giảm).
move: [x, z], mỗi thành phần trong [−1, 1]. Với θ = cam_yaw_deg đổi sang radian, hướng di chuyển trong thế giới là x' = x·cosθ + z·sinθ, z' = −x·sinθ + z·cosθ (khi θ = 0 thì x là +X, z là +Z). Vector dài hơn 1 phải được chuẩn hóa về độ dài 1.
jump, interact, pulse (và dash nếu có): boolean, hành động kích hoạt khi giá trị chuyển từ false sang true.
Không có file inputs nghĩa là người chơi đứng yên.
D. File scenario (dựng tình huống cho test)
{
  "player": { "pos": [0, 0, 0], "carried": 0, "flames": 3 },
  "random_motes": false,
  "random_shades": false,
  "motes": [[0, 0, 5]],
  "shades": [{ "pos": [10, 0, 0] }],
  "lanterns": [{ "id": "L1", "pos": [0, 0, 25], "deposited": 0 }],
  "time_left_s": 300
}
random_motes: false: không tự sinh đom đóm, chỉ có những con được liệt kê.
random_shades: false: không tự sinh Bóng Mực, chỉ có những con được liệt kê (ở trạng thái hoạt động bình thường ngay lập tức).
lanterns: cập nhật theo id các đèn của màn (L1…L5). Đèn không được nhắc tới giữ nguyên; có pos thì đổi vị trí; có thể đặt lit: true.
motes, shades: thay thế danh sách ban đầu tương ứng; mảng rỗng nghĩa là không có con nào. shades[] có thể kèm id để test tham chiếu.
Trường nào không có thì dùng mặc định của game.
Dựng scenario không phát sự kiện và không cộng điểm (ví dụ đèn đặt sẵn lit: true không được cộng điểm thắp đèn).
E. Output JSONL
Mỗi dòng là một đối tượng JSON, gồm ba loại.

Snapshot, mỗi --snapshot-every tick, bắt đầu từ tick 0:

{"type":"snapshot","tick":120,"sim_tick":120,"state":"playing","time_left_s":298.0,"score":20,
 "player":{"pos":[0.0,0.0,12.0],"flames":3,"carried":2},
 "lanterns":[{"id":"L1","pos":[0,0,25],"lit":false,"deposited":0}],
 "shades":[{"id":"S1","pos":[30.1,1.0,2.0],"state":"chase"}],
 "motes_active":19}
Event, ghi ngay khi sự kiện xảy ra. Ví dụ: {"type":"event","tick":131,"name":"mote_picked","data":{"carried":3}}

name	data
mote_picked	{"carried": n}
deposit	{"lantern_id": "L1", "amount": n, "deposited": n}
lantern_lit	{"lantern_id": "L1"}
pulse	{"stunned_ids": ["S1"]}
player_hit	{"by": "shade" | "fall", "flames": n, "dropped": n}
shade_spawned	{"id": "S3"}
game_over	{"result": "won" | "lost", "reason": "all_lit" | "dawn" | "no_flames"}
End, dòng cuối cùng và bắt buộc: {"type":"end","ticks":4800,"state":"won","score":1730}

state thuộc playing, won, lost. Trạng thái Bóng Mực tối thiểu phải có stunned; các trạng thái khác do bạn đặt tên.
Tọa độ làm tròn 3 chữ số thập phân.
Tính tất định: cùng --seed, cùng scenario và cùng inputs phải cho output giống hệt nhau giữa hai lần chạy, kể cả các id tự sinh. Các bạn không cần sinh cùng chuỗi ngẫu nhiên với nhau.
sim_tick là số bước gameplay đã chạy (ở Phase 1 bằng tick).
Mảng motes (mỗi phần tử id, pos) trong snapshot là khuyến nghị ở v1.0.
Nếu một sự kiện không xảy ra trong game của bạn (ví dụ không có rơi khỏi đảo) thì không ghi sự kiện đó.
