# CREDITS — Đảo Đèn Lồng (Lantern Island v1.0.0)

## 1. Tác giả & Phát triển
- **Tác giả**: Dương Quang Bảo (MSSV: `2A202603362`)
- **Dự án**: Day 12 — AI SDLC Individual Lab (4 Phases, Contract v1.0 → v1.3)

## 2. Thư viện & Nền tảng Mã nguồn mở
- **Three.js (`0.160.1`)** — Engine kết xuất WebGL 3D, `EffectComposer`, `UnrealBloomPass` (MIT License).
- **Vite (`5.x`)** — Công cụ đóng gói và dev server (MIT License).
- **TypeScript (`5.x`)** — Ngôn ngữ phát triển lõi mô phỏng và giao diện (Apache-2.0 License).
- **Vitest (`1.6.x`)** — Bộ kiểm thử đơn vị và kiểm thử bất biến (MIT License).
- **tsx** — Trình chạy TypeScript cho CLI headless, soak test, benchmark và server cục bộ (MIT License).

## 3. Tài nguyên Đồ họa & Âm thanh (100% Procedural In-Repo)
Toàn bộ tài nguyên hình ảnh và âm thanh đều được sinh bằng thuật toán tại runtime, không sử dụng tệp asset bản quyền bên ngoài:
- **Procedural PBR Textures** (`src/render/textures.ts`): Tự vẽ qua HTML5 Canvas 2D — mặt cỏ + bump map, cát ven biển, gỗ cầu tre/cột đèn + bump map, nan nón lá đan, giấy dó đèn lồng (sáng / tắt rách) và vầng sáng đom đóm.
- **Custom GLSL Shaders** (`src/render/shaders.ts`): Vòm trời chuyển sắc đêm–bình minh theo tỷ lệ đèn sáng, biển mây thể tích chuyển động, hệ thống hạt 240 phần tử zero-allocation.
- **3D Meshes & Articulated Rigs** (`src/render/visuals.ts`): Dựng từ hình học Three.js — nhân vật Mây nhiều khớp (nón lá, khăn quàng 3 đốt, bím tóc, túi đom đóm), đèn lồng mái chùa 4 tua rua, Bóng Mực + tia hút dầu, Gió Lạc dải lụa, Bùa Gió, cây thông/cau/tre đung đưa, cầu tàu và thuyền nan Đảo Bến.
- **Procedural Web Audio** (`src/render/audio.ts`): Tổng hợp trực tiếp bằng Web Audio API — tiếng bước chân, nhảy, lướt gió, nhặt đom đóm, chuông chùa thắp đèn, sóng âm Tỏa Sáng, tiếng chạm quái và đếm ngược bình minh.

## 4. Công cụ AI hỗ trợ trong quy trình AI-SDLC
- **Antigravity Coding Agent (Google DeepMind)** — Hỗ trợ thiết kế kiến trúc tách lớp Core/View, sinh mã nguồn TypeScript/Three.js, kiểm toán chéo logic 12 bước (Self-Audit), viết bộ test hồi quy và tự động hóa script kiểm chứng.
- **Harness & Skills sử dụng**: `AGENTS.md`, `game.contract.json`, `.agents/skills/3d-games/SKILL.md`, `.agents/skills/three-best-practices/SKILL.md`.
