// 모험 모드 레벨 설계 (레벨 1~30)
import { N } from './constants.js';

export const MAX_LEVEL = 30;

// 레벨 번호로 항상 같은 결과가 나오는 난수 (같은 레벨은 같은 목표)
function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function levelConfig(n) {
  const types = n <= 3 ? 5 : 6; // 레벨 1~3 은 5색으로 쉽게
  const rnd = mulberry(n * 7919 + 13);
  const pick = () => Math.floor(rnd() * types);
  const t1 = pick(); let t2 = pick(); while (t2 === t1) t2 = pick();
  const ice = Array.from({ length: N }, () => Array(N).fill(0));
  const goals = [];
  let moves;

  if (n === 1) {
    goals.push({ kind: 'gem', type: t1, count: 15 });
    moves = 20;
  } else if (n % 3 === 0) {
    // 얼음 레벨: 4가지 모양이 돌아가며 나옴
    const pat = (n / 3 - 1) % 4;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      let on = false;
      if (pat === 0) on = r >= 2 && r <= 5 && c >= 2 && c <= 5;          // 가운데 4x4
      else if (pat === 1) on = r === 3 || r === 4;                       // 가운데 가로 두 줄
      else if (pat === 2) on = r === c || r + c === N - 1;               // X자
      else on = r >= 1 && r <= 6 && c >= 1 && c <= 6 && (r + c) % 2 === 0; // 바둑판
      if (on) ice[r][c] = n >= 21 && (r + c) % 3 === 0 ? 2 : 1;           // 21레벨부터 일부 두 겹
    }
    goals.push({ kind: 'ice' });
    if (n >= 9) goals.push({ kind: 'gem', type: t1, count: Math.min(6 + n, 24) });
    moves = 26;
  } else {
    const cnt = Math.min(8 + Math.round(n * 0.8), 26);
    goals.push({ kind: 'gem', type: t1, count: cnt });
    goals.push({ kind: 'gem', type: t2, count: cnt });
    moves = 24 + (n > 15 ? 2 : 0);
  }
  // 별 2개, 별 3개 기준 점수
  return { n, types, moves, goals, ice, s2: 2600 + n * 120, s3: 4200 + n * 180 };
}
