# Retrospective — Đảo Đèn Lồng (Lantern Island v1.0.0)

**Tác giả**: Dương Quang Bảo (`2A202603362`)  
**Phạm vi**: Tổng kết 4 Phase AI-SDLC (`PRD-0` → `TICKET-02` → `TICKET-03` → `TICKET-04`, Test Contract `v1.0` → `v1.3`)

---

## 1. Tổng hợp Đánh giá (Evaluation) qua 4 Phase

| Phase | Mục tiêu chính | Contract | Kết quả Kiểm chứng | Điểm nổi bật / Rủi ro đã xử lý |
|---|---|---|---|---|
| **Phase 1** (`phase-1`) | Lõi 60Hz tách lớp (`src/core/`), Đêm 1, Headless CLI, Three.js View, Web Audio | `v1.0` | `pnpm build` xanh; Unit + Determinism pass; `docs/proof/phase-1/` | Tách hoàn toàn mô phỏng khỏi Three.js/DOM ngay từ đầu giúp mở rộng các phase sau không vỡ kiến trúc. |
| **Phase 2** (`phase-2`) | 3 Đêm (Đảo Bến / Cau / Chuông), địa hình 3 tầng + dốc + bục nhảy, Nhảy/Lướt, Gió Lạc, Bùa Gió, Pause | `v1.1` | 100% pass sau khi sửa 6 lỗi phát hiện trong Self-Audit; `docs/proof/phase-2/` | Viết thêm script tự kiểm toán 12 bước phát hiện 6 lỗi biên tiềm ẩn trước khi nộp tag. |
| **Phase 3** (`phase-3`) | Đèn cạn dầu (`fuel 0..100`, integer `1/60`), châm dầu, thắp lại (`relight`), Bóng Mực `drain`, thắng bình minh `>=60%`, Colorblind | `v1.2` | 12/12 Vitest pass; `ADR-001`; `docs/proof/phase-3/` | Dùng số nguyên `fuelSixtieths` triệt tiêu hoàn toàn sai số dấu phẩy động giữa các nền tảng OS/CPU. |
| **Phase 4** (`phase-4`, `v1.0.0`) | Benchmark 3D `1280×720`, Soak 10 Đêm, Bảng xếp hạng cục bộ + `--export-leaderboard`, Accessibility đầy đủ, Đồ họa PBR/GLSL/Bloom | `v1.3` | 15/15 Vitest pass; `soak.json` (`crashes=0`, RSS ổn định); `bench.json` đạt ngưỡng; `docs/proof/phase-4/` | Phát hiện và khắc phục V8 semi-space RSS jump trong soak test; tách cảnh benchmark chuẩn khỏi hiệu ứng sáng tạo. |

---

## 2. Điều gì Hiệu quả và Không hiệu quả khi Làm việc với AI

### Hiệu quả cao
1. **Kiến trúc Decoupled Core + Headless CLI làm nguồn sự thật (Source of Truth)**: Khi AI viết logic game trong `src/core/` thuần TypeScript không đụng DOM/WebGL, mọi luật phức tạp (dốc nghiêng $Y(r)$, bục nhảy quán tính, nhiên liệu `1/60`, trạng thái Bóng Mực) đều được xác minh tức thì bằng Vitest và JSONL snapshot trong < 1 giây.
2. **Lập kế hoạch theo Contract trước khi code**: Đọc kỹ từng mục của Ticket và đối chiếu Ma trận Truy vết (`traceability-matrix.md`) trước khi sửa code giúp AI ít bỏ sót tên sự kiện (`fuel_drain`, `lantern_out`, `dawn_survived`) và thứ tự 12 bước tick.
3. **Self-Audit chủ động bằng script kiểm tra biên**: Thay vì tin vào lần chạy xanh đầu tiên, việc yêu cầu AI tự đóng vai "Red Team" rà soát từng bước trong 12 bước tick đã lôi ra tới 6 lỗi thật ở Phase 2.

### Chưa hiệu quả / Cần kiểm soát chặt
1. **Lệch đồng bộ giữa tầng Core và tầng View 3D**: AI rất nhanh khi cập nhật `src/core/engine.ts`, nhưng nếu không nhắc rõ trong kế hoạch, tầng 3D (`src/main.ts`, `index.html`) dễ bị trễ một nhịp so với tính năng mới (ví dụ HUD Phase 2 ban đầu vẫn giữ khung Phase 1).
2. **Phím điều khiển và hệ trục 3D**: Ở góc nhìn camera hướng `+Z` của Three.js (hệ trục bàn tay phải), `+X` nằm bên trái màn hình khiến AI map nhầm phím `A` và `D` lúc đầu. Điều này chỉ được phát hiện khi chơi thử trực tiếp trên trình duyệt.
3. **Đo bộ nhớ Node/V8 trong Soak Test**: AI viết script soak ban đầu bằng `tsx` mặc định khiến V8 mở rộng nursery từ `53.6 MB` lên `69.5 MB` (tỷ lệ `1.296×`, vượt ngưỡng `1.2×` dù không hề rò rỉ bộ nhớ). Việc đọc thật số liệu đầu ra đã giúp bắt lỗi ngay và giới hạn semi-space + chạy GC tường minh sau mỗi đêm.

---

## 3. Những lần AI Sai và Cách Phát hiện

| STT | Lỗi AI tạo ra | Cách phát hiện | Cách khắc phục triệt để |
|---|---|---|---|
| 1 | Bóng Mực sinh ở tick 300 kẹt trạng thái `spawning` và thiếu event `shade_spawned` | Self-Audit đối chiếu JSONL output Phase 2 | Bổ sung `spawnTicks = 1` để chuyển `wander` ở tick kế tiếp + phát `shade_spawned`. |
| 2 | Cộng `+10` điểm ở `mote_picked` thay vì `deposit` | Self-Audit kiểm tra công thức điểm PRD-1 | Chuyển cộng điểm sang Bước 5 (`deposit`), về sau cập nhật thành `+5` ở Phase 3. |
| 3 | Dùng chung biến `pushTicks` cho Vùng an toàn 6m và Đẩy lùi Tỏa Sáng khiến quái chỉ văng `3.533m` thay vì `4.0m` | Viết unit test đo khoảng cách đẩy lùi chính xác | Tách thành `safePushTicks` và `pulsePushTicks` độc lập. |
| 4 | Lướt (Dash) trên không vẫn chịu trọng lực làm lệch độ cao `Y` | Kiểm tra quỹ đạo nhảy + lướt trong scenario test | Gán `vel[1] = 0` và bỏ qua trọng lực khi `dashTicks > 0`. |
| 5 | Giữ phím `pause: true` 2 tick liên tiếp làm bật/tắt Pause lặp | Test edge-trigger input trong headless | Cập nhật `lastInput.pause` trước khi `return` sớm khi đang `paused`. |
| 6 | Phím `A` và `D` bị ngược trái/phải trong Web 3D | Chơi thử trực tiếp (Manual Playtest) | Đảo dấu `moveX` trong `src/main.ts` (`A` $\rightarrow$ `+X`, `D` $\rightarrow$ `-X`), giữ nguyên `src/core/math.ts` để không phá headless contract. |
| 7 | TypeScript strict narrowing báo lỗi `never` trên biến `receivedResult` gán trong callback HTTP (`scripts/bench.ts`) | Chạy `pnpm build` (`tsc`) ngay sau khi sửa | Đổi sang `Promise<BenchPayload>` có kiểu rõ ràng, bỏ biến mutable nullable. |
| 8 | Soak test `mem_end_mb / mem_start_mb = 1.296` do V8 nursery chưa thu gọn | Đọc trực tiếp kết quả `soak.json` và so với ngưỡng `1.2×` | Chạy soak với `--expose-gc --max-semi-space-size=2` và gọi `global.gc?.()` sau khi giải phóng từng đêm (`54.8→59.1 MB`, tỷ lệ `1.078×`). |
| 9 | Benchmark 3D có `avg_fps = 402.6` nhưng `p1_low_fps = 18.3` (xung khựng 56ms đều đặn) | Chẩn đoán phân bố Top-5 `dtMs` (`[58.3, 57.3, 56.7...]`) phát hiện nghẽn Windows DWM swapchain do `--disable-frame-rate-limit` | Giữ `--disable-gpu-vsync`, bỏ `--disable-frame-rate-limit`, tối ưu zero-allocation loop và baked shadow map $\rightarrow$ `avg_fps = 120.0`, `p1_low_fps = 116.4`, max frame `8.9ms`. |

---

## 4. Harness nào Giúp Nhiều nhất?

1. **`AGENTS.md` + Quy ước 12 bước Tick**: Hiệu quả nhất về mặt duy trì tính nhất quán xuyên suốt 4 phase. Mỗi lần thay đổi luật (như thêm nhiên liệu, hút dầu, hay bỏ thắng sớm ở Phase 3), AI luôn bám đúng thứ tự 12 bước thay vì chèn logic tùy tiện.
2. **`game.contract.json` + Bộ Vitest / `pnpm verify`**: Đóng vai trò "lưới an toàn hồi quy" (Regression Gate). Mọi chỉnh sửa đồ họa nặng ở Phase 4 (PBR textures, GLSL shaders, Bloom) đều được kiểm chứng không chạm vào lõi xác định.
3. **Dual Skills (`3d-games` & `three-best-practices`)**: Hướng dẫn zero-allocation scratch vectors, `InstancedMesh` cho 200 Bóng Mực & 100 đom đóm, và giải phóng VRAM (`dispose`) giúp cảnh benchmark giữ FPS cao ổn định.

---

## 5. Ước tính Tổng Token / Chi phí AI & Chiến lược Tiết kiệm

| Phase | Số lượt tương tác (Turns) | Input Tokens ước tính | Output Tokens ước tính | Chi phí ước tính (USD) |
|---|---|---|---|---|
| Phase 1 (`PRD-0`) | 8 | ~42,000 | ~7,500 | ~$0.025 |
| Phase 2 (`TICKET-02`) | 5 | ~35,000 | ~6,500 | ~$0.021 |
| Phase 3 (`TICKET-03`) | 3 | ~28,000 | ~7,200 | ~$0.020 |
| Nâng cấp Đồ họa + Phase 4 (`TICKET-04`) | 9 | ~95,000 | ~24,500 | ~$0.068 |
| **Tổng cộng toàn dự án** | **25 turns** | **~200,000** | **~45,700** | **~$0.134** |

### Cách tiết kiệm Token đã áp dụng:
- **Tách nhỏ module theo trách nhiệm** (`terrain.ts`, `leaderboard.ts`, `textures.ts`, `shaders.ts`, `visuals.ts`) thay vì nhồi tất cả vào 1 file 3000 dòng, giúp AI chỉ cần đọc đúng file cần sửa.
- **Đọc chọn lọc theo khoảng dòng (`StartLine..EndLine`)** đối với file dài (`src/main.ts`, `src/core/engine.ts`) thay vì đọc lại toàn file mỗi lượt.
- **Gom thao tác song song & nối lệnh kiểm thử** (`pnpm build; pnpm test; pnpm soak`) để giảm số vòng lặp round-trip mang theo toàn bộ lịch sử hội thoại.

---

## 6. Nếu Làm Lại từ Đầu, Sẽ Thay Đổi Gì?

1. **Tách `src/main.ts` thành 3 module sớm hơn** (`src/app/benchRunner.ts`, `src/app/uiController.ts`, `src/app/gameView.ts`): Hiện tại `src/main.ts` dài ~1850 dòng; tách sớm từ Phase 2 sẽ giúp sửa UI, Accessibility và Benchmark gọn hơn rất nhiều và tiết kiệm token hơn nữa.
2. **Thiết lập Automated Playtest + Smoke Test trình duyệt từ Phase 2**: Kiểm tra hướng di chuyển camera (`A`/`D`), hiển thị HUD và tốc độ khung hình sớm hơn thay vì chờ tới cuối Phase 2 / Phase 4.
3. **Bổ sung `engine.reset()` tái sử dụng bộ đệm**: Giúp soak test và chơi lại nhiều Đêm giảm cấp phát rác bộ nhớ gần như bằng 0 ngay cả khi không cần cờ V8.
