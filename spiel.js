// Die Plattformen: x, y, Breite. Kleineres y bedeutet weiter oben.
const levels = [
  { name: 'Die ersten Sprünge', platforms: [[0,440,210],[270,390,150],[480,335,140],[680,290,280]], goal: {x:865,y:290} },
  { name: 'Über den Wolken', platforms: [[0,445,170],[230,385,115],[405,320,110],[575,260,110],[750,205,210]], goal: {x:870,y:205} },
  { name: 'Durchs Wolkental', platforms: [[0,350,210],[275,420,135],[475,340,135],[675,250,125],[855,165,145]], goal: {x:940,y:165} },
  { name: 'Monster auf den Dächern', platforms: [[0,445,180],[235,385,140],[430,330,130],[620,275,120],[800,220,160]], goal: {x:905,y:220} },
  { name: 'Die schwebenden Inseln', platforms: [[0,440,160],[225,355,115],[405,400,120],[585,310,115],[765,235,195]], goal: {x:900,y:235} },
  { name: 'Feuer über der Stadt', platforms: [[0,450,165],[230,370,105],[400,285,110],[575,350,115],[755,260,205]], goal: {x:900,y:260} },
  { name: 'Die Himmelsleiter', platforms: [[0,455,150],[210,380,95],[365,305,95],[520,230,95],[675,155,95],[830,95,130]], goal: {x:905,y:95} },
  { name: 'Die Luftbrücke', platforms: [[0,455,145],[210,370,95],[370,285,95],[530,365,100],[695,270,95],[850,180,110]], goal: {x:910,y:180} },
  { name: 'Zwischen den Schluchten', platforms: [[0,360,180],[245,435,130],[440,350,120],[625,425,130],[820,330,160]], goal: {x:920,y:330} },
  { name: 'Der hohe Turm', platforms: [[0,450,180],[245,365,110],[420,280,110],[595,195,110],[770,125,190]], goal: {x:900,y:125} },
  { name: 'Über den Stadtbogen', platforms: [[0,420,180],[245,340,125],[435,260,125],[625,340,125],[815,420,165]], goal: {x:920,y:420} },
  { name: 'Die letzte Festung', platforms: [[0,450,165],[230,365,105],[400,280,105],[570,360,110],[745,270,110],[920,185,120]], goal: {x:980,y:185} }
];

// Zwei weitere Sprungplattformen verlängern den Weg zur Boss-Arena ein wenig.
const extensionHeights = [340,260,330,250];
levels.forEach((level,index) => {
  let last = level.platforms[level.platforms.length-1];
  extensionHeights.forEach((baseY,step) => {
    const gap = Math.min(140,95 + (index%3)*20 + (step%2)*25);
    const y = Math.max(140,Math.min(420,baseY+(index%3)*20));
    const platform = [last[0]+last[2]+gap,y,step===extensionHeights.length-1 ? 520 : step===0 ? 400 : 145+(step-1)*10];
    level.platforms.push(platform);
    last = platform;
  });
  level.worldWidth = last[0]+last[2];
  level.goal = {x:last[0]+last[2]-60,y:last[1]};
});
const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const statusText = document.querySelector('#status');
const overlay = document.querySelector('#overlay');
const keys = { left:false, right:false, fire:false };
const keyboardKeys = { left:false, right:false, fire:false };
const touchPointers = new Map();

function syncInput() {
  for(const control of ['left','right','fire']) {
    keys[control]=keyboardKeys[control] || [...touchPointers.values()].some(touch=>touch.control===control);
  }
}
let levelIndex = 0, falls = 0, completed = false, jumpQueued = false;
let player, grounded = false, coyote = 0, tick = 0;
let cameraX = 0, lastPlatformIndex = 0;
let cameraY = 0, freecam = false, cameraDrag = null;
const cameraKeys={left:false,right:false,up:false,down:false};
const cameraPointers=new Map();
const cameraKeyMap={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',KeyA:'left',KeyD:'right',KeyW:'up',KeyS:'down'};

function clampCamera() {
  cameraX=Math.max(-100,Math.min(levels[levelIndex].worldWidth-canvas.width+100,cameraX));
  cameraY=Math.max(-180,Math.min(320,cameraY));
}

function updateFreecam() {
  const held=direction=>cameraKeys[direction]||[...cameraPointers.values()].includes(direction);
  cameraX+=((held('right')?1:0)-(held('left')?1:0))*8;
  cameraY+=((held('down')?1:0)-(held('up')?1:0))*8;
  clampCamera();
}

function setFreecam(enabled) {
  freecam=enabled;clearInput();
  document.querySelector('#freecam').textContent=freecam?'Freecam: An · Zur Figur':'Freecam: Aus';
  document.querySelector('#freecam').setAttribute('aria-pressed',String(freecam));
  document.querySelector('#freecam-controls').hidden=!freecam;
  document.querySelector('#play-controls').hidden=freecam;
  overlay.hidden=freecam || !completed;
  canvas.classList.toggle('freecam',freecam);
  if (!freecam) {cameraY=0;updateTravel();}
  updateAbilityDisplay();
  statusText.textContent=freecam?'FREECAM · Spiel pausiert. Pfeiltasten / WASD oder Bild ziehen. C / Escape: zurück zur Figur.':completed?'Level beendet! Wähle das nächste Level.':'Zurück bei deiner Figur. Das Spiel läuft weiter.';
}
const maxHearts = 5;
let monsters = [], fireballs = [], sparks = [], hearts = maxHearts, invincible = 0, cooldown = 0, facing = 1;
let boss, bossShots = [], punchFrames = 0, punchCooldown = 0, punchDirection = 1, shieldFrames = 0, shieldCooldown = 0;
let laserCooldown = 0, laserFrames = 0, laser = null;
const punchHits = new Set();
const width = 26, height = 49;

function updateAbilityDisplay() {
  document.querySelector('#punch').textContent = punchFrames ? 'Schlag aktiv!' : punchCooldown ? `Schlag: ${(punchCooldown/60).toFixed(1)}s` : 'Schlag · G';
  document.querySelector('#shield').textContent = shieldFrames ? 'Schild aktiv!' : shieldCooldown ? `Schild: ${Math.ceil(shieldCooldown/60)}s` : 'Schild · D';
  document.querySelector('#punch').disabled = completed || freecam || punchCooldown>0;
  document.querySelector('#shield').disabled = completed || freecam || shieldCooldown>0;
  document.querySelector('#laser').textContent = laserCooldown ? `Laser: ${(laserCooldown/60).toFixed(1)}s` : 'Laser · L';
  document.querySelector('#laser').disabled = completed || freecam || laserCooldown>0;
}

function useAbility(name) {
  if (completed || freecam) return;
  if (name==='punch' && punchCooldown===0) {
    punchDirection=facing; punchFrames=21; punchCooldown=45; punchHits.clear();
  }
  if (name==='shield' && shieldCooldown===0) { shieldFrames=90; shieldCooldown=300; }
  if (name==='laser') shootLaser();
  updateAbilityDisplay();
}

function resetAbilities() {
  punchFrames=punchCooldown=shieldFrames=shieldCooldown=0;
  laserCooldown=laserFrames=0; laser=null;
  punchHits.clear();
  bossShots=[];
  updateAbilityDisplay();
}

function updateHearts() {
  document.querySelector('#hearts').textContent = '♥'.repeat(hearts) + '♡'.repeat(maxHearts-hearts);
  document.querySelector('#hearts').setAttribute('aria-label', `${hearts} von ${maxHearts} Herzen`);
}

function updateTravel() {
  const level = levels[levelIndex];
  cameraX = Math.max(0,Math.min(level.worldWidth-canvas.width,player.x-canvas.width*0.35));
  const progress = Math.max(0,Math.min(100,Math.floor((player.x-45)/(level.goal.x-width/2-45)*100)));
  document.querySelector('#progress').textContent = `Weg: ${progress}%`;
}

function startLevel() {
  player = { x:45, y:levels[levelIndex].platforms[0][1]-height, vx:0, vy:0 };
  grounded = true; coyote = 6; completed = false; jumpQueued = false;
  cameraX = 0; lastPlatformIndex = 0;
  clearInput();
  hearts = maxHearts; invincible = 0; cooldown = 0; facing = 1;
  fireballs = []; sparks = [];
  const monsterHealth = levelIndex >= 6 ? 3 : levelIndex >= 4 ? 2 : 1;
  monsters = levels[levelIndex].platforms.slice(1,-1).map(([x,y,w],i) => ({
    x:x+w/2-16, y:y-32, left:x+7, right:x+w-39,
    vx:(i%2 ? -1 : 1) * (0.65+levelIndex*0.09), alive:true,
    hp:monsterHealth, maxHp:monsterHealth, platformIndex:i+1
  }));
  const goal=levels[levelIndex].goal;
  boss={x:goal.x-32,y:goal.y-76,hp:8+levelIndex*2,maxHp:8+levelIndex*2,active:false,attackTimer:90};
  resetAbilities();
  setFreecam(false);
  updateHearts();
  updateTravel();
  overlay.hidden = true;
  document.querySelector('#level').textContent = `${String(levelIndex+1).padStart(2,'0')} / ${String(levels.length).padStart(2,'0')} · ${levels[levelIndex].name}`;
  statusText.textContent = 'F: Feuerball. L: Laserpistole. G: Schlag. D: Schild. Besiege den Boss!';
  statusText.textContent = 'Spring von oben auf Goombas, um sie ohne Schaden zu besiegen! G: Schlag. L: Laser.';
}

// Ein Sturz kostet zwei Herzen. Die zuletzt betretene Plattform ist der Rücksetzpunkt.
function respawnAfterFall() {
  falls++;
  document.querySelector('#falls').textContent = `Stürze: ${falls}`;
  hearts = Math.max(0,hearts-2);
  if (hearts===0) {
    startLevel();
    statusText.textContent = 'Keine Herzen mehr! Das Level startet neu mit fünf Herzen.';
    return;
  }
  const [x,y,w] = levels[levelIndex].platforms[lastPlatformIndex];
  player = {x:x+(w-width)/2,y:y-height,vx:0,vy:0};
  for (const monster of monsters) {
    if (monster.platformIndex===lastPlatformIndex) { monster.alive=false; monster.hp=0; }
  }
  grounded=true; coyote=6; jumpQueued=false;
  clearInput();
  fireballs=[]; sparks=[]; cooldown=0; invincible=100;
  resetAbilities();
  updateHearts();
  updateTravel();
  statusText.textContent = 'Zwei Herzen verloren. Zurück auf der letzten Plattform – ohne Monster!';
}

function hurtPlayer() {
  if (invincible>0 || shieldFrames>0 || punchFrames>0) return false;
  hearts--; updateHearts(); invincible=100;
  if (hearts===0) {
    startLevel();
    statusText.textContent = 'Erwischt! Neuer Versuch mit fünf Herzen.';
    return true;
  }
  statusText.textContent = 'Autsch! G: geschützter Schlag. D: Schutzschild.';
  return false;
}

function updateBoss() {
  const arena=levels[levelIndex].platforms.at(-1);
  if (!boss.active && player.x+width>=arena[0] && player.y+height<=arena[1]+5) {
    boss.active=true;
    statusText.textContent = 'BOSSKAMPF! F: Feuerball. G: geschützter Schlag. D: Schild!';
  }
  if (!boss.active || boss.hp<=0) return;
  boss.attackTimer--;
  if (boss.attackTimer<=0) {
    const x=boss.x+32,y=boss.y+38;
    const angle=Math.atan2(player.y+height/2-y,player.x+width/2-x);
    const speed=3+levelIndex*0.18;
    const spread=levelIndex>=4 ? [-0.18,0,0.18] : [0];
    for (const offset of spread) bossShots.push({x,y,vx:Math.cos(angle+offset)*speed,vy:Math.sin(angle+offset)*speed,life:180});
    boss.attackTimer=Math.max(50,100-levelIndex*6);
  }
  for (const shot of bossShots) {
    shot.x+=shot.vx;shot.y+=shot.vy;shot.life--;
    if (shot.life>0 && overlaps(shot.x-8,shot.y-8,16,16,player.x,player.y,width,height)) {
      shot.life=0;
      if (hurtPlayer()) return;
    }
  }
  bossShots=bossShots.filter(shot=>shot.life>0);
  if (overlaps(player.x,player.y,width,height,boss.x,boss.y,64,76)) hurtPlayer();
}

// Ein Feuerball fliegt immer in die Richtung, in die du zuletzt gelaufen bist.
function shoot() {
  if (completed || freecam || cooldown > 0) return;
  fireballs.push({x:player.x+width/2+facing*23,y:player.y+26,vx:facing*8,life:100});
  cooldown = 18;
}

function overlaps(ax,ay,aw,ah,bx,by,bw,bh) {
  return ax < bx+bw && ax+aw > bx && ay < by+bh && ay+ah > by;
}

function shootLaser() {
  if (completed || freecam || laserCooldown>0) return;
  const x=player.x+width/2+facing*20,y=player.y+26;
  const endX=Math.max(0,Math.min(levels[levelIndex].worldWidth,x+facing*650));
  laser={x,y,endX};laserFrames=12;laserCooldown=300;
  const left=Math.min(x,endX),beamWidth=Math.abs(endX-x);
  const targets=monsters.filter(monster=>monster.alive);
  if (boss.active && boss.hp>0) targets.push(boss);
  for (const target of targets) {
    if (!overlaps(left,y-5,beamWidth,10,target.x,target.y,target===boss?64:32,target===boss?76:32)) continue;
    target.hp=Math.max(0,target.hp-4);
    if (target!==boss) target.alive=target.hp>0;
    for(let i=0;i<8;i++) sparks.push({x:target.x+16,y,vx:Math.cos(i*Math.PI/4)*3,vy:Math.sin(i*Math.PI/4)*3,life:20});
    if (target===boss && target.hp===0) { finishLevel(); return; }
  }
  statusText.textContent = 'Laser abgefeuert! Vier Schadenspunkte pro Gegner. Abklingzeit: 5 Sekunden.';
}

function punchArea() {
  return {x:punchDirection>0 ? player.x+width-4 : player.x-62,y:player.y+4,w:66,h:height-4};
}

// Ein Schlag trifft jeden Gegner höchstens einmal und schützt während der Animation.
function updatePunch() {
  if (punchFrames<=0) return;
  const area=punchArea();
  const targets=monsters.filter(monster=>monster.alive);
  if (boss.active && boss.hp>0) targets.push(boss);
  for (const target of targets) {
    if (punchHits.has(target)) continue;
    if (!overlaps(area.x,area.y,area.w,area.h,target.x,target.y,target===boss?64:32,target===boss?76:32)) continue;
    punchHits.add(target);
    target.hp=Math.max(0,target.hp-2);
    if (target!==boss) target.alive=target.hp>0;
    for (let i=0;i<10;i++) sparks.push({x:target.x+16,y:player.y+25,vx:Math.cos(i*Math.PI/5)*3,vy:Math.sin(i*Math.PI/5)*3,life:22});
    statusText.textContent = target.hp>0 ? 'Schlag trifft! Zwei Schadenspunkte.' : 'Volltreffer! Gegner besiegt.';
    if (target===boss && target.hp===0) { finishLevel(); return; }
  }
}

function updateCombat(oldFeet=player.y+height) {
  if (cooldown > 0) cooldown--;
  if (invincible > 0) invincible--;
  if (keys.fire) shoot();
  for (const monster of monsters) {
    if (!monster.alive) continue;
    monster.x += monster.vx;
    if (monster.x < monster.left || monster.x > monster.right) {
      monster.x = Math.max(monster.left,Math.min(monster.right,monster.x));
      monster.vx *= -1;
    }
  }
  // Auch bei schnellem Fallen zählt das Überqueren der Kopfoberkante als Treffer.
  const stomp=player.vy>=0 ? monsters.filter(monster=>
    monster.alive && oldFeet<=monster.y && player.y+height>=monster.y &&
    player.x+width>monster.x && player.x<monster.x+32
  ).sort((a,b)=>a.y-b.y)[0] : null;
  if(stomp) {
    stomp.alive=false;stomp.hp=0;
    player.y=stomp.y-height;player.vy=-8.5;grounded=false;coyote=0;
    invincible=Math.max(invincible,12);
    for(let i=0;i<8;i++)sparks.push({x:stomp.x+16,y:stomp.y+8,vx:Math.cos(i*Math.PI/4)*2,vy:Math.sin(i*Math.PI/4)*2,life:18});
    statusText.textContent='Draufgesprungen! Goomba besiegt – ohne Herzverlust.';
  }
  updatePunch();
  if (completed) return;
  for (const ball of fireballs) {
    ball.x += ball.vx; ball.life--;
    for (const monster of monsters) {
      if (ball.life > 0 && monster.alive && overlaps(ball.x-9,ball.y-9,18,18,monster.x,monster.y,32,32)) {
        monster.hp--; monster.alive=monster.hp>0; ball.life=0;
        for (let i=0;i<10;i++) sparks.push({x:monster.x+16,y:monster.y+16,vx:Math.cos(i*Math.PI/5)*3,vy:Math.sin(i*Math.PI/5)*3,life:22});
        statusText.textContent = monster.alive ? `Treffer! Dieses Monster braucht noch ${monster.hp} Treffer.` : 'Monster besiegt! Weiter zur Boss-Arena.';
      }
    }
    if (ball.life>0 && boss.active && boss.hp>0 && overlaps(ball.x-9,ball.y-9,18,18,boss.x,boss.y,64,76)) {
      ball.life=0;boss.hp--;
      for (let i=0;i<10;i++) sparks.push({x:ball.x,y:ball.y,vx:Math.cos(i*Math.PI/5)*3,vy:Math.sin(i*Math.PI/5)*3,life:22});
      if (boss.hp===0) { finishLevel(); return; }
    }
  }
  fireballs = fireballs.filter(ball => ball.life>0 && ball.x>-30 && ball.x<levels[levelIndex].worldWidth+30);
  for (const spark of sparks) { spark.x+=spark.vx; spark.y+=spark.vy; spark.vy+=0.1; spark.life--; }
  sparks = sparks.filter(spark => spark.life>0);
  for (const monster of monsters) {
    if (monster.alive && overlaps(player.x,player.y,width,height,monster.x,monster.y,32,32)) {
      if (hurtPlayer()) return;
    }
  }
  updateBoss();
}

function finishLevel() {
  if (!completed && boss.hp===0) {
    completed = true;
    clearInput();
    bossShots=[];
    updateAbilityDisplay();
    const last = levelIndex === levels.length-1;
    document.querySelector('#result-label').textContent = last ? 'AIR FIGHTERS CHAMPION' : 'BOSS BESIEGT!';
    document.querySelector('#result-title').textContent = last ? 'Alle Level geschafft!' : `Level ${levelIndex+1} geschafft!`;
    document.querySelector('#result-text').textContent = last ? `Alle ${levels.length} Bosse besiegt! Du hast den Parkour mit ${falls} Stürzen gemeistert.` : 'Der Weg ist frei! Bereit für das nächste Level?';
    document.querySelector('#next').textContent = last ? 'Noch einmal spielen ↻' : 'Nächstes Level →';
    statusText.textContent = last ? `Du hast alle ${levels.length} Level beendet!` : 'Level beendet!';
    overlay.hidden = false;
    document.querySelector('#next').focus({preventScroll:true});
  }
}

// Schwerkraft, Bewegung und Landen auf den Plattformen.
function update() {
  if (freecam) {updateFreecam();return;}
  tick++;
  if (completed) return;
  if (punchFrames>0) punchFrames--;
  if (punchCooldown>0) punchCooldown--;
  if (shieldFrames>0) shieldFrames--;
  if (shieldCooldown>0) shieldCooldown--;
  if (laserCooldown>0) laserCooldown--;
  if (laserFrames>0) laserFrames--;
  player.vx = ((keys.right ? 1 : 0) - (keys.left ? 1 : 0)) * 4.2;
  if (player.vx) facing = Math.sign(player.vx);
  if (grounded) coyote = 6; else coyote--;
  // Ein Sprung vom Boden; die kurze Kulanzzeit hilft direkt an einer Kante.
  if (jumpQueued && coyote > 0) {
    player.vy = -12; grounded = false; coyote = 0;
  }
  jumpQueued = false;
  const oldFeet = player.y + height;
  player.vy += 0.48;
  player.x = Math.max(0, Math.min(levels[levelIndex].worldWidth-width, player.x + player.vx));
  player.y += player.vy;
  grounded = false;
  for (const [index,[x,y,w]] of levels[levelIndex].platforms.entries()) {
    if (player.vy >= 0 && oldFeet <= y && player.y + height >= y && player.x + width > x && player.x < x+w) {
      player.y = y-height; player.vy = 0; grounded = true;
      lastPlatformIndex=index;
      break;
    }
  }
  if (player.y > 560) {
    respawnAfterFall();
    return;
  }
  updateCombat(oldFeet);
  updateTravel();
  updateAbilityDisplay();
}

const renderer = new ParkourRenderer2D(canvas,ctx);
function draw() {
  renderer.render({level:levels[levelIndex],levelIndex,player,monsters,boss,bossShots,fireballs,sparks,cameraX,cameraY,tick,facing,grounded,invincible,punchFrames,punchDirection,shieldFrames,laserFrames,laser});
}


const handled = ['ArrowLeft','ArrowRight','ArrowUp','Space','KeyA','KeyW','KeyF','KeyD','KeyL','KeyG','KeyC','Escape'];
window.addEventListener('keydown', event => {
  if (event.code==='KeyC' || (event.code==='Escape' && freecam)) {
    event.preventDefault();if(!event.repeat)setFreecam(!freecam);return;
  }
  if (freecam) {
    if(cameraKeyMap[event.code]) {event.preventDefault();cameraKeys[cameraKeyMap[event.code]]=true;}
    return;
  }
  if (!handled.includes(event.code)) return;
  if (event.target instanceof HTMLButtonElement && event.code === 'Space') return;
  event.preventDefault();
  if (event.code === 'ArrowLeft' || event.code === 'KeyA') keyboardKeys.left=true;
  if (event.code === 'ArrowRight') keyboardKeys.right=true;
  if (event.code === 'KeyF') keyboardKeys.fire=true;
  syncInput();
  if (['Space','ArrowUp','KeyW'].includes(event.code) && !event.repeat) jumpQueued=true;
  if (event.code === 'KeyD' && !event.repeat) useAbility('shield');
  if (event.code === 'KeyL' && !event.repeat) useAbility('laser');
  if (event.code === 'KeyG' && !event.repeat) useAbility('punch');
});
window.addEventListener('keyup', event => {
  if(cameraKeyMap[event.code])cameraKeys[cameraKeyMap[event.code]]=false;
  if(freecam)return;
  if (event.code === 'ArrowLeft' || event.code === 'KeyA') keyboardKeys.left=false;
  if (event.code === 'ArrowRight') keyboardKeys.right=false;
  if (event.code === 'KeyF') keyboardKeys.fire=false;
  syncInput();
});
function clearInput() {
  keys.left=keys.right=keys.fire=false;
  keyboardKeys.left=keyboardKeys.right=keyboardKeys.fire=false;
  for(const touch of touchPointers.values()) touch.button.classList.remove('pressed');
  touchPointers.clear();jumpQueued=false;
  for(const direction of Object.keys(cameraKeys))cameraKeys[direction]=false;
  cameraPointers.clear();cameraDrag=null;
  document.querySelectorAll('[data-camera]').forEach(button=>button.classList.remove('pressed'));
}
window.addEventListener('blur',clearInput);
document.addEventListener('visibilitychange',clearInput);
document.querySelectorAll('[data-control], [data-ability]').forEach(button => {
  button.addEventListener('pointerdown', event => {
    if (completed || freecam || button.disabled) return;
    event.preventDefault();button.setPointerCapture(event.pointerId);
    touchPointers.set(event.pointerId,{control:button.dataset.control,button});
    button.classList.add('pressed');
    if (button.dataset.ability) useAbility(button.dataset.ability);
    else if (button.dataset.control==='jump') jumpQueued=true;
    syncInput();
  });
  for (const name of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(name, event => {
    touchPointers.delete(event.pointerId);
    if (![...touchPointers.values()].some(touch=>touch.button===button)) button.classList.remove('pressed');
    syncInput();
  });
  button.addEventListener('contextmenu',event => event.preventDefault());
  button.addEventListener('click', event => {
    if (event.detail!==0 || completed || freecam) return;
    if (button.dataset.ability) useAbility(button.dataset.ability);
    else if (button.dataset.control==='jump') jumpQueued=true;
  });
});
document.querySelector('#freecam').addEventListener('click',()=>setFreecam(!freecam));
document.querySelectorAll('[data-camera]').forEach(button=>{
  button.addEventListener('pointerdown',event=>{
    if(!freecam)return;
    event.preventDefault();button.setPointerCapture(event.pointerId);
    cameraPointers.set(event.pointerId,button.dataset.camera);button.classList.add('pressed');
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,event=>{
    cameraPointers.delete(event.pointerId);
    if(![...cameraPointers.values()].includes(button.dataset.camera))button.classList.remove('pressed');
  });
});
canvas.addEventListener('pointerdown',event=>{
  if(!freecam || cameraDrag)return;
  event.preventDefault();canvas.setPointerCapture(event.pointerId);
  const rect=canvas.getBoundingClientRect();
  cameraDrag={id:event.pointerId,x:event.clientX,y:event.clientY,cameraX,cameraY,scale:Math.min(rect.width/canvas.width,rect.height/canvas.height)};
});
canvas.addEventListener('pointermove',event=>{
  if(!freecam || !cameraDrag || event.pointerId!==cameraDrag.id)return;
  event.preventDefault();
  cameraX=cameraDrag.cameraX-(event.clientX-cameraDrag.x)/cameraDrag.scale;
  cameraY=cameraDrag.cameraY-(event.clientY-cameraDrag.y)/cameraDrag.scale;
  clampCamera();
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,event=>{
  if(cameraDrag?.id===event.pointerId)cameraDrag=null;
});
document.querySelector('#restart').addEventListener('click',() => { startLevel(); canvas.focus({preventScroll:true}); });
document.querySelector('#next').addEventListener('click',() => {
  if (!completed) return;
  if (levelIndex===levels.length-1) { levelIndex=0; falls=0; document.querySelector('#falls').textContent='Stürze: 0'; }
  else levelIndex++;
  startLevel(); canvas.focus({preventScroll:true});
});

// Feste Zeitschritte sorgen auf schnellen und langsamen Bildschirmen für gleiches Tempo.
let lastTime=null, accumulator=0;
function frame(time) {
  if (lastTime===null) lastTime=time;
  accumulator+=Math.min(time-lastTime,100); lastTime=time;
  while (accumulator>=1000/60) { update(); accumulator-=1000/60; }
  draw(); requestAnimationFrame(frame);
}
startLevel();
requestAnimationFrame(frame);
