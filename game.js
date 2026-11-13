(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const ui = { health: $('healthBar'), healthText: $('healthText'), essence: $('essenceBar'), essenceText: $('essenceText'), army: $('armyCount'), level: $('levelText'), xp: $('xpBar'), threat: $('threatLevel'), pips: $('threatPips'), hint: $('threatHint'), objective: $('objective'), wave: $('waveBanner'), waveTitle: $('waveTitle'), waveProgress: $('waveProgress'), waveBar: $('waveBar'), toast: $('toast') };
  let W = 0, H = 0, dpr = 1, last = 0, running = false, paused = false, soundOn = true;
  let zoom = 1, cameraAngle = 0, tick = 0, toastTimer = 0, waveWait = 0, waveKills = 0;
  let threat = 1, waveNumber = 0, totalKills = 0, xp = 0, level = 1, essence = 0, shake = 0;
  const keys = new Set(), enemies = [], legion = [], particles = [], props = [], decals = [];
  const player = { x: 0, y: 0, vx: 0, vy: 0, hp: 100, maxHp: 100, facing: 0, attack: 0, attackCd: 0, castCd: 0, hurt: 0, invuln: 0, moveX: 0, moveY: 0 };
  const world = { seed: 78213, size: 1900 };
  const rand = (n) => { let x = Math.sin(n * 127.1 + world.seed * 311.7) * 43758.5453; return x - Math.floor(x); };
  function resize() { dpr = Math.min(window.devicePixelRatio || 1, 2); W = canvas.clientWidth; H = canvas.clientHeight; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  window.addEventListener('resize', resize); resize();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const angleTo = (a,b) => Math.atan2(b.y-a.y,b.x-a.x);
  const choice = arr => arr[Math.floor(Math.random()*arr.length)];
  function project(x,y,z=0) {
    const dx=x-player.x, dy=y-player.y, c=Math.cos(cameraAngle), s=Math.sin(cameraAngle);
    const rx=dx*c-dy*s, ry=dx*s+dy*c;
    const depth=clamp(1-ry*.00012,.72,1.22), scale=zoom*depth;
    return { x:W*.5+rx*scale, y:H*.56+ry*scale*.72-z*scale, scale, depth, ry };
  }
  function colorNoise(x,y){return rand(Math.floor(x/90)*61+Math.floor(y/90)*137)}
  function terrain() {
    const sky=ctx.createLinearGradient(0,0,0,H); sky.addColorStop(0,'#1c2927');sky.addColorStop(.42,'#293a31');sky.addColorStop(1,'#374536');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    const center=project(player.x,player.y); const step=80;
    for(let gy=-18;gy<=18;gy++) for(let gx=-24;gx<=24;gx++) {
      const wx=player.x+gx*step, wy=player.y+gy*step;
      if(Math.abs(wx)>world.size||Math.abs(wy)>world.size) continue;
      const p=project(wx,wy); if(p.x<-100||p.x>W+100||p.y<-100||p.y>H+100) continue;
      const n=colorNoise(wx,wy); let base=n>.74?'#45513b':n>.40?'#3d4a38':'#394638';
      const path=Math.abs(wx+wy*.34)<150 || Math.abs(wx-wy*.66+240)<87;
      if(path) base=n>.5?'#5a5844':'#514f3e';
      ctx.fillStyle=base; ctx.fillRect(p.x- step*p.scale*.51,p.y-step*p.scale*.37,step*p.scale*1.03,step*p.scale*.74);
      if(n>.87){ctx.fillStyle='#84906a28';ctx.beginPath();ctx.ellipse(p.x+rand(gx*53+gy)*30-15,p.y+rand(gx*39-gy)*18-9,1.5*p.scale,5*p.scale,rand(gx+gy)*3,0,Math.PI*2);ctx.fill()}
      if(path&&n>.66){ctx.fillStyle='#99876040';ctx.beginPath();ctx.ellipse(p.x+17*p.scale,p.y-4*p.scale,13*p.scale,5*p.scale,.25,0,Math.PI*2);ctx.fill()}
    }
    // Distant ridge silhouettes and sparse spires anchor the horizon.
    const horizon=H*.25; ctx.fillStyle='#1c2924';ctx.beginPath();ctx.moveTo(0,horizon+55);
    for(let x=0;x<=W+40;x+=40){const peak=rand(Math.floor(x/40)+881)*70;ctx.lineTo(x,horizon+38-peak)}ctx.lineTo(W,H*.50);ctx.lineTo(0,H*.5);ctx.closePath();ctx.fill();
    const glow=ctx.createRadialGradient(W*.5,H*.39,10,W*.5,H*.43,W*.58);glow.addColorStop(0,'#c7a86a1a');glow.addColorStop(1,'#b88f4a00');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H*.75);
    drawProps();
  }
  function drawProps() {
    const cx=Math.floor(player.x/170), cy=Math.floor(player.y/170); const nearby=[];
    for(let y=cy-8;y<=cy+8;y++)for(let x=cx-10;x<=cx+10;x++){
      const id=x*91+y*337; if(rand(id+4)>.72)continue;
      const wx=x*170+(rand(id+1)-.5)*145, wy=y*170+(rand(id+2)-.5)*145;
      if(Math.abs(wx)>world.size||Math.abs(wy)>world.size)continue;
      const p=project(wx,wy);if(p.x<-70||p.x>W+70||p.y<-100||p.y>H+70)continue;nearby.push({p,n:rand(id+8),id});
    }
    nearby.sort((a,b)=>a.p.ry-b.p.ry);
    for(const o of nearby){const {p,n}=o,s=p.scale;
      if(n<.45){ // dead tree
        ctx.strokeStyle=n<.16?'#262e28':'#30382d';ctx.lineWidth=4*s;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-2*s,p.y-28*s);ctx.lineTo(p.x-16*s,p.y-42*s);ctx.moveTo(p.x-2*s,p.y-28*s);ctx.lineTo(p.x+10*s,p.y-39*s);ctx.stroke();
        ctx.fillStyle='#292f28';ctx.beginPath();ctx.ellipse(p.x,p.y,13*s,5*s,0,0,Math.PI*2);ctx.fill();
      } else if(n<.69){ctx.fillStyle='#272e27';ctx.beginPath();ctx.ellipse(p.x,p.y,16*s,7*s,-.2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#535744';ctx.beginPath();ctx.ellipse(p.x-3*s,p.y-3*s,10*s,4*s,-.15,0,Math.PI*2);ctx.fill()}
      else {ctx.fillStyle='#252f28';ctx.beginPath();ctx.ellipse(p.x,p.y,10*s,4*s,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#63724c';ctx.beginPath();ctx.ellipse(p.x,p.y-7*s,7*s,9*s,0,0,Math.PI*2);ctx.fill()}
    }
  }
  function drawGroundMarks(){ for(const d of decals){const p=project(d.x,d.y);if(p.x<-30||p.x>W+30||p.y<-30||p.y>H+30)continue;ctx.globalAlpha=d.life;ctx.fillStyle=d.color;ctx.beginPath();ctx.ellipse(p.x,p.y,13*p.scale,5*p.scale,d.rot,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;} }
  function spawnWave(initial=false){
    waveNumber++; waveKills=0; const count=initial?5:Math.min(5+waveNumber*2,36);
    threat=Math.max(1,Math.floor((waveNumber+1)/2));
    const labels=['THE FIRST HUNT','CARRION COMPANY','THE HOLLOW MARCH','BLOOD IN THE VEIL','THE GRAVE TIDE','ASHEN ONSLAUGHT'];
    ui.waveTitle.textContent=labels[(waveNumber-1)%labels.length]; ui.wave.classList.add('visible'); ui.objective.textContent=`Defeat the hostiles · Wave ${waveNumber}`;
    for(let i=0;i<count;i++){
      const a=Math.random()*Math.PI*2, r=420+Math.random()*240, brute=(Math.random()<Math.min(.18+waveNumber*.025,.48));
      const e={x:player.x+Math.cos(a)*r,y:player.y+Math.sin(a)*r,hp:(brute?80:48)+waveNumber*8,maxHp:(brute?80:48)+waveNumber*8,speed:(brute?26:39)+Math.min(waveNumber,14)*.45,damage:brute?14:9,rad:brute?13:9,kind:brute?'brute':'ghoul',attack:0,attackCd:.3+Math.random(),hit:0,dead:false,id:Math.random()}; enemies.push(e);
    }
    updateWaveUI(); setTimeout(()=>{if(running&&!paused)ui.wave.classList.remove('visible')},2600);
    if(!initial) showToast(`WAVE ${waveNumber} · THREAT RISING`);
  }
  function updateWaveUI(){ const defeated=waveKills, total=waveKills+enemies.length; ui.waveProgress.textContent=`${defeated} / ${total}`;ui.waveBar.style.width=`${total?defeated/total*100:100}%`; }
  function spawnParticles(x,y,count,color,type='spark') {for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2, sp=type==='smoke'?15+Math.random()*26:30+Math.random()*130;particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,z:Math.random()*25,vz:30+Math.random()*75,life:.35+Math.random()*.8,max:.7,color,type,size:2+Math.random()*4});}}
  function showToast(text){ui.toast.textContent=text;ui.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),1650)}
  function nearestEnemy(range=Infinity, from=player){let best=null,bd=range;for(const e of enemies){if(e.dead)continue;const d=dist(e,from);if(d<bd){bd=d;best=e}}return best}
  function killEnemy(e){if(e.dead)return;e.dead=true;waveKills++;totalKills++;xp+=20+threat*2;essence+=12+threat;player.hp=Math.min(player.maxHp,player.hp+3);legion.push({x:e.x,y:e.y,tx:e.x,ty:e.y,angle:0,attackCd:Math.random(),glow:Math.random()*6.28});spawnParticles(e.x,e.y,19,'#c6d99b','soul');decals.push({x:e.x,y:e.y,life:1,rot:Math.random()*3,color:'#7d544766'});if(legion.length===1)showToast('SOUL CLAIMED · YOUR LEGION GROWS');if(totalKills%5===0)showToast(`THE LEGION GROWS · ${legion.length} SOULS`);if(xp>=level*100){xp-=level*100;level++;player.maxHp+=8;player.hp=Math.min(player.maxHp,player.hp+25);showToast(`LEVEL ${String(level).padStart(2,'0')} · VITALITY RESTORED`)}updateUI();updateWaveUI();}
  function damageEnemy(e,amount,dir){e.hp-=amount;e.hit=.16;spawnParticles(e.x,e.y,5,'#e99b72');if(e.hp<=0){killEnemy(e);return}e.x+=Math.cos(dir)*8;e.y+=Math.sin(dir)*8;}
  function attack(){if(!running||paused||player.attackCd>0)return;player.attackCd=.44;player.attack=.25;const target=nearestEnemy(130);let dir=target?angleTo(player,target):player.facing;player.facing=dir;shake=Math.max(shake,2.4);spawnParticles(player.x+Math.cos(dir)*48,player.y+Math.sin(dir)*48,14,'#d7c383','arc');let hit=0;for(const e of enemies){if(e.dead)continue;const d=dist(player,e),a=Math.atan2(e.y-player.y,e.x-player.x),delta=Math.atan2(Math.sin(a-dir),Math.cos(a-dir));if(d<122&&Math.abs(delta)<.9){damageEnemy(e,42+level*3,dir);hit++}}if(!hit){spawnParticles(player.x+Math.cos(dir)*62,player.y+Math.sin(dir)*62,6,'#bbc28b','spark')}}
  function castRaise(){if(!running||paused||player.castCd>0)return;player.castCd=4.5;essence=Math.max(0,essence-10);player.attack=.52;spawnParticles(player.x,player.y,28,'#b9d889','soul');let hits=0;for(const e of enemies){if(!e.dead&&dist(e,player)<195){damageEnemy(e,30+level*2,angleTo(player,e));hits++}}showToast(hits?`GRAVE PULSE · ${hits} HOSTILES STRUCK`:'THE LEGION ANSWERS');updateUI();}
  function update(dt){tick+=dt;if(!running||paused)return;
    player.attackCd=Math.max(0,player.attackCd-dt);player.castCd=Math.max(0,player.castCd-dt);player.attack=Math.max(0,player.attack-dt);player.invuln=Math.max(0,player.invuln-dt);player.hurt=Math.max(0,player.hurt-dt);
    let ix=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0), iy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);ix+=touchMove.x;iy+=touchMove.y;const mag=Math.hypot(ix,iy);if(mag>1){ix/=mag;iy/=mag}
    const c=Math.cos(cameraAngle),s=Math.sin(cameraAngle),wx=ix*c+iy*s,wy=-ix*s+iy*c;player.moveX=wx;player.moveY=wy;
    const speed=190;player.vx+=(wx*speed-player.vx)*Math.min(1,dt*11);player.vy+=(wy*speed-player.vy)*Math.min(1,dt*11);player.x=clamp(player.x+player.vx*dt,-world.size+90,world.size-90);player.y=clamp(player.y+player.vy*dt,-world.size+90,world.size-90);
    if(mag>.12)player.facing=Math.atan2(wy,wx);
    if(player.hurt>0)player.vx*=.98;
    for(const e of enemies){if(e.dead)continue;e.attackCd-=dt;e.attack=Math.max(0,e.attack-dt);e.hit=Math.max(0,e.hit-dt);const d=dist(e,player);if(d>36){const a=angleTo(e,player);e.x+=Math.cos(a)*e.speed*dt;e.y+=Math.sin(a)*e.speed*dt;}else if(e.attackCd<=0){e.attackCd=e.kind==='brute'?1.5:1.15;e.attack=.32;if(player.invuln<=0){player.hp-=e.damage;player.invuln=.48;player.hurt=.2;shake=5;spawnParticles(player.x,player.y,7,'#c96550');if(player.hp<=0)endGame()}}}
    for(let i=legion.length-1;i>=0;i--){const u=legion[i],target=nearestEnemy(290,u);u.glow+=dt*2;if(target){const d=dist(u,target);u.angle=angleTo(u,target);if(d>39){u.x+=(target.x-u.x)/d*95*dt;u.y+=(target.y-u.y)/d*95*dt}else{u.attackCd-=dt;if(u.attackCd<=0){u.attackCd=.82;damageEnemy(target,12+level,angleTo(u,target));spawnParticles(target.x,target.y,3,'#b5d17e')}}}else{const index=i+1,angle=player.facing+Math.PI+(index%8-4)*.36+Math.floor(index/8)*.16;const radius=52+Math.floor(index/8)*15;u.tx=player.x+Math.cos(angle)*radius;u.ty=player.y+Math.sin(angle)*radius;if(dist(u,{x:u.tx,y:u.ty})>13){u.x+=(u.tx-u.x)*Math.min(1,dt*3);u.y+=(u.ty-u.y)*Math.min(1,dt*3)}}}
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vz-=110*dt;if(p.life<=0)particles.splice(i,1)}
    for(let i=decals.length-1;i>=0;i--){decals[i].life-=dt*.025;if(decals[i].life<=0)decals.splice(i,1)}
    for(let i=enemies.length-1;i>=0;i--)if(enemies[i].dead)enemies.splice(i,1);
    if(enemies.length===0&&waveWait<=0){waveWait=3.2;ui.objective.textContent='Frontier clear · ready yourself';showToast('WAVE CLEARED · THE VEIL THINS')}
    if(enemies.length===0&&waveWait>0){waveWait-=dt;if(waveWait<=0){spawnWave();player.hp=Math.min(player.maxHp,player.hp+10)}}
    if(shake>0)shake=Math.max(0,shake-dt*12);updateUI();
  }
  function updateUI(){ui.health.style.width=`${clamp(player.hp/player.maxHp*100,0,100)}%`;ui.healthText.textContent=`${Math.ceil(player.hp)} / ${player.maxHp}`;ui.essence.style.width=`${clamp(essence/100*100,0,100)}%`;ui.essenceText.textContent=essence;ui.army.textContent=legion.length;ui.level.textContent=`LVL ${String(level).padStart(2,'0')}`;ui.xp.style.width=`${xp/(level*100)*100}%`;ui.threat.textContent=['I','II','III','IV','V','VI','VII','VIII'][Math.min(7,threat-1)];ui.pips.innerHTML='';for(let i=0;i<6;i++){const pip=document.createElement('i');if(i<threat)pip.className='on';ui.pips.appendChild(pip)}ui.hint.textContent=threat<3?'The dead are restless':threat<6?'The veil is weakening':'The wilds hunger for your soul';}
  function drawShadow(p,rx=10,ry=4,alpha=.4){ctx.fillStyle=`rgba(5,8,6,${alpha})`;ctx.beginPath();ctx.ellipse(p.x,p.y+2*p.scale,rx*p.scale,ry*p.scale,0,0,Math.PI*2);ctx.fill()}
  function drawEnemy(e){const p=project(e.x,e.y);if(p.x<-45||p.x>W+45||p.y<-80||p.y>H+60)return;const s=p.scale,r=e.rad*s;drawShadow(p,r*1.2,r*.46,.5);const col=e.hit>0?'#ead6a1':e.kind==='brute'?'#51493b':'#56624a';
    ctx.save();ctx.translate(p.x,p.y);const a=angleTo(e,player)-cameraAngle;ctx.rotate(a);ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(0,-r*1.15,r*.67,r*1.2,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=e.kind==='brute'?'#7a6348':'#7b825b';ctx.beginPath();ctx.arc(r*.05,-r*2.35,r*.61,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d5a267';ctx.fillRect(r*.1,-r*2.45,r*.16,r*.09);ctx.fillRect(r*.39,-r*2.45,r*.16,r*.09);ctx.strokeStyle='#282c22';ctx.lineWidth=2*s;ctx.beginPath();ctx.moveTo(-r*.4,-r*.55);ctx.lineTo(-r*.86,0);ctx.moveTo(r*.4,-r*.55);ctx.lineTo(r*.65,0);ctx.stroke();if(e.attack>.08){ctx.strokeStyle='#c37d55';ctx.lineWidth=2*s;ctx.beginPath();ctx.arc(0,-r, r*2.4,-.8,.7);ctx.stroke()}ctx.restore();
    if(e.hp<e.maxHp){ctx.fillStyle='#141914';ctx.fillRect(p.x-r,p.y-r*3.1,r*2,3*s);ctx.fillStyle='#c97f59';ctx.fillRect(p.x-r,p.y-r*3.1,r*2*clamp(e.hp/e.maxHp,0,1),3*s)}
  }
  function drawUndead(u){const p=project(u.x,u.y);if(p.x<-25||p.x>W+25||p.y<-55||p.y>H+45)return;const s=p.scale,glow=.25+Math.sin(u.glow)*.13;drawShadow(p,7,3,.35);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(u.angle-cameraAngle);ctx.fillStyle='#404b3a';ctx.beginPath();ctx.ellipse(0,-8*s,5*s,8*s,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#a5bd77';ctx.beginPath();ctx.arc(1*s,-17*s,4*s,0,Math.PI*2);ctx.fill();ctx.fillStyle=`rgba(187,221,128,${glow})`;ctx.shadowColor='#c5ef8c';ctx.shadowBlur=9*s;ctx.fillRect(1*s,-18*s,1.5*s,1.3*s);ctx.shadowBlur=0;ctx.strokeStyle='#65714b';ctx.lineWidth=2*s;ctx.beginPath();ctx.moveTo(-3*s,-5*s);ctx.lineTo(-7*s,0);ctx.moveTo(3*s,-5*s);ctx.lineTo(6*s,0);ctx.stroke();ctx.restore()}
  function drawPlayer(){const p=project(player.x,player.y);drawShadow(p,13,5,.62);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(player.facing-cameraAngle);const s=p.scale;if(player.invuln>0&&Math.floor(tick*22)%2===0)ctx.globalAlpha=.55;
    // ragged cloak silhouette
    ctx.fillStyle=player.hurt>0?'#b85c47':'#282b29';ctx.beginPath();ctx.moveTo(-9*s,-9*s);ctx.lineTo(-11*s,-27*s);ctx.lineTo(-7*s,-35*s);ctx.lineTo(0,-39*s);ctx.lineTo(9*s,-33*s);ctx.lineTo(11*s,-12*s);ctx.lineTo(16*s,-2*s);ctx.lineTo(8*s,-5*s);ctx.lineTo(2*s,1*s);ctx.lineTo(-4*s,-4*s);ctx.lineTo(-13*s,0);ctx.closePath();ctx.fill();
    ctx.fillStyle='#bdad83';ctx.beginPath();ctx.arc(1*s,-35*s,5*s,0,Math.PI*2);ctx.fill();ctx.fillStyle='#171d19';ctx.beginPath();ctx.moveTo(-5*s,-36*s);ctx.lineTo(-8*s,-45*s);ctx.lineTo(2*s,-42*s);ctx.lineTo(7*s,-36*s);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#d6c07e';ctx.lineWidth=2*s;ctx.beginPath();ctx.moveTo(5*s,-17*s);ctx.lineTo(19*s,-44*s);ctx.stroke();ctx.fillStyle='#cdbb82';ctx.beginPath();ctx.arc(20*s,-45*s,3*s,0,Math.PI*2);ctx.fill();
    if(player.attack>0){const t=player.attack/.25;ctx.strokeStyle=`rgba(221,205,141,${Math.min(1,t*1.4)})`;ctx.lineWidth=3*s;ctx.shadowColor='#e9dc9c';ctx.shadowBlur=15*s;ctx.beginPath();ctx.arc(0,-19*s,47*s,-1.2,1.25);ctx.stroke();ctx.shadowBlur=0}
    if(player.castCd>4.1){ctx.strokeStyle=`rgba(189,220,133,${(player.castCd-4.1)*2.5})`;ctx.lineWidth=2*s;ctx.beginPath();ctx.arc(0,0,39*s,0,Math.PI*2);ctx.stroke()}
    ctx.restore();}
  function drawParticles(){for(const p of particles){const q=project(p.x,p.y,p.z),alpha=clamp(p.life/.45,0,1);ctx.globalAlpha=alpha;if(p.type==='arc'){ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(q.x,q.y,2*q.scale,0,Math.PI*2);ctx.fill()}else{ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=7*q.scale;ctx.beginPath();ctx.arc(q.x,q.y,Math.max(1,p.size*q.scale*(p.life/p.max)),0,Math.PI*2);ctx.fill();ctx.shadowBlur=0}}ctx.globalAlpha=1}
  function render(){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);ctx.save();if(shake)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);terrain();drawGroundMarks();const actors=[];for(const e of enemies)if(!e.dead)actors.push({y:e.y,draw:()=>drawEnemy(e)});for(const u of legion)actors.push({y:u.y,draw:()=>drawUndead(u)});actors.push({y:player.y,draw:drawPlayer});actors.sort((a,b)=>a.y-b.y);for(const a of actors)a.draw();drawParticles();ctx.restore();}
  function frame(now){const dt=Math.min(.034,(now-last)/1000||0);last=now;update(dt);render();requestAnimationFrame(frame)}requestAnimationFrame(frame);
  function begin(){if(running)return;running=true;paused=false;$('introScreen').classList.add('hidden');$('pauseScreen').classList.add('hidden');spawnWave(true);showToast('WASD TO MOVE · SPACE TO STRIKE');}
  function togglePause(){if(!running)return;paused=!paused;$('pauseScreen').classList.toggle('hidden',!paused)}
  function endGame(){running=false;$('finalStats').textContent=`You claimed ${totalKills} souls and raised ${legion.length} undead. The legion awaits your return.`;$('gameoverScreen').classList.remove('hidden')}
  function reset(){enemies.length=0;legion.length=0;particles.length=0;decals.length=0;player.x=0;player.y=0;player.hp=100;player.maxHp=100;player.vx=player.vy=0;threat=1;waveNumber=0;totalKills=0;waveWait=0;xp=0;level=1;essence=0;running=false;paused=false;$('gameoverScreen').classList.add('hidden');updateUI();begin()}
  function changeZoom(n){zoom=clamp(zoom+n,.65,1.5)}
  $('beginBtn').addEventListener('click',begin);$('resumeBtn').addEventListener('click',togglePause);$('pauseBtn').addEventListener('click',togglePause);$('retryBtn').addEventListener('click',reset);$('zoomIn').addEventListener('click',()=>changeZoom(.1));$('zoomOut').addEventListener('click',()=>changeZoom(-.1));$('attackBtn').addEventListener('pointerdown',e=>{e.preventDefault();attack()});$('summonBtn').addEventListener('pointerdown',e=>{e.preventDefault();castRaise()});
  $('mapBtn').addEventListener('click',()=>{$('mapOverlay').classList.remove('hidden');drawMap()});$('closeMap').addEventListener('click',()=>$('mapOverlay').classList.add('hidden'));
  $('soundBtn').addEventListener('click',e=>{soundOn=!soundOn;e.currentTarget.textContent=soundOn?'♫':'♪';showToast(soundOn?'SOUND ON':'SOUND OFF')});
  $('mapOverlay').addEventListener('click',e=>{if(e.target===$('mapOverlay'))$('mapOverlay').classList.add('hidden')});
  function drawMap(){const c=$('minimap'),g=c.getContext('2d'),w=c.width,h=c.height;g.fillStyle='#273528';g.fillRect(0,0,w,h);for(let i=0;i<120;i++){const x=rand(i*3+12)*w,y=rand(i*5+99)*h;g.fillStyle=i%3?'#3c4937':'#56523e';g.beginPath();g.ellipse(x,y,5+rand(i+9)*18,3+rand(i+33)*10,rand(i)*3,0,Math.PI*2);g.fill()}g.strokeStyle='#877a55';g.lineWidth=8;g.beginPath();g.moveTo(-10,h*.78);g.bezierCurveTo(w*.2,h*.2,w*.55,h*.94,w+15,h*.32);g.stroke();g.strokeStyle='#bba774';g.lineWidth=2;g.beginPath();g.arc(w*.5,h*.5,12,0,Math.PI*2);g.stroke();g.fillStyle='#e3d18f';g.beginPath();g.arc(w*.5,h*.5,4,0,Math.PI*2);g.fill();g.fillStyle='#cc805b';g.font='10px monospace';for(let i=0;i<Math.min(enemies.length,24);i++){const e=enemies[i],x=w*.5+(e.x-player.x)/10,y=h*.5+(e.y-player.y)/10;if(x>8&&x<w-8&&y>8&&y<h-8){g.beginPath();g.arc(x,y,2,0,Math.PI*2);g.fill()}}}
  const touchMove={x:0,y:0};let stickId=null,stickRect=null;
  $('stickZone').addEventListener('pointerdown',e=>{e.preventDefault();stickId=e.pointerId;stickRect=$('stickZone').getBoundingClientRect();$('stickZone').setPointerCapture(e.pointerId);moveStick(e)});
  $('stickZone').addEventListener('pointermove',e=>{if(e.pointerId===stickId)moveStick(e)});
  function moveStick(e){const cx=stickRect.left+stickRect.width/2,cy=stickRect.top+stickRect.height/2,dx=e.clientX-cx,dy=e.clientY-cy,m=Math.max(1,Math.hypot(dx,dy)),len=Math.min(32,m);$('stickKnob').style.transform=`translate(${dx/m*len}px,${dy/m*len}px)`;touchMove.x=dx/m*Math.min(1,m/26);touchMove.y=dy/m*Math.min(1,m/26)}
  $('stickZone').addEventListener('pointerup',releaseStick);$('stickZone').addEventListener('pointercancel',releaseStick);function releaseStick(){stickId=null;touchMove.x=touchMove.y=0;$('stickKnob').style.transform='translate(0,0)'}
  let lookX=null;$('touchLook').addEventListener('pointerdown',e=>{lookX=e.clientX;$('touchLook').setPointerCapture(e.pointerId)});$('touchLook').addEventListener('pointermove',e=>{if(lookX!==null){cameraAngle+=(lookX-e.clientX)*.009;lookX=e.clientX}});$('touchLook').addEventListener('pointerup',()=>lookX=null);$('touchLook').addEventListener('pointercancel',()=>lookX=null);
  window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();keys.add(k);if(k===' '||k==='j')attack();if(k==='r')castRaise();if(k==='q')cameraAngle-=.16;if(k==='e')cameraAngle+=.16;if(k==='escape')togglePause();if(k==='m'){$('mapOverlay').classList.toggle('hidden');if(!$('mapOverlay').classList.contains('hidden'))drawMap()}});
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&running&&!paused)attack()});canvas.addEventListener('wheel',e=>{changeZoom(e.deltaY<0?.08:-.08);e.preventDefault()},{passive:false});
  let rotateId=null, rotateX=0;canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&e.clientX>W*.45){rotateId=e.pointerId;rotateX=e.clientX;canvas.setPointerCapture(e.pointerId)}});canvas.addEventListener('pointermove',e=>{if(e.pointerId===rotateId){cameraAngle+=(rotateX-e.clientX)*.009;rotateX=e.clientX}});canvas.addEventListener('pointerup',()=>rotateId=null);
  updateUI();
})();