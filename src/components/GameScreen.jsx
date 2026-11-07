// 게임 화면: HUD + 게임판(Canvas) + 아이템 버튼
// 게임판은 GameEngine 이 그리고, 이 컴포넌트는 엔진이 알려 주는 값으로 HUD 를 다시 그립니다.
import { useEffect, useRef, useState, useCallback } from 'react';
import GameEngine from '../game/engine.js';
import { N } from '../game/constants.js';
import { StatusBar, ScoreBar } from './Hud.jsx';
import Boosters from './Boosters.jsx';
import { PauseIcon, SoundIcon } from './Icons.jsx';

const emptyHud = (run) => ({
  mode: run.mode, level: run.level, moves: 0, score: 0, timeLeft: 60, goals: [],
  s2: 1, s3: 1, hammers: 0, shuffles: 0, hammerMode: false, ended: false,
});

let fxId = 0;

export default function GameScreen({ run, paused, muted, best, onToggleSound, onPause, onEnd }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const boostersRef = useRef(null);
  const engineRef = useRef(null);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  const [hud, setHud] = useState(() => emptyHud(run));
  const [effects, setEffects] = useState([]); // 떠오르는 글자와 큰 글자
  const [bumps, setBumps] = useState({});

  const removeFx = useCallback((id) => setEffects((list) => list.filter((f) => f.id !== id)), []);
  const addFx = useCallback((fx) => {
    const id = ++fxId;
    setEffects((list) => [...list, { ...fx, id }]);
    setTimeout(() => removeFx(id), 1600); // 애니메이션이 끝나지 않아도 정리
  }, [removeFx]);

  // 엔진 만들기 (화면에 처음 나타날 때 한 번)
  useEffect(() => {
    const engine = new GameEngine(canvasRef.current, {
      onHud: setHud,
      onFloat: (text, cx, cy, cls) => addFx({ kind: 'float', text, cx, cy, cls }),
      onBanner: (text, gold) => addFx({ kind: 'banner', text, gold }),
      onGoalBump: (i) => setBumps((b) => ({ ...b, [i]: (b[i] || 0) + 1 })),
      onBadSwap: () => {
        const el = wrapRef.current; if (!el) return;
        el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
      },
      onEnd: (result) => onEndRef.current(result),
    });
    engineRef.current = engine;
    if (import.meta.env.DEV) window.__engine = engine; // 개발 중 테스트용 (배포 빌드에는 없음)

    // 화면 높이에 맞춰 게임판 크기 정하기
    const fit = () => {
      const wrap = wrapRef.current; if (!wrap) return;
      const appW = wrap.parentElement.clientWidth;
      const top = wrap.getBoundingClientRect().top;
      const below = (boostersRef.current ? boostersRef.current.offsetHeight : 64) + 34;
      const avail = window.innerHeight - top - below - 22;
      let size = Math.min(appW - 22, avail, 500);
      size = Math.max(240, Math.floor(size / N) * N);
      engine.resize(size);
    };
    fit();
    window.addEventListener('resize', fit);
    return () => { engine.destroy(); window.removeEventListener('resize', fit); };
  }, [addFx]);

  // 새 판 시작 (레벨 시작, 다시 하기, 다음 레벨)
  useEffect(() => {
    const engine = engineRef.current;
    setEffects([]); setBumps({});
    if (run.mode === 'level') engine.startLevel(run.level); else engine.startTime();
  }, [run]);

  useEffect(() => { if (engineRef.current) engineRef.current.setPaused(paused); }, [paused]);

  const engine = () => engineRef.current;

  return (
    <section className="screen game">
      <div className="topbar">
        <button className="icon-btn" onClick={onPause} aria-label="일시정지"><PauseIcon /></button>
        <div className="lvl">{run.mode === 'level' ? `레벨 ${run.level}` : '60초 타임어택'}</div>
        <button className="icon-btn" onClick={onToggleSound} aria-label="소리 켜기/끄기"><SoundIcon muted={muted} /></button>
      </div>
      <StatusBar hud={hud} bumps={bumps} best={best} />
      <ScoreBar hud={hud} best={best} />
      <div className={'board-wrap' + (hud.hammerMode ? ' hammer' : '')} ref={wrapRef}>
        <canvas ref={canvasRef} aria-label="보석 게임판" />
        <div className="fx-layer">
          {effects.map((f) => f.kind === 'float' ? (
            <div key={f.id} className={'float ' + (f.cls || '')} onAnimationEnd={() => removeFx(f.id)}
              style={{ left: ((f.cx + 0.5) / N) * 100 + '%', top: ((f.cy + 0.5) / N) * 100 + '%' }}>{f.text}</div>
          ) : (
            <div key={f.id} className={'banner' + (f.gold ? ' gold' : '')} onAnimationEnd={() => removeFx(f.id)}>{f.text}</div>
          ))}
        </div>
        {hud.hammerMode && <div className="hammer-tip">부술 보석을 누르세요</div>}
      </div>
      <Boosters hud={hud} innerRef={boostersRef}
        onHammer={() => engine().toggleHammer()}
        onShuffle={() => engine().useShuffle()}
        onHint={() => engine().showHint()} />
    </section>
  );
}
