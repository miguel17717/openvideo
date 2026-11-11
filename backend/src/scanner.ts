import fs from 'node:fs';
import path from 'node:path';
import type { FileItem, PipelineStep, ProcessState, ProjectSummary, StepId, VideoSummary } from './types.js';
import { resolveProject, safeChild } from './pathSafety.js';

const STEPS: Array<{ id: StepId; name: string }> = [
  { id: 'input', name: 'Input' }, { id: 'script', name: 'Script' }, { id: 'scenes', name: 'Scenes' },
  { id: 'footage', name: 'Footage' }, { id: 'subtitle', name: 'Subtitle' }, { id: 'motion', name: 'Motion' },
  { id: 'openmontage', name: 'OpenMontage' }, { id: 'remotion', name: 'Remotion' },
  { id: 'ffmpeg', name: 'FFmpeg' }, { id: 'qa', name: 'QA' }, { id: 'final', name: 'Final' },
];

const exists = (project: string, ...parts: string[]) => fs.existsSync(path.join(project, ...parts));
const filesIn = (dir: string, extensions?: string[]) => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && (!extensions || extensions.includes(path.extname(entry.name).toLowerCase())))
    .map((entry) => path.join(dir, entry.name));
};

function readJson(file: string): Record<string, unknown> | undefined {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return undefined; }
}

export function findOutputs(project: string): VideoSummary[] {
  const candidates = [...filesIn(path.join(project, 'renders'), ['.mp4', '.mov', '.webm']), ...filesIn(project, ['.mp4'])];
  return candidates.map((file) => {
    const stat = fs.statSync(file);
    return { name: path.basename(file), relativePath: path.relative(project, file).replaceAll('\\', '/'), size: stat.size, modifiedAt: stat.mtime.toISOString() };
  }).sort((a, b) => {
    const finalDelta = Number(/final/i.test(b.name)) - Number(/final/i.test(a.name));
    return finalDelta || Date.parse(b.modifiedAt) - Date.parse(a.modifiedAt);
  });
}

function detectSteps(project: string, process?: ProcessState): PipelineStep[] {
  const props = readJson(path.join(project, 'artifacts', 'remotion_props.json')) ?? readJson(path.join(project, 'artifacts', 'remotion_props_footage.json'));
  const outputs = findOutputs(project);
  const hasVideoAssets = filesIn(path.join(project, 'assets', 'video'), ['.mp4', '.mov', '.webm']).length > 0;
  const done: Record<StepId, boolean> = {
    input: exists(project, 'project.json') || exists(project, 'script.md') || exists(project, 'input.md'),
    script: exists(project, 'script.md') || exists(project, 'artifacts', 'script.json') || exists(project, 'checkpoint_script.json'),
    scenes: exists(project, 'scenes.json') || exists(project, 'artifacts', 'scene_plan.json') || exists(project, 'checkpoint_scene_plan.json'),
    footage: hasVideoAssets || exists(project, 'artifacts', 'asset_manifest.json'),
    subtitle: exists(project, 'subtitles.json') || exists(project, 'assets', 'subtitles.srt') || Array.isArray(props?.captions),
    motion: Array.isArray(props?.overlays) || exists(project, 'artifacts', 'edit_decisions.json'),
    openmontage: exists(project, 'events.jsonl') || exists(project, 'project.json'),
    remotion: outputs.length > 0,
    ffmpeg: outputs.some((o) => /final/i.test(o.name)),
    qa: exists(project, 'artifacts', 'final_review.json') || exists(project, 'artifacts', 'render_report.json'),
    final: outputs.some((o) => /final/i.test(o.name)),
  };
  return STEPS.map((step) => ({
    ...step,
    actionable: !['final'].includes(step.id),
    status: process?.status === 'running' && process.step === step.id ? 'running'
      : process?.status === 'failed' && process.step === step.id ? 'failed'
      : process?.status === 'cancelled' && process.step === step.id ? 'cancelled'
      : done[step.id] ? 'completed' : 'pending',
  }));
}

export function scanProjects(projectsRoot: string, states: Map<string, ProcessState>): ProjectSummary[] {
  if (!projectsRoot || !fs.existsSync(projectsRoot)) return [];
  return fs.readdirSync(projectsRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).flatMap((entry) => {
    const project = path.join(projectsRoot, entry.name);
    const isCandidate = exists(project, 'project.json') || exists(project, 'script.md') || exists(project, 'artifacts');
    if (!isCandidate) return [];
    const state = states.get(entry.name);
    const steps = detectSteps(project, state);
    const completed = steps.filter((step) => step.status === 'completed').length;
    const meta = readJson(path.join(project, 'project.json'));
    const stat = fs.statSync(project);
    const output = findOutputs(project)[0];
    const activeStep = steps.find((step) => ['running', 'failed', 'cancelled'].includes(step.status));
    const current = (activeStep ?? (output ? steps.at(-1) : steps.find((step) => step.status === 'pending')) ?? steps.at(-1))!;
    const status: ProjectSummary['status'] = state?.status === 'running' ? 'running' : state?.status === 'failed' ? 'failed' : output ? 'ready' : current.status;
    return [{ id: entry.name, name: String(meta?.title ?? entry.name.replaceAll('-', ' ')), path: project, pipelineType: meta?.pipeline_type ? String(meta.pipeline_type) : undefined, status, currentStep: current.id, progress: state?.progress ?? Math.round((completed / STEPS.length) * 100), modifiedAt: stat.mtime.toISOString(), output, error: state?.error, steps }];
  }).sort((a, b) => Date.parse(b.modifiedAt) - Date.parse(a.modifiedAt));
}

export function projectFiles(projectsRoot: string, id: string): FileItem[] {
  const project = resolveProject(projectsRoot, id);
  const items: FileItem[] = [];
  const visit = (dir: string, depth: number) => {
    if (depth > 3 || items.length >= 300) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.remotion-public') || ['node_modules', 'history', 'review-frames', 'thumbnails'].includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      const relativePath = path.relative(project, full).replaceAll('\\', '/');
      const stat = fs.statSync(full);
      items.push({ name: entry.name, relativePath, type: entry.isDirectory() ? 'directory' : 'file', size: entry.isFile() ? stat.size : 0, modifiedAt: stat.mtime.toISOString(), category: relativePath.split('/')[0] || 'root' });
      if (entry.isDirectory()) visit(full, depth + 1);
    }
  };
  visit(project, 0);
  return items;
}

export function resolveProjectFile(projectsRoot: string, id: string, relativePath: string) {
  return safeChild(resolveProject(projectsRoot, id), relativePath);
}
