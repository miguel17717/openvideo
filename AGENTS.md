# OpenVideo agent instructions

Read WORKFLOW.md and HANDOFF.md first. This repository is a reusable video production system, not one client deliverable. The user expects actual renders and file verification, not instructions alone.

The full engine lives in engine/. Read engine/AGENT_GUIDE.md and the applicable pipeline manifest/director skills before pipeline work. For user-facing preferences use the current user request first, then WORKFLOW.md. Existing user authorization persists: routine reversible edits, rendering and debugging do not need repeated approval.

Create each production in projects/<slug>/. Never hardcode another machine's home path. Resolve engine, composer and executables from config/local.json or repository-relative paths. Keep keys, customer assets, old outputs and conversation logs out of public Git.

Default: Vietnamese vertical 1080x1920, 30fps; Be Vietnam Pro; supplied clean assets; free stock/local tools; no narration or music unless requested. Verify important immigration claims against official sources. Do not infer nationality from appearance. Prefer stock metadata and geographic context matching the intended audience.

Use npm run project:new and project:render for the included portable template. Read templates/vertical-eight/scenes.json for the prop contract. Render through Remotion; verify with ffprobe and full ffmpeg decode. Log actual limitations and provider failures. Never substitute animated stills for promised real footage without clearly telling the user.
