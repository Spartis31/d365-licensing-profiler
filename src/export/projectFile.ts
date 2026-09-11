import type { Project } from '../types';
import { parseProject } from '../state/project';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

function slugify(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'project'
  );
}

export function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function projectFileName(project: Project, extension: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const name = slugify(project.meta.customer || project.meta.name || 'd365-licensing');
  return `${date}-${name}.${extension}`;
}

export function saveProjectFile(project: Project): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  download(blob, projectFileName(project, 'd365lic'));
}

export async function readProjectFile(file: File): Promise<Project> {
  if (file.size > MAX_FILE_BYTES) throw new Error('File too large');
  const text = await file.text();
  return parseProject(JSON.parse(text));
}
