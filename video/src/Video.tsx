import React from 'react';
import {
  AbsoluteFill, Audio, Img, OffthreadVideo, Sequence,
  interpolate, spring, staticFile, useCurrentFrame,
} from 'remotion';
import story from './story.json';
import timing from './timing.json';
import './style.css';

type Scene = typeof story[number];
type Timing = typeof timing[number];
const ink = '#171816';
const lime = '#d9ff57';
const purple = '#ddd3fc';
const easeOut = (v: number) => 1 - Math.pow(1 - v, 3);

function entrance(frame: number, delay = 0) {
  return spring({frame: frame - delay, fps: 30, config: {damping: 24, stiffness: 115, mass: 0.8}});
}

const Mark: React.FC<{light?: boolean; size?: number}> = ({light, size = 42}) => (
  <div style={{display:'flex', alignItems:'center', gap:14, color:light ? '#fff' : ink}}>
    <Img src={staticFile('favicon.svg')} style={{width:size, height:size}} />
    <span style={{fontSize:size * 0.68, fontWeight:750, letterSpacing:'-0.055em'}}>PLOT</span>
  </div>
);

const Captions: React.FC<{words: Timing['words']}> = ({words}) => {
  const frame = useCurrentFrame();
  const seconds = (frame - 15) / 30;
  // Keep phrases short and aligned to generated word timestamps.
  const groups: Timing['words'][] = [];
  let group: Timing['words'] = [];
  for (const word of words) {
    group.push(word);
    if (group.length >= 9 || /[.!?]$/.test(word.text)) {
      groups.push(group); group = [];
    }
  }
  if (group.length) groups.push(group);
  const active = groups.find((g, i) => seconds >= g[0].start && seconds < (groups[i+1]?.[0].start ?? g.at(-1)!.end + 0.25));
  if (!active) return null;
  return <div className="caption-wrap"><div className="caption">
    {active.map((word, i) => <span key={i} style={{color:seconds >= word.start && seconds <= word.end + .06 ? lime : '#fff'}}>{word.text}{i === active.length - 1 ? '' : ' '}</span>)}
  </div></div>;
};

const Cover: React.FC<{outro?: boolean}> = ({outro}) => {
  const f = useCurrentFrame();
  const enter = entrance(f);
  return <AbsoluteFill className={`cover${outro ? ' is-outro' : ''}`}>
    <div className="cover-dots" />
    <div style={{position:'absolute',left:100,top:76}}><Mark light size={68}/></div>
    <div className="cover-kicker">{outro ? 'PLAN TOGETHER' : 'THE WEBMCP CHALLENGE / 2026'}</div>
    <div className="cover-copy" style={{opacity:enter,transform:`translateY(${(1-enter)*28}px)`}}>
      <h1>{outro ? <>From advice<br/>to <span>shared<br/>action.</span></> : <>Plan<br/><span>together.</span></>}</h1>
      <p>{outro ? 'Observe. Suggest. Act.' : 'People. Agents. One canvas.'}</p>
    </div>
    <div className="cover-preview" style={{transform:`translate(${(1-entrance(f,8))*100}px,${Math.sin(f/70)*7}px) rotate(-4deg)`,opacity:entrance(f,8)}}>
      <div className="preview-top"><i/><i/><i/><span>PLOT / {outro ? 'A plan you can act on' : 'A workspace you can shape'}</span></div>
      <Img src={staticFile(outro ? 'media/applied.png' : 'media/board.png')} style={{width:'100%',display:'block'}}/>
    </div>
    <div className="cover-chip chip-one" style={{transform:`translateY(${(1-entrance(f,16))*40}px) rotate(5deg)`,opacity:entrance(f,16)}}>{outro ? '13 / 13 points' : 'Human + agent'}<span>{outro ? 'A focused sprint' : 'One shared state'}</span></div>
    <div className="cover-chip chip-two" style={{transform:`translateY(${(1-entrance(f,22))*40}px) rotate(-5deg)`,opacity:entrance(f,22)}}>{outro ? 'Focus: 92' : 'Review first.'}<span>{outro ? 'Dependencies aligned' : 'Then make it happen.'}</span></div>
    <div className="cover-footer">{outro ? 'github.com/RZDESIGN/PLOT-Planner-WebMCP' : 'A shared planning canvas for humans and browser agents.'}</div>
  </AbsoluteFill>;
};

const Architecture: React.FC = () => {
  const f = useCurrentFrame();
  const blocks = [
    {title:'People', body:'Drag · edit · review', color:'#ffcee0'},
    {title:'WebMCP agents', body:'17 structured tools', color:purple},
  ];
  return <div className="architecture">
    <div className="source-row">{blocks.map((block, i) => <div key={block.title} className="arch-source" style={{background:block.color,opacity:entrance(f,i*8),transform:`translateY(${(1-entrance(f,i*8))*30}px)`}}><span>0{i+1}</span><strong>{block.title}</strong><p>{block.body}</p></div>)}</div>
    <div className="connectors"><i/><i/></div>
    <div className="shared-action" style={{opacity:entrance(f,16)}}><div><span>SHARED REACT ACTIONS</span><strong>Same validation. Same visible board.</strong></div><b>↗</b></div>
    <div className="arch-detail"><div><span>IN THE PAGE</span><code>document.modelContext.registerTool()</code><p>Structured inputs → typed actions → visible results</p></div><div><span>SIGNED-IN WORKSPACES</span><strong>Supabase</strong><p>Persistence · Realtime · Access control</p></div></div>
    <div className="architecture-footer">Deterministic planning logic · Built and refined with Codex</div>
  </div>;
};

const Demo: React.FC<{scene: Scene; frames: number}> = ({scene,frames}) => {
  const f = useCurrentFrame();
  const camera: Record<string, {scale: number; origin: string}> = {
    problem: {scale:1.24, origin:'51% 42%'},
    observe: {scale:1.42, origin:'100% 13%'},
    shape: {scale:1.24, origin:'8% 56%'},
    propose: {scale:1.13, origin:'65% 35%'},
    apply: {scale:1.13, origin:'61% 42%'},
  };
  const shot = camera[scene.id] ?? {scale:1,origin:'50% 50%'};
  const zoom = interpolate(f / frames,[0,.15,.28,.82,.96,1],[1,1,shot.scale,shot.scale,1,1],{easing:easeOut,extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  // Captures are deliberately longer than their scenes, so every exported
  // frame maps to a real source frame without looping an interaction.
  return <div className="screen-frame" style={{opacity:entrance(f,3),transform:`translateY(${(1-entrance(f,3))*18}px)`}}>
    <div className="screen-browser"><div className="window-dots"><i/><i/><i/></div><span>PLOT · Activation sprint</span><span className="capture-label">LOCAL DEMO · TOOL HANDLERS</span></div>
    <div style={{height:'calc(100% - 36px)',overflow:'hidden'}}><OffthreadVideo src={staticFile(`media/${scene.media}`)} muted style={{display:'block',width:'100%',height:'100%',objectFit:'contain',background:'#f6f8f9',transform:`scale(${zoom})`,transformOrigin:shot.origin}} /></div>
  </div>;
};

const SceneContent: React.FC<{scene: Scene; timing: Timing; index: number}> = ({scene,timing:t,index}) => {
  const f = useCurrentFrame();
  const fade = interpolate(f,[0,9,t.frames-9,t.frames],[0,1,1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:easeOut});
  const cover = scene.kind === 'intro' || scene.kind === 'outro';
  return <AbsoluteFill style={{opacity:fade}}>
    {cover ? <Cover outro={scene.kind==='outro'}/> : <>
      <div className="eyebrow">{scene.eyebrow}</div>
      <div className="header-mark"><Mark size={38}/></div>
      <h2 className="scene-title" style={{opacity:entrance(f),transform:`translateY(${(1-entrance(f))*15}px)`}}>{scene.title}</h2>
      <div className="accent">{scene.accent}</div>
      {scene.kind === 'architecture' ? <Architecture/> : <Demo scene={scene} frames={t.frames}/>}
    </>}
    <Sequence from={15}><Audio src={staticFile(`audio/${scene.id}.mp3`)}/></Sequence>
    <Captions words={t.words}/>
    <div className="progress" style={{background:cover?'#ffffff20':'#17181615'}}><div style={{width:`${((index + f / t.frames) / story.length)*100}%`,background:cover?lime:ink}}/></div>
  </AbsoluteFill>;
};

export const PlotDemo: React.FC = () => {
  let start = 0;
  return <AbsoluteFill style={{background:'#f4f5f1',color:ink,fontFamily:'Geist, sans-serif'}}>
    {story.map((scene,index) => {
      const t = timing[index];
      const from = start;
      start += t.frames;
      return <Sequence key={scene.id} from={from} durationInFrames={t.frames}><SceneContent scene={scene} timing={t} index={index}/></Sequence>;
    })}
  </AbsoluteFill>;
};
