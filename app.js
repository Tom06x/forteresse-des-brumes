const CLASS_DEFS = [
  {
    id: "mage",
    name: "Mage astral",
    desc: "Degats magiques eleves. Competence: pluie de meteores globale.",
    attackBoost: 1.15,
    speedBoost: 1,
    crit: 0.1,
    ability: {
      name: "Pluie de meteores",
      cooldown: 18,
      run: (state) => {
        let hits = 0;
        state.monsters.forEach((monster) => {
          monster.hp -= 28 + state.stats.wave * 0.7;
          hits += 1;
        });
        if (hits > 0) state.log(`Le mage invoque ${hits} meteores.`);
      }
    }
  },
  {
    id: "warrior",
    name: "Guerrier du rempart",
    desc: "Tank defensif. Competence: coup de bouclier qui ralentit l'avant-garde.",
    attackBoost: 0.95,
    speedBoost: 0.92,
    crit: 0.2,
    ability: {
      name: "Coup de bouclier",
      cooldown: 14,
      run: (state) => {
        const frontline = [...state.monsters].sort((a, b) => b.x - a.x).slice(0, 4);
        frontline.forEach((monster) => {
          monster.hp -= 18;
          monster.slow = 2.2;
        });
        if (frontline.length > 0) state.log("Le guerrier ecrase la ligne de front.");
      }
    }
  },
  {
    id: "ranger",
    name: "Rodeur noir",
    desc: "Tirs rapides et critiques frequents. Competence: pluie de fleches.",
    attackBoost: 0.85,
    speedBoost: 1.2,
    crit: 0.3,
    ability: {
      name: "Pluie de fleches",
      cooldown: 16,
      run: (state) => {
        for (let i = 0; i < 6; i += 1) {
          const target = state.monsters[Math.floor(Math.random() * state.monsters.length)];
          if (target) target.hp -= 14;
        }
        if (state.monsters.length > 0) state.log("Le rodeur declenche une pluie de fleches.");
      }
    }
  }
];

const MONSTER_DEFS = [
  { type: "Gobelin", hp: 34, speed: 26, reward: 6, damage: 5, color: "#86be4f" },
  { type: "Squelette", hp: 48, speed: 22, reward: 8, damage: 7, color: "#dad9d0" },
  { type: "Ogre", hp: 82, speed: 16, reward: 16, damage: 16, color: "#9d7650" },
  { type: "Dragonnet", hp: 130, speed: 20, reward: 26, damage: 28, color: "#d78b57" }
];

const RELIC_POOL = [
  {
    title: "Oeil de sentinelle",
    text: "+20% de portee pour la tour de guet.",
    apply: (state) => {
      state.mods.watchtowerRangeMult += 0.2;
    }
  },
  {
    title: "Poudre noire raffinee",
    text: "La mitrailleuse tire 15% plus vite.",
    apply: (state) => {
      state.mods.machineRateMult += 0.15;
    }
  },
  {
    title: "Pacte du forgeron",
    text: "+12 PV max pour le chateau et soin immediat de 12.",
    apply: (state) => {
      state.castle.maxHp += 12;
      state.castle.hp = Math.min(state.castle.maxHp, state.castle.hp + 12);
    }
  },
  {
    title: "Rune cupide",
    text: "+12% d'or sur chaque monstre vaincu.",
    apply: (state) => {
      state.mods.goldMult += 0.12;
    }
  },
  {
    title: "Arcane tense",
    text: "Canon arcanique: +18% de degats.",
    apply: (state) => {
      state.mods.arcaneDamageMult += 0.18;
    }
  }
];

const SHOP_PACKS = [
  { id: "starter", title: "Pack Eclaireur", gems: 45, price: "1.99 EUR" },
  { id: "war", title: "Pack Siege", gems: 120, price: "4.99 EUR" },
  { id: "dragon", title: "Pack Dragon", gems: 320, price: "11.99 EUR" }
];

const canvas = document.querySelector("#battlefield");
const ctx = canvas.getContext("2d");
const classList = document.querySelector("#classList");
const upgradeList = document.querySelector("#upgradeList");
const shopList = document.querySelector("#shopList");
const logWrap = document.querySelector("#log");
const waveEl = document.querySelector("#wave");
const goldEl = document.querySelector("#gold");
const gemsEl = document.querySelector("#gems");
const killsEl = document.querySelector("#kills");
const castleEl = document.querySelector("#castleHp");
const relicModal = document.querySelector("#relicModal");
const relicChoices = document.querySelector("#relicChoices");

const state = {
  selectedClass: CLASS_DEFS[0],
  running: false,
  paused: false,
  gameOver: false,
  time: 0,
  lastSpawn: 0,
  nextWaveAt: 24,
  abilityCd: 0,
  relicPromptWave: 3,
  monsters: [],
  shots: [],
  stats: { wave: 1, gold: 70, gems: 0, kills: 0 },
  castle: { hp: 180, maxHp: 180 },
  towers: {
    watchtower: { level: 1, baseDamage: 14, cooldown: 0, baseRate: 1.4, baseRange: 210 },
    machineGun: { level: 0, baseDamage: 6, cooldown: 0, baseRate: 0.28, baseRange: 175 },
    arcane: { level: 0, baseDamage: 22, cooldown: 0, baseRate: 3.6, baseRange: 160 }
  },
  mods: {
    watchtowerRangeMult: 1,
    machineRateMult: 1,
    goldMult: 1,
    arcaneDamageMult: 1
  },
  log(msg) {
    const item = document.createElement("div");
    item.className = "log-entry";
    item.textContent = msg;
    logWrap.prepend(item);
    if (logWrap.children.length > 60) {
      logWrap.lastElementChild.remove();
    }
  }
};

const upgrades = [
  {
    id: "watchtower",
    name: "Tour de guet",
    baseCost: 35,
    description: "Monocible precise. +degats et +portee.",
    action: () => {
      state.towers.watchtower.level += 1;
    }
  },
  {
    id: "machineGun",
    name: "Mitrailleuse",
    baseCost: 55,
    description: "Debloque puis augmente la cadence de tir.",
    action: () => {
      state.towers.machineGun.level += 1;
    }
  },
  {
    id: "arcane",
    name: "Canon arcanique",
    baseCost: 75,
    description: "Explosion de zone contre les vagues denses.",
    action: () => {
      state.towers.arcane.level += 1;
    }
  },
  {
    id: "wall",
    name: "Remparts",
    baseCost: 45,
    description: "+20 PV max du chateau et soin de 20.",
    action: () => {
      state.castle.maxHp += 20;
      state.castle.hp = Math.min(state.castle.maxHp, state.castle.hp + 20);
    }
  }
];

function getUpgradeCost(upgradeId) {
  if (upgradeId === "wall") {
    const count = Math.max(0, Math.floor((state.castle.maxHp - 180) / 20));
    return Math.floor(45 * (1 + count * 0.3));
  }
  const level = state.towers[upgradeId].level;
  const config = upgrades.find((u) => u.id === upgradeId);
  return Math.floor(config.baseCost * (1 + level * 0.32));
}

function spawnMonster() {
  const wave = state.stats.wave;
  const roll = Math.random();
  let def = MONSTER_DEFS[0];
  if (wave > 2 && roll > 0.55) def = MONSTER_DEFS[1];
  if (wave > 4 && roll > 0.78) def = MONSTER_DEFS[2];
  if (wave > 7 && roll > 0.9) def = MONSTER_DEFS[3];

  const hpScale = 1 + wave * 0.18;
  const speedScale = 1 + Math.min(0.35, wave * 0.02);
  state.monsters.push({
    ...def,
    hp: def.hp * hpScale,
    maxHp: def.hp * hpScale,
    speed: def.speed * speedScale,
    x: -20,
    y: 245 + (Math.random() * 66 - 33),
    slow: 0
  });
}

function shootFromTower(name, x, y, dt) {
  const tower = state.towers[name];
  if (tower.level <= 0) return;
  tower.cooldown -= dt;
  if (tower.cooldown > 0) return;

  const classBoost = state.selectedClass.attackBoost;
  const speedBoost = state.selectedClass.speedBoost;
  const critChance = state.selectedClass.crit;

  if (name === "watchtower") {
    const range = tower.baseRange + tower.level * 14;
    const finalRange = range * state.mods.watchtowerRangeMult;
    const target = state.monsters.find((m) => m.x > x - 10 && m.x < x + finalRange);
    if (!target) return;

    const crit = Math.random() < critChance;
    const damage = (tower.baseDamage + tower.level * 4) * classBoost * (crit ? 1.6 : 1);
    target.hp -= damage;
    state.shots.push({ x1: x, y1: y, x2: target.x, y2: target.y, life: 0.08, color: crit ? "#ffe793" : "#e9d2a6" });
    tower.cooldown = Math.max(0.35, tower.baseRate - tower.level * 0.06) / speedBoost;
    return;
  }

  if (name === "machineGun") {
    const range = tower.baseRange + tower.level * 10;
    const target = state.monsters.find((m) => m.x > x - 10 && m.x < x + range);
    if (!target) return;
    const damage = (tower.baseDamage + tower.level * 1.4) * classBoost * 0.8;
    target.hp -= damage;
    state.shots.push({ x1: x, y1: y, x2: target.x, y2: target.y, life: 0.05, color: "#a9dce3" });
    tower.cooldown = Math.max(0.08, tower.baseRate - tower.level * 0.015) / (speedBoost * state.mods.machineRateMult);
    return;
  }

  if (name === "arcane") {
    const range = tower.baseRange + tower.level * 12;
    const target = state.monsters.find((m) => m.x > x - 10 && m.x < x + range);
    if (!target) return;

    const blast = (tower.baseDamage + tower.level * 6) * classBoost * state.mods.arcaneDamageMult;
    state.monsters.forEach((monster) => {
      const d = Math.hypot(monster.x - target.x, monster.y - target.y);
      if (d < 55 + tower.level * 4) monster.hp -= blast;
    });
    state.shots.push({ x1: x, y1: y, x2: target.x, y2: target.y, life: 0.2, color: "#f58f59" });
    tower.cooldown = Math.max(1.5, tower.baseRate - tower.level * 0.18) / speedBoost;
  }
}

function applyAbility(dt) {
  state.abilityCd -= dt;
  if (state.abilityCd > 0 || state.monsters.length === 0) return;
  state.selectedClass.ability.run(state);
  state.abilityCd = state.selectedClass.ability.cooldown;
}

function updateMonsters(dt) {
  const goalX = canvas.width - 72;
  for (const monster of state.monsters) {
    const speed = monster.slow > 0 ? monster.speed * 0.45 : monster.speed;
    monster.x += speed * dt;
    monster.slow = Math.max(0, monster.slow - dt);
  }

  const escaped = state.monsters.filter((m) => m.x >= goalX);
  escaped.forEach((m) => {
    state.castle.hp -= m.damage;
    state.log(`${m.type} frappe le chateau (-${m.damage} PV).`);
  });

  state.monsters = state.monsters.filter((m) => m.x < goalX);
}

function cleanupDeadMonsters() {
  let gainedGold = 0;
  let kills = 0;
  const survivors = [];
  for (const monster of state.monsters) {
    if (monster.hp <= 0) {
      kills += 1;
      gainedGold += Math.round(monster.reward * state.mods.goldMult);
      continue;
    }
    survivors.push(monster);
  }
  if (kills > 0) {
    state.stats.kills += kills;
    state.stats.gold += gainedGold;
  }
  state.monsters = survivors;
}

function maybeSpawnWave(dt) {
  const wave = state.stats.wave;
  const spawnRate = Math.max(0.4, 1.2 - wave * 0.05);
  state.lastSpawn += dt;
  if (state.lastSpawn >= spawnRate) {
    const count = 1 + Math.floor(wave / 4);
    for (let i = 0; i < count; i += 1) spawnMonster();
    state.lastSpawn = 0;
  }

  if (state.time > state.nextWaveAt) {
    state.stats.wave += 1;
    state.nextWaveAt += 24;
    state.log(`Vague ${state.stats.wave}: les monstres se renforcent.`);

    if (state.stats.wave >= state.relicPromptWave) {
      openRelicChoice();
      state.relicPromptWave += 3;
    }
  }
}

function openRelicChoice() {
  state.paused = true;
  relicModal.classList.remove("hidden");
  relicChoices.innerHTML = "";
  const choices = [...RELIC_POOL].sort(() => Math.random() - 0.5).slice(0, 3);

  choices.forEach((relic) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<strong>${relic.title}</strong><p>${relic.text}</p>`;
    const btn = document.createElement("button");
    btn.textContent = "Choisir";
    btn.addEventListener("click", () => {
      relic.apply(state);
      state.log(`Relique activee: ${relic.title}.`);
      relicModal.classList.add("hidden");
      state.paused = false;
      updateHUD();
    });
    card.append(btn);
    relicChoices.append(card);
  });
}

function drawCastle() {
  ctx.fillStyle = "#6f8790";
  ctx.fillRect(canvas.width - 72, 150, 46, 160);
  ctx.fillStyle = "#576e76";
  ctx.fillRect(canvas.width - 82, 172, 10, 132);
  ctx.fillRect(canvas.width - 26, 172, 10, 132);
  ctx.fillStyle = "#b8cfd3";
  ctx.fillRect(canvas.width - 67, 140, 12, 12);
  ctx.fillRect(canvas.width - 43, 140, 12, 12);
}

function drawTowers() {
  const positions = [
    { key: "watchtower", x: canvas.width - 214, y: 130, color: "#e5c791" },
    { key: "machineGun", x: canvas.width - 274, y: 204, color: "#9ad2dc" },
    { key: "arcane", x: canvas.width - 214, y: 282, color: "#f3a76a" }
  ];

  positions.forEach((pos) => {
    const tower = state.towers[pos.key];
    if (tower.level <= 0) return;
    ctx.fillStyle = pos.color;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 13 + tower.level * 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawMonsters() {
  state.monsters.forEach((m) => {
    ctx.fillStyle = m.color;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(10, 20, 20, 0.7)";
    ctx.fillRect(m.x - 15, m.y - 18, 30, 4);
    ctx.fillStyle = "#97db76";
    ctx.fillRect(m.x - 15, m.y - 18, 30 * Math.max(0, m.hp / m.maxHp), 4);
  });
}

function drawShots(dt) {
  state.shots.forEach((shot) => {
    shot.life -= dt;
    ctx.strokeStyle = shot.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(shot.x1, shot.y1);
    ctx.lineTo(shot.x2, shot.y2);
    ctx.stroke();
  });
  state.shots = state.shots.filter((shot) => shot.life > 0);
}

function updateHUD() {
  waveEl.textContent = String(state.stats.wave);
  goldEl.textContent = String(state.stats.gold);
  gemsEl.textContent = String(state.stats.gems);
  killsEl.textContent = String(state.stats.kills);
  castleEl.textContent = `${Math.max(0, Math.round(state.castle.hp))} / ${state.castle.maxHp}`;
}

function frame(dt) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawCastle();
  drawTowers();

  if (state.running && !state.paused && !state.gameOver) {
    state.time += dt;
    maybeSpawnWave(dt);

    shootFromTower("watchtower", canvas.width - 214, 130, dt);
    shootFromTower("machineGun", canvas.width - 274, 204, dt);
    shootFromTower("arcane", canvas.width - 214, 282, dt);
    applyAbility(dt);

    updateMonsters(dt);
    cleanupDeadMonsters();

    if (state.castle.hp <= 0) {
      state.castle.hp = 0;
      state.gameOver = true;
      state.running = false;
      state.log("Le chateau est tombe. Run terminee.");
    }
  }

  drawMonsters();
  drawShots(dt);
  updateHUD();
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  frame(dt);
  requestAnimationFrame(loop);
}

function payGold(amount, action, label) {
  if (state.stats.gold < amount) {
    state.log(`Or insuffisant pour ${label}.`);
    return;
  }
  state.stats.gold -= amount;
  action();
  state.log(`${label} achete pour ${amount} or.`);
  renderUpgrades();
  updateHUD();
}

function renderClassList() {
  classList.innerHTML = "";
  CLASS_DEFS.forEach((classDef) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<strong>${classDef.name}</strong><p>${classDef.desc}</p>`;
    const button = document.createElement("button");
    button.textContent = state.selectedClass.id === classDef.id ? "Selectionnee" : "Choisir";
    button.disabled = state.selectedClass.id === classDef.id;
    button.addEventListener("click", () => {
      state.selectedClass = classDef;
      state.abilityCd = classDef.ability.cooldown * 0.5;
      state.log(`Classe active: ${classDef.name} (${classDef.ability.name}).`);
      renderClassList();
    });
    card.append(button);
    classList.append(card);
  });
}

function renderUpgrades() {
  upgradeList.innerHTML = "";
  upgrades.forEach((upg) => {
    const card = document.createElement("div");
    card.className = "card";
    let level = "";
    if (upg.id === "wall") {
      level = `Niveau remparts: ${Math.max(0, Math.floor((state.castle.maxHp - 180) / 20))}`;
    } else {
      level = `Niveau: ${state.towers[upg.id].level}`;
    }
    const cost = getUpgradeCost(upg.id);
    card.innerHTML = `<strong>${upg.name}</strong><p>${upg.description}<br />${level}</p>`;
    const btn = document.createElement("button");
    btn.textContent = `Acheter (${cost} or)`;
    btn.addEventListener("click", () => payGold(cost, upg.action, upg.name));
    card.append(btn);
    upgradeList.append(card);
  });
}

function simulatePurchase(pack) {
  const loading = document.createElement("div");
  loading.className = "log-entry";
  loading.textContent = `Tentative de paiement ${pack.price} pour ${pack.title}...`;
  logWrap.prepend(loading);

  setTimeout(() => {
    const success = Math.random() > 0.15;
    if (success) {
      state.stats.gems += pack.gems;
      state.log(`Paiement simule valide: +${pack.gems} gemmes.`);
      updateHUD();
      return;
    }
    state.log("Paiement simule refuse (banque fictive). Reessaie.");
  }, 900 + Math.random() * 700);
}

function renderShop() {
  shopList.innerHTML = "";
  SHOP_PACKS.forEach((pack) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<strong>${pack.title}</strong><p>${pack.gems} gemmes - ${pack.price}</p>`;
    const btn = document.createElement("button");
    btn.textContent = "Simuler achat";
    btn.addEventListener("click", () => simulatePurchase(pack));
    card.append(btn);
    shopList.append(card);
  });
}

function resetGame(full = false) {
  state.running = false;
  state.paused = false;
  state.gameOver = false;
  state.time = 0;
  state.lastSpawn = 0;
  state.nextWaveAt = 24;
  state.relicPromptWave = 3;
  state.abilityCd = 6;
  state.monsters = [];
  state.shots = [];
  state.stats = { wave: 1, gold: 70, gems: full ? 0 : state.stats.gems, kills: 0 };
  state.castle = { hp: 180, maxHp: 180 };
  state.towers = {
    watchtower: { level: 1, baseDamage: 14, cooldown: 0, baseRate: 1.4, baseRange: 210 },
    machineGun: { level: 0, baseDamage: 6, cooldown: 0, baseRate: 0.28, baseRange: 175 },
    arcane: { level: 0, baseDamage: 22, cooldown: 0, baseRate: 3.6, baseRange: 160 }
  };
  state.mods = {
    watchtowerRangeMult: 1,
    machineRateMult: 1,
    goldMult: 1,
    arcaneDamageMult: 1
  };
  relicModal.classList.add("hidden");
  renderUpgrades();
  updateHUD();
  state.log("Nouvelle run prete.");
}

document.querySelector("#startBtn").addEventListener("click", () => {
  if (state.gameOver) resetGame();
  state.running = true;
  state.paused = false;
  state.log("La defense commence.");
});

document.querySelector("#pauseBtn").addEventListener("click", () => {
  if (!state.running) return;
  state.paused = !state.paused;
  state.log(state.paused ? "Jeu en pause." : "Jeu repris.");
});

document.querySelector("#resetBtn").addEventListener("click", () => {
  resetGame(true);
});

document.querySelector("#convertGemsBtn").addEventListener("click", () => {
  if (state.stats.gems < 10) {
    state.log("Pas assez de gemmes pour conversion.");
    return;
  }
  state.stats.gems -= 10;
  state.stats.gold += 25;
  state.log("10 gemmes converties en 25 or.");
  updateHUD();
});

renderClassList();
renderUpgrades();
renderShop();
resetGame();
updateHUD();
requestAnimationFrame(loop);
