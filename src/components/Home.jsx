// 첫 화면: 제목, 모험 시작, 타임어택, 특수 보석 만드는 법
import { iconURL } from '../game/sprites.js';

// 'XXX', '.X.' 같은 글자로 3x3 모양 그림 만들기
function ShapeGrid({ rows }) {
  const cells = rows.join('').split('');
  return (
    <span className="shape" aria-label="모양 그림">
      {cells.map((ch, i) => <i key={i}>{ch === 'X' ? '🟦' : ''}</i>)}
    </span>
  );
}

const HOW_TO = [
  { icon: () => iconURL(3), body: <><b>네모 모양 4개</b> → 2×2로 모여도 반짝 사라져요!</> },
  { icon: () => iconURL(2, 'h'), body: <><b>4개 한 줄</b> → 줄 보석. 터지면 가로나 세로 한 줄이 싹!</> },
  {
    icon: () => iconURL(4, 'bomb'),
    body: <><ShapeGrid rows={['XXX', '.X.', '.X.']} /><ShapeGrid rows={['X..', 'X..', 'XXX']} /><b>모양 5개</b> → 폭탄 보석. 주변 3×3 펑!</>,
  },
  { icon: () => iconURL(0, 'rainbow'), body: <><b>5개 한 줄</b> → 무지개 보석. 바꾼 색 보석을 모두 지워요.</> },
  { icon: () => iconURL(5, 'v'), body: <><b>특수 보석끼리 바꾸기</b> → 십자 폭발, 메가 폭탄 같은 합체 기술!</> },
];

export default function Home({ save, onAdventure, onTimeAttack }) {
  return (
    <section className="screen">
      <div className="hero">
        <div className="gem-row">
          {[0, 1, 2, 3, 4, 5].map((t) => <img key={t} alt="" src={iconURL(t)} />)}
        </div>
        <p className="eyebrow">MATCH · COMBO · SHINE</p>
        <h1>별빛 보석<br />탐험대</h1>
        <p className="lede">같은 보석 3개를 한 줄로 맞추면 반짝! 콤보를 이어서 별 3개에 도전해 보세요.</p>
      </div>
      <div className="menu">
        <button className="btn primary" onClick={onAdventure}>
          모험 시작 <small>{save.unlocked > 1 ? `레벨 ${save.unlocked}까지 열림` : '레벨 1부터'}</small>
        </button>
        <button className="btn" onClick={onTimeAttack}>
          60초 타임어택 <small>최고 {save.best.toLocaleString('ko-KR')}점</small>
        </button>
      </div>
      <div className="howto">
        <h2>특수 보석 만드는 법</h2>
        <ul>
          {HOW_TO.map((item, i) => (
            <li key={i}><img alt="" src={item.icon()} /><span>{item.body}</span></li>
          ))}
        </ul>
      </div>
    </section>
  );
}
