// 게임 화면 아래: 망치, 섞기, 힌트 버튼
import { HammerIcon, ShuffleIcon, HintIcon } from './Icons.jsx';

export default function Boosters({ hud, onHammer, onShuffle, onHint, innerRef }) {
  return (
    <div className="boosters" ref={innerRef}>
      <button className={'boost' + (hud.hammerMode ? ' on' : '')} onClick={onHammer} disabled={hud.hammers <= 0} aria-label="망치">
        <HammerIcon /><span>망치</span><b>{hud.hammers}</b>
      </button>
      <button className="boost" onClick={onShuffle} disabled={hud.shuffles <= 0} aria-label="섞기">
        <ShuffleIcon /><span>섞기</span><b>{hud.shuffles}</b>
      </button>
      <button className="boost" onClick={onHint} aria-label="힌트">
        <HintIcon /><span>힌트</span>
      </button>
    </div>
  );
}
