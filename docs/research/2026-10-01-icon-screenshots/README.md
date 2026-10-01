# TAPtoTEST 앱 아이콘 교체와 최신 화면 7장

사용자가 제공한 노란 태피티피 캐릭터 이미지로 Android 설치 아이콘을 교체했다. 또한 기존 베이지 디자인의 참고 사진에 있는 화면 7장을 최신 흰색 기본 UI와 반응형 소스로 다시 캡처했다. 게임 규칙·기록 저장·앱 ID·서명 키는 변경하지 않았다.

## 다운로드 파일

[이미지 다운로드 페이지](../../../store/screenshots/2026-10-01/index.html)에서 개별 PNG를 받을 수 있다. [전체 ZIP](../../../store/TAPtoTEST-images-20261001.zip)에는 화면 7장과 [앱 아이콘 512 PNG](../../../store/taptotest-icon-512.png) 1장, 총 8개 이미지가 들어 있다.

| 순서 | 화면 | PNG 파일 |
| --- | --- | --- |
| 1 | 커버 | [01-cover.png](../../../store/screenshots/2026-10-01/01-cover.png) |
| 2 | 메인 게임 선택 | [02-main.png](../../../store/screenshots/2026-10-01/02-main.png) |
| 3 | PUZZLE 시작 | [03-puzzle-start.png](../../../store/screenshots/2026-10-01/03-puzzle-start.png) |
| 4 | PUZZLE 해피 당근 9조각 | [04-puzzle-play.png](../../../store/screenshots/2026-10-01/04-puzzle-play.png) |
| 5 | PORTRAIT 시작 | [05-portrait-start.png](../../../store/screenshots/2026-10-01/05-portrait-start.png) |
| 6 | PORTRAIT 피노팬 2×2 | [06-portrait-play.png](../../../store/screenshots/2026-10-01/06-portrait-play.png) |
| 7 | POSITION 2×2 시간초과 영상 | [07-position-try-again.png](../../../store/screenshots/2026-10-01/07-position-try-again.png) |

모든 화면은 780×1688px이다. Chrome에서 Android 플랫폼과 위 24px·아래 48px 안전영역을 모의하고 실제 화면 전환과 터치로 캡처했다. 마지막 화면만 테스트 시계를 빠르게 진행해 실제 시간초과를 발생시켰다. 게임 상태·문구·이미지·결과를 임의로 바꾸지 않았다. OS 상태바나 내비게이션바를 합성하지 않았으며 실제 설치 기기에서 얻은 캡처는 아니다.

## 아이콘 변경

기존 생성기는 흰 배경에 로고를 작게 배치하는 방식이었다. 새 이미지는 배경까지 포함된 정사각형에 가까운 그림이므로 일반 설치 아이콘과 스토어 아이콘은 전체 면을 채우고, adaptive 아이콘은 노란 배경 위에 72dp 그림을 중앙 배치한다. 기기별 원형·모서리 마스크는 Android가 적용한다.

- 제공 원본 2134×2135px는 [Tepee-icon-06.png](../../../assets/launcher/Tepee-icon-06.png)로 그대로 보관한다. 크롭·재채색·AI 편집을 하지 않았다.
- [기존 아이콘](icon-before.png)과 [새 아이콘](icon-after.png), [원형 미리보기](icon-circle-preview.png), [둥근 사각형 미리보기](icon-rounded-preview.png)를 보관했다. 마스크 미리보기는 실제 런처 검증을 대체하지 않는다.
- [생성 스크립트](../../../scripts/generate-android-icons.cjs)는 5개 해상도의 일반·원형·adaptive 전경 PNG 15개와 스토어 PNG를 만든다. [매니페스트](../../../store/taptotest-icon-manifest.json)에 원본 및 생성물의 SHA256을 기록한다.
- 이전 원본과 과거 AAB·화면은 삭제하거나 덮어쓰지 않았다. 현재 스토어 아이콘과 Android launcher 리소스만 요청한 이미지로 교체했다.

## 검증과 배포 상태

354개 Vitest 테스트와 TypeScript·Vite 빌드가 통과했다. 테스트는 두 adaptive XML 연결, 노란 배경, 원본·생성물 SHA256, 16개 PNG 크기를 확인한다. 화면 7장의 해상도와 이미지 로딩을 검사했고 JavaScript 오류는 없었다. 실제 화면의 잘림·간격 및 아이콘 마스크는 눈으로 확인했다. [캡처 검증](verification.json), [재현 스크립트](capture.cjs)를 함께 보관한다.

AAB 생성·버전 증가·Capacitor sync·commit·push·Google Play 업로드는 하지 않았다. 기존 1.0.4/code6 AAB에는 이번 아이콘과 앞선 반응형 수정이 포함되지 않는다. 설치 아이콘을 실제 앱에 반영하려면 추후 새 AAB를 만들어 업데이트해야 한다. 이 연구기록과 스토어용 캡처 파일은 게임 실행 코드에서 불러오지 않는다.
