import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import {
  Activity, AlertCircle, Check, CheckCircle2, ChevronRight, Circle, Clipboard, Clock3, Copy,
  Download, ExternalLink, File, FileJson, FileText, Film, Folder, FolderOpen, Gauge, Home,
  LoaderCircle, MonitorPlay, Pause, Play, RefreshCw, Search, Settings, Square, Terminal,
  Video, WandSparkles, XCircle,
} from 'lucide-react';
import { api, post, put } from './api';
import type { FileItem, ProcessState, Project, QAResult, StepId, StepStatus, StudioConfig } from './types';

const fmtBytes = (bytes = 0) => bytes < 1024 ? `${bytes} B` : bytes < 1024 ** 2 ? `${(bytes / 1024).toFixed(1)} KB` : bytes < 1024 ** 3 ? `${(bytes / 1024 ** 2).toFixed(1)} MB` : `${(bytes / 1024 ** 3).toFixed(1)} GB`;
const fmtDate = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
const elapsed = (start?: string, end = Date.now()) => start ? Math.max(0, Math.floor((end - Date.parse(start)) / 1000)) : 0;
const fmtTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

function useStudioEvents(onEvent: () => void) {
  useEffect(() => {
    let timer: number | undefined;
    const events = new EventSource('/api/events');
    events.addEventListener('studio', () => { window.clearTimeout(timer); timer = window.setTimeout(onEvent, 120); });
    return () => { window.clearTimeout(timer); events.close(); };
  }, [onEvent]);
}

function StatusIcon({ status }: { status: StepStatus | 'ready' | 'idle' | 'detached' }) {
  const props = { size: 16, strokeWidth: 2 };
  if (status === 'completed' || status === 'ready') return <CheckCircle2 {...props} />;
  if (status === 'running') return <LoaderCircle {...props} className="spin" />;
  if (status === 'failed') return <XCircle {...props} />;
  if (status === 'cancelled' || status === 'detached') return <AlertCircle {...props} />;
  return <Circle {...props} />;
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = { ready: 'Sẵn sàng', running: 'Đang chạy', completed: 'Hoàn tất', failed: 'Lỗi', cancelled: 'Đã dừng', detached: 'Đang chạy nền', pending: 'Chờ', idle: 'Rảnh', skipped: 'Bỏ qua' };
  return <span className={`status status-${status}`}><StatusIcon status={status as StepStatus} />{labels[status] ?? status}</span>;
}

function Shell({ children }: { children: ReactNode }) {
  const [system, setSystem] = useState<any>();
  useEffect(() => { api('/api/system/status').then(setSystem).catch(() => undefined); }, []);
  return <div className="app-shell">
    <a className="skip-link" href="#main">Đi tới nội dung chính</a>
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Film size={19} /></div><div><strong>OpenMontage</strong><span>STUDIO</span></div></div>
      <nav aria-label="Điều hướng chính">
        <NavLink to="/" end><Home size={18} /><span>Tổng quan</span></NavLink>
        <NavLink to="/" end={false} className={({ isActive }) => location.pathname.startsWith('/projects') && isActive ? 'active' : ''}><WandSparkles size={18} /><span>Projects</span></NavLink>
        <NavLink to="/settings"><Settings size={18} /><span>Cài đặt</span></NavLink>
      </nav>
      <div className="sidebar-foot">
        <div className="system-mini"><span className={system?.openMontage?.found ? 'dot ok' : 'dot bad'} /><span>OpenMontage</span><small>{system?.openMontage?.found ? 'Ready' : 'Missing'}</small></div>
        <div className="system-mini"><span className={system?.ffmpeg?.found ? 'dot ok' : 'dot bad'} /><span>FFmpeg</span><small>{system?.ffmpeg?.found ? 'Ready' : 'Missing'}</small></div>
      </div>
    </aside>
    <main id="main" tabIndex={-1}>{children}</main>
  </div>;
}

function PageHead({ eyebrow, title, actions }: { eyebrow: string; title: string; actions?: ReactNode }) {
  return <header className="page-head"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1></div><div className="head-actions">{actions}</div></header>;
}

function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]); const [system, setSystem] = useState<any>(); const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => { setLoading(true); try { const [p, s] = await Promise.all([api<Project[]>('/api/projects'), api('/api/system/status')]); setProjects(p); setSystem(s); } finally { setLoading(false); } }, []);
  useEffect(() => { refresh(); }, [refresh]); useStudioEvents(refresh);
  const active = projects.filter((p) => p.status === 'running');
  return <div className="page"><PageHead eyebrow="Production control" title="Tổng quan" actions={<button className="btn secondary" onClick={refresh}><RefreshCw size={16} />Làm mới <kbd>R</kbd></button>} />
    <section className="section"><div className="section-title"><div><h2>Active jobs</h2><p>{active.length ? 'Pipeline đang chạy' : 'Tất cả hệ thống đang rảnh'}</p></div><span className="count">{active.length}</span></div>
      {loading ? <SkeletonRows /> : active.length ? <div className="job-list">{active.map((project) => <ProjectRow key={project.id} project={project} />)}</div> : <div className="empty"><Activity size={24} /><strong>All systems idle</strong><span>Không có video nào đang được xử lý.</span></div>}
    </section>
    <div className="dashboard-grid">
      <section className="section"><div className="section-title"><div><h2>Projects gần đây</h2><p>{projects.length} project được phát hiện</p></div></div><div className="job-list">{projects.slice(0, 8).map((p) => <ProjectRow key={p.id} project={p} />)}</div></section>
      <section className="section"><div className="section-title"><div><h2>System</h2><p>Kiểm tra trực tiếp trên máy</p></div></div><div className="system-list">
        <SystemLine label="OpenMontage" ok={system?.openMontage?.found} value={system?.openMontage?.found ? 'Ready' : 'Không tìm thấy'} />
        <SystemLine label="Remotion" ok={system?.remotion?.found} value={system?.remotion?.version || 'Không tìm thấy'} />
        <SystemLine label="FFmpeg" ok={system?.ffmpeg?.found} value={system?.ffmpeg?.version?.split(' Copyright')[0] || 'Không tìm thấy'} />
        <SystemLine label="Codex CLI" ok={system?.codex?.found} value={system?.codex?.version || 'Không tìm thấy'} />
        <SystemLine label="Node" ok={system?.node?.found} value={system?.node?.version || 'Không tìm thấy'} />
        <SystemLine label="Ổ đĩa trống" ok={Boolean(system?.diskAvailableGb)} value={system?.diskAvailableGb ? `${system.diskAvailableGb} GB` : 'Không xác định'} />
      </div></section>
    </div>
  </div>;
}

function SystemLine({ label, ok, value }: { label: string; ok: boolean; value: string }) { return <div className="system-line"><span className={ok ? 'dot ok' : 'dot bad'} /><strong>{label}</strong><span title={value}>{value}</span></div>; }
function SkeletonRows() { return <div className="skeleton-list">{[1, 2, 3].map((n) => <div key={n} className="skeleton" />)}</div>; }
function ProjectRow({ project }: { project: Project }) { return <Link className="project-row" to={`/projects/${project.id}`}><div className="project-icon"><Video size={18} /></div><div className="project-copy"><strong>{project.name}</strong><span>{project.currentStep} · cập nhật {fmtDate(project.modifiedAt)}</span></div><div className="row-progress"><span style={{ width: `${project.progress}%` }} /></div><span className="percent">{project.progress}%</span><StatusBadge status={project.status} /><ChevronRight size={17} className="chevron" /></Link>; }

type Tab = 'pipeline' | 'logs' | 'files' | 'preview' | 'qa';
function ProjectPage() {
  const { id = '' } = useParams(); const navigate = useNavigate();
  const [project, setProject] = useState<Project>(); const [files, setFiles] = useState<FileItem[]>([]); const [qa, setQa] = useState<QAResult>();
  const [tab, setTab] = useState<Tab>('pipeline'); const [runFrom, setRunFrom] = useState<StepId>('openmontage'); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const refresh = useCallback(async () => { try { const [p, f] = await Promise.all([api<Project>(`/api/projects/${id}`), api<FileItem[]>(`/api/projects/${id}/files`)]); setProject(p); setFiles(f); } catch (e) { setError((e as Error).message); } }, [id]);
  useEffect(() => { refresh(); }, [refresh]); useStudioEvents(refresh);
  const action = async (kind: 'run' | 'run-from' | 'stop') => { setBusy(true); setError(''); try { await post(`/api/projects/${id}/${kind}`, kind === 'run-from' ? { step: runFrom } : undefined); await refresh(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } };
  const checkQA = async (decode = false) => { setBusy(true); setError(''); try { setQa(await api<QAResult>(`/api/projects/${id}/qa${decode ? '?decode=1' : ''}`)); setTab('qa'); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } };
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.ctrlKey || event.metaKey || event.altKey || ['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement).tagName)) return; if (event.key.toLowerCase() === 'r') refresh(); if (event.key === 'Enter') action('run'); if (event.key === 'Escape' && project?.process?.status === 'running') action('stop'); if (event.key.toLowerCase() === 'l') setTab('logs'); if (event.key.toLowerCase() === 'p') setTab('preview'); };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  }, [project?.process?.status, refresh]);
  if (!project) return <div className="page"><PageHead eyebrow="Project" title="Đang tải…" /><SkeletonRows /></div>;
  const running = project.process?.status === 'running' || project.process?.status === 'detached';
  return <div className="page"><PageHead eyebrow={`Project · ${project.pipelineType ?? 'filesystem'}`} title={project.name} actions={<>
    <button className="btn primary" disabled={busy || running} onClick={() => action('run')} title="Phím Enter"><Play size={16} />Run pipeline <kbd>↵</kbd></button>
    <button className="btn danger" disabled={!running || busy} onClick={() => action('stop')} title="Phím Esc"><Square size={15} />Stop <kbd>Esc</kbd></button>
    <button className="btn secondary icon-btn" aria-label="Mở thư mục project" onClick={() => post(`/api/projects/${id}/reveal`)} title="Mở thư mục"><FolderOpen size={17} /></button>
    <button className="btn secondary icon-btn" aria-label="Làm mới" onClick={refresh} title="Làm mới (R)"><RefreshCw size={17} /></button>
  </>} />
    {error && <div className="alert"><AlertCircle size={18} /><div><strong>Không thể thực hiện</strong><span>{error}</span></div><button aria-label="Đóng" onClick={() => setError('')}><XCircle size={17} /></button></div>}
    <PipelineStepper steps={project.steps} />
    <div className="run-strip"><label htmlFor="run-from">Chạy từ bước</label><select id="run-from" value={runFrom} onChange={(e) => setRunFrom(e.target.value as StepId)}>{project.steps.filter((s) => s.actionable).map((s) => <option value={s.id} key={s.id}>{s.name}</option>)}</select><button className="btn secondary" disabled={busy || running} onClick={() => action('run-from')}><Play size={15} />Chạy từ đây</button><span className="run-note">Các bước nội dung dùng Codex agent; Render/FFmpeg/QA chạy tool local trực tiếp.</span></div>
    <div className="tabs" role="tablist" aria-label="Chi tiết project">{(['pipeline', 'logs', 'files', 'preview', 'qa'] as Tab[]).map((item) => <button role="tab" aria-selected={tab === item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)} key={item}>{item === 'pipeline' && <Gauge size={16} />}{item === 'logs' && <Terminal size={16} />}{item === 'files' && <Folder size={16} />}{item === 'preview' && <MonitorPlay size={16} />}{item === 'qa' && <CheckCircle2 size={16} />}{item}</button>)}</div>
    {tab === 'pipeline' && <ProcessPanel process={project.process} project={project} onLogs={() => setTab('logs')} />}
    {tab === 'logs' && <LogsPanel process={project.process} projectId={id} />}
    {tab === 'files' && <FilesPanel files={files} projectId={id} />}
    {tab === 'preview' && <PreviewPanel project={project} onQA={() => checkQA(false)} />}
    {tab === 'qa' && <QAPanel qa={qa} busy={busy} onCheck={() => checkQA(false)} onDecode={() => checkQA(true)} />}
    <button className="back-link" onClick={() => navigate('/')}><ChevronRight size={16} />Về tổng quan</button>
  </div>;
}

function PipelineStepper({ steps }: { steps: Project['steps'] }) { return <section className="pipeline-stepper" aria-label="Tiến trình pipeline">{steps.map((step, index) => <div className={`pipeline-step ${step.status}`} key={step.id}><div className="step-node"><StatusIcon status={step.status} /></div><div className="step-copy"><span>{String(index + 1).padStart(2, '0')}</span><strong>{step.name}</strong><small>{step.status}</small></div>{index < steps.length - 1 && <div className="step-line" />}</div>)}</section>; }

function ProcessPanel({ process, project, onLogs }: { process?: ProcessState; project: Project; onLogs: () => void }) {
  const [now, setNow] = useState(Date.now()); useEffect(() => { if (process?.status !== 'running') return; const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [process?.status]);
  if (!process || process.status === 'idle') return <section className="panel empty"><Activity size={24} /><strong>Chưa có tiến trình</strong><span>Chọn bước và nhấn “Chạy từ đây”, hoặc chạy toàn bộ pipeline.</span></section>;
  const duration = elapsed(process.startedAt, process.endedAt ? Date.parse(process.endedAt) : now);
  return <section className="panel"><div className="panel-head"><div><span className="eyebrow">Current process</span><h2>{process.label ?? process.step}</h2></div><StatusBadge status={process.status} /></div>
    <div className="metrics"><Metric label="Elapsed" value={fmtTime(duration)} /><Metric label="Progress" value={process.progress !== undefined ? `${process.progress.toFixed(1)}%` : 'Đang xử lý…'} /><Metric label="Workers" value={String(process.step === 'remotion' ? 'theo cài đặt' : '—')} /><Metric label="Output" value={project.output?.name ?? 'Chưa có'} /></div>
    {process.progress !== undefined ? <div className="progress large"><span style={{ width: `${process.progress}%` }} /></div> : process.status === 'running' ? <div className="indeterminate" /> : null}
    {process.currentFrame && process.totalFrames ? <p className="frame-readout">Frame {process.currentFrame.toLocaleString()} / {process.totalFrames.toLocaleString()}</p> : null}
    {process.error && <div className="error-box"><strong>Process failed</strong><p>{process.error}</p></div>}
    <button className="text-button" onClick={onLogs}>Xem log đầy đủ <ChevronRight size={15} /></button>
  </section>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="metric"><span>{label}</span><strong title={value}>{value}</strong></div>; }

function LogsPanel({ process, projectId }: { process?: ProcessState; projectId: string }) {
  const [query, setQuery] = useState(''); const [auto, setAuto] = useState(true); const [hidden, setHidden] = useState<number[]>([]); const bottom = useRef<HTMLDivElement>(null);
  const logs = (process?.logs ?? []).filter((line) => !hidden.includes(line.id) && line.message.toLowerCase().includes(query.toLowerCase()));
  useEffect(() => { if (auto) bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs.length, auto]);
  const copy = () => navigator.clipboard.writeText(logs.map((l) => `[${l.timestamp}] ${l.message}`).join('\n'));
  return <section className="terminal-panel"><div className="terminal-tools"><label className="search"><Search size={15} /><span className="sr-only">Tìm log</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm trong log…" /></label><button onClick={() => setAuto(!auto)}><Pause size={15} />Auto-scroll: {auto ? 'On' : 'Off'}</button><button onClick={copy}><Copy size={15} />Copy</button><button onClick={() => setHidden((process?.logs ?? []).map((l) => l.id))}><XCircle size={15} />Clear view</button><a href={`/api/projects/${projectId}/logs?download=1`}><Download size={15} />Download</a></div><div className="terminal" role="log" aria-live="polite">{logs.length ? logs.map((line) => <div className={`log-line ${line.level}`} key={line.id}><time>{new Date(line.timestamp).toLocaleTimeString('vi-VN')}</time><span className="stream">{line.stream}</span><pre>{line.message}</pre></div>) : <div className="terminal-empty">Chưa có log cho project này.</div>}<div ref={bottom} /></div></section>;
}

function FilesPanel({ files, projectId }: { files: FileItem[]; projectId: string }) {
  const important = files.filter((f) => f.type === 'directory' || /\.(json|md|srt|mp4|mov|wav|mp3)$/i.test(f.name));
  const icon = (f: FileItem) => f.type === 'directory' ? <Folder size={17} /> : f.name.endsWith('.json') ? <FileJson size={17} /> : /\.(mp4|mov)$/i.test(f.name) ? <Video size={17} /> : /\.(md|srt)$/i.test(f.name) ? <FileText size={17} /> : <File size={17} />;
  return <section className="table-wrap"><table><thead><tr><th>Tên</th><th>Loại</th><th>Kích thước</th><th>Cập nhật</th><th><span className="sr-only">Hành động</span></th></tr></thead><tbody>{important.map((file) => <tr key={file.relativePath}><td><span className="file-name">{icon(file)}<span>{file.relativePath}</span></span></td><td>{file.type === 'directory' ? 'Thư mục' : file.name.split('.').pop()?.toUpperCase()}</td><td>{file.type === 'file' ? fmtBytes(file.size) : '—'}</td><td>{fmtDate(file.modifiedAt)}</td><td><div className="row-actions">{file.type === 'file' && <button title="Mở" aria-label={`Mở ${file.name}`} onClick={() => post(`/api/projects/${projectId}/open`, { path: file.relativePath })}><ExternalLink size={15} /></button>}<button title="Copy path" aria-label={`Copy path ${file.name}`} onClick={() => navigator.clipboard.writeText(file.relativePath)}><Clipboard size={15} /></button><button title="Hiện trong Explorer" aria-label={`Hiện ${file.name} trong Explorer`} onClick={() => post(`/api/projects/${projectId}/reveal`, { path: file.relativePath })}><FolderOpen size={15} /></button></div></td></tr>)}</tbody></table></section>;
}

function PreviewPanel({ project, onQA }: { project: Project; onQA: () => void }) {
  if (!project.output) return <section className="panel empty"><MonitorPlay size={26} /><strong>Chưa có video để xem</strong><span>Final chỉ xuất hiện khi file MP4 thực sự tồn tại.</span></section>;
  const src = `/api/projects/${project.id}/media?path=${encodeURIComponent(project.output.relativePath)}`;
  return <section className="preview-grid"><div className="video-stage"><video controls preload="metadata" src={src} /></div><aside className="preview-info"><span className="eyebrow">Final output</span><h2>{project.output.name}</h2><dl><dt>Đường dẫn</dt><dd>{project.output.relativePath}</dd><dt>Kích thước</dt><dd>{fmtBytes(project.output.size)}</dd><dt>Cập nhật</dt><dd>{fmtDate(project.output.modifiedAt)}</dd></dl><div className="stack-actions"><button className="btn primary" onClick={() => post(`/api/projects/${project.id}/open`, { path: project.output?.relativePath })}><ExternalLink size={16} />Mở video</button><button className="btn secondary" onClick={() => post(`/api/projects/${project.id}/reveal`, { path: project.output?.relativePath })}><FolderOpen size={16} />Hiện trong Explorer</button><button className="btn secondary" onClick={() => navigator.clipboard.writeText(project.path + '\\' + project.output?.relativePath.replaceAll('/', '\\'))}><Copy size={16} />Copy path</button><button className="btn secondary" onClick={onQA}><Check size={16} />Đọc metadata</button></div></aside></section>;
}

function QAPanel({ qa, busy, onCheck, onDecode }: { qa?: QAResult; busy: boolean; onCheck: () => void; onDecode: () => void }) {
  if (!qa) return <section className="panel empty"><CheckCircle2 size={26} /><strong>Chưa chạy QA trong phiên này</strong><span>Metadata dùng FFprobe; kiểm tra sâu sẽ giải mã toàn bộ video bằng FFmpeg.</span><div className="inline-actions"><button className="btn primary" disabled={busy} onClick={onCheck}>Kiểm tra nhanh</button><button className="btn secondary" disabled={busy} onClick={onDecode}>Kiểm tra sâu</button></div></section>;
  return <section className="panel"><div className="qa-head"><div><span className="eyebrow">Quality assurance</span><h2>QA result</h2></div><span className={`qa-score ${qa.overall.toLowerCase()}`}>{qa.overall}</span></div><div className="qa-grid">{qa.checks.map((check) => <div className="qa-check" key={check.id}>{check.pass ? <CheckCircle2 size={18} /> : <XCircle size={18} />}<div><strong>{check.label}</strong><span>{check.value}</span></div></div>)}</div><div className="inline-actions"><button className="btn secondary" disabled={busy} onClick={onCheck}><RefreshCw size={15} />Chạy lại</button><button className="btn secondary" disabled={busy} onClick={onDecode}><Film size={15} />Giải mã toàn bộ</button></div></section>;
}

function SettingsPage() {
  const [value, setValue] = useState<StudioConfig>(); const [validation, setValidation] = useState<Record<string, boolean>>({}); const [message, setMessage] = useState('');
  useEffect(() => { api<{ value: StudioConfig; validation: Record<string, boolean> }>('/api/settings').then((data) => { setValue(data.value); setValidation(data.validation); }); }, []);
  if (!value) return <div className="page"><PageHead eyebrow="Local configuration" title="Cài đặt" /><SkeletonRows /></div>;
  const set = (key: keyof StudioConfig, next: any) => setValue({ ...value, [key]: next });
  const browse = async (key: 'projectsDirectory' | 'openMontagePath' | 'remotionPath') => { const result = await post<{ path: string }>('/api/settings/browse'); if (result.path) set(key, result.path); };
  const save = async () => { const result = await put<{ value: StudioConfig; validation: Record<string, boolean> }>('/api/settings', value); setValue(result.value); setValidation(result.validation); setMessage('Đã lưu. Danh sách project đã dùng cấu hình mới.'); setTimeout(() => setMessage(''), 4000); };
  return <div className="page narrow"><PageHead eyebrow="Local configuration" title="Cài đặt" actions={<button className="btn primary" onClick={save}><Check size={16} />Lưu thay đổi</button>} />{message && <div className="success-toast" role="status"><CheckCircle2 size={17} />{message}</div>}
    <SettingsSection title="General" description="Nơi Studio tìm các video project trên máy."><PathField label="Projects Directory" value={value.projectsDirectory} found={validation.projectsDirectory} onChange={(v) => set('projectsDirectory', v)} onBrowse={() => browse('projectsDirectory')} /></SettingsSection>
    <SettingsSection title="Runtime" description="Port ưu tiên; nếu bận, Studio tự chọn port tiếp theo."><div className="form-grid"><Field label="Preferred port"><input type="number" value={value.preferredPort} onChange={(e) => set('preferredPort', Number(e.target.value))} /></Field><Field label="Auto fallback"><label className="switch"><input type="checkbox" checked={value.autoFallback} onChange={(e) => set('autoFallback', e.target.checked)} /><span />{value.autoFallback ? 'Bật' : 'Tắt'}</label></Field></div></SettingsSection>
    <SettingsSection title="Render" description="Giá trị mặc định cho render local."><div className="form-grid four"><Field label="Width"><input type="number" value={value.render.width} onChange={(e) => set('render', { ...value.render, width: Number(e.target.value) })} /></Field><Field label="Height"><input type="number" value={value.render.height} onChange={(e) => set('render', { ...value.render, height: Number(e.target.value) })} /></Field><Field label="FPS"><input type="number" value={value.render.fps} onChange={(e) => set('render', { ...value.render, fps: Number(e.target.value) })} /></Field><Field label="Workers"><input type="number" value={value.render.workers} onChange={(e) => set('render', { ...value.render, workers: Number(e.target.value) })} /></Field></div></SettingsSection>
    <SettingsSection title="Tools" description="Các executable được backend gọi trực tiếp, không qua shell."><PathField label="OpenMontage path" value={value.openMontagePath} found={validation.openMontagePath} onChange={(v) => set('openMontagePath', v)} onBrowse={() => browse('openMontagePath')} /><PathField label="Remotion path" value={value.remotionPath} found={validation.remotionPath} onChange={(v) => set('remotionPath', v)} onBrowse={() => browse('remotionPath')} /><div className="form-grid"><Field label="FFmpeg"><input value={value.ffmpegPath} onChange={(e) => set('ffmpegPath', e.target.value)} /></Field><Field label="FFprobe"><input value={value.ffprobePath} onChange={(e) => set('ffprobePath', e.target.value)} /></Field><Field label="Python"><input value={value.pythonPath} onChange={(e) => set('pythonPath', e.target.value)} /></Field><Field label="Codex CLI"><input value={value.codexPath} onChange={(e) => set('codexPath', e.target.value)} /></Field></div><div className="free-lock"><CheckCircle2 size={17} /><span><strong>Free-only guard</strong> đang bật. Prompt gửi tới Codex cấm provider/API trả phí.</span></div></SettingsSection>
  </div>;
}
function SettingsSection({ title, description, children }: { title: string; description: string; children: ReactNode }) { return <section className="settings-section"><div><h2>{title}</h2><p>{description}</p></div><div className="settings-fields">{children}</div></section>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
function PathField({ label, value, found, onChange, onBrowse }: { label: string; value: string; found?: boolean; onChange: (v: string) => void; onBrowse: () => void }) { return <Field label={label}><div className="path-input"><input value={value} onChange={(e) => onChange(e.target.value)} /><span className={found ? 'found' : 'missing'}>{found ? <Check size={15} /> : <AlertCircle size={15} />}{found ? 'Found' : 'Missing'}</span><button type="button" onClick={onBrowse}><FolderOpen size={16} />Browse</button></div></Field>; }

export default function App() { return <Shell><Routes><Route path="/" element={<HomePage />} /><Route path="/projects/:id" element={<ProjectPage />} /><Route path="/settings" element={<SettingsPage />} /></Routes></Shell>; }
