# Compound

서울대 3학년 · Wiserlab 파운더 · 투자자를 위한 한국어 개인 OS.  
산업 도면(blueprint) 톤의 모바일 퍼스트 PWA입니다. iPhone Safari와 Android Chrome 모두 홈 화면에 설치할 수 있습니다.

첫 실행은 **빈 원장**입니다. 데모 블록·주간 목표·캘린더 슬롯·Wiserlab/Investor/학기 트랙·채워진 기록은 넣지 않습니다.

## 탭

| 코드 | 이름 | 내용 |
| --- | --- | --- |
| TDY | 오늘 | 빈 일차, 작업 추가·제목 수정·완료·삭제, 사용자 주간 목표 CRUD, AM/PM/EVE, 일일 리뷰 |
| CAL | 캘린더 | 월/주, 영역 칩, 요일 반복, 대기 생성·삭제 → 슬롯 드래·탭, localStorage 유지 |
| PRJ | 프로젝트 | 빈 트랙. 트랙/하위/작업 생성·이름·마감·삭제, 실제 완료율 |
| LOG | 기록 | kg×회 세트, Σ(kg×회) 세션 볼륨, 동작별 지난 세션 기록, 「지난번 같은 운동 대비 오늘 최소 …」, 영양/체중/수면/독서 CRUD |

영역: Wiserlab(W), 투자 리서치(I), 웨이트(B), 식사(F), 수면(S), 독서(R), 수업·루틴(C)

상태는 `localStorage` (`compound.ledger.v5`)에 저장됩니다. 이전 v1–v4 캐시는 읽고 버립니다. 기록 탭에서 **초기화** / **보내기**(JSON).

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
1. 배포 URL을 Chrome으로 엽니다.
2. 설치 배너의 **설치**, 또는 메뉴(⋮) → **앱 설치** / **홈 화면에 추가**.

**iPhone Safari**
1. Safari로 배포 URL을 엽니다.
2. 공유 → **홈 화면에 추가**.

standalone · portrait. App Store / Play Store / Capacitor 없음.

## 스택

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Vercel

## 디자인

Barlow / Barlow Condensed, 배경 `#f2f2f3`, 액센트 `#5980a6`, 등록 마크가 있는 blueprint 프레임.
