/**
 * @file play.ts
 * @description Game launcher entrypoint supporting both interactive Web 3D server with disk leaderboard API
 * and `--export-leaderboard <out.json>` per Test Contract v1.3.
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import {
  LeaderboardEntry,
  LeaderboardFile,
  addLeaderboardEntry,
  sortAndTrimLeaderboard,
  validatePlayerName
} from '../src/core/leaderboard.js';

const LEADERBOARD_PATH = path.resolve(process.cwd(), 'data', 'leaderboard.json');

function readDiskLeaderboard(): LeaderboardEntry[] {
  if (!fs.existsSync(LEADERBOARD_PATH)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(LEADERBOARD_PATH, 'utf-8')) as LeaderboardFile;
    return Array.isArray(parsed.entries) ? sortAndTrimLeaderboard(parsed.entries) : [];
  } catch {
    return [];
  }
}

function writeDiskLeaderboard(entries: LeaderboardEntry[]): void {
  const dir = path.dirname(LEADERBOARD_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(LEADERBOARD_PATH, JSON.stringify({ entries: sortAndTrimLeaderboard(entries) }, null, 2) + '\n', 'utf-8');
}

const argv = process.argv.slice(2);
const exportIdx = argv.indexOf('--export-leaderboard');
if (exportIdx !== -1) {
  const outPath = argv[exportIdx + 1];
  if (!outPath) {
    console.error('Usage: pnpm play --export-leaderboard <out.json>');
    process.exit(2);
  }
  const entries = readDiskLeaderboard();
  const outDir = path.dirname(path.resolve(outPath));
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ entries }, null, 2) + '\n', 'utf-8');
  console.log(`Exported ${entries.length} leaderboard entries to ${outPath}`);
  process.exit(0);
}

// Interactive Web Server serving dist/ + /__api/leaderboard persistence
const distDir = path.resolve(process.cwd(), 'dist');
if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.log('dist/ not found, building project...');
  execSync('pnpm build', { stdio: 'inherit' });
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const port = parseInt(process.env.PORT || '4173', 10);

const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];

  if (url === '/__api/leaderboard' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ entries: readDiskLeaderboard() }));
    return;
  }

  if (url === '/__api/leaderboard' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        const entry = JSON.parse(body) as LeaderboardEntry;
        const check = validatePlayerName(entry.name || '');
        if (!check.valid) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: check.reason }));
          return;
        }
        entry.name = check.cleaned;
        const updated = addLeaderboardEntry(readDiskLeaderboard(), entry);
        writeDiskLeaderboard(updated);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ entries: updated }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
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

server.listen(port, '127.0.0.1', () => {
  console.log(`Đảo Đèn Lồng v1.0.0 running at http://127.0.0.1:${port}`);
});
