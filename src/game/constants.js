// 게임 전체에서 함께 쓰는 값과 작은 도우미 함수들

export const N = 8; // 게임판 크기 (8 x 8)

// 보석 6종류: 색과 이름 (모양은 sprites.js 에서 그림)
export const COLORS = [
  { base: '#ff3b5c', light: '#ffb0bd', dark: '#9c0f2c', name: '루비' },
  { base: '#ff9a1f', light: '#ffd9a0', dark: '#a85200', name: '호박' },
  { base: '#ffd93b', light: '#fff6b8', dark: '#a87f00', name: '토파즈' },
  { base: '#2ed47a', light: '#b4f7d2', dark: '#0b7039', name: '에메랄드' },
  { base: '#3aa0ff', light: '#b6dcff', dark: '#0a4596', name: '사파이어' },
  { base: '#b05cff', light: '#e2c2ff', dark: '#561a9e', name: '자수정' },
];

export const COMBO_WORDS = ['', '', '좋아요!', '멋져요!', '대단해요!', '환상적!', '전설이다!'];
export const SPECIAL_NAMES = { h: '가로줄 보석!', v: '세로줄 보석!', bomb: '폭탄 보석!', rainbow: '무지개 보석!' };

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const now = () => performance.now();
export const rand = (a, b) => a + Math.random() * (b - a);

// 칸 위치 <-> 숫자 키 변환 (r행 c열 -> r*8+c)
export const key = (r, c) => r * N + c;
export const rc = (k) => [Math.floor(k / N), k % N];

// 애니메이션 속도 곡선
export const easeOutQuad = (p) => 1 - (1 - p) * (1 - p);
export const easeInQuad = (p) => p * p;
export const easeInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
export const easeOutBack = (p) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
export const easeFall = (p) => { const c1 = 0.7, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
