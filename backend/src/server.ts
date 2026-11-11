import express, { type Response } from 'express';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { loadConfig, saveConfig, validateConfig } from './config.js';
import { PipelineEngine } from './pipeline.js';
import { ProcessManager } from './processManager.js';
import { inspectVideo } from './qa.js';
import { findOutputs, projectFiles, resolveProjectFile, scanProjects } from './scanner.js';
import { resolveProject } from './pathSafety.js';
import { systemStatus } from './system.js';
import { listenWithFallback } from './port.js';
import type { StepId, StudioConfig } from './types.js';

const appRoot = process.cwd();
let config = loadConfig();
const manager = new ProcessManager();
const pipeline = new PipelineEngine(appRoot);
const app = express();
const server = http.createServer(app);
const sseClients = new Set<Response>();

app.use(express.json({ limit: '256kb' }));
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

const currentProjects = () => scanProjects(config.projectsDirectory, manager.getStates());
const getProject = (id: string) => {
  const item = currentProjects().find((project) => project.id === id);
  if (!item) throw new Error('Không tìm thấy project.');
  return item;
};

manager.on('event', (event) => {
  const payload = `event: studio\ndata: ${JSON.stringify(event)}\n\n`;
  for (const client of sseClients) client.write(payload);
});

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream'); res.setHeader('Cache-Control', 'no-cache'); res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); res.write(`event: connected\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);
  sseClients.add(res);
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 25_000);
  req.on('close', () => { clearInterval(heartbeat); sseClients.delete(res); });
});

app.get('/api/projects', (_req, res) => res.json(currentProjects()));
app.get('/api/projects/:id', (req, res) => res.json({ ...getProject(req.params.id), process: manager.get(req.params.id) }));
app.get('/api/projects/:id/status', (req, res) => res.json(manager.get(req.params.id)));
app.get('/api/projects/:id/files', (req, res) => res.json(projectFiles(config.projectsDirectory, req.params.id)));
app.get('/api/projects/:id/logs', (req, res) => {
  const state = manager.get(req.params.id);
  const text = state.logs.map((line) => `[${line.timestamp}] [${line.stream}] ${line.message}`).join('\n');
  if (req.query.download === '1') res.setHeader('Content-Disposition', `attachment; filename="${req.params.id}-studio.log"`);
  res.type('text/plain').send(text);
});

app.post('/api/projects/:id/run', (req, res) => {
  const project = getProject(req.params.id);
  const action = pipeline.action(config, project.id, project.path, 'input');
  res.status(202).json(manager.run(action));
});
app.post('/api/projects/:id/run-from', (req, res) => {
  const project = getProject(req.params.id);
  const from = String(req.body?.step ?? '') as StepId;
  const allowed: StepId[] = ['input', 'script', 'scenes', 'footage', 'subtitle', 'motion', 'openmontage', 'remotion', 'ffmpeg', 'qa'];
  if (!allowed.includes(from)) throw new Error('Bước chạy không hợp lệ.');
  res.status(202).json(manager.run(pipeline.action(config, project.id, project.path, from)));
});
app.post('/api/projects/:id/stop', (req, res) => res.json(manager.stop(req.params.id)));

app.get('/api/projects/:id/media', (req, res) => {
  const file = resolveProjectFile(config.projectsDirectory, req.params.id, String(req.query.path ?? ''));
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error('Không tìm thấy file.');
  const stat = fs.statSync(file); const range = req.headers.range;
  if (!range) { res.setHeader('Content-Length', stat.size); res.type(path.extname(file)).sendFile(file); return; }
  const [startText, endText] = range.replace('bytes=', '').split('-');
  const start = Number(startText); const end = endText ? Number(endText) : Math.min(start + 2_000_000, stat.size - 1);
  if (!Number.isFinite(start) || start < 0 || end >= stat.size || start > end) { res.status(416).end(); return; }
  res.status(206); res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`); res.setHeader('Accept-Ranges', 'bytes'); res.setHeader('Content-Length', end - start + 1); res.type(path.extname(file));
  fs.createReadStream(file, { start, end }).pipe(res);
});

app.post('/api/projects/:id/reveal', (req, res) => {
  const project = resolveProject(config.projectsDirectory, req.params.id);
  const file = req.body?.path ? resolveProjectFile(config.projectsDirectory, req.params.id, String(req.body.path)) : project;
  const args = fs.statSync(file).isFile() ? ['/select,', file] : [file];
  spawn('explorer.exe', args, { detached: true, windowsHide: true, shell: false }).unref();
  res.json({ ok: true });
});
app.post('/api/projects/:id/open', (req, res) => {
  const file = resolveProjectFile(config.projectsDirectory, req.params.id, String(req.body?.path ?? ''));
  spawn('explorer.exe', [file], { detached: true, windowsHide: true, shell: false }).unref();
  res.json({ ok: true });
});

app.get('/api/projects/:id/qa', async (req, res) => {
  const project = getProject(req.params.id); const output = findOutputs(project.path)[0];
  if (!output) throw new Error('Project chưa có video để QA.');
  res.json(await inspectVideo(path.join(project.path, output.relativePath), config, req.query.decode === '1'));
});

app.get('/api/settings', (_req, res) => res.json({ value: config, validation: validateConfig(config) }));
app.put('/api/settings', (req, res) => { config = saveConfig(req.body as StudioConfig); res.json({ value: config, validation: validateConfig(config) }); });
app.post('/api/settings/browse', (_req, res) => {
  if (process.platform !== 'win32') { res.status(400).json({ error: 'Browse hiện hỗ trợ Windows.' }); return; }
  const script = "Add-Type -AssemblyName System.Windows.Forms; $d=New-Object System.Windows.Forms.FolderBrowserDialog; if($d.ShowDialog() -eq 'OK'){[Console]::OutputEncoding=[Text.Encoding]::UTF8; Write-Output $d.SelectedPath}";
  const child = spawn('powershell.exe', ['-NoProfile', '-STA', '-Command', script], { shell: false, windowsHide: true });
  let output = ''; child.stdout.on('data', (chunk) => { output += chunk; });
  child.on('close', () => res.json({ path: output.trim() })); child.on('error', (error) => res.status(500).json({ error: error.message }));
});
app.get('/api/system/status', async (_req, res) => res.json(await systemStatus(config)));

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error); res.status(400).json({ error: error.message || 'Yêu cầu không thể thực hiện.' });
});

async function attachFrontend() {
  if (process.env.NODE_ENV === 'production') {
    const dist = path.join(appRoot, 'frontend', 'dist'); app.use(express.static(dist));
    app.get('{*splat}', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({ root: path.join(appRoot, 'frontend'), configLoader: 'runner', server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }
}

await attachFrontend();
const selectedPort = await listenWithFallback(server, Number(process.env.PORT) || config.preferredPort, config.autoFallback);
console.log(`\nOpenMontage Studio running at:\n\nhttp://127.0.0.1:${selectedPort}\n`);
