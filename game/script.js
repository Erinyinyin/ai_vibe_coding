(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const $ = (id) => document.getElementById(id);
  const ui = {
    credits: $('credits'), wave: $('wave'), waveProgress: $('waveProgress'), waveLabel: $('waveLabel'),
    healthText: $('healthText'), healthBar: $('healthBar'), crosshair: $('crosshair'), toast: $('toast'),
    hitMarker: $('hitMarker'), damageFlash: $('damageFlash'), startScreen: $('startScreen'),
    armoryScreen: $('armoryScreen'), gameOverScreen: $('gameOverScreen')
  };
  const keys = new Set();
  const touchMoves = new Set();
  const player = { x: 0, health: 100, maxHealth: 100, credits: 0, damage: 1, fireRate: 280, lastShot: 0, dash: 0, hurtAt: 0 };
  const upgrades = { damage: 1, fire: 1, armor: 1 };
  let width = 0, height = 0, dpr = 1;
  let state = 'ready', soundOn = false, audioContext = null;
  let wave = 1, waveTotal = 0, waveSpawned = 0, spawnTimer = 0, lastTime = 0, toastTimer = 0;
  let pointer = { x: 0, y: 0 }, firing = false, muzzle = 0, shake = 0;
  let aliens = [], drops = [], particles = [], stars = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!pointer.x) pointer = { x: width / 2, y: height * 0.47 };
    stars = Array.from({ length: Math.max(65, Math.floor(width * height / 9000)) }, (_, i) => ({
      x: (i * 7919 % 10007) / 10007 * width,
      y: (i * 3137 % 9973) / 9973 * height * 0.55,
      r: (i % 7 + 2) / 10,
      a: 0.2 + (i % 5) * 0.12
    }));
  }
  window.addEventListener('resize', resize);
  resize();

  function audioTone(frequency, duration = 0.08, type = 'sine', volume = 0.045) {
    if (!soundOn) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      gain.gain.setValueAtTime(volume, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
      oscillator.connect(gain); gain.connect(audioContext.destination);
      oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
    } catch (_) { /* Audio is optional. */ }
  }

  function showToast(message) {
    ui.toast.textContent = message;
    ui.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 1350);
  }
  function setCredits(value) {
    player.credits = value;
    const display = String(value).padStart(3, '0');
    ui.credits.textContent = display;
    $('armoryCredits').textContent = display;
    document.querySelectorAll('.buy-button').forEach((button) => {
      button.disabled = player.credits < Number(button.dataset.cost || button.querySelector('b').textContent);
    });
  }
  function updateHealth() {
    const ratio = Math.max(0, player.health / player.maxHealth);
    ui.healthText.textContent = `${Math.ceil(ratio * 100)}%`;
    ui.healthBar.style.width = `${ratio * 100}%`;
    ui.healthBar.style.background = ratio < 0.3 ? '#ff4e51' : '';
  }
  function updateUpgradeLabels() {
    $('damageLevel').textContent = `LEVEL ${upgrades.damage} · NEXT: ${player.damage + 1} DMG`;
    $('fireLevel').textContent = `LEVEL ${upgrades.fire} · ${Math.round(280 / player.fireRate * 100)}% FIRE RATE`;
    $('armorLevel').textContent = `LEVEL ${upgrades.armor} · ${player.maxHealth} MAX HP`;
    document.querySelector('.weapon-info strong span').textContent = `MK.${['I', 'II', 'III', 'IV', 'V', 'VI'][Math.min(5, upgrades.damage - 1)]}`;
    setCredits(player.credits);
  }

  function startGame() {
    state = 'playing';
    ui.startScreen.classList.add('hidden');
    ui.gameOverScreen.classList.add('hidden');
    ui.armoryScreen.classList.add('hidden');
    player.x = 0; player.health = player.maxHealth; player.credits = 0;
    player.damage = 1; player.fireRate = 280; player.lastShot = 0; player.dash = 0;
    upgrades.damage = 1; upgrades.fire = 1; upgrades.armor = 1;
    document.querySelector('[data-upgrade="damage"] b').textContent = '50';
    document.querySelector('[data-upgrade="fire"] b').textContent = '70';
    document.querySelector('[data-upgrade="armor"] b').textContent = '60';
    wave = 1; aliens = []; drops = []; particles = [];
    waveTotal = 5; waveSpawned = 0; spawnTimer = 0.7;
    setCredits(0); updateHealth(); updateUpgradeLabels(); updateWaveUI();
    showToast('SECTOR 01 · HOSTILES INBOUND');
  }
  function updateWaveUI() {
    ui.wave.textContent = String(wave).padStart(2, '0');
    const progress = waveTotal ? Math.min(100, waveSpawned / waveTotal * 100) : 0;
    ui.waveProgress.style.width = `${progress}%`;
    ui.waveLabel.textContent = waveSpawned < waveTotal ? 'HOSTILES DETECTED' : `${aliens.length} HOSTILES REMAINING`;
  }
  function spawnAlien() {
    const lane = [-4.1, -2.1, 0, 2.1, 4.1][Math.floor(Math.random() * 5)];
    const elite = wave >= 3 && Math.random() < Math.min(0.38, wave * 0.055);
    aliens.push({ x: lane + (Math.random() - 0.5) * 0.6, z: 24 + Math.random() * 12, hp: elite ? 2 + Math.floor(wave / 4) : 1, maxHp: elite ? 2 + Math.floor(wave / 4) : 1, elite, phase: Math.random() * 6.28, speed: 1.05 + Math.min(1.45, wave * 0.08) + Math.random() * 0.3 });
    waveSpawned++;
    updateWaveUI();
  }
  function beginNextWave() {
    wave++;
    waveTotal = 5 + wave * 2;
    waveSpawned = 0;
    spawnTimer = 1.1;
    player.health = Math.min(player.maxHealth, player.health + 8);
    updateHealth(); updateWaveUI();
    showToast(`SECTOR ${String(wave).padStart(2, '0')} · BOUNTY INCREASED`);
    audioTone(540, 0.2, 'triangle', 0.06);
  }

  function project(x, z) {
    const focal = height * 0.92;
    const horizon = height * 0.425;
    const depth = Math.max(0.25, z + 1.1);
    const scale = focal / depth;
    return { x: width / 2 + (x - player.x) * scale, y: horizon + scale * 1.62, scale, horizon };
  }
  function drawBackground(time) {
    const horizon = height * 0.425;
    const sky = ctx.createLinearGradient(0, 0, 0, horizon + 100);
    sky.addColorStop(0, '#080d18'); sky.addColorStop(0.62, '#101c28'); sky.addColorStop(1, '#25313a');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
    const planetX = width * 0.76, planetY = height * 0.26, planetR = Math.min(width, height) * 0.105;
    const planet = ctx.createRadialGradient(planetX - planetR * .35, planetY - planetR * .38, planetR * .08, planetX, planetY, planetR);
    planet.addColorStop(0, '#536a70'); planet.addColorStop(.58, '#253b48'); planet.addColorStop(1, 'rgba(15,26,37,.08)');
    ctx.fillStyle = planet; ctx.beginPath(); ctx.arc(planetX, planetY, planetR, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(99,223,206,.12)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(planetX, planetY + planetR * .22, planetR * 1.48, planetR * .3, -.13, Math.PI * 1.04, Math.PI * 1.93); ctx.stroke();
    stars.forEach((star, i) => {
      ctx.globalAlpha = star.a * (0.72 + Math.sin(time * .001 + i) * .2);
      ctx.fillStyle = '#d5f7ef'; ctx.fillRect(star.x, star.y, star.r, star.r);
    });
    ctx.globalAlpha = 1;
    const glow = ctx.createRadialGradient(width * .5, horizon, 5, width * .5, horizon, width * .42);
    glow.addColorStop(0, 'rgba(101,242,219,.11)'); glow.addColorStop(1, 'rgba(101,242,219,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, horizon - 100, width, 250);
    ctx.strokeStyle = 'rgba(116,195,195,.22)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, horizon); ctx.lineTo(width, horizon); ctx.stroke();
    drawFloor(horizon);
    drawRuins(horizon);
  }
  function drawFloor(horizon) {
    const floor = ctx.createLinearGradient(0, horizon, 0, height);
    floor.addColorStop(0, '#1b2a31'); floor.addColorStop(.38, '#101a21'); floor.addColorStop(1, '#080d14');
    ctx.fillStyle = floor; ctx.fillRect(0, horizon, width, height - horizon);
    ctx.lineWidth = 1;
    for (let x = -12; x <= 12; x++) {
      const a = project(x * 2.2, 70), b = project(x * 2.2, 1);
      ctx.strokeStyle = x % 2 === 0 ? 'rgba(89,164,158,.18)' : 'rgba(89,164,158,.09)';
      ctx.beginPath(); ctx.moveTo(a.x, horizon); ctx.lineTo(b.x, height + 40); ctx.stroke();
    }
    for (let i = 1; i <= 14; i++) {
      const z = i * i * 0.57;
      const y = horizon + (height * .92 / (z + 1.1)) * 1.62;
      if (y < horizon || y > height + 20) continue;
      ctx.strokeStyle = `rgba(95,171,166,${Math.min(.2, .018 + i * .011)})`;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
  }
  function drawRuins(horizon) {
    const buildings = [{ x: .06, w: .07, h: .16 }, { x: .18, w: .11, h: .09 }, { x: .36, w: .06, h: .13 }, { x: .55, w: .1, h: .08 }, { x: .89, w: .12, h: .14 }, { x: .98, w: .09, h: .1 }];
    buildings.forEach((b, i) => {
      const x = b.x * width, y = horizon - height * b.h;
      ctx.fillStyle = i % 2 ? 'rgba(8,15,22,.85)' : 'rgba(10,20,27,.9)';
      ctx.fillRect(x, y, b.w * width, height * b.h + 2);
      ctx.fillStyle = 'rgba(103,235,214,.38)';
      for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
        if ((row + col + i) % 2) ctx.fillRect(x + 7 + col * 11, y + 9 + row * 12, 3, 2);
      }
    });
  }
  function drawAlien(alien, time) {
    const p = project(alien.x, alien.z);
    if (p.x < -200 || p.x > width + 200 || alien.z < .7) return;
    const s = p.scale;
    const bodyW = s * (alien.elite ? .95 : .74), bodyH = s * (alien.elite ? 1.25 : 1.06);
    const bob = Math.sin(time * .004 + alien.phase) * Math.min(4, s * .035);
    const bottom = Math.min(height + bodyH, p.y + bob);
    ctx.save();
    ctx.globalAlpha = Math.min(1, Math.max(.25, 1 - alien.z / 60));
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(p.x, bottom - s * .03, bodyW * .8, s * .12, 0, 0, Math.PI * 2); ctx.fill();
    const body = ctx.createRadialGradient(p.x - bodyW * .25, bottom - bodyH * .6, 1, p.x, bottom - bodyH * .4, bodyW);
    body.addColorStop(0, alien.elite ? '#c2674e' : '#86c6a0'); body.addColorStop(.5, alien.elite ? '#6d4345' : '#3e8777'); body.addColorStop(1, '#142b32');
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.ellipse(p.x, bottom - bodyH * .41, bodyW * .42, bodyH * .43, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(p.x, bottom - bodyH * .81, bodyW * .48, bodyH * .23, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = alien.elite ? 'rgba(255,151,108,.85)' : 'rgba(116,255,221,.7)'; ctx.lineWidth = Math.max(1, s * .025);
    ctx.beginPath(); ctx.moveTo(p.x - bodyW * .3, bottom - bodyH * .47); ctx.lineTo(p.x - bodyW * .55, bottom - bodyH * .08); ctx.moveTo(p.x + bodyW * .3, bottom - bodyH * .47); ctx.lineTo(p.x + bodyW * .55, bottom - bodyH * .08); ctx.stroke();
    const eyeGlow = alien.elite ? '#ff7e60' : '#b9ff6c';
    ctx.shadowColor = eyeGlow; ctx.shadowBlur = Math.max(3, s * .08); ctx.fillStyle = eyeGlow;
    ctx.beginPath(); ctx.ellipse(p.x - bodyW * .19, bottom - bodyH * .83, Math.max(1.5, bodyW * .085), Math.max(1.5, bodyH * .027), -.2, 0, Math.PI * 2); ctx.ellipse(p.x + bodyW * .19, bottom - bodyH * .83, Math.max(1.5, bodyW * .085), Math.max(1.5, bodyH * .027), .2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    if (alien.hp < alien.maxHp) {
      ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(p.x - bodyW * .45, bottom - bodyH * 1.08, bodyW * .9, 3);
      ctx.fillStyle = '#ff875d'; ctx.fillRect(p.x - bodyW * .45, bottom - bodyH * 1.08, bodyW * .9 * alien.hp / alien.maxHp, 3);
    }
    ctx.restore();
  }
  function drawDrop(drop, time) {
    const p = project(drop.x, drop.z);
    const size = Math.max(5, p.scale * .13);
    if (p.x < -40 || p.x > width + 40) return;
    ctx.save(); ctx.translate(p.x, p.y - p.scale * .16 + Math.sin(time * .004 + drop.phase) * size * .35);
    ctx.shadowColor = '#ffe27d'; ctx.shadowBlur = size * 1.5;
    ctx.fillStyle = '#ffe27d'; ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#705529'; ctx.font = `bold ${Math.max(7, size * 1.2)}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('¢', 0, 1);
    ctx.restore();
  }
  function drawParticle(particle) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color; ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  }
  function drawWeapon() {
    if (state !== 'playing') return;
    const cx = width / 2 + (pointer.x - width / 2) * .08;
    const baseY = height + 28;
    ctx.save(); ctx.translate(cx, baseY);
    ctx.fillStyle = '#101921'; ctx.strokeStyle = '#596d71'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-width * .12, 10); ctx.lineTo(-width * .09, -height * .14); ctx.lineTo(-width * .055, -height * .2); ctx.lineTo(width * .055, -height * .2); ctx.lineTo(width * .09, -height * .14); ctx.lineTo(width * .12, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#22373d'; ctx.fillRect(-width * .048, -height * .19, width * .096, height * .12);
    ctx.fillStyle = '#111b24'; ctx.fillRect(-width * .022, -height * .27, width * .044, height * .12);
    ctx.fillStyle = '#65f2db'; ctx.shadowColor = '#65f2db'; ctx.shadowBlur = 12; ctx.fillRect(-width * .009, -height * .19, width * .018, height * .055); ctx.shadowBlur = 0;
    ctx.fillStyle = '#0b1119'; ctx.fillRect(-width * .024, -height * .17, width * .048, height * .14);
    if (muzzle > 0) {
      ctx.globalAlpha = Math.min(1, muzzle * 9); ctx.fillStyle = '#c5fff4'; ctx.shadowColor = '#65f2db'; ctx.shadowBlur = 30;
      ctx.beginPath(); ctx.moveTo(0, -height * .29); ctx.lineTo(-width * .025, -height * .35); ctx.lineTo(0, -height * .39); ctx.lineTo(width * .025, -height * .35); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
    }
    ctx.restore();
  }
  function render(time) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    drawBackground(time);
    const scene = [...aliens.map((value) => ({ type: 'alien', value })), ...drops.map((value) => ({ type: 'drop', value }))].sort((a, b) => b.value.z - a.value.z);
    scene.forEach((entry) => entry.type === 'alien' ? drawAlien(entry.value, time) : drawDrop(entry.value, time));
    particles.forEach(drawParticle);
    drawWeapon();
    if (shake > 0) shake = Math.max(0, shake - .03);
  }
  function screenPosition(alien) {
    const p = project(alien.x, alien.z);
    const heightPx = p.scale * (alien.elite ? 1.25 : 1.06);
    return { x: p.x, y: p.y - heightPx * .57, radius: Math.max(14, p.scale * .58) };
  }
  function burst(x, y, color, amount = 12) {
    for (let i = 0; i < amount; i++) {
      const angle = Math.random() * Math.PI * 2, speed = 35 + Math.random() * 155;
      particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: 1 + Math.random() * 3, color, life: .25 + Math.random() * .5, maxLife: .75 });
    }
  }
  function fire(now) {
    if (state !== 'playing' || now - player.lastShot < player.fireRate) return;
    player.lastShot = now; muzzle = .09;
    audioTone(145 + Math.random() * 30, .09, 'sawtooth', .025);
    ui.crosshair.style.transform = 'translate(-50%,-50%) scale(.72)';
    setTimeout(() => { ui.crosshair.style.transform = 'translate(-50%,-50%) scale(1)'; }, 65);
    let target = null, best = Infinity;
    for (const alien of aliens) {
      const pos = screenPosition(alien);
      const dx = pos.x - pointer.x, dy = pos.y - pointer.y;
      const distance = Math.hypot(dx, dy);
      if (distance < pos.radius && distance < best) { best = distance; target = alien; }
    }
    if (target) {
      target.hp -= player.damage;
      const pos = screenPosition(target);
      ui.hitMarker.classList.remove('hit'); void ui.hitMarker.offsetWidth; ui.hitMarker.classList.add('hit');
      burst(pos.x, pos.y, target.elite ? '#ff8c65' : '#8dffcf', target.hp <= 0 ? 18 : 6);
      audioTone(target.hp <= 0 ? 330 : 230, .1, 'triangle', .035);
      if (target.hp <= 0) {
        aliens.splice(aliens.indexOf(target), 1);
        const bounty = target.elite ? 35 : 15 + Math.floor(Math.random() * 11);
        drops.push({ x: target.x, z: Math.max(2, target.z - .5), value: bounty, phase: Math.random() * 6.28 });
        showToast(`ALIEN DOWN · ¢${bounty} BOUNTY DROP`);
        updateWaveUI();
      }
    }
  }

  function update(dt, now) {
    if (state !== 'playing') return;
    if (keys.has('Shift') && player.dash <= 0) player.dash = .24;
    const dashBoost = player.dash > 0 ? 2.7 : 1;
    player.dash = Math.max(0, player.dash - dt);
    let move = 0;
    if (keys.has('a') || keys.has('ArrowLeft') || touchMoves.has('left')) move -= 1;
    if (keys.has('d') || keys.has('ArrowRight') || touchMoves.has('right')) move += 1;
    player.x = Math.max(-5, Math.min(5, player.x + move * 5.8 * dashBoost * dt));
    if (keys.has('w') || keys.has('ArrowUp') || touchMoves.has('forward')) aliens.forEach((alien) => alien.z -= 2.3 * dt * dashBoost);
    if (keys.has('s') || keys.has('ArrowDown') || touchMoves.has('back')) aliens.forEach((alien) => alien.z += 2.3 * dt);
    spawnTimer -= dt;
    if (waveSpawned < waveTotal && spawnTimer <= 0) {
      spawnAlien(); spawnTimer = Math.max(.46, 1.05 - wave * .035) + Math.random() * .48;
    }
    aliens.forEach((alien) => { alien.z -= alien.speed * dt; alien.phase += dt * 2; });
    for (const alien of [...aliens]) {
      if (alien.z < 1.55) {
        const index = aliens.indexOf(alien);
        if (index >= 0) aliens.splice(index, 1);
        if (Math.abs(alien.x - player.x) < 2.5) {
          player.health -= alien.elite ? 24 : 17;
          player.hurtAt = now; shake = .35;
          ui.damageFlash.classList.add('show'); setTimeout(() => ui.damageFlash.classList.remove('show'), 130);
          audioTone(75, .18, 'sawtooth', .06); updateHealth();
          if (player.health <= 0) endGame();
        }
      }
    }
    for (const drop of [...drops]) {
      drop.z -= 1.8 * dt;
      if (drop.z < 1.7) {
        if (Math.abs(drop.x - player.x) < 1.35) {
          setCredits(player.credits + drop.value);
          showToast(`BOUNTY COLLECTED · +¢${drop.value}`);
          audioTone(720, .12, 'sine', .04);
          const p = project(drop.x, drop.z); burst(p.x, p.y, '#ffe27d', 9);
        }
        drops.splice(drops.indexOf(drop), 1);
      }
    }
    for (const particle of particles) {
      particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vy += 65 * dt; particle.life -= dt;
    }
    particles = particles.filter((particle) => particle.life > 0);
    if (firing) fire(now);
    if (waveSpawned >= waveTotal && aliens.length === 0) beginNextWave();
    muzzle = Math.max(0, muzzle - dt);
    updateWaveUI();
  }
  function frame(now) {
    const dt = Math.min(.04, (now - (lastTime || now)) / 1000);
    lastTime = now;
    update(dt, now);
    render(now);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function endGame() {
    state = 'gameover'; firing = false;
    $('finalWave').textContent = wave;
    $('finalCredits').textContent = player.credits;
    ui.gameOverScreen.classList.remove('hidden');
  }
  function togglePause() {
    if (state === 'playing') {
      state = 'paused'; ui.armoryScreen.classList.remove('hidden');
    } else if (state === 'paused') {
      state = 'playing'; ui.armoryScreen.classList.add('hidden');
    }
  }
  function openArmory() {
    if (state === 'playing') state = 'paused';
    if (state === 'paused') { ui.armoryScreen.classList.remove('hidden'); updateUpgradeLabels(); }
  }
  function buyUpgrade(type) {
    const costs = { damage: 50 + (upgrades.damage - 1) * 45, fire: 70 + (upgrades.fire - 1) * 55, armor: 60 + (upgrades.armor - 1) * 45 };
    const cost = costs[type];
    if (!cost || player.credits < cost) { showToast('NOT ENOUGH BOUNTY CREDITS'); return; }
    setCredits(player.credits - cost);
    if (type === 'damage') { upgrades.damage++; player.damage++; }
    if (type === 'fire') { upgrades.fire++; player.fireRate = Math.max(90, player.fireRate * .78); }
    if (type === 'armor') { upgrades.armor++; player.maxHealth += 25; player.health = Math.min(player.maxHealth, player.health + 25); updateHealth(); }
    const button = document.querySelector(`[data-upgrade="${type}"]`);
    button.querySelector('b').textContent = costs[type] + (type === 'damage' ? 45 : type === 'fire' ? 55 : 45);
    showToast('UPGRADE INSTALLED · GOOD HUNT');
    audioTone(520, .16, 'triangle', .06); updateUpgradeLabels();
  }

  $('startButton').addEventListener('click', startGame);
  $('retryButton').addEventListener('click', startGame);
  $('pauseButton').addEventListener('click', togglePause);
  $('upgradeButton').addEventListener('click', openArmory);
  $('closeArmory').addEventListener('click', () => { if (state === 'paused') togglePause(); });
  $('resumeButton').addEventListener('click', () => { if (state === 'paused') togglePause(); });
  $('soundButton').addEventListener('click', (event) => {
    soundOn = !soundOn; event.currentTarget.style.color = soundOn ? 'var(--cyan)' : '';
    event.currentTarget.textContent = soundOn ? '♫' : '♩';
    if (soundOn) audioTone(500, .09, 'sine', .03);
  });
  document.querySelectorAll('.buy-button').forEach((button) => button.addEventListener('click', () => buyUpgrade(button.dataset.upgrade)));
  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
    keys.add(event.key === 'Shift' ? 'Shift' : key);
    if (key === 'u') openArmory();
    if (key === 'escape' && state === 'paused') togglePause();
    if (key === ' ' && state === 'playing') firing = true;
  });
  window.addEventListener('keyup', (event) => { keys.delete(event.key === 'Shift' ? 'Shift' : event.key.toLowerCase()); if (event.key === ' ') firing = false; });
  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse') {
      const rect = canvas.getBoundingClientRect(); pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      ui.crosshair.style.left = `${pointer.x}px`; ui.crosshair.style.top = `${pointer.y}px`;
    }
  });
  canvas.addEventListener('pointerdown', (event) => {
    if (state !== 'playing') return;
    if (event.pointerType === 'touch') { pointer = { x: width / 2, y: height * .46 }; }
    firing = true; fire(performance.now());
  });
  window.addEventListener('pointerup', () => { firing = false; });
  document.querySelectorAll('[data-move]').forEach((button) => {
    const direction = button.dataset.move;
    button.addEventListener('pointerdown', (event) => { event.preventDefault(); touchMoves.add(direction); button.setPointerCapture(event.pointerId); });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, () => touchMoves.delete(direction));
  });
  $('touchFire').addEventListener('pointerdown', (event) => { event.preventDefault(); firing = true; fire(performance.now()); });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) $('touchFire').addEventListener(name, () => { firing = false; });
  document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'playing') togglePause(); });

  updateHealth(); setCredits(0); updateUpgradeLabels();
})();
