# 사계농가

현실 시간의 하루를 봄·여름·가을·겨울로 나누어 농사짓고 집을 꾸미는 힐링 웹게임입니다.

## 주요 기능

- 현실 시간 기반의 네 계절과 사용자 지정 운영 시간
- 계절별 현실 작물 12종, 성장 시간·난이도 기반 가격
- 심기, 성장, 수확, 판매로 이어지는 농사 루프
- 3단계 집 증축, 6종 가구 구매 및 배치
- YouTube 링크를 이용한 농장 BGM
- 브라우저 자동 저장과 모바일 반응형 UI

자세한 규칙과 밸런스는 [GAME_DESIGN.md](./GAME_DESIGN.md)를 참고하세요.

## 실행

Node.js 22.13 이상이 필요합니다.

```bash
npm install
npm run dev
```

프로덕션 빌드:

```bash
npm run build
```

## Windows 데스크톱 위젯

브라우저 없이 독립 창으로 실행할 수 있습니다. 기본적으로 다른 창보다 위에 표시되며 `Ctrl+Shift+T`로 항상 위 표시를 켜거나 끌 수 있습니다.

```bash
npm run desktop
```

배포 가능한 단일 실행 파일 생성:

```bash
npm run desktop:package
```

완성된 실행 파일은 `release/Sagyefarm-Widget-0.1.0.exe`에 생성됩니다. 게임 진행 상황은 위젯 전용 로컬 저장소에 자동 저장됩니다.
