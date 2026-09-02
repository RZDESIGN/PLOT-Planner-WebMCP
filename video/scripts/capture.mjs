// Replays the real anonymous PLOT UI and its existing WebMCP test bridge.
// Requires the app running at PLOT_DEMO_URL (default http://localhost:5173).
// This is a tool-handler demonstration, not a recording of an external agent.
import {execFileSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const output = resolve(root, 'output/playwright/remotion-review');
const session = `plot-remotion-${Date.now()}`;
const url = process.env.PLOT_DEMO_URL ?? 'http://localhost:5173';
const log = [];
mkdirSync(output, {recursive:true});
const cli = (...args) => {
  const result = execFileSync('npx',['--yes','--package','@playwright/cli@0.1.19','playwright-cli',`-s=${session}`,...args],{cwd:root,encoding:'utf8',timeout:60000});
  log.push({args,result});
  if (result.includes('### Error')) throw new Error(result);
  return result;
};
const run = code => cli('run-code', `async (page) => { ${code} }`);
const record = (id, code) => {
  cli('video-start',resolve(output,`${id}.webm`),'--size=1600x900');
  run(code);
  cli('video-stop');
  console.log(`Captured ${id}`, {url});
};
try {
  cli('open',url);
  cli('resize','1600','900');
  run('await page.waitForTimeout(2000);');
  cli('snapshot');
  const baseline = cli('eval','async () => ({board:(await window.__PLOT_WEBMCP_TEST__.execute("plot.get_board")).structuredContent,analysis:(await window.__PLOT_WEBMCP_TEST__.execute("plot.analyze_board")).structuredContent})');
  if (!baseline.includes('"guest"') || !baseline.includes('"focusScore": 69')) throw new Error('Expected anonymous activation template with focus score 69.');
  cli('screenshot',`--filename=${resolve(root,'video/public/media/board.png')}`);
  record('problem', 'await page.waitForTimeout(17000);');
  record('observe', `await page.waitForTimeout(800);
    await page.getByRole('button',{name:'Open PLOT Sidekick'}).click();
    await page.evaluate(async () => { await window.__PLOT_WEBMCP_TEST__.execute('plot.get_board'); await window.__PLOT_WEBMCP_TEST__.execute('plot.analyze_board'); });
    await page.waitForTimeout(19500);`);
  cli('snapshot');
  run("await page.getByRole('button',{name:'Close sidekick'}).click();");
  record('shape', `await page.waitForTimeout(2600);
    await page.evaluate(async () => await window.__PLOT_WEBMCP_TEST__.execute('plot.create_sticky_note',{content:'Invite clarity\\nCustomers need a clearer invitation step.',color:'blue',x:-220,y:470}));
    await page.waitForTimeout(5500);
    await page.evaluate(async () => await window.__PLOT_WEBMCP_TEST__.execute('plot.convert_sticky_to_card',{note:'Invite clarity',column:'Inbox',position:0}));
    await page.waitForTimeout(10200);`);
  record('propose', `await page.getByRole('button',{name:'Open PLOT Sidekick'}).click();
    await page.waitForTimeout(1600);
    await page.evaluate(async () => { window.__plotBeforeProposal = JSON.stringify((await window.__PLOT_WEBMCP_TEST__.execute('plot.get_board')).structuredContent); await window.__PLOT_WEBMCP_TEST__.execute('plot.propose_sprint'); });
    await page.waitForTimeout(9200);
    await page.evaluate(async () => { await window.__PLOT_WEBMCP_TEST__.execute('plot.dismiss_proposal'); window.__plotDismissUnchanged = window.__plotBeforeProposal === JSON.stringify((await window.__PLOT_WEBMCP_TEST__.execute('plot.get_board')).structuredContent); });
    await page.waitForTimeout(10000);`);
  record('apply', `await page.waitForTimeout(700);
    await page.evaluate(async () => await window.__PLOT_WEBMCP_TEST__.execute('plot.propose_sprint'));
    await page.waitForTimeout(2200);
    await page.evaluate(async () => await window.__PLOT_WEBMCP_TEST__.execute('plot.apply_proposal'));
    await page.waitForTimeout(20000);`);
  const result = cli('eval','async () => ({dismissUnchanged:window.__plotDismissUnchanged,analysis:(await window.__PLOT_WEBMCP_TEST__.execute("plot.analyze_board")).structuredContent,board:(await window.__PLOT_WEBMCP_TEST__.execute("plot.get_board")).structuredContent})');
  if (!result.includes('"dismissUnchanged": true') || !result.includes('"focusScore": 92')) throw new Error('Expected unchanged dismissed proposal and applied focus 92.');
  cli('screenshot',`--filename=${resolve(root,'video/public/media/applied.png')}`);
} finally {
  writeFileSync(resolve(output,'capture-log.json'),JSON.stringify(log,null,2));
  cli('close');
}
