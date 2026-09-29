# 디자인과 콘텐츠 수정 경계

TAP to PICK은 TAPtoTALK의 화면 감각과 폰트를 유지하면서 이미지 게임 규칙을 독립적으로 관리합니다.

## 자주 수정할 곳

- 2026-09-29 브라우저 탭 제목: `index.html`의 `<title>`과 `src/config/app.ts`의 `APP_CONFIG.name`을 `TAP to TEST`로 통일했다. `src/main.ts`가 로드 후 제목을 다시 설정하므로 두 곳을 함께 유지한다. 로컬 Git `origin`은 이름이 바뀐 동일 저장소 `Junyyyong/TaptoTEST`를 가리킨다. 이번에는 게임 규칙·저장 키·네이티브 앱 ID·앱 표시 이름·에셋 경로를 바꾸지 않는다.

- 2026-09-20 POSITION 영상은 실패 notbad, 일반 완주 마지막 정답 페어의 캐릭터, 이전 완주 시간 경신 OH MY GOD다. 첫 완주·동률은 일반 영상. `MEMORY_FACE_CHARACTERS`가 얼굴을 영상 ID로 연결하고 `isMemoryRecordBreak`가 경신 여부를 판단한다. 태피는 Unbelievable로 교체했다. 아래 과거 랜덤 영상 설명보다 이 규칙을 우선한다.

- 2026-09-20: POSITION은 MEMORY_STAGES의 2×2/4×4/6×6(60/60/90초), 총 3단계다. 결과의 단계 수는 배열 길이를 사용한다. 새 기록은 memoryVersion=2를 저장하고 memory:2x2-4x4-6x6 키를 사용해 기존 memory 기록을 보존·분리한다. 완주 시 현재/최고 시간, 미완주 시 단계·쌍 수를 표시한다. PORTRAIT는 현재/최고 찾은 수를 표시한다. 점수·오답 수·기기 저장 안내는 결과에서 생략한다.

- 2026-09-17: 세 게임의 실패(TRY AGAIN) 영상은 `movie/notbad.webm`/`notbad.mp4` + `notbad.mp3` 공통이다. `config/app.ts`의 failureCelebration과 Cheer의 outcomeClip에서 선택한다. 아래 과거 티피·마지막 캐릭터 실패 영상 설명보다 이 규칙이 우선한다. 성공 영상은 기존 선택 방식을 유지한다.

- 2026-09-16 현재 표시 이름은 PUZZLE / PORTRAIT / POSITION이다. 내부 모드 ID `unit` / `montage` / `memory`는 저장 기록과 호환되도록 유지한다. 아래 이전 이름 설명은 동일 게임을 가리킨다.

- 완료 영상의 별도 음원 동기화는 `ui/mediaSync.ts`에서 영상 playing 신호를 기준으로 관리한다. waiting/pause/seeking 때 소리를 멈추고 재개·timeupdate에서 120ms 넘는 오차를 보정한다. Cheer 종료 시 stop으로 늦게 도착한 오디오 이벤트를 차단한다. 메뉴·게임 배경음악과는 별개다.

- 메인 게임명은 PUZZLE / MONTAGE / MEMORY로 표시한다. 메인 버튼 위치는 TEN의 로고 영역 높이에 맞추되 PICK 로고 자체 너비는 보존한다. title.css의 brand-block 높이와 반응형 조건이 그 기준이다. 음악 안내는 TALK처럼 스피커 아이콘과 함께 Settings 아래에 절대 배치해 버튼 위치를 밀지 않는다. 높이 580px 이하에서는 안내 영역을 36px로 줄여 화면 안에 유지한다.

- Settings는 `index.html`의 `screen-settings` 독립 화면이다. TEN처럼 뒤로가기·중앙 제목·스크롤 가능한 설정 목록으로 구성하며 `talkApp.ts`의 showSettings/closeSettings에서 전환한다. 메뉴 음악을 유지하고 Escape/뒤로가기는 메뉴 Settings 버튼으로 포커스를 돌려준다. 게임 일시정지는 기존 help 팝업을 유지한다.

- 게임 시작 화면: `src/content/pickModes.ts`의 짧은 설명·안내, `src/ui/pickIntroIcons.ts`의 벡터 아이콘, `talkApp.ts`의 `showModeIntro`/`startMode`, `talk.css`의 `.pick-intro-*`로 구성한다. 모드 선택과 Play again은 안내 화면만 열고 START가 실제 플레이를 시작한다. 안내 중 메뉴 음악을 유지하고 타이머·메모리 미리보기·몽타주 순서는 진행하지 않는다. 뒤로가기·Escape는 선택했던 메뉴 버튼으로 포커스를 돌려준다. 기존 How to play·Rules는 다시 추가하지 않는다.

- 2026-09-09: 메인 메뉴의 How to play·Rules 버튼과 실행 연결을 제거했다. Settings·음악 시작 안내·일시정지 창은 유지한다. 아래 튜토리얼 관련 설명과 소스는 보관용이며 현재 게임 진입점에서 불러오지 않는다.

- 게임 반응 체험판: `ui/styles/pickExperience.css`, `ui/feedback.ts`, `ui/talkApp.ts`. 기록은 `ui/pickRecords.ts`, 결과 표현은 `ui/pickResultView.ts`. `docs/EXPERIMENT-game-feel.md`에 기준 버전과 복구 절차를 기록했다. 게임 규칙은 변경하지 않았다.

- 음악: 재생기는 `ui/backgroundMusic.ts`, 화면별 음원 선택·중복 방지는 `ui/sceneMusic.ts`, 경로는 `config/app.ts`에 둔다. 현재 메뉴·메뉴에서 연 설정·How to play는 **Tap Parade**(`pick-tap-lobby.mp3`, 136 BPM·D장조·4/4박자·24마디·약 42.35초)를 사용한다. `scripts/generate-tap-lobby.mjs`가 합성 발끝·뒤꿈치 타격음과 피아노·워킹 베이스의 스윙을 생성한다. 실제 플레이는 기존 **Pick Garden**(100 BPM·C장조·4/4박자·38.4초)을 유지한다. 이전 왈츠 **Paper Lantern Waltz**와 92 BPM 메뉴 변주곡은 복구·연구용으로 보존한다. 기존 `scripts/generate-pick-music.mjs`의 `--menu`는 보관된 왈츠, `--legacy-menu`는 이전 변주곡, 옵션 없음은 게임곡을 재생성한다. 새 메뉴곡은 반드시 별도 탭 생성기를 사용한다.

- 음악 시작: 메뉴 음원을 미리 디코딩하고 인트로는 무음으로 유지한다. 첫 게임선택화면에서 `AudioContext.resume()`을 시도해 허용된 브라우저에서는 입력 없이 재생한다. 브라우저가 차단하면 500ms 뒤 메뉴 하단 **Tap for music**을 표시하며, 해당 버튼·로고 등 메뉴 영역의 터치나 키보드 입력으로 재시도한다. 게임에 들어갔다 나올 필요는 없다. 저장된 Music 꺼짐 설정을 우선하고, 일시정지·영상·결과·숨긴 탭에서는 중지한다. 공통 Music 켜기/끄기는 두 곡에 적용하며 효과음 설정과 독립이다. 자동 재생 차단은 우회하지 않는다. 상세 변경은 [첫 방문 음악 연구기록](research/2026-09-08-menu-autoplay/README.md)을 참고한다.

- 최신 안내: 첫 조각 연습은 3×3의 티피 정답 4조각과 다른 캐릭터 오답 5조각으로 구성한다. 개별 카드 크기는 이전 2×2와 동일하며 오답은 흔들림만 주고 진행하지 않는다. 정답 영역은 회색에서 컬러로 복원한다. 페어는 이미지 로딩 후 컬러로 3·2·1을 각 1초 표시한다. 완료 체크 없이 Next/Done으로 진행한다. 서체와 금색 맥동·흔들림은 TALK 안내 스타일을 참조한다.

- 체험형 How to play: `src/content/pickTutorial.ts`(예제·이미지), `src/core/pick/tutorial.ts`(연습 규칙·다음 대상), `src/ui/pickTutorial.ts`(버튼·표시). 상단 진행 점·Skip, 그림 중심 안내, 단일 컬러 강조 버튼, 완료 후 Next/Done을 사용합니다. 손가락·화살표·다시하기는 표시하지 않습니다. 페어 안내는 별도 제시 그림 없이 카드 이미지 로딩 후 2초간 앞면을 보여주고 가린 다음 빛나는 카드로 유도합니다. 화면 전환·닫기 시 미리보기 예약을 취소합니다. 연습은 본 게임과 상태·제한시간을 공유하지 않습니다. 화면 문구는 최소화하고 보조기기용 안내는 유지합니다.

- `src/content/puzzles.ts` — 캐릭터 이름, 폴더, PNG/JPG 연결
- `src/core/pick/game.ts` — 7×7·5×5·4×4 보드 생성, 셔플, 점수 규칙
- `src/ui/talkApp.ts` — 세 게임의 화면 흐름과 문구
- `src/ui/styles/talk.css` — 목표 카드, 이미지 블록, 메모리 카드 레이아웃
- `src/ui/styles/tokens.css` — TAPtoTALK에서 이어받은 색상과 한글 폰트
- `src/config/app.ts` — 앱 이름, 시작 화면 시간, 완료 영상과 음원

## 이미지 규칙

- 2026-09-29 PUZZLE 순서: `talkApp.ts`의 `unitArtworkOrder`가 `core/pick/game.ts`의 `RandomIndexCycle`을 재사용한다. `UNIT_TARGET_CHARACTERS.length`를 기준으로 모든 그림을 한 번씩 제시하며, 다음 묶음 첫 그림은 직전 그림과 다르게 선택한다. 캐릭터 이름이 아닌 그림 ID별 순환이므로 같은 멤버의 다른 포즈·만화는 각각 별도 대상이다. `startUnitRound`에서만 순서를 소비하며 메뉴 복귀·Play again·다른 모드 플레이에서 초기화하지 않는다. START 전 취소·오답·일시정지는 순서에 영향을 주지 않는다. 페이지 재실행·새로고침 시 새 인스턴스로 시작하고 저장소에는 기록하지 않는다. 새 그림 등록 시 순환 수에 고정된 16을 수정할 필요가 없다. PORTRAIT의 순환 인스턴스와 독립이다.

- 2026-09-29 만화 추가: `COMIC_UNIT_PUZZLES`의 `ComicA114`, `ComicA224`, `ComicA424`, `ComicA1634` 4종을 기존 12종에 더해 총 16종이다. 원본 JPG는 `assets/puzzle-originals/comics/`에 복사·보관하고 제공된 외부 파일은 수정하지 않는다. 원본은 모두 720×702이며 1·3·4번은 좌우 9px씩, 2번은 왼쪽 말풍선 꼬리 보존을 위해 오른쪽 18px만 잘라 702×702로 만든다. 흰 여백 추가·늘려 맞추기·업스케일은 하지 않는다. 9조각은 각 234×234, 완성 WebP는 702×702다.
- 만화 준비 명령: `node scripts/split-unit-image.cjs assets/puzzle-originals/comics/A-1-1-4.jpg ComicA114 crop 9 90` (실행 환경에 `sharp` 필요). 마지막 `90`은 완성 사진의 WebP 품질이다. 완성 WebP를 먼저 압축·디코딩한 뒤 그 픽셀에서 조각을 무손실 분할하므로 제시 이미지와 조각 재조립 결과가 정확히 일치한다. 기존 옵션 없는 명령은 `contain`·960px·무손실 방식을 유지한다. 기존 그림을 새 방식으로 일괄 재생성하지 않는다.
- 여러 캐릭터가 등장하는 그림은 `memberId`(대표)와 `otherMemberIds`(함께 등장)를 기록한다. 목표와 오답에 **한 명이라도 공통 멤버가 있으면 어려움**으로 분류하며 전체를 합쳐 최대 2조각이다(캐릭터마다 2개가 아님). 1번은 태피+티피, 2번은 티피, 3번은 태피+티피+후피, 4번은 후피다. 이름과 완료 영상은 대표 캐릭터인 태피·티피·태피·후피를 사용한다. 만화의 중간 분류는 중심 캐릭터의 색·형태 태그에 `felt-comic` 재질 태그를 더한다. 게임 2·3의 이미지 목록은 그대로다.

- 2026-09-29 PUZZLE: `core/pick/game.ts`의 `createUnitBoard`는 정답 전부를 유지하고 오답을 어려움 최대 2개·중간 12개·나머지 쉬움으로 구성한다. **정답 그림과 `memberId`가 같고 그림 ID가 다른 조각은 무조건 어려움**이다. 앞/뒤·다른 포즈·추가 그림을 모두 합쳐 최대 2개이며 중간·쉬움으로 다시 섞지 않는다. 다른 캐릭터끼리 `similarityTags`가 겹치면 중간, 겹치지 않으면 쉬움이다. 후보가 충분한 9조각 보드는 9+2+12+26, 12조각 보드는 12+2+12+23이다. 어려운 후보가 1개/0개이면 부족분을 쉬움으로 채운다. 중간 부족분도 쉬움으로만 보충하며 쉬움까지 부족하면 중복이나 더 어려운 조각으로 채우지 않고 테스트에서 오류로 발견하도록 한다.
- 새 퍼즐 등록 시 `src/content/puzzles.ts`의 `character(...)`를 사용한다. `UNIT_MEMBER_PROFILES`는 영문 캐릭터 이름을 안정적인 `memberId`와 색·형태 분류에 연결하므로 **새 파일명·앞/뒤·3D 그림이어도 같은 멤버로 등록하면 최대 2개 규칙을 자동으로 공유**한다. 현재 분류는 노란색 둥근 형태(뽀글스·해피·티피), 흰 얼굴(해피·후피·피노팬), 악기(뽀글스·후피), 파랑/노랑 특징(재피·피노팬·태피)이다. 이미지 픽셀을 자동 분석하는 기능은 아니므로 색감·구도가 크게 달라진 신규 그림은 등록할 때 분류를 검토한다. 완전히 새로운 캐릭터는 프로필도 추가해야 하며, 프로필 없이 등록하면 오류로 알려준다. 여러 캐릭터가 함께 나온 만화는 대표 캐릭터·난이도 기준을 먼저 정한다.
- 앞으로 원본 이미지를 추가하는 절차: (1) 원본 보관 → (2) 기존 `scripts/split-unit-image.cjs`로 정사각형 WebP와 9조각 생성·재조립 검증 → (3) 조각 폴더 glob 및 `ADDITIONAL_UNIT_PUZZLES`에 고유 그림 ID·기존 멤버명·완료 영상 ID로 추가 → (4) `npm test`와 `npm run build` 및 모바일 플레이 검증. 예: `character("tapee-new", "Tapee", "TapeeNew", true, "tapee")`. Git에 파일만 업로드하면 바로 노출되는 방식은 아니며 등록 후 난이도 배분이 자동 적용된다. 기존 7종 및 추가 그림을 삭제·대체하지 않는다. 기존 12조각은 3×4 구성을 그대로 유지한다.

- 2026-09-20 PORTRAIT: `scripts/optimize-portrait.cjs`가 새 `게임2캐릭터명` 7폴더의 원본과 1–24번을 비율 보존 512×512 WebP로 변환하여 `optimized/portrait/`에 저장한다. 번호별 쉬움(1–5)/중간(6–20)/어려움(21–24)은 콘텐츠가 정의하고 `createProgressiveMontageBoard`가 단계별 오답 수 [3,0,0]/[5,3,0]/[3,12,0]/[5,15,4]를 선택한다. 보드는 중복 없이 구성하며 후보가 부족하면 오류로 감지한다. 이전 8개 제외 규칙과 형태 위주 시작 규칙은 새 분류로 대체된다. 5×5의 두 블록 교환, 하트, 단계별 문제 수는 유지한다. POSITION은 별도 `optimized/montage/*/answer.webp`의 기존 얼굴을 유지한다.

- 몽타주 오답 후 정답 타일에는 `.is-answer-hint`를 붙여 TEN 안내 스타일의 금빛 효과를 1.1초씩 세 번 표시한다. 정답 클릭 또는 애니메이션 종료 시 제거한다. 동작 줄이기에서는 같은 시간 동안 정적인 강조만 표시한다. 정답 타일 ID를 사용해 자리 교환에도 같은 블록을 따라간다.

- 몽타주 제시 그림의 `.montage-target-image`는 퍼즐과 같은 색의 1px 내부 outline을 사용한다. `width: auto`와 기존 높이로 원본 비율을 유지하며, 테두리는 레이아웃 공간을 차지하지 않는다. 내부 그리드는 없다.

- 제시 그림의 테두리·구획선은 `renderUnitPreview`의 SVG 오버레이로 그린다. `viewBox`를 실제 열·행 수로 지정하고 내부 선을 정수 경계에 놓아 컬러 이미지의 비율 기반 `clip-path`와 정렬한다. 이전의 반복 CSS 배경 구획선은 사용하지 않는다. 외곽선은 이미지 위에 겹치므로 크기·분할 좌표를 바꾸지 않으며, `showGrid`가 꺼져도 외곽 테두리는 유지한다.

- 퍼즐 목록: `PUZZLE_CHARACTERS`는 기존 7종(`Bb`, `Ha`, `Hoo`, `Ja`, `Pino`, `Tapee`, `Tepee`)을 원래 그림·9/12조각으로 유지한다. `UNIT_TARGET_CHARACTERS`는 이 7종과 `ADDITIONAL_UNIT_PUZZLES`의 그림 5종, `COMIC_UNIT_PUZZLES`의 만화 4종을 합친 총 16종이다. **사용자가 이미지를 추가해 달라고 할 때 기존 제시 목록을 대체하거나 제외하지 않는다.** 해피 원본 `ha`와 해피 당근 `hapee-carrot`도 별도 퍼즐이다.
- 원본 한 장 퍼즐: `Ha/carrot-original.png`와 `assets/puzzle-originals/game1-02.png`~`game1-05.png`는 제공 원본 보관본이다. `scripts/split-unit-image.cjs`가 비율을 보존한 960×960 완성 WebP와 320×320 조각 9장을 생성하고 재조립 픽셀 일치를 검사한다. 게임은 WebP만 불러온다. `ADDITIONAL_UNIT_PUZZLES`의 그림별 고유 `id`로 정답·개인 기록을 구분하고, `celebrationId`는 같은 캐릭터의 완료 영상을 연결한다. 서로 다른 그림의 조각은 같은 캐릭터라도 오답이다. `showGrid`는 위쪽 제시 그림에만 SVG 구획선을 표시한다. 게임 2·3은 이 추가 그림을 사용하지 않는다.
- 콘텐츠 확장: 만화 한 컷 4종은 위의 크롭 방식으로 구현했다. 앞으로도 3D 재질이나 만화 이미지를 추가할 때 대표 캐릭터·함께 등장하는 캐릭터·완료 영상·구획별 가독성을 검토한 뒤 등록한다. 별도 재질 선택이나 만화 전용 모드는 추가하지 않는다.
- 게임 2의 `core/pick/game.ts` → `RandomIndexCycle`은 앱 실행 동안 남은 캐릭터 순서를 보관한다. 매 묶음에 일곱 명을 한 번씩 섞고 묶음 사이 연속 중복을 막는다. `startMode`나 단계 진급에서는 초기화하지 않으며 페이지 새로고침 시에는 새 인스턴스로 시작한다. 오답·일시정지는 순서를 소비하지 않는다.

- 게임 1·2의 제시 그림 위 이름은 `content/puzzles.ts`의 공통 한글 이름 매핑과 `displayName`을 사용합니다(예: `재피 Zapee`). 게임 2는 새 문제마다 갱신하며 게임 3에서는 숨깁니다. 파일 경로와 캐릭터 ID는 표시 이름과 별개입니다.

- 각 캐릭터 폴더의 PNG는 완성 이미지로 사용합니다.
- JPG 파일은 정사각형 조각이어야 합니다.
- 파일 추가·교체 뒤에는 `npm run build`로 Vite가 모든 이미지를 포함하는지 확인합니다.
- 캐릭터 폴더를 추가하면 `src/content/puzzles.ts`의 glob 패턴과 캐릭터 목록을 함께 수정합니다.
- 게임 2는 일곱 캐릭터 얼굴의 정답과 바리에이션을 사용합니다. 런타임에는 `optimized/montage/` 아래 캐릭터별 폴더의 `answer.webp`, `variation-*.webp`를 불러옵니다.
- 게임 2의 `core/pick/montage.ts`는 2×2(3문제) → 3×3(5문제) → 4×4(5문제) → 5×5(5문제)의 진급·완료, 생명 보너스, 두 블록 교환과 문 닫기·열기 시간을 관리합니다. `planMontageSwap`은 서로 다른 그림 두 개만 교환하고 나머지는 보존합니다. UI는 완전히 가려진 구간에 DOM 순서를 변경하며 문 진행률을 게임 시간에 맞추므로 일시정지 시 문도 멈춥니다.
- `content/puzzles.ts`의 `MONTAGE_EXCLUDED`는 승인된 뒷모습·상하 반전 8개를 모든 단계와 프리로드에서 제외합니다. 원본 파일은 보관합니다. `MONTAGE_DIFFICULTY`는 원본과 비교해 검토한 바리에이션 파일 번호입니다. 첫 2×2는 색상만 바뀐 이미지·좌우 반전·3D 버전 대신 눈·입·머리·모자 등의 형태 변화만 사용하며, 후반은 작은 얼굴·장식 차이 이미지를 우선 사용합니다. 3×3 이후에는 제외된 8개 외의 기존 색상 바리에이션도 사용할 수 있습니다. 난이도 체감은 플레이 테스트 후 조정합니다.
- 게임 1·2는 제한시간 없이 `PickLives`로 생명을 관리합니다. 생명이 0이면 Game Over입니다. 게임 1 실패 영상은 `characterCelebrations.tepee`, 게임 2의 성공·실패 영상은 마지막 플레이 캐릭터를 사용합니다. 게임 2의 3×3 완료 보너스는 최대 5개까지 한 번만 회복합니다. 게임 1의 내부 경과시간은 성공 점수 계산에만 사용합니다.
- 게임 3은 `MEMORY_FACES`의 원본 얼굴 7종만 반복해 8·12·18·24쌍을 구성합니다. 게임 2의 최적화된 정답 얼굴(`answer.webp`)만 재사용하고 바리에이션은 제외합니다. `MEMORY_PREVIEW_MS`로 단계별 미리보기 시간을 설정합니다.
- 게임 3과 보관 중인 페어 튜토리얼의 카드 뒷면은 `src/ui/memoryQuestionIcon.ts`의 물음표를 공유합니다. TAPtoTEN의 `SUM = ?`와 같은 네이티브 UI 서체 목록(`Apple SD Gothic Neo`, `Noto Sans KR`, `Malgun Gothic`, system-ui, sans-serif)과 굵기 900을 사용합니다. 고정 SVG 안의 텍스트로 표시하며 카드의 58%, 최대 52px로 유지하므로 글꼴 메트릭이 카드 크기를 바꾸지 않습니다. OS별 실제 글꼴은 TAPtoTEN처럼 달라질 수 있습니다. 카드 버튼의 접근성 설명은 유지하고 아이콘 자체는 보조기기에 중복 낭독하지 않습니다.
- 메모리 빛 효과는 `pickExperience.css`에서만 조정합니다. 열린 카드의 반사광은 불투명도 0.65, 정답 노란빛은 알파 0.4, 번짐은 6px·알파 0.16입니다. 게임 1·2의 효과와 카드 뒤집기·정답 처리 시간은 유지합니다.
- `src/core/pick/memory.ts`의 `MEMORY_STAGES`는 보드 크기·쌍 수·단계별 제한시간을 정의합니다. `MemoryRun`이 미리보기, 동일 이미지 매칭, 단계 전환, 시간 초과를 처리합니다. UI는 일시정지 중 시간을 전달하지 않아 타이머와 뒤집기 대기도 함께 멈춥니다.

## 의존 방향

```text
ui → content → core/pick
       ↑
     config
```

`core/pick`은 DOM, CSS, localStorage를 참조하지 않습니다. 규칙 변경에는 Vitest 테스트를 함께 추가합니다.
