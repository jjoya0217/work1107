// 효과음: 음원 파일 없이 Web Audio 로 소리를 만듭니다.
// 브라우저 규칙상 학생이 화면을 한 번 누른 뒤부터 소리가 납니다.
import { loadMuted } from './storage.js';

export const Sound = {
  ctx: null,
  muted: loadMuted(),
  init() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; } }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  },
  tone(f, d = 0.12, type = 'sine', vol = 0.12, delay = 0, slide = 0) {
    if (this.muted || !this.ctx) return;
    try {
      const t = this.ctx.currentTime + delay;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t + d);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(t); o.stop(t + d + 0.03);
    } catch (e) { /* 소리 실패는 무시 */ }
  },
  // 콤보가 올라갈수록 음이 높아집니다
  match(combo) {
    const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
    const f = 523.25 * Math.pow(2, scale[Math.min(combo - 1, scale.length - 1)] / 12);
    this.tone(f, 0.2, 'triangle', 0.16); this.tone(f * 2, 0.14, 'sine', 0.05, 0.04);
  },
  swap() { this.tone(420, 0.08, 'sine', 0.07, 0, 1.4); },
  bad() { this.tone(200, 0.16, 'square', 0.04, 0, 0.7); },
  land() { this.tone(140, 0.06, 'sine', 0.05); },
  special() { this.tone(330, 0.35, 'sawtooth', 0.05, 0, 3); this.tone(660, 0.3, 'triangle', 0.07, 0.08, 2); },
  boom() { this.tone(110, 0.4, 'sine', 0.25, 0, 0.35); this.tone(60, 0.3, 'square', 0.04, 0, 0.5); },
  win() { [0, 4, 7, 12, 16].forEach((n, i) => this.tone(523.25 * Math.pow(2, n / 12), 0.3, 'triangle', 0.14, i * 0.1)); },
  lose() { [7, 4, 0, -5].forEach((n, i) => this.tone(392 * Math.pow(2, n / 12), 0.3, 'triangle', 0.1, i * 0.14)); },
  tick() { this.tone(880, 0.05, 'square', 0.03); },
};

export function buzz(ms) {
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* 진동 미지원 */ }
}
