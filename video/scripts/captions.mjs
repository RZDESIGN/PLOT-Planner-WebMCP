import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve, dirname} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const timing = JSON.parse(readFileSync(resolve(root, 'src/timing.json'), 'utf8'));
const output = resolve(root, '../output/playwright');
const stamp = (seconds) => {
  const millis = Math.round(seconds * 1000);
  return `${Math.floor(millis / 3600000).toString().padStart(2,'0')}:${Math.floor(millis / 60000 % 60).toString().padStart(2,'0')}:${Math.floor(millis / 1000 % 60).toString().padStart(2,'0')},${(millis % 1000).toString().padStart(3,'0')}`;
};
let start = 0;
let count = 0;
const entries = [];
for (const scene of timing) {
  let group = [];
  const flush = () => {
    if (!group.length) return;
    entries.push(`${++count}\n${stamp(start + .5 + group[0].start)} --> ${stamp(start + .5 + group.at(-1).end)}\n${group.map(w=>w.text).join(' ')}\n`);
    group = [];
  };
  for (const word of scene.words) {
    group.push(word);
    if (group.length >= 9 || /[.!?]$/.test(word.text)) flush();
  }
  flush();
  start += scene.frames / 30;
}
mkdirSync(output,{recursive:true});
writeFileSync(resolve(output, 'plot-devpost-remotion.en.srt'), entries.join('\n'));
console.log(`${count} caption cues; ${start.toFixed(2)} seconds`);
