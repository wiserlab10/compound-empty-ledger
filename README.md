# Compound

오늘 · 캘린더 · 프로젝트 · 기록을 한곳에 모은 한국어 개인 OS.  
iOS 네이티브 앱처럼 보이는 모바일 퍼스트 PWA입니다.

첫 실행은 **빈 원장**입니다. 샘플 데이터는 넣지 않습니다.

## 탭

| 이름 | 내용 |
| --- | --- |
| 오늘 | 큰 제목, 빠른 추가 캡슐, 일정 피드. 행을 탭하면 완료. 시트에서 추가·수정 |
| 캘린더 | 월 그리드 + 주간 띠. ＋ 시트로 제목·시작·끝 저장. 점 표시 |
| 프로젝트 | 목록에서 열고, 작업을 시트로 추가. 진행률·삭제 |
| 기록 | 동작·kg·회 한 폼. 지난 세션 최소는 참고. 식사/체중/수면/독서 |

상태는 `localStorage` (`compound.ledger.v6`)에 저장됩니다. v5 원장은 시작·끝 시간으로 옮깁니다.

## 로컬 실행

```bash
npm install
npm run dev
```

기본 포트는 `43123`입니다.

## 홈 화면에 설치

PWA: `public/manifest.json` · standalone · 아이콘 192/512 · `theme_color` `#F2F2F7`.

## 스택

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Vercel
