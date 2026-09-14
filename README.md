# Compound

서울대 3학년 · Wiserlab 파운더 · 투자자를 위한 한국어 개인 OS.  
산업 도면 톤의 모바일 퍼스트 PWA입니다. iPhone Safari와 Android Chrome 모두 홈 화면에 설치할 수 있습니다.

첫 실행은 **빈 원장**입니다. 샘플 데이터는 넣지 않습니다.

## 탭

| 이름 | 내용 |
| --- | --- |
| 오늘 | 제목 → (선택) 시간 → 저장. 행을 탭하면 완료. 수정·밀어서 삭제 |
| 캘린더 | 제목 + 시작 + 끝 + 저장. 주간은 날짜만, 일정은 아래 목록. 같은 폼으로 수정 |
| 프로젝트 | 이름만 만들어 열고, 작업을 한 줄로 추가. 진행률 표시 |
| 기록 | 동작·kg·회를 한 폼에. 지난 세션 최소는 참고만. 식사/체중/수면/독서 |

영역 값은 내부적으로만 쓰입니다. 추가 화면에 칩을 두지 않습니다.

상태는 `localStorage` (`compound.ledger.v6`)에 저장됩니다. v5 원장은 시작·끝 시간으로 옮깁니다. 기록 탭에서 **초기화** / **보내기**(JSON).

## 로컬 실행

```bash
npm install
npm run dev
```

기본 포트는 `43123`입니다. 빌드:

```bash
npm run build
npm start
```

## 홈 화면에 설치

PWA 기준: `public/manifest.json` · `display: standalone` · 아이콘 192/512 (`any` + `maskable`) · `theme_color` `#5980a6` · `background_color` `#f2f2f3` · `start_url` `/`. HTTPS는 Vercel이 제공합니다.

**Android Chrome**
1. 배포 URL을 Chrome으로 열니다.
2. 메뉴에서 앱 설치 또는 홈 화면에 추가를 고릅니다.

**iPhone Safari**
1. Safari로 배포 URL을 열니다.
2. 공유에서 홈 화면에 추가를 고릅니다.

standalone · portrait. App Store / Play Store / Capacitor 없음.

## 스택

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Vercel
