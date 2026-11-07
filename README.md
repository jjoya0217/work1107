# 별빛 보석 탐험대 (React 버전)

같은 보석을 맞춰 없애는 매치-3 퍼즐 게임입니다. v1.0(HTML 파일 하나)을 React + Vite 로 옮긴 버전입니다.

## 실행하기

Node.js 가 필요합니다.

```bash
npm install      # 처음 한 번: 필요한 프로그램 내려받기
npm run dev      # 개발용 실행 → 브라우저에서 http://localhost:5173
npm run build    # 배포용 파일 만들기 → dist 폴더
```

## 폴더 구조

```
src/
  main.jsx            앱 시작점
  App.jsx             화면 전환(첫 화면/지도/게임)과 팝업
  styles.css          디자인
  components/         화면 부품 (React)
    Home.jsx          첫 화면
    LevelMap.jsx      모험 지도
    GameScreen.jsx    게임 화면 (엔진과 연결)
    Hud.jsx           남은 이동·목표·점수 막대
    Boosters.jsx      망치·섞기·힌트 버튼
    Modal.jsx         팝업
    Icons.jsx         버튼 아이콘
  game/               게임 규칙과 그리기 (React 와 무관)
    engine.js         게임판 진행, 애니메이션, Canvas 그리기
    board.js          맞은 보석 찾기, 움직일 수 있는 수 찾기
    levels.js         레벨 1~30 설계
    sprites.js        보석 그림
    sound.js          효과음
    storage.js        기록 저장
    constants.js      공통 값
```

게임 규칙과 기능은 [PRD.md](PRD.md)를 참고하세요.
