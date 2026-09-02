# PLOT — Remotion demo

An editable English demo film for The WebMCP Challenge, with real PLOT screen recordings, generated narration, timed captions, and motion graphics that use PLOT's Geist typography and colors.

- Composition: `PlotDemo`, 1920 × 1080, 30 fps, approximately **2:16**.
- Voice: **en-US-AriaNeural**, generated with `edge-tts` using Microsoft Edge's online speech service.
- Narration is normalized toward -16 LUFS with a -1.5 dBTP limit; video is copied without another picture encode.
- MP4: `../output/playwright/plot-devpost-remotion.mp4`.
- English subtitles: `../output/playwright/plot-devpost-remotion.en.srt`.
- Preview image: `../output/playwright/remotion-review/poster.png`.

The reviewed video was published with the participant's authorization on September 2, 2026: [watch on YouTube](https://youtu.be/EtIJsp6dBow), on [@RicardoDeZoete](https://www.youtube.com/@RicardoDeZoete). The upload includes the PLOT poster, supplied English subtitles and an AI narration disclosure. YouTube's copyright check reported no problems. The local render scripts do not upload media or change a Devpost project.

## Edit and render

This directory has its own package and lockfile; the app's dependencies are independent.

```bash
cd video
npm ci
npm run studio
```

Edit `src/story.json` for the script and scene labels, `src/Video.tsx` for layouts and animation, and `src/style.css` for typography. Regenerate narration after editing the spoken text:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python scripts/narrate.py
node scripts/captions.mjs
npm run check
npm run render
```

`narrate.py` sends only the narration text to the speech service and caches audio by text, voice, and rate. It restores punctuation in the word-aligned captions and rejects a total duration of three minutes or more. Audio starts half a second into each scene. Generated audio and screen recordings are ignored by Git; regenerate them after cloning.

## Re-record the app

Start the app with `npm run dev` from the repository root. Then run the following from `video/` (requires Node, Python, and FFmpeg):

```bash
node scripts/capture.mjs
node scripts/prepare-media.mjs
npm run render
```

Set `PLOT_DEMO_URL` if the local server uses a different address. Capture uses a new isolated Playwright CLI session and checks for the anonymous demo before making changes. Every mutation is local to that demo. Raw clips and the capture log go under `output/playwright/remotion-review/`. `prepare-media.mjs` verifies every clip is long enough for its scene and converts it to H.264; the composition never loops an interaction.

## Storyboard

| Time | Scene | Visible proof |
| --- | --- | --- |
| 0:00–0:12 | Plan together | Actual board, PLOT identity |
| 0:12–0:27 | The planning problem | Signup flow is blocked; Email API is in Next |
| 0:27–0:46 | Observe | Sidekick, focus 69, 10/13 committed points |
| 0:46–1:03 | Shape | New loose note becomes an Inbox card |
| 1:03–1:22 | Suggest | Ghost plan appears; dismissal leaves board unchanged |
| 1:22–1:42 | Act | Reviewed changes land; focus 92 and 13/13 points |
| 1:42–2:05 | Implementation | Shared UI/tool actions, 17 tools, persistence architecture |
| 2:05–2:16 | Close | Applied board and public repository |

## Evidence and remaining review

The video records the real local React application. Tool operations use its existing `window.__PLOT_WEBMCP_TEST__` bridge, which invokes the same tool handlers registered by `useWebMcp`. The recordings are labeled **LOCAL DEMO · TOOL HANDLERS**. They do not establish that a real external agent discovered or invoked the tools through native WebMCP. The implementation diagram describes the existing signed-in Supabase architecture; no multi-user session is staged in this film.

The capture checks that dismissing a proposal leaves the board unchanged and that the accepted plan reaches a focus score of 92. A bug discovered during recording was corrected in `src/hooks/useBoard.ts`: resolving a proposal is allowed for writable roles, while the ordinary-mutation guard and viewer restriction remain in place. The app's 27 tests, lint, and production build passed after that fix.

The exported MP4 was decoded completely without errors: 4,087 video frames, 136.30 seconds, H.264 1920 × 1080 at 30 fps, AAC stereo at 48 kHz, 39.1 MB. Measured narration loudness is -16.0 LUFS and true peak -1.5 dBFS. All eight scenes were inspected in the final contact sheet, with full-size checks of the title, demo, analysis, architecture, and closing layouts. Machine-readable evidence is in `output/playwright/remotion-review/verified-flow.json` and `final-metadata.json`.

After recording, separate native WebMCP checks passed on September 2, 2026. Codex's in-app browser discovered all 17 page-defined tools on both localhost and `https://plotplanner.xyz/`. The public-origin check successfully read and analyzed the board, created and converted a sticky note, proposed a sprint and dismissed it without changing the live board. The final native apply check awaits approval of the specific proposed moves. These checks do not change the film's tool-handler recording provenance. See [production verification](../docs/PRODUCTION_VERIFICATION.md) for the full scope.

Publication details and the updated public description are recorded in `youtube-upload.md`. The final domain, `https://plotplanner.xyz/`, is live over HTTPS. Future edits can be rendered locally before deciding whether to replace the public demonstration.

References: [Remotion fundamentals](https://www.remotion.dev/docs/the-fundamentals), [rendering](https://www.remotion.dev/docs/render), [edge-tts](https://github.com/rany2/edge-tts), [challenge](https://webmcp.devpost.com/).
