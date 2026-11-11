import fs from 'node:fs';
import path from 'node:path';
import type { StudioConfig } from './types.js';

const root = process.cwd();
export const configPath = path.join(root, 'config', 'local.json');

const isDir = (value: string) => Boolean(value && fs.existsSync(value) && fs.statSync(value).isDirectory());
const firstDir = (values: string[]) => values.find(isDir) ?? '';

function defaults(): StudioConfig {
  const openMontagePath = firstDir([
    process.env.OPENMONTAGE_PATH ?? '',
    path.join(root, 'engine'),
    root,
    path.resolve(root, '..', 'OpenMontage'),
    'C:\\AI\\OpenMontage',
  ]);
  const projectsDirectory = firstDir([
    process.env.OPENMONTAGE_PROJECTS ?? '',
    openMontagePath ? path.join(openMontagePath, 'projects') : '',
  ]);
  return {
    projectsDirectory,
    openMontagePath,
    remotionPath: openMontagePath ? path.join(openMontagePath, 'remotion-composer') : '',
    ffmpegPath: 'ffmpeg',
    ffprobePath: 'ffprobe',
    pythonPath: 'python',
    codexPath: 'codex',
    preferredPort: Number(process.env.PORT) || 3000,
    autoFallback: true,
    render: { width: 1080, height: 1920, fps: 30, workers: 2 },
    freeOnly: true,
  };
}

export function loadConfig(): StudioConfig {
  const base = defaults();
  try {
    const local = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Partial<StudioConfig>;
    return { ...base, ...local, render: { ...base.render, ...(local.render ?? {}) } };
  } catch {
    return base;
  }
}

export function saveConfig(input: StudioConfig): StudioConfig {
  const clean: StudioConfig = {
    ...input,
    preferredPort: Math.min(65535, Math.max(1024, Number(input.preferredPort) || 3000)),
    render: {
      width: Math.max(320, Number(input.render.width) || 720),
      height: Math.max(320, Number(input.render.height) || 1280),
      fps: Math.max(1, Number(input.render.fps) || 30),
      workers: Math.max(1, Number(input.render.workers) || 2),
    },
    freeOnly: true,
  };
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(clean, null, 2), 'utf8');
  return clean;
}

export function validateConfig(config: StudioConfig) {
  return {
    projectsDirectory: isDir(config.projectsDirectory),
    openMontagePath: isDir(config.openMontagePath),
    remotionPath: isDir(config.remotionPath),
  };
}
