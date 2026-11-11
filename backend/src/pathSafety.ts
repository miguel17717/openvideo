import fs from 'node:fs';
import path from 'node:path';

export function safeChild(root: string, relative = ''): string {
  const rootPath = path.resolve(root);
  const candidate = path.resolve(rootPath, relative);
  const prefix = rootPath.endsWith(path.sep) ? rootPath : `${rootPath}${path.sep}`;
  if (candidate !== rootPath && !candidate.startsWith(prefix)) {
    throw new Error('Đường dẫn nằm ngoài thư mục project.');
  }
  return candidate;
}

export function resolveProject(projectsRoot: string, id: string): string {
  if (!/^[\p{L}\p{N}._-]+$/u.test(id)) throw new Error('Project ID không hợp lệ.');
  const project = safeChild(projectsRoot, id);
  if (!fs.existsSync(project) || !fs.statSync(project).isDirectory()) throw new Error('Không tìm thấy project.');
  return project;
}
