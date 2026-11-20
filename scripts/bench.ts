/**
 * @file bench.ts
 * @description Automated 1280x720 WebGL 3D benchmark runner conforming to Test Contract v1.3.
 * Usage: pnpm bench --seed 42 --duration 30 --out bench.json
 */

import * as http from 'http';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawn, execSync } from 'child_process';

interface BenchArgs {
  seed: number;
  duration: number;
  outPath: string;
}

function parseArgs(argv: string[]): BenchArgs {
  let seed = 42;
  let duration = 30;
  let outPath = 'bench.json';

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--seed' && i + 1 < argv.length) seed = parseInt(argv[++i], 10);
    else if (a === '--duration' && i + 1 < argv.length) duration = parseFloat(argv[++i]);
    else if (a === '--out' && i + 1 < argv.length) outPath = argv[++i];
  }
  return { seed, duration, outPath };
}

function findBrowserExecutable(): string | null {
  const candidates: string[] = [];
  if (process.platform === 'win32') {
    candidates.push(
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    );
  } else if (process.platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    );
  } else {
    candidates.push('/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium');
  }

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

interface BenchPayload {
  avg_fps: number;
  p1_low_fps: number;
  frame_ms_p95: number;
  frames: number;
  load_ms?: number;
  peak_mem_mb?: number | null;
  renderer?: string;
  diag_top5_ms?: number[];
}

async function main(): Promise<void> {
  const processStartEpoch = Date.now();
  const processStart = performance.now();
  const args = parseArgs(process.argv.slice(2));

  const distDir = path.resolve(process.cwd(), 'dist');
  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    execSync('pnpm build', { stdio: 'inherit' });
  }

  const browserPath = findBrowserExecutable();
  if (!browserPath) {
    console.error('No Chrome/Edge/Chromium executable found for 3D WebGL benchmark.');
    process.exit(1);
  }

  const MIME: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
  };

  let resolveDone!: (payload: BenchPayload) => void;
  const donePromise = new Promise<BenchPayload>(resolve => (resolveDone = resolve));

  const server = http.createServer((req, res) => {
    const url = (req.url || '/').split('?')[0];

    if (url === '/__bench_result' && req.method === 'POST') {
      let body = '';
      req.on('data', c => (body += c));
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body) as BenchPayload;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end('{"ok":true}');
          resolveDone(parsed);
        } catch {
          res.writeHead(400);
          res.end('bad json');
        }
      });
      return;
    }

    const filePath = path.join(distDir, url === '/' ? 'index.html' : url);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()));
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 4173;
  const targetUrl = `http://127.0.0.1:${port}/?bench=1&seed=${args.seed}&duration=${args.duration}&t0=${processStartEpoch}`;

  const tmpProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'ddl-bench-'));
  const browser = spawn(
    browserPath,
    [
      '--window-size=1280,720',
      '--disable-gpu-vsync',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-extensions',
      '--disable-component-update',
      '--disable-background-networking',
      '--disable-sync',
      '--mute-audio',
      '--no-first-run',
      '--no-default-browser-check',
      '--autoplay-policy=no-user-gesture-required',
      `--user-data-dir=${tmpProfile}`,
      targetUrl
    ],
    { stdio: 'ignore' }
  );

  // Timeout safety guard (duration + 25s)
  const timeout = setTimeout(() => {
    console.error('Benchmark timed out waiting for browser metrics.');
    browser.kill();
    server.close();
    process.exit(1);
  }, (args.duration + 25) * 1000);

  const receivedResult = await donePromise;
  clearTimeout(timeout);

  browser.kill();
  server.close();
  try {
    fs.rmSync(tmpProfile, { recursive: true, force: true });
  } catch {
    // ignore cleanup lock on Windows
  }

  const finalReport = {
    contract_version: '1.3',
    avg_fps: receivedResult.avg_fps,
    p1_low_fps: receivedResult.p1_low_fps,
    frame_ms_p95: receivedResult.frame_ms_p95,
    frames: receivedResult.frames,
    load_ms: receivedResult.load_ms ?? Math.round(performance.now() - processStart),
    peak_mem_mb: null as number | null,
    vsync_off: true,
    renderer: receivedResult.renderer ?? 'Three.js 0.160.1 WebGLRenderer',
    os: `${os.platform()} ${os.release()} (${os.arch()})`
  };

  const outDir = path.dirname(path.resolve(args.outPath));
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(args.outPath, JSON.stringify(finalReport, null, 2) + '\n', 'utf-8');
  if (receivedResult.diag_top5_ms) {
    console.log('BENCH_TOP5_FRAME_MS:', JSON.stringify(receivedResult.diag_top5_ms));
  }
  console.log('BENCH_RESULT:', JSON.stringify(finalReport));
  process.exit(0);
}

main();
