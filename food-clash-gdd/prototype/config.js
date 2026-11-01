/* =========================================================
 * FOOD CLASH: MOLD INVASION – PROJECT 20261 · CẤU HÌNH THEO GDD v2.1
 * Chuẩn hóa theo Tournament Standard (Level 11) trên https://www.noff.gg/clash-royale/cards
 * Quy đổi: 1 Tile (Clash Royale) = 100 đơn vị (đv) trên bản đồ Project 20261.
 * File Excel quản lý: ../Card_Stats_Food_Clash.xlsx
 * ========================================================= */
const CONFIG = {
  // ---- Bản đồ (GDD 2.1) ----
  WORLD_W: 7000,          // Tổng độ dài quan sát (camera bounds)
  VIEW_W: 2800,           // Bề rộng khung nhìn camera (đv)
  CELL: 100,              // Kích thước 1 ô lưới (= 1 tile Clash Royale)
  MAIN_X: [1000, 6000],   // Tâm Nhà chính [Đồ Ăn, Nấm Mốc] → cách nhau 5000
  SPICE_OFFSET: 800,      // Nhà chính ↔ Trụ bậc thềm
  REAR_OFFSET: 300,       // Lùi sau tâm Nhà chính = giới hạn thả phép (vùng chơi 5600)
  SPAWN_OFFSET: 250,      // Cổng xuất quân: trước tâm Nhà chính 250 đv (x = 1250 / 5750)
  MULTI_SPACING: 45,      // Khoảng cách giữa các đơn vị của thẻ nhiều con

  // ---- Công trình (GDD 2.3 – chuẩn King Tower & Princess Tower Lv11) ----
  MAIN:  { size: 400, range: 1100, hp: 4824, dmg: 109, rate: 1.0, height: 380 },
  SPICE: { size: 200, range: 1200, hp: 3052, dmg: 109, rate: 0.8, height: 300 },

  // ---- Năng lượng & bộ bài (GDD 2.4 / 2.5) ----
  ENERGY_MAX: 10,
  ENERGY_START: 5,
  ENERGY_REGEN_SEC: 2.4,  // 1 năng lượng / 2.4 giây (x2 ở 60s cuối & Sudden Death)
  DECK_SIZE: 6,
  HAND_SIZE: 3,

  // ---- Thời gian (GDD 2.5) ----
  MATCH_SEC: 120,
  DOUBLE_LAST_SEC: 60,
  SUDDEN_SEC: 60,

  // ---- Khác ----
  UNIT_HIT_PAD: 45,       // bán kính thân lính khi tính tầm đánh
  FLY_HEIGHT: 170,        // độ cao bay (chỉ để hiển thị)
  DROP_TIME: 0.5,         // thời gian animation nhảy ra từ Nhà chính
};

/* Độ hiếm & Level khởi điểm chuẩn Clash Royale (noff.gg):
 * Common: Lv1 -> Lv16 · Rare: Lv3 -> Lv16 · Epic: Lv6 -> Lv16
 * Công thức: stat(Lv) = Math.round(stat_Lv11 * Math.pow(1.1, Lv - 11)) */
const RARITY_INFO = {
  Common: { label: 'Common (Thường)', minLv: 1, maxLv: 16, color: '#8bd3ff' },
  Rare:   { label: 'Rare (Hiếm)',     minLv: 3, maxLv: 16, color: '#ffa94d' },
  Epic:   { label: 'Epic (Sử thi)',   minLv: 6, maxLv: 16, color: '#d07fff' },
};

function scaleStat(baseLv11, lv) {
  if (!baseLv11) return 0;
  return Math.round(baseLv11 * Math.pow(1.1, lv - 11));
}

function getCardAtLevel(card, requestedLv) {
  const rInfo = RARITY_INFO[card.rarity] || RARITY_INFO.Common;
  const lv = Math.max(rInfo.minLv, Math.min(16, requestedLv || 11));
  return Object.assign({}, card, {
    level: lv,
    minLv: rInfo.minLv,
    hp: scaleStat(card.hp, lv),
    dmg: scaleStat(card.dmg, lv),
    towerDmg: scaleStat(card.towerDmg, lv),
    deathDmg: scaleStat(card.deathDmg, lv),
    deathTowerDmg: scaleStat(card.deathTowerDmg, lv),
  });
}

/* ---------------- PHE ĐỒ ĂN (8 nhân vật theo Propose + 2 phép, chuẩn noff.gg Lv11) ----------------
 * ref: Thẻ tham chiếu trên noff.gg/clash-royale/cards (Level 11)
 * count: số đơn vị mỗi thẻ · buildingsOnly: chỉ đánh công trình
 * death*: nổ khi chết · splash: bán kính sát thương lan của đạn */
const CARDS = {
  valentino: {
    id: 'valentino', name: 'El Valentino', ref: 'Giant', emoji: '🍫', type: 'troop', rarity: 'Rare', cost: 5, count: 1,
    hp: 3968, dmg: 253, rate: 1.5, range: 120, speed: 70, flying: false, hitsAir: false, size: 155,
    buildingsOnly: true, desc: 'Ref: Giant (Rare Lv3–16) – Máu lớn, tầm 120, CHỈ đánh công trình.',
  },
  tom: {
    id: 'tom', name: 'Sir Tom', ref: 'Wall Breakers / Bomb', emoji: '🍅', type: 'troop', rarity: 'Epic', cost: 2, count: 1,
    hp: 560, dmg: 84, rate: 1.5, range: 80, speed: 95, flying: false, hitsAir: false, size: 100,
    deathDmg: 530, deathTowerDmg: 265, deathR: 250, desc: 'Ref: Wall Breakers / Bomb (Epic Lv6–16) – Chết nổ AoE R=250.',
  },
  lemonade: {
    id: 'lemonade', name: 'Lemo-nade', ref: 'Wizard', emoji: '🍋', type: 'troop', rarity: 'Rare', cost: 5, count: 1,
    hp: 755, dmg: 281, rate: 1.4, range: 550, speed: 95, flying: false, hitsAir: true, size: 115,
    splash: 150, projectile: '🍋', desc: 'Ref: Wizard (Rare Lv3–16) – Tầm 550 (5.5t), ném chanh nổ lan R=150.',
  },
  milky: {
    id: 'milky', name: 'Milky Cartoneey', ref: 'Musketeer', emoji: '🥛', type: 'troop', rarity: 'Rare', cost: 4, count: 1,
    hp: 721, dmg: 217, rate: 1.0, range: 600, speed: 95, flying: false, hitsAir: true, size: 105,
    projectile: '⚪', desc: 'Ref: Musketeer (Rare Lv3–16) – Xạ thủ tầm 600 (6t), diệt lính bay.',
  },
  avocador: {
    id: 'avocador', name: 'Avocador', ref: 'Mini P.E.K.K.A', emoji: '🥑', type: 'troop', rarity: 'Rare', cost: 4, count: 1,
    hp: 1390, dmg: 755, rate: 1.6, range: 80, speed: 135, flying: false, hitsAir: false, size: 125,
    desc: 'Ref: Mini P.E.K.K.A (Rare Lv3–16) – Đấm đơn cực mạnh, khắc chế Tanker.',
  },
  boba: {
    id: 'boba', name: 'Boba Bob', ref: 'Dart Goblin', emoji: '🧋', type: 'troop', rarity: 'Rare', cost: 3, count: 1,
    hp: 261, dmg: 151, rate: 0.8, range: 650, speed: 175, flying: false, hitsAir: true, size: 105,
    projectile: '⚫', desc: 'Ref: Dart Goblin (Rare Lv3–16) – Tầm xa nhất 650 (6.5t), bắn 0.8s.',
  },
  chips: {
    id: 'chips', name: 'Chips', ref: 'Skeletons', emoji: '🥔', type: 'troop', rarity: 'Common', cost: 1, count: 3,
    hp: 81, dmg: 81, rate: 1.1, range: 80, speed: 135, flying: false, hitsAir: false, size: 70,
    desc: 'Ref: Skeletons (Common Lv1–16) – 1💧 gọi 3 miếng bim bim xoay bài.',
  },
  donuts: {
    id: 'donuts', name: 'Dough Donuts', ref: 'Minions (x2)', emoji: '🍩', type: 'troop', rarity: 'Common', cost: 3, count: 2,
    hp: 280, dmg: 135, rate: 1.1, range: 200, speed: 135, flying: true, hitsAir: true, size: 92,
    desc: 'Ref: Minions (Common Lv1–16) – Xuất 2 Donut bay tầm ngắn 200 (2t).',
  },
  salt: {
    id: 'salt', name: 'Muối Hột', ref: 'Arrows', emoji: '🧂', type: 'spell', rarity: 'Common', cost: 3,
    radius: 350, dmg: 366, towerDmg: 111, delay: 0.55, fx: '#ffffff',
    desc: 'Ref: Arrows (Common Lv1–16) – Bán kính 350 (3.5t), dọn bầy & lính bay.',
  },
  vinegar: {
    id: 'vinegar', name: 'Bom Giấm', ref: 'Fireball', emoji: '🍾', type: 'spell', rarity: 'Rare', cost: 4,
    radius: 250, dmg: 689, towerDmg: 207, delay: 0.6, fx: '#ffd84a',
    desc: 'Ref: Fireball (Rare Lv3–16) – Bán kính 250 (2.5t), sát thương diện rộng lớn.',
  },

  /* ---------------- ĐẾ CHẾ NẤM MỐC (Bot PvE – chuẩn Lv11) ---------------- */
  spores: {
    id: 'spores', name: 'Bào Tử Lúc Nhúc', ref: 'Goblins/Skeletons', emoji: '🦠', type: 'troop', rarity: 'Common', cost: 2, count: 3,
    hp: 160, dmg: 105, rate: 1.1, range: 80, speed: 175, flying: false, hitsAir: false, size: 72,
  },
  brute: {
    id: 'brute', name: 'Mốc Khổng Lồ', ref: 'Giant', blob: { color: '#5f8f3a', spot: '#a6c96a' }, type: 'troop', rarity: 'Rare', cost: 5, count: 1,
    hp: 3968, dmg: 253, rate: 1.5, range: 120, speed: 70, flying: false, hitsAir: false, size: 170,
    buildingsOnly: true,
  },
  spitter: {
    id: 'spitter', name: 'Nấm Phun Bào Tử', ref: 'Musketeer', emoji: '🍄', type: 'troop', rarity: 'Rare', cost: 4, count: 1,
    hp: 721, dmg: 217, rate: 1.0, range: 600, speed: 95, flying: false, hitsAir: true, size: 105,
    projectile: '🟢',
  },
  flies: {
    id: 'flies', name: 'Ruồi Giấm', ref: 'Minions', emoji: '🪰', type: 'troop', rarity: 'Common', cost: 3, count: 3,
    hp: 230, dmg: 107, rate: 1.2, range: 200, speed: 135, flying: true, hitsAir: true, size: 80,
  },
  slime: {
    id: 'slime', name: 'Nhớt Mốc', ref: 'Knight', blob: { color: '#7a5f8f', spot: '#b9a0cf' }, type: 'troop', rarity: 'Common', cost: 3, count: 1,
    hp: 1766, dmg: 202, rate: 1.2, range: 100, speed: 95, flying: false, hitsAir: false, size: 125,
  },
  cloud: {
    id: 'cloud', name: 'Mây Bào Tử', ref: 'Arrows', emoji: '☁️', type: 'spell', rarity: 'Common', cost: 3,
    radius: 350, dmg: 366, towerDmg: 111, delay: 0.55, fx: '#8fd14f',
  },
};

const FOOD_COLLECTION = ['valentino', 'tom', 'lemonade', 'milky', 'avocador', 'boba', 'chips', 'donuts', 'salt', 'vinegar'];
const DEFAULT_DECK = ['valentino', 'tom', 'lemonade', 'milky', 'donuts', 'salt'];
const MOLD_DECK = ['spores', 'brute', 'spitter', 'flies', 'slime', 'cloud'];

/* Chương PvE (GDD 2.7) */
const CHAPTERS = {
  1: { label: 'Chương 1 · Quầy Bếp Ẩm',       short: 'C1',   think: 1.6,  push: 10, clusterMin: 4, towerHp: 1 },
  2: { label: 'Chương 2 · Tủ Bánh Mì Quá Hạn', short: 'C2',   think: 1.0,  push: 8,  clusterMin: 3, towerHp: 1 },
  3: { label: 'Chương 3 · Hầm Ẩm – Vua Mốc',   short: 'BOSS', think: 0.55, push: 7,  clusterMin: 2, towerHp: 1.25 },
};

/* Tên & biểu tượng công trình mỗi phe */
const TOWER_SKIN = [
  { main: { name: 'Tủ Lạnh Tổng', icon: '❄️' }, spice: { name: 'Ấm Siêu Tốc', icon: '♨️' } },
  { main: { name: 'Ổ Mốc Thùng Rác', icon: '🗑️' }, spice: { name: 'Nấm Bào Tử', icon: '🍄' } },
];
