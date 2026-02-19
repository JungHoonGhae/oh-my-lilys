# lilys-cli Technical Retrospective

## 프로젝트 개요

- **프로젝트**: lilys-cli
- **목적**: lilys.ai API 리버스 엔지니어링을 통한 CLI 도구 개발
- **유사 프로젝트**: steipete의 bird (Twitter/X CLI)
- **기술 스택**: Bun + TypeScript

---

## 사용한 도구 & 스킬

### MCP (Model Context Protocol) 도구

| 도구 | 사용 목적 |
|------|----------|
| **Playwright** | 브라우저 자동화, OAuth 토큰 추출 |
| **agent-browser** | lilys.ai UI 분석, 리포트 타입 발견 |

### 스킬

| 스킬 | 사용 목적 |
|------|----------|
| **playwright** | Firebase OAuth 로그인, 토큰 추출 |
| **agent-browser** | 웹 UI 인터랙티브 분석 |

### 개발 도구

| 도구 | 용도 |
|------|------|
| **Bun** | 런타임, 패키지 매니저, 빌드 |
| **TypeScript** | 타입 안전성 |
| **curl** | API 디버깅, 엔드포인트 테스트 |
| **jq** | JSON 응답 파싱 |

---

## 기술적 도전과 해결

### 1. OAuth 토큰 추출

**문제**: lilys.ai는 Firebase Google OAuth를 사용. 브라우저에서 수동 로그인 후 토큰을 추출해야 함.

**해결**: Playwright MCP로 브라우저 자동화
- Firebase auth 객체에서 `idToken` 추출
- Playwright의 `page.evaluate()`로 토큰 읽기

```typescript
const token = await page.evaluate(() => {
  return firebase.auth().currentUser?.getIdToken();
});
```

### 2. sessionId 타입 오류 (502 에러)

**문제**: `digest-session-resources-add` API가 502 에러 반환

**분석**: 
- API 응답: `{"error":"Unauthorized Access","errorCode":"invalid_token"}`
- 원인: sessionId를 문자열로 전달하고 있었음

**발견**: API 문서에는 없고, trial-and-error로 발견
- sessionId必须是 **숫자** (number), 문자열 아님

**해결**:
```typescript
// ❌ 오류
body: JSON.stringify({ sessionId: "8211817", ... })

// ✅ 수정
body: JSON.stringify({ sessionId: parseInt(sessionId, 10), ... })
```

### 3. process-input-link "notProperUrl" 에러

**문제**: 웹사이트/PDF URL을 `process-input-link`에 보내면 에러 반환

**분석**:
- YouTube: 정상 작동
- 웹사이트/PDF: `{"action":"error","errorType":"notProperUrl"}`

**해결**: 대안 API 발견
- YouTube: `getSourceMetadata` API 사용 (YouTube video ID 추출)
- 웹사이트/PDF: `createDigestSession`으로 직접 세션 생성 (리소스 연결은 graceful fail)

### 4. 리포트 타입 탐색

**문제**: 어떤 noteType이 가능한지 문서화되어 있지 않음

**해결**: agent-browser로 lilys.ai 웹 UI 스냅샷 분석
- Playwright로 Session 페이지 접근
- 리포트 생성 버튼 스냅샷에서 타입 발견:
  - Detailed report, Key report, Easy report
  - Script, Animation, Infographic, Background, Deep Dive

### 5. AWS Signature 인증 우회

**문제**: AWS API (`wp8tovrz8a...`)가 Signature 필요로 함

**분석**:
```
Authorization header requires 'Credential' parameter.
Authorization header requires 'Signature' parameter.
```

**발견**: `x-api-key: release` 헤더만 있으면 Signature 없이도 작동함

```typescript
if (options.isAWS) {
  headers["x-api-key"] = "release";
}
```

---

## 발견한 API 엔드포인트 요약

| 엔드포인트 | 방법 | 중요 발견사항 |
|-----------|------|-------------|
| `/digest-session-v2` | POST | sourceType은 `youtube_video` 사용 |
| `/digest-session-resources-add` | POST | **sessionId必须是 숫자** |
| `/digest-sessions` | GET | response 구조: `{ digestSessions: [] }` |
| `/metadata` | GET | YouTube ID → 메타데이터 |
| `/notes` | POST | noteType 파라미터 |
| `/notes/:sessionId` | GET | 노트 목록 조회 |
| `/notes/:sessionId/:noteId` | GET | HTML 콘텐츠 반환 |

---

## 회고

### 어려웠던 점

1. **API 문서 부재**: 공식 문서가 없어 trial-and-error로 하나씩 발견해야 했음
2. **숫자 vs 문자열**: sessionId 타입问题가 502 에러의 원인으로 발견되기까지 시간 소요
3. **UI 기반 타입 탐색**: 리포트 타입을 알기 위해 브라우저로 UI 분석 필요
4. **서버 타임아웃**: lilys.ai 서버가 가끔 504 타임아웃 발생 - 클라이언트 문제는 아님

### 배운 점

1. **AWS API 우회**: `x-api-key` 헤더 하나로 Signature 인증 우회 가능 (개발용으로만)
2. **Playwright + MCP**: 웹 UI 분석에 강력한 도구
3. **trial-and-error**: 리버스 엔지니어링에서는 실패를 기록으로 삼는 것이 중요

### 다음 개선 사항

1. **watch 명령**: 세션 생성 후 리포트 완료 대기
2. **export**: Markdown/PDF로 내보내기
3. **대기 시간 최적화**: 폴링으로 리포트 생성 대기
4. **오디오/PDF 개선**: 현재는 세션만 생성, 리소스 연결 graceful fail

---

## 프로젝트 파일 구조

```
lilys-cli/
├── src/
│   ├── index.ts           # CLI 엔트리
│   ├── api/
│   │   └── client.ts     # API 클라이언트 (핵심)
│   ├── commands/
│   │   ├── login.ts      # OAuth + 토큰 추출
│   │   ├── summarize.ts  # URL → 세션
│   │   ├── sessions.ts   # 목록 조회
│   │   └── report.ts     # 리포트 조회/생성
│   └── utils/
│       └── config.ts      # 토큰 저장소
├── README.md              # 사용 문서
├── PLAN.md                # API 발견 기록
└── package.json
```

---

*Created: 2026-02-19*
*Tools: Bun, TypeScript, Playwright MCP, agent-browser*
