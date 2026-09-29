# TAPtoTEST · Play 출시 준비 확인표

점검 시작 2026-09-29, 문서·검증 완료일 2026-09-30 (KST). 운영자 **TapeeTepee openstudio**, 연락처 **wnsdydtml@gmail.com**. 코드 점검과 제출 준비 자료이며 법률 검토, 정책 전체 준수 보장, Google 심사 승인을 대신하지 않는다.

## 앱 ID와 저장 계약

- 사용자가 이전 Play 미등록을 확인하고 변경 승인: **io.github.junyyyong.taptotest**, 앱 표시명 **TAPtoTEST**. 폴더와 origin은 그대로다. versionCode 1 / versionName 1.0을 유지한다.
- `capacitor.config.ts`, Gradle applicationId/namespace, Java MainActivity, strings의 패키지·표시명을 일치시켰다. Manifest의 `.MainActivity` 및 `${applicationId}.fileprovider`는 새 ID를 자동으로 사용한다. merged manifest·Java release 컴파일로 확인했다.
- 이전 `io.github.junyyyong.taptopick` 설치본은 별도 앱이다. 새 앱에서 이전 앱 전용 데이터를 읽는 자동 이관은 불가능하다. 키 파일·서명 설정은 변경하지 않았다.
- 기존 **taptopick.preferences.v1 / taptopick.records.v1** 저장 키를 유지한다. Android는 `@capacitor/preferences`의 SharedPreferences, 웹은 localStorage다. 같은 Android 앱의 기존 WebView localStorage는 native 값이 없을 때만 이관하고 원본을 남긴다. native 값이 있으면 이전 웹 사본으로 덮어쓰지 않는다.
- 설정, 그림별 PUZZLE 최고 결과, PORTRAIT 결과, 기존/새 POSITION 기록 모두 보존한다. `tutorialDone`도 보존하나 현재 튜토리얼·진행 중 판 이어하기는 없다. 별도 진도 키나 계정·클라우드를 추가하지 않았다.
- 초기 읽기/검증 완료 전 게임 시작·저장을 막는다. 손상 시 유효한 `.backup` 복구, 복구 불가 시 원본을 유지하고 Retry를 표시한다. 비동기 쓰기를 직렬화하고 실패한 최신 값을 대기열에 보존한다. 정상적인 저장 대기는 실패가 아니며 실제 실패만 안내한다. 같은 ID/서명으로 앱을 업데이트하는 실제 기기 보존 시험은 아직 필요하다.

## 실제 데이터·권한·네트워크 점검

| 항목 | 확인한 현재 구현 |
| --- | --- |
| 기기 저장 | Music/Sound/Vibration, 이전 tutorialDone, 최고 결과의 모드·그림 ID·완주/시간/점수/오답/맞힌 수/단계. `.backup`은 기기 내 복구용 사본 |
| 전송 | 활성 게임 진입점·의존 코드에 결과 업로드, 로그인, 광고·분석·추적 SDK 없음. 음악 fetch/이미지/영상/서체는 동봉 파일 URL |
| Android | 소스의 INTERNET 권한. 병합 후 AndroidX의 앱 전용 signature 보호 dynamic-receiver 권한 추가. ProfileInstaller receiver의 DUMP는 해당 receiver 보호 조건이며 앱의 DUMP 권한 요청이 아님. 위치/카메라/마이크/연락처/AD_ID/결제 권한 없음 |
| SDK | Capacitor core/android 8.5.0, Preferences 8.0.1. Google Services 적용은 설정 파일이 있을 때만인 기본 Gradle 템플릿이며 현재 release 의존성에 Firebase/광고 SDK 없음 |
| OS 백업 | `android:allowBackup="true"` 유지. OS/계정 설정에 따라 백업·복원이 가능하나 개발자가 운영/열람하는 클라우드가 아니고 복원 보장도 아님 |
| 웹 | taptotest.vercel.app의 Vercel 정적 호스팅. 웹 접속에는 IP/요청/브라우저 정보를 처리하는 호스팅이 관여할 수 있으므로 '어떠한 정보도 처리하지 않는다'고 쓰지 않음 |
| 문의 | 이용자가 직접 보내는 Gmail 문의의 주소·메시지·첨부파일 처리. 게임 내부 문의 수집 폼·계정은 없음 |

개발 브라우저에서 제3자 HTTP를 차단한 검증과 코드·의존성 검토는 실제 Android 기기의 네트워크 검사를 대체하지 않는다. SDK·호스팅 설정이 달라지면 다시 점검해야 한다.

## 앱에 포함한 문서

- `public/privacy.html`: 게임명·운영자·정확한 연락처, 영어/한국어 실제 저장/이관/백업·웹/이메일·어린이·보관/삭제·보안 안내.
- `public/licenses.html`, `public/legal/`: Capacitor 3개 패키지의 설치본 MIT 전문, 실제 release 의존성 50개의 POM 라이선스와 AAR/JAR 고지, Cordova NOTICE/LICENSE, Noto Sans KR 및 Noto Serif KR OFL. 다른 게임의 의존성 목록을 복사하지 않고 TEST Gradle 결과에서 생성했다.
- Settings 아래 Privacy policy · Licenses, 로컬 HTML 읽기창. 창 Close/Escape와 초점 복귀. 별도 약관 동의/나이 입력/계정/추적 기능은 넣지 않는다.
- 제출할 공개 경로: **https://taptotest.vercel.app/privacy.html**, **https://taptotest.vercel.app/licenses.html**. push만으로 배포 성공을 단정하지 않는다. 실제 HTTP 응답/본문 일치 결과는 연구기록의 배포 확인란을 따른다.

### 라이선스 출처와 재생성

`scripts/list-release-dependencies.gradle`로 이 앱의 releaseRuntimeClasspath를 `.android-tools/release-artifacts.json`에 생성한 뒤 `node scripts/build-license-notices.mjs`를 실행한다. 실제 다운로드된 POM의 라이선스와 AAR/JAR 내부 LICENSE/NOTICE를 읽는다. 버전이 달라지면 인벤토리도 재생성한다. 빌드·테스트 전용 도구는 사용자 앱 번들에 포함하지 않는다.

- [Noto Sans KR OFL](https://github.com/google/fonts/blob/main/ofl/notosanskr/OFL.txt): 동봉 TTF의 Adobe 2014–2021 저작권·Source Reserved Font Name과 대조.
- [Noto Serif KR OFL](https://github.com/google/fonts/blob/main/ofl/notoserifkr/OFL.txt): 원문과 함께 실제 동봉 TTF에 적힌 Adobe 2017–2024 저작권을 추가 보존. Sans와 달리 실제 Serif 파일은 Version 2.003.
- [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0.txt), [Cordova Android 14.0.1 LICENSE](https://github.com/apache/cordova-android/blob/14.0.1/LICENSE), [NOTICE](https://github.com/apache/cordova-android/blob/14.0.1/NOTICE).
- 이미지·캐릭터·로고·음원·영상은 위 오픈소스 라이선스가 권리를 대신 보증하지 않는다. 개발자가 배포 권리를 별도 확인한다.

## Play Console에서 별도로 해야 할 일

- [ ] 공개 개인정보 URL이 로그인·지역 제한 없는 편집 불가능한 HTML로 열리는지 확인한 뒤 스토어에 등록. 앱 이름/개발자 정보/연락처 일치 확인. [Google User Data 정책](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en), [Google 안내](https://support.google.com/googleplay/android-developer/thread/307687762/tips-and-best-practices-for-complying-with-privacy-policy-requirements?hl=en).
- [ ] **Data safety 설문은 소유자가 최종 Android 배포물 기준으로 작성.** 기기 밖으로 전송하지 않는 게임 저장값을 '수집'으로 보지 않는 안내가 있지만, 모든 SDK·WebView·문의/외부 전송·배포 버전을 함께 검토한다. 웹 사이트 호스팅과 오프라인 동봉 앱을 혼동하지 않는다. 계정은 없어 계정 삭제 기능을 임의로 추가하지 않는다. [Google Data safety 공식 안내](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en-AE).
- [ ] 실제 목표 연령·대상 국가와 IARC 콘텐츠 등급을 확정. 어린이를 대상에 포함하면 Families 정책 및 해당 지역 개인정보 법규를 검토. 광고가 없다고 어린이 관련 모든 의무가 면제되는 것은 아니다. [Google Families 정책](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en).
- [ ] 광고 없음/인앱 구매 없음/로그인 불필요 선언을 최종 산출물과 대조. 게임 속 만화 대사·영상·소재가 대상 연령에 적합하고 배포권이 확보되어 있는지 확인.
- [ ] Play App Signing/개발자 신원 확인·테스트 요구조건·지원 API·스토어 스크린샷/설명·미국 수출 관련 선언을 계정 소유자가 검토. 이 문서만으로 적합/면제라 단정하지 않는다.
- [ ] 이번 변경으로 **새 서명 AAB는 만들지 않았다.** 앱 ID가 맞는 최초 출시 AAB를 별도 요청으로 생성하고 포함 파일/정책/권한/서명을 검증한 뒤 업로드. 이전 taptopick AAB를 그대로 제출하지 않는다.
- [ ] 실제 Android에서 오프라인 실행, 시스템 뒤로가기, 강제 종료/재실행, 같은 ID/서명으로 업데이트 전후 기록·설정 유지, 삭제/복원 동작 점검. 브라우저의 simulated bridge 테스트와 구분한다.
- [ ] 개발 의존성 보안 정리: 이번 `npm audit --omit=dev`는 0건. 전체 audit는 개발 전용 CLI/xcode/uuid 및 Vitest/mocker 경로의 moderate 5건을 보고했다. 강제 다운그레이드/메이저 업데이트는 하지 않았고 별도 도구 업그레이드·회귀검증이 필요하다. 개발 서버는 127.0.0.1에만 바인딩한다.

참고: [Capacitor Preferences 저장 방식](https://capacitorjs.com/docs/apis/preferences), [Android Auto Backup](https://developer.android.com/identity/data/autobackup), [Vercel 개인정보 안내](https://vercel.com/legal/privacy-notice). 출시 시점의 최신 정책과 계정별 요구사항을 다시 확인한다.
