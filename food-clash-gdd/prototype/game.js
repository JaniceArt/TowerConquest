'use strict';
/* =========================================================
 * FOOD CLASH: MOLD INVASION – PROJECT 20261 · GAME LOGIC (v2.0)
 * Team 0 = Phe Đồ Ăn Tươi (trái, đi +x, xuất quân từ cổng Nhà chính x=1250)
 * Team 1 = Đế chế Nấm Mốc (phải, đi -x, xuất quân từ cổng Ổ Mốc x=5750)
 * Thẻ nhân vật: xuất phát từ cổng Nhà chính.
 * Thẻ phép: giữ nguyên kéo thả chọn ô 100 đv trên sân + nhấp nháy đơn vị trúng.
 * ========================================================= */
(() => {
  const C = CONFIG;
  const $ = (s) => document.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const dirOf = (t) => (t === 0 ? 1 : -1);
  const TEAM_COL = ['#39b54a', '#9b59ff'];

  // ---------- DOM ----------
  const canvas = $('#game'), ctx = canvas.getContext('2d');
  const mini = $('#minimap'), mctx = mini.getContext('2d');
  const handEl = $('#hand'), nextEl = $('#nextCard');
  const energyFill = $('#energyFill'), energyPreview = $('#energyPreview'), energyNum = $('#energyNum');
  const ghostEl = $('#dragGhost'), bannerEl = $('#banner'), stageEl = $('#stage');

  let W = 0, H = 0, DPR = 1, scale = 1, groundY = 0, bandH = 20, MW = 0, MH = 0;
  let S = null, drag = null, paused = false, speed = 1, debug = true, chapterId = 2, matchCardLv = 11;
  let selectedDeck = DEFAULT_DECK.slice();
  let handKey = '';

  function resize() {
    DPR = window.devicePixelRatio || 1;
    const r = stageEl.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    scale = W / C.VIEW_W;
    bandH = Math.max(14, 50 * scale);
    groundY = H - bandH - Math.max(26, H * 0.1);
    const m = mini.getBoundingClientRect();
    MW = m.width; MH = m.height;
    mini.width = MW * DPR; mini.height = MH * DPR;
    mctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);

  // =========================================================
  //  STATE
  // =========================================================
  function makeTower(team, kind, x, hpMult = 1) {
    const b = kind === 'main' ? C.MAIN : C.SPICE;
    const hp = Math.round(scaleStat(b.hp, matchCardLv) * hpMult);
    const dmg = scaleStat(b.dmg, matchCardLv);
    return {
      team, kind, x, size: b.size, range: b.range,
      hp, maxHp: hp, dmg, rate: b.rate, height: b.height,
      cd: 0, awake: kind === 'spice', alive: true, hitFlash: 0,
    };
  }
  function makeDeck(list) {
    const q = shuffle(list.slice(0, C.DECK_SIZE));
    return { hand: q.slice(0, C.HAND_SIZE), queue: q.slice(C.HAND_SIZE) };
  }

  function newGame(chId) {
    chapterId = chId;
    const ch = CHAPTERS[chId];
    S = {
      bot: ch, chapterId: chId, time: C.MATCH_SEC, sudden: false, over: false, doubleAnnounced: false,
      units: [], projectiles: [], effects: [], floats: [], spells: [], towers: [],
      crowns: [0, 0], energy: [C.ENERGY_START, C.ENERGY_START],
      decks: [makeDeck(selectedDeck), makeDeck(MOLD_DECK)],
      camX: 2200 - C.VIEW_W / 2, camTarget: null, camHold: 0, botTimer: 1.8,
      stats: [{ played: 0, dmg: 0 }, { played: 0, dmg: 0 }], nextId: 1, elapsed: 0,
    };
    for (let t = 0; t < 2; t++) {
      const mx = C.MAIN_X[t];
      const mult = t === 1 ? (ch.towerHp || 1) : 1;
      S.towers.push(makeTower(t, 'main', mx, mult), makeTower(t, 'spice', mx + dirOf(t) * C.SPICE_OFFSET, mult));
    }
    handKey = '';
    drag = null; paused = false; stageEl.classList.remove('paused');
    $('#botLevel').textContent = ch.short;
    $('#menu').classList.add('hidden');
    $('#result').classList.add('hidden');
    resize();
    banner(`⚔️ ${ch.label}`);
  }

  // =========================================================
  //  MAP / ZONE HELPERS (GDD 2.1)
  // =========================================================
  const tower = (team, kind) => S.towers.find((t) => t.team === team && t.kind === kind);
  const playBounds = () => [C.MAIN_X[0] - C.REAR_OFFSET, C.MAIN_X[1] + C.REAR_OFFSET]; // 700 → 6300
  const spawnXOf = (team) => C.MAIN_X[team] + dirOf(team) * C.SPAWN_OFFSET;            // 1250 / 5750
  // Vùng trung hòa 1000 đv = khoảng nằm ngoài tầm bắn của cả 2 Trụ bậc thềm (3000 → 4000)
  const neutralZone = () => [C.MAIN_X[0] + C.SPICE_OFFSET + C.SPICE.range, C.MAIN_X[1] - C.SPICE_OFFSET - C.SPICE.range];

  const cellOf = (x) => Math.floor(x / C.CELL);
  const cellCenter = (i) => i * C.CELL + C.CELL / 2;

  function canCastSpell(cell) {
    const x0 = cell * C.CELL, x1 = x0 + C.CELL;
    const [a, b] = playBounds();
    return x0 >= a && x1 <= b;
  }

  // =========================================================
  //  CARDS / DEPLOY (GDD 2.2, 2.4)
  // =========================================================
  function cycleHand(deck, handIdx) {
    const used = deck.hand[handIdx];
    deck.hand[handIdx] = deck.queue.shift();
    deck.queue.push(used);
  }

  // Thẻ nhân vật: xuất phát từ Cổng Nhà chính
  function deployTroop(team, handIdx) {
    const deck = S.decks[team];
    const baseCard = CARDS[deck.hand[handIdx]];
    if (!baseCard || baseCard.type !== 'troop' || S.energy[team] < baseCard.cost) return false;
    const card = getCardAtLevel(baseCard, matchCardLv);
    S.energy[team] -= card.cost;
    const d = dirOf(team);
    const gateX = spawnXOf(team);
    const count = card.count || 1;
    for (let k = 0; k < count; k++) {
      const targetX = gateX - d * k * C.MULTI_SPACING;
      S.units.push({
        id: S.nextId++, team, card,
        x: targetX, spawnFromX: C.MAIN_X[team], spawnToX: targetX,
        hp: card.hp, maxHp: card.hp, cd: 0.25 + k * 0.06,
        drop: C.DROP_TIME + k * 0.08, dropTotal: C.DROP_TIME + k * 0.08,
        target: null, lunge: 0, hitFlash: 0, moving: false,
      });
    }
    cycleHand(deck, handIdx);
    S.stats[team].played++;
    addFloat(gateX, 270, `-${card.cost}💧`, team === 0 ? '#8affef' : '#d5b8ff', 22);
    return true;
  }

  // Thẻ phép: thả vào ô lưới 100 đv trên sân
  function castSpell(team, handIdx, cell) {
    const deck = S.decks[team];
    const baseCard = CARDS[deck.hand[handIdx]];
    if (!baseCard || baseCard.type !== 'spell' || S.energy[team] < baseCard.cost || !canCastSpell(cell)) return false;
    const card = getCardAtLevel(baseCard, matchCardLv);
    S.energy[team] -= card.cost;
    const x = cellCenter(cell);
    S.spells.push({ team, card, x, t: card.delay, total: card.delay });
    cycleHand(deck, handIdx);
    S.stats[team].played++;
    addFloat(x, 260, `-${card.cost}💧`, team === 0 ? '#8affef' : '#d5b8ff', 22);
    return true;
  }

  // =========================================================
  //  COMBAT (GDD 2.3)
  // =========================================================
  const unitH = (u) => (u.card.flying ? C.FLY_HEIGHT : 0) + u.card.size * 0.5;
  const targetH = (t) => (t.kind ? t.height * 0.7 : unitH(t));
  const isAlive = (t) => (t.kind ? t.alive : t.hp > 0);
  const canHit = (card, target) => !target.card.flying || card.hitsAir;

  function updateUnits(dt) {
    for (const u of S.units) {
      if (u.hp <= 0) continue;
      u.hitFlash = Math.max(0, u.hitFlash - dt);
      u.lunge = Math.max(0, u.lunge - dt);
      if (u.drop > 0) {
        u.drop -= dt;
        const p = clamp(1 - Math.max(0, u.drop) / u.dropTotal, 0, 1);
        u.x = u.spawnFromX + (u.spawnToX - u.spawnFromX) * p;
        if (u.drop <= 0) {
          u.x = u.spawnToX;
          S.effects.push({ type: 'ring', x: u.x, h: u.card.flying ? C.FLY_HEIGHT : 0, t: 0, total: 0.35, color: TEAM_COL[u.team] });
        }
        continue;
      }
      const c = u.card, d = dirOf(u.team);
      // 1) Nếu KHÔNG phải đơn vị chỉ đánh công trình → tìm lính địch gần nhất trong tầm
      let target = null, bd = Infinity;
      if (!c.buildingsOnly) {
        for (const e of S.units) {
          if (e.team === u.team || e.hp <= 0 || e.drop > 0 || !canHit(c, e)) continue;
          const dist = Math.abs(e.x - u.x);
          if (dist <= c.range + C.UNIT_HIT_PAD && dist < bd) { bd = dist; target = e; }
        }
      }
      // 2) Công trình: bắt buộc Trụ bậc thềm trước (cả lính bay), sau đó mới Nhà chính
      u.moving = false;
      if (!target) {
        const es = tower(1 - u.team, 'spice');
        const tt = es.alive ? es : tower(1 - u.team, 'main');
        if (tt.alive && Math.abs(tt.x - u.x) <= c.range + tt.size / 2) target = tt;
        else if (tt.alive) { u.x = clamp(u.x + d * c.speed * dt, 0, C.WORLD_W); u.moving = true; }
      }
      u.target = target;
      u.cd = Math.max(0, u.cd - dt);
      if (target && u.cd <= 0) { u.cd = c.rate; attack(u, target); }
    }
  }

  function updateTowers(dt) {
    for (const t of S.towers) {
      t.hitFlash = Math.max(0, t.hitFlash - dt);
      if (!t.alive || !t.awake) continue; // Nhà chính ngủ thì không bắn
      t.cd = Math.max(0, t.cd - dt);
      let best = null, bd = Infinity;
      for (const u of S.units) {
        if (u.team === t.team || u.hp <= 0 || u.drop > 0) continue;
        const dist = Math.abs(u.x - t.x); // tầm bắn theo trục hoành
        if (dist <= t.range && dist < bd) { bd = dist; best = u; }
      }
      if (best && t.cd <= 0) { t.cd = t.rate; attack(t, best); }
    }
  }

  function attack(src, target) {
    const isTower = !!src.kind;
    const ranged = isTower || src.card.range > 150;
    const dmg = isTower ? src.dmg : src.card.dmg;
    if (ranged) {
      S.projectiles.push({
        team: src.team, x: src.x, h: isTower ? src.height * 0.9 : unitH(src), target, dmg,
        splash: isTower ? 0 : (src.card.splash || 0),
        hitsAir: isTower ? true : !!src.card.hitsAir,
        speed: isTower ? 1800 : 1450, emoji: isTower ? null : src.card.projectile,
      });
    } else {
      src.lunge = 0.15;
      dealDamage(target, dmg, src.team);
    }
  }

  function updateProjectiles(dt) {
    for (const p of S.projectiles) {
      if (!isAlive(p.target)) { p.dead = true; continue; }
      const dx = p.target.x - p.x, dh = targetH(p.target) - p.h;
      const dist = Math.hypot(dx, dh), step = p.speed * dt;
      if (dist <= step + 10) {
        p.dead = true;
        if (p.splash > 0) {
          // Lemo-nade: gây sát thương lan quanh điểm chạm
          const cx = p.target.x;
          for (const u of S.units) {
            if (u.team === p.team || u.hp <= 0 || u.drop > 0) continue;
            if (u.card.flying && !p.hitsAir) continue;
            if (Math.abs(u.x - cx) <= p.splash) dealDamage(u, p.dmg, p.team);
          }
          if (p.target.kind && p.target.alive) dealDamage(p.target, p.dmg, p.team);
          S.effects.push({ type: 'boom', x: cx, h: 0, t: 0, total: 0.35, r: p.splash, color: '#ffe066' });
        } else {
          dealDamage(p.target, p.dmg, p.team);
        }
      } else {
        p.x += (dx / dist) * step; p.h += (dh / dist) * step;
      }
    }
    S.projectiles = S.projectiles.filter((p) => !p.dead);
  }

  function updateSpells(dt) {
    for (const s of S.spells) {
      s.t -= dt;
      if (s.t > 0) continue;
      s.done = true;
      const c = s.card;
      for (const u of S.units) if (u.team !== s.team && u.hp > 0 && Math.abs(u.x - s.x) <= c.radius) dealDamage(u, c.dmg, s.team);
      // Phép được đánh thẳng vào Nhà chính → đánh thức Nhà chính
      for (const t of S.towers) if (t.team !== s.team && t.alive && Math.abs(t.x - s.x) <= c.radius + t.size / 2) dealDamage(t, c.towerDmg, s.team);
      S.effects.push({ type: 'boom', x: s.x, h: 0, t: 0, total: 0.5, r: c.radius, color: c.fx || '#ffd84a' });
    }
    S.spells = S.spells.filter((s) => !s.done);
  }

  function triggerDeathEffect(u) {
    const c = u.card;
    if (c.deathDmg) {
      // Sir Tom: phát nổ AoE khi tử vong
      for (const e of S.units) {
        if (e.team === u.team || e.hp <= 0) continue;
        if (Math.abs(e.x - u.x) <= c.deathR) dealDamage(e, c.deathDmg, u.team);
      }
      for (const t of S.towers) {
        if (t.team === u.team || !t.alive) continue;
        if (Math.abs(t.x - u.x) <= c.deathR + t.size / 2) dealDamage(t, c.deathTowerDmg || c.deathDmg, u.team);
      }
      S.effects.push({ type: 'boom', x: u.x, h: 0, t: 0, total: 0.48, r: c.deathR, color: '#ff3b30' });
      addFloat(u.x, unitH(u) + 55, '💥 BÙM!', '#ff6b57', 19);
    } else {
      S.effects.push({ type: 'puff', x: u.x, h: unitH(u), t: 0, total: 0.5 });
    }
  }

  function dealDamage(target, dmg, srcTeam) {
    if (S.over) return;
    if (target.kind) {
      if (!target.alive) return;
      target.hp -= dmg; target.hitFlash = 0.15;
      if (target.kind === 'main' && !target.awake) {
        target.awake = true;
        addFloat(target.x, target.height + 80, '⏰ Nhà chính thức tỉnh!', '#ffd36e', 18);
      }
      if (target.hp <= 0) destroyTower(target, srcTeam);
    } else {
      if (target.hp <= 0) return;
      target.hp -= dmg; target.hitFlash = 0.12;
      if (target.hp <= 0) triggerDeathEffect(target);
    }
    S.stats[srcTeam].dmg += dmg;
    addFloat(target.x + (Math.random() - 0.5) * 60, targetH(target) + 40, `-${Math.round(dmg)}`, '#fff', 15);
  }

  function destroyTower(t, by) {
    t.alive = false; t.hp = 0;
    S.effects.push({ type: 'boom', x: t.x, h: 0, t: 0, total: 0.8, r: t.size, color: '#ffa53b' });
    S.effects.push({ type: 'smoke', x: t.x, h: 0, t: 0, total: 2.5 });
    if (t.kind === 'spice') {
      S.crowns[by] += 1;
      tower(t.team, 'main').awake = true;
      banner(by === 0 ? '👑 Đã diệt Nấm Bào Tử! Tiến về Ổ Mốc!' : '💥 Ấm Siêu Tốc bị phá hủy!', by === 0 ? 'blue' : 'red');
      if (S.sudden) endGame(by, 'Sudden Death – phá công trình trước');
    } else {
      S.crowns[by] = 3;
      endGame(by, by === 0 ? 'Bạn đã tiêu diệt Ổ Mốc Thùng Rác!' : 'Tủ Lạnh Tổng đã bị nấm mốc xâm chiếm.');
    }
  }

  // =========================================================
  //  BOT AI KỊCH BẢN – ĐẾ CHẾ NẤM MỐC (GDD 2.7)
  // =========================================================
  function updateBot(dt) {
    S.botTimer -= dt;
    if (S.botTimer > 0) return;
    S.botTimer = S.bot.think * (0.8 + Math.random() * 0.4);
    const B = 1, deck = S.decks[B];
    const can = (id) => {
      const i = deck.hand.indexOf(id);
      return i >= 0 && CARDS[id].cost <= S.energy[B] ? i : -1;
    };
    const threats = S.units.filter((u) => u.team === 0 && u.hp > 0 && u.x > neutralZone()[0]).sort((a, b) => b.x - a.x);

    if (threats.length) {
      // 1) Dùng phép Mây Bào Tử khi người chơi tụ bầy đông
      for (const th of threats) {
        const group = threats.filter((o) => Math.abs(o.x - th.x) <= 260);
        if (group.length >= S.bot.clusterMin) {
          const i = can('cloud');
          if (i >= 0 && castSpell(B, i, cellOf(th.x))) return;
        }
      }
      // 2) Xuất quân từ cổng Ổ Mốc để khắc chế
      const front = threats[0];
      const prefs = front.card.flying ? ['spitter', 'flies']
        : front.card.buildingsOnly ? ['slime', 'spores', 'flies', 'spitter']
        : ['slime', 'spitter', 'spores', 'flies', 'brute'];
      for (const id of prefs) {
        const i = can(id);
        if (i >= 0 && deployTroop(B, i)) return;
      }
      return;
    }
    // 3) Hỗ trợ đợt đẩy đang có
    const mine = S.units.filter((u) => u.team === B && u.hp > 0);
    if (mine.length && S.energy[B] >= 6) {
      for (const id of ['spitter', 'flies', 'spores', 'slime']) {
        const i = can(id);
        if (i >= 0 && deployTroop(B, i)) return;
      }
    }
    // 4) Chủ động đẩy quân khi đủ ngưỡng năng lượng
    if (S.energy[B] >= S.bot.push) {
      for (const id of ['brute', 'slime', 'spitter', 'flies', 'spores']) {
        const i = can(id);
        if (i >= 0 && deployTroop(B, i)) return;
      }
    }
  }

  // =========================================================
  //  CAMERA (GDD 2.6)
  // =========================================================
  function updateCamera(dt) {
    if (drag && drag.isSpell && drag.overCanvasY) {
      // Hỗ trợ kéo phép sát mép màn hình → tự cuộn camera
      const r = canvas.getBoundingClientRect(), lx = drag.px - r.left, edge = r.width * 0.1;
      if (lx < edge) S.camX -= 1800 * dt * (1 - Math.max(0, lx) / edge);
      else if (lx > r.width - edge) S.camX += 1800 * dt * (1 - Math.max(0, r.width - lx) / edge);
    } else if (S.camHold > 0) {
      S.camHold -= dt;
    } else {
      const live = S.units.filter((u) => u.hp > 0 && u.drop <= 0);
      const fighting = live.filter((u) => u.target);
      const pts = fighting.length ? fighting : live;
      if (pts.length) S.camTarget = pts.reduce((s, u) => s + u.x, 0) / pts.length - C.VIEW_W / 2;
      if (S.camTarget != null) S.camX += (S.camTarget - S.camX) * Math.min(1, dt * 1.6);
    }
    S.camX = clamp(S.camX, 0, C.WORLD_W - C.VIEW_W);
  }

  // =========================================================
  //  MAIN UPDATE / TIMER (GDD 2.5)
  // =========================================================
  const isDouble = () => S.sudden || S.time <= C.DOUBLE_LAST_SEC;

  function update(dt) {
    S.elapsed += dt;
    S.time -= dt;
    if (!S.doubleAnnounced && isDouble() && !S.sudden) { S.doubleAnnounced = true; banner('💧 x2 NĂNG LƯỢNG TƯƠI!'); }
    if (S.time <= 0) {
      if (!S.sudden) {
        if (S.crowns[0] !== S.crowns[1]) return endGame(S.crowns[0] > S.crowns[1] ? 0 : 1, 'Hết giờ – thắng theo số công trình phá được');
        S.sudden = true; S.time = C.SUDDEN_SEC;
        banner('⚡ SUDDEN DEATH!', 'red');
      } else {
        return endGame(-1, 'Hết Sudden Death – giữ nguyên tỉ số');
      }
    }
    const mult = isDouble() ? 2 : 1;
    for (let t = 0; t < 2; t++) S.energy[t] = Math.min(C.ENERGY_MAX, S.energy[t] + (dt * mult) / C.ENERGY_REGEN_SEC);

    updateUnits(dt);
    updateTowers(dt);
    updateProjectiles(dt);
    updateSpells(dt);
    S.units = S.units.filter((u) => u.hp > 0);
    if (S.over) return;
    updateBot(dt);
    updateCamera(dt);

    for (const e of S.effects) e.t += dt;
    S.effects = S.effects.filter((e) => e.t < e.total);
    for (const f of S.floats) f.t += dt;
    S.floats = S.floats.filter((f) => f.t < f.total);
  }

  function endGame(winner, reason) {
    if (S.over) return;
    S.over = true;
    drag = null; ghostEl.style.display = 'none';
    banner(winner === 0 ? '🏆 ĐẨY LÙI NẤM MỐC!' : winner === 1 ? '💀 THẤT BẠI' : '🤝 HÒA', winner === 1 ? 'red' : '');
    setTimeout(() => showResult(winner, reason), 1300);
  }

  function showResult(winner, reason) {
    const t = $('#resTitle');
    t.textContent = winner === 0 ? 'CHIẾN THẮNG!' : winner === 1 ? 'THẤT BẠI' : 'HÒA';
    t.className = winner === 0 ? 'win' : winner === 1 ? 'lose' : 'draw';
    let stars = 0;
    if (winner === 0) {
      stars = 1;
      if (tower(0, 'spice').alive) stars = 2;
      if (!tower(1, 'main').alive && !S.sudden) stars = 3;
    }
    $('#resStars').textContent = winner === 0 ? '⭐'.repeat(stars) + '☆'.repeat(3 - stars) : '';
    $('#resReason').textContent = reason;
    $('#resScore').innerHTML = `<span class="p">${S.crowns[0]}</span> 👑 <span class="b">${S.crowns[1]}</span>`;
    const mm = Math.floor(S.elapsed / 60), ss = String(Math.floor(S.elapsed % 60)).padStart(2, '0');
    $('#resStats').innerHTML = `
      <div><b>Thời gian</b>${mm}:${ss}</div>
      <div><b>Thẻ đã đánh (Bạn / Mốc)</b>${S.stats[0].played} / ${S.stats[1].played}</div>
      <div><b>Sát thương (Bạn / Mốc)</b>${Math.round(S.stats[0].dmg)} / ${Math.round(S.stats[1].dmg)}</div>`;
    $('#result').classList.remove('hidden');
  }

  // =========================================================
  //  FX HELPERS
  // =========================================================
  function addFloat(x, h, text, color, size) { S.floats.push({ x, h, text, color, size, t: 0, total: 1.0 }); }
  function banner(text, cls = '') {
    bannerEl.textContent = text;
    bannerEl.className = '';
    void bannerEl.offsetWidth;
    bannerEl.className = 'show ' + cls;
  }
  function energyFloat(cost) {
    const r = $('#energyBar').getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'energy-float';
    el.textContent = `-${cost}`;
    el.style.left = r.left + (S.energy[0] / C.ENERGY_MAX) * r.width + 'px';
    el.style.top = r.top - 26 + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  // =========================================================
  //  INPUT: THẢ QUÂN TỪ NHÀ CHÍNH & KÉO PHÉP (GDD 2.2)
  // =========================================================
  function updateDragTarget() {
    const r = canvas.getBoundingClientRect();
    const lx = drag.px - r.left, ly = drag.py - r.top;
    drag.overCanvasY = ly >= 0 && ly <= r.height;
    drag.overCanvas = drag.overCanvasY && lx >= 0 && lx <= r.width;
    const card = CARDS[drag.cardId];
    drag.isSpell = card.type === 'spell';
    drag.affordable = S.energy[0] >= card.cost;
    drag.moved = Math.hypot(drag.px - drag.startX, drag.py - drag.startY) > 12;

    if (drag.isSpell) {
      drag.cell = cellOf(S.camX + clamp(lx, 0, r.width) / scale);
      drag.placeable = canCastSpell(drag.cell);
      drag.valid = drag.overCanvas && drag.placeable && drag.affordable;
      ghostEl.style.display = drag.overCanvas ? 'none' : 'block';
    } else {
      // Thẻ nhân vật: xuất tại Cổng Nhà chính. Chạm nhanh HOẶC kéo lên sân rồi thả đều được.
      drag.cell = cellOf(spawnXOf(0));
      drag.placeable = true;
      drag.valid = drag.affordable && (!drag.moved || drag.overCanvas);
      ghostEl.style.display = drag.moved && !drag.overCanvas ? 'block' : 'none';
    }
    ghostEl.style.left = drag.px + 'px';
    ghostEl.style.top = drag.py + 'px';
  }

  handEl.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('.card');
    if (!el || !S || S.over || paused) return;
    e.preventDefault();
    const idx = +el.dataset.idx;
    const cardId = S.decks[0].hand[idx];
    drag = { handIdx: idx, cardId, px: e.clientX, py: e.clientY, startX: e.clientX, startY: e.clientY };
    ghostEl.textContent = CARDS[cardId].emoji;
    updateDragTarget();
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    drag.px = e.clientX; drag.py = e.clientY;
    updateDragTarget();
  });
  window.addEventListener('pointerup', (e) => {
    if (!drag) return;
    drag.px = e.clientX; drag.py = e.clientY;
    updateDragTarget();
    const card = CARDS[drag.cardId];
    if (drag.valid) {
      const ok = drag.isSpell ? castSpell(0, drag.handIdx, drag.cell) : deployTroop(0, drag.handIdx);
      if (ok) energyFloat(card.cost);
    }
    drag = null;
    ghostEl.style.display = 'none';
  });
  window.addEventListener('pointercancel', () => { drag = null; ghostEl.style.display = 'none'; });

  // Minimap: bấm để dời camera
  mini.addEventListener('pointerdown', (e) => {
    if (!S) return;
    const r = mini.getBoundingClientRect();
    S.camX = clamp(((e.clientX - r.left) / r.width) * C.WORLD_W - C.VIEW_W / 2, 0, C.WORLD_W - C.VIEW_W);
    S.camHold = 3;
  });

  // =========================================================
  //  RENDER
  // =========================================================
  const sx = (x) => (x - S.camX) * scale;
  const sy = (h) => groundY - h * scale;
  const now = () => performance.now() / 1000;

  function render() {
    ctx.clearRect(0, 0, W, H);
    drawBackground();
    if (debug) drawDebug();
    for (const t of S.towers) drawTower(t);
    drawSpawnGates();
    // lính nhỏ vẽ đè lên lính lớn; lính bay vẽ sau cùng
    const sorted = S.units.slice().sort((a, b) => (a.card.flying - b.card.flying) || (b.card.size - a.card.size));
    for (const u of sorted) drawUnit(u);
    for (const s of S.spells) drawSpellInFlight(s);
    for (const p of S.projectiles) drawProjectile(p);
    for (const e of S.effects) drawEffect(e);
    if (drag) drawDragPreview();
    for (const f of S.floats) drawFloat(f);
  }

  function hills(par, color, base, amp, freq, phase) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    for (let px = 0; px <= W + 8; px += 8) {
      const wx = px / scale + S.camX * par;
      ctx.lineTo(px, base - Math.sin(wx * freq + phase) * amp - Math.sin(wx * freq * 2.7 + phase * 2) * amp * 0.35);
    }
    ctx.lineTo(W, groundY);
    ctx.closePath();
    ctx.fill();
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, groundY);
    g.addColorStop(0, '#132226'); g.addColorStop(0.55, '#2c3e35'); g.addColorStop(1, '#c99366');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, groundY);
    hills(0.15, '#22362d', groundY - H * 0.22, 24, 0.0022, 0);
    hills(0.35, '#192820', groundY - H * 0.12, 16, 0.0035, 2);
    // dải khăn trải bàn caro = lưới 100 đv
    const [pa, pb] = playBounds();
    const i0 = Math.floor(S.camX / C.CELL), i1 = Math.ceil((S.camX + C.VIEW_W) / C.CELL);
    for (let i = i0; i <= i1; i++) {
      const x = sx(i * C.CELL), w = C.CELL * scale + 0.6;
      const inMoldSide = i * C.CELL >= 4000;
      for (let r = 0; r < 2; r++) {
        ctx.fillStyle = (i + r) % 2 ? (inMoldSide ? '#6c4d7d' : '#3a9d5d') : (inMoldSide ? '#d8cbe0' : '#f7f1df');
        ctx.fillRect(x, groundY + (r * bandH) / 2, w, bandH / 2);
      }
    }
    // mặt bàn bếp gỗ
    const wg = ctx.createLinearGradient(0, groundY + bandH, 0, H);
    wg.addColorStop(0, '#5b3523'); wg.addColorStop(1, '#2c180f');
    ctx.fillStyle = wg; ctx.fillRect(0, groundY + bandH, W, H - groundY - bandH);
    ctx.fillStyle = 'rgba(15,6,25,0.6)';
    if (sx(pa) > 0) ctx.fillRect(0, groundY, sx(pa), bandH);
    if (sx(pb) < W) ctx.fillRect(sx(pb), groundY, W - sx(pb), bandH);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(0, groundY - 1, W, 2);
  }

  function dashedV(x, top, bottom, color) {
    ctx.save(); ctx.strokeStyle = color; ctx.setLineDash([6, 6]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(sx(x), top); ctx.lineTo(sx(x), bottom); ctx.stroke(); ctx.restore();
  }
  function label(text, x, y, color, align = 'center', size = 11) {
    ctx.font = `700 ${size}px 'Be Vietnam Pro', sans-serif`;
    ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.strokeText(text, x, y);
    ctx.fillStyle = color; ctx.fillText(text, x, y);
  }

  function drawSpawnGates() {
    for (let t = 0; t < 2; t++) {
      const gx = sx(spawnXOf(t));
      ctx.fillStyle = TEAM_COL[t];
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.ellipse(gx, groundY + 2, 22 * scale, 6 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawDebug() {
    const below = groundY + bandH;
    for (let x = 0; x <= C.WORLD_W; x += 500) {
      if (sx(x) < -40 || sx(x) > W + 40) continue;
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(sx(x), below, 1, 6);
      label(String(x), sx(x), below + 14, 'rgba(255,255,255,0.65)', 'center', 10);
    }
    // Vùng trung hòa = ngoài tầm bắn của cả 2 Trụ bậc thềm (3000 → 4000)
    const [na, nb] = neutralZone();
    ctx.fillStyle = 'rgba(255,230,120,0.10)';
    ctx.fillRect(sx(na), groundY - 40 * scale - 30, (nb - na) * scale, 30 + 40 * scale);
    dashedV(na, groundY - 260 * scale, below, 'rgba(255,230,120,0.45)');
    dashedV(nb, groundY - 260 * scale, below, 'rgba(255,230,120,0.45)');
    label(`Vùng ngoài tầm 2 trụ (${nb - na} đv: ${na}→${nb})`, sx((na + nb) / 2), groundY - 40 * scale - 38, '#ffe680', 'center', 10.5);
    // Giới hạn vùng chơi 5600
    const [pa, pb] = playBounds();
    dashedV(pa, groundY - 420 * scale, below, 'rgba(255,255,255,0.4)');
    dashedV(pb, groundY - 420 * scale, below, 'rgba(255,255,255,0.4)');
    // Cổng xuất quân
    for (let t = 0; t < 2; t++) {
      const gx = spawnXOf(t);
      label(`Cổng xuất (${gx})`, sx(gx), below + 28, TEAM_COL[t], 'center', 10);
    }
    // Tầm bắn công trình
    for (const t of S.towers) {
      if (!t.alive) continue;
      const d = dirOf(t.team), y = sy(t.height + 40);
      ctx.save();
      ctx.strokeStyle = TEAM_COL[t.team]; ctx.globalAlpha = t.awake ? 0.75 : 0.3; ctx.lineWidth = 2;
      if (!t.awake) ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.moveTo(sx(t.x), y); ctx.lineTo(sx(t.x + d * t.range), y);
      ctx.lineTo(sx(t.x + d * t.range), y + 8); ctx.stroke(); ctx.restore();
      label(`Tầm ${t.range}${t.awake ? '' : ' (ngủ)'}`, sx(t.x + (d * t.range) / 2), y - 8, TEAM_COL[t.team], 'center', 10);
    }
  }

  function drawDragPreview() {
    const card = CARDS[drag.cardId];
    const pulse = 0.5 + 0.5 * Math.sin(now() * 14);
    const top = groundY - 330 * scale;

    if (!drag.isSpell) {
      // Thẻ nhân vật: hiển thị bóng mờ nhấp nháy ngay tại Cổng xuất quân Nhà chính
      const gx = spawnXOf(0);
      const cell = cellOf(gx);
      const cx = cellCenter(cell);
      ctx.fillStyle = drag.affordable ? `rgba(94,240,140,${0.18 + 0.25 * pulse})` : `rgba(255,60,60,${0.18 + 0.2 * pulse})`;
      ctx.fillRect(sx(cx - C.CELL / 2), top, C.CELL * scale, groundY + bandH - top);
      ctx.strokeStyle = drag.affordable ? '#5ef08c' : '#ff4d4d'; ctx.lineWidth = 2;
      ctx.strokeRect(sx(cx - C.CELL / 2), groundY, C.CELL * scale, bandH);

      const count = card.count || 1;
      const size = card.size * scale, h = card.flying ? C.FLY_HEIGHT : 0;
      for (let k = 0; k < count; k++) {
        const ux = gx - k * C.MULTI_SPACING;
        ctx.save();
        ctx.globalAlpha = 0.4 + 0.35 * pulse; ctx.shadowColor = '#fff'; ctx.shadowBlur = 18;
        ctx.font = `${size}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(card.emoji, sx(ux), sy(h) - size / 2);
        ctx.restore();
      }
      label(drag.affordable ? `Thả để xuất quân tại Cổng (-${card.cost}💧)` : `Thiếu năng lượng (${card.cost}💧)`,
        sx(gx), top - 12, drag.affordable ? '#8affef' : '#ff6b6b', 'center', 12.5);
    } else if (drag.overCanvas) {
      // Thẻ phép: hiển thị vùng AoE + nhấp nháy các đơn vị địch chịu ảnh hưởng
      const cx = cellCenter(drag.cell);
      const r = card.radius * scale;
      ctx.fillStyle = drag.valid ? `rgba(255,210,80,${0.12 + 0.14 * pulse})` : `rgba(255,50,50,${0.12 + 0.1 * pulse})`;
      ctx.fillRect(sx(cx) - r, top, r * 2, groundY - top);
      ctx.beginPath(); ctx.ellipse(sx(cx), groundY, r, Math.max(8, r * 0.18), 0, 0, Math.PI * 2);
      ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

      for (const u of S.units) {
        if (u.team === 0 || Math.abs(u.x - cx) > card.radius) continue;
        ctx.strokeStyle = `rgba(255,255,255,${0.4 + 0.6 * pulse})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(sx(u.x), sy(unitH(u)), u.card.size * scale * 0.6, 0, Math.PI * 2); ctx.stroke();
      }
      for (const t of S.towers) {
        if (t.team === 0 || !t.alive || Math.abs(t.x - cx) > card.radius + t.size / 2) continue;
        ctx.strokeStyle = `rgba(255,255,255,${0.4 + 0.6 * pulse})`; ctx.lineWidth = 3;
        ctx.strokeRect(sx(t.x - t.size / 2) - 4, sy(t.height) - 4, t.size * scale + 8, t.height * scale + 8);
      }
      ctx.save(); ctx.globalAlpha = 0.65 + 0.3 * pulse;
      ctx.font = `${Math.max(28, 90 * scale)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(card.emoji, sx(cx), top + 10);
      ctx.restore();
      label(drag.affordable ? `${card.name} (-${card.cost}💧)` : `Thiếu năng lượng (${card.cost}💧)`,
        sx(cx), top - 12, drag.affordable ? '#ffe680' : '#ff6b6b', 'center', 13);
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function hpBar(cx, y, w, ratio, color) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; roundRect(cx - w / 2 - 1, y - 1, w + 2, 7, 3); ctx.fill();
    ctx.fillStyle = color; roundRect(cx - w / 2, y, Math.max(0, w * ratio), 5, 2); ctx.fill();
  }

  function drawTower(t) {
    const x = sx(t.x), w = t.size * scale, h = t.height * scale, col = TEAM_COL[t.team];
    if (x + w < -50 || x - w > W + 50) return;
    const skin = TOWER_SKIN[t.team][t.kind];
    if (!t.alive) {
      ctx.fillStyle = '#3d3330'; roundRect(x - w / 2, groundY - h * 0.18, w, h * 0.18, 6); ctx.fill();
      ctx.font = `${w * 0.35}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🪨', x, groundY - h * 0.2);
      return;
    }
    const bodyH = t.kind === 'main' ? h * 0.74 : h * 0.82, bodyTop = groundY - bodyH;
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    if (t.team === 0) {
      g.addColorStop(0, '#cde8dd'); g.addColorStop(0.5, '#f2fbf7'); g.addColorStop(1, '#a9cfc0');
    } else {
      g.addColorStop(0, '#4b3b57'); g.addColorStop(0.5, '#685278'); g.addColorStop(1, '#3b2d45');
    }
    ctx.fillStyle = g; roundRect(x - w / 2, bodyTop, w, bodyH, 10); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke();

    ctx.fillStyle = col;
    roundRect(x - w * 0.52, groundY - h, w * 1.04, h - bodyH + 6, 8); ctx.fill();
    ctx.font = `${w * (t.kind === 'main' ? 0.42 : 0.52)}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(skin.icon, x, bodyTop + bodyH * 0.52);

    if (t.kind === 'main' && !t.awake) {
      label('💤 Ngủ', x + w * 0.28, groundY - h - 6 + Math.sin(now() * 3) * 4, '#fff', 'center', 13);
    }
    if (t.hitFlash > 0) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; roundRect(x - w / 2, bodyTop, w, bodyH, 10); ctx.fill(); }
    const bw = Math.max(72, w);
    hpBar(x, groundY - h - 22, bw, t.hp / t.maxHp, col);
    label(`${skin.name} · ${Math.ceil(t.hp)}`, x, groundY - h - 32, '#fff', 'center', 10.5);
  }

  function drawMoldBlob(r, blob) {
    ctx.fillStyle = blob.color;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.48, Math.PI, 0);
    ctx.quadraticCurveTo(r * 0.52, r * 0.42, 0, r * 0.42);
    ctx.quadraticCurveTo(-r * 0.52, r * 0.42, -r * 0.48, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#23162b'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = blob.spot;
    ctx.beginPath(); ctx.arc(-r * 0.16, -r * 0.14, r * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.18, -r * 0.06, r * 0.07, 0, Math.PI * 2); ctx.fill();
    // mắt giận dữ
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-r * 0.14, 0.04 * r, r * 0.08, 0, Math.PI * 2);
    ctx.arc(r * 0.14, 0.04 * r, r * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#140b1c';
    ctx.beginPath(); ctx.arc(-r * 0.12, 0.05 * r, r * 0.04, 0, Math.PI * 2);
    ctx.arc(r * 0.16, 0.05 * r, r * 0.04, 0, Math.PI * 2); ctx.fill();
  }

  function drawUnit(u) {
    const c = u.card, d = dirOf(u.team), size = c.size * scale;
    let x = sx(u.x) + (u.lunge > 0 ? d * 10 : 0);
    if (x < -size || x > W + size) return;
    const jitter = (((u.id * 37) % 5) - 2) * 3;
    let base = sy(c.flying ? C.FLY_HEIGHT : 0) + jitter;
    if (c.flying) base += Math.sin(now() * 5 + u.id) * 5;
    let alpha = 1;
    if (u.drop > 0) {
      const p = 1 - u.drop / u.dropTotal;
      base -= Math.sin(p * Math.PI) * 140 - (1 - p) * 60;
      alpha = 0.45 + 0.55 * p;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(x, groundY + 3, size * 0.4, size * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = TEAM_COL[u.team]; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(x, groundY + 3, size * 0.42, size * 0.12, 0, 0, Math.PI * 2); ctx.stroke();

    const bob = u.moving ? Math.abs(Math.sin(now() * 10 + u.id)) * 4 : 0;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, base - size / 2 - bob);
    if (d < 0) ctx.scale(-1, 1);
    if (u.hitFlash > 0) ctx.filter = 'brightness(2.2)';
    if (c.blob) {
      drawMoldBlob(size, c.blob);
    } else {
      ctx.font = `${size}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(c.emoji, 0, 0);
    }
    ctx.restore();
    if (u.drop <= 0) hpBar(x, base - size - 8, Math.max(26, size * 0.7), u.hp / u.maxHp, TEAM_COL[u.team]);
  }

  function drawProjectile(p) {
    const x = sx(p.x), y = sy(p.h);
    if (p.emoji) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(now() * 10);
      ctx.font = `${Math.max(12, 34 * scale)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, 0, 0); ctx.restore();
    } else {
      ctx.fillStyle = TEAM_COL[p.team]; ctx.shadowColor = TEAM_COL[p.team]; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(x, y, Math.max(3, 12 * scale), 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function drawSpellInFlight(s) {
    const p = 1 - s.t / s.total, c = s.card, r = c.radius * scale, cx = sx(s.x);
    if (c.id === 'salt' || c.id === 'cloud') {
      const top = groundY - 340 * scale;
      ctx.font = `${Math.max(24, 78 * scale)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(c.emoji, cx, top);
      ctx.fillStyle = c.fx || '#fff';
      for (let k = 0; k < 20; k++) {
        const dx = (((k * 97) % 200) / 100 - 1) * r;
        const y = top + ((now() * 700 + k * 53) % (groundY - top));
        ctx.fillRect(cx + dx, y, 3, 8);
      }
    } else {
      const sx0 = sx(C.MAIN_X[s.team]);
      const x = sx0 + (cx - sx0) * p, y = groundY - Math.sin(p * Math.PI) * 220 - (1 - p) * 120;
      ctx.save(); ctx.translate(x, y); ctx.rotate(p * 8);
      ctx.font = `${Math.max(20, 60 * scale)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(c.emoji, 0, 0); ctx.restore();
    }
  }

  function drawEffect(e) {
    const p = e.t / e.total, x = sx(e.x);
    if (e.type === 'ring') {
      ctx.strokeStyle = e.color; ctx.globalAlpha = 1 - p; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(x, sy(e.h) + 2, (30 + 70 * p) * scale, (10 + 20 * p) * scale, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (e.type === 'boom') {
      const r = e.r * scale * (0.5 + 0.6 * p);
      const g = ctx.createRadialGradient(x, groundY, 2, x, groundY, r);
      g.addColorStop(0, `rgba(255,250,210,${1 - p})`); g.addColorStop(0.5, e.color); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 1 - p; ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(x, groundY, r, r * 0.55, 0, Math.PI, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (e.type === 'puff') {
      ctx.globalAlpha = 1 - p;
      ctx.font = `${Math.max(16, 60 * scale)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('💨', x, sy(e.h) - p * 30);
      ctx.globalAlpha = 1;
    } else if (e.type === 'smoke') {
      for (let k = 0; k < 4; k++) {
        const q = (p + k * 0.25) % 1;
        ctx.fillStyle = `rgba(90,90,90,${0.5 * (1 - q)})`;
        ctx.beginPath(); ctx.arc(x + Math.sin(k * 2 + q * 3) * 20, groundY - 40 - q * 140, 10 + q * 26, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function drawFloat(f) {
    const p = f.t / f.total;
    ctx.globalAlpha = 1 - p * p;
    label(f.text, sx(f.x), sy(f.h) - p * 40, f.color, 'center', f.size);
    ctx.globalAlpha = 1;
  }

  function drawMinimap() {
    const k = MW / C.WORLD_W, y0 = MH * 0.55;
    mctx.clearRect(0, 0, MW, MH);
    const [pa, pb] = playBounds();
    mctx.fillStyle = 'rgba(255,255,255,0.08)'; mctx.fillRect(pa * k, y0 - 2, (pb - pa) * k, 6);
    const [na, nb] = neutralZone();
    mctx.fillStyle = 'rgba(255,230,120,0.28)'; mctx.fillRect(na * k, y0 + 5, (nb - na) * k, 4);
    for (const t of S.towers) {
      const w = Math.max(4, t.size * k), hh = t.kind === 'main' ? 16 : 11;
      mctx.fillStyle = t.alive ? TEAM_COL[t.team] : '#555';
      mctx.fillRect(t.x * k - w / 2, y0 + 3 - hh, w, hh);
    }
    for (const u of S.units) {
      mctx.fillStyle = TEAM_COL[u.team];
      mctx.beginPath(); mctx.arc(u.x * k, u.card.flying ? y0 - 10 : y0, 2.5, 0, Math.PI * 2); mctx.fill();
    }
    mctx.strokeStyle = '#fff'; mctx.lineWidth = 1.5;
    mctx.strokeRect(S.camX * k, 2, C.VIEW_W * k, MH - 4);
  }

  // =========================================================
  //  HUD & DECK BUILDER
  // =========================================================
  const crownHTML = (n) => [0, 1, 2].map((i) => `<span class="${i < n ? '' : 'off'}">👑</span>`).join('');

  function cardTag(c) {
    if (c.type === 'spell') return `Kéo thả · AoE ${c.radius}`;
    if (c.buildingsOnly) return 'Chỉ đánh trụ';
    if (c.deathDmg) return `Cảm tử · AoE ${c.deathR}`;
    if (c.splash) return `AoE ${c.splash} · Bắn xa`;
    if (c.flying) return 'Lính bay';
    return c.range > 150 ? `Tầm xa ${c.range}` : 'Cận chiến';
  }

  function cardHTML(c, i, selected) {
    const badge = c.count > 1 ? `<div class="badge">x${c.count}</div>` : c.type === 'spell' ? `<div class="badge">PHÉP</div>` : '';
    return `<div class="card ${c.type === 'spell' ? 'spell' : ''} ${selected ? 'selected' : ''}" data-idx="${i}" title="${c.desc}">
      <div class="cost">${c.cost}</div>${badge}<div class="emoji">${c.emoji}</div>
      <div class="name">${c.name}</div><div class="tagline">${cardTag(c)}</div><div class="charge"></div></div>`;
  }

  function updateHUD() {
    const deck = S.decks[0];
    const key = deck.hand.join(',') + '|' + deck.queue[0] + '|' + (drag ? drag.handIdx : -1);
    if (key !== handKey) {
      handKey = key;
      handEl.innerHTML = deck.hand.map((id, i) => cardHTML(CARDS[id], i, drag && drag.handIdx === i)).join('');
      const n = CARDS[deck.queue[0]];
      nextEl.innerHTML = `<div class="card mini ${n.type === 'spell' ? 'spell' : ''}"><div class="cost">${n.cost}</div><div class="emoji">${n.emoji}</div></div>`;
    }
    handEl.querySelectorAll('.card').forEach((el) => {
      const c = CARDS[deck.hand[+el.dataset.idx]];
      el.classList.toggle('unaffordable', S.energy[0] < c.cost);
      el.querySelector('.charge').style.width = Math.min(100, (S.energy[0] / c.cost) * 100) + '%';
    });
    const e = S.energy[0];
    energyFill.style.width = (e / C.ENERGY_MAX) * 100 + '%';
    energyNum.textContent = Math.floor(e);
    if (drag) {
      const cost = CARDS[drag.cardId].cost;
      if (e >= cost) {
        energyPreview.className = 'ok';
        energyPreview.style.left = ((e - cost) / C.ENERGY_MAX) * 100 + '%';
        energyPreview.style.width = (cost / C.ENERGY_MAX) * 100 + '%';
      } else {
        energyPreview.className = 'bad';
        energyPreview.style.left = (e / C.ENERGY_MAX) * 100 + '%';
        energyPreview.style.width = ((cost - e) / C.ENERGY_MAX) * 100 + '%';
      }
    } else energyPreview.className = '';

    const tSec = Math.max(0, Math.ceil(S.time));
    const timer = $('#timer');
    timer.textContent = `${Math.floor(tSec / 60)}:${String(tSec % 60).padStart(2, '0')}`;
    timer.classList.toggle('sudden', S.sudden);
    const ph = $('#phase');
    ph.textContent = S.sudden ? 'SUDDEN DEATH · x2' : isDouble() ? 'x2 NĂNG LƯỢNG' : 'Năng lượng x1';
    ph.className = S.sudden ? 'sudden' : isDouble() ? 'double' : '';
    $('#crownP').innerHTML = crownHTML(S.crowns[0]);
    $('#crownB').innerHTML = crownHTML(S.crowns[1]);
    $('#botEnergy').textContent = debug ? `💧${S.energy[1].toFixed(1)}` : '';
  }

  function renderDeckBuilder() {
    const grid = $('#deckGrid');
    grid.innerHTML = FOOD_COLLECTION.map((id) => {
      const c = CARDS[id];
      const picked = selectedDeck.includes(id);
      return `<div class="deck-item ${picked ? 'picked' : ''}" data-id="${id}" title="${c.desc}">
        <span class="d-cost">${c.cost}💧</span>
        <span class="d-check">${picked ? '✓' : ''}</span>
        <div class="d-emoji">${c.emoji}</div>
        <div class="d-name">${c.name}</div>
        <div class="d-role">${cardTag(c)}</div>
      </div>`;
    }).join('');
    $('#deckCount').textContent = selectedDeck.length;
    const avg = selectedDeck.length
      ? (selectedDeck.reduce((s, id) => s + CARDS[id].cost, 0) / selectedDeck.length).toFixed(1)
      : '0.0';
    $('#avgCost').textContent = `💧 TB: ${avg}`;
    $('#btnStart').disabled = selectedDeck.length !== C.DECK_SIZE;
  }

  $('#deckGrid').addEventListener('click', (e) => {
    const item = e.target.closest('.deck-item');
    if (!item) return;
    const id = item.dataset.id;
    const idx = selectedDeck.indexOf(id);
    if (idx >= 0) selectedDeck.splice(idx, 1);
    else if (selectedDeck.length < C.DECK_SIZE) selectedDeck.push(id);
    renderDeckBuilder();
  });

  // =========================================================
  //  CONTROLS / MENU
  // =========================================================
  function setPaused(v) { if (!S || S.over) return; paused = v; stageEl.classList.toggle('paused', v); $('#btnPause').textContent = v ? '▶' : '⏸'; }
  $('#btnPause').onclick = () => setPaused(!paused);
  $('#btnSpeed').onclick = (e) => { speed = speed === 1 ? 2 : 1; e.target.textContent = 'x' + speed; };
  $('#btnDebug').onclick = (e) => { debug = !debug; e.target.classList.toggle('on', debug); };
  $('#btnRestart').onclick = () => { if (S) S.over = true; $('#menu').classList.remove('hidden'); };
  $('#btnStart').onclick = () => { if (selectedDeck.length === C.DECK_SIZE) newGame(chapterId); };
  $('#btnAgain').onclick = () => newGame(chapterId);
  $('#btnMenu').onclick = () => { $('#result').classList.add('hidden'); $('#menu').classList.remove('hidden'); };
  $('#levels').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    chapterId = +b.dataset.ch;
    document.querySelectorAll('#levels button').forEach((x) => x.classList.toggle('active', x === b));
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); setPaused(!paused); }
    if (e.key === 'd' || e.key === 'D') $('#btnDebug').click();
  });

  // Chọn cấp độ thẻ (Level 1 -> 16) và hiển thị bảng thông số tương ứng
  const lvSel = $('#cardLvSelect');
  if (lvSel) {
    lvSel.innerHTML = Array.from({ length: 16 }, (_, i) => {
      const lv = i + 1;
      return `<option value="${lv}" ${lv === 11 ? 'selected' : ''}>Level ${lv}${lv === 11 ? ' (Chuẩn Tournament)' : ''}</option>`;
    }).join('');
    lvSel.addEventListener('change', () => {
      matchCardLv = +lvSel.value;
      renderCardTable();
    });
  }

  function renderCardTable() {
    $('#cardTable').innerHTML = `<table><tr><th>Thẻ Đồ Ăn</th><th>Ref (noff.gg)</th><th>Độ hiếm</th><th>Lv</th><th>💧</th><th>SL</th><th>HP</th><th>Sát thương</th><th>Tầm / R</th><th>Tốc chạy</th></tr>${
      FOOD_COLLECTION.map((id) => {
        const c = getCardAtLevel(CARDS[id], matchCardLv);
        const rCol = (RARITY_INFO[c.rarity] || RARITY_INFO.Common).color;
        return c.type === 'troop'
          ? `<tr><td>${c.emoji} ${c.name}</td><td>${c.ref || ''}</td><td style="color:${rCol};font-weight:700">${c.rarity} (Lv${c.minLv}–16)</td><td><b>Lv${c.level}</b></td><td>${c.cost}</td><td>${c.count || 1}</td><td>${c.hp}</td><td>${c.dmg}/${c.rate}s${c.deathDmg ? ` (Nổ ${c.deathDmg})` : ''}</td><td>${c.range}</td><td>${c.speed}</td></tr>`
          : `<tr><td>${c.emoji} ${c.name}</td><td>${c.ref || ''}</td><td style="color:${rCol};font-weight:700">${c.rarity} (Lv${c.minLv}–16)</td><td><b>Lv${c.level}</b></td><td>${c.cost}</td><td>Phép</td><td>–</td><td>${c.dmg} (trụ ${c.towerDmg})</td><td>R ${c.radius}</td><td>–</td></tr>`;
      }).join('')}</table>`;
  }
  renderCardTable();

  renderDeckBuilder();

  // =========================================================
  //  LOOP
  // =========================================================
  let last = performance.now();
  function frame(t) {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    if (S) {
      if (!S.over && !paused) for (let i = 0; i < speed && !S.over; i++) update(dt);
      if (drag) updateDragTarget();
      render();
      drawMinimap();
      updateHUD();
    }
    requestAnimationFrame(frame);
  }

  newGame(2);
  S.over = true;
  $('#menu').classList.remove('hidden');
  requestAnimationFrame(frame);
})();
