import {createCanvas,loadImage,GlobalFonts} from '@napi-rs/canvas';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {drawPlayer,drawForest,drawGroundDetail} from '../src/lib/player-art.ts';
import {drawHarbor} from '../src/lib/harbor-art.ts';
import {drawWildlife} from '../src/lib/wildlife.ts';
import {IDLE,TREES,HARBOR,SEA_ROUTE,shipPosition,playerPose} from '../src/lib/player.ts';
const out=resolve(process.env.DEMO_OUT || '../proyecto/juego_movil_v3_dinamico');await mkdir(out,{recursive:true});
GlobalFonts.registerFromPath('C:/Windows/Fonts/arial.ttf','UI');GlobalFonts.registerFromPath('C:/Windows/Fonts/arialbd.ttf','Display');
const map=await loadImage('public/map.png'),tri=await loadImage('public/wildlife/triceratops-grazing.webp');
const phone=await loadImage('../proyecto/juego_movil_v2/CORTE_MOVIL.png');
const animals={};for(const n of ['deer','rabbit','chicken'])animals[n]=await loadImage(`public/wildlife/${n}-atlas.webp`);
const speed=Number(process.env.DEMO_SPEED || 1);
if(!Number.isFinite(speed)||speed<.7||speed>1.2)throw Error('Velocidad fuera del intervalo de montaje.');
const sourceDuration=31.2;
const c=createCanvas(1080,1920),ctx=c.getContext('2d'),fps=30,duration=sourceDuration/speed,frames=Math.ceil(duration*fps);
const ff=spawn('ffmpeg',['-y','-hide_banner','-loglevel','error','-f','rawvideo','-pixel_format','rgba','-video_size','1080x1920','-framerate',String(fps),'-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p',resolve(out,'IMAGEN_DINAMICA.mp4')],{stdio:['pipe','ignore','inherit']});ff.stdin.on('error',()=>{});
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>1-(1-clamp(x))**3,lerp=(a,b,t)=>a+(b-a)*t;
function text(s,y,size=66,color='#fff',x=540,font='Display'){ctx.font=`${size}px ${font}`;ctx.textAlign='center';ctx.fillStyle=color;ctx.shadowColor='#00131c';ctx.shadowBlur=13;ctx.fillText(s,x,y,920);ctx.shadowBlur=0;}
function box(x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function pill(s,x,y,w,color='#ffc466'){box(x-w/2,y,w,60,24,'#061c2deb');ctx.font='bold 26px UI';ctx.fillStyle=color;ctx.textAlign='center';ctx.fillText(s,x,y+40,w-24);}
function title(lines,t,begin=0){const e=ease((t-begin)/.28),dy=(1-e)*65;ctx.save();ctx.globalAlpha=e;lines.forEach((line,i)=>text(line,330+dy+i*91,84,i===lines.length-1?'#ffc466':'#fff'));ctx.restore();}
function bottom(lines,small=''){const y=1480;text(lines[0],y,65,'#a9ffe8');if(lines[1])text(lines[1],y+80,59);if(small)text(small,1660,27,'#e3eff0',540,'UI');}
function world(cx,cy,scale,t,actor=null,travel=null,angle=0,anchorY=985){
 ctx.save();ctx.translate(540,anchorY);ctx.rotate(angle);ctx.translate(-540,-anchorY);
 const screen=(x,y)=>({x:(x-cx)*scale+540,y:(y-cy)*scale+anchorY});
 const p=screen(0,0);ctx.drawImage(map,p.x,p.y,1600*scale,2000*scale);drawGroundDetail(ctx,screen,scale);drawWildlife(ctx,screen,scale,tri,t,animals);drawHarbor(ctx,screen,scale,t,1,travel!==null,0,0,travel??0);drawForest(ctx,screen,scale);
 if(travel!==null){
  const boat=shipPosition(0,travel);const a={...IDLE,to:{x:boat.x,y:boat.y-7},logs:0};drawPlayer(ctx,screen,scale*.7,a,t*1000,'Anónimo');
  ctx.lineWidth=2;ctx.strokeStyle='#e2fff59a';for(let i=1;i<8;i++){const b=shipPosition(0,Math.max(0,travel-i*130));const q=screen(b.x,b.y);ctx.globalAlpha=(1-i/8)*.6;ctx.beginPath();ctx.ellipse(q.x,q.y+10*scale,(8+i)*scale,3*scale,0,0,Math.PI*2);ctx.stroke();}ctx.globalAlpha=1;
 }
 if(actor)drawPlayer(ctx,screen,scale,actor,t*1000,'Anónimo');
 ctx.restore();return screen;
}
function chrome(t,section){
 const g=ctx.createLinearGradient(0,0,0,630);g.addColorStop(0,'#031321f5');g.addColorStop(.75,'#031321b0');g.addColorStop(1,'#03132100');ctx.fillStyle=g;ctx.fillRect(0,0,1080,630);
 const b=ctx.createLinearGradient(0,1330,0,1920);b.addColorStop(0,'#03132100');b.addColorStop(.28,'#031321d0');b.addColorStop(1,'#031321ff');ctx.fillStyle=b;ctx.fillRect(0,1330,1080,590);
 text('HISPANIA',120,37,'#ffc466');text(section,187,24,'#d2ece8',540,'UI');
 text('@paisde.seguidores',1765,32,'#ffc466');text('Demostración resumida · animaciones del juego',1823,22,'#a2c1c4',540,'UI');
 box(90,1858,900,5,2,'#274955');box(90,1858,Math.max(1,900*t/sourceDuration),5,2,'#70e0c1');
}
const cuts=[0,1.3,2.8,4.3,6.2,8.7,9.7,10.3,10.8,12.7,14.9,16.5,18.2,20.1,21.9,23.5,25.7,27.1,29.4];
const samples=[.65,1.9,3.8,7.6,9.3,10.5,12.1,15.4,17.3,19.1,22.7,26.8,30.1];let shot=0;const proof=[];
for(let f=0;f<frames;f++){
 const t=f/fps*speed;ctx.fillStyle='#0b293a';ctx.fillRect(0,0,1080,1920);
 let heading=[],section='',caption=[],note='',start=0;
 if(t<2.8){
  const at=3800+t*1000,a={...IDLE,kind:'chop',from:TREES[0],to:TREES[0],started:t*1000-at,duration:5500};
  if(t<1.3){world(560,1015,lerp(6.6,5.3,ease(t/1.3)),t,a,null,-.025+t*.025);}
  else {const q=ease((t-1.3)/1.5);world(lerp(560,800,q),lerp(1015,1080,q),lerp(5.3,1.1,q),t,null,null,.02*(1-q));}
  section='TU SIGUIENTE AVENTURA';heading=['TU MUÑECO','YA ESTÁ VIVO.'];caption=['¡Ahora juegas tú!'];
 }else if(t<6.2){
  const q=(t-2.8)/3.4,a={...IDLE,from:TREES[0],to:TREES[0]};world(545-q*16,1025+q*5,3.8+q*.8,t,a,null,Math.sin(q*2)*.018);
  section='ENTRA DESDE EL MÓVIL';heading=['TU MUÑECO.','TU AVENTURA.'];caption=[t<4.3?'Sin nick: Anónimo.':'Con tu nick vinculado a la sesión.'];start=2.8;
  // Brief actual UI example rather than holding a static phone for a whole shot.
  const reveal=ease((t-3.25)/.3),exit=1-ease((t-5.4)/.35),alpha=reveal*exit;
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(820+(1-reveal)*400,915);ctx.rotate(-.07+Math.sin(t*2)*.012);box(-170,-350,340,700,30,'#01121f');ctx.save();ctx.beginPath();ctx.roundRect(-158,-335,316,670,23);ctx.clip();ctx.drawImage(phone,-158,-335,316,670);ctx.restore();ctx.restore();
 }else if(t<8.7){
  const elapsed=(t-6.2)/2.5*2475,a={...IDLE,kind:'chop',from:IDLE.to,to:TREES[0],started:t*1000-elapsed,duration:5500};const p=playerPose(a,t*1000);world(p.x+20,p.y-2,lerp(3.4,5.1,ease((t-6.2)/2.5)),t,a,null,lerp(-.025,.018,(t-6.2)/2.5));
  section='01 · TU PRIMERA JORNADA';heading=['VE AL BOSQUE.'];caption=['Tu muñeco se mueve.'];start=6.2;
 }else if(t<10.8){
  const index=t<9.7?0:t<10.3?1:2,begin=[8.7,9.7,10.3][index],d=[1,.6,.5][index],elapsed=2475+clamp((t-begin)/d)*3025;
  const a={...IDLE,kind:'chop',from:TREES[index],to:TREES[index],started:t*1000-elapsed,duration:5500,logs:index};
  const punch= Math.exp(-(((t-begin)-.18)**2)/.009)*.65;
  world(TREES[index].x+12,TREES[index].y-8,5.2+punch,t,a,null,(index%2?.025:-.025));
  section='01 · MADERA PARA LA COMUNIDAD';heading=['CORTA.','CARGA.'];caption=[`${index+1} DE 3 TRONCOS`];start=8.7;
 }else if(t<14.9){
  const elapsed=clamp((t-10.8)/4.1)*9000,a={kind:'deliver',from:TREES[2],to:HARBOR,started:t*1000-elapsed,duration:9000,logs:3};const p=playerPose(a,t*1000);
  const q=clamp((t-10.8)/4.1);world(p.x+Math.sin(q*Math.PI)*28,p.y-8,t<12.7?3.7+q*.5:4.8-q*.7,t,a,null,Math.sin(q*Math.PI*2)*.022);
  section='02 · UNA ENTREGA QUE SUMA';heading=[t<12.7?'¡LLEVA TU CARGA!':'DIRECTO AL MUELLE.'];caption=[t<12.7?'Tres troncos. Una misión.':'Ayuda a levantar nuestra obra.'];start=t<12.7?10.8:12.7;
 }else if(t<16.5){
  const q=ease((t-14.9)/1.6);world(HARBOR.x,HARBOR.y-5,lerp(5.2,3.7,q),t,{...IDLE,to:HARBOR},null,.02*(1-q));
  section='EL PROGRESO DEL MUELLE SE COMPARTE';heading=['TU ENTREGA','HACE AVANZAR LA OBRA.'];caption=['Construimos entre todos.'];start=14.9;
 }else if(t<20.1){
  const progress=clamp((t-16.5)/3.6),travel=progress*60000,p=shipPosition(0,travel);
  if(t<18.2)world(p.x,p.y-12,3.1+.3*Math.sin(t*2),t,null,travel,-.018);
  else {const q=ease((t-18.2)/1.5);const screen=world(lerp(p.x,800,q),lerp(p.y,1080,q),lerp(3.1,.86,q),t,null,travel,0);
   ctx.save();ctx.setLineDash([9,14]);ctx.strokeStyle='#b6ffe7b0';ctx.lineWidth=3;ctx.beginPath();SEA_ROUTE.forEach((v,i)=>{const w=screen(v.x,v.y);i?ctx.lineTo(w.x,w.y):ctx.moveTo(w.x,w.y);});ctx.stroke();ctx.restore();const w=screen(p.x,p.y);ctx.strokeStyle='#ffc466';ctx.lineWidth=4;ctx.beginPath();ctx.arc(w.x,w.y,48,0,Math.PI*2);ctx.stroke();}
  section='03 · SUBE A BORDO';heading=[t<18.2?'¡ZARPA!':'RODEA TODA LA ISLA.'];caption=['Tu barco. Toda Hispania.'];note='En el juego: 60 segundos · aquí, recorrido acelerado.';start=t<18.2?16.5:18.2;
 }else if(t<25.7){
  const q=(t-20.1)/5.6;world(lerp(700,880,q),1050,1.65+Math.sin(q*3)*.2,t,null,null,Math.sin(q*4)*.022);
  section='PROPUESTAS · PRÓXIMA FASE';heading=['¿QUÉ AÑADIMOS','DESPUÉS?'];caption=['Comenta 1, 2 o 3.'];note='Estas tres opciones todavía no están disponibles.';start=20.1;
  const active=t<21.9?0:t<23.5?1:2;
  ['1   PESCA Y RECURSOS','2   VENDER Y GANAR ORO','3   CONSTRUIR TU CASA'].forEach((s,i)=>{
   const entry=ease((t-20.1-i*.15)/.35),pulse=active===i?1:0,x=100+(1-entry)*(i%2?1000:-1000),y=650+i*182+Math.sin(t*2+i)*7;
   box(x-8*pulse,y,880+16*pulse,143,26,active===i?'#154d4df5':'#061c2deb');
   if(active===i){ctx.strokeStyle='#ffc466';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(x-8,y,896,143,26);ctx.stroke();}
   text(s,y+89,active===i?44:39,active===i?'#ffc466':'#e0eeef',x+440);
  });
 }else{
  const q=clamp((t-25.7)/5.5),a={...IDLE,to:TREES[0],logs:1};world(lerp(680,560,ease(q)),lerp(1100,1020,ease(q)),lerp(1.5,4.1,ease(q)),t,a,null,lerp(.018,-.018,q));
  section='TU PRIMERA JORNADA TE ESPERA';heading=[t<27.1?'ENTRA Y PRUÉBALO.':t<29.4?'HAZ CRECER HISPANIA.':'AHORA TE TOCA A TI.'];caption=[];start=t<27.1?25.7:t<29.4?27.1:29.4;
 }
 chrome(t,section);title(heading,t,start);
 if(caption.length)bottom(caption,note);
 else{const pulse=1+.012*Math.sin(t*5);ctx.save();ctx.translate(540,1510);ctx.scale(pulse,pulse);box(-470,-95,940,210,30,'#061c2df2');text('mapaonline.vercel.app',0,58,'#ffc466',0);text('VER MAPA / JUGAR',75,42,'#a9ffe8',0);ctx.restore();text('Y elige qué construimos después.',1685,36);}
 // A short whip streak at actual shot boundaries, never a pause or black frame.
 const last=cuts.filter(v=>v<=t).at(-1),age=t-last;
 if(last>0&&age<.16){ctx.save();ctx.globalAlpha=(1-age/.16)*.12;ctx.fillStyle='#afffe9';for(let i=0;i<4;i++)ctx.fillRect(0,450+i*240,1080,2+i*2);ctx.restore();}
 if(shot<samples.length&&t>=samples[shot]){const path=resolve(out,`plano_${String(shot).padStart(2,'0')}.png`);await writeFile(path,c.toBuffer('image/png'));proof.push({time:t,path});shot++;}
 if(!ff.stdin.write(Buffer.from(ctx.getImageData(0,0,1080,1920).data)))await once(ff.stdin,'drain');
 if(f%240===0)console.log(`Render dinámico ${f}/${frames}`);
}
ff.stdin.end();const [code]=await once(ff,'exit');if(code!==0)throw Error('FFmpeg '+code);
await writeFile(resolve(out,'RENDER.json'),JSON.stringify({duration,fps,frames,cuts,proof,source:'Montaje resumido con funciones originales del juego; cámaras y encuadres nuevos. No se modifica la web ni se añaden entregas.',speed,voice:speed===1?'Narración original continua; sin pausas añadidas ni nueva generación.':'Narración a cadencia moderada, tono conservado, sin pausas añadidas ni nueva generación.'},null,2));console.log('Render dinámico terminado.');


