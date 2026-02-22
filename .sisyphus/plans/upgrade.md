# oh-my-lilys 고도화 Work Plan

## TL;DR

> **Quick Summary**: Report 생성/조회 문제 해결 + --json/--md 출력 포맷 + 배치 처리 + 재시도/백오프 + 토큰 보안 강화
>
> **Deliverables**:
> - Report 생성/조회 정상화
> - `--json` / `--md` 출력 포맷
> - 배치 처리 (stdin, 파일 입력)
> - 재시도/백오프 로직
> - 토큰 안전 저장 (파일 권한 + 마스킹)
>
> **Estimated Effort**: Medium (2-3일)
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Wave 1 → Wave 2 → Wave 3 → Wave 4 → Final

---

## Context

### Original Request
oh-my-lilys CLI 고도화 - 리버스 엔지니어링으로 새로운 기능 발견 + Automation 방향

### Interview Summary
**Key Discussions**:
- 사용자가 CLI를 자주 사용 중
- Report 생성/조회가 잘 안 되는 문제
- 컬렉션, 스트리밍 기능 미구현
- Automation 방향 선호 (--json, 배치 등)

**Research Findings**:
- 새로운 API 베이스 발견: `agent-release.lilys.ai`, `task-runner.lilys.ai`
- 새로운 엔드포인트: `note-templates`, `note-tabs`, `chat-threads`, `lily-suggestions`
- 기존 코드 한계: 재시도 없음, 토큰 평문 저장, --json 없음, 테스트 없음

### Metis Review
**Identified Gaps** (addressed):
- Report "문제" 정의 구체화 필요 → Wave 2에서 명확한 시나리오 정의
- Output 계약 (--json 스키마) → Wave 3에서 스키마 정의
- Batch 실패 전략 → Wave 3에서 per-item 결과 + exit code 규칙
- Backward compatibility → 기존 출력 유지, 새 기능은 opt-in
- Scope locking → "Report E2E 안정화 + --json/--md + 배치 + 재시도 + 토큰 보안만"

---

## Work Objectives

### Core Objective
oh-my-lilys CLI의 Report 기능을 안정화하고, Automation을 위한 출력 포맷과 배치 처리를 추가한다.

### Concrete Deliverables
- Report 생성/조회 정상 작동
- 모든 주요 명령어에 `--json` / `--md` 출력 지원
- stdin/파일에서 URL 목록 읽어 배치 처리
- 네트워크 실패 시 재시도/백오프
- 토큰 안전 저장 (0600 권한 + 로그 마스킹)

### Definition of Done
- [ ] `lilys report <sessionId>` 가 정상적으로 Report 생성 + 조회
- [ ] `lilys summarize <url> --json` 이 유효한 JSON 출력
- [ ] `lilys summarize --file urls.txt` 가 배치 처리
- [ ] 네트워크 실패 시 3회 재시도 후 명확한 에러
- [ ] 토큰 파일이 0600 권한으로 저장

### Must Have
- Report E2E 안정화
- `--json` 출력 포맷
- 기본 재시도/백오프 (3회, 지수 백오프)
- 토큰 파일 권한 0600

### Must NOT Have (Guardrails)
- 기존 CLI 출력/exit code 변경 (backward compatibility)
- 새 엔드포인트 전체 통합 (Report에 필요한 것만)
- 스케줄러/데몬 기능
- UI/TTY 의존 기능 (진행바 등)
- 불필요한 아키텍처 변경
- 4xx 에러 재시도 (401, 403, 404 등은 재시도 금지)
- 토큰/민감정보 로그 노출 (--verbose에서도 마스킹 필수)

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: NO (새로 설정)
- **Automated tests**: TDD
- **Framework**: bun test
- **TDD**: Each task follows RED → GREEN → REFACTOR

### stdout/stderr Contract (CRITICAL)
When `--json`/`--md` is set:
- **stdout**: ONLY the machine-readable payload (JSON/Markdown)
- **stderr**: ALL logs, progress, debug messages
- This enables safe piping: `lilys sessions --json | jq '.data'`

### QA Policy
Every task includes agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Unit Tests (bun test)**: Mock `globalThis.fetch`, no token required, deterministic
- **Integration Tests**: Mock server responses, verify command behavior
- **Optional Smoke Tests**: Real API calls labeled "manual/optional" - NOT in DoD

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — 병렬 가능):
├── Task 1: 테스트 인프라 설정 [quick]
├── Task 2: TypeScript 타입 정의 (API 응답 스키마) [quick]
├── Task 3: API 클라이언트 리팩토링 (재시도 래퍼) [quick]
└── Task 4: Config 보안 강화 (파일 권한) [quick]

Wave 2 (Report 수정 — Wave 1 완료 후):
├── Task 5: Report 생성 API 수정 [deep]
├── Task 6: Report 조회 API 수정 (note-tabs 통합) [deep]
└── Task 7: Report E2E 테스트 [deep]

Wave 3 (Automation — Wave 2 완료 후):
├── Task 8: --json 출력 포맷터 [quick]
├── Task 9: --md 출력 포맷터 [quick]
├── Task 10: 배치 처리 (stdin/파일) [unspecified-high]
└── Task 11: 진행률/에러 리포트 (--quiet/--verbose) [quick]

Wave 4 (통합 — Wave 3 완료 후):
├── Task 12: 모든 명령어에 --json/--md 적용 [quick]
├── Task 13: 통합 테스트 [deep]
└── Task 14: 문서 업데이트 (README) [quick]

Wave FINAL (검증):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: E2E QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)

Critical Path: Task 1-4 → Task 5-7 → Task 8-11 → Task 12-14 → F1-F4
Parallel Speedup: ~50% faster than sequential
Max Concurrent: 4 (Waves 1)
```

### Dependency Matrix

- **1-4**: — — 5-14, 1
- **5-7**: 1-4 — 8-14, 2
- **8-11**: 5-7 — 12-14, 3
- **12-14**: 8-11 — F1-F4, 4

### Agent Dispatch Summary

- **Wave 1**: **4** — T1-T4 → `quick`
- **Wave 2**: **3** — T5-T7 → `deep`
- **Wave 3**: **4** — T8-T9 → `quick`, T10 → `unspecified-high`, T11 → `quick`
- **Wave 4**: **3** — T12,T14 → `quick`, T13 → `deep`
- **FINAL**: **4** — F1 → `oracle`, F2,F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

### Wave 1: Foundation (병렬 실행)

- [ ] 1. 테스트 인프라 설정

  **What to do**:
  - bun test 설정 파일 생성
  - 테스트 디렉토리 구조 생성 (`src/__tests__/`)
  - 샘플 테스트 파일로 검증

  **Must NOT do**:
  - 기존 코드 변경
  - 외부 테스트 프레임워크 설치 (vitest, jest 등)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단순 설정 작업, 30분 이내
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Tasks 5-7 (Wave 2)
  - **Blocked By**: None

  **References**:
  - `package.json:scripts` - 현재 스크립트 확인
  - `bun --help test` - bun test 기본 사용법

  **Acceptance Criteria**:
  - [ ] `bun test` 실행 가능
  - [ ] 샘플 테스트 1개 작성 후 통과

  **QA Scenarios**:
  ```
  Scenario: Test infrastructure works
    Tool: Bash
    Steps:
      1. cd /Users/junghoonkye/Projects/oss/oh-my-lilys
      2. bun test
    Expected Result: Exit code 0, "1 pass" in output
    Evidence: .sisyphus/evidence/task-01-test-infra.txt
  ```

  **Commit**: YES (Wave 1 그룹)
  - Message: `feat(core): add test infra, types, retry wrapper, secure config`
  - Files: `package.json`, `src/__tests__/`

- [ ] 2. TypeScript 타입 정의 (API 응답 스키마)

  **What to do**:
  - API 응답 타입 정의 (`src/types/api.ts`)
  - Note, Session, Collection, ChatThread 인터페이스
  - 기존 `src/api/client.ts`의 타입을 분리

  **Must NOT do**:
  - 런타임 코드 변경
  - 과도한 제네릭 사용

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 타입 정의만, 로직 없음
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: Tasks 5-7
  - **Blocked By**: None

  **References**:
  - `src/api/client.ts:7-32` - 기존 인터페이스
  - 리버스 엔지니어링 결과 (Draft 파일)

  **Acceptance Criteria**:
  - [ ] `src/types/api.ts` 파일 생성
  - [ ] `tsc --noEmit` 통과

  **QA Scenarios**:
  ```
  Scenario: Type definitions compile
    Tool: Bash
    Steps:
      1. bun run tsc --noEmit
    Expected Result: Exit code 0, no errors
    Evidence: .sisyphus/evidence/task-02-types.txt
  ```

  **Commit**: YES (Wave 1 그룹)

- [ ] 3. API 클라이언트 리팩토링 (재시도 래퍼)

  **What to do**:
  - `withRetry(fn, options)` 함수 구현
  - **재시도 조건 (CRITICAL)**:
    - ✅ RETRY: 429 (rate limit), 5xx (server errors), ECONNRESET, ETIMEDOUT
    - ❌ NO RETRY: 4xx (400, 401, 403, 404, 422 등)
  - **백오프 스펙**:
    - `baseDelay: 300ms`
    - `maxDelay: 5000ms`
    - `maxRetries: 3`
    - Jitter: `Math.random() * 0.3` (0-30% 랜덤 추가)
  - **Timeout**: `AbortController`로 요청별 타임아웃 (기본 30초)
  - `makeRequest()`에 재시도 로직 적용

  **Must NOT do**:
  - API 엔드포인트 변경
  - 기존 동작 변경 (재시도는 내부적)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 함수 추가
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 5-7
  - **Blocked By**: None

  **References**:
  - `src/api/client.ts:34-70` - makeRequest 함수

  **Acceptance Criteria**:
  - [ ] `withRetry(fn, { maxRetries: 3, baseDelay: 300, maxDelay: 5000 })` 함수
  - [ ] 429/5xx/network 에러만 재시도, 4xx는 즉시 실패
  - [ ] `bun test src/__tests__/retry.test.ts` 통과 (mock fetch)

  **QA Scenarios**:
  ```
  Scenario: Retry on network error
    Tool: Bash
    Steps:
      1. bun test src/__tests__/retry.test.ts
    Expected Result: "3 pass", retry logic verified
    Evidence: .sisyphus/evidence/task-03-retry.txt
  ```

  **Commit**: YES (Wave 1 그룹)

- [ ] 4. Config 보안 강화 (파일 권한)

  **What to do**:
  - `setToken()` 호출 시 파일 권한 0600으로 설정 (Unix/macOS)
  - Windows에서는 파일 ACL로 접근 제한
  - `getToken()` 로그에서 토큰 마스킹 (`lilys_abc...xyz`)
  - `doctor` 명령에서 권한 체크 추가
  - **Version 소싱 수정**: `src/commands/doctor.ts`, `src/commands/upgrade.ts`의 hardcoded `VERSION = "1.0.0"` 제거
    - `src/index.ts`처럼 `package.json`을 런타임에 읽어 버전 가져오기

  **Must NOT do**:
  - 키체인/OS 통합 (범위 외)
  - 암호화 (범위 외)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: chmod 호출 + 로그 수정
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `src/utils/config.ts` - 토큰 저장/조회
  - `src/commands/doctor.ts` - 진단 로직

  **Acceptance Criteria**:
  - [ ] `~/.lilys/config.json` 권한이 0600
  - [ ] `lilys doctor`에서 권한 체크
  - [ ] 로그에 토큰이 마스킹됨

  **QA Scenarios**:
  ```
  Scenario: Token file has secure permissions
    Tool: Bash
    Steps:
      1. lilys auth (이미 되어 있다면 skip)
      2. stat -f "%Lp" ~/.lilys/config.json
    Expected Result: "600"
    Evidence: .sisyphus/evidence/task-04-permissions.txt
  ```

  **Commit**: YES (Wave 1 그룹)

---

### Wave 2: Report 수정 (Wave 1 완료 후 실행)

- [ ] 5. Report 생성 API 수정

  **What to do**:
  - 기존 `generateNote()` / `createNote()` 함수 분석
  - 새로 발견된 `PUT /notes` 엔드포인트 활용
  - `note-templates` API로 템플릿 조회 후 생성
  - 에러 처리 강화 (timeout, 429, 5xx)
  - **Note Type Validation 버그 수정**:
    - 현재: `validTypes.includes(noteType)` → substring match로 false positive
    - 수정: `NOTE_TYPES.some(n => n.type === noteType)` → exact match

  **Must NOT do**:
  - 기존 API 호출 방식 완전 교체 (점진적 개선)
  - 새로운 note types 추가 (기존 것만 지원)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 핵심 문제 해결, API 분석 필요
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (Task 6과 순차 실행 권장)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 8-11 (Wave 3)
  - **Blocked By**: Tasks 1-4 (Wave 1)

  **References**:
  - `src/api/client.ts:160-174` - generateNote 함수
  - `src/api/client.ts:232-245` - createNote 함수
  - 리버스 엔지니어링 결과: `PUT /notes`, `GET /note-templates`

  **Acceptance Criteria**:
  - [ ] `lilys report <sessionId> --note-type detailed` 성공
  - [ ] 429/5xx 에러 시 재시도
  - [ ] timeout 에러 명확한 메시지
  - [ ] Note type validation이 exact match 사용 (substring 아님)

  **QA Scenarios**:
  ```
  Scenario: Report creation succeeds
    Tool: Bash
    Steps:
      1. lilys report 8225345 --note-type detailed --watch --timeout 60
    Expected Result: Exit code 0, "noteId" in output
    Evidence: .sisyphus/evidence/task-05-report-create.txt

  Scenario: Report creation handles timeout
    Tool: Bash
    Steps:
      1. lilys report 8225345 --note-type detailed --watch --timeout 1
    Expected Result: Exit code 1, "timeout" in stderr
    Evidence: .sisyphus/evidence/task-05-report-timeout.txt
  ```

  **Commit**: YES (Wave 2 그룹)
  - Message: `fix(report): resolve creation and fetch issues`

- [ ] 6. Report 조회 API 수정 (note-tabs 통합)

  **What to do**:
  - `note-tabs` API 통합으로 Report 목록 조회
  - `getReport()` 함수에 `note-tabs` 활용
  - HTML content 파싱 개선

  **Must NOT do**:
  - 응답 포맷 변경 (기존 호환 유지)
  - 새로운 조회 방식 추가 (기존 개선만)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: API 통합, 파싱 로직 수정
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (Task 5 후 실행)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 8-11
  - **Blocked By**: Tasks 1-4, Task 5

  **References**:
  - `src/api/client.ts:175-209` - getReport 함수
  - `src/commands/report.ts` - Report 명령어
  - 리버스 엔지니어링: `POST /note-tabs`, `GET /recommend/note-tabs/{sessionId}`

  **Acceptance Criteria**:
  - [ ] `lilys report <sessionId>` 가 note 목록 조회
  - [ ] HTML content가 올바르게 파싱됨

  **QA Scenarios**:
  ```
  Scenario: Report fetch succeeds
    Tool: Bash
    Steps:
      1. lilys report 8225345
    Expected Result: Exit code 0, report content in output
    Evidence: .sisyphus/evidence/task-06-report-fetch.txt
  ```

  **Commit**: YES (Wave 2 그룹)

- [ ] 7. Report E2E 테스트

  **What to do**:
  - Report 생성 → 조회 전체 플로우 테스트
  - Mock API 응답으로 독립적 테스트
  - 에지 케이스: 빈 세션, 잘못된 ID, timeout

  **Must NOT do**:
  - 실제 프로덕션 API 호출 (mock 사용)
  - 다른 기능 테스트

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: E2E 테스트 작성
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (Task 5-6 후 실행)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 8-11
  - **Blocked By**: Tasks 1-4, 5, 6

  **References**:
  - `src/__tests__/` - 테스트 디렉토리
  - `src/commands/report.ts` - Report 로직

  **Acceptance Criteria**:
  - [ ] `bun test src/__tests__/report.test.ts` 통과
  - [ ] 5개 이상 시나리오 커버

  **QA Scenarios**:
  ```
  Scenario: Report E2E tests pass
    Tool: Bash
    Steps:
      1. bun test src/__tests__/report.test.ts
    Expected Result: "N pass", 0 fail
    Evidence: .sisyphus/evidence/task-07-report-e2e.txt
  ```

  **Commit**: YES (Wave 2 그룹)

---

### Wave 3: Automation (Wave 2 완료 후 실행)

- [ ] 8. --json 출력 포맷터

  **What to do**:
  - `output/json.ts` 모듈 생성
  - 표준 JSON 스키마 정의: `{ ok, data?, error? }`
  - 모든 명령어 출력을 JSON으로 변환 가능하게

  **Must NOT do**:
  - 기본 출력 변경 (--json 플래그 있을 때만)
  - 복잡한 스키마 (단순하게)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단순 포맷터
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (Task 9와 병렬)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 12
  - **Blocked By**: Tasks 5-7

  **References**:
  - `src/utils/logger.ts` - 현재 출력 방식

  **Acceptance Criteria**:
  - [ ] `formatJson(data)` 함수 구현
  - [ ] 에러 시 `{ ok: false, error: { code, message } }` 형식

  **QA Scenarios**:
  ```
  Scenario: JSON output is valid
    Tool: Bash
    Steps:
      1. lilys sessions --json | jq '.ok'
    Expected Result: "true"
    Evidence: .sisyphus/evidence/task-08-json.txt
  ```

  **Commit**: YES (Wave 3 그룹)
  - Message: `feat(output): add --json/--md formatters and batch processing`

- [ ] 9. --md 출력 포맷터

  **What to do**:
  - `output/markdown.ts` 모듈 생성
  - 기본 템플릿: 제목, 내용, 메타정보
  - Report 전용 마크다운 템플릿

  **Must NOT do**:
  - 복잡한 템플릿 엔진
  - 커스텀 템플릿 지원 (범위 외)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단순 포맷터
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (Task 8과 병렬)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 12
  - **Blocked By**: Tasks 5-7

  **References**:
  - `src/commands/report.ts` - Report 출력

  **Acceptance Criteria**:
  - [ ] `formatMarkdown(data)` 함수 구현
  - [ ] `lilys report <id> --md` 가 마크다운 출력

  **QA Scenarios**:
  ```
  Scenario: Markdown output is valid
    Tool: Bash
    Steps:
      1. lilys report 8225345 --md | head -5
    Expected Result: "# " 시작
    Evidence: .sisyphus/evidence/task-09-md.txt
  ```

  **Commit**: YES (Wave 3 그룹)

- [ ] 10. 배치 처리 (stdin/파일)

  **What to do**:
  - `--file <path>` 옵션으로 URL 목록 읽기
  - stdin에서 URL 읽기 (`lilys summarize --batch`)
  - **출력 포맷 (단일 JSON 객체)**:
    ```json
    {
      "ok": true,
      "data": {
        "items": [
          { "input": "url1", "ok": true, "data": {...} },
          { "input": "url2", "ok": false, "error": {...} }
        ]
      }
    }
    ```
  - **stdout/stderr 분리**: JSON만 stdout, 진행률/로그는 stderr
  - exit code 규칙: 전부 성공=0, 일부 실패=1, 전부 실패=2

  **Must NOT do**:
  - 병렬 처리 (순차만, 범위 외)
  - 재개 기능 (범위 외)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 로직 복잡, stdin 처리
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (Task 8, 9, 11과 병렬)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 12
  - **Blocked By**: Tasks 5-7

  **References**:
  - `src/commands/summarize.ts` - Summarize 명령어
  - `src/index.ts` - CLI 진입점

  **Acceptance Criteria**:
  - [ ] `lilys summarize --file urls.txt` 동작
  - [ ] `cat urls.txt | lilys summarize --batch` 동작
  - [ ] 단일 JSON 객체 출력: `{ ok, data: { items: [...] } }`
  - [ ] stdout은 JSON만, 진행률/로그는 stderr

  **QA Scenarios**:
  ```
  Scenario: Batch processing works
    Tool: Bash
    Steps:
      1. echo "https://youtube.com/watch?v=abc" > /tmp/urls.txt
      2. lilys summarize --file /tmp/urls.txt --json > /tmp/output.json 2>/dev/null
      3. jq '.ok and .data.items' /tmp/output.json
    Expected Result: Exit code 0, output contains `{"ok":true,"data":{"items":[...]}}`
    Evidence: .sisyphus/evidence/task-10-batch.txt

  Scenario: Batch with partial failure
    Tool: Bash
    Steps:
      1. echo -e "https://valid.url\nhttps://invalid.url" | lilys summarize --batch
    Expected Result: Exit code 1, mixed results
    Evidence: .sisyphus/evidence/task-10-batch-partial.txt
  ```

  **Commit**: YES (Wave 3 그룹)

- [ ] 11. 진행률/에러 리포트 (--quiet/--verbose)

  **What to do**:
  - `--quiet`: 최소 출력 (결과만)
  - `--verbose`: 디버그 로그
  - 배치 처리 시 진행률 표시 (stderr)

  **Must NOT do**:
  - TUI/진행바 (단순 텍스트만)
  - 로그 파일 생성 (stdout/stderr만)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 로그 레벨 추가
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 12
  - **Blocked By**: Tasks 5-7

  **References**:
  - `src/utils/logger.ts` - Logger 유틸

  **Acceptance Criteria**:
  - [ ] `--quiet` 시 최소 출력
  - [ ] `--verbose` 시 디버그 로그

  **QA Scenarios**:
  ```
  Scenario: Quiet mode works
    Tool: Bash
    Steps:
      1. lilys sessions --quiet | wc -l
    Expected Result: < 5 lines
    Evidence: .sisyphus/evidence/task-11-quiet.txt
  ```

  **Commit**: YES (Wave 3 그룹)

---

### Wave 4: 통합 (Wave 3 완료 후 실행)

- [ ] 12. 모든 명령어에 --json/--md 적용

  **What to do**:
  - `summarize`, `sessions`, `report` 명령어에 `--json`/`--md` 적용
  - 공통 `--format json|md|text` 옵션 추가

  **Must NOT do**:
  - 기본 출력 변경
  - 새로운 명령어 추가

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 기존 포맷터 적용
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (Task 13, 14와 병렬)
  - **Parallel Group**: Wave 4
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 8-11

  **References**:
  - `src/output/json.ts` - JSON 포맷터
  - `src/output/markdown.ts` - Markdown 포맷터

  **Acceptance Criteria**:
  - [ ] `lilys summarize <url> --json` 동작
  - [ ] `lilys sessions --json` 동작
  - [ ] `lilys report <id> --md` 동작

  **QA Scenarios**:
  ```
  Scenario: All commands support --json
    Tool: Bash
    Steps:
      1. lilys sessions --json | jq '.ok'
      2. lilys summarize <url> --json | jq '.ok'
      3. lilys report <id> --json | jq '.ok'
    Expected Result: All return "true"
    Evidence: .sisyphus/evidence/task-12-format.txt
  ```

  **Commit**: YES (Wave 4 그룹)
  - Message: `feat(cli): apply --json/--md to all commands, update docs`

- [ ] 13. 통합 테스트

  **What to do**:
  - 전체 워크플로우 테스트 (auth → summarize → report)
  - Mock 서버로 API 응답 시뮬레이션

  **Must NOT do**:
  - 실제 API 호출

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 통합 테스트 작성
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 8-11

  **References**:
  - `src/__tests__/` - 테스트 디렉토리

  **Acceptance Criteria**:
  - [ ] `bun test src/__tests__/integration.test.ts` 통과

  **QA Scenarios**:
  ```
  Scenario: Integration tests pass
    Tool: Bash
    Steps:
      1. bun test src/__tests__/integration.test.ts
    Expected Result: "N pass", 0 fail
    Evidence: .sisyphus/evidence/task-13-integration.txt
  ```

  **Commit**: YES (Wave 4 그룹)

- [ ] 14. 문서 업데이트 (README)

  **What to do**:
  - README에 새 기능 문서화
  - `--json`, `--md`, `--file`, `--batch`, `--quiet`, `--verbose` 설명
  - 예제 추가

  **Must NOT do**:
  - 불필요한 섹션 추가
  - 기존 내용 삭제

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 문서 업데이트
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 8-11

  **References**:
  - `README.md` - 기존 문서

  **Acceptance Criteria**:
  - [ ] README에 모든 새 옵션 설명
  - [ ] 예제 코드 포함

  **QA Scenarios**:
  ```
  Scenario: README is updated
    Tool: Bash
    Steps:
      1. grep -c "--json" README.md
    Expected Result: > 0
    Evidence: .sisyphus/evidence/task-14-docs.txt
  ```

  **Commit**: YES (Wave 4 그룹)

---

## Final Verification Wave (MANDATORY)

4 review agents run in PARALLEL. ALL must APPROVE.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. Verify each "Must Have" is implemented. Check evidence files exist.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `bun test` + `tsc --noEmit`. Review for: `as any`, empty catches, console.log in prod, unused imports.
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **E2E QA** — `unspecified-high`
  Execute EVERY QA scenario from EVERY task. Test cross-task integration.
  Output: `Scenarios [N/N pass] | Integration [N/N] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: verify 1:1 — everything in spec was built, nothing beyond spec.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

- **Each Wave**: 1 atomic commit after all tasks in wave complete
- **Message format**: `feat(scope): description`
- **Pre-commit**: `bun test` must pass

| Wave | Commit Message |
|------|----------------|
| 1 | `feat(core): add test infra, types, retry wrapper, secure config` |
| 2 | `fix(report): resolve creation and fetch issues` |
| 3 | `feat(output): add --json/--md formatters and batch processing` |
| 4 | `feat(cli): apply --json/--md to all commands, update docs` |

---

## Success Criteria

### Verification Commands
```bash
# Report 생성/조회
lilys summarize https://youtube.com/watch?v=dQw4w9WgXcQ
lilys report <sessionId> --json

# 배치 처리
echo "https://youtube.com/watch?v=abc\nhttps://youtube.com/watch?v=def" | lilys summarize --batch --json

# 테스트
bun test

# 토큰 권한
ls -la ~/.lilys/config.json  # -rw-------
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] Report E2E works
- [ ] --json outputs valid JSON
- [ ] Batch processing works
- [ ] Token file has 0600 permissions
