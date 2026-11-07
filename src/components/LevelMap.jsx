// 모험 지도: 레벨 1~30 과 받은 별
import { MAX_LEVEL } from '../game/levels.js';
import { BackIcon } from './Icons.jsx';

export default function LevelMap({ save, onBack, onPlay }) {
  const levels = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
  const total = levels.reduce((sum, n) => sum + (save.stars[n] || 0), 0);
  return (
    <section className="screen">
      <div className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="처음 화면"><BackIcon /></button>
        <div className="lvl">모험 지도</div>
        <div className="star-total">★ {total}</div>
      </div>
      <div className="levels">
        {levels.map((n) => {
          const st = save.stars[n] || 0;
          const locked = n > save.unlocked;
          const cls = 'node' + (locked ? ' lock' : '') + (n === save.unlocked ? ' cur' : '');
          return (
            <button key={n} className={cls} disabled={locked} onClick={() => onPlay(n)}
              aria-label={locked ? `레벨 ${n} 잠김` : `레벨 ${n}, 별 ${st}개`}>
              {n}
              <span className="st">{locked ? '' : '★'.repeat(st) + '☆'.repeat(3 - st)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
