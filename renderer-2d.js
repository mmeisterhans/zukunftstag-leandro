// Seitliche 2D-Ansicht. Die Zeichnung verändert keine Positionen oder Spielregeln.
class ParkourRenderer2D {
  constructor(canvas,ctx) { this.canvas=canvas;this.ctx=ctx; }
  oval(x,y,rx,ry,color) {
    const c=this.ctx;c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();
  }
  rect(x,y,w,h,r,color) {
    const c=this.ctx;c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();
  }
  limb(points,width,color) {
    const c=this.ctx;c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();
    points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();
  }
  platform(x,y,w) {
    this.rect(x,y,w,29,5,'#182b43');
    this.rect(x,y,w,6,3,'#82e4c3');
    const c=this.ctx;c.fillStyle='#0d20354f';c.fillRect(x+8,y+29,w-16,520-y);
    c.fillStyle='#b4e4d14a';
    for(let wx=x+16;wx<x+w-10;wx+=26)c.fillRect(wx,y+47,8,12);
  }
  creature(m,big,s) {
    const c=this.ctx;c.save();c.translate(m.x,m.y);c.scale(big?2:1,big?2.375:1);
    const stride=Math.sin(s.tick*(big?.04:.14)+m.x*.02)*(big?.5:2);
    const skin=big?'#9d6d5a':m.maxHp===3?'#b57b65':m.maxHp===2?'#a99a66':'#81977a';
    const shade=c.createLinearGradient(0,0,32,30);shade.addColorStop(0,skin);shade.addColorStop(1,'#38443d');
    this.oval(16,32,16,2,'#10233344');
    for(const side of [-1,1]) {
      this.limb([[16+side*6,21],[16+side*7+stride*side,28],[16+side*8,31]],5,'#3f4847');
      this.rect(16+side*8-4,29,9,3,1,'#30383c');
      this.limb([[16+side*11,12],[16+side*14,20+stride*side],[16+side*13,25]],5,shade);
      for(let i=0;i<3;i++)this.limb([[16+side*13-2+i*2,24],[16+side*13-2+i*2,27]],1,'#e2d8b6');
      this.limb([[16+side*6,4],[16+side*10,-3]],2.5,'#ccbd99');
      this.oval(16+side*10,12,5,3,'#59616a');
    }
    this.oval(16,18,11,10,shade);this.rect(7,23,18,3,1,'#554b3a');
    this.oval(16,7,8,8,shade);this.oval(16,11,7,4,skin);
    const charge=big&&m.active&&m.attackTimer<25;
    for(const side of [-1,1]) {
      this.oval(16+side*4,6,3,2,'#272f2c');
      this.oval(16+side*4,6,1.5,1,charge?'#fff4c0':'#f5d185');
      this.limb([[16+side*7,2],[16+side*2,4]],2,'#485044');
      this.limb([[16+side*3,13],[16+side*3,10]],1.5,'#e5dcc1');
    }
    this.limb([[12,14],[16,15],[20,14]],1,'#41372f');c.restore();
  }
  goomba(m,s) {
    const c=this.ctx;c.save();c.translate(m.x,m.y);
    const step=Math.sin(s.tick*.16+m.x*.03)*2;
    this.oval(16,32,17,2,'#14202d44');
    this.oval(8-step,29,9,4,'#38261e');this.oval(25+step,29,9,4,'#38261e');
    this.oval(16,24,9,7,'#e8c69c');
    const cap=c.createLinearGradient(4,0,27,24);
    cap.addColorStop(0,m.maxHp===3?'#d47a50':m.maxHp===2?'#ce8b4b':'#ba8155');cap.addColorStop(1,'#704027');
    c.fillStyle=cap;c.beginPath();c.moveTo(1,20);c.bezierCurveTo(0,13,9,0,16,0);c.bezierCurveTo(23,0,32,13,32,20);c.quadraticCurveTo(25,25,16,22);c.quadraticCurveTo(7,25,1,20);c.fill();
    const look=s.player.x<m.x?-1:1;
    for(const ex of [11,22]){
      this.oval(ex,13,4,7,'#fff4df');this.oval(ex+look,14,1.7,4,'#251d1b');
    }
    this.limb([[5,5],[14,9]],2.5,'#42291e');this.limb([[18,9],[28,5]],2.5,'#42291e');
    this.limb([[11,21],[16,20],[22,21]],1.5,'#492a20');
    for(const side of [-1,1]){c.fillStyle='#fff2d0';c.beginPath();c.moveTo(16+side*5,20);c.lineTo(16+side*4,24);c.lineTo(16+side*2,21);c.closePath();c.fill();}
    c.restore();
  }
  runner(s) {
    const c=this.ctx,p=s.player,x=p.x,y=p.y;
    const stride=s.grounded&&p.vx?Math.sin(s.tick*.24)*6:0;
    c.save();if(s.invincible>0&&Math.floor(s.invincible/6)%2===0)c.globalAlpha=.35;
    this.oval(x+13,y+49,13,2,'#12243b33');
    for(const side of [-1,1]) {
      this.limb([[x+13+side*4,y+31],[x+13+side*4+stride*side*.5,y+39],[x+13+side*4+stride*side,y+46]],5,side<0?'#2e4054':'#415c73');
      this.rect(x+10+side*4+stride*side,y+45,9,4,2,'#29323c');
    }
    const jacket=c.createLinearGradient(x+4,y+18,x+22,y+32);jacket.addColorStop(0,'#e0c783');jacket.addColorStop(1,'#8d7145');
    this.rect(x+13-s.facing*8-3,y+19,6,13,2,'#5b7055');
    this.rect(x+5,y+17,17,16,5,jacket);this.limb([[x+14,y+19],[x+14,y+30]],1,'#e5d299');
    for(const side of [-1,1]) {
      const punching=s.punchFrames>0&&side===s.punchDirection;
      const elbow=[x+13+side*(punching?25:11),y+(punching?23:27)];
      const hand=[x+13+side*(punching?55:12),y+(punching?25:s.grounded?33:16)];
      this.limb([[x+13+side*7,y+20],elbow],4,jacket);this.limb([elbow,hand],3.5,'#d6ad88');
      this.oval(hand[0],hand[1],punching?6:2.5,punching?5:3,'#e0b994');
    }
    this.rect(x+11,y+12,5,7,2,'#c59773');
    this.oval(x+13,y+8,6.5,8,'#d9b38f');this.oval(x+12,y+3,6.8,4,'#493c33');
    this.oval(x+13+s.facing*6,y+10,2,1.5,'#d9b38f');this.oval(x+13+s.facing*3,y+8,1,1.2,'#28323a');
    if(!s.punchFrames){const gx=x+13+s.facing*15;this.rect(gx-2,y+26,5,8,1,'#33445b');this.rect(s.facing>0?gx-2:gx-16,y+23,19,6,2,'#8ea8b8');this.rect(gx+s.facing*14-2,y+24,4,4,1,'#9bf8ff');}
    c.restore();
  }
  orb(x,y,r,color) {
    const c=this.ctx;c.save();c.shadowColor=color;c.shadowBlur=13;this.oval(x,y,r,r,color);this.oval(x-2,y-2,r*.5,r*.5,'#fff0c8');c.restore();
  }
  bar(x,y,hp,maxHp,color,label='') {
    const c=this.ctx;this.rect(x-34,y,68,5,2,'#172c43');this.rect(x-34,y,68*hp/maxHp,5,2,color);
    if(label){c.fillStyle='#fff5dc';c.textAlign='center';c.font='bold 12px Segoe UI';c.fillText(label,x,y-7);c.textAlign='left';}
  }
  render(s) {
    const c=this.ctx,sky=c.createLinearGradient(0,0,0,520);
    sky.addColorStop(0,'#234568');sky.addColorStop(1,'#7295a4');c.fillStyle=sky;c.fillRect(0,0,960,520);
    this.oval(770,95,39,39,'#ffe8ad');
    for(let i=0;i<6;i++){
      const x=(i*210+s.tick*.12)%1180-130,y=65+(i%3)*48;
      this.rect(x,y,105,14,10,'#d5e7e52b');this.rect(x+22,y-12,50,23,12,'#d5e7e52b');
    }
    for(let i=0;i<18;i++){
      const h=65+(i*47)%155;
      c.fillStyle=i%2?'#284861':'#34556c';c.fillRect(i*60,520-h,51,h);
      c.fillStyle='#b4d8ca35';
      for(let row=0;row<4;row++)for(let col=0;col<3;col++)c.fillRect(i*60+9+col*12,535-h+row*28,4,9);
    }
    c.save();c.translate(-s.cameraX,-s.cameraY);
    for(const [x,y,w] of s.level.platforms)if(x+w>s.cameraX-60&&x<s.cameraX+1020)this.platform(x,y,w);
    c.font='bold 11px Segoe UI';c.fillStyle='#c3ecdf';c.fillText('START',25,s.level.platforms[0][1]+21);
    for(const monster of s.monsters)if(monster.alive){this.goomba(monster,s);if(monster.maxHp>1)this.bar(monster.x+16,monster.y-13,monster.hp,monster.maxHp,'#a1e6bd');}
    if(s.boss.hp>0){this.creature(s.boss,true,s);this.bar(s.boss.x+32,s.boss.y-22,s.boss.hp,s.boss.maxHp,'#ff9291',`BOSS ${s.levelIndex+1} · ${s.boss.hp}/${s.boss.maxHp}`);if(s.boss.active&&s.boss.attackTimer<25){c.fillStyle='#ffe19d';c.font='bold 11px Segoe UI';c.fillText('ANGRIFF!',s.boss.x+7,s.boss.y-45);}}
    for(const ball of s.fireballs)this.orb(ball.x,ball.y,9,'#ffa33e');
    for(const shot of s.bossShots)this.orb(shot.x,shot.y,8,'#e58cd9');
    for(const spark of s.sparks)this.rect(spark.x,spark.y,3,3,1,'#ffe0a1');
    if(s.shieldFrames>0){c.strokeStyle='#a6efff';c.lineWidth=2;this.oval(s.player.x+13,s.player.y+25,30,38,'#82dfff33');c.stroke();}
    this.runner(s);
    if(s.laserFrames>0&&s.laser){c.save();c.shadowColor='#6aeaff';c.shadowBlur=15;this.limb([[s.laser.x,s.laser.y],[s.laser.endX,s.laser.y]],9,'#60dfff');this.limb([[s.laser.x,s.laser.y],[s.laser.endX,s.laser.y]],3,'#eaffff');c.restore();}
    c.restore();
  }
}
