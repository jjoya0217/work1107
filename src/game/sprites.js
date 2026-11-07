// 보석 그림: 이미지 파일 없이 Canvas 로 직접 그립니다.
import { COLORS } from './constants.js';

export function roundPoly(c, pts, rad) {
  const n = pts.length, a = pts[n - 1], b = pts[0];
  c.beginPath(); c.moveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; c.arcTo(p[0], p[1], q[0], q[1], rad); }
  c.closePath();
}

// 보석 종류별 모양: 0 육각형, 1 원, 2 별, 3 둥근 네모, 4 다이아몬드, 5 삼각형
function shapePath(c, t, R) {
  if (t === 1) { c.beginPath(); c.arc(0, 0, R * 0.95, 0, Math.PI * 2); return; }
  let pts, rad;
  if (t === 0) { pts = []; for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3; pts.push([Math.cos(a) * R * 1.02, Math.sin(a) * R * 1.02]); } rad = R * 0.2; }
  else if (t === 2) { pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? R * 0.55 : R * 1.1; pts.push([Math.cos(a) * rr, Math.sin(a) * rr + R * 0.06]); } rad = R * 0.12; }
  else if (t === 3) { const s = R * 0.84; pts = [[-s, -s], [s, -s], [s, s], [-s, s]]; rad = R * 0.3; }
  else if (t === 4) { pts = [[-R * 0.58, -R * 0.78], [R * 0.58, -R * 0.78], [R * 1.0, -R * 0.2], [0, R * 1.0], [-R * 1.0, -R * 0.2]]; rad = R * 0.12; }
  else { pts = [[0, -R * 1.0], [R * 1.05, R * 0.8], [-R * 1.05, R * 0.8]]; rad = R * 0.24; }
  roundPoly(c, pts, rad);
}

function drawRainbow(c, R, size) {
  c.save(); c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = size * 0.06; c.shadowOffsetY = size * 0.035;
  c.beginPath(); c.arc(0, 0, R * 1.02, 0, Math.PI * 2);
  const cols = ['#ff3b5c', '#ff9a1f', '#ffd93b', '#2ed47a', '#3aa0ff', '#b05cff', '#ff3b5c'];
  let fill;
  if (c.createConicGradient) fill = c.createConicGradient(0, 0, 0);
  else fill = c.createLinearGradient(-R, -R, R, R);
  cols.forEach((col, i) => fill.addColorStop(i / (cols.length - 1), col));
  c.fillStyle = fill; c.fill(); c.restore();
  const g = c.createRadialGradient(0, 0, 0, 0, 0, R);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.fill();
  c.lineWidth = size * 0.03; c.strokeStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(0, 0, R * 1.02, 0, Math.PI * 2); c.stroke();
  c.fillStyle = '#fff';
  roundPoly(c, [[0, -R * 0.55], [R * 0.12, -R * 0.12], [R * 0.55, 0], [R * 0.12, R * 0.12], [0, R * 0.55], [-R * 0.12, R * 0.12], [-R * 0.55, 0], [-R * 0.12, -R * 0.12]], R * 0.04);
  c.fill();
}

// type: 보석 종류, special: null | 'h' | 'v' | 'bomb' | 'rainbow'
export function makeGem(type, special, size) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const c = cv.getContext('2d'); c.translate(size / 2, size / 2);
  const R = size * 0.37;
  if (special === 'rainbow') { drawRainbow(c, R, size); return cv; }

  const col = COLORS[type];
  // 몸통 (그림자 + 입체 그라데이션)
  c.save(); c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = size * 0.06; c.shadowOffsetY = size * 0.035;
  shapePath(c, type, R);
  const g = c.createRadialGradient(-R * 0.35, -R * 0.4, R * 0.05, 0, 0, R * 1.3);
  g.addColorStop(0, col.light); g.addColorStop(0.45, col.base); g.addColorStop(1, col.dark);
  c.fillStyle = g; c.fill(); c.restore();
  c.lineWidth = size * 0.028; c.strokeStyle = col.dark; shapePath(c, type, R); c.stroke();
  // 안쪽 면과 반짝이
  c.save(); c.scale(0.55, 0.55); c.translate(0, -R * 0.08); shapePath(c, type, R); c.fillStyle = 'rgba(255,255,255,.17)'; c.fill(); c.restore();
  c.save(); c.rotate(-0.5); c.beginPath(); c.ellipse(-R * 0.1, -R * 0.55, R * 0.3, R * 0.11, 0, 0, Math.PI * 2); c.fillStyle = 'rgba(255,255,255,.8)'; c.fill(); c.restore();

  if (special === 'h' || special === 'v') {
    // 줄 보석: 하얀 줄무늬와 양쪽 화살표
    c.save(); shapePath(c, type, R); c.clip();
    c.fillStyle = 'rgba(255,255,255,.88)'; c.shadowColor = '#fff'; c.shadowBlur = size * 0.08;
    for (const o of [-0.3, 0.3]) {
      if (special === 'h') c.fillRect(-R * 1.3, o * R - R * 0.09, R * 2.6, R * 0.18);
      else c.fillRect(o * R - R * 0.09, -R * 1.3, R * 0.18, R * 2.6);
    }
    c.restore();
    c.fillStyle = '#fff';
    const a = R * 1.22, w = R * 0.2;
    if (special === 'h') {
      roundPoly(c, [[-a - w, 0], [-a + w * 0.6, -w], [-a + w * 0.6, w]], 1); c.fill();
      roundPoly(c, [[a + w, 0], [a - w * 0.6, -w], [a - w * 0.6, w]], 1); c.fill();
    } else {
      roundPoly(c, [[0, -a - w], [-w, -a + w * 0.6], [w, -a + w * 0.6]], 1); c.fill();
      roundPoly(c, [[0, a + w], [-w, a - w * 0.6], [w, a - w * 0.6]], 1); c.fill();
    }
  }
  if (special === 'bomb') {
    // 폭탄 보석: 빛나는 점선 고리 + 하얀 심지
    c.save(); c.strokeStyle = '#fff'; c.lineWidth = size * 0.045; c.shadowColor = col.light; c.shadowBlur = size * 0.14;
    c.setLineDash([size * 0.07, size * 0.045]);
    c.beginPath(); c.arc(0, 0, R * 1.18, 0, Math.PI * 2); c.stroke(); c.restore();
    c.beginPath(); c.arc(0, 0, R * 0.24, 0, Math.PI * 2); c.fillStyle = '#fff'; c.shadowColor = '#fff'; c.shadowBlur = size * 0.1; c.fill();
  }
  return cv;
}

// 게임판 칸 크기에 맞춘 보석 그림 묶음
export function createSpriteSet(size) {
  const set = {};
  for (let t = 0; t < 6; t++) for (const s of ['n', 'h', 'v', 'bomb']) set[t + '_' + s] = makeGem(t, s === 'n' ? null : s, size);
  set.rainbow = makeGem(0, 'rainbow', size);
  return (g) => (g.special === 'rainbow' ? set.rainbow : set[g.type + '_' + (g.special || 'n')]);
}

// 화면(HUD, 설명)에 쓰는 작은 보석 그림 주소
const iconCache = {};
export function iconURL(type, special) {
  const k = type + '_' + (special || 'n');
  if (!iconCache[k]) iconCache[k] = makeGem(type, special, 96).toDataURL();
  return iconCache[k];
}
