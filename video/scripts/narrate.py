"""Generate English neural narration and word-timed captions for each scene.

Run from video/: .venv/bin/python scripts/narrate.py
The script text is sent to Microsoft Edge's online speech service via edge-tts.
"""
import asyncio
import json
import re
import subprocess
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parents[1]
VOICE = "en-US-AriaNeural"

async def main():
    story = json.loads((ROOT / "src/story.json").read_text())
    output = ROOT / "public/audio"
    output.mkdir(parents=True, exist_ok=True)
    timing = []
    for scene in story:
        target = output / f"{scene['id']}.mp3"
        words_file = output / f"{scene['id']}.json"
        metadata_file = output / f"{scene['id']}.meta.json"
        metadata = {'text': scene['narration'], 'voice': VOICE, 'rate': '+0%'}
        if target.exists() and words_file.exists() and metadata_file.exists() and json.loads(metadata_file.read_text()) == metadata:
            words = json.loads(words_file.read_text())
        else:
            words = []
            speech = edge_tts.Communicate(scene['narration'], VOICE, rate="+0%", boundary="WordBoundary")
            with target.open("wb") as audio:
                async for chunk in speech.stream():
                    if chunk['type'] == 'audio':
                        audio.write(chunk['data'])
                    elif chunk['type'] == 'WordBoundary':
                        words.append({'text': chunk['text'], 'start': chunk['offset'] / 10_000_000, 'end': (chunk['offset'] + chunk['duration']) / 10_000_000})
            tokens = scene['narration'].split()
            normalize = lambda text: re.sub(r'\W', '', text).lower()
            if len(tokens) != len(words) or any(normalize(token) != normalize(word['text']) for token, word in zip(tokens, words)):
                raise RuntimeError(f"Unexpected word alignment for {scene['id']}")
            for word, token in zip(words, tokens):
                word['text'] = token
            words_file.write_text(json.dumps(words, indent=2))
            metadata_file.write_text(json.dumps(metadata, indent=2))
        duration = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', str(target)]))
        scene_frames = round((duration + 1.4) * 30)
        timing.append({'id': scene['id'], 'audioDuration': duration, 'frames': scene_frames, 'words': words})
        print(f"{scene['id']}: {duration:.2f}s / scene {scene_frames / 30:.2f}s", flush=True)
    total = sum(item['frames'] for item in timing)
    if total >= 180 * 30:
        raise RuntimeError(f'Video is too long: {total / 30:.1f}s')
    (ROOT / 'src/timing.json').write_text(json.dumps(timing, indent=2))
    print(f'Total: {total / 30:.2f}s; voice: {VOICE}', flush=True)

asyncio.run(main())
