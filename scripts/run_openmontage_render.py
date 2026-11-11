"""Thin, non-creative adapter from Studio to OpenMontage's existing VideoCompose tool."""
import argparse
import json
import sys
import subprocess
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--openmontage", required=True)
parser.add_argument("--project", required=True)
parser.add_argument("--width", type=int, default=720)
parser.add_argument("--height", type=int, default=1280)
parser.add_argument("--workers", type=int, default=2)
args = parser.parse_args()

root = Path(args.openmontage).resolve()
project = Path(args.project).resolve()
sys.path.insert(0, str(root))

# Portable template projects share the Studio render action, without requiring
# the engine cut-schema props used by full pipeline productions.
if (project / 'artifacts' / 'scenes.json').exists():
    app_root = Path(__file__).resolve().parents[1]
    runner = app_root / 'scripts' / 'render-project.mjs'
    result = subprocess.run(['node', str(runner), project.name], cwd=app_root)
    raise SystemExit(result.returncode)

from tools.video.video_compose import VideoCompose  # noqa: E402

props_candidates = [
    project / "artifacts" / "remotion_props.json",
    project / "artifacts" / "remotion_props_footage.json",
]
props_path = next((item for item in props_candidates if item.exists()), None)
if not props_path:
    raise SystemExit("Không tìm thấy artifacts/remotion_props.json để render.")

with props_path.open("r", encoding="utf-8") as handle:
    props = json.load(handle)

output = project / "renders" / "studio_render.mp4"
print(f"STUDIO_STEP Remotion | props={props_path} | output={output}", flush=True)
result = VideoCompose().execute({
    "operation": "remotion_render",
    "composition_data": props,
    "output_path": str(output),
    "remotion_timeout_ms": 900000,
    "remotion_concurrency": args.workers,
    "render_width": args.width,
    "render_height": args.height,
})
print(json.dumps({"success": result.success, "error": result.error, "data": result.data}, ensure_ascii=False), flush=True)
if not result.success:
    raise SystemExit(1)
