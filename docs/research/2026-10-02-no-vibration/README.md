# 진동 기능 종료 및 Play Console 안내 확인 — 2026-10-02

## 문제와 수정

사용자가 설치 앱의 진동 설정이 작동하지 않는 것으로 보인다며 기능 자체의 삭제를 요청했다. 진동을 추가 구현하거나 원인을 찾는 작업 대신 Settings의 Vibration·지원 불가 안내와 모든 실제 진동 호출을 제거했다. Music → Sound 순서와 기존 화면 디자인·음원·효과음은 유지했다.

- `talkApp.ts`: 진동 행·이벤트·적용·안내 제거.
- `feedback.ts`: 장치 진동 호출·진동 상태·모든 이벤트의 진동 패턴 제거. 사용하지 않는 복사 참조 모듈의 타입 호환을 위한 `setHaptics`는 아무 동작도 하지 않는 빈 메서드로만 남긴다.
- `talkPreferences.ts`: 과거 `hapticsOn: true/false` 모두 무시. 다음 설정 저장에는 Music/Sound/튜토리얼만 기록한다. 기존 저장 키·기록은 유지하고 원본/백업을 일괄 삭제하지 않는다.
- `pickSaveValidation.ts`: 기존 boolean 필드를 허용해 이전 앱 데이터 로딩·이관을 막지 않는다.
- `public/privacy.html`: 영어·한국어 설정 설명에서 진동을 제외하고 수정일을 갱신했다.

## 전후 화면과 검증

390×844 CSS / 780×1688 PNG, Chrome Android 플랫폼·안전영역 시뮬레이션이다. 실제 기기의 진동 모터 검사가 아니라 앱의 요청 호출 여부를 검사했다.

[수정 전 — Music/Sound/Vibration](baseline-settings.png) · [수정 후 — Music/Sound](after-settings.png)

- 빌드·타입 검사 통과.
- Feedback 두 단위 테스트: 누르기·정답·오답·완성·실패·보관 코드에서의 재활성화 요청 모두 진동 0회, Sound on/off 정상.
- 저장 회귀 테스트: 과거 진동 ON 값이 있어도 음악·효과음·튜토리얼·기록을 보존한다.
- 모바일 실제 UI 모의 검사: 설정 2개만 표시, 토글 후 새로고침에서도 값 유지, 세 게임의 버튼/카드 터치 성공. 효과음 합성 11회·진동 호출 0회·JavaScript 오류 0개. [결과](after.json)
- 전체 Vitest 359개 통과, 기존 Android 버전 기대값 검사 1개 실패(테스트는 code6/1.0.4 기대, 현재 이미 code7/1.0.5). 이번 범위 밖의 버전 설정·테스트는 바꾸지 않았다.
- AAB 생성·sync·push·Play Console 변경은 하지 않았다. 메인 로고의 앞선 수정도 그대로 유지한다.

## 첨부 Play Console 화면의 의미

화면 제목은 ‘다음 출시 버전을 위한 발견 항목’이며 두 항목 모두 1.0.3에 연결되어 있다. 이 캡처만 보면 출시 차단 오류가 아닌 개선 권고로 판단한다. Google은 경고·경미한 항목과 출시 전 해결해야 하는 오류를 구분한다. [Google Play 공식 출시 안내](https://support.google.com/googleplay/android-developer/answer/9859348?hl=en)

1. Edge-to-edge: 상태바·하단 시스템바 뒤까지 그려지는 화면에서 버튼·그림이 겹치지 않도록 안전영역을 처리하고 Android 15 이상에서 확인하라는 안내다. 현재 소스의 targetSdk는 36이며 Capacitor SystemBars와 MainActivity의 실제 WebView 겹침 측정 및 기존 반응형 화면 처리가 있다. 실제 기기의 Android 15/16 검증이나 Console 경고 해소는 이번에 확인하지 않았다. [공식 화면 영역 안내](https://developer.android.com/develop/ui/views/layout/edge-to-edge)
2. 대형 화면·방향 제한: 태블릿·접이식·분할 창의 크기와 방향에도 대응하라는 안내이며 사용자용 배율 조절 메뉴를 만들라는 뜻은 아니다. 현재 Manifest에는 portrait 고정이 있고 resizeableActivity=false 선언은 없다. Android 16 규칙은 게임 분류(`android:appCategory`)에 따른 예외도 있으므로 캡처만으로 세로 고정을 무조건 제거해야 한다고 판단하지 않는다. 최신 번들의 게임 분류와 큰 화면 실제 배치는 다음 검증에서 확인한다. [공식 방향·크기 조절 안내](https://developer.android.com/develop/adaptive-apps/guides/app-orientation-aspect-ratio-resizability)

질문에 대한 확인만 했으며 위 안내를 이유로 Android 코드·방향·패키지·기기 설정은 변경하지 않았다.
