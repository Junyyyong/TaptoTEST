# TAPtoTEST 리액션 배경과 상단 버튼 정렬

2026년 10월 1일, TRY AGAIN 화면의 위아래 흰 여백과 화면 전환 시 뒤로가기 위치가 달라지는 문제를 수정했다. 어두운 배경만 창 전체로 확장하고, START·게임·Settings의 상단 버튼은 같은 기준선에 맞췄다.

## 문제와 수정

리액션은 안전영역 안의 게임 캔버스만 어둡게 칠하고 있었다. 780×1688 캡처에서 상단 48px·하단 96px가 흰색으로 남았다. 이제 배경을 별도 장식 레이어로 분리해 네이티브 시스템 바와 겹치는 WebView 영역까지 덮는다. 성공·실패 영상 모두 적용하며 기존 투명도와 260ms 페이드를 유지한다. 영상은 계속 비율을 보존하고, 문구·Continue·터치 영역은 안전영역 안에 남긴다.

START의 좌우 패딩은 18px, Settings의 HUD 내부 패딩은 8px, 게임의 좌우 패딩은 10px로 서로 달랐다. 이제 본문의 간격은 그대로 두고 상단 HUD만 공통 레일에 배치한다. 레일은 좌우 최소 10px 안전 여백과 최대 560px 너비를 사용하며, 뒤로가기와 일시정지는 각각 양 끝에 정렬한다. 40px 버튼 크기·색·서체·세로 기준선은 유지한다. 화면 확대 설정에 따른 기존 정규화도 유지한다.

## 전후 화면

[전후 비교 갤러리](index.html)에서 START 3종, 게임 3종, Settings, PUZZLE 성공 영상, POSITION 시간초과 영상을 비교할 수 있다. 원본 PNG는 각 780×1688이며 이전 캡처·다운로드 묶음은 덮어쓰지 않았다.

- [수정 전 TRY AGAIN](screens/before/position-try-again.png)
- [수정 후 TRY AGAIN](screens/after/position-try-again.png)
- [수정 후 PUZZLE 시작](screens/after/unit-start.png)
- [수정 후 PUZZLE 플레이](screens/after/unit-play.png)

## 검증과 제한

`npm test` 357개와 production build를 검증했다. [브라우저 검증 기록](screens/verification.json)은 실제 UI 터치로 성공·시간초과를 실행하고, 휴대폰·긴 화면·짧은 화면·태블릿·가로 창·비대칭 안전영역·웹의 배치를 확인한다. OS density 2와 4를 모의한 동일 해상도에서도 버튼 위치와 크기가 유지되는지 검사한다.

전후 비교에서 버튼 이외의 본문·게임 보드·영상·문구·Continue의 위치와 크기가 그대로인지 검사하고, 성공·실패 PNG의 네 모서리가 흰색에서 어두운 색으로 바뀌었는지 픽셀로 확인한다. Continue로 결과창에 정상 진입하는 동작도 확인한다.

이는 Chrome의 Android 플랫폼·안전영역 모의 검증이다. 실제 설치 기기의 시스템 바·WebView 검증을 대신하지 않으며 AAB·native sync·버전 변경·commit·push는 수행하지 않았다. 게임 규칙·기록·패키지명·미디어 파일은 수정하지 않았다.

검증 재실행은 수정 전 build를 별도 폴더에 보관한 뒤 `BASELINE_WEB`과 새 `REACTION_REPORT_DIR`를 지정해 `tests/browser/reaction-hud.cjs`를 실행한다. 실행 환경에는 Playwright·Sharp·Chrome이 필요하다. 이전 보고서 폴더는 보호한다.
