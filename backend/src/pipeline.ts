import path from 'node:path';
import { spawnSync } from 'node:child_process';
import type { StudioConfig, StepId } from './types.js';
import type { ProcessAction } from './processManager.js';
import { findOutputs } from './scanner.js';

const AGENT_STEPS: StepId[] = ['input', 'script', 'scenes', 'footage', 'subtitle', 'motion', 'openmontage'];

export class PipelineEngine {
  constructor(private appRoot: string) {}

  action(config: StudioConfig, projectId: string, projectPath: string, from: StepId): ProcessAction {
    if (AGENT_STEPS.includes(from)) {
      const freeRule = config.freeOnly ? 'Do not use paid APIs or providers. Use only local or free assets/tools.' : '';
      const prompt = [
        `Resume the existing OpenMontage project "${projectId}" from the ${from} stage.`,
        'Read ../AGENTS.md, ../WORKFLOW.md, ../HANDOFF.md and AGENT_GUIDE.md first. Apply the current user instructions and reuse the established workflow.',
        'Reuse existing artifacts, never overwrite unrelated work, and write all outputs inside this project workspace.',
        freeRule,
        'Report progress clearly in the command output. Stop normally at any required human approval gate.',
      ].filter(Boolean).join(' ');
      return {
        projectId, projectPath, step: 'openmontage', label: `Codex agent · từ ${from}`,
        command: config.codexPath,
        args: ['exec', '--approve-for-me', '--sandbox', 'workspace-write', '-C', config.openMontagePath, '--add-dir', projectPath, '--json', prompt],
        cwd: config.openMontagePath,
      };
    }
    if (from === 'remotion') {
      return {
        projectId, projectPath, step: 'remotion', label: 'Remotion render', command: config.pythonPath,
        args: [path.join(this.appRoot, 'scripts', 'run_openmontage_render.py'), '--openmontage', config.openMontagePath, '--project', projectPath, '--width', String(config.render.width), '--height', String(config.render.height), '--workers', String(config.render.workers)],
        cwd: config.openMontagePath,
      };
    }
    const output = findOutputs(projectPath)[0];
    if (!output) throw new Error('Project chưa có video đầu vào cho bước này.');
    const source = path.join(projectPath, output.relativePath);
    if (from === 'ffmpeg') {
      const base = path.basename(source, path.extname(source)).replace(/_final$/i, '');
      const target = path.join(projectPath, 'renders', `${base}_final.mp4`);
      const probe = spawnSync(config.ffprobePath, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', source], { encoding: 'utf8', windowsHide: true });
      return {
        projectId, projectPath, step: 'ffmpeg', label: 'FFmpeg final encode', command: config.ffmpegPath,
        args: ['-y', '-i', source, '-map', '0:v:0', '-map', '0:a?', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-c:a', 'aac', '-movflags', '+faststart', '-progress', 'pipe:1', '-nostats', target],
        cwd: projectPath, expectedDurationSeconds: Number(probe.stdout.trim()) || undefined,
      };
    }
    if (from === 'qa') {
      return {
        projectId, projectPath, step: 'qa', label: 'FFmpeg decode QA', command: config.ffmpegPath,
        args: ['-v', 'error', '-i', source, '-f', 'null', process.platform === 'win32' ? 'NUL' : '/dev/null'], cwd: projectPath,
      };
    }
    throw new Error('Bước Final chỉ được hoàn tất khi file đầu ra thực sự tồn tại.');
  }
}
