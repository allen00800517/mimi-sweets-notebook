// 無限靈感筆記: endless desserts. Each one gets a name (季節修飾 + 口味 + 主體) that decides its board:
// the 主體 and typed flavors are goals, flavors with a gimmick bring that mechanic. Difficulty rises
// slowly with the dessert's number in the run (n = 0, 1, 2 …): more to collect, more goal types, the
// season's mechanics at fuller strength, and from the 8th dessert other seasons' mechanics mix in.
// From the 11th dessert each one also has a move limit (moveLimit below); running out means making that
// dessert again, the run's score so far is kept.
// Pure module (no DOM) so scripts/infinite_sim.mjs can measure it.
import { INFINITE } from './content.js';

// Layouts reused from the hand-tuned notebook levels, light → heavy.
const POOLS = {
  buds: [[27, 28, 35, 36], [26, 29, 34, 37], [19, 20, 27, 28, 35, 36], [18, 21, 26, 29, 34, 37]],
  dust: [[43, 44], [42, 43, 44, 45], [26, 27, 28, 29, 34, 35, 36, 37], [19, 20, 26, 27, 28, 29, 34, 35, 36, 37, 43, 44]],
  frost: [[18, 21, 42, 45], [18, 21, 26, 29, 34, 37], [17, 22, 49, 54], [9, 14, 25, 30, 33, 38, 49, 54]],
  burr: [[18, 21], [18, 21, 42, 45], [11, 12, 51, 52], [10, 13, 26, 29, 34, 37]],
  gift: [[11], [27, 36], [11, 52]],
  mango: [{ at: [27], total: 1 }, { at: [26, 29], total: 2 }, { at: [25, 30], total: 3 }],
  leaves: [{ at: [27, 28, 35, 36], every: 4, goal: 4, cap: 6 }, { at: [19, 20, 43, 44], every: 3, goal: 6, cap: 7 }, { at: [27, 28, 35, 36], every: 3, goal: 8, cap: 8 }]
};
// Each season's own mechanics (first = the one it opens with).
const SEASON_GIMMICKS = [['buds'], ['dust', 'mango'], ['burr', 'leaves'], ['frost', 'dust', 'gift']];
const cellsOf = (kind, v) => kind === 'mango' || kind === 'leaves' ? v.at : v;

export function makeDessert(n, season, rand = Math.random) {
  const pickOne = list => list[Math.floor(rand() * list.length)];
  const tier = n < 2 ? 0 : n < 5 ? 1 : n < 10 ? 2 : 3;
  // Name: one flavor at first, sometimes two once the run gets going.
  const flavors = INFINITE.flavors.filter(f => f.seasons.includes(season));
  const flavor = [pickOne(flavors)];
  if (n >= 6 && rand() < .4) { const f2 = pickOne(flavors.filter(f => f !== flavor[0] && (!f.gimmick || !flavor[0].gimmick))); if (f2) flavor.push(f2); }
  let baseType = Math.floor(rand() * 7);
  if (flavor.some(f => f.type === baseType)) baseType = (baseType + 1 + Math.floor(rand() * 6)) % 7;
  const name = pickOne(INFINITE.mods[season]) + flavor.map(f => f.name).join('') + pickOne(INFINITE.bases[baseType]);

  // Goals: the 主體, typed flavors, then random fill.
  const want = n < 3 ? 2 : n < 9 ? 3 : 4;
  const types = [baseType];
  for (const f of flavor) if (f.type !== undefined && !types.includes(f.type)) types.push(f.type);
  while (types.length < want) { const t = Math.floor(rand() * 7); if (!types.includes(t)) types.push(t); }
  const total = Math.min(14 + Math.round(n * 2.6), 72);
  const goals = {}; for (const t of types) goals[t] = Math.max(5, Math.round(total / types.length));

  // Mechanics: flavor gimmicks first, then the season's own, then (later) another season's.
  const kinds = [];
  for (const f of flavor) if (f.gimmick && !kinds.includes(f.gimmick)) kinds.push(f.gimmick);
  const own = SEASON_GIMMICKS[season].filter(k => !kinds.includes(k));
  if (!kinds.length) kinds.push(own.shift());
  if (n >= 4 && own.length && rand() < .7) kinds.push(own.shift());
  const others = [0, 1, 2, 3].filter(s => s !== season).flatMap(s => SEASON_GIMMICKS[s]).filter(k => !kinds.includes(k));
  const extra = n >= 20 ? 2 : n >= 8 ? 1 : 0;
  for (let i = 0; i < extra && others.length; i++) kinds.push(others.splice(Math.floor(rand() * others.length), 1)[0]);

  const level = { id: 'inf-' + n, inf: true, season, name, goals, stars: null };
  const taken = new Set();
  for (const kind of kinds) {
    const pool = POOLS[kind]; let placed = false;
    // Heaviest layout this tier allows that doesn't overlap what's already placed.
    for (let k = Math.max(0, Math.min(kinds.length > 2 ? tier - 1 : tier, pool.length - 1)); k >= 0 && !placed; k--) {
      const v = pool[k], cells = cellsOf(kind, v);
      if (cells.some(c => taken.has(c))) continue;
      cells.forEach(c => taken.add(c)); level[kind] = v; placed = true;
    }
  }
  if (n >= 5 && (n >= 12 || rand() < .5)) level.bloom = n >= 18 ? 2 : 1;
  level.intro = fill(pickOne(INFINITE.intro), name);
  level.par = par(level);
  level.limit = moveLimit(level, n);
  return level;
}

// Rough move count for a steady player (fitted to the greedy bot, scripts/infinite_sim.mjs); moves
// under par earn the speed bonus.
export function par(L) {
  const units = Object.values(L.goals).reduce((a, b) => a + b, 0);
  let p = 7 + units / 3.3 + (L.bloom || 0) * 2;
  p += (L.frost?.length || 0) * .25 + (L.burr?.length || 0) * .5 + (L.dust?.length || 0) * .2 + (L.buds?.length || 0) * .3;
  p += (L.mango?.total || 0) * 1.5 + (L.leaves?.goal || 0) * .6;
  return Math.round(p);
}

// Move limit from the 11th dessert (n >= 10), 0 = none. Roomy at first and slowly tighter: par × 1.45 at
// the 11th, down to par × 1.1 from the 41st; mangos depend on luck, so each brings 3 extra moves.
// Measured with the greedy bot (scripts/infinite_sim.mjs): it finishes about 88–93 % of desserts in time
// at first and about 80 % later, with a median of about 15 moves to spare. (Common match-3 practice: a
// limit a steady player beats with some room, a retry that costs little, and pressure that builds slowly.)
export const LIMIT_FROM = 10;
export function moveLimit(L, n) {
  if (n < LIMIT_FROM) return 0;
  const m = Math.max(1.1, 1.45 - (n - LIMIT_FROM) * .0117);
  return Math.ceil(L.par * m + (L.mango?.total || 0) * 3);
}

export const fill = (lines, name) => lines.map(([who, text, face]) => [who, text.replace('{name}', name), face]);

// Score for one finished dessert: the points made on the board, a completion bonus that grows along
// the run, and a bonus for every move under par.
export function dessertScore(level, n, points, moves) {
  const finish = 400 + n * 40, speed = Math.max(0, level.par - moves) * 50;
  return { points, finish, speed, total: points + finish + speed };
}

// Next season: never the same twice in a row.
export function nextSeason(prev, rand = Math.random) {
  const options = [0, 1, 2, 3].filter(s => s !== prev);
  return options[Math.floor(rand() * options.length)];
}
