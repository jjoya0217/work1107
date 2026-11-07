// 게임 엔진: 게임판을 Canvas 에 그리고, 보석 맞추기·연쇄·특수 보석을 진행합니다.
// React 는 점수판, 목표, 버튼, 팝업 같은 "바깥 화면"을 맡고,
// 엔진은 hooks(콜백)로 React 에게 바뀐 내용을 알려 줍니다.
import {
  N, COLORS, COMBO_WORDS, SPECIAL_NAMES, key, rc, sleep, now, rand,
  easeOutQuad, easeInQuad, easeInOut, easeOutBack, easeFall,
} from './constants.js';
import { Sound, buzz } from './sound.js';
import { roundPoly, createSpriteSet } from './sprites.js';
import { levelConfig } from './levels.js';
import { newGem, makesMatch, findGroups, planGroup, findMove, mostCommonType } from './board.js';
import { loadSave, recordWin, recordBest } from './storage.js';

/*
 hooks = {
   onHud(hud)            점수·이동·목표 등 HUD 값이 바뀜
   onFloat(text, cx, cy, cls)  게임판 위에 떠오르는 글자 (+점수 등)
   onBanner(text, gold)  가운데 큰 글자 (콤보 등)
   onGoalBump(index)     목표 아이콘을 통통 튀기기
   onBadSwap()           맞지 않는 교환 (게임판 흔들기)
   onEnd(result)         레벨 클리어 / 실패 / 시간 끝
 }
*/
export default class GameEngine {
  constructor(canvas, hooks) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.hooks = hooks;
    this.tweens = [];
    this.particles = [];
    this.fx = [];
    this.board = [];
    this.ice = [];
    this.busy = false;
    this.shakeAmt = 0;
    this.W = 0; this.cell = 0; this.cssSize = 0;
    this.spriteOf = null;
    this.drag = null;
    this.alive = true;
    this.S = {
      mode: 'level', level: 1, cfg: null, moves: 0, score: 0, goals: [], typeCount: 6,
      timeLeft: 0, timeOver: false, running: false, ended: false, paused: false,
      hammers: 0, shuffles: 0, hammerMode: false, sel: null, hint: null, lastAct: 0,
    };
    this.last = now();
    this.frame = this.frame.bind(this);
    this.bindInput();
    this.raf = requestAnimationFrame(this.frame);
  }

  destroy() {
    this.alive = false;
    cancelAnimationFrame(this.raf);
    this.unbindInput();
  }

  // ---------- 애니메이션 (tween) ----------
  tween(obj, to, dur, ease = easeOutQuad, delay = 0) {
    return new Promise((res) => this.tweens.push({ obj, to, dur, ease, start: now() + delay, from: null, res }));
  }
  updateTweens(t) {
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      let p = (t - tw.start) / tw.dur;
      if (p < 0) continue;
      if (!tw.from) { tw.from = {}; for (const k in tw.to) tw.from[k] = tw.obj[k]; }
      if (p >= 1 || tw.dur <= 0) p = 1;
      const e = tw.ease(p);
      for (const k in tw.to) tw.obj[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * e;
      if (p === 1) { this.tweens.splice(i, 1); tw.res(); }
    }
  }

  // ---------- HUD 알림 ----------
  emitHud() {
    const S = this.S;
    this.hooks.onHud({
      mode: S.mode, level: S.level, moves: S.moves, score: S.score,
      timeLeft: Math.ceil(Math.max(0, S.timeLeft) / 1000),
      goals: S.goals.map((g) => ({ ...g })),
      s2: S.cfg ? S.cfg.s2 : 0, s3: S.cfg ? S.cfg.s3 : 0,
      hammers: S.hammers, shuffles: S.shuffles, hammerMode: S.hammerMode, ended: S.ended,
    });
  }
  floatText(text, cx, cy, cls = '') { this.hooks.onFloat(text, cx, cy, cls); }
  banner(text, gold = false) { this.hooks.onBanner(text, gold); }

  // ---------- 게임 시작 ----------
  startLevel(n) {
    const cfg = levelConfig(n);
    Object.assign(this.S, {
      mode: 'level', level: n, cfg, typeCount: cfg.types, moves: cfg.moves, score: 0, timeLeft: 0,
      hammers: 2, shuffles: 1, ended: false, paused: false, timeOver: false, running: true,
      hammerMode: false, sel: null, hint: null, lastAct: now(),
    });
    this.ice = cfg.ice.map((r) => r.slice());
    this.S.goals = cfg.goals.map((g) => ({ ...g, left: g.kind === 'ice' ? this.iceLeft() : g.count }));
    this.beginBoard();
  }
  startTime() {
    Object.assign(this.S, {
      mode: 'time', cfg: null, typeCount: 6, moves: 0, score: 0, timeLeft: 60000,
      hammers: 1, shuffles: 1, ended: false, paused: false, timeOver: false, running: true,
      hammerMode: false, sel: null, hint: null, lastAct: now(),
    });
    this.ice = Array.from({ length: N }, () => Array(N).fill(0));
    this.S.goals = [];
    this.beginBoard();
  }
  async beginBoard() {
    this.particles.length = 0; this.fx.length = 0; this.tweens.length = 0;
    this.fillBoard();
    this.emitHud();
    this.busy = true;
    const proms = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const g = this.board[r][c]; g.y = r - N - 1;
      proms.push(this.tween(g, { y: r }, 520, easeFall, c * 35 + (N - r) * 28));
    }
    await Promise.all(proms);
    Sound.land();
    this.banner(this.S.mode === 'level' ? '레벨 ' + this.S.level : '시작!');
    this.S.lastAct = now();
    this.busy = false;
  }
  stop() { this.S.running = false; this.S.paused = false; }
  setPaused(p) { this.S.paused = p; if (!p) this.S.lastAct = now(); }

  randType() { return Math.floor(Math.random() * this.S.typeCount); }
  fillBoard() {
    for (let tries = 0; tries < 300; tries++) {
      this.board = [];
      for (let r = 0; r < N; r++) {
        const row = []; this.board.push(row);
        for (let c = 0; c < N; c++) {
          let t; do { t = this.randType(); } while (makesMatch(this.board, row, r, c, t));
          row.push(newGem(t, r, c));
        }
      }
      if (findMove(this.board)) return;
    }
  }

  // ---------- 효과 ----------
  burst(r, c, color, n = 9) {
    const cell = this.cell;
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x: (c + 0.5) * cell, y: (r + 0.5) * cell,
        vx: rand(-1, 1) * cell * 0.07, vy: rand(-1.3, 0.3) * cell * 0.07,
        life: 1, decay: rand(0.018, 0.035), size: rand(0.05, 0.12) * cell, color, star: Math.random() < 0.45,
      });
    }
  }
  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a * this.cell); buzz(30); }

  effectCells(k, g) {
    const [r, c] = rc(k), out = [];
    if (g.special === 'h') { for (let i = 0; i < N; i++) out.push(key(r, i)); this.fx.push({ kind: 'row', r, life: 1, color: g.type }); }
    else if (g.special === 'v') { for (let i = 0; i < N; i++) out.push(key(i, c)); this.fx.push({ kind: 'col', c, life: 1, color: g.type }); }
    else if (g.special === 'bomb') {
      for (let i = r - 1; i <= r + 1; i++) for (let j = c - 1; j <= c + 1; j++) if (i >= 0 && j >= 0 && i < N && j < N) out.push(key(i, j));
      this.fx.push({ kind: 'ring', r, c, life: 1, size: 1.6 });
    } else if (g.special === 'rainbow') {
      const t = mostCommonType(this.board), targets = [];
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const o = this.board[i][j]; if (o && o.type === t) { out.push(key(i, j)); targets.push([i, j]); } }
      this.fx.push({ kind: 'bolt', r, c, targets, life: 1 });
    }
    return out;
  }

  // ---------- 점수와 목표 ----------
  addScore(pts, cx, cy) {
    this.S.score += pts;
    if (cx != null) this.floatText('+' + pts, cx, cy);
    this.emitHud();
  }
  collect(g) {
    if (this.S.mode !== 'level' || g.type < 0) return;
    this.S.goals.forEach((goal, i) => {
      if (goal.kind === 'gem' && goal.type === g.type && goal.left > 0) { goal.left--; this.hooks.onGoalBump(i); }
    });
  }
  iceLeft() { let n = 0; for (const row of this.ice) for (const v of row) n += v; return n; }
  crackIce(r, c) {
    if (!this.ice[r] || !this.ice[r][c]) return;
    this.ice[r][c]--;
    this.burst(r, c, '#d9f4ff', 7);
    this.S.goals.forEach((goal, i) => { if (goal.kind === 'ice') { goal.left = this.iceLeft(); this.hooks.onGoalBump(i); } });
  }
  goalsDone() { return this.S.goals.every((g) => g.left <= 0); }

  // ---------- 진행 순서 ----------
  // 보석 지우기 (특수 보석이 휘말리면 연달아 터짐) + 특수 보석 만들기
  async blast(keys, creations = [], combo = 1, pre = new Set()) {
    const board = this.board;
    const createKeys = new Set(creations.map((c) => c.k));
    const clear = new Set();
    for (const k of keys) if (!createKeys.has(k)) clear.add(k);
    const triggered = new Set(pre), queue = [...clear];
    let fired = 0;
    while (queue.length) {
      const k = queue.shift();
      if (triggered.has(k)) continue;
      const [r, c] = rc(k), g = board[r][c];
      if (!g || !g.special) continue;
      triggered.add(k); fired++;
      for (const k2 of this.effectCells(k, g)) {
        if (createKeys.has(k2) || clear.has(k2)) continue;
        clear.add(k2); queue.push(k2);
      }
    }
    const proms = []; let count = 0, sx = 0, sy = 0;
    for (const k of clear) {
      const [r, c] = rc(k), g = board[r][c];
      if (!g) continue;
      count++; sx += c; sy += r;
      this.collect(g);
      this.burst(r, c, g.type >= 0 ? COLORS[g.type].base : '#ffffff');
      proms.push(this.tween(g, { s: 0, a: 0 }, 190, easeInQuad));
    }
    for (const k of [...clear, ...createKeys]) { const [r, c] = rc(k); this.crackIce(r, c); }
    if (count) {
      this.addScore(count * 20 * combo + fired * 60, sx / count, sy / count);
      Sound.match(combo);
    }
    if (fired) { Sound.boom(); this.shake(0.18 + Math.min(fired, 4) * 0.05); }
    await Promise.all(proms);
    for (const k of clear) { const [r, c] = rc(k); board[r][c] = null; }
    for (const cr of creations) {
      const [r, c] = rc(cr.k), g = board[r][c];
      if (!g) continue;
      g.special = cr.special;
      if (cr.special === 'rainbow') g.type = -1;
      g.s = 1.6; this.tween(g, { s: 1 }, 280, easeOutBack);
      this.floatText(SPECIAL_NAMES[cr.special], c, r - 0.6, 'sp');
      Sound.special(); this.burst(r, c, '#fff6c2', 14);
      if (this.S.mode === 'time') { this.S.timeLeft += 2000; this.floatText('+2초', c, r + 0.4, 'time'); }
    }
    if (creations.length) await sleep(180);
  }

  // 빈칸 채우기: 위 보석이 떨어지고 새 보석이 내려옴
  async gravity() {
    const board = this.board, proms = [];
    for (let c = 0; c < N; c++) {
      let w = N - 1;
      for (let r = N - 1; r >= 0; r--) {
        const g = board[r][c];
        if (g) { if (w !== r) { board[w][c] = g; board[r][c] = null; } w--; }
      }
      const missing = w + 1;
      for (let r = w; r >= 0; r--) board[r][c] = newGem(this.randType(), r - missing, c);
      for (let r = 0; r < N; r++) {
        const g = board[r][c]; g.x = c;
        if (g.y !== r) { const d = r - g.y; proms.push(this.tween(g, { y: r }, 150 + Math.sqrt(d) * 95, easeFall)); }
      }
    }
    if (proms.length) { await Promise.all(proms); Sound.land(); }
  }

  // 맞은 보석이 없어질 때까지 반복 (연쇄 콤보)
  async resolve(swapKeys) {
    let combo = 0;
    for (let guard = 0; guard < 60; guard++) {
      const groups = findGroups(this.board);
      if (!groups.length) break;
      combo++;
      const clear = new Set(), creations = [];
      for (const gr of groups) {
        gr.set.forEach((k) => clear.add(k));
        const plan = planGroup(this.board, gr, swapKeys);
        if (plan) creations.push(plan);
      }
      if (combo >= 2) {
        this.banner(COMBO_WORDS[Math.min(combo, COMBO_WORDS.length - 1)], combo >= 4);
        if (this.S.mode === 'time' && combo >= 3) this.S.timeLeft += 1000;
      }
      await this.blast(clear, creations, combo);
      await this.gravity();
      swapKeys = null;
    }
    return combo;
  }

  async animSwap(r1, c1, r2, c2) {
    const a = this.board[r1][c1], b = this.board[r2][c2];
    this.board[r1][c1] = b; this.board[r2][c2] = a;
    Sound.swap();
    await Promise.all([this.tween(a, { x: c2, y: r2 }, 160, easeInOut), this.tween(b, { x: c1, y: r1 }, 160, easeInOut)]);
  }

  // 특수 보석끼리 바꾸기 = 합체 기술
  async specialSwap(r1, c1, r2, c2) {
    const board = this.board;
    const A = board[r2][c2], B = board[r1][c1]; // A: 학생이 옮긴 보석
    const ka = key(r2, c2), kb = key(r1, c1);
    if (A.special === 'rainbow' && B.special === 'rainbow') {
      const all = [];
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) all.push(key(i, j));
      this.banner('보석 대폭발!', true);
      this.fx.push({ kind: 'ring', r: r2, c: c2, life: 1, size: 9 });
      Sound.special(); this.shake(0.5);
      await sleep(250);
      await this.blast(all, [], 3, new Set([ka, kb]));
    } else if (A.special === 'rainbow' || B.special === 'rainbow') {
      const rbK = A.special === 'rainbow' ? ka : kb;
      const other = A.special === 'rainbow' ? B : A;
      const [rr, rcc] = rc(rbK);
      const targets = [];
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const g = board[i][j]; if (g && g.type === other.type) targets.push(key(i, j)); }
      if (other.special) {
        this.banner(other.special === 'bomb' ? '폭탄 비가 내려요!' : '줄 보석 파티!', true);
        for (const k of targets) {
          const [i, j] = rc(k), g = board[i][j];
          if (!g.special) { g.special = other.special === 'bomb' ? 'bomb' : (Math.random() < 0.5 ? 'h' : 'v'); g.s = 1.5; this.tween(g, { s: 1 }, 240, easeOutBack); }
        }
        Sound.special(); await sleep(420);
      }
      this.fx.push({ kind: 'bolt', r: rr, c: rcc, targets: targets.map(rc), life: 1 });
      Sound.special();
      await sleep(220);
      await this.blast([rbK, ...targets], [], 2, new Set([rbK]));
    } else {
      const lines = [A.special, B.special].filter((s) => s === 'h' || s === 'v').length;
      const keys = new Set([ka, kb]);
      const r = r2, c = c2;
      if (lines === 2) {
        for (let i = 0; i < N; i++) { keys.add(key(r, i)); keys.add(key(i, c)); }
        this.fx.push({ kind: 'row', r, life: 1, color: A.type }, { kind: 'col', c, life: 1, color: B.type });
        this.banner('십자 폭발!');
      } else if (lines === 0) {
        for (let i = r - 2; i <= r + 2; i++) for (let j = c - 2; j <= c + 2; j++) if (i >= 0 && j >= 0 && i < N && j < N) keys.add(key(i, j));
        this.fx.push({ kind: 'ring', r, c, life: 1, size: 3 });
        this.banner('메가 폭탄!', true);
      } else {
        for (let d = -1; d <= 1; d++) {
          if (r + d >= 0 && r + d < N) { for (let i = 0; i < N; i++) keys.add(key(r + d, i)); this.fx.push({ kind: 'row', r: r + d, life: 1, color: A.type }); }
          if (c + d >= 0 && c + d < N) { for (let i = 0; i < N; i++) keys.add(key(i, c + d)); this.fx.push({ kind: 'col', c: c + d, life: 1, color: B.type }); }
        }
        this.banner('초대형 십자!', true);
      }
      this.shake(0.4);
      await this.blast(keys, [], 2, new Set([ka, kb]));
    }
    await this.gravity();
  }

  canInput() {
    const S = this.S;
    return this.alive && !this.busy && S.running && !S.ended && !S.paused && !(S.mode === 'time' && S.timeLeft <= 0);
  }

  // 학생이 두 보석을 바꾸려고 할 때
  async attempt(r1, c1, r2, c2) {
    if (!this.canInput()) return;
    if (r2 < 0 || c2 < 0 || r2 >= N || c2 >= N) return;
    const S = this.S;
    this.busy = true; S.hint = null; S.sel = null;
    const a = this.board[r1][c1], b = this.board[r2][c2];
    await this.animSwap(r1, c1, r2, c2);
    let acted = false, special = false;
    if (a.special === 'rainbow' || b.special === 'rainbow' || (a.special && b.special)) acted = special = true;
    else if (findGroups(this.board).length) acted = true;
    if (!acted) {
      Sound.bad(); this.hooks.onBadSwap();
      await this.animSwap(r1, c1, r2, c2);
      this.busy = false; return;
    }
    if (S.mode === 'level') { S.moves--; this.emitHud(); }
    if (special) { await this.specialSwap(r1, c1, r2, c2); await this.resolve(null); }
    else await this.resolve([key(r1, c1), key(r2, c2)]);
    await this.afterTurn();
    this.busy = false;
  }

  async afterTurn() {
    const S = this.S;
    S.lastAct = now();
    if (S.ended) return;
    if (S.mode === 'level') {
      if (this.goalsDone()) { S.ended = true; this.emitHud(); await this.bonusTime(); this.winLevel(); return; }
      if (S.moves <= 0) { S.ended = true; this.emitHud(); await sleep(300); this.loseLevel(); return; }
    } else if (S.timeOver) { this.finishTime(); return; }
    if (!findMove(this.board)) await this.shuffleBoard();
  }

  async shuffleBoard() {
    const board = this.board;
    this.banner('보석을 섞어요!');
    await sleep(350);
    const gems = board.flat();
    let ok = false;
    for (let t = 0; t < 150 && !ok; t++) {
      for (let i = gems.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [gems[i], gems[j]] = [gems[j], gems[i]]; }
      for (let i = 0; i < gems.length; i++) board[Math.floor(i / N)][i % N] = gems[i];
      ok = !findGroups(board).length && !!findMove(board);
    }
    if (!ok) {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const g = board[r][c]; if (g.special) continue;
        let t, n = 0; do { t = this.randType(); n++; } while (makesMatch(board, board[r], r, c, t) && n < 30);
        g.type = t;
      }
    }
    await Promise.all(board.flatMap((row, r) => row.map((g, c) => this.tween(g, { x: c, y: r }, 420, easeInOut))));
    if (findGroups(board).length) await this.resolve(null);
  }

  // 레벨 클리어 후 남은 이동 횟수만큼 줄 보석을 만들어 터뜨림
  async bonusTime() {
    const S = this.S, board = this.board;
    await sleep(250);
    if (S.moves > 0) {
      this.banner('보너스 타임!', true);
      await sleep(800);
      while (S.moves > 0) {
        S.moves--; this.emitHud();
        const cands = [];
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const g = board[r][c]; if (g && !g.special) cands.push([r, c]); }
        if (!cands.length) break;
        const [r, c] = cands[Math.floor(Math.random() * cands.length)];
        const g = board[r][c];
        g.special = Math.random() < 0.5 ? 'h' : 'v'; g.s = 1.7; this.tween(g, { s: 1 }, 220, easeOutBack);
        this.burst(r, c, '#fff6c2', 10);
        Sound.tone(523.25 * Math.pow(2, Math.min(S.moves, 24) / 24), 0.12, 'triangle', 0.1);
        this.addScore(100, c, r);
        await sleep(120);
      }
    }
    for (let loop = 0; loop < 8; loop++) {
      const keys = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (board[r][c] && board[r][c].special) keys.push(key(r, c));
      if (!keys.length) break;
      await this.blast(keys, [], 1);
      await this.gravity();
      await this.resolve(null);
    }
  }

  // ---------- 아이템 ----------
  toggleHammer() {
    if (!this.canInput() || this.S.hammers <= 0) return;
    this.S.hammerMode = !this.S.hammerMode;
    Sound.tone(this.S.hammerMode ? 520 : 300, 0.08, 'sine', 0.07);
    this.emitHud();
  }
  async useHammer(r, c) {
    const S = this.S;
    S.hammerMode = false; S.hammers--; this.emitHud();
    this.busy = true;
    this.fx.push({ kind: 'ring', r, c, life: 1, size: 1 });
    Sound.boom(); this.shake(0.2);
    await this.blast([key(r, c)], [], 1);
    await this.gravity();
    await this.resolve(null);
    await this.afterTurn();
    this.busy = false;
  }
  async useShuffle() {
    const S = this.S;
    if (!this.canInput() || S.shuffles <= 0) return;
    S.hammerMode = false; S.shuffles--; S.hint = null; this.emitHud();
    this.busy = true;
    await this.shuffleBoard();
    await this.afterTurn();
    this.busy = false;
  }
  showHint() {
    if (!this.canInput()) return;
    this.S.hint = findMove(this.board);
    Sound.tone(780, 0.1, 'sine', 0.07);
  }

  // ---------- 끝 ----------
  winLevel() {
    const S = this.S, c = S.cfg;
    const stars = S.score >= c.s3 ? 3 : S.score >= c.s2 ? 2 : 1;
    recordWin(S.level, stars);
    Sound.win(); buzz([40, 60, 40]);
    const next = stars === 1 ? c.s2 : c.s3;
    this.hooks.onEnd({ type: 'win', level: S.level, score: S.score, stars, toNext: stars < 3 ? next - S.score : 0 });
  }
  loseLevel() {
    Sound.lose();
    const left = this.S.goals.filter((g) => g.left > 0)
      .map((g) => (g.kind === 'ice' ? `얼음 ${g.left}개` : `${COLORS[g.type].name} ${g.left}개`)).join(', ');
    this.hooks.onEnd({ type: 'lose', level: this.S.level, score: this.S.score, left });
  }
  finishTime() {
    const S = this.S;
    if (S.ended) return;
    S.ended = true;
    const record = recordBest(S.score);
    if (record) Sound.win(); else Sound.lose();
    this.banner('시간 끝!');
    this.emitHud();
    setTimeout(() => { if (this.alive) this.hooks.onEnd({ type: 'time', score: S.score, record, best: loadSave().best }); }, 900);
  }

  // ---------- 터치·마우스 입력 ----------
  cellAt(e) {
    const rect = this.cv.getBoundingClientRect();
    const c = Math.floor((e.clientX - rect.left) / rect.width * N);
    const r = Math.floor((e.clientY - rect.top) / rect.height * N);
    return r >= 0 && c >= 0 && r < N && c < N ? { r, c } : null;
  }
  bindInput() {
    this.onDown = (e) => {
      Sound.init();
      if (!this.canInput()) return;
      const p = this.cellAt(e); if (!p) return;
      this.S.lastAct = now(); this.S.hint = null;
      if (this.S.hammerMode) { this.useHammer(p.r, p.c); return; }
      this.drag = { r: p.r, c: p.c, x: e.clientX, y: e.clientY, done: false };
      try { this.cv.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
    };
    this.onMove = (e) => {
      const d = this.drag;
      if (!d || d.done) return;
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < this.cssSize / N * 0.33) return;
      d.done = true;
      let r2 = d.r, c2 = d.c;
      if (Math.abs(dx) > Math.abs(dy)) c2 += dx > 0 ? 1 : -1; else r2 += dy > 0 ? 1 : -1;
      this.attempt(d.r, d.c, r2, c2);
    };
    this.onUp = () => {
      const d = this.drag, S = this.S;
      if (d && !d.done && this.canInput()) {
        const { r, c } = d, s = S.sel;
        if (s && Math.abs(s.r - r) + Math.abs(s.c - c) === 1) this.attempt(s.r, s.c, r, c);
        else if (s && s.r === r && s.c === c) S.sel = null;
        else { S.sel = { r, c }; Sound.tone(660, 0.05, 'sine', 0.05); }
      }
      this.drag = null;
    };
    this.onCancel = () => { this.drag = null; };
    this.cv.addEventListener('pointerdown', this.onDown);
    this.cv.addEventListener('pointermove', this.onMove);
    this.cv.addEventListener('pointerup', this.onUp);
    this.cv.addEventListener('pointercancel', this.onCancel);
  }
  unbindInput() {
    this.cv.removeEventListener('pointerdown', this.onDown);
    this.cv.removeEventListener('pointermove', this.onMove);
    this.cv.removeEventListener('pointerup', this.onUp);
    this.cv.removeEventListener('pointercancel', this.onCancel);
  }

  // ---------- 화면 크기 ----------
  resize(cssSize) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.cssSize = cssSize;
    this.cv.style.width = this.cv.style.height = cssSize + 'px';
    this.W = this.cv.width = this.cv.height = Math.round(cssSize * dpr);
    this.cell = this.W / N;
    this.spriteOf = createSpriteSet(Math.round(this.cell));
  }

  // ---------- 매 프레임 ----------
  frame(t) {
    if (!this.alive) return;
    const S = this.S;
    const dt = Math.min(64, t - this.last); this.last = t;
    this.updateTweens(t);
    if (S.mode === 'time' && S.running && !S.ended && !S.paused && !S.timeOver) {
      const before = Math.ceil(S.timeLeft / 1000);
      S.timeLeft -= dt;
      const after = Math.ceil(Math.max(0, S.timeLeft) / 1000);
      if (after !== before) { this.emitHud(); if (after <= 5 && after > 0) Sound.tick(); }
      if (S.timeLeft <= 0) { S.timeLeft = 0; S.timeOver = true; this.emitHud(); if (!this.busy) this.finishTime(); }
    }
    if (this.canInput() && !S.hint && t - S.lastAct > 6000) S.hint = findMove(this.board);
    if (this.spriteOf && this.board.length) this.draw(t);
    this.raf = requestAnimationFrame(this.frame);
  }

  draw(t) {
    const { ctx, W, cell, S, board } = this;
    const rr = (x, y, w, h, r) => roundPoly(ctx, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], r);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, W);
    if (this.shakeAmt > 0.5) { ctx.translate(rand(-this.shakeAmt, this.shakeAmt), rand(-this.shakeAmt, this.shakeAmt)); this.shakeAmt *= 0.86; } else this.shakeAmt = 0;

    // 칸 바탕과 얼음
    const pad = cell * 0.05;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      ctx.fillStyle = (r + c) % 2 ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.03)';
      rr(c * cell + pad, r * cell + pad, cell - pad * 2, cell - pad * 2, cell * 0.18); ctx.fill();
      const iv = this.ice[r] && this.ice[r][c];
      if (iv) {
        ctx.fillStyle = iv > 1 ? 'rgba(170,230,255,.55)' : 'rgba(160,225,255,.3)';
        rr(c * cell + pad, r * cell + pad, cell - pad * 2, cell - pad * 2, cell * 0.18); ctx.fill();
        ctx.lineWidth = cell * 0.035; ctx.strokeStyle = 'rgba(225,247,255,.85)'; ctx.stroke();
        ctx.lineWidth = cell * 0.02; ctx.strokeStyle = 'rgba(255,255,255,.55)';
        ctx.beginPath(); ctx.moveTo(c * cell + cell * 0.18, r * cell + cell * 0.3); ctx.lineTo(c * cell + cell * 0.38, r * cell + cell * 0.18);
        ctx.moveTo(c * cell + cell * 0.65, r * cell + cell * 0.85); ctx.lineTo(c * cell + cell * 0.85, r * cell + cell * 0.62); ctx.stroke();
      }
    }
    // 선택한 칸
    if (S.sel) {
      ctx.lineWidth = cell * 0.07; ctx.strokeStyle = `rgba(246,196,83,${0.65 + 0.35 * Math.sin(t / 120)})`;
      rr(S.sel.c * cell + pad * 1.5, S.sel.r * cell + pad * 1.5, cell - pad * 3, cell - pad * 3, cell * 0.2); ctx.stroke();
    }
    // 보석
    const hintSet = S.hint ? new Set(S.hint.map(([r, c]) => key(r, c))) : null;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const g = board[r] && board[r][c]; if (!g || g.a <= 0) continue;
      let s = g.s, oy = 0;
      if (g.special === 'bomb' || g.special === 'rainbow') s *= 1 + 0.05 * Math.sin(t / 180 + r + c);
      if (hintSet && hintSet.has(key(r, c))) { s *= 1 + 0.08 * Math.abs(Math.sin(t / 160)); oy = -Math.abs(Math.sin(t / 160)) * cell * 0.06; }
      const size = cell * s;
      ctx.globalAlpha = Math.max(0, Math.min(1, g.a));
      ctx.drawImage(this.spriteOf(g), g.x * cell + cell / 2 - size / 2, g.y * cell + cell / 2 - size / 2 + oy, size, size);
    }
    ctx.globalAlpha = 1;
    // 폭발 효과
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.life -= 0.035;
      if (f.life <= 0) { this.fx.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = f.life;
      const glow = f.color != null && f.color >= 0 ? COLORS[f.color].light : '#ffffff';
      ctx.shadowColor = glow; ctx.shadowBlur = cell * 0.5; ctx.fillStyle = '#fff';
      if (f.kind === 'row') { const h = cell * (0.15 + 0.7 * f.life); ctx.fillRect(0, (f.r + 0.5) * cell - h / 2, W, h); }
      else if (f.kind === 'col') { const w = cell * (0.15 + 0.7 * f.life); ctx.fillRect((f.c + 0.5) * cell - w / 2, 0, w, W); }
      else if (f.kind === 'ring') {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = cell * 0.18 * f.life;
        ctx.beginPath(); ctx.arc((f.c + 0.5) * cell, (f.r + 0.5) * cell, cell * (0.3 + f.size * (1 - f.life)), 0, Math.PI * 2); ctx.stroke();
      } else if (f.kind === 'bolt') {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = cell * 0.06;
        const x0 = (f.c + 0.5) * cell, y0 = (f.r + 0.5) * cell;
        ctx.beginPath();
        for (const [tr, tc] of f.targets) {
          const x1 = (tc + 0.5) * cell, y1 = (tr + 0.5) * cell;
          ctx.moveTo(x0, y0);
          ctx.lineTo((x0 + x1) / 2 + rand(-1, 1) * cell * 0.3, (y0 + y1) / 2 + rand(-1, 1) * cell * 0.3); ctx.lineTo(x1, y1);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    // 반짝이 파편
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += cell * 0.0045; p.life -= p.decay;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
      const s = p.size * (0.5 + p.life * 0.5);
      if (p.star) { ctx.beginPath(); ctx.moveTo(p.x, p.y - s); ctx.lineTo(p.x + s * 0.35, p.y); ctx.lineTo(p.x, p.y + s); ctx.lineTo(p.x - s * 0.35, p.y); ctx.closePath(); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(p.x, p.y, s * 0.55, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }
}
