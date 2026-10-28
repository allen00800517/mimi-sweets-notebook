export const SIZE = 8;
export const TYPES = 7;
let serial = 0;
export function piece(type, special = null) { return { id: ++serial, type, special }; }
export const at = (r, c) => r * SIZE + c;
export function adjacent(a, b) { return Math.abs(Math.floor(a / SIZE) - Math.floor(b / SIZE)) + Math.abs(a % SIZE - b % SIZE) === 1; }
// Frosted pieces (glaze, chestnut burr, gift box) never match and cannot be swapped until every frost layer breaks.
// Items (the summer mango) can be swapped but never match or get cleared; they leave by reaching the bottom row.
const same = (a, b) => a && b && !a.frost && !b.frost && !a.item && !b.item && a.special !== 'prism' && b.special !== 'prism' && a.type === b.type;
export const swappable = p => !!p && !p.frost;

export function findGroups(board) {
  const runs = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE;) {
    const start = c; while (c + 1 < SIZE && same(board[at(r, c)], board[at(r, c + 1)])) c++;
    if (c - start >= 2) runs.push({ cells: Array.from({ length: c - start + 1 }, (_, i) => at(r, start + i)), axis: 'h' });
    c++;
  }
  for (let c = 0; c < SIZE; c++) for (let r = 0; r < SIZE;) {
    const start = r; while (r + 1 < SIZE && same(board[at(r, c)], board[at(r + 1, c)])) r++;
    if (r - start >= 2) runs.push({ cells: Array.from({ length: r - start + 1 }, (_, i) => at(start + i, c)), axis: 'v' });
    r++;
  }
  const groups = [];
  for (const run of runs) {
    const overlaps = groups.filter(g => run.cells.some(i => g.cells.has(i)));
    const group = { cells: new Set(run.cells), runs: [run] };
    for (const g of overlaps) { for (const i of g.cells) group.cells.add(i); group.runs.push(...g.runs); groups.splice(groups.indexOf(g), 1); }
    groups.push(group);
  }
  return groups;
}

export function moves(board) {
  const found = [];
  for (let i = 0; i < board.length; i++) for (const j of [i % SIZE < SIZE - 1 ? i + 1 : -1, i + SIZE < board.length ? i + SIZE : -1]) {
    if (j < 0) continue;
    if (!swappable(board[i]) || !swappable(board[j])) continue;
    // A mango moves like any dessert: only when the swap makes a match (it never matches itself), and never with a prism.
    if ((board[i]?.item || board[j]?.item) && (board[i]?.special === 'prism' || board[j]?.special === 'prism')) continue;
    if (!board[i]?.item && !board[j]?.item && (board[i]?.special === 'prism' || board[j]?.special === 'prism' || (board[i]?.special && board[j]?.special))) { found.push([i, j]); continue; }
    const test = board.slice(); [test[i], test[j]] = [test[j], test[i]];
    if (findGroups(test).length) found.push([i, j]);
  }
  return found;
}

export function makeBoard(random = Math.random) {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const board = [];
    for (let i = 0; i < SIZE * SIZE; i++) {
      const choices = Array.from({ length: TYPES }, (_, t) => t).filter(t => !(i % SIZE >= 2 && board[i - 1].type === t && board[i - 2].type === t) && !(i >= SIZE * 2 && board[i - SIZE].type === t && board[i - SIZE * 2].type === t));
      board.push(piece(choices[Math.floor(random() * choices.length)]));
    }
    if (moves(board).length) return board;
  }
  throw new Error('Could not generate a playable board');
}

export function refill(board, random = Math.random) {
  const next = board.slice(), distances = new Map();
  for (let c = 0; c < SIZE; c++) {
    const remaining = [];
    for (let r = SIZE - 1; r >= 0; r--) if (board[at(r, c)]) remaining.push({ value: board[at(r, c)], row: r });
    let row = SIZE - 1;
    for (const item of remaining) { next[at(row, c)] = item.value; distances.set(item.value.id, row - item.row); row--; }
    for (let r = row; r >= 0; r--) { const p = piece(Math.floor(random() * TYPES)); next[at(r, c)] = p; distances.set(p.id, row + 1); }
  }
  return { board: next, distances };
}

export function clearPlan(board, groups, preferred = [], forced = []) {
  const remove = new Set(forced), creations = new Map();
  for (const g of groups) {
    for (const i of g.cells) remove.add(i);
    const longest = Math.max(...g.runs.map(r => r.cells.length));
    const axes = new Set(g.runs.map(r => r.axis));
    let special = longest >= 5 ? 'prism' : axes.size > 1 ? 'cross' : longest === 4 ? 'flame' : null;
    if (!special) continue;
    const choices = [...g.cells].filter(i => !board[i].special);
    // Cascades have no moved cell: a star belongs at the T/L junction, like Bejeweled3.
    const junctions = special === 'cross' ? choices.filter(i => g.runs.filter(r => r.cells.includes(i)).length > 1) : [];
    const index = preferred.find(i => choices.includes(i)) ?? junctions[0] ?? choices[Math.floor(choices.length / 2)];
    if (index !== undefined) creations.set(index, piece(board[index].type, special));
  }
  const triggered = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (const i of [...remove]) {
      const p = board[i];
      if (!p?.special || p.frost || triggered.has(i)) continue;
      triggered.add(i);
      const r = Math.floor(i / SIZE), c = i % SIZE;
      const targets = [];
      if (p.special === 'flame') for (let rr = Math.max(0, r - 1); rr <= Math.min(SIZE - 1, r + 1); rr++) for (let cc = Math.max(0, c - 1); cc <= Math.min(SIZE - 1, c + 1); cc++) targets.push(at(rr, cc));
      if (p.special === 'cross') for (let q = 0; q < SIZE; q++) targets.push(at(r, q), at(q, c));
      if (p.special === 'prism') for (let q = 0; q < board.length; q++) if (board[q]?.type === p.type) targets.push(q);
      for (const q of targets) if (!remove.has(q)) { remove.add(q); changed = true; }
    }
  }
  for (const i of [...remove]) if (board[i]?.item) remove.delete(i);
  // Frost: a frosted dessert hit by a special, a prism colour or a forced clear only loses its frost;
  // any cleared orthogonal neighbour cracks it too.
  const unfrost = new Set();
  for (const i of [...remove]) if (board[i]?.frost) { remove.delete(i); unfrost.add(i); }
  for (const i of remove) for (const j of [i - SIZE, i + SIZE, i % SIZE ? i - 1 : -1, i % SIZE < SIZE - 1 ? i + 1 : -1])
    if (j >= 0 && j < board.length && board[j]?.frost && !remove.has(j)) unfrost.add(j);
  // An existing special effect takes precedence over a new creation at its cell.
  for (const i of triggered) creations.delete(i);
  for (const i of creations.keys()) remove.delete(i);
  return { remove, creations, triggered, unfrost };
}

export function swapPlan(board, a, b) {
  if (!adjacent(a, b) || !swappable(board[a]) || !swappable(board[b])) return null;
  if ((board[a].item || board[b].item) && (board[a].special === 'prism' || board[b].special === 'prism')) return null;
  const next = board.slice(); [next[a], next[b]] = [next[b], next[a]];
  const pa = next[a], pb = next[b];
  if (pa.special === 'prism' || pb.special === 'prism') {
    const forced = [];
    const both = pa.special === 'prism' && pb.special === 'prism';
    const target = pa.special === 'prism' ? pb.type : pa.type;
    for (let i = 0; i < next.length; i++) if (both || next[i].type === target || i === a || i === b) forced.push(i);
    // A swapped prism clears the partner's colour, not its stored colour.
    const prepared = next.map((p, i) => (i === a || i === b) && p.special === 'prism' ? { ...p, special: null } : p);
    // Rainbow orb × petal burst / star: every plain dessert of the partner's kind turns into that special
    // first (frosted ones stay as they are), then all of them go off together.
    const partner = pa.special === 'prism' ? pb : pa;
    const transform = !both && (partner.special === 'flame' || partner.special === 'cross')
      ? { special: partner.special, cells: forced.filter(i => i !== a && i !== b && next[i].type === target && !next[i].special && !next[i].frost && !next[i].item) } : null;
    // Groups come from the unstripped board: a prism never matches by its stored colour.
    return { board: prepared, groups: findGroups(next), forced, preferred: [b, a], prism: true, transform };
  }
  const groups = findGroups(next);
  if (!groups.length && !(pa.special && pb.special && !pa.item && !pb.item)) return null; // a mango swap must make a match too
  return { board: next, groups, forced: pa.special && pb.special ? [a, b] : [], preferred: [b, a], prism: false };
}

export function reshuffle(board, random = Math.random) {
  for (let attempt = 0; attempt < 300; attempt++) {
    const shuffled = board.slice(), free = board.flatMap((p, i) => p?.frost || p?.item ? [] : [i]);
    for (let k = free.length - 1; k > 0; k--) { const m = Math.floor(random() * (k + 1)); [shuffled[free[k]], shuffled[free[m]]] = [shuffled[free[m]], shuffled[free[k]]]; }
    if (!findGroups(shuffled).length && moves(shuffled).length) return shuffled;
  }
  return makeBoard(random);
}
