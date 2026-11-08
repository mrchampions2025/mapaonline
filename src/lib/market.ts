/** Original Canvas artwork. Static feet; articulated heads and light steam. */
export function drawMarket(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  time: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#183b354a";
  ctx.beginPath();ctx.ellipse(0, 4, 43, 13, -.08, 0, Math.PI * 2);ctx.fill();
  ctx.fillStyle = "#d5bc85";
  ctx.beginPath();ctx.moveTo(-39,-4);ctx.lineTo(-7,-16);ctx.lineTo(39,-3);ctx.lineTo(7,13);ctx.closePath();ctx.fill();
  ctx.fillStyle = "#6c442a";
  for (const px of [-29,29]) ctx.fillRect(px-1.4,-70,2.8,69);
  ctx.fillStyle = "#e8ce9f";ctx.fillRect(-28,-22,56,25);
  ctx.fillStyle = "#be4f35";ctx.fillRect(-27,-19,54,21);
  ctx.fillStyle = "#943d2e";ctx.beginPath();ctx.moveTo(27,-19);ctx.lineTo(34,-23);ctx.lineTo(34,-3);ctx.lineTo(27,2);ctx.closePath();ctx.fill();
  // The vendor is behind the counter, with its face visible above it.
  capybara(ctx, 0, -21, .68, time, true);
  ctx.fillStyle = "#f1dfba";ctx.fillRect(-31,-22,62,4);
  for (const px of [-20,20]) {
    ctx.fillStyle="#d7563d";ctx.beginPath();ctx.moveTo(px-4,-29);ctx.lineTo(px+4,-29);ctx.lineTo(px+3,-20);ctx.lineTo(px-3,-20);ctx.closePath();ctx.fill();
    ctx.strokeStyle="#f8c75c";ctx.lineWidth=1.4;
    for(let k=-2;k<=2;k++){ctx.beginPath();ctx.moveTo(px+k*1.2,-27);ctx.lineTo(px+k*1.3,-34+(k%2)*2);ctx.stroke();}
  }
  // Striped awning is separate from both animated characters.
  for(let i=0;i<10;i++){
    ctx.fillStyle=i%2?"#df775b":"#fff0ce";
    ctx.beginPath();ctx.moveTo(-35+i*7,-78);ctx.lineTo(-28+i*7,-78);ctx.lineTo(-25+i*7,-66);ctx.lineTo(-32+i*7,-66);ctx.closePath();ctx.fill();
  }
  ctx.fillStyle="#082b38";ctx.fillRect(-32,-66,70,10);
  ctx.font="bold 7px system-ui";ctx.textAlign="center";ctx.fillStyle="#ffc466";ctx.fillText("PATATAS",3,-58.8);
  ctx.font="bold 6px system-ui";ctx.fillStyle="#fff5de";ctx.fillText("@maravaf",0,-6);
  capybara(ctx,-33,8,.65,time+.8,false);
  ctx.strokeStyle="#fff8dc70";ctx.lineWidth=.8;
  for (let i=0;i<2;i++){
    const rise=(time*.3+i*.5)%1;ctx.globalAlpha=1-rise;
    ctx.beginPath();ctx.moveTo(20,-35-rise*9);ctx.quadraticCurveTo(24+Math.sin(time*2+i)*2,-39-rise*9,20,-43-rise*9);ctx.stroke();
  }
  ctx.restore();
}

function capybara(ctx: CanvasRenderingContext2D,x:number,y:number,s:number,t:number,hat:boolean){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  ctx.fillStyle="#765037";
  for(const px of [-7,6])ctx.fillRect(px-2,-6,4,6);
  ctx.fillStyle="#ad8052";ctx.beginPath();ctx.ellipse(0,-12,13,11,0,0,Math.PI*2);ctx.fill();
  ctx.translate(0,-22);ctx.rotate(Math.sin(t*1.5)*.055);
  ctx.fillStyle="#bd915e";ctx.beginPath();ctx.ellipse(0,-3,12,10,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#775035";
  for(const px of [-8,8]){ctx.beginPath();ctx.ellipse(px,-10,3,4,px*.025,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle="#262b24";
  for(const px of [-7,7]){ctx.beginPath();ctx.ellipse(px,-3,1.1,Math.sin(t*.7)> .995?.3:1.6,0,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle="#79543a";ctx.beginPath();ctx.ellipse(0,3,8,4,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#47372b";ctx.beginPath();ctx.ellipse(0,2.4,2.8,1.1,0,0,Math.PI*2);ctx.fill();
  if(hat){ctx.fillStyle="#fff1d0";ctx.fillRect(-9,-17,18,6);ctx.fillStyle="#dbc79d";ctx.fillRect(-9,-12,18,2);}
  ctx.restore();
}
