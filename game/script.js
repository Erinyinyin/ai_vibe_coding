import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const root = document.querySelector('#game');
const ui = {
  wave: document.querySelector('#wave'), kills: document.querySelector('#kills'), credits: document.querySelector('#credits'),
  health: document.querySelector('#health-fill'), healthLabel: document.querySelector('#health-label'),
  weaponLevel: document.querySelector('#weapon-level'), weaponDetail: document.querySelector('#weapon-detail'),
  hostileCount: document.querySelector('#hostile-count'), message: document.querySelector('#center-message'),
  messageTitle: document.querySelector('#message-title'), toast: document.querySelector('#toast'),
  gameOver: document.querySelector('#game-over'), finalWave: document.querySelector('#final-wave'),
  finalKills: document.querySelector('#final-kills'),
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080b17);
scene.fog = new THREE.FogExp2(0x080b17, 0.018);
const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 20, 17);
camera.lookAt(0, 0, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
root.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0x8799e8, 0x101426, 2.15));
const keyLight = new THREE.DirectionalLight(0xc5d5ff, 2.7);
keyLight.position.set(-5, 12, 8);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
scene.add(keyLight);
const cyanLight = new THREE.PointLight(0x28dceb, 22, 18, 2);
cyanLight.position.set(0, 3, 0);
scene.add(cyanLight);

const arenaSize = 22;
const floor = new THREE.Mesh(new THREE.PlaneGeometry(arenaSize, arenaSize), new THREE.MeshStandardMaterial({ color: 0x10162b, roughness: 0.84, metalness: 0.25 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
const grid = new THREE.GridHelper(arenaSize, 22, 0x33466d, 0x1c2947);
grid.position.y = 0.018;
scene.add(grid);

const arenaEdge = new THREE.Group();
const edgeMat = new THREE.MeshBasicMaterial({ color: 0x35517b, transparent: true, opacity: 0.55 });
for (let i = -10; i <= 10; i += 2) {
  for (const z of [-11, 11]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.045, 0.07), edgeMat);
    bar.position.set(i, 0.05, z);
    arenaEdge.add(bar);
  }
  for (const x of [-11, 11]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.045, 0.72), edgeMat);
    bar.position.set(x, 0.05, i);
    arenaEdge.add(bar);
  }
}
scene.add(arenaEdge);

const starGeometry = new THREE.BufferGeometry();
const starPositions = [];
for (let i = 0; i < 220; i++) starPositions.push((Math.random() - 0.5) * 80, Math.random() * 24 + 5, (Math.random() - 0.5) * 80);
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xaebdff, size: 0.075, transparent: true, opacity: 0.72 }));
scene.add(stars);

const player = new THREE.Group();
const shipMat = new THREE.MeshStandardMaterial({ color: 0xaac9e7, metalness: 0.72, roughness: 0.28, emissive: 0x12344a, emissiveIntensity: 0.55 });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x263553, metalness: 0.72, roughness: 0.3 });
const cockpitMat = new THREE.MeshStandardMaterial({ color: 0x4be4f1, metalness: 0.35, roughness: 0.16, emissive: 0x1a9cad, emissiveIntensity: 0.8 });
const body = new THREE.Mesh(new THREE.ConeGeometry(0.47, 1.5, 6), shipMat);
body.rotation.x = Math.PI / 2;
body.rotation.z = Math.PI;
body.position.y = 0.3;
body.castShadow = true;
player.add(body);
const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 10), cockpitMat);
cockpit.scale.set(0.8, 0.55, 1.35);
cockpit.position.set(0, 0.48, -0.08);
player.add(cockpit);
for (const side of [-1, 1]) {
  const wing = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.92), darkMat);
  wing.position.set(side * 0.49, 0.18, 0.22);
  wing.rotation.y = side * -0.16;
  player.add(wing);
  const engine = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), new THREE.MeshBasicMaterial({ color: 0x45f1ff }));
  engine.position.set(side * 0.34, 0.12, 0.75);
  engine.scale.set(0.72, 0.72, 1.5);
  player.add(engine);
}
player.position.set(0, 0, 0);
scene.add(player);

const alienMaterials = [
  new THREE.MeshStandardMaterial({ color: 0x82e3aa, roughness: 0.38, metalness: 0.18, emissive: 0x16472c, emissiveIntensity: 0.5 }),
  new THREE.MeshStandardMaterial({ color: 0xbf8aff, roughness: 0.34, metalness: 0.22, emissive: 0x38196c, emissiveIntensity: 0.52 }),
  new THREE.MeshStandardMaterial({ color: 0xff8c79, roughness: 0.4, metalness: 0.15, emissive: 0x64251d, emissiveIntensity: 0.45 }),
];
const enemies = [];
const bullets = [];
const coins = [];
const particles = [];
const keys = new Set();
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const pointer = new THREE.Vector2(0, 0);
const aimPoint = new THREE.Vector3(0, 0, -1);
let pointerActive = false;
let firing = false;
let credits = 0;
let kills = 0;
let wave = 1;
let health = 100;
let damage = 1;
let fireDelay = 0.28;
let moveSpeed = 6.3;
let fireCooldown = 0;
let spawnTimer = 1.2;
let spawnedThisWave = 0;
let waveTarget = 6;
let waveGap = 0;
let ended = false;
let soundOn = false;
let audioContext;
let toastTimeout;
let lastTime = performance.now();
const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

function getAimPoint() {
  raycaster.setFromCamera(pointer, camera);
  const hit = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(groundPlane, hit)) {
    hit.x = THREE.MathUtils.clamp(hit.x, -10.7, 10.7);
    hit.z = THREE.MathUtils.clamp(hit.z, -10.7, 10.7);
    aimPoint.copy(hit);
  }
}

function createAlien() {
  const group = new THREE.Group();
  const material = alienMaterials[Math.floor(Math.random() * alienMaterials.length)];
  const scale = 0.82 + Math.min(wave, 7) * 0.035;
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.47, 16, 12), material);
  torso.scale.set(0.82, 1.1, 0.72);
  torso.position.y = 0.57;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), material);
  head.scale.set(1.18, 0.78, 1);
  head.position.set(0, 1.12, -0.02);
  head.castShadow = true;
  group.add(head);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x16192a });
  const eyeGlow = new THREE.MeshBasicMaterial({ color: 0xf1fdff });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 8), eyeMat);
    eye.position.set(side * 0.15, 1.16, -0.305);
    eye.scale.z = 0.45;
    group.add(eye);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), eyeGlow);
    glint.position.set(side * 0.15 + 0.018, 1.18, -0.34);
    group.add(glint);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.44, 8), material);
    leg.position.set(side * 0.22, 0.18, 0.01);
    leg.rotation.z = side * 0.18;
    group.add(leg);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.48, 8), material);
    arm.position.set(side * 0.44, 0.59, 0.02);
    arm.rotation.z = side * -0.55;
    group.add(arm);
  }
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.33, 7), material);
  antenna.position.set(0, 1.47, 0.02);
  antenna.rotation.z = 0.12;
  group.add(antenna);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), new THREE.MeshBasicMaterial({ color: material.color }));
  tip.position.set(0.04, 1.64, 0.02);
  group.add(tip);
  group.scale.setScalar(scale);

  const angle = Math.random() * Math.PI * 2;
  const radius = 9.3 + Math.random() * 1.1;
  group.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  const barGroup = new THREE.Group();
  const back = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.08), new THREE.MeshBasicMaterial({ color: 0x22283a, side: THREE.DoubleSide }));
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.045), new THREE.MeshBasicMaterial({ color: 0xff6f8f, side: THREE.DoubleSide }));
  fill.position.z = 0.008;
  barGroup.add(back, fill);
  barGroup.position.set(0, 2.05 * scale, 0);
  group.add(barGroup);
  scene.add(group);
  const hp = 1 + Math.floor((wave - 1) / 3);
  enemies.push({ group, hp, maxHp: hp, fill, speed: (0.76 + Math.random() * 0.26) * (1 + Math.min(wave - 1, 9) * 0.045), phase: Math.random() * 6, scale });
}

function addParticles(position, color, count = 9) {
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true });
  for (let i = 0; i < count; i++) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.045 + Math.random() * 0.045, 6, 6), mat.clone());
    dot.position.copy(position);
    scene.add(dot);
    particles.push({ mesh: dot, velocity: new THREE.Vector3((Math.random() - 0.5) * 3.5, Math.random() * 2.5, (Math.random() - 0.5) * 3.5), life: 0.35 + Math.random() * 0.4 });
  }
}

function spawnCoin(position) {
  const coin = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: 0xffd96b, emissive: 0x9b6818, emissiveIntensity: 0.75, metalness: 0.78, roughness: 0.22 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.075, 12), gold);
  disc.rotation.x = Math.PI / 2;
  coin.add(disc);
  const glyph = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.018, 5, 12), new THREE.MeshBasicMaterial({ color: 0xfff2a8 }));
  glyph.position.z = 0.045;
  coin.add(glyph);
  coin.position.copy(position);
  coin.position.y = 0.45;
  scene.add(coin);
  coins.push({ mesh: coin, phase: Math.random() * 5, value: 15 + Math.floor(Math.random() * 16) });
}

function shoot() {
  getAimPoint();
  const direction = new THREE.Vector3().subVectors(aimPoint, player.position);
  direction.y = 0;
  if (direction.lengthSq() < 0.001) direction.set(0, 0, -1);
  direction.normalize();
  player.rotation.y = Math.atan2(direction.x, -direction.z);
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.105, 10, 8), new THREE.MeshBasicMaterial({ color: 0x75f5ff }));
  mesh.position.copy(player.position).addScaledVector(direction, 0.8);
  mesh.position.y = 0.42;
  scene.add(mesh);
  const glow = new THREE.PointLight(0x4ceaff, 1.5, 1.8);
  mesh.add(glow);
  bullets.push({ mesh, direction, life: 1.45, damage });
  if (soundOn) playTone(580, 0.045, 'triangle', 0.025);
}

function playTone(frequency, duration, type = 'sine', volume = 0.06) {
  if (!soundOn) return;
  try {
    audioContext ??= new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch { /* Audio is optional; gameplay continues if the browser blocks it. */ }
}

function setHealth(next) {
  health = THREE.MathUtils.clamp(next, 0, 100);
  ui.health.style.width = `${health}%`;
  ui.healthLabel.textContent = `${Math.ceil(health)}%`;
  ui.health.style.background = health < 35 ? 'linear-gradient(90deg, #ff668d, #ff9a76)' : 'linear-gradient(90deg, #54e6d1, #67edaa)';
  if (health <= 0) finishGame();
}

function showToast(text) {
  ui.toast.textContent = text;
  ui.toast.classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => ui.toast.classList.remove('visible'), 1700);
}

function updateUpgradeButtons() {
  document.querySelectorAll('.upgrade-card').forEach((button) => {
    const cost = Number(button.dataset.cost ?? button.querySelector('.upgrade-cost b').textContent.match(/\d+/)?.[0]);
    button.disabled = credits < cost || ended;
  });
}

function buyUpgrade(type) {
  const upgrades = {
    damage: { cost: 60, apply: () => { damage += 1; ui.weaponLevel.textContent = roman[Math.min(damage - 1, roman.length - 1)]; ui.weaponDetail.textContent = 'OVERCHARGED'; } },
    fireRate: { cost: 75, apply: () => { fireDelay = Math.max(0.1, fireDelay * 0.75); } },
    speed: { cost: 50, apply: () => { moveSpeed *= 1.2; } },
    repair: { cost: 45, apply: () => setHealth(health + 35) },
  };
  const upgrade = upgrades[type];
  if (!upgrade || credits < upgrade.cost || ended) return;
  credits -= upgrade.cost;
  upgrade.apply();
  ui.credits.textContent = String(credits).padStart(3, '0');
  updateUpgradeButtons();
  const names = { damage: 'WEAPON OVERCHARGED', fireRate: 'FIRE CYCLE BOOSTED', speed: 'AFTERBURNER ONLINE', repair: 'HULL REPAIRED' };
  showToast(names[type]);
  playTone(740, 0.18, 'sine', 0.06);
}

function finishGame() {
  if (ended) return;
  ended = true;
  firing = false;
  ui.finalWave.textContent = wave;
  ui.finalKills.textContent = kills;
  ui.gameOver.classList.add('visible');
  updateUpgradeButtons();
}

function resetGame() {
  enemies.forEach((enemy) => scene.remove(enemy.group));
  bullets.forEach((bullet) => scene.remove(bullet.mesh));
  coins.forEach((coin) => scene.remove(coin.mesh));
  particles.forEach((particle) => scene.remove(particle.mesh));
  enemies.length = 0; bullets.length = 0; coins.length = 0; particles.length = 0;
  player.position.set(0, 0, 0);
  player.rotation.set(0, 0, 0);
  credits = 0; kills = 0; wave = 1; health = 100; damage = 1; fireDelay = 0.28; moveSpeed = 6.3;
  fireCooldown = 0; spawnTimer = 0.8; spawnedThisWave = 0; waveTarget = 6; waveGap = 0; ended = false;
  ui.wave.textContent = '01'; ui.kills.textContent = '000'; ui.credits.textContent = '000';
  ui.weaponLevel.textContent = roman[0]; ui.weaponDetail.textContent = 'STANDARD ISSUE';
  ui.gameOver.classList.remove('visible'); ui.message.classList.remove('hidden');
  setHealth(100); updateUpgradeButtons();
}

document.querySelectorAll('.upgrade-card').forEach((button) => button.addEventListener('click', () => buyUpgrade(button.dataset.upgrade)));
document.querySelector('#restart-button').addEventListener('click', resetGame);
document.querySelector('#sound-toggle').addEventListener('click', (event) => {
  soundOn = !soundOn;
  event.currentTarget.classList.toggle('muted', !soundOn);
  event.currentTarget.setAttribute('aria-label', soundOn ? 'Mute sound' : 'Enable sound');
  if (soundOn) playTone(520, 0.1);
});
window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
  keys.add(key);
  if (key === ' ' && !ended) firing = true;
});
window.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase();
  keys.delete(key);
  if (key === ' ') firing = false;
});
renderer.domElement.addEventListener('pointermove', (event) => {
  const bounds = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  pointerActive = true;
});
renderer.domElement.addEventListener('pointerdown', (event) => {
  if (event.button === 0 && !ended) { firing = true; shoot(); fireCooldown = fireDelay; }
});
window.addEventListener('pointerup', (event) => { if (event.button === 0) firing = false; });
window.addEventListener('blur', () => { keys.clear(); firing = false; });

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastTime) / 1000, 0.04);
  lastTime = now;
  if (!ended) update(dt, now / 1000);
  renderer.render(scene, camera);
}

function update(dt, time) {
  if (!pointerActive) {
    pointer.set(0, 0.08);
  }
  getAimPoint();
  const move = new THREE.Vector3(
    (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0),
    0,
    (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0),
  );
  if (move.lengthSq() > 0) {
    move.normalize();
    player.position.addScaledVector(move, moveSpeed * dt);
    player.position.x = THREE.MathUtils.clamp(player.position.x, -10.5, 10.5);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -10.5, 10.5);
    player.rotation.y = Math.atan2(move.x, -move.z);
  }
  player.position.y = Math.sin(time * 5) * 0.035;
  if (firing && fireCooldown <= 0) { shoot(); fireCooldown = fireDelay; }
  fireCooldown -= dt;
  camera.position.x += (player.position.x * 0.18 - camera.position.x) * Math.min(dt * 2, 1);
  camera.position.z += (17 + player.position.z * 0.12 - camera.position.z) * Math.min(dt * 2, 1);
  camera.lookAt(player.position.x * 0.12, 0, player.position.z * 0.12);
  cyanLight.position.set(player.position.x, 2.6, player.position.z);

  if (spawnedThisWave < waveTarget) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      createAlien();
      spawnedThisWave++;
      spawnTimer = Math.max(0.5, 1.4 - wave * 0.035) + Math.random() * 0.4;
    }
  } else if (enemies.length === 0) {
    waveGap += dt;
    if (waveGap >= 2.1) {
      wave++;
      waveTarget = 5 + wave * 2;
      spawnedThisWave = 0;
      waveGap = 0;
      spawnTimer = 0.7;
      ui.wave.textContent = String(wave).padStart(2, '0');
      ui.messageTitle.textContent = `WAVE ${String(wave).padStart(2, '0')}`;
      ui.message.classList.remove('hidden');
      setTimeout(() => ui.message.classList.add('hidden'), 1300);
      showToast(`SECTOR ${String(wave).padStart(2, '0')} — HOSTILES INBOUND`);
    }
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    const toward = new THREE.Vector3(player.position.x - enemy.group.position.x, 0, player.position.z - enemy.group.position.z);
    const distance = toward.length();
    if (distance > 0.001) toward.normalize();
    enemy.group.position.addScaledVector(toward, enemy.speed * dt);
    enemy.group.position.y = Math.sin(time * 4 + enemy.phase) * 0.07;
    enemy.group.rotation.y = Math.atan2(toward.x, -toward.z);
    enemy.group.children.forEach((part) => { if (part.geometry?.type === 'CylinderGeometry') part.rotation.x = Math.sin(time * 8 + enemy.phase) * 0.12; });
    enemy.fill.scale.x = Math.max(0.01, enemy.hp / enemy.maxHp);
    enemy.fill.position.x = -(1 - enemy.hp / enemy.maxHp) * 0.4;
    if (distance < 0.92 * enemy.scale) {
      setHealth(health - (13 + wave * 0.35) * dt);
      if (health <= 0) break;
    }
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    bullet.mesh.position.addScaledVector(bullet.direction, 15 * dt);
    bullet.life -= dt;
    let hitIndex = -1;
    for (let j = enemies.length - 1; j >= 0; j--) {
      if (bullet.mesh.position.distanceTo(enemies[j].group.position.clone().add(new THREE.Vector3(0, 0.72, 0))) < 0.62 * enemies[j].scale) { hitIndex = j; break; }
    }
    if (hitIndex >= 0) {
      const enemy = enemies[hitIndex];
      enemy.hp -= bullet.damage;
      addParticles(bullet.mesh.position, 0x76ffe0, 4);
      scene.remove(bullet.mesh);
      bullets.splice(i, 1);
      if (enemy.hp <= 0) {
        addParticles(enemy.group.position.clone().add(new THREE.Vector3(0, 0.7, 0)), alienMaterials[Math.floor(Math.random() * alienMaterials.length)].color, 13);
        const dropPoint = enemy.group.position.clone();
        scene.remove(enemy.group);
        enemies.splice(hitIndex, 1);
        kills++;
        ui.kills.textContent = String(kills).padStart(3, '0');
        spawnCoin(dropPoint);
        playTone(190, 0.12, 'sawtooth', 0.045);
      }
    } else if (bullet.life <= 0 || Math.abs(bullet.mesh.position.x) > 13 || Math.abs(bullet.mesh.position.z) > 13) {
      scene.remove(bullet.mesh);
      bullets.splice(i, 1);
    }
  }

  for (let i = coins.length - 1; i >= 0; i--) {
    const coin = coins[i];
    coin.mesh.rotation.y += dt * 2.7;
    coin.mesh.position.y = 0.44 + Math.sin(time * 3 + coin.phase) * 0.11;
    if (coin.mesh.position.distanceTo(player.position) < 1.15) {
      credits += coin.value;
      ui.credits.textContent = String(credits).padStart(3, '0');
      addParticles(coin.mesh.position, 0xffd96b, 5);
      scene.remove(coin.mesh);
      coins.splice(i, 1);
      updateUpgradeButtons();
      showToast(`+${coin.value} CREDITS RECOVERED`);
      playTone(880, 0.11, 'sine', 0.045);
    }
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    particle.life -= dt;
    particle.mesh.position.addScaledVector(particle.velocity, dt);
    particle.velocity.y -= 2.8 * dt;
    particle.mesh.material.opacity = Math.max(0, particle.life / 0.75);
    if (particle.life <= 0) { scene.remove(particle.mesh); particle.mesh.material.dispose(); particles.splice(i, 1); }
  }
  ui.hostileCount.textContent = `${enemies.length} HOSTILE${enemies.length === 1 ? '' : 'S'}`;
  updateUpgradeButtons();
}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

setTimeout(() => ui.message.classList.add('hidden'), 2400);
updateUpgradeButtons();
requestAnimationFrame(animate);
