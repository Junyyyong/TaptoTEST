# TAPtoTEST Android 1.0.6 출시 기록

2026년 10월 2일 승인된 메인 로고 크기 조정과 진동 제거를 Google Play용 서명 AAB로 만들었다. 게임 규칙·저장 기록·앱 ID·업로드 키는 유지한다. 데이터 수집 기능은 보류했으며 분석 SDK나 외부 전송을 추가하지 않았다. 이 문서는 업로드할 파일과 출시 문구, 로컬 검증 결과를 정리한다.

## 포함한 변경

- 메인 로고는 TAPtoTALK의 실제 보이는 가로폭에 맞췄다. 원본 이미지·비율·중심과 나머지 UI는 유지하며 스튜디오 로고와 커버는 변경하지 않았다. 모바일 기준 기존보다 약 6.4% 작아졌다. [화면 비교 및 10개 조건 검증](../2026-10-02-main-logo/README.md)
- Settings에는 Music → Sound만 남겼고 모든 실제 진동 호출을 제거했다. 이전 진동 ON 저장값이 있어도 진동하지 않는다. 음악·효과음 설정과 기존 게임 기록은 유지한다. [설정 전후 및 호환성 검증](../2026-10-02-no-vibration/README.md)
- 동봉 개인정보처리방침의 설정 설명에서 진동을 제외하고 영어·한국어 수정일을 맞췄다. 기존 로컬 저장 및 데이터 비전송 방침은 유지한다.

앞선 1.0.5의 반응형 배치·가로폭 기준 커버·노란 설치 아이콘·전체 리액션 배경·HUD 정렬은 그대로 포함한다. Android SDK·화면 방향·안전영역 정책은 이번에 바꾸지 않았다.

## 출시명과 출시노트

출시명은 [release-name.txt](release-name.txt)의 `1.0.6 - Logo & Settings Update`이다.

영어 등록정보의 출시노트는 [release-notes-en-US.txt](release-notes-en-US.txt)를 그대로 붙여 넣는다.

```text
<en-US>
- Adjusted the main menu logo size for a more balanced appearance.
- Simplified Settings to Music and Sound controls.
- Removed vibration feedback from the game.
</en-US>
```

한국어 뜻 및 한국어 등록정보용 문구는 [release-notes-ko-KR.txt](release-notes-ko-KR.txt)에 저장했다.

## 업로드할 파일

- AAB: `android/releases/TAPtoTEST-1.0.6-code8-20261002.aab`
- 버전: 1.0.6, versionCode 8
- 앱 ID: `io.github.junyyyong.taptotest`
- minSdk 24, targetSdk 36
- 크기: 102,692,010 bytes, 약 102.7MB
- SHA-256: `3885b44d6eb387e4e9167e75b3653564c9626fcc4c37450d9a3cc507d1dddd74`
- 기존 업로드 인증서 SHA-256: `93381e4bf0cc519b6540750e006b87b3e5e9db721390abda3a6e6ae83fb777dc`

AAB와 개인 서명 파일은 Git 제외된 로컬 전달 파일이다. 기존 버전 파일을 덮어쓰지 않고 별도의 보관 사본도 만들었다. 소스·테스트·연구기록·출시노트만 현재 TEST 저장소의 `origin/main` 푸시 대상으로 삼는다. 이번 출시와 무관한 발표자료는 그대로 둔다.

## 검증 결과

- 전체 Vitest 37개 파일, 360개 테스트 통과. 이전 작업 때의 오래된 릴리스 버전 기대값을 1.0.6/code8로 갱신했다.
- TypeScript 검사·Vite production build·Capacitor Android sync 및 Gradle offline `bundleRelease` 성공.
- 최종 빌드의 Settings는 Music·Sound 두 항목만 표시하고 설정 토글·새로고침 후 값을 보존했다. 세 게임을 실제 UI로 누르는 모의 검사에서 효과음 합성 9회·진동 호출 0회·JavaScript 오류 0개였다. [최종 결과](browser-settings/after.json) · [780×1688 Settings](browser-settings/after-settings.png)
- bundletool validate와 앱 ID·버전·SDK·fontScale 플래그 검사 통과.
- 866개 payload가 기존 인증서로 서명됐고 최신 `dist` 웹 파일 437개가 번들 내용과 바이트 단위로 일치했다. 개인 서명 파일은 포함되지 않았다.
- 설치 아이콘 15개 픽셀과 adaptive 연결, 노란 배경, 앱 이름을 확인했다.
- 기존 AAB 해시가 모두 유지됐다. 게임 규칙·콘텐츠·기록 저장·미디어 설정·서체는 기준 HEAD와 같으며 저장 검증 파일은 설명 주석만 달라졌다.

자세한 파일·서명·보존 검증은 [release-verification.json](release-verification.json)에 있다. 빌드 도구인 TEN의 기존 JDK와 bundletool은 읽기만 사용하고, TEST의 SDK·캐시·출력 경로에서 실행했다. `git diff --check`도 통과했다.

## 별도 확인할 내용

Google Play 업로드·배포는 이번 작업에 포함하지 않는다. 실제 Android 기기가 연결되어 있지 않으므로 설치 앱의 Android 15/16 시스템바, 태블릿 배치, 기존 앱을 삭제하지 않고 업데이트했을 때 기록 유지 여부는 실기기에서 확인해야 한다. Play Console의 이전 1.0.3 개선 권고가 해소됐다고 판단하지 않는다. AAB는 Play 업로드용이며 휴대폰에 직접 설치하는 APK가 아니다.
