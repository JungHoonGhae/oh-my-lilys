# lilys-cli: What Worked, What Didn't

---

## Requirements (시작점)

> "CLI tool that reverse-engineers lilys.ai, like steipete's bird project"

One sentence. That's the vibe.

**What we needed:**
- OAuth 인증 (Firebase Google)
- URL → 요약 세션 생성
- 세션 → 리포트 조회
- 모든 리포트 타입 지원

---

## Problem Solving Flow

### Flow 1: OAuth 토큰 추출

```
목표: lilys.ai에 로그인해서 토큰 얻기
방법: 브라우저 자동화
도구: Playwright MCP
```

**Trial:**
1. Firebase auth 객체에서 `getIdToken()` 호출 → 성공

**이건 바로 됨.** Playwright evaluate 쓰면ブラウザから直接トークンが抜ける。简单.

---

### Flow 2: sessionId 502 에러

```
목표: 세션에 리소스 추가하기
방법: API 호출
결과: 502 Internal Server Error
```

**Trial:**
1. 처음에는 문자열로 sessionId 보냄 → 502
2. API 문서가 없음 → curl로 테스트 시작
3. "Invalid token" 에러 → 토큰 문제인 줄 알음
4. 数小时后, 숫자로 바꿔서 테스트 → 성공

**배운 점:**
```
sessionId: "8211817"  ❌ (문자열)
sessionId: 8211817    ✅ (숫자)
```

이건 문서에도 없고, trial-and-error로 발견. **이거 기록해둬야 됨.**

---

### Flow 3: process-input-link 실패

```
목표: 웹사이트/PDF URL로 세션 생성
방법: process-input-link API 호출
결과: {"action":"error","errorType":"notProperUrl"}
```

**Trial:**
1. YouTube → 작동함
2. 웹사이트 → "notProperUrl"
3. PDF → "notProperUrl"

**해결:**
- YouTube: metadata API (`5wjqcmluif.execute-api.../metadata?sourceId=...`)
- 웹사이트/PDF: createDigestSession으로 직접 생성, 리소스 연결은 graceful fail

**이건 architecture 문제.** API가 incomplete함. CLI에서 우회해서 해결.

---

### Flow 4: 리포트 타입 발견

```
목표: 어떤 noteType이 있는지 확인
방법: UI 분석
도구: agent-browser MCP
```

**Trial:**
1. lilys.ai 세션 페이지로 이동
2. 스냅샷 찍기
3. 버튼 텍스트에서 타입 발견

```
- Detailed report
- Key report  
- Easy report
- Script
- Animation (New)
- Infographic
- Background
- Deep Dive
```

**이건 clever 해결.** UI 건드리지 않고 타입 리스트 얻음.

---

## What to Keep

### 1. MCP 도구 조합

**Playwright + agent-browser:**
- Playwright: 토큰 추출, 자동화
- agent-browser: UI 스냅샷, 인터랙티브 분석

이 두 개면 웹 기반 API 리버싱 충분함.

### 2. trial-and-error 기록

PLAN.md에 발견한 API랑 에러 내용 정리해둠.
나중에 다시 보면 도움이 됨.

### 3. graceful fail

웹사이트/PDF 리소스 연결이 안 되면:
- 세션은 만들고
- 에러는 출력하지만
- 프로세스는 끝까지 감

이거 좋은 pattern.

---

## What to Improve

### 1. 세션 생성 후 watch 기능 없음

```
현재: 세션 만들고 끝
문제: 리포트 생성이 언제 끝나는지 모름
```

**개선:**
```bash
lilys watch 8211949
# 또는
lilys summarize https://... --wait
```

 polling으로 리포트 완료 대기 → 내용 바로 출력.

### 2. export 기능 없음

```
현재: HTML에서 text 추출만
문제: Markdown/PDF로 내보내기 불가능
```

**개선:**
```bash
lilys report 8211090 --format markdown
lilys report 8211090 --format pdf
```

### 3. 오디오/PDF 리소스 연결 안 됨

```
현재: graceful fail으로 세션만 만들고 리소스 연결 안 함
문제: 세션 비어있음
```

**개선:**
- `process-input-link` 대안 API 찾기
- 또는 브라우저로 자동 추가 (Playwright로 lilys.ai UI 조작)

### 4. 테스트 없음

```
현재: manual 테스트만
문제: API 변경되면 바로 깨짐
```

**개선:**
- API response mocking
- Mock server로 테스트

---

## What I Would Do Different

### 1. "Spec first" 안 했음

이건 Good.

> "Spec first는 old way. Start building."

그냥 바로 만들고, 문제生겻을 때 해결함. 이게 맞았음.

### 2. 더 일찍 agent-browser 쓸 걸

처음에는 curl로만 했음. agent-browser 쓰면 UI에서 바로 타입 발견 가능.

**앞으로:**
- API 리버싱 → curl 먼저
- UI 분석 필요 → agent-browser 바로

### 3. MCP 도구 skill로 바로 접근할 걸

skill 로드해서쓰는 거 처음에 몰랐음.

**앞으로:**
- 브라우저 필요 → skill_mcp로 playwright
- UI 분석 → skill_mcp로 agent-browser

---

## Final Verdict

**이 프로젝트:**
- ✅ CLI-first: OK
- ✅ One thing: OK (lilys.ai 요약)
- ✅ Solve MY problem: OK (매일 쓸 것 같음)
- ✅ Fast iteration: OK (몇 시간에 완성)

**수정할 거:**
1. watch 명령어
2. export (Markdown/PDF)
3. 오디오/PDF 리소스 연결

**전체 평가:**

> "Actually, yeah. That's the vibe. Go ship it."

---

*Written as steipete would review it*
*2026-02-19*
