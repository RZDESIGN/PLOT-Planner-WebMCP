import {execFileSync} from 'node:child_process';
import {renameSync, writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const input = resolve(root,'output/playwright/plot-devpost-remotion.mp4');
const temp = resolve(root,'output/playwright/remotion-review/normalized.mp4');
// Preserve the rendered picture and normalize only the speech track.
execFileSync('ffmpeg',[
  '-y','-hide_banner','-loglevel','error','-i',input,
  '-map','0:v:0','-map','0:a:0','-c:v','copy',
  '-af','loudnorm=I=-16:TP=-1.5:LRA=11','-ar','48000','-c:a','aac','-b:a','192k',
  '-movflags','+faststart',temp,
],{stdio:'inherit'});
const probe = JSON.parse(execFileSync('ffprobe',[
  '-v','error','-show_entries','format=duration,size:stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels',
  '-of','json',temp,
],{encoding:'utf8'}));
const video = probe.streams.find(s=>s.codec_type==='video');
const audio = probe.streams.find(s=>s.codec_type==='audio');
if (!video || video.width!==1920 || video.height!==1080 || video.r_frame_rate!=='30/1' || !audio || Number(probe.format.duration)>=180) {
  throw new Error('Final output does not match the required video properties.');
}
renameSync(temp,input);
writeFileSync(resolve(root,'output/playwright/remotion-review/final-metadata.json'),JSON.stringify(probe,null,2));
console.log(`Normalized narration; verified 1080p/30fps and audio; ${probe.format.duration}s.`);
