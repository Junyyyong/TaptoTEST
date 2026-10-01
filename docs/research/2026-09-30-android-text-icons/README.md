# TAPtoTEST 1.0.1 — Android 글자 배율과 설치 아이콘

## 문제 → 수정 → 확인

| 문제 | 수정 | 확인 범위 |
| --- | --- | --- |
| Android 큰 글씨 설정에 따른 WebView 글자 확대가 게임 배치를 바꿀 수 있음 | 앱 내부 `setTextZoom(100)`을 시작·복귀·configurationChanged 후 즉시/다음 UI 큐에서 재적용. `fontScale` 변경 콜백 등록, CSS text-size-adjust 100% 보완 | 실제 MainActivity 소스를 JVM 대역으로 실행해 1/1.3/2/3 배율·복귀·지연 콜백·null/교체 뷰 검증. AAB DEX에 100과 세 콜백 포함 확인. 실제 WebView 엔진/휴대폰 테스트는 미실시 |
| 설치 아이콘이 새 제공 디자인과 다름 | 원본 2134×2134 PNG 전체를 비율 유지 리사이즈. 108dp 전경 안에 60dp 콘텐츠, 24dp 패딩, 흰 배경. launcher/adaptive/round와 별도 스토어 512 PNG | 5밀도×3 PNG가 번들에 포함되고 픽셀 일치. 진한 글씨 픽셀의 66dp 안전 원 밖 개수 0. 원형·둥근 사각형 마스크 미리보기 확인 |
| 기존 사용자 기록과 업데이트 연속성 보존 필요 | 앱 ID·서명 키·저장 키·게임 규칙 유지. 1.0/1 → 1.0.1/2 | 기존 인증서와 일치, 저장소/규칙 코드 변경 없음, 이전 배포 AAB SHA-256 불변. 실제 구버전→신버전 설치 테스트는 미실시 |

OS 전체 화면 확대, 돋보기, 기기 density나 전역 fontScale 값을 바꾸지 않는다. 이 변경은 사용자 요청에 따라 게임 내부 글자 배율을 고정하는 것이며 큰 글씨 설정이 게임 텍스트에는 반영되지 않는 접근성 절충이 있다. 네이티브 정책의 실제 효과를 브라우저 캡처만으로 검증했다고 주장하지 않는다.

## 결과물

- 업로드용 AAB: `android/releases/TAPtoTEST-1.0.1-code2-20260930.aab` (프로젝트 루트 기준, 일반 폴더라 Finder에서도 바로 확인 가능)
- 원래 보관본: `.android-tools/releases/2026-09-30/TAPtoTEST-v1.0.1-code2.aab`. 두 파일은 바이트와 SHA-256이 동일하며 보관본은 유지한다. 새 빌드나 버전 변경 없이 복사만 했고 `android/releases/`도 Git 제외로 등록했다.
- 앱 ID: `io.github.junyyyong.taptotest`
- versionName **1.0.1**, versionCode **2**, minSdk 24, targetSdk 36
- 크기: **102,680,025 bytes** (약 102.7 MB)
- SHA-256: `fa8db9a9d3dad8aad4a0c97e2a8abf9f054dd65df2c520432052eee477be5d06`
- 업로드 인증서 SHA-256: `93381e4bf0cc519b6540750e006b87b3e5e9db721390abda3a6e6ae83fb777dc` — 이전 AAB와 동일한 기존 키
- [스토어 아이콘 512 PNG](../../../store/taptotest-icon-512.png)
- [원본 보관본](../../../assets/launcher/ICON-TAPtoTESt.png) · [아이콘 생성 명세/해시](../../../store/taptotest-icon-manifest.json)
- [번들/아이콘 검증 JSON](release-verification.json) · [브라우저 검증 JSON](screenshots/verification.json)

기준 HEAD는 `783968f77f156b8a2c26f4501ab9832bd5eed30f`이며 이번 미커밋 소스 변경을 포함한 빌드다. 이번 작업에서 commit/push/Play 업로드는 하지 않았다. 다른 게임 저장소는 수정하지 않았으며 TEN의 기존 JDK·Gradle·bundletool 실행파일만 읽기 사용했다. 캐시·출력은 TAPtoTEST 프로젝트에 두었다. 개인 키와 비밀번호는 Git 제외 파일로 유지하며 문서/번들에 포함하지 않았다. 과거 `TAPtoTEST-v1.0-code1-783968f.aab`는 덮어쓰지 않았다.

## 검증

- `npm test`: **32개 파일, 333개 테스트 통과**. 신규 6개는 Android 소스 정책 검사이며 실제 기기 테스트가 아니다.
- `npm run cap:sync`: TypeScript 검사·Vite 프로덕션 빌드·Capacitor 동기화 통과.
- `scripts/check-android-text-zoom.cjs`: 실제 MainActivity + 좁은 JVM 대역에서 세 라이프사이클, 설정 불변, 지연 적용, null/오래된 뷰 검사 통과.
- Gradle offline `bundleRelease`: **BUILD SUCCESSFUL**. flatDir/SDK XML 버전/차기 Gradle 호환성 경고는 있으나 빌드 실패 없음.
- bundletool 1.18.3 validate 통과. manifest의 앱 ID·버전·fontScale 플래그·아이콘 참조·앱 이름·흰 배경 확인.
- Java JarFile로 모든 **866개 payload 서명**과 기존 업로드 인증서 일치 확인, 현재 dist **437개 웹 파일** 바이트 일치 확인. 개인 키 파일 포함 없음.
- 번들 내 **15개 PNG**의 디코딩 픽셀과 로컬 생성본 일치, adaptive XML 리소스 두 개 연결 확인.
- AAB DEX에서 `onCreate`·`onResume`·`onConfigurationChanged`와 `setTextZoom(100)` 상수/호출 확인.
- 격리 Chrome에서 메뉴 배치·서체 불변, 세 START/보드 49/4/4칸, 화면 경계, 콘솔 오류 0 확인.
- `adb devices -l`에 연결된 기기 없음. 에뮬레이터 실행 환경 없음. **실제 큰 글씨/쉬운 사용 모드·기기 런처·인플레이스 업데이트·데이터 유지 확인은 아직 필요하다.**

## 780×1688 전후 이미지

이전 화면은 **git archive 783968f**를 `/private/tmp/taptotest-v1-baseline.X022f7`에 풀어 별도 Vite 서버로 제공했다. 현재 체크아웃을 과거처럼 수정하거나 기존 자료를 덮어쓰지 않았다. 캡처는 CSS 390×844, DPR 2, 격리 브라우저 저장소, 동일 난수 시드, 음악·효과음·진동 꺼짐 조건이다. 원래 게임 저장소와 난수 로직은 수정하지 않았다.

**게임 화면은 정상 글자 배율의 브라우저 회귀 비교다. Android fontScale 200% 재현 화면이 아니다.** 아이콘 그림은 실제 launcher가 아니라 명시적으로 표시된 마스크 렌더링 미리보기다. 원본의 가장자리 배경 장식은 런처 마스크에 따라 달라질 수 있으며 글자는 안전 원 안에 보존된다.

| 화면 | 이전 | 변경 후 |
| --- | --- | --- |
| 설치 아이콘 미리보기 | [PNG](screenshots/before-launcher-preview.png) | [PNG](screenshots/after-launcher-preview.png) |
| 메인 | [PNG](screenshots/before-menu.png) | [PNG](screenshots/after-menu.png) |
| 설정 | [PNG](screenshots/before-settings.png) | [PNG](screenshots/after-settings.png) |
| PUZZLE 시작 | [PNG](screenshots/before-unit-start.png) | [PNG](screenshots/after-unit-start.png) |
| PUZZLE 보드 | [PNG](screenshots/before-unit-board.png) | [PNG](screenshots/after-unit-board.png) |
| PORTRAIT 시작 | [PNG](screenshots/before-montage-start.png) | [PNG](screenshots/after-montage-start.png) |
| PORTRAIT 보드 | [PNG](screenshots/before-montage-board.png) | [PNG](screenshots/after-montage-board.png) |
| POSITION 시작 | [PNG](screenshots/before-memory-start.png) | [PNG](screenshots/after-memory-start.png) |
| POSITION 보드 | [PNG](screenshots/before-memory-board.png) | [PNG](screenshots/after-memory-board.png) |

## 출시명과 출시 노트

출시명 예시: **1.0.1 - Icon & Text Layout Update**

```text
<en-US>
- Updated the app icon with the new TAPtoTEST artwork.
- Kept in-game text at a consistent size when Android uses larger font settings.
- No changes to game rules or the saved-data format.
</en-US>
```

한국어 뜻: 새 TAPtoTEST 아이콘을 적용하고 Android 큰 글씨 설정에서도 게임 내부 글자 크기를 일정하게 유지하도록 변경했다. 게임 규칙과 저장 데이터 형식은 그대로다.

## 아주 쉬운 업데이트 방법

1. Play Console에서 **기존 TAPtoTEST 앱**을 연다. 새 앱을 만들거나 서명 키를 새로 만들지 않는다.
2. 현재 사용 중인 테스트 트랙(예: 내부 테스트)에 **새 버전 만들기**를 누른다. 미완료 초안이 있다면 먼저 해당 초안의 상태를 확인한다.
3. 이번 `android/releases/TAPtoTEST-1.0.1-code2-20260930.aab`를 추가하고 **버전 코드 2 / 이름 1.0.1**인지 확인한다. 이전 코드 1 파일과 혼동하지 않는다.
4. 위 출시명·영문 노트를 입력하고 검토 화면에서 오류를 확인한 뒤 원하는 테스트 범위로 배포한다. 이번 작업에서는 이 단계들을 대신 실행하지 않았다.
5. 스토어 등록정보의 앱 아이콘도 바꾸려면 별도로 `store/taptotest-icon-512.png`를 업로드한다. 설치 아이콘은 AAB 안에 이미 들어 있다.
6. 테스트 휴대폰에서 앱을 **삭제하지 않고 Play 업데이트**한다. 큰 글씨로 실행→다른 앱/설정으로 이동→복귀→실행 중 글자 크기 변경을 확인한다. 화면 확대/돋보기는 계속 동작해야 한다.
7. 업데이트 전에 기록과 설정을 확인해 두고 업데이트 후 동일하게 남는지 비교한다. 앱 ID·기존 키·저장 키를 유지하고 초기화 코드를 추가하지 않았지만 실제 기기 보존 검증은 별도다. 앱 삭제나 저장 데이터 지우기는 하지 않는다.

절차는 [Google Play의 버전 준비 및 출시 안내](https://support.google.com/googleplay/android-developer/answer/9859348?hl=ko)를 기준으로 정리했다. 이미 코드 2를 업로드한 상태라면 이 파일을 재사용하지 말고 더 높은 versionCode로 새로 빌드해야 한다.

## 근거와 재현 도구

- [Android WebSettings.setTextZoom](https://developer.android.com/reference/android/webkit/WebSettings#setTextZoom(int)): WebView 텍스트 배율 API.
- [Android adaptive icon 안내](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive): 전경/배경 및 108dp 레이어 구조.
- 설치된 Capacitor 8.5.0 `BridgeActivity`의 생성·resume·configurationChanged 동작을 읽고 super 호출 뒤에 정책을 적용했다.
- [아이콘 생성](../../../scripts/generate-android-icons.cjs), [라이프사이클 검증](../../../scripts/check-android-text-zoom.cjs), [AAB 검증](../../../scripts/verify-android-release.cjs), [브라우저 캡처](capture.cjs).
- sharp/playwright는 로컬 제공 런타임의 NODE_PATH로 사용했으며 프로젝트 의존성을 추가하지 않았다.
