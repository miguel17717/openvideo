import { spawn } from 'node:child_process';
import fs from 'node:fs';
import type { StudioConfig } from './types.js';
import { scanProjects } from './scanner.js';
import path from 'node:path';

function version(command: string, args: string[]): Promise<{ found: boolean; version?: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { shell: false, windowsHide: true });
    let text = '';
    child.stdout.on('data', (chunk) => { text += chunk; }); child.stderr.on('data', (chunk) => { text += chunk; });
    child.on('error', () => resolve({ found: false }));
    child.on('close', (code) => resolve({ found: code === 0, version: text.split(/\r?\n/)[0]?.trim() }));
  });
}

export async function systemStatus(config: StudioConfig) {
  const [node, ffmpeg, codex, python] = await Promise.all([
    version(process.execPath, ['--version']), version(config.ffmpegPath, ['-version']),
    version(config.codexPath, ['--version']), version(config.pythonPath, ['--version']),
  ]);
  let remotion: { found: boolean; version?: string; path: string } = { found: false, path: config.remotionPath };
  try {
    const packageFile = path.join(config.remotionPath, 'node_modules', 'remotion', 'package.json');
    const packageData = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
    remotion = { found: true, version: `Remotion ${packageData.version}`, path: config.remotionPath };
  } catch { /* missing */ }
  let diskAvailableGb: number | undefined;
  try { diskAvailableGb = Number((fs.statfsSync(config.projectsDirectory).bavail * fs.statfsSync(config.projectsDirectory).bsize / 1024 ** 3).toFixed(1)); } catch { /* unavailable */ }
  return {
    openMontage: { found: fs.existsSync(config.openMontagePath), path: config.openMontagePath },
    remotion, ffmpeg, node, codex, python,
    projects: scanProjects(config.projectsDirectory, new Map()).length, diskAvailableGb,
  };
}
