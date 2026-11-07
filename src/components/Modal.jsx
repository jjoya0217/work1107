// 팝업: 레벨 클리어, 실패, 시간 끝, 일시정지
import { useEffect, useRef } from 'react';

export default function Modal({ title, body, stars, buttons }) {
  const btnsRef = useRef(null);
  useEffect(() => {
    const first = btnsRef.current && btnsRef.current.querySelector('button');
    if (first) first.focus();
  }, [title]);
  return (
    <div className="modal">
      <div className="card" role="dialog" aria-modal="true" aria-label={title}>
        <div className="m-stars">
          {stars != null && [0, 1, 2].map((i) => <span key={i} className={i < stars ? 'on' : ''}>★</span>)}
        </div>
        <h2>{title}</h2>
        <p>{body}</p>
        <div className="m-btns" ref={btnsRef}>
          {buttons.map((b) => (
            <button key={b.label} className={'btn' + (b.primary ? ' primary' : '')} onClick={b.onClick}>{b.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
