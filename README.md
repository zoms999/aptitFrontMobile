# Aptit Mobile App

모바일 환경에 최적화된 적성검사 PWA 애플리케이션입니다.

## 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT
- **PWA**: Service Worker, Web App Manifest

## 개발 환경 설정

1. 의존성 설치:
```bash
npm install
```

2. 환경 변수 설정:
`.env.local` 파일을 생성하고 데이터베이스 연결 정보를 입력하세요.

3. 데이터베이스 설정:
```bash
npx prisma generate
npx prisma db push
```

4. 개발 서버 실행:
```bash
npm run dev
```

## 프로젝트 구조

```
src/
├── app/                 # Next.js App Router
│   ├── (auth)/         # 인증 관련 페이지
│   ├── dashboard/      # 대시보드
│   ├── test/          # 테스트 관련 페이지
│   ├── profile/       # 프로필 페이지
│   └── api/           # API 라우트
├── components/         # 재사용 가능한 컴포넌트
│   ├── ui/            # 기본 UI 컴포넌트
│   ├── mobile/        # 모바일 특화 컴포넌트
│   ├── test/          # 테스트 관련 컴포넌트
│   └── charts/        # 차트 컴포넌트
├── lib/               # 유틸리티 함수
└── types/             # TypeScript 타입 정의
```

## 주요 기능

- 📱 모바일 최적화된 반응형 디자인
- 🔄 PWA 지원 (오프라인 기능, 홈 화면 설치)
- 🔐 JWT 기반 인증 시스템
- 📊 적성검사 및 결과 분석
- 📈 차트를 통한 데이터 시각화
- 🎨 다크/라이트 테마 지원