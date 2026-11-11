import { spawn } from 'node:child_process';
import fs from 'node:fs';
import type { QAResult, StudioConfig } from './types.js';

function capture(command: string, args: string[], cwd?: string): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: false, windowsHide: true });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

const ratio = (value?: string) => {
  if (!value) return undefined;
  const [a, b] = value.split('/').map(Number);
  return b ? a / b : a;
};

export async function inspectVideo(file: string, config: StudioConfig, decode = false): Promise<QAResult> {
  if (!fs.existsSync(file)) throw new Error('File video không tồn tại.');
  const probe = await capture(config.ffprobePath, ['-v', 'error', '-show_streams', '-show_format', '-count_frames', '-of', 'json', file]);
  if (probe.code !== 0) throw new Error(probe.stderr || 'FFprobe không đọc được file.');
  const data = JSON.parse(probe.stdout);
  const video = data.streams?.find((stream: { codec_type: string }) => stream.codec_type === 'video');
  const audio = data.streams?.find((stream: { codec_type: string }) => stream.codec_type === 'audio');
  const metadata = {
    width: video?.width as number | undefined,
    height: video?.height as number | undefined,
    fps: ratio(video?.avg_frame_rate),
    duration: Number(data.format?.duration || video?.duration || 0),
    codec: video?.codec_name as string | undefined,
    frames: Number(video?.nb_read_frames || video?.nb_frames || 0) || undefined,
    hasAudio: Boolean(audio),
    size: Number(data.format?.size || fs.statSync(file).size),
  };
  let decodeResult: QAResult['decode'];
  if (decode) {
    const sink = process.platform === 'win32' ? 'NUL' : '/dev/null';
    const checked = await capture(config.ffmpegPath, ['-v', 'error', '-i', file, '-f', 'null', sink]);
    decodeResult = { pass: checked.code === 0, message: checked.code === 0 ? 'FFmpeg giải mã toàn bộ file thành công.' : (checked.stderr.trim() || `Exit ${checked.code}`) };
  }
  const checks = [
    { id: 'exists', label: 'File tồn tại', pass: true, value: file },
    { id: 'resolution', label: 'Độ phân giải', pass: Boolean(metadata.width && metadata.height), value: `${metadata.width ?? '?'}×${metadata.height ?? '?'}` },
    { id: 'fps', label: 'Tốc độ khung hình', pass: Boolean(metadata.fps), value: metadata.fps ? `${metadata.fps.toFixed(2)} FPS` : 'Không xác định' },
    { id: 'duration', label: 'Thời lượng', pass: metadata.duration > 0, value: `${metadata.duration.toFixed(2)} giây` },
    { id: 'codec', label: 'Video codec', pass: Boolean(metadata.codec), value: metadata.codec?.toUpperCase() ?? 'Không xác định' },
    { id: 'frames', label: 'Số khung hình', pass: Boolean(metadata.frames), value: metadata.frames?.toLocaleString('vi-VN') ?? 'Không xác định' },
    { id: 'audio', label: 'Âm thanh', pass: true, value: metadata.hasAudio ? 'Có' : 'Không có' },
    ...(decodeResult ? [{ id: 'decode', label: 'Giải mã FFmpeg', pass: decodeResult.pass, value: decodeResult.message }] : []),
  ];
  return { overall: checks.every((check) => check.pass) ? 'PASS' : 'FAIL', checkedAt: new Date().toISOString(), file, checks, metadata, decode: decodeResult };
}
