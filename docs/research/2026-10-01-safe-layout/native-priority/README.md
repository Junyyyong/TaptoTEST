# TAPtoTEST 1.0.2/code4 — 최종 안전영역 보완

**이번 전달 파일은 code4다.** 상위 폴더의 code3는 미배포 후보로 보존하며 업로드용으로 사용하지 않는다. 기존 AAB와 캡처를 덮어쓰지 않았다.

## 전달 파일

- [TAPtoTEST-1.0.2-code4-20261001.aab](../../../../android/releases/TAPtoTEST-1.0.2-code4-20261001.aab)
- 절대 경로: `/Users/scdi/Documents/ChatGPT/TaptoPick/android/releases/TAPtoTEST-1.0.2-code4-20261001.aab`
- 보관본: `.android-tools/releases/2026-10-01/TAPtoTEST-v1.0.2-code4.aab` — 전달본과 바이트 동일.
- versionName **1.0.2**, versionCode **4**, applicationId **`io.github.junyyyong.taptotest`**.
- minSdk 24 / targetSdk 36, **102,681,100 bytes**.
- AAB SHA-256: `d8ff29f83f1c0044c8b55e57466a20092a294f3a3c91e8782e8ff3395f883a5a`.
- 기존 업로드 인증서 SHA-256: `93381e4bf0cc519b6540750e006b87b3e5e9db721390abda3a6e6ae83fb777dc`.
- 기준 HEAD `783968f77f156b8a2c26f4501ab9832bd5eed30f` + 승인된 미커밋 변경을 포함한다.
- **commit/push/Play 업로드 없음. 실제 Android 기기 테스트 없음.** 로컬에서는 code1·2·3 다음의 새 코드이며, Play Console의 사용 이력에는 접속하지 않았으므로 업로드 전 code4 미사용 여부를 별도로 확인한다.

## 유지한 디자인과 동작

기존 OS 서체 및 명시적 Noto Sans/Serif, 원래 CSS 글자 크기·굵기·줄 높이, 로고/제시 그림 비례를 유지했다. 임의 18px/600 등 축소안과 전역 폰트 통일은 취소했다. 사용자 기기의 시스템 서체에 따라 모양이 달라질 수 있다.

기존 화면의 보드 선호 크기는 유지하되 실제 HUD/그림/단계 표시와 안전영역을 제외한 공간이 더 작을 때만 보드에 상한을 적용한다. 작은 메뉴에서 그림/음악 안내가 겹치거나 잘리는 경우에는 원래 크기로 스크롤 배치를 제공한다. START·설정·Pause·영상 Continue·결과·정책 문서도 안전영역을 반영한다.

이전 1.0.1의 아이콘과 native `setTextZoom(100)`은 유지한다. 앱 ID, 업로드 키, 저장소/키/기록 비교 규칙, 게임 규칙·캐릭터·영상·음악·폰트 파일은 변경하지 않았다. 원본 TAPtoTALK과 다른 게임 저장소는 수정하지 않았다.

## 교차검토에서 추가로 찾은 문제

설치된 Capacitor 8.5의 `SystemBars.java`를 확인했다.

- WebView 140 이상 + `viewport-fit=cover`: 네이티브 padding을 비우고 WebView inset과 CSS 변수를 공급한다.
- 다른 경로: Android 15 이상에서는 시스템 바 padding을 네이티브에 적용하고, 전달 inset을 0으로 만든 뒤 CSS 변수도 0으로 공급한다.
- 따라서 **native CSS 변수의 명시적 0은 “값 없음”이 아니라 “CSS에서 추가 여백 불필요”**라는 값이다.

code3의 `max(env,var)`는 native 0 또는 더 작은 값을 무시할 수 있어 다음 방식으로 바꿨다. 이는 로컬 소스와 브라우저 조합 검증에 근거한 예방적 보완이며 실제 사용자 기기에서 env 잔류 현상을 재현했다는 주장은 아니다.

```css
--app-safe-top: var(--safe-area-inset-top, env(safe-area-inset-top, 0px));
```

오른쪽·아래쪽·왼쪽도 같다. **native 값 우선 → 변수가 없을 때만 env → 둘 다 없으면 0**이며 최댓값이나 합산을 사용하지 않는다. TEN과 같은 우선순위다.

## 명시적으로 검증한 6가지 경로

각 값은 CSS px이며 실제 휴대폰의 측정치가 아닌 브라우저 시뮬레이션이다.

| 조건 | env 상/하 | native 변수 상/하 | 적용 기대값 상/하 |
| --- | --- | --- | --- |
| 없음 | 0 / 0 | 변수 제거 | 0 / 0 |
| env만 | 24 / 48 | 변수 제거 | 24 / 48 |
| native만 | 0 / 0 | 24 / 48 | 24 / 48 |
| 둘 다 같은 값 | 24 / 48 | 24 / 48 | 24 / 48 |
| native에서 이미 처리 | 24 / 48 | **0 / 0** | **0 / 0** |
| native가 더 작은 값 | 24 / 48 | **10 / 20** | **10 / 20** |

320×568, 그리고 375/390/412 폭 × 660/700/701/844/932 높이의 16개 크기에서 12종 화면 × 6경로 = **1,152건**을 검사했다. 매번 실제 계산된 화면 padding이 위 기대값과 정확히 같은지 검사하며, native=0인 결과는 inset이 없는 화면과 위치·크기가 같아야 한다. 메뉴가 스크롤 모드일 때는 각 버튼을 실제로 스크롤해서 안전영역 안에서 접근 가능한지 확인했다.

검사 화면: 메뉴, 음악 안내, Settings, Privacy, Licenses, START 3종, PORTRAIT 보드, Pause, 실패 영상, 결과. 음악 안내 배치는 기존 버튼의 hidden만 해제한 **UI fixture**이며 자동 재생 허가나 오디오 재생 검증이 아니다.

## 검사 결과

- `npm test`: **33개 파일 / 338개 테스트 통과**. native 0 우선 CSS 계약 검사를 추가했다.
- `npm run cap:sync`: TypeScript·Vite·Android 웹 자산 동기화 통과.
- [6경로 1,152개 화면 검사](surface-verification-2.json): 실패 0, 페이지 오류 0.
- [최종 전후 캡처·서체·실제 플레이 검사](final/verification.json): 390×844 / DPR2의 **780×1688 PNG 76장**, 게임 레이아웃 비교 **180건**. 실제 버튼 클릭으로 PUZZLE 완성, PORTRAIT 4단계 완주/오답 실패, POSITION 3단계 완주를 확인한다.
- 같은 해피 9조각 정방형·같은 태피 12조각 세로형을 비교한다. 정상 무인셋 390×844에서 9개 보드 및 해당 제시 그림의 위치·크기가 이전 code2 AAB와 일치한다. 대표 UI 26곳의 글꼴·크기·굵기·줄 높이·실제 적용 서체도 동일하다.
- Gradle 오프라인 `bundleRelease` 성공. 기존 flatDir·SDK XML·차기 Gradle 호환성 경고는 남아 있다.
- [서명/번들 검증](release-verification.json): bundletool validate, manifest/ID/버전/fontScale, 아이콘 15개 픽셀/adaptive 연결, DEX의 `setTextZoom(100)` 및 라이프사이클 콜백 통과.
- Java JarFile로 **866개 payload 서명**이 기존 인증서와 일치하고 **437개 웹 자산**이 최신 dist와 바이트 일치함을 확인했다. 개인 키/비밀번호 파일 포함 없음. 정책/라이선스도 현재 소스와 일치한다.
- 이전 code1/code2 및 code3 후보의 SHA-256이 변하지 않았음을 확인했다. 재사용/덮어쓰기 없이 code4 파일을 별도로 보관했다.
- 실제 MainActivity를 사용한 JVM 대역의 글자 배율/시작/복귀/설정 변경 검사는 앞 단계에서 통과했으며 MainActivity는 이후 변경하지 않았다. 실제 WebView 엔진 검증을 대체하지 않는다.

### 재시도 내역을 숨기지 않고 보존

- `surface-verification.json`: 최초 1,152건 검사에서 native 0 대조 시 텍스트 폭 차이 4건. 첫 폰트 로딩 전/후를 섞어 측정한 것을 확인하고, 앱 코드를 바꾸지 않고 검사에 `document.fonts.ready` 및 이미지 decode 대기를 추가했다. 재검사는 `surface-verification-2.json`에 저장했다.
- `screenshots/verification.json`: 이전 code2 기준 화면의 PORTRAIT 자동 플레이 중 시간 기반 대기가 실제 라운드 전환보다 먼저 끝나 캡처가 중단됐다. 최종 성공 자료가 아니다. 테스트를 “정답 수 증가 및 제시 그림 교체”라는 실제 상태를 기다리도록 보완하고 `final/`로 새로 캡처했다. 게임 규칙/시간은 바꾸지 않았다.
- 상위 `attempt-1/`, `final/`, 최초 704건 보고서, code3 AAB는 모두 별도 역사 기록으로 보존한다.

## 최종 화면 바로 보기

안전영역 이미지는 가상 상단 24/하단 48 조건이다. OS 시스템 바를 실제 촬영한 것이 아니다. 화면에 표시된 시간·기록은 자동화 플레이 결과이며 사람의 수행 기록으로 사용하면 안 된다.

| 화면 | 이전 code2 | 최종 code4 |
| --- | --- | --- |
| 스튜디오 로고 | [PNG](final/before-studio.png) | [PNG](final/after-studio.png) |
| 커버 | [PNG](final/before-cover.png) | [PNG](final/after-cover.png) |
| 메뉴 | [PNG](final/before-menu.png) | [PNG](final/after-menu.png) |
| 메뉴·안전영역 | [PNG](final/before-menu-insets-sim.png) | [PNG](final/after-menu-insets-sim.png) |
| PUZZLE START | [PNG](final/before-unit-start.png) | [PNG](final/after-unit-start.png) |
| 동일 해피 9조각·안전영역 | [PNG](final/before-puzzle-Ha-insets-sim.png) | [PNG](final/after-puzzle-Ha-insets-sim.png) |
| 동일 태피 12조각·안전영역 | [PNG](final/before-puzzle-Tapee-insets-sim.png) | [PNG](final/after-puzzle-Tapee-insets-sim.png) |
| PORTRAIT START | [PNG](final/before-portrait-start.png) | [PNG](final/after-portrait-start.png) |
| PORTRAIT 5×5 | [PNG](final/before-portrait-25-insets-sim.png) | [PNG](final/after-portrait-25-insets-sim.png) |
| POSITION START | [PNG](final/before-position-start.png) | [PNG](final/after-position-start.png) |
| POSITION 6×6 | [PNG](final/before-position-6-hidden-insets-sim.png) | [PNG](final/after-position-6-hidden-insets-sim.png) |
| Pause | [PNG](final/before-pause.png) | [PNG](final/after-pause.png) |
| 영상 | [PNG](final/before-puzzle-video-insets-sim.png) | [PNG](final/after-puzzle-video-insets-sim.png) |
| PUZZLE 결과 | [PNG](final/before-puzzle-result-insets-sim.png) | [PNG](final/after-puzzle-result-insets-sim.png) |
| PORTRAIT 결과 | [PNG](final/before-portrait-result-insets-sim.png) | [PNG](final/after-portrait-result-insets-sim.png) |
| POSITION 결과 | [PNG](final/before-position-result-insets-sim.png) | [PNG](final/after-position-result-insets-sim.png) |
| 실패 영상 | [PNG](final/before-failure-video-insets-sim.png) | [PNG](final/after-failure-video-insets-sim.png) |
| 실패 결과 | [PNG](final/before-failure-result-insets-sim.png) | [PNG](final/after-failure-result-insets-sim.png) |
| Settings | [PNG](final/before-settings-insets-sim.png) | [PNG](final/after-settings-insets-sim.png) |
| Privacy | [PNG](final/before-privacy-insets-sim.png) | [PNG](final/after-privacy-insets-sim.png) |
| Licenses | [PNG](final/before-licenses-insets-sim.png) | [PNG](final/after-licenses-insets-sim.png) |

같은 폴더에 원래 해피/태피 무인셋 화면, PORTRAIT 2×2/3×3/4×4, POSITION 2×2/4×4 미리보기와 카드 뒷면, 각 모드 영상도 있다. 기존 How to Play는 비활성 보관 기능이므로 재노출/수정하지 않았다.

## 출시명·출시 노트

출시명: **1.0.2 - Screen Layout Update**

```text
<en-US>
- Improved screen layout around Android system bars.
- Adjusted boards to fit the available screen space.
- Made menu controls accessible on shorter screens.
- Preserved the existing typography, artwork, game rules, and saved-data format.
</en-US>
```

한국어: Android 시스템 바 주변 배치와 보드의 가용 공간 처리를 보완하고 작은 화면에서도 메뉴 버튼에 접근할 수 있게 했다. 기존 서체·그림·규칙·저장 형식은 유지했다.

## 실기기에서 남은 확인

`adb devices -l`에 연결 기기가 없었다. **실제 Android 설치/시스템 바/큰 글씨/전체 화면 확대/런처/구버전→신버전 업데이트 및 기록 유지 검증은 미실시**다. 테스트할 때 기존 앱을 삭제하거나 저장 데이터를 지우지 말고 같은 앱에 업데이트하여 기록·설정 유지와 화면 배치를 확인한다. 별도 클라우드 서버나 계정 동기화는 추가하지 않았다.

도구: [전체 캡처](../check.cjs), [6경로 화면 검사](../check-surfaces.cjs), [AAB 검증](../../../../scripts/verify-android-release.cjs). 새 결과 경로를 지정하여 실행해야 하며 기존 파일을 덮어쓰지 않는다. 다른 게임의 기존 JDK·Gradle·bundletool은 읽기 실행만 했고 빌드·캐시 출력은 이 프로젝트에 두었다.
