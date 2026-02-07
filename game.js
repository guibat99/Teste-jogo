import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';

const cover = document.getElementById('cover');
const hud = document.getElementById('hud');
const result = document.getElementById('result');
const resultTitle = document.getElementById('resultTitle');
const resultText = document.getElementById('resultText');

const healthEl = document.getElementById('health');
const shieldEl = document.getElementById('shield');
const ammoEl = document.getElementById('ammo');
const aliveEl = document.getElementById('alive');
const eventsEl = document.getElementById('events');

const minimap = document.getElementById('minimap');
const mmCtx = minimap.getContext('2d');

const joystickBase = document.getElementById('joystickBase');
const joystickStick = document.getElementById('joystickStick');
const shootBtn = document.getElementById('shootBtn');
const healBtn = document.getElementById('healBtn');
const jumpBtn = document.getElementById('jumpBtn');

let renderer, scene, camera;
let state;
let raf;

const worldSize = 180;

function pushEvent(text) {
  eventsEl.textContent = text;
}

function setupWorld() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x77a6d1, 120, 260);
  scene.background = new THREE.Color(0x8ec0e8);

  camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 600);

  const hemi = new THREE.HemisphereLight(0xcbe7ff, 0x243117, 1.1);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(40, 90, 50);
  scene.add(dir);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(worldSize * 2, worldSize * 2),
    new THREE.MeshLambertMaterial({ color: 0x2e6f40 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  for (let i = 0; i < 50; i += 1) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 1, 5),
      new THREE.MeshLambertMaterial({ color: 0x6a3f24 })
    );
    trunk.position.y = 2.5;
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(3.3, 7, 8),
      new THREE.MeshLambertMaterial({ color: 0x1f5b2c })
    );
    crown.position.y = 7;
    tree.add(trunk, crown);
    tree.position.set(rand(-worldSize, worldSize), 0, rand(-worldSize, worldSize));
    scene.add(tree);
  }

  initGameState();
  bindInputs();
  animate();
}

function makeCharacter(color) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(1.1, 2.2, 4, 8),
    new THREE.MeshLambertMaterial({ color })
  );
  body.position.y = 2.2;
  group.add(body);
  return group;
}

function initGameState() {
  const playerMesh = makeCharacter(0x0f172a);
  scene.add(playerMesh);

  state = {
    over: false,
    time: 0,
    safeZoneRadius: worldSize,
    nextShrinkAt: 20,
    player: {
      mesh: playerMesh,
      pos: new THREE.Vector3(0, 0, 0),
      velY: 0,
      hp: 100,
      shield: 50,
      ammo: 30,
      medkits: 2,
      dead: false,
      cooldown: 0,
    },
    bots: [],
    bullets: [],
    loot: [],
    input: { moveX: 0, moveY: 0, shoot: false, jump: false },
  };

  for (let i = 0; i < 14; i += 1) {
    const mesh = makeCharacter(0xcc3344 + i * 73);
    const bot = {
      mesh,
      pos: new THREE.Vector3(rand(-90, 90), 0, rand(-90, 90)),
      hp: 70,
      shield: 30,
      dead: false,
      cooldown: rand(0.4, 1.2),
      dirTime: rand(0.3, 2.2),
      dir: new THREE.Vector3(rand(-1, 1), 0, rand(-1, 1)).normalize(),
    };
    mesh.position.copy(bot.pos);
    scene.add(mesh);
    state.bots.push(bot);
  }

  for (let i = 0; i < 18; i += 1) {
    const type = Math.random() > 0.55 ? 'ammo' : Math.random() > 0.5 ? 'medkit' : 'shield';
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.2, 1.6),
      new THREE.MeshLambertMaterial({ color: type === 'ammo' ? 0xf3b22b : type === 'medkit' ? 0x39d353 : 0x58a6ff })
    );
    mesh.position.set(rand(-100, 100), 0.7, rand(-100, 100));
    scene.add(mesh);
    state.loot.push({ type, mesh, taken: false });
  }

  pushEvent('Partida iniciada. Encontre loot e sobreviva!');
  updateHud();
}

function bindInputs() {
  const joy = { active: false, sx: 0, sy: 0 };

  function updateJoystick(clientX, clientY) {
    const rect = joystickBase.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const len = Math.min(40, Math.hypot(dx, dy));
    const ang = Math.atan2(dy, dx);
    const x = Math.cos(ang) * len;
    const y = Math.sin(ang) * len;
    joystickStick.style.transform = `translate(${x}px, ${y}px)`;
    state.input.moveX = x / 40;
    state.input.moveY = y / 40;
  }

  joystickBase.addEventListener('pointerdown', (e) => {
    joy.active = true;
    updateJoystick(e.clientX, e.clientY);
  });

  window.addEventListener('pointermove', (e) => {
    if (joy.active) updateJoystick(e.clientX, e.clientY);
  });

  window.addEventListener('pointerup', () => {
    joy.active = false;
    state.input.moveX = 0;
    state.input.moveY = 0;
    joystickStick.style.transform = 'translate(0px, 0px)';
  });

  shootBtn.addEventListener('pointerdown', () => {
    state.input.shoot = true;
  });

  shootBtn.addEventListener('pointerup', () => {
    state.input.shoot = false;
  });

  jumpBtn.addEventListener('click', () => {
    state.input.jump = true;
  });

  healBtn.addEventListener('click', () => {
    if (state.player.medkits > 0 && state.player.hp < 100) {
      state.player.medkits -= 1;
      state.player.hp = Math.min(100, state.player.hp + 45);
      pushEvent('Kit médico utilizado.');
      updateHud();
    }
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function shootFrom(entity, fromPlayer = false) {
  const dir = new THREE.Vector3();
  if (fromPlayer) {
    dir.set(state.input.moveX || 0.001, 0, state.input.moveY || -1).normalize();
  } else {
    dir.copy(state.player.pos).sub(entity.pos).setY(0).normalize();
  }

  const geo = new THREE.SphereGeometry(0.25, 6, 6);
  const mat = new THREE.MeshBasicMaterial({ color: fromPlayer ? 0xffcc66 : 0xff6677 });
  const mesh = new THREE.Mesh(geo, mat);
  const start = entity.pos.clone().add(new THREE.Vector3(0, 2.2, 0));
  mesh.position.copy(start);
  scene.add(mesh);
  state.bullets.push({ mesh, pos: start, dir, speed: fromPlayer ? 90 : 55, fromPlayer, life: 2 });
}

function applyDamage(target, damage) {
  if (target.shield > 0) {
    const blocked = Math.min(target.shield, damage);
    target.shield -= blocked;
    damage -= blocked;
  }
  target.hp -= damage;
  if (target.hp <= 0) target.dead = true;
}

function updatePlayer(dt) {
  const p = state.player;
  if (p.dead) return;

  const speed = 28;
  p.pos.x += state.input.moveX * speed * dt;
  p.pos.z += state.input.moveY * speed * dt;
  p.pos.x = THREE.MathUtils.clamp(p.pos.x, -worldSize, worldSize);
  p.pos.z = THREE.MathUtils.clamp(p.pos.z, -worldSize, worldSize);

  if (state.input.jump && p.pos.y <= 0.001) p.velY = 11;
  state.input.jump = false;
  p.velY -= 28 * dt;
  p.pos.y = Math.max(0, p.pos.y + p.velY * dt);
  if (p.pos.y === 0) p.velY = 0;

  const distToCenter = Math.hypot(p.pos.x, p.pos.z);
  if (distToCenter > state.safeZoneRadius) {
    p.hp -= 6 * dt;
  }

  p.cooldown -= dt;
  if (state.input.shoot && p.cooldown <= 0 && p.ammo > 0) {
    shootFrom(p, true);
    p.ammo -= 1;
    p.cooldown = 0.2;
    updateHud();
  }

  p.mesh.position.copy(p.pos);

  const camOffset = new THREE.Vector3(0, 18, 22);
  camera.position.copy(p.pos).add(camOffset);
  camera.lookAt(p.pos.x, p.pos.y + 4, p.pos.z);
}

function updateBots(dt) {
  for (const bot of state.bots) {
    if (bot.dead) {
      bot.mesh.visible = false;
      continue;
    }

    bot.dirTime -= dt;
    if (bot.dirTime <= 0) {
      bot.dirTime = rand(0.8, 2.4);
      bot.dir.set(rand(-1, 1), 0, rand(-1, 1)).normalize();
    }

    const dToPlayer = bot.pos.distanceTo(state.player.pos);
    if (dToPlayer < 35) {
      bot.dir.copy(state.player.pos).sub(bot.pos).setY(0).normalize();
      bot.cooldown -= dt;
      if (bot.cooldown <= 0) {
        shootFrom(bot);
        bot.cooldown = rand(0.6, 1.4);
      }
    }

    bot.pos.addScaledVector(bot.dir, 11 * dt);
    bot.pos.x = THREE.MathUtils.clamp(bot.pos.x, -worldSize, worldSize);
    bot.pos.z = THREE.MathUtils.clamp(bot.pos.z, -worldSize, worldSize);

    if (Math.hypot(bot.pos.x, bot.pos.z) > state.safeZoneRadius) bot.hp -= 5 * dt;
    if (bot.hp <= 0) bot.dead = true;

    bot.mesh.position.copy(bot.pos);
  }
}

function updateLoot() {
  for (const item of state.loot) {
    if (item.taken) continue;
    item.mesh.rotation.y += 0.02;
    if (item.mesh.position.distanceTo(state.player.pos) < 3) {
      item.taken = true;
      item.mesh.visible = false;
      if (item.type === 'ammo') {
        state.player.ammo += 20;
        pushEvent('Você pegou munição +20');
      }
      if (item.type === 'medkit') {
        state.player.medkits += 1;
        pushEvent('Você pegou kit médico');
      }
      if (item.type === 'shield') {
        state.player.shield = Math.min(100, state.player.shield + 35);
        pushEvent('Você pegou escudo +35');
      }
      updateHud();
    }
  }
}

function updateBullets(dt) {
  for (const bullet of state.bullets) {
    bullet.life -= dt;
    bullet.pos.addScaledVector(bullet.dir, bullet.speed * dt);
    bullet.mesh.position.copy(bullet.pos);

    if (bullet.fromPlayer) {
      for (const bot of state.bots) {
        if (!bot.dead && bullet.pos.distanceTo(bot.pos) < 2.2) {
          applyDamage(bot, 30);
          bullet.life = 0;
          if (bot.dead) pushEvent('Inimigo eliminado!');
          break;
        }
      }
    } else if (!state.player.dead && bullet.pos.distanceTo(state.player.pos) < 2.1) {
      applyDamage(state.player, 12);
      bullet.life = 0;
      updateHud();
    }
  }

  state.bullets = state.bullets.filter((b) => {
    if (b.life <= 0) {
      scene.remove(b.mesh);
      return false;
    }
    return true;
  });
}

function updateSafeZone(dt) {
  state.time += dt;
  if (state.time >= state.nextShrinkAt && state.safeZoneRadius > 18) {
    state.nextShrinkAt += 20;
    state.safeZoneRadius -= 18;
    pushEvent(`A zona segura diminuiu para ${Math.floor(state.safeZoneRadius)}m`);
  }
}

function renderMinimap() {
  mmCtx.clearRect(0, 0, minimap.width, minimap.height);
  const c = minimap.width / 2;
  const scale = c / worldSize;

  mmCtx.strokeStyle = '#ffffff77';
  mmCtx.lineWidth = 2;
  mmCtx.beginPath();
  mmCtx.arc(c, c, state.safeZoneRadius * scale, 0, Math.PI * 2);
  mmCtx.stroke();

  mmCtx.fillStyle = '#55f';
  mmCtx.beginPath();
  mmCtx.arc(c + state.player.pos.x * scale, c + state.player.pos.z * scale, 4, 0, Math.PI * 2);
  mmCtx.fill();

  mmCtx.fillStyle = '#f44';
  state.bots.forEach((bot) => {
    if (!bot.dead) {
      mmCtx.fillRect(c + bot.pos.x * scale - 1.5, c + bot.pos.z * scale - 1.5, 3, 3);
    }
  });
}

function updateHud() {
  healthEl.textContent = Math.max(0, Math.floor(state.player.hp));
  shieldEl.textContent = Math.max(0, Math.floor(state.player.shield));
  ammoEl.textContent = `${state.player.ammo} | Kits: ${state.player.medkits}`;
  aliveEl.textContent = 1 + state.bots.filter((b) => !b.dead).length;
}

function checkEndGame() {
  const aliveBots = state.bots.filter((b) => !b.dead).length;
  if (!state.player.dead && state.player.hp <= 0) state.player.dead = true;

  if (!state.over && state.player.dead) {
    state.over = true;
    showResult('DERROTA', 'Você foi eliminado. Tente outra estratégia!');
  }

  if (!state.over && aliveBots === 0) {
    state.over = true;
    showResult('BOOYAH!', 'Você venceu a partida battle royale.');
  }
}

function showResult(title, text) {
  hud.classList.add('hidden');
  result.classList.remove('hidden');
  resultTitle.textContent = title;
  resultText.textContent = text;
}

function animate(t = 0) {
  const dt = Math.min(0.032, (t - (state.lastFrame || t)) / 1000);
  state.lastFrame = t;

  if (!state.over) {
    updatePlayer(dt);
    updateBots(dt);
    updateBullets(dt);
    updateLoot();
    updateSafeZone(dt);
    updateHud();
    renderMinimap();
    checkEndGame();
  }

  renderer.render(scene, camera);
  raf = requestAnimationFrame(animate);
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function reset() {
  cancelAnimationFrame(raf);
  renderer?.dispose();
  location.reload();
}

document.getElementById('startBtn').addEventListener('click', () => {
  cover.classList.add('hidden');
  hud.classList.remove('hidden');
  setupWorld();
});

document.getElementById('restartBtn').addEventListener('click', reset);
