# 2026-10-01 — 일반 UI 평면 스타일

후속 사용자 요청으로 강조 요소의 기존 색/효과를 복원했다. 이 문서는 최초 회색 스타일 적용 당시의 기록으로 보존하며, 현재 스타일은 [강조색 복원 기록](../2026-10-01-ui-accents/README.md)이 우선한다.

일반 UI만 TAPtoTEN의 현재 흰색·회색 스타일에 맞췄다. 게임 요소의 원래 색과 입체 효과는 유지했다. 소스 수정·검증 단계이며 **AAB 생성, commit, push, Play 업로드는 하지 않았다.**

[780×1688 전후 비교 갤러리](index.html)

## 변경 이유와 결과

기존 일반 UI에는 크림색 화면, 따뜻한 색 테두리, 녹색/주황색 버튼, 그라데이션과 입체 그림자가 섞여 있었다. 사용자 요청에 따라 일반 UI를 중립적인 평면 스타일로 통일했다. 게임의 컬러 요소를 회색으로 바꾸려는 작업은 아니다.

| 대상 | 적용 결과 |
| --- | --- |
| 화면 기본 배경 | 단색 흰색 `#ffffff` |
| 게임 선택·START·뒤로가기·일시정지·설정·결과 UI | 연한 회색 `#f5f6f8` |
| 일반 UI 테두리 | `#cdd2da` |
| 일반 UI 글자 | `#363c46` |
| 보조 설명 | `#626b78` |
| hover / 눌림·선택 | `#edf0f4` / `#dce1e8` |
| 일반 UI의 그라데이션·입체 그림자 | 제거 |
| 로고 | 이미지 원본은 유지, CSS 그림자만 제거 |

커버 전 스튜디오 화면도 흰 배경으로 바꿨다. 커버·로고·캐릭터·영상 이미지에 포함된 색과 그림자는 원본 그대로다. 일시정지/결과창 뒤의 어두운 배경막과 오답 시 붉은 경고 효과는 상태를 전달하므로 유지했다.

## 유지한 것

- 서체, 글자 크기·굵기·행간·자간, 버튼 크기·위치·비율과 화면 배치.
- 퍼즐 조각, PORTRAIT 이미지, POSITION 카드의 원래 색상·그라데이션·그림자.
- 회색 퍼즐의 부분 컬러 복원, 하트, 정답/오답 테두리, 정답 안내 빛과 카드 매칭 효과.
- 보관 중인 튜토리얼 반짝임, 게임 중 애니메이션과 영상 연출.
- 게임 규칙·콘텐츠·기록 비교와 저장 형식·패키지명·서명 키.
- 이전 Android 비율 유지 기능. 사용자용 배율 설정을 추가하지 않았다.

## 구현 범위

TAPtoTEN의 `tokens.css`, `title.css`, `overlay.css`, `game.css`는 읽기 전용 참고로 확인했다. TAPtoTEN과 원본 TAPtoTALK에는 쓰기 작업을 하지 않았다.

- `src/ui/styles/tokens.css`: 일반 UI 전용 `--ui-*` 색 토큰, 흰 기본 배경.
- `src/ui/styles/title.css`: 스튜디오/메인 배경, 선택 버튼의 평면 색, 로고 CSS filter 제거.
- `src/ui/styles/neutralUi.css`: 일반 UI만 대상으로 하는 마지막 색상 오버라이드. 폰트·레이아웃 선언이나 광범위한 button 초기화는 넣지 않았다.
- `src/main.ts`: 위 스타일을 기존 화면/효과 CSS 다음에 불러온다. 실행 로직은 변경하지 않았다.
- `src/ui/styles/talk.css`: 기존 게임 요소의 상속 색을 명시해 일반 UI 글자색 변경이 게임 효과로 번지지 않게 했다.
- `index.html`: 브라우저 theme-color를 흰색으로 변경.
- `public/legal/legal.css`: 설정에서 여는 정책/라이선스 문서의 색만 통일. 본문·서체·간격은 유지.

기존 border가 없던 UI에 테두리를 표시할 때는 안쪽 outline을 사용했다. 실제 border 폭을 추가해 버튼 크기가 바뀌는 것을 피했다.

## 전후 PNG

모든 이미지: **780×1688px PNG**. Chrome에서 390×844 CSS viewport, device scale factor 2로 촬영한 웹 화면이다. 기기 상태바를 합성하거나 실제 Android 앱 화면이라고 표시하지 않았다.

변경 전은 이번 작업을 시작할 때의 소스를 먼저 빌드해 보관한 정적 사본이다. 이전 작업의 미커밋 변경도 포함한 기준이며, 과거 Git HEAD와 비교한 것이 아니다. 변경 후는 이번 스타일 수정본이다. 양쪽 모두 동일한 무작위 시드·별도 테스트 저장소·같은 입력 순서로 촬영했다. 반복 장식 애니메이션의 비교 시점을 맞췄으며 실제 게임 코드는 수정하지 않았다.

| 화면 / 상태 | 변경 전 | 변경 후 |
| --- | --- | --- |
| 커버 전 스튜디오 로고 | [PNG](final/before/01-studio.png) | [PNG](final/after/01-studio.png) |
| 커버 | [PNG](final/before/02-cover.png) | [PNG](final/after/02-cover.png) |
| 게임 선택 | [PNG](final/before/03-menu.png) | [PNG](final/after/03-menu.png) |
| PUZZLE START | [PNG](final/before/04-start.png) | [PNG](final/after/04-start.png) |
| PUZZLE 플레이 | [PNG](final/before/05-puzzle.png) | [PNG](final/after/05-puzzle.png) |
| PUZZLE 정답 조각 선택 | [PNG](final/before/06-puzzle-correct.png) | [PNG](final/after/06-puzzle-correct.png) |
| 일시정지 | [PNG](final/before/07-pause.png) | [PNG](final/after/07-pause.png) |
| PUZZLE 결과·현재/최고기록 | [PNG](final/before/08-puzzle-result.png) | [PNG](final/after/08-puzzle-result.png) |
| PORTRAIT 플레이 | [PNG](final/before/09-portrait.png) | [PNG](final/after/09-portrait.png) |
| PORTRAIT 오답 경고·정답 안내 빛 | [PNG](final/before/10-portrait-wrong.png) | [PNG](final/after/10-portrait-wrong.png) |
| POSITION 닫힌 카드 | [PNG](final/before/11-position.png) | [PNG](final/after/11-position.png) |
| POSITION 정답 페어 | [PNG](final/before/12-position-matched.png) | [PNG](final/after/12-position-matched.png) |
| 설정 | [PNG](final/before/13-settings.png) | [PNG](final/after/13-settings.png) |
| 설정 선택 상태 | [PNG](final/before/14-settings-on.png) | [PNG](final/after/14-settings-on.png) |
| 개인정보처리방침 | [PNG](final/before/15-privacy.png) | [PNG](final/after/15-privacy.png) |

결과창의 시간은 자동 입력으로 만든 검증 기록이며 사람의 플레이 성과를 의미하지 않는다.

## 검증

- `npm test`: **35개 파일, 347개 테스트 통과**. 기존 규칙/저장/레이아웃 테스트와 새 스타일 경계 테스트를 포함한다.
- `npm run build`: TypeScript 검사와 Vite production build 성공.
- `tests/browser/neutral-ui.cjs`: 15개 화면의 DOM 좌표·크기·서체·글자 크기·굵기·행간·간격을 전후 비교했다. 위치/크기의 허용 오차는 0.1 CSS px이며 모두 통과했다.
- 동일 검사에서 게임 요소의 색·그라데이션·그림자·테두리·애니메이션과 보드 수를 비교해 모두 유지됨을 확인했다. 일반 UI의 평면 색/그림자 제거도 통과했다.
- 로고·커버·캐릭터·폰트·음원·영상 등을 포함한 빌드 에셋 **415개가 바이트 단위로 동일**하다.
- Vite가 생성한 파일명 해시 참조만 정규화했을 때 JavaScript `index`/`web` 번들의 실행 내용은 전후 동일하다.
- `tests/browser/native-frame.cjs`: Android 플랫폼을 브라우저에서 모의하고 화면 확대에 대응하는 5개 density 조건(2 / 2.4 / 3 / 3.6 / 4)의 기존 비율 유지 기능을 다시 확인했다. **110개 화면/터치 검사 및 5개 웹 크기의 전후 배치 비교를 통과**했다. 실제 Android OS의 설정을 변경한 검사는 아니다.
- `git diff --check`: 통과.
- 비교 갤러리(`node tests/browser/neutral-ui.cjs --gallery`)의 15개 섹션과 30개 PNG가 모두 로드되며, 원본 해상도와 파일 링크 및 JavaScript 오류 없음을 확인했다.

상세 근거: [화면·색·에셋 검증 JSON](final/verification.json) · [비율 유지 모의검사 JSON](final/frame-verification.json). 신규 회귀 테스트는 `tests/neutral-ui.test.ts`에 둔다. 캡처는 `tests/browser/neutral-ui.cjs`로 재현한다.

## 한계와 다음 단계

위 검증은 브라우저 기반이다. 실제 갤럭시 설치본과 OS 확대 설정 변경을 직접 확인한 결과는 아니다. 실제 기기 확인은 별도이며, 현재 보관된 1.0.3/code5 AAB에는 이번 스타일이 아직 포함되지 않는다.

AAB 재생성과 push는 사용자가 별도로 요청할 때 진행한다. 연구기록과 비교 갤러리는 게임 진입점에서 불러오지 않으므로 플레이 화면에 영향을 주지 않는다.
