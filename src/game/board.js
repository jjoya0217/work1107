// 게임판 규칙: 어떤 보석이 맞았는지, 움직일 수 있는 수가 있는지 계산합니다.
// 화면을 그리지 않는 "순수한 계산"만 모았습니다.
import { N, key, rc } from './constants.js';

export const newGem = (type, r, c) => ({ type, special: null, x: c, y: r, s: 1, a: 1 });

// 새 판을 만들 때 (r, c)에 t를 놓으면 바로 맞아 버리는지
export function makesMatch(board, row, r, c, t) {
  return (c >= 2 && row[c - 1].type === t && row[c - 2].type === t) ||
    (r >= 2 && board[r - 1][c].type === t && board[r - 2][c].type === t) ||
    (r >= 1 && c >= 1 && row[c - 1].type === t && board[r - 1][c].type === t && board[r - 1][c - 1].type === t);
}

// 맞은 보석 무리 찾기: 한 줄 3개 이상, 2x2 네모
export function findGroups(board) {
  const runs = [];
  for (let r = 0; r < N; r++) {
    let c = 0;
    while (c < N) {
      const g = board[r][c];
      if (!g || g.type < 0) { c++; continue; }
      let e = c + 1; while (e < N && board[r][e] && board[r][e].type === g.type) e++;
      if (e - c >= 3) { const cells = []; for (let k = c; k < e; k++) cells.push(key(r, k)); runs.push({ dir: 'h', cells }); }
      c = e;
    }
  }
  for (let c = 0; c < N; c++) {
    let r = 0;
    while (r < N) {
      const g = board[r][c];
      if (!g || g.type < 0) { r++; continue; }
      let e = r + 1; while (e < N && board[e][c] && board[e][c].type === g.type) e++;
      if (e - r >= 3) { const cells = []; for (let k = r; k < e; k++) cells.push(key(k, c)); runs.push({ dir: 'v', cells }); }
      r = e;
    }
  }
  for (let r = 0; r < N - 1; r++) for (let c = 0; c < N - 1; c++) {
    const g = board[r][c];
    if (!g || g.type < 0) continue;
    const t = g.type, b = board[r][c + 1], d = board[r + 1][c], e = board[r + 1][c + 1];
    if (b && d && e && b.type === t && d.type === t && e.type === t)
      runs.push({ dir: 'sq', cells: [key(r, c), key(r, c + 1), key(r + 1, c), key(r + 1, c + 1)] });
  }
  // 칸을 같이 쓰는 줄끼리 하나의 무리로 합치기 (ㄱ, ㅗ 모양 등)
  const groups = [];
  for (const run of runs) {
    const hit = groups.filter((g) => run.cells.some((k) => g.set.has(k)));
    const ng = { set: new Set(run.cells), runs: [run] };
    for (const h of hit) { h.set.forEach((k) => ng.set.add(k)); ng.runs.push(...h.runs); groups.splice(groups.indexOf(h), 1); }
    groups.push(ng);
  }
  return groups;
}

// 무리 모양에 따라 특수 보석을 만들지, 어디에 만들지 정하기
export function planGroup(board, gr, swapKeys) {
  let maxLen = 0, longest = null, hasH = false, hasV = false;
  for (const run of gr.runs) {
    if (run.dir === 'sq') continue; // 네모는 특수 보석을 만들지 않음
    if (run.cells.length > maxLen) { maxLen = run.cells.length; longest = run; }
    if (run.dir === 'h') hasH = true; else hasV = true;
  }
  let special = null;
  if (maxLen >= 5) special = 'rainbow';
  else if (hasH && hasV) special = 'bomb';
  else if (maxLen === 4) special = longest.dir;
  if (!special) return null;

  const cand = [];
  if (swapKeys) for (const k of swapKeys) if (gr.set.has(k)) cand.push(k); // 옮긴 자리 우선
  if (special === 'bomb') {
    const hs = new Set();
    gr.runs.filter((r) => r.dir === 'h').forEach((r) => r.cells.forEach((k) => hs.add(k)));
    gr.runs.filter((r) => r.dir === 'v').forEach((r) => r.cells.forEach((k) => { if (hs.has(k)) cand.push(k); }));
  }
  cand.push(longest.cells[Math.floor(longest.cells.length / 2)], ...gr.set);
  for (const k of cand) { const [r, c] = rc(k); const g = board[r][c]; if (g && !g.special) return { k, special }; }
  return null;
}

// (r, c)의 보석이 줄이나 네모를 이루는지
function matchAt(board, r, c) {
  const t = board[r][c].type; if (t < 0) return false;
  let h = 1, v = 1;
  for (let i = c - 1; i >= 0 && board[r][i].type === t; i--) h++;
  for (let i = c + 1; i < N && board[r][i].type === t; i++) h++;
  for (let i = r - 1; i >= 0 && board[i][c].type === t; i--) v++;
  for (let i = r + 1; i < N && board[i][c].type === t; i++) v++;
  if (h >= 3 || v >= 3) return true;
  for (const [dr, dc] of [[-1, -1], [-1, 0], [0, -1], [0, 0]]) {
    const r0 = r + dr, c0 = c + dc;
    if (r0 < 0 || c0 < 0 || r0 >= N - 1 || c0 >= N - 1) continue;
    if (board[r0][c0].type === t && board[r0][c0 + 1].type === t && board[r0 + 1][c0].type === t && board[r0 + 1][c0 + 1].type === t) return true;
  }
  return false;
}

// 움직일 수 있는 수 하나 찾기 (힌트, 자동 섞기에 사용). 없으면 null
export function findMove(board) {
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const r2 = r + dr, c2 = c + dc; if (r2 >= N || c2 >= N) continue;
      const a = board[r][c], b = board[r2][c2];
      if (a.special === 'rainbow' || b.special === 'rainbow' || (a.special && b.special)) return [[r, c], [r2, c2]];
      board[r][c] = b; board[r2][c2] = a;
      const ok = matchAt(board, r, c) || matchAt(board, r2, c2);
      board[r][c] = a; board[r2][c2] = b;
      if (ok) return [[r, c], [r2, c2]];
    }
  }
  return null;
}

// 판에 가장 많은 보석 색 (무지개 보석이 휘말렸을 때 사용)
export function mostCommonType(board) {
  const cnt = Array(6).fill(0);
  board.flat().forEach((g) => { if (g && g.type >= 0) cnt[g.type]++; });
  let best = -1, bc = 0; cnt.forEach((v, i) => { if (v > bc) { bc = v; best = i; } });
  return best;
}
