// 버튼에 쓰는 작은 그림(SVG 아이콘)
const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' };

export const BackIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2.4}><path d="M15 5l-7 7 7 7" /></svg>
);
export const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.5" /><rect x="14" y="5" width="4" height="14" rx="1.5" /></svg>
);
export const SoundIcon = ({ muted }) => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <path d="M4 9h4l5-4v14l-5-4H4z" />
    {muted ? <path d="M17 9.5l5 5M22 9.5l-5 5" /> : <path d="M16.5 9a4 4 0 010 6M19 6.5a8 8 0 010 11" />}
  </svg>
);
export const HammerIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke}><path d="M13.5 3.5l7 7-3 3-7-7z" /><path d="M12 8L3.6 16.4a1.6 1.6 0 002.3 2.3L14.3 10" /></svg>
);
export const ShuffleIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke}><path d="M3 7h3c4.5 0 6.5 10 11 10h4" /><path d="M3 17h3c1.7 0 3-1.4 4-3.2M13.5 10c1-1.7 2.2-3 3.8-3H21" /><path d="M18 4l3 3-3 3M18 14l3 3-3 3" /></svg>
);
export const HintIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke}><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z" /></svg>
);
