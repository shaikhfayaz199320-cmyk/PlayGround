import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';

// Gravebound: The Ashen Wilds — a self-contained, procedural action adventure.
const canvas = document.querySelector('#world');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#a5a18e');
scene.fog = new THREE.FogExp2('#9d9a89', .009);
const camera = new THREE.PerspectiveCamera(54, innerWidth / innerHeight, .1, 180);
const clock = new THREE.Clock();
const world = new THREE.Group(); scene.add(world);
const material = (color, roughness=.85, extra={}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
const M = {
  soil: material('#3d453a'), grass: material('#4c5741'), grass2: material('#364339'), moss: material('#727351'),
  stone: material('#77776b'), stone2: material('#4b504d'), pale: material('#a49b83'), bark: material('#433d31'),
  leaves: material('#34473c'), leaves2: material('#51573f'), robe: material('#202833'), robe2: material('#121820'),
  leather: material('#594834'), skin: material('#c49a78'), hair: material('#302923'), cloth: material('#59616a'), metal: material('#9b8866',.48), eye: material('#e3d6c1',.35), bone: material('#d1c9b5'), dead: material('#647164'), dead2: material('#343f3b'),
  cyan: material('#91e4e0',.25,{emissive:'#35bcc7',emissiveIntensity:2.2}),
  violet: material('#d1a5ef',.25,{emissive:'#904bd6',emissiveIntensity:2.3}),
  fire: material('#ffc180',.25,{emissive:'#dd6335',emissiveIntensity:2}),
  red: material('#ff9575',.25,{emissive:'#e64c38',emissiveIntensity:2}),
};
scene.add(new THREE.HemisphereLight('#e5dfc8','#39413a',2.2));
const sun = new THREE.DirectionalLight('#f0d7b1',2.5); sun.position.set(-32,50,24); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-55; sun.shadow.camera.right=55; sun.shadow.camera.top=55; sun.shadow.camera.bottom=-55; scene.add(sun);
const fill = new THREE.DirectionalLight('#a4b9c5',.65); fill.position.set(26,18,-28); scene.add(fill);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(150,150),M.soil); ground.rotation.x=-Math.PI/2; ground.position.y=-.12; ground.receiveShadow=true; world.add(ground);
const player = { pos:new THREE.Vector3(0,0,10), hp:100,maxHp:100,mana:100,maxMana:100,xp:0,level:1,kills:0,souls:0,aim:new THREE.Vector3(0,0,-1), attack:0,nova:0,summon:0,dash:0,invuln:0, servants:[], alive:true };
const enemies=[], obelisks=[], projectiles=[], particles=[], drops=[], keys={};
let started=false, ended=false, time=0, toastTime=0, targetObelisk=null, portal=null, boss=null, aimPoint=new THREE.Vector3(0,0,-8), mouseActive=false, audioOn=true, audio=null;
function mesh(g,m,p,x=0,y=0,z=0,shadow=true){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=shadow;o.receiveShadow=true;p.add(o);return o;}
function ball(r,m,p,x,y,z,n=10){return mesh(new THREE.SphereGeometry(r,n,Math.max(6,n-3)),m,p,x,y,z);}
function box(w,h,d,m,p,x,y,z){return mesh(new THREE.BoxGeometry(w,h,d),m,p,x,y,z);}
function cylinder(a,b,h,m,p,x,y,z,n=7){return mesh(new THREE.CylinderGeometry(a,b,h,n),m,p,x,y,z);}
let seed=7181;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const v3=(x,y,z)=>new THREE.Vector3(x,y,z);
function addRock(x,z,s=1){const r=mesh(new THREE.DodecahedronGeometry(s,0),random()>.5?M.stone:M.stone2,world,x,s*.42,z);r.rotation.set(random(),random()*3,random());r.scale.set(1+random()*.5,.65+random()*.6,.8+random()*.5);}
function addTree(x,z,s=1){const g=new THREE.Group();world.add(g);g.position.set(x,0,z);g.rotation.y=random()*6;
 cylinder(.22*s,.42*s,2.7*s,M.bark,g,0,1.35*s,0,6);
 for(let i=0;i<3;i++){const y=(2.1+i*.7)*s,r=(1.2-i*.19)*s;const crown=mesh(new THREE.ConeGeometry(r,2.2*s,7),i===1?M.leaves2:M.leaves,g,(random()-.5)*.25*s,y,0);crown.rotation.z=(random()-.5)*.16;}
 g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return g;}
function buildWorld(){
 // A broken stone road guides the eye between the old settlement and its forgotten shrines.
 for(let i=0;i<30;i++){const z=15-i*2.35;for(let side=-1;side<=1;side+=2){const x=side*(1.3+random()*.45);const slab=mesh(new THREE.BoxGeometry(1.05+random()*.65,.12,.95+random()*.6),random()>.5?M.stone:M.stone2,world,x,-.01,z);slab.rotation.y=(random()-.5)*.18;}}
 for(let i=0;i<115;i++){let x=(random()-.5)*92,z=14-random()*94;if(Math.abs(x)<4&&z<15&&z>-58)continue;if(Math.hypot(x,z-(-12))<6||Math.hypot(x,z-(-34))<6||Math.hypot(x,z-(-55))<7)continue; if(random()<.66)addTree(x,z,.65+random()*.8);else addRock(x,z,.35+random()*.9);}
 // weathered graveyard and ruined arch stones
 for(let i=0;i<17;i++){const x=-18+random()*36,z=-8-random()*20;const stone=box(.22,.65+random()*.45,.12, M.pale,world,x,.28,z);stone.rotation.z=(random()-.5)*.24;stone.rotation.y=random()*2;}
 for(const x of [-10,-7,7,10]){box(.5,2.6,.6,M.stone2,world,x,1.3,-29);}
 box(21,.48,.8,M.stone,world,0,2.45,-29);box(.6,2.4,.65,M.stone2,world,-21,1.2,-29);box(.6,2.4,.65,M.stone2,world,21,1.2,-29);
 // small glades around three obelisks
 const sites=[[-20,-10],[20,-25],[-2,-53]];
 sites.forEach((p,i)=>{const [x,z]=p;const ring=mesh(new THREE.TorusGeometry(4.4,.1,6,40),M.stone2,world,x,.04,z);ring.rotation.x=Math.PI/2;for(let j=0;j<7;j++){const a=j*Math.PI*2/7;addRock(x+Math.cos(a)*5,z+Math.sin(a)*5,.5+random()*.35);}createObelisk(x,z,i);});
 for(let i=0;i<7;i++){const x=-32+i*10;const flame=ball(.16,M.fire,world,x,.35,-41+Math.sin(i)*2);const light=new THREE.PointLight('#ff8c53',1.8,7);light.position.set(x,.8,-41+Math.sin(i)*2);world.add(light);flame.userData.light=light;}
}
function createObelisk(x,z,index){const g=new THREE.Group();world.add(g);g.position.set(x,0,z);
 const base=mesh(new THREE.CylinderGeometry(1.35,1.6,.48,6),M.stone2,g,0,.24,0);base.rotation.y=.2;
 const shaft=mesh(new THREE.CylinderGeometry(.57,.86,3.8,5),M.stone,g,0,2.25,0);shaft.rotation.y=.18;
 const cap=mesh(new THREE.ConeGeometry(.58,.8,5),M.stone2,g,0,4.52,0);cap.rotation.y=.18;
 const rune=ball(.37,M.violet,g,0,2.6,.51,12);const ring=mesh(new THREE.TorusGeometry(1.12,.045,7,32),M.violet,g,0,1.08,0);ring.rotation.x=Math.PI/2;
 const light=new THREE.PointLight('#a867e7',.3,9);light.position.set(0,2.6,0);g.add(light);
 obelisks.push({group:g, pos:v3(x,0,z),index,awakened:false,rune,ring,light});
}
function humanoidLimb(parent,x,y,z,radius,length,material,lean=0){
 const pivot=new THREE.Group();pivot.position.set(x,y,z);parent.add(pivot);pivot.rotation.z=lean;
 const upper=mesh(new THREE.CapsuleGeometry(radius,length,3,7),material,pivot,0,-length*.48,0);
 const joint=ball(radius*.88,material,pivot,0,-length,0,8);
 return {pivot,upper,joint};
}
function makeHuman(g,options={}){
 const hostile=!!options.hostile,skin=options.skin|| (hostile?M.dead:M.skin),outfit=options.outfit||(hostile?M.dead2:M.robe),accent=options.accent||(hostile?M.dead:M.leather);
 // Human silhouette: separate hips, chest, shoulders, articulated limbs, neck and an uncovered face.
 ball(.29,outfit,g,0,.91,0,10).scale.set(1.05,.72,.82);
 const chest=ball(.34,outfit,g,0,1.32,0,10);chest.scale.set(1,.95,.76);
 const armor=mesh(new THREE.BoxGeometry(.37,.28,.045),accent,g,0,1.42,.255);armor.rotation.z=-.08;
 cylinder(.34,.34,.11,M.leather,g,0,1.02,0,10);
 box(.105,.12,.06,M.metal,g,0,1.02,.31);
 // Legs and boots remain clearly separated in silhouette.
 const legs=[];
 for(const side of [-1,1]){
  const leg=humanoidLimb(g,side*.17,.78,0,.115,.38,hostile?M.dead2:M.cloth,-side*.035);legs.push(leg);
  const shin=mesh(new THREE.CapsuleGeometry(.085,.31,3,7),hostile?M.dead:M.leather,g,side*.17,.28,.015);shin.rotation.z=-side*.025;
  const boot=mesh(new THREE.BoxGeometry(.19,.16,.3),M.leather,g,side*.17,.105,.075);boot.rotation.x=-.06;
 }
 // Sleeves, cuffs and hands form a natural arm pose rather than a single blocky cylinder.
 const arms=[];
 for(const side of [-1,1]){
  ball(.17,outfit,g,side*.34,1.52,0,8);
  const arm=humanoidLimb(g,side*.38,1.48,0,.105,.4,hostile?M.dead:M.robe,side*.17);arms.push(arm);
  const fore=mesh(new THREE.CapsuleGeometry(.085,.28,3,7),hostile?M.dead:M.leather,g,side*.47,1.0,.07);fore.rotation.z=side*.2;
  ball(.095,skin,g,side*.49,.82,.1,8);
 }
 cylinder(.105,.12,.2,skin,g,0,1.72,0,9);
 ball(.235,skin,g,0,1.94,.015,12).scale.set(.9,1.05,.88);
 // Hairline, ears, brow, eyes and nose keep the face readable at gameplay distance.
 ball(.235,hostile?M.dead2:M.hair,g,0,2.055,-.015,10).scale.set(1,.55,.92);
 for(const side of [-1,1]){
  ball(.055,skin,g,side*.22,1.94,.015,8);
  ball(.031,M.eye,g,side*.082,1.96,.205,8);
  ball(.019,hostile?M.red:M.hair,g,side*.082,1.96,.229,7);
  const brow=mesh(new THREE.BoxGeometry(.075,.022,.025),hostile?M.dead2:M.hair,g,side*.082,2.015,.205);brow.rotation.z=-side*.12;
 }
 const nose=mesh(new THREE.ConeGeometry(.045,.12,6),skin,g,0,1.91,.25);nose.rotation.x=Math.PI/2;
 if(!hostile){
  // A short mantle hangs behind the adventurer; the face stays open and human.
  const cape=mesh(new THREE.ConeGeometry(.48,1.18,8),M.robe2,g,0,.91,-.17);cape.rotation.x=Math.PI;
  box(.055,.48,.035,M.metal,g,-.22,1.43,.245).rotation.z=-.35;
 }
 return {arms,legs};
}
function createHero(){const g=new THREE.Group();world.add(g);g.position.copy(player.pos);player.mesh=g;
 const body=makeHuman(g,{outfit:M.robe,accent:M.leather});player.limbs=body;
 const shoulder=ball(.16,M.robe,g,.34,1.52,0,8);
 const staff=new THREE.Group();staff.position.set(.55,.05,.02);staff.rotation.z=-.04;g.add(staff);cylinder(.045,.065,1.85,M.bark,staff,0,.93,0,7);ball(.19,M.cyan,staff,0,1.9,0,10);player.staff=staff;
 const aura=mesh(new THREE.TorusGeometry(.68,.025,6,24),M.violet,g,0,.08,0,false);aura.rotation.x=Math.PI/2;player.aura=aura;
 return g;}
function createEnemy(x,z,type='wretch'){const g=new THREE.Group();world.add(g);g.position.set(x,0,z);
 const bossType=type==='king',scale=bossType?1.8:type==='brute'?1.25:1;
 const outfit=bossType?M.robe2:type==='brute'?M.dead2:M.cloth;
 const limbs=makeHuman(g,{hostile:true,outfit,skin:bossType?M.dead2:M.dead,accent:bossType?M.robe:M.dead2});g.scale.setScalar(scale);
 g.traverse(o=>{if(o.isMesh)o.castShadow=true;});const e={group:g,pos:g.position,hp:bossType?360:type==='brute'?90:52,maxHp:bossType?360:type==='brute'?90:52,speed:bossType?1.5:type==='brute'?1.15:1.75,damage:bossType?18:type==='brute'?13:9,attack:0,type,dead:false,phase:random()*6,limbs};enemies.push(e);if(bossType)boss=e;return e;}
function spawnEnemyNear(x,z,type){const a=random()*Math.PI*2,r=4+random()*4;return createEnemy(x+Math.cos(a)*r,z+Math.sin(a)*r,type);}
function createServant(){const g=new THREE.Group();world.add(g);g.position.set(player.pos.x+(random()-.5)*2,0,player.pos.z+1);const body=mesh(new THREE.CylinderGeometry(.19,.28,.8,6),M.bone,g,0,.67,0);ball(.22,M.bone,g,0,1.2,0,8);ball(.045,M.cyan,g,-.09,1.22,.19);ball(.045,M.cyan,g,.09,1.22,.19);for(const s of [-1,1]){mesh(new THREE.CylinderGeometry(.07,.1,.58,5),M.bone,g,s*.27,.66,0).rotation.z=s*.3;}const a=mesh(new THREE.TorusGeometry(.38,.025,5,20),M.cyan,g,0,.06,0,false);a.rotation.x=Math.PI/2;const servant={group:g,attack:0,life:38,phase:random()*6};player.servants.push(servant);return servant;}
function makeProjectile(from,to,owner='player',damage=20){const dir=to.clone().sub(from);if(dir.length()<.1)dir.set(0,0,-1);dir.normalize();const g=new THREE.Group();world.add(g);const core=ball(owner==='player'?.19:.16,owner==='player'?M.cyan:M.red,g,0,0,0,10);const trail=mesh(new THREE.SphereGeometry(.23,8,6),owner==='player'?M.violet:M.red,g,0,0,-.16,false);trail.scale.set(.7,.7,1.7);g.position.copy(from);projectiles.push({group:g,dir,speed:owner==='player'?20:10,life:2.2,owner,damage});return g;}
function spawnBurst(pos,color=M.violet,count=12){for(let i=0;i<count;i++){const m=mesh(new THREE.IcosahedronGeometry(.07+random()*.07,0),color,world,pos.x,pos.y,pos.z,false);particles.push({mesh:m,vel:v3((random()-.5)*5,random()*4,(random()-.5)*5),life:.45+random()*.55,max:.9});}}
function announce(text,seconds=2.5){const el=document.querySelector('#toast');el.textContent=text;el.classList.add('show');toastTime=seconds;}
function gainXP(n){player.xp+=n;while(player.xp>=player.level*80){player.xp-=player.level*80;player.level++;player.maxHp+=12;player.maxMana+=8;player.hp=Math.min(player.maxHp,player.hp+30);player.mana=Math.min(player.maxMana,player.mana+30);announce(`LEVEL ${player.level} · YOUR SOUL DEEPENS`,3);}}
function hurtPlayer(amount){if(player.invuln>0||ended)return;player.hp=Math.max(0,player.hp-amount);player.invuln=.45;document.querySelector('#damage-flash').classList.remove('flash');void document.querySelector('#damage-flash').offsetWidth;document.querySelector('#damage-flash').classList.add('flash');if(player.hp<=0)finish(false);}
function killEnemy(e){if(e.dead)return;e.dead=true;spawnBurst(e.pos.clone().add(v3(0,1,0)),e.type==='king'?M.violet:M.cyan,e.type==='king'?32:15);world.remove(e.group);player.kills++;player.souls++;gainXP(e.type==='king'?120:e.type==='brute'?35:22);if(random()<.7){drops.push({pos:e.pos.clone(),life:14});}if(e.type==='king')finish(true);}
function damageEnemy(e,damage){if(e.dead)return;e.hp-=damage;spawnBurst(e.pos.clone().add(v3(0,1,0)),M.cyan,3);if(e.hp<=0)killEnemy(e);}
function fireBolt(){if(player.attack>0||!player.alive)return;player.attack=.24;const from=player.pos.clone().add(v3(0,1.8,0));let to=aimPoint.clone();if(!mouseActive||to.distanceTo(player.pos)<1)to.copy(player.pos).add(player.aim.clone().multiplyScalar(22));to.y=1;makeProjectile(from,to,'player',28+player.level*2);player.aim.set(to.x-player.pos.x,0,to.z-player.pos.z).normalize();player.mesh.rotation.y=Math.atan2(player.aim.x,player.aim.z);player.staff.rotation.z=-.42;setTimeout(()=>{if(player.staff)player.staff.rotation.z=-.16;},100);}
function summon(){if(player.mana<35){announce('NOT ENOUGH WRAITHFIRE');return;}player.mana-=35;player.summon=8;createServant();spawnBurst(player.pos.clone().add(v3(0,.8,0)),M.bone,10);announce('A BONE SERVANT RISES');}
function castNova(){if(player.mana<55){announce('NOT ENOUGH WRAITHFIRE');return;}if(player.nova>0)return;player.mana-=55;player.nova=7;player.novaFx=.8;spawnBurst(player.pos.clone().add(v3(0,1,0)),M.violet,28);for(const e of enemies)if(!e.dead&&e.pos.distanceTo(player.pos)<7.5)damageEnemy(e,65+player.level*4);for(const e of enemies)if(!e.dead&&e.type!=='king'&&e.pos.distanceTo(player.pos)<7.5)e.attack=1.2;announce('GRAVE NOVA');}
function wraithStep(){if(player.dash>0)return;const side=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),forward=(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0);const right=v3(-player.aim.z,0,player.aim.x);const d=right.multiplyScalar(side).addScaledVector(player.aim,forward);if(d.lengthSq()===0)d.copy(player.aim);d.normalize();player.dash=.35;player.dashDir=d;player.invuln=.42;spawnBurst(player.pos.clone().add(v3(0,.7,0)),M.violet,9);}
function interact(){if(targetObelisk&&!targetObelisk.awakened){const o=targetObelisk;o.awakened=true;o.rune.material=M.cyan;o.ring.material=M.cyan;o.light.color.set('#65e7e5');o.light.intensity=2.4;spawnBurst(o.pos.clone().add(v3(0,2.4,0)),M.cyan,26);player.mana=Math.min(player.maxMana,player.mana+35);announce(`SOUL OBELISK ${o.index+1} AWAKENED`,3);updateQuest();for(let i=0;i<3;i++)spawnEnemyNear(o.pos.x,o.pos.z,i===2?'brute':'wretch');if(obelisks.every(x=>x.awakened)){document.querySelector('#quest-title').textContent='The Wraith King';document.querySelector('#quest-desc').textContent='Defeat the forgotten king beyond the old road';document.querySelector('#bottom-hint').innerHTML='<span class="hint-dot"></span> The Wraith King stirs beyond the ruined arch.';portal=createEnemy(-2,-68,'king');announce('THE WRAITH KING HAS AWAKENED',4);}}else if(targetObelisk?.awakened){announce('THIS SOUL IS ALREADY AT REST');}}
function updateQuest(){const n=obelisks.filter(o=>o.awakened).length;document.querySelector('#quest-count').textContent=`${n} / 3 AWAKENED`;document.querySelector('#quest-progress').style.width=`${n/3*100}%`;if(n===3){document.querySelector('#quest-title').textContent='The Wraith King';document.querySelector('#quest-desc').textContent='Defeat the forgotten king beyond the old road';}}
function finish(won){if(ended)return;ended=true;player.alive=false;const modal=document.querySelector('#end-modal');document.querySelector('#end-title').innerHTML=won?'DAWN<br><em>RETURNS</em>':'THE WILDS<br><em>CLAIM YOU</em>';document.querySelector('#end-copy').innerHTML=won?'The souls of Ashenmoor are free.<br>The old road is quiet at last.':'The dead close in, and your light fades.<br>Rise again and finish what you began.';document.querySelector('#end-stats').innerHTML=`<span>${player.level}<small>LEVEL</small></span><span>${player.kills}<small>DEAD SLAIN</small></span><span>${player.souls}<small>SOULS BOUND</small></span>`;modal.classList.remove('hidden');}
function nearestTarget(){targetObelisk=null;let d=4.2;for(const o of obelisks){if(o.awakened)continue;const n=o.pos.distanceTo(player.pos);if(n<d){d=n;targetObelisk=o;}}const prompt=document.querySelector('#interact-prompt');if(targetObelisk){prompt.classList.add('visible');document.querySelector('#interact-text').textContent='AWAKEN SOUL OBELISK';}else prompt.classList.remove('visible');}
function updateEnemies(dt){for(const e of enemies){if(e.dead)continue;e.attack=Math.max(0,e.attack-dt);const delta=player.pos.clone().sub(e.pos);delta.y=0;const dist=delta.length();if(dist>1.65){delta.normalize();const speed=e.speed*(e.type==='king'&&e.hp<e.maxHp*.45?1.35:1);e.pos.addScaledVector(delta,speed*dt);e.group.rotation.y=Math.atan2(delta.x,delta.z);e.group.position.y=Math.sin(time*4+e.phase)*.055;}else if(e.attack<=0){e.attack=e.type==='king'?1.1:1.45;if(e.type==='king'&&dist>1.15){makeProjectile(e.pos.clone().add(v3(0,1.4,0)),player.pos.clone().add(v3(0,1,0)),'enemy',14);}else hurtPlayer(e.damage);}
 if(e.type==='king'&&e.hp<e.maxHp*.5&&e.attack<.3&&random()<dt*.13){spawnEnemyNear(e.pos.x,e.pos.z,'wretch');}
 }
 for(const s of player.servants){s.life-=dt;s.attack=Math.max(0,s.attack-dt);const target=enemies.filter(e=>!e.dead).sort((a,b)=>a.pos.distanceToSquared(s.group.position)-b.pos.distanceToSquared(s.group.position))[0];if(!target){s.group.position.lerp(player.pos.clone().add(v3((player.servants.indexOf(s)-1)*1.1,0,1.6)),dt*2);continue;}const d=target.pos.clone().sub(s.group.position);d.y=0;const dist=d.length();if(dist>1.55){d.normalize();s.group.position.addScaledVector(d,dt*2.7);s.group.rotation.y=Math.atan2(d.x,d.z);}else if(s.attack<=0){s.attack=1.05;damageEnemy(target,18);spawnBurst(target.pos.clone().add(v3(0,.8,0)),M.bone,4);}s.group.position.y=Math.sin(time*3+s.phase)*.08;}
 player.servants=player.servants.filter(s=>{if(s.life<=0){world.remove(s.group);return false;}return true;});}
function updateProjectiles(dt){for(let i=projectiles.length-1;i>=0;i--){const p=projectiles[i];p.life-=dt;p.group.position.addScaledVector(p.dir,p.speed*dt);p.group.rotation.y=time*6;if(p.life<=0){world.remove(p.group);projectiles.splice(i,1);continue;}if(p.owner==='player'){const hit=enemies.find(e=>!e.dead&&e.pos.distanceTo(p.group.position)<.95);if(hit){damageEnemy(hit,p.damage);world.remove(p.group);projectiles.splice(i,1);}}else if(p.group.position.distanceTo(player.pos.clone().add(v3(0,1,0)))<.9){hurtPlayer(p.damage);world.remove(p.group);projectiles.splice(i,1);}}
}
function updateParticles(dt){for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.mesh.position.addScaledVector(p.vel,dt);p.vel.y-=4*dt;p.mesh.scale.multiplyScalar(Math.max(.01,1-dt*1.6));if(p.life<=0){world.remove(p.mesh);particles.splice(i,1);}}}
function updateDrops(dt){for(let i=drops.length-1;i>=0;i--){const d=drops[i];d.life-=dt;if(d.mesh){d.mesh.position.y=.35+Math.sin(time*3+i)*.12;}else{d.mesh=ball(.16,M.cyan,world,d.pos.x,.35,d.pos.z,8);d.mesh.userData.drop=d;}if(d.pos.distanceTo(player.pos)<1.5){player.souls++;player.mana=Math.min(player.maxMana,player.mana+8);world.remove(d.mesh);drops.splice(i,1);document.querySelector('#soul-count').textContent=player.souls;spawnBurst(d.pos,M.cyan,5);}else if(d.life<=0){world.remove(d.mesh);drops.splice(i,1);}}
}
function updateUI(){const hp=Math.round(player.hp),mana=Math.round(player.mana),need=player.level*80;document.querySelector('#health-text').textContent=`${hp} / ${player.maxHp}`;document.querySelector('#health-fill').style.width=`${player.hp/player.maxHp*100}%`;document.querySelector('#mana-text').textContent=`${mana} / ${player.maxMana}`;document.querySelector('#mana-fill').style.width=`${player.mana/player.maxMana*100}%`;document.querySelector('#level-badge').textContent=String(player.level).padStart(2,'0');document.querySelector('#xp-label').textContent=`${player.xp} / ${need}`;document.querySelector('#xp-fill').style.width=`${player.xp/need*100}%`;document.querySelector('#soul-count').textContent=player.souls;document.querySelector('#summon-cooldown').textContent=player.summon>0?Math.ceil(player.summon):'';document.querySelector('#nova-cooldown').textContent=player.nova>0?Math.ceil(player.nova):'';
 const mx=document.querySelector('#minimap'),ctx=mx.getContext('2d');ctx.clearRect(0,0,150,150);ctx.fillStyle='rgba(25,34,32,.92)';ctx.fillRect(0,0,150,150);ctx.strokeStyle='rgba(195,177,142,.22)';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(75,12);ctx.lineTo(75,138);ctx.stroke();const map=(x,z)=>({x:75+x*1.45,y:28+(z+10)*1.28});obelisks.forEach(o=>{const p=map(o.pos.x,o.pos.z);ctx.fillStyle=o.awakened?'#7de4dc':'#c6a575';ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.fill();});enemies.filter(e=>!e.dead&&e.pos.distanceTo(player.pos)<35).forEach(e=>{const p=map(e.pos.x,e.pos.z);ctx.fillStyle=e.type==='king'?'#f27868':'#dd675a';ctx.fillRect(p.x-1.5,p.y-1.5,3,3);});const p=map(player.pos.x,player.pos.z);ctx.fillStyle='#efe2c7';ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#efe2c7';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+player.aim.x*9,p.y+player.aim.z*9);ctx.stroke();document.querySelector('#map-coords').textContent=`N ${String(Math.max(0,Math.round(-player.pos.z))).padStart(2,'0')} · E ${String(Math.round(player.pos.x+30)).padStart(2,'0')}`;}
function aimFromEvent(event){const r=canvas.getBoundingClientRect();pointer.x=((event.clientX-r.left)/r.width)*2-1;pointer.y=-((event.clientY-r.top)/r.height)*2+1;cameraRay.setFromCamera(pointer,camera);const ray=cameraRay.ray;if(Math.abs(ray.direction.y)>.0001){const t=-ray.origin.y/ray.direction.y;if(t>0)aimPoint.copy(ray.origin).addScaledVector(ray.direction,t);}mouseActive=true;}
const pointer=new THREE.Vector2(),cameraRay=new THREE.Raycaster();canvas.addEventListener('pointermove',aimFromEvent);canvas.addEventListener('pointerdown',e=>{if(e.button===0){aimFromEvent(e);if(started&&!ended)fireBolt();}});canvas.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys[k]=true;if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();if(e.repeat)return;if(k==='q')summon();if(k==='e')castNova();if(k===' '||k==='shift')wraithStep();if(k==='f')interact();if(k==='escape'&&started&&!ended)document.querySelector('#help-modal').classList.toggle('hidden');});window.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});
let stick={x:0,y:0,active:false,id:null};const zone=document.querySelector('#stick-zone'),knob=document.querySelector('#stick-knob');zone.addEventListener('pointerdown',e=>{stick.active=true;stick.id=e.pointerId;zone.setPointerCapture(e.pointerId);moveStick(e);});zone.addEventListener('pointermove',e=>{if(stick.active&&e.pointerId===stick.id)moveStick(e);});zone.addEventListener('pointerup',()=>{stick.active=false;stick.x=stick.y=0;knob.style.transform='translate(0,0)';});function moveStick(e){const r=zone.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),len=Math.hypot(dx,dy),scale=Math.min(1,38/Math.max(1,len));stick.x=dx*scale/38;stick.y=dy*scale/38;knob.style.transform=`translate(${stick.x*38}px,${stick.y*38}px)`;}
document.querySelector('#mobile-attack').addEventListener('pointerdown',e=>{e.preventDefault();fireBolt();});document.querySelector('#mobile-summon').addEventListener('pointerdown',e=>{e.preventDefault();summon();});document.querySelector('#mobile-nova').addEventListener('pointerdown',e=>{e.preventDefault();castNova();});document.querySelector('#mobile-interact').addEventListener('pointerdown',e=>{e.preventDefault();interact();});
document.querySelector('#start-btn').addEventListener('click',()=>{started=true;document.querySelector('#intro-modal').classList.add('hidden');document.querySelector('#bottom-hint').classList.add('show');announce('THE OLD ROAD WAITS. FOLLOW THE SOULS.',3);});document.querySelector('#help-btn').addEventListener('click',()=>document.querySelector('#help-modal').classList.remove('hidden'));document.querySelector('#close-help').addEventListener('click',()=>document.querySelector('#help-modal').classList.add('hidden'));document.querySelector('#resume-btn').addEventListener('click',()=>document.querySelector('#help-modal').classList.add('hidden'));document.querySelector('#restart-btn').addEventListener('click',()=>location.reload());document.querySelector('#sound-btn').addEventListener('click',e=>{audioOn=!audioOn;e.currentTarget.textContent=audioOn?'♫':'♩';announce(audioOn?'SOUND ON':'SOUND OFF',1.3);});
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));}window.addEventListener('resize',resize);
buildWorld();createHero();spawnEnemyNear(2,1);spawnEnemyNear(-5,-1);spawnEnemyNear(-17,-14,'brute');spawnEnemyNear(17,-28,'brute');
const cameraGoal=new THREE.Vector3();camera.position.set(0,5,17.5);camera.lookAt(player.pos.clone().add(v3(0,1.25,0)));let lastUI=0;
function tick(){requestAnimationFrame(tick);const dt=Math.min(clock.getDelta(),.045);time+=dt;if(!ended){player.attack=Math.max(0,player.attack-dt);player.summon=Math.max(0,player.summon-dt);player.nova=Math.max(0,player.nova-dt);player.invuln=Math.max(0,player.invuln-dt);player.dash=Math.max(0,player.dash-dt);player.novaFx=Math.max(0,player.novaFx-dt);player.mana=Math.min(player.maxMana,player.mana+6*dt);
 if(started&&document.querySelector('#help-modal').classList.contains('hidden')){const side=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0)+stick.x,forward=(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0)-stick.y;const right=v3(-player.aim.z,0,player.aim.x);const move=right.multiplyScalar(side).addScaledVector(player.aim,forward);if(move.lengthSq()>1)move.normalize();if(player.dash>0){player.pos.addScaledVector(player.dashDir,18*dt);}else player.pos.addScaledVector(move,5.2*dt);player.pos.x=clamp(player.pos.x,-66,66);player.pos.z=clamp(player.pos.z,-78,22);if(move.lengthSq()>.02&&!mouseActive){player.aim.copy(move).normalize();player.mesh.rotation.y=Math.atan2(player.aim.x,player.aim.z);}player.mesh.position.copy(player.pos);player.mesh.position.y=Math.sin(time*8)*.025*(move.lengthSq()>.02?1:0);if(player.limbs){player.limbs.legs.forEach((limb,i)=>limb.pivot.rotation.x=Math.sin(time*10+i*Math.PI)*Math.min(.48,move.length()*.42));player.limbs.arms.forEach((limb,i)=>{if(i===0)limb.pivot.rotation.x=Math.sin(time*10+Math.PI)*Math.min(.22,move.length()*.18);});}player.aura.rotation.z=time*.55;updateEnemies(dt);updateProjectiles(dt);updateParticles(dt);updateDrops(dt);nearestTarget();if(toastTime>0){toastTime-=dt;if(toastTime<=0)document.querySelector('#toast').classList.remove('show');}}
 const behind=player.aim.clone().setY(0).normalize();cameraGoal.copy(player.pos).addScaledVector(behind,-7.5);cameraGoal.y=player.pos.y+5;camera.position.lerp(cameraGoal,.12);camera.lookAt(player.pos.clone().add(v3(0,1.25,0)));if(time-lastUI>.12){updateUI();lastUI=time;}renderer.render(scene,camera);}}
tick();





