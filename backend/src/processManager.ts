import { EventEmitter } from 'node:events';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import type { LogEntry, ProcessState, StepId } from './types.js';

export interface ProcessAction {
  projectId: string;
  projectPath: string;
  step: StepId;
  label: string;
  command: string;
  args: string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
  expectedDurationSeconds?: number;
}

export class ProcessManager extends EventEmitter {
  private states = new Map<string, ProcessState>();
  private children = new Map<string, ChildProcessWithoutNullStreams>();
  private nextLogId = 1;
  private runtimeFile = path.join(process.cwd(), 'config', 'runtime-state.json');

  constructor() {
    super();
    this.recover();
  }

  getStates() { return this.states; }
  get(projectId: string): ProcessState { return this.states.get(projectId) ?? { projectId, status: 'idle', logs: [] }; }

  private recover() {
    try {
      const saved = JSON.parse(fs.readFileSync(this.runtimeFile, 'utf8')) as ProcessState[];
      for (const state of saved) {
        if (state.status === 'running' && state.pid && this.pidExists(state.pid)) {
          state.status = 'detached';
          state.error = 'Tiến trình vẫn chạy sau khi Studio khởi động lại; log trực tiếp không thể gắn lại.';
        } else if (state.status === 'running') {
          state.status = 'failed';
          state.error = 'Tiến trình trước đó không còn chạy.';
        }
        this.states.set(state.projectId, state);
      }
    } catch { /* first run */ }
  }

  private pidExists(pid: number) {
    try { process.kill(pid, 0); return true; } catch { return false; }
  }

  private persist() {
    fs.mkdirSync(path.dirname(this.runtimeFile), { recursive: true });
    fs.writeFileSync(this.runtimeFile, JSON.stringify([...this.states.values()].map((state) => ({ ...state, logs: state.logs.slice(-1000) })), null, 2));
  }

  private pushLog(state: ProcessState, stream: LogEntry['stream'], message: string) {
    const clean = message.replace(/\u001b\[[0-9;]*m/g, '').trimEnd();
    if (!clean) return;
    const entry: LogEntry = { id: this.nextLogId++, timestamp: new Date().toISOString(), stream, level: stream === 'stderr' || /error|failed|exception/i.test(clean) ? 'error' : /warn/i.test(clean) ? 'warning' : 'info', message: clean };
    state.logs.push(entry);
    if (state.logs.length > 5000) state.logs.splice(0, state.logs.length - 5000);
    this.parseProgress(state, clean);
    this.emit('event', { type: 'log', projectId: state.projectId, entry, process: state });
  }

  private parseProgress(state: ProcessState, line: string) {
    const remotion = line.match(/(?:Rendered|Rendering)\s+(?:frame\s+)?(\d+)\s*(?:\/|of)\s*(\d+)/i);
    if (remotion) {
      state.currentFrame = Number(remotion[1]); state.totalFrames = Number(remotion[2]);
      state.progress = Math.min(99.9, (state.currentFrame / state.totalFrames) * 100);
    }
    const outTime = line.match(/out_time_(?:ms|us)=(\d+)/);
    if (outTime && state.expectedDurationSeconds) {
      const seconds = Number(outTime[1]) / 1_000_000;
      state.progress = Math.min(99.9, (seconds / state.expectedDurationSeconds) * 100);
    }
  }

  run(action: ProcessAction) {
    const current = this.states.get(action.projectId);
    if (current?.status === 'running' || current?.status === 'detached') throw new Error('Project này đang có tiến trình chạy.');
    const logDir = path.join(action.projectPath, 'logs');
    fs.mkdirSync(logDir, { recursive: true });
    const logFile = path.join(logDir, `studio-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
    const child = spawn(action.command, action.args, { cwd: action.cwd, env: { ...process.env, ...action.env, PYTHONUNBUFFERED: '1' }, shell: false, windowsHide: true });
    const state: ProcessState = { projectId: action.projectId, status: 'running', step: action.step, label: action.label, pid: child.pid, startedAt: new Date().toISOString(), expectedDurationSeconds: action.expectedDurationSeconds, logs: current?.logs ?? [] };
    this.states.set(action.projectId, state);
    this.children.set(action.projectId, child);
    this.pushLog(state, 'system', `Bắt đầu ${action.label} (PID ${child.pid ?? 'unknown'})`);
    const stream = fs.createWriteStream(logFile, { flags: 'a' });
    const bind = (source: NodeJS.ReadableStream, kind: 'stdout' | 'stderr') => {
      const lines = readline.createInterface({ input: source });
      lines.on('line', (line) => { stream.write(`[${new Date().toISOString()}] [${kind}] ${line}\n`); this.pushLog(state, kind, line); });
    };
    bind(child.stdout, 'stdout'); bind(child.stderr, 'stderr');
    child.on('error', (error) => { state.error = error.message; this.pushLog(state, 'stderr', error.message); });
    child.on('close', (code) => {
      state.exitCode = code; state.endedAt = new Date().toISOString();
      if (state.status !== 'cancelled') state.status = code === 0 ? 'completed' : 'failed';
      if (code === 0) state.progress = 100;
      if (code !== 0 && !state.error) state.error = `Tiến trình kết thúc với mã ${code}.`;
      this.pushLog(state, 'system', state.status === 'completed' ? `${action.label} hoàn tất.` : `${action.label} dừng (${state.status}).`);
      this.children.delete(action.projectId); stream.end(); this.persist();
      this.emit('event', { type: 'process', projectId: action.projectId, process: state });
    });
    this.persist();
    this.emit('event', { type: 'process', projectId: action.projectId, process: state });
    return state;
  }

  stop(projectId: string) {
    const state = this.states.get(projectId);
    if (!state?.pid || !['running', 'detached'].includes(state.status)) throw new Error('Không có tiến trình đang chạy.');
    state.status = 'cancelled'; state.endedAt = new Date().toISOString();
    this.pushLog(state, 'system', 'Đang dừng tiến trình và các tiến trình con…');
    if (process.platform === 'win32') {
      spawn('taskkill', ['/PID', String(state.pid), '/T'], { windowsHide: true, shell: false });
    } else {
      try { process.kill(-state.pid, 'SIGTERM'); } catch { process.kill(state.pid, 'SIGTERM'); }
    }
    this.persist(); this.emit('event', { type: 'process', projectId, process: state });
    return state;
  }
}
