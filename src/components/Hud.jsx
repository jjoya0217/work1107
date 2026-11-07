// 게임 화면 윗부분: 남은 이동(또는 시간), 목표, 점수 막대
import { COLORS } from '../game/constants.js';
import { iconURL } from '../game/sprites.js';

function Goal({ goal, bump }) {
  const done = goal.left <= 0;
  return (
    <div className={'goal' + (done ? ' done' : '') + (bump ? ' bump' : '')} key={bump}>
      {goal.kind === 'ice'
        ? <span className="ice-ic" title="얼음" />
        : <img alt={COLORS[goal.type].name} src={iconURL(goal.type)} />}
      <span className="n">{done ? '✓' : goal.left}</span>
    </div>
  );
}

export function StatusBar({ hud, bumps, best }) {
  const isLevel = hud.mode === 'level';
  const num = isLevel ? hud.moves : hud.timeLeft;
  const low = isLevel ? hud.moves <= 5 && !hud.ended : hud.timeLeft <= 10;
  return (
    <div className="status">
      <div className={'moves' + (low ? ' low' : '')}>
        <span className="num">{num}</span>
        <span className="lab">{isLevel ? '남은 이동' : '남은 초'}</span>
      </div>
      <div className="goals">
        <div className="lab">{isLevel ? '목표' : '최고 기록'}</div>
        {isLevel
          ? hud.goals.map((g, i) => <Goal key={i + '-' + (bumps[i] || 0)} goal={g} bump={bumps[i] || 0} />)
          : <div className="goal">{best.toLocaleString('ko-KR')}점</div>}
      </div>
    </div>
  );
}

export function ScoreBar({ hud, best }) {
  const isLevel = hud.mode === 'level';
  const max = isLevel ? hud.s3 * 1.12 : Math.max(best, 3000) * 1.05;
  const pct = (v) => Math.min(100, (v / max) * 100) + '%';
  return (
    <div className="scorebar">
      <div className="score"><span>{hud.score.toLocaleString('ko-KR')}</span> 점</div>
      <div className="bar">
        <div className="fill" style={{ width: pct(hud.score) }} />
        {isLevel ? (
          <>
            <i className={'mk' + (hud.score >= hud.s2 ? ' on' : '')} style={{ left: pct(hud.s2) }}>★★</i>
            <i className={'mk' + (hud.score >= hud.s3 ? ' on' : '')} style={{ left: pct(hud.s3) }}>★★★</i>
          </>
        ) : (
          <i className={'mk' + (best > 0 && hud.score >= best ? ' on' : '')} style={{ left: best > 0 ? pct(best) : '100%' }}>최고</i>
        )}
      </div>
    </div>
  );
}
