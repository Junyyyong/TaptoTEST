# TAPtoTEST Android 디자인 업데이트

2026-10-01 · 1.0.4 · versionCode 6

승인된 흰 배경과 회색 기본 UI, 기존 강조색 복원, Android 고정 비율 화면을 함께 담은 Google Play 업데이트 AAB를 생성하고 검증했다. 과거 1.0부터 1.0.3까지의 AAB는 그대로 보존했으며 새 버전은 기존 앱 ID와 업로드 키를 사용한다. 이 문서는 출시명·출시노트와 번들 검증 결과를 기록한다.

## 포함한 변경

- 화면 배경은 흰색, 일반 메뉴·설정·팝업 박스는 연한 회색으로 정리했다. 일반 UI의 그라데이션·입체 그림자와 로고 뒤 CSS 그림자를 제거했다.
- 게임명·시작 아이콘·START·Resume·결과 기록·BEST 배경·게이지·스위치 등 강조 요소는 원래 색과 효과를 유지했다. 메인 Settings와 PORTRAIT 단계 표시의 주황색, Retry의 초록색도 포함했다.
- Android에서 390×844 기준 화면을 가용 영역에 균일하게 맞추고 시스템바 겹침을 계산한다. 휴대폰의 화면 확대 설정이 바뀌어도 구성의 상대 비율을 유지하도록 보완했으며 게임 내 배율 조절 기능은 없다.
- 제공된 원본 로고로 만든 설치 아이콘과 기존 WebView 글자 배율 100% 정책을 포함했다.

게임 규칙·이미지·게임 요소의 색과 효과·서체·기록 저장 키는 변경하지 않았다. 같은 앱 ID `io.github.junyyyong.taptotest`와 기존 업로드 키를 사용한다. TEN의 기존 JDK와 bundletool은 실행 도구로만 읽어 사용하고, 캐시·출력·변경은 TEST 저장소에 둔다. 발표자료와 이번 출시와 무관한 파일은 commit 대상에서 제외한다.

## 출시명

`1.0.4 - UI & Display Improvements`

## 출시노트

영어 등록정보에 붙여 넣을 내용은 [release-notes-en-US.txt](release-notes-en-US.txt)에 저장했다.

```text
<en-US>
- Refreshed the interface with a clean white background and clearer controls.
- Improved Android layout and scaling across display-size settings.
- Preserved colorful characters, cards, and key action buttons.
- Updated the app icon.
</en-US>
```

한국어 뜻과 한국어 등록정보용 내용은 [release-notes-ko-KR.txt](release-notes-ko-KR.txt)와 같다.

```text
<ko-KR>
- 흰 배경과 보기 쉬운 버튼으로 화면 디자인을 정리했습니다.
- Android 화면 확대 설정에 따른 배치와 화면 비율을 개선했습니다.
- 캐릭터·카드·주요 버튼의 기존 색상과 효과는 유지했습니다.
- 앱 아이콘을 업데이트했습니다.
</ko-KR>
```

## 앱 파일과 검증 결과

- AAB: `android/releases/TAPtoTEST-1.0.4-code6-20261001.aab`. Git 제외된 로컬 전달용 파일이다.
- 버전: `1.0.4`, versionCode `6`, applicationId `io.github.junyyyong.taptotest`, minSdk `24`, targetSdk `36`.
- 크기: 102,682,995 bytes, 약 102.7MB.
- SHA-256: `ec54e9d3d93cdfc698d80ae2811b050170006ad0dd088e8ffc3975e83b3ec853`.
- 기존 업로드 인증서 SHA-256: `93381e4bf0cc519b6540750e006b87b3e5e9db721390abda3a6e6ae83fb777dc`.

`npm test`는 35개 파일·349개 테스트를 통과했다. TypeScript 검사·production build·Capacitor Android sync와 Gradle offline `bundleRelease`도 성공했다. SDK 경로는 현재 프로젝트의 `.android-tools/sdk`를 지정했고 캐시도 현재 프로젝트에 두었다.

[번들 검증 JSON](release-verification.json)에서 bundletool validate, 앱 ID·버전·fontScale 플래그, 866개 payload의 기존 인증서 서명, 최신 `dist`의 웹 파일 437개 전체 바이트 일치, 설치 아이콘 15개 픽셀 일치와 adaptive 연결, DEX의 글자 배율 정책 및 시스템바 측정 코드를 확인했다. 개인 키·비밀번호 파일은 번들에 포함되지 않았으며 이전 AAB 해시도 유지됐다. 빌드 당시 미커밋 소스를 포함했고 기준 HEAD는 검증 JSON에 기록했다.

[최종 화면 비율 검증](frame-final/verification.json)은 모의 밀도 2/2.4/3/3.6/4에서 **110개 검사·12개 캡처·오류 0개**를 통과했다. 정답 터치·단계 진급·메모리 완주·일시정지·결과·설정·안전영역과 실행 중 화면 크기 변경을 확인했고 기존 웹 5개 viewport의 좌표·서체도 유지됐다. 캡처는 1080×2340 브라우저 모의 화면이다. 디자인 전후 비교는 별도의 780×1688 갤러리에서 제공한다.

JVM 모의 검사에서도 MainActivity의 생성·복귀·설정 변경 시 100% 글자 배율 재적용, 오래된 뷰 콜백 무시, OS 설정 불변, 시스템바 겹침 측정·밀도 환산·native padding 이중 계산 방지·중복 억제·페이지 재로딩을 통과했다. 오래된 검사 도구의 모의 클래스를 최신 측정 코드에 맞춰 보완했으며 앱 실행 소스는 바꾸지 않았다.

실행 소스의 게임 규칙·콘텐츠·저장·결과 비교·미디어 설정·서체에는 기존 HEAD 대비 변경이 없다. `git diff --check`도 통과했다. 소스·테스트·연구기록·출시노트는 `origin/main` 반영 대상이며 AAB·개인 서명 파일·발표자료는 commit 대상에서 제외한다. Google Play 업로드·배포는 이번 요청에 포함하지 않는다.

## 실제 기기에서 확인할 내용

실제 Android 기기가 연결되어 있지 않으므로 화면 확대 설정 변경, 시스템바 겹침, 구버전에서 업데이트한 뒤 기록 유지 여부는 실기기에서 확인해야 한다. 기존 앱을 삭제하지 않고 Play 테스트 트랙에서 업데이트한다. AAB는 Google Play 업로드용이며 휴대폰에서 직접 설치하는 APK가 아니다.

[780×1688 디자인 비교](../2026-10-01-ui-accents/index.html) · [강조색 누락 보완](../2026-10-01-ui-accents/README.md) · [고정 비율 화면 설명](../2026-10-01-proportional-frame/README.md)
