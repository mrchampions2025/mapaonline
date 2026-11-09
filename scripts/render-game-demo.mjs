import {createCanvas,loadImage,GlobalFonts} from '@napi-rs/canvas';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {drawPlayer,drawForest,drawGroundDetail} from '../src/lib/player-art.ts';
import {drawHarbor} from '../src/lib/harbor-art.ts';
import {drawWildlife} from '../src/lib/wildlife.ts';
import {IDLE,TREES,HARBOR,SHIP,SEA_ROUTE,shipPosition,playerPose} from '../src/lib/player.ts';
const out=resolve('../proyecto/juego_movil_v2');await mkdir(out,{recursive:true});
GlobalFonts.registerFromPath('C:/Windows/Fonts/arial.ttf','UI');
GlobalFonts.registerFromPath('C:/Windows/Fonts/arialbd.ttf','Display');
const map=await loadImage('public/map.png');
const tri=await loadImage('public/wildlife/triceratops-grazing.webp');
const animals={};for(const n of ['deer','rabbit','chicken'])animals[n]=await loadImage(`public/wildlife/${n}-atlas.webp`);
const phone=await loadImage(resolve(out,'CORTE_MOVIL.png'));
const c=createCanvas(1080,1920),ctx=c.getContext('2d');
const fps=24,duration=46,frames=duration*fps;
const ff=spawn('ffmpeg',['-y','-hide_banner','-loglevel','error','-f','rawvideo','-pixel_format','rgba','-video_size','1080x1920','-framerate',String(fps),'-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p',resolve(out,'IMAGEN_JUEGO.mp4')],{stdio:['pipe','ignore','inherit']});
ff.stdin.on('error',()=>{});
function text(s,y,size=56,color='#fff',font='Display'){ctx.fillStyle=color;ctx.font=`${size}px ${font}`;ctx.textAlign='center';ctx.fillText(s,540,y);}
function round(x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function world(cx,cy,scale,seconds,actor=null,voyage=false,travel=0) {
 const screen=(x,y)=>({x:(x-cx)*scale+540,y:(y-cy)*scale+880});
 ctx.save();ctx.beginPath();ctx.rect(0,340,1080,1130);ctx.clip();
 const p=screen(0,0);ctx.drawImage(map,p.x,p.y,1600*scale,2000*scale);
 drawGroundDetail(ctx,screen,scale);drawWildlife(ctx,screen,scale,tri,seconds,animals);
 drawHarbor(ctx,screen,scale,seconds,1,voyage,0,0,travel);
 drawForest(ctx,screen,scale);
 if(actor)drawPlayer(ctx,screen,scale,actor,seconds*1000,'Anónimo');
 ctx.restore();
 return screen;
}
function caption(lines,small=''){round(60,1450,960,270,32,'#071c2eed');lines.forEach((l,i)=>text(l,1534+i*61,51,i===0?'#a9ffe8':'#fff'));if(small)text(small,1682,27,'#b5c9cd','UI');}
const proof=[];
for(let f=0;f<frames;f++) {
 const t=f/fps,u=Math.min(42,t*.94);
 const g=ctx.createLinearGradient(0,0,0,1920);g.addColorStop(0,'#071b2c');g.addColorStop(1,'#103d43');ctx.fillStyle=g;ctx.fillRect(0,0,1080,1920);
 text('HISPANIA',108,39,'#ffc466');text('EL PAÍS QUE CONSTRUIMOS JUNTOS',159,23,'#b2c9cf','UI');
 text('407 VECINOS · UNA OBRA EN COMÚN',210,24,'#70e0c1','UI');
 if(u<2.7){
  text('EL MAPA YA ESTÁ VIVO',284,65);world(800,1050,.93+u*.07,u);caption(['AHORA JUEGAS TÚ.','Desde tu móvil.']);
 } else if(u<6.2){
  text('TU PRIMERA AVENTURA',280,59);round(240,355,600,1100,40,'#020d17');ctx.save();ctx.beginPath();ctx.roundRect(254,370,572,1068,29);ctx.clip();ctx.drawImage(phone,254,370,572,1068);ctx.restore();caption(['Sin email para empezar.','Tu muñeco: Anónimo.']);
 } else if(u<14.8){
  const at=(u-6.2)*1000,a={...IDLE,kind:at<5500?'chop':'idle',from:IDLE.to,to:TREES[0],started:0,duration:5500,logs:at>=5500?1:0};
  if(at>=5500)a.from=TREES[0];
  const p=playerPose(a,at);text('1 · RECOGE MADERA',280,64);world(p.x+14,p.y-15,4.2,u,{...a,started:u*1000-at});
  caption(at<2475?['Camina hasta el árbol.']:at<5500?['Corta. Recoge. Avanza.']:['Tu carga se ve en el mapa.'],at<5500?'El tronco se añade al terminar el corte.':'Repite con los otros dos árboles.');
 } else if(u<24.3){
  const at=(u-14.8)*1000,a={kind:'deliver',from:TREES[2],to:HARBOR,started:u*1000-at,duration:9000,logs:3};const p=playerPose(a,u*1000);
  text('2 · LLÉVALA AL MUELLE',280,60);world(p.x,p.y-10,3.5,u,a);caption(['Tu esfuerzo construye Hispania.'], 'Cada entrega confirmada hace avanzar la obra.');
 } else if(u<31.8){
  const progress=(u-24.3)/7.5,travel=progress*60000,boat=shipPosition(0,travel);
  text('3 · RODEA TODA LA ISLA',280,58);const screen=world(800,1050,.82,u,null,true,travel);
  ctx.save();ctx.setLineDash([8,12]);ctx.strokeStyle='#7ce9d39a';ctx.lineWidth=3;ctx.beginPath();SEA_ROUTE.forEach((p,i)=>{const q=screen(p.x,p.y);if(i===0)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);});ctx.stroke();ctx.restore();
  const p=screen(boat.x,boat.y);ctx.strokeStyle='#ffc466';ctx.lineWidth=4;ctx.beginPath();ctx.arc(p.x,p.y,60,0,Math.PI*2);ctx.stroke();
  caption(['Un minuto de travesía.','La cámara viaja contigo.'],'Recorrido acelerado para esta demostración.');
 } else if(u<37.7){
  text('TÚ DECIDES LO SIGUIENTE',280,56);world(800,1070,1.15,u);
  round(100,475,880,830,36,'#071b2cf2');text('¿QUÉ IMPLEMENTAMOS?',576,40,'#ffc466');
  const options=['1   PESCA Y NUEVOS RECURSOS','2   VENDER Y GANAR ORO','3   CONSTRUIR TU CASA'];
  options.forEach((l,i)=>{round(150,640+i*175,780,140,24,'#173c46');text(l,725+i*175,36);});
  caption(['Comenta 1, 2 o 3.'],'Propuestas para la próxima fase. Todavía no disponibles.');
 } else {
  text('TE ESPERAMOS EN HISPANIA',280,55);world(590,1040,2.9+Math.sin(t*.3)*.1,u,{...IDLE,from:TREES[0],to:TREES[0],logs:1});
  round(80,1110,920,260,32,'#071c2cf5');text('mapaonline.vercel.app',1220,58,'#ffc466');text('VER MAPA / JUGAR',1300,45,'#a9ffe8');caption(['Entra. Juega tu primera jornada.','Y elige qué construimos después.']);
 }
 text('@paisde.seguidores',1815,34,'#ffc466');text('Demostración realizada con las animaciones del juego',1865,20,'#a9bfc3','UI');
 round(60,1748,960,5,2,'#274955');round(60,1748,Math.max(1,960*f/frames),5,2,'#70e0c1');
 if([24,220,465,665,835,1030].includes(f)){const path=resolve(out,`vista_${f}.png`);await writeFile(path,c.toBuffer('image/png'));proof.push(path);}
 if(!ff.stdin.write(Buffer.from(ctx.getImageData(0,0,1080,1920).data)))await once(ff.stdin,'drain');
 if(f%240===0)process.stdout.write(`Render ${f}/${frames}\n`);
}
ff.stdin.end();const [code]=await once(ff,'exit');if(code!==0)throw Error('FFmpeg '+code);
await writeFile(resolve(out,'RENDER.json'),JSON.stringify({duration,fps,frames,proof,source:'Funciones de dibujo compartidas con el juego; montaje demostrativo, no grabación de una entrega pública',voice:'Álvaro Serrano · ElevenLabs v3 · 102 créditos'},null,2));
console.log('Render terminado.');
