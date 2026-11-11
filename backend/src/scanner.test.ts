import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { scanProjects } from './scanner.js';

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true })));

describe('project discovery', () => {
  it('discovers projects from real filesystem markers and never invents an output', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'openmontage-studio-')); roots.push(root);
    const project = path.join(root, 'test-video'); fs.mkdirSync(path.join(project, 'artifacts'), { recursive: true });
    fs.writeFileSync(path.join(project, 'script.md'), '# Test');
    const [result] = scanProjects(root, new Map());
    expect(result.id).toBe('test-video'); expect(result.output).toBeUndefined(); expect(result.progress).toBeGreaterThan(0);
  });
});
