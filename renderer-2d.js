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
  cloud(x,y,w) {
    this.oval(x+w/2,y+29,w/2,21,'#aebed6');
    const count=Math.max(2,Math.ceil(w/50)),step=w/count;
    for(let i=0;i<count;i++) {
      const radius=step*(i===0||i===count-1?.5:.75);
      this.oval(x+(i+.5)*step,y+22,radius,22,i%2?'#e9f2ff':'#f8fbff');
    }
    this.oval(x+w/2,y+30,w*.46,12,'#e7effb');
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
    sky.addColorStop(0,'#274d71');sky.addColorStop(1,'#a2b8c0');c.fillStyle=sky;c.fillRect(0,0,960,520);
    this.oval(785,85,35,35,'#ffe3a5');
    for(let i=0;i<7;i++){const x=((i*180+s.tick*.1-s.cameraX*.12)%1250+1250)%1250-120;this.oval(x,75+(i%3)*45,57,12,'#dfeef044');}
    for(let i=0;i<19;i++){const x=i*60-(s.cameraX*.2)%60,h=70+(i*43)%140;this.rect(x,520-h,52,h,2,'#496b8055');}
    c.save();c.translate(-s.cameraX,-s.cameraY);
    for(const [x,y,w] of s.level.platforms)if(x+w>s.cameraX-60&&x<s.cameraX+1020)this.cloud(x,y,w);
    for(const rotor of s.fireRotors) {
      const floor=s.level.platforms[rotor.platformIndex][1],tip=rotor.balls.at(-1);
      this.limb([[rotor.x,floor],[rotor.x,rotor.y]],5,'#6d7882');this.oval(rotor.x,rotor.y,8,8,'#c6a266');
      this.limb([[rotor.x,rotor.y],[tip.x,tip.y]],2,'#bc8545');
      for(const ball of rotor.balls)this.orb(ball.x,ball.y,ball.radius,'#ff933d');
    }
    for(const monster of s.monsters)if(monster.alive){this.creature(monster,false,s);if(monster.maxHp>1)this.bar(monster.x+16,monster.y-13,monster.hp,monster.maxHp,'#a1e6bd');}
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
