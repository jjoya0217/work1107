// 앱 전체: 지금 어떤 화면인지(첫 화면 / 모험 지도 / 게임)와 팝업을 관리합니다.
import { useEffect, useState, useCallback } from 'react';
import Home from './components/Home.jsx';
import LevelMap from './components/LevelMap.jsx';
import GameScreen from './components/GameScreen.jsx';
import Modal from './components/Modal.jsx';
import { loadSave, saveMuted } from './game/storage.js';
import { Sound } from './game/sound.js';
import { MAX_LEVEL } from './game/levels.js';

const fmt = (n) => n.toLocaleString('ko-KR');

export default function App() {
  const [screen, setScreen] = useState('home');   // 'home' | 'map' | 'game'
  const [run, setRun] = useState(null);           // { mode, level, id } — id 가 바뀌면 새 판 시작
  const [save, setSave] = useState(loadSave);
  const [modal, setModal] = useState(null);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(Sound.muted);

  // 화면 이동
  const go = useCallback((name) => {
    setModal(null); setPaused(false);
    setSave(loadSave());
    setScreen(name);
    window.scrollTo(0, 0);
  }, []);
  const play = useCallback((mode, level = 1) => {
    setModal(null); setPaused(false);
    setSave(loadSave());
    setRun({ mode, level, id: Date.now() });
    setScreen('game');
  }, []);

  // 게임 중에는 페이지 스크롤을 막음
  useEffect(() => {
    document.body.classList.toggle('playing', screen === 'game');
  }, [screen]);

  // 첫 터치에서 소리 준비
  useEffect(() => {
    const init = () => Sound.init();
    document.addEventListener('pointerdown', init, { once: true });
    return () => document.removeEventListener('pointerdown', init);
  }, []);

  const toggleSound = () => {
    Sound.init();
    Sound.muted = !Sound.muted;
    saveMuted(Sound.muted);
    setMuted(Sound.muted);
  };

  // 게임이 끝났을 때 팝업
  const handleEnd = (r) => {
    setSave(loadSave());
    if (r.type === 'win') {
      const last = r.level >= MAX_LEVEL;
      setModal({
        title: '레벨 클리어!', stars: r.stars,
        body: <><strong>{fmt(r.score)}점</strong>{r.stars < 3 ? `별 ${r.stars + 1}개까지 ${fmt(r.toNext)}점 남았어요` : '완벽해요! 최고 등급이에요'}</>,
        buttons: [
          last ? { label: '모험 지도', primary: true, onClick: () => go('map') }
            : { label: '다음 레벨', primary: true, onClick: () => play('level', r.level + 1) },
          { label: '다시 하기', onClick: () => play('level', r.level) },
          ...(last ? [] : [{ label: '모험 지도', onClick: () => go('map') }]),
        ],
      });
    } else if (r.type === 'lose') {
      setModal({
        title: '아쉬워요!',
        body: <>이동 횟수를 모두 썼어요.<br />남은 목표: {r.left}<br />콤보와 특수 보석을 노려 보세요!</>,
        buttons: [
          { label: '다시 도전', primary: true, onClick: () => play('level', r.level) },
          { label: '모험 지도', onClick: () => go('map') },
        ],
      });
    } else {
      setModal({
        title: r.record ? '신기록!' : '시간 끝!',
        body: <><strong>{fmt(r.score)}점</strong>{r.record ? '친구에게 기록을 자랑해 보세요!' : `최고 기록 ${fmt(r.best)}점`}</>,
        buttons: [
          { label: '한 판 더', primary: true, onClick: () => play('time') },
          { label: '처음 화면', onClick: () => go('home') },
        ],
      });
    }
  };

  // 일시정지 팝업
  const pause = useCallback(() => {
    if (!run || modal) return;
    setPaused(true);
    setModal({
      title: '잠깐 쉬는 중',
      body: run.mode === 'level' ? `레벨 ${run.level}` : '60초 타임어택',
      buttons: [
        { label: '계속하기', primary: true, onClick: () => { setModal(null); setPaused(false); } },
        { label: '처음부터', onClick: () => play(run.mode, run.level) },
        { label: '나가기', onClick: () => go(run.mode === 'level' ? 'map' : 'home') },
      ],
    });
  }, [run, modal, play, go]);

  // Esc 키로 일시정지
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && screen === 'game') pause(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [screen, pause]);

  return (
    <>
      <div className="sky-dots" aria-hidden="true" />
      <div id="app">
        {screen === 'home' && <Home save={save} onAdventure={() => go('map')} onTimeAttack={() => play('time')} />}
        {screen === 'map' && <LevelMap save={save} onBack={() => go('home')} onPlay={(n) => play('level', n)} />}
        {screen === 'game' && run && (
          <GameScreen run={run} paused={paused} muted={muted} best={save.best}
            onToggleSound={toggleSound} onPause={pause} onEnd={handleEnd} />
        )}
        {modal && <Modal {...modal} />}
      </div>
    </>
  );
}
