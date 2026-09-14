# Compound

오늘 · 캘린더 · 프로젝트 · 기록을 한곳에 모은 한국어 개인 OS.  
정보 구조는 이 네 탭을 유지합니다. 홈/할일/습관/언제가로 바꾸지 않습니다.

시각 언어는 iOS(SF 시스템 폰트, `#F2F2F7`, 라운드 카드, 탭바, 시트)입니다.

첫 실행은 **빈 원장**입니다. 샘플 데이터는 넣지 않습니다.

## 탭

| 이름 | 내용 |
| --- | --- |
| 오늘 | 빈 날 카드 안에서 「첫 작업 추가」. 기본은 제목(+선택 시간). 메모·영역·반복은 접힘 |
| 캘린더 | 날짜 탭 후 시작·끝(24시간). 드래그는 선택 |
| 프로젝트 | 트랙에서 바로 작업 추가·삭제. 하위 트랙을 강제하지 않음 |
| 기록 | kg × 횟수. 저장 후 입력 비우고 다음 세트에 포커스. 지난 세션 최소는 참고 |

시간은 한국 UI 기준 **24시간만** 표시합니다.

상태는 `localStorage` (`compound.ledger.v6`)에 저장됩니다. v5 원장은 시작·끝 시간으로 옮깁니다.

로그인하면 같은 원장을 Supabase `compound_ledgers`에 올립니다. 로그아웃해도 기기의 로컬 원장은 그대로 쓸 수 있습니다.

## 계정 · 동기화

- 로그인하지 않아도 앱은 동작합니다. 배너: 「로그인하면 기기 간 동기화」
- iOS 홈 화면(PWA)에서는 **이메일 + 비밀번호**가 기본입니다. 매직 링크는 같은 브라우저에서 열어야 세션이 유지됩니다.
- 첫 로그인: 이 기기의 localStorage 원장을 클라우드에 올립니다.
- 이후: 서버 `updated_at`이 더 새면 서버 원장을 쓰고, 아니면 로컬을 올립니다. 변경은 0.8초 디바운스 후 upsert.

### Supabase Auth URL (대시보드에 붙여넣기)

Authentication → URL Configuration:

- Site URL: `https://compound-two-lyart.vercel.app`
- Redirect URLs:
  - `https://compound-two-lyart.vercel.app/**`
  - `https://compound-two-lyart.vercel.app/auth/callback`
  - `http://127.0.0.1:43123/**`
  - `http://127.0.0.1:43123/auth/callback`

프로젝트는 기존 `rush-hour-shift`입니다. `rhs_rooms`는 건드리지 않습니다.

Vercel 환경 변수:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (legacy anon JWT)

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
