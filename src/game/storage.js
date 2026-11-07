// 학생 브라우저에 진행 상황을 저장합니다 (localStorage).
// 저장이 막혀 있어도 게임은 정상으로 돌아가도록 모두 try/catch 로 감쌉니다.
// 키 이름은 v1.0(HTML 버전)과 같아서, 같은 주소에서 쓰면 기록이 이어집니다.

const PREFIX = 'starGem_';

function get(k, d) {
  try { const v = localStorage.getItem(PREFIX + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
}
function set(k, v) {
  try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch (e) { /* 저장 불가: 무시 */ }
}

export function loadSave() {
  return { unlocked: get('unlocked', 1), stars: get('stars', {}), best: get('best', 0) };
}

// 레벨 클리어 기록: 더 좋은 별 수와 다음 레벨 열기
export function recordWin(level, stars) {
  const s = loadSave();
  if (stars > (s.stars[level] || 0)) { s.stars[level] = stars; set('stars', s.stars); }
  if (s.unlocked < level + 1) { s.unlocked = Math.min(30, level + 1); set('unlocked', s.unlocked); }
}

// 타임어택 기록: 신기록이면 true
export function recordBest(score) {
  const s = loadSave();
  if (score > s.best) { set('best', score); return true; }
  return false;
}

export const loadMuted = () => get('muted', false);
export const saveMuted = (m) => set('muted', m);
