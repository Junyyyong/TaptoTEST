# TAPtoTEST 1.0.2/code3 후보 — 기존 서체 유지와 Android 안전영역

> **보존용 미배포 후보다. 최종 전달 파일로 사용하지 않는다.** 추가 교차검토에서 native inset 값이 0일 때도 우선해야 함을 확인해 code4로 보완했다. [최신 결과·파일·검증은 여기](native-priority/README.md). 아래의 `max(env,var)` 정책과 `final/`은 code3 후보 당시의 기록이며, code4의 정책/최종 캡처는 `native-priority/`에 별도로 보관한다. code3 AAB나 기존 스크린샷을 덮어쓰지 않았다.

## 승인된 기준

기존 연구 스크린샷의 글자·그림 비례를 기준으로 삼는다. 사용자 선택에 따라 **OS/기기 기본 서체를 유지**하고, 기존에 명시적으로 사용하던 동봉 Noto Sans/Serif만 보존한다. 기기에 따라 시스템 서체의 모양은 달라질 수 있다.

검토 중 제안했던 전역 Noto 적용, 18px/600 등 임의의 작은 글씨, 임의의 줄 높이·작은 로고, 추가 폰트 preload는 취소했다. 현재 변경에는 포함하지 않는다. 이전 1.0.1의 설치 아이콘과 Android `setTextZoom(100)` 정책은 유지한다.

- 기존 기본 글꼴: `Apple SD Gothic Neo`, `Noto Sans KR`, `Malgun Gothic`, `system-ui`, `sans-serif`.
- 메뉴 이름 21px/800, 설명 13px/700. 기존 높이 700px 이하 분기 19px/800·12px/700도 그대로다.
- START 제목 26px/900, 설명 14px/700, 캐릭터 이름의 `TAP Serif KR`, 결과 숫자의 `TAP Sans KR` 모두 그대로다.
- `src/core/pick/`, 캐릭터/미디어 목록, 기록·설정 저장 코드/키, `public/assets/fonts/`, 앱 ID와 기존 업로드 키는 바꾸지 않았다.

## 새 AAB

- 전달 파일: [`android/releases/TAPtoTEST-1.0.2-code3-20261001.aab`](../../../android/releases/TAPtoTEST-1.0.2-code3-20261001.aab)
- 절대 경로: `/Users/scdi/Documents/ChatGPT/TaptoPick/android/releases/TAPtoTEST-1.0.2-code3-20261001.aab`
- 별도 보관본: `.android-tools/releases/2026-10-01/TAPtoTEST-v1.0.2-code3.aab` — 전달본과 동일한 바이트.
- **versionName 1.0.2 / versionCode 3**, 앱 ID `io.github.junyyyong.taptotest`, minSdk 24 / targetSdk 36.
- 크기 **102,681,100 bytes**.
- SHA-256: `f43df7b0fcc5c4635bbb8185346b1735c33e80ad43eed835300103867813a10a`.
- 기존 업로드 인증서 SHA-256: `93381e4bf0cc519b6540750e006b87b3e5e9db721390abda3a6e6ae83fb777dc`.
- 이전 code1·code2 AAB의 해시가 그대로임을 확인했고 덮어쓰지 않았다. 전달 폴더와 개인 서명 파일은 Git 제외다.

## 문제 → 수정 → 확인

| 문제 | 수정 | 확인 |
| --- | --- | --- |
| 고정된 화면 높이 계산만으로는 상·하단 시스템 바와 실제 HUD/그림/단계 표시 높이를 모두 반영하지 못함 | 실제 보드 시작 위치와 화면의 사용 가능한 하단, 보드 아래 단계 표시 높이를 측정하여 기존 보드 크기에 상한만 추가 | 같은 해피 9조각·태피 12조각 및 각 모드의 모든 보드 단계 검사. 390×844, 가상 상단 24/하단 48 조건에서 해피 보드는 370→357 CSS px로 제한되어 하단 안전영역을 침범하지 않음 |
| WebView의 `env(safe-area-inset-*)`와 Capacitor의 `--safe-area-inset-*` 공급 방식 차이 | 두 값의 **최댓값**을 공통 안전영역으로 사용. 합산하지 않음 | env만/변수만/둘 다/둘 다 0의 네 경로 검사. 같은 값을 두 번 더하지 않음 |
| 작은 화면에서 로고가 메뉴와 겹치거나 Settings 아래 음악 안내가 잘릴 수 있음 | 공간이 부족할 때만 원래 로고/글자 크기를 유지한 자연스러운 세로 배치와 스크롤로 전환. 음악 안내가 표시될 때 하단 공간 확보 | 320×568 및 375/390/412 폭 × 660/700/701/844/932 높이. 스크롤 화면은 각 버튼을 실제로 스크롤해 안전영역 안에서 접근 가능한지 검사 |
| 팝업·영상 Continue·정책 문서가 시스템 바 영역을 사용할 수 있음 | 기존 여백과 안전영역 중 큰 쪽을 사용하고 결과/일시정지/정책 문서의 최대 높이를 가용 높이로 제한 | START 3종, Settings, Privacy/Licenses, Pause, 실패 영상과 결과까지 704개 화면·크기·inset 조합 통과 |

**전체 화면을 축소하거나 서체를 바꿔 맞춘 작업이 아니다.** 공간이 충분한 390×844 무인셋 기준에서는 9가지 게임 보드와 해당 제시 그림의 위치·크기가 이전 AAB와 정확히 같다. 공간이 부족한 경우에만 보드 상한 또는 메뉴 스크롤이 동작한다. 가로가 긴 창·모든 Android 기기 조합을 보장하는 검증은 아니다.

## 기준 자료와 비교 방법

- 실제 비교 기준: 이전에 전달한 **1.0.1/code2 AAB**의 `base/assets/public`을 임시 폴더에 추출. SHA-256 `fa8db9a9d3dad8aad4a0c97e2a8abf9f054dd65df2c520432052eee477be5d06`.
- 코드 기준 HEAD: `783968f77f156b8a2c26f4501ab9832bd5eed30f`. 이번 빌드는 미커밋 수정본을 포함한다.
- 디자인 확인 자료: [9월 30일 정상 배율 UI](../2026-09-30-android-text-icons/README.md), [9월 29일 동일 해피·태피 그림](../2026-09-29-puzzle-difficulty/README.md), [정책 문서 최종 화면](../2026-09-30-play-policy/README.md), `presentation/2026-09-21/taptotest-design-guide/`.
- 격리 Chrome, CSS 390×844 / DPR 2, **PNG 780×1688**. 저장소·음악·효과음·진동·테스트용 난수 시드를 동일하게 설정했다. 앱의 저장소나 난수 규칙은 바꾸지 않았다.
- 이름만 같은 다른 퍼즐을 비교하지 않는다. 번들 이미지 파일로 식별한 **원래 Ha 3×3 정방형**과 **원래 Tapee 3×4 세로형**을 각각 동일 그림끼리 비교한다.
- 게임 완주·실패는 실제 버튼 클릭으로 진행했다. 캡처에 보이는 시간/기록은 자동화 테스트 결과이며 사람의 수행 기록이나 연구 실험 데이터가 아니다.
- `insets-sim`은 **가상 상단 24px/하단 48px**의 브라우저 시뮬레이션이다. 실제 사용자 휴대폰의 측정값이나 Android 시스템 바 캡처가 아니다.
- CDP로 계산된 폰트 크기·굵기·줄 높이 및 실제 사용된 폰트를 비교했다. 내부 가변 폰트 이름에 Thin/ExtraLight가 포함되어도 CSS 적용 굵기는 보고서의 800 등으로 별도 기록된다.
- 기존 How to Play는 현재 진입점에서 제거된 보관용 기능이다. 이번 검증을 위해 다시 노출하거나 게임 흐름을 바꾸지 않았다.

## 최종 780×1688 화면

`final/`이 최종 소스의 전후 비교다. `attempt-1/`은 메뉴 보완 전의 첫 통과 기록으로 보존하며 최종 결과로 혼용하지 않는다. `surface-verification.json`의 음악 안내 실패 36건은 숨기지 않고 남겼고, 수정 후 `surface-verification-2.json`에서는 실패 0건이다.

| 화면 | 이전 | 수정 후 |
| --- | --- | --- |
| 첫 스튜디오 로고 | [PNG](final/before-studio.png) | [PNG](final/after-studio.png) |
| 커버 | [PNG](final/before-cover.png) | [PNG](final/after-cover.png) |
| 메뉴, 정상 | [PNG](final/before-menu.png) | [PNG](final/after-menu.png) |
| 메뉴, 가상 안전영역 | [PNG](final/before-menu-insets-sim.png) | [PNG](final/after-menu-insets-sim.png) |
| PUZZLE START | [PNG](final/before-unit-start.png) | [PNG](final/after-unit-start.png) |
| 해피 9조각, 정상 | [PNG](final/before-puzzle-Ha.png) | [PNG](final/after-puzzle-Ha.png) |
| 해피 9조각, 가상 안전영역 | [PNG](final/before-puzzle-Ha-insets-sim.png) | [PNG](final/after-puzzle-Ha-insets-sim.png) |
| 태피 12조각, 정상 | [PNG](final/before-puzzle-Tapee.png) | [PNG](final/after-puzzle-Tapee.png) |
| 태피 12조각, 가상 안전영역 | [PNG](final/before-puzzle-Tapee-insets-sim.png) | [PNG](final/after-puzzle-Tapee-insets-sim.png) |
| PORTRAIT START | [PNG](final/before-portrait-start.png) | [PNG](final/after-portrait-start.png) |
| PORTRAIT 5×5, 가상 안전영역 | [PNG](final/before-portrait-25-insets-sim.png) | [PNG](final/after-portrait-25-insets-sim.png) |
| POSITION START | [PNG](final/before-position-start.png) | [PNG](final/after-position-start.png) |
| POSITION 6×6, 가상 안전영역 | [PNG](final/before-position-6-hidden-insets-sim.png) | [PNG](final/after-position-6-hidden-insets-sim.png) |
| Pause | [PNG](final/before-pause.png) | [PNG](final/after-pause.png) |
| PUZZLE 영상 | [PNG](final/before-puzzle-video-insets-sim.png) | [PNG](final/after-puzzle-video-insets-sim.png) |
| PUZZLE 결과 | [PNG](final/before-puzzle-result-insets-sim.png) | [PNG](final/after-puzzle-result-insets-sim.png) |
| PORTRAIT 결과 | [PNG](final/before-portrait-result-insets-sim.png) | [PNG](final/after-portrait-result-insets-sim.png) |
| POSITION 결과 | [PNG](final/before-position-result-insets-sim.png) | [PNG](final/after-position-result-insets-sim.png) |
| 실패 영상 | [PNG](final/before-failure-video-insets-sim.png) | [PNG](final/after-failure-video-insets-sim.png) |
| 실패 결과 | [PNG](final/before-failure-result-insets-sim.png) | [PNG](final/after-failure-result-insets-sim.png) |
| Settings | [PNG](final/before-settings-insets-sim.png) | [PNG](final/after-settings-insets-sim.png) |
| Privacy | [PNG](final/before-privacy-insets-sim.png) | [PNG](final/after-privacy-insets-sim.png) |
| Licenses | [PNG](final/before-licenses-insets-sim.png) | [PNG](final/after-licenses-insets-sim.png) |

같은 폴더에 PORTRAIT 2×2/3×3/4×4 및 POSITION 2×2/4×4 미리보기·카드 뒷면, 모드별 완료 영상도 보관한다.

## 검증과 한계

- `npm test`: **33개 파일 / 337개 테스트 통과**.
- `npm run cap:sync`: TypeScript·Vite 프로덕션 빌드·Android 웹 자산 동기화 통과.
- [화면/폰트/실제 플레이 검증](final/verification.json), [704개 추가 화면 검사](surface-verification-2.json), [서명/번들 검증](release-verification.json).
- 최종 캡처 **76장**, 게임 레이아웃 비교 **180건**, 추가 화면 검사 **704건**, 페이지 오류 0건. 26개 대표 UI 선택자의 계산된 글꼴 속성과 실제 적용 서체가 이전/이후 일치했다. 정상 390×844의 9개 게임 보드 및 제시 그림 위치·크기 일치도 자동 검사했다.
- `check-android-text-zoom.cjs`: 실제 MainActivity 소스와 JVM 대역으로 시작·복귀·설정 변경, 1/1.3/2/3 글자 배율, 지연 콜백, null/교체된 뷰, OS 설정 불변 통과. **실제 WebView 엔진 테스트는 아니다.**
- 오프라인 Gradle `bundleRelease` 성공. 기존 flatDir·SDK XML 버전·차기 Gradle 호환성 경고는 있으나 실패는 없다.
- bundletool validate·manifest·버전·앱 ID 검사 통과. Java JarFile로 **866개 payload 서명**이 기존 인증서와 일치하고 **437개 웹 자산**이 현재 dist와 바이트 일치함을 확인했다. 아이콘 15개 픽셀·adaptive 연결·DEX의 `setTextZoom(100)`/라이프사이클 콜백·정책 문서 포함 검사 통과. 개인 키/비밀번호 파일은 번들에 포함되지 않았다.
- `adb devices -l`: 연결된 Android 기기 없음. **실제 기기 설치, 큰 글씨/전체 화면 확대, 시스템 바, 구버전→신버전 업데이트 및 기록 유지 검증은 아직 하지 않았다.**
- 개인정보/라이선스 문서와 게임 규칙·미디어·서체 파일을 변경하지 않았다. 키/비밀번호는 Git 제외 파일로 유지한다.
- commit/push/Google Play 업로드를 하지 않았다. 다른 게임 프로젝트는 수정하지 않았고 TEN에 이미 있는 JDK·Gradle·bundletool 실행파일만 읽기 사용했다. 캐시·빌드 출력은 TAPtoTEST에 둔다.

## 재현 도구

- [전후 비교/플레이/폰트 캡처](check.cjs): 이전 AAB의 `base/assets/public` 디렉터리를 `BASELINE_WEB`, 새 출력 폴더를 `CAPTURE_OUT`으로 지정한다. 기존 폴더를 덮어쓰지 않는다.
- [기타 화면·네 경로 inset 검사](check-surfaces.cjs): `SURFACE_REPORT`에 새 보고서 경로 지정. 메뉴 음악 안내의 배치 검사는 기존 버튼의 hidden만 해제한 **명시적인 UI fixture**이며 자동 재생 허가/음악 재생을 검증한 것은 아니다.
- [원본 서체/측정 계산 테스트](../../../tests/pick-layout.test.ts), [Android 검증](../../../scripts/verify-android-release.cjs).
- sharp/playwright는 기존 제공 런타임으로 실행한다. 앱 의존성을 추가하지 않았다.

## 출시명과 영문 업데이트 노트

출시명: **1.0.2 - Screen Layout Update**

```text
<en-US>
- Improved screen layout around Android system bars.
- Adjusted boards to fit the available screen space.
- Made menu controls accessible on shorter screens.
- Preserved the existing typography, artwork, game rules, and saved-data format.
</en-US>
```

한글 뜻: Android 시스템 바 주변 배치를 보완하고, 보드를 실제 남은 공간에 맞추며, 작은 화면에서도 메뉴 버튼에 접근할 수 있게 했다. 기존 서체·그림·게임 규칙·저장 형식은 유지했다.

Play Console에는 접속하거나 업로드하지 않았다. versionCode 3은 로컬 보관본 1·2 다음의 새 코드다. **스토어에서 이미 사용했는지는 업로드 전에 별도로 확인**해야 한다. 실제 테스트는 기존 앱을 삭제하거나 데이터를 지우지 않고 업데이트하여 수행한다.
