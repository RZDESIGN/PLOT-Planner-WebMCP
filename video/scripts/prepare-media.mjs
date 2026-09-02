import {execFileSync} from 'node:child_process';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const captures = resolve(root, '../output/playwright/remotion-review');
const output = resolve(root, 'public/media');
mkdirSync(output,{recursive:true});
const timing = JSON.parse(readFileSync(resolve(root, 'src/timing.json'), 'utf8'));
const evidence = [];
for (const id of ['problem','observe','shape','propose','apply']) {
  const input = resolve(captures, `${id}.webm`);
  const target = resolve(output, `${id}.mp4`);
  execFileSync('ffmpeg',['-y','-hide_banner','-loglevel','error','-i',input,'-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-r','30','-movflags','+faststart',target],{stdio:'inherit'});
  const media = JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height,r_frame_rate','-of','json',target],{encoding:'utf8'}));
  const required = timing.find(scene=>scene.id===id).frames / 30;
  if (Number(media.format.duration) < required) throw new Error(`${id}: capture is shorter than narration scene (${required}s)`);
  evidence.push({id,input:`output/playwright/remotion-review/${id}.webm`,...media});
  console.log(`${id}: ${media.format.duration}s; required ${required.toFixed(2)}s`);
}
writeFileSync(resolve(captures,'media-validation.json'),JSON.stringify(evidence,null,2));
