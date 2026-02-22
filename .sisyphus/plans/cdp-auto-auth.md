# CDP 기반 자동 토큰 인증 리팩토링

## TL;DR

> **Quick Summary**: x-composer 패턴을 적용하여 Chrome DevTools Protocol(CDP)로 토큰 자동 추출. 이미 로그인된 세션이 있으면 headless로 읽고, 없으면 실제 브라우저를 띄워 사용자 로그인 유도.
>
> **Deliverables**:
> - `src/utils/cdp.ts` - CDP 유틸리티 모듈
> - 리팩토링된 `src/commands/login.ts`
>
> **Estimated Effort**: Short
> **Parallel Execution**: NO - 순차적 단일 작업
> **Critical Path**: cdp.ts → login.ts

---

## Context

### Original Request
사용자 요청: "브라우저 토큰 가져와서 자동으로 하도록 못하나? x-composer skill 처럼?"

### Interview Summary
**Key Discussions**:
- 기존: leveldb grep 방식 - 불안정함
- 요구사항: CDP로 localStorage 직접 읽기
- 로그인 흐름:
  1. 프로필 존재 + 토큰 있음 → headless로 자동 읽기
  2. 토큰 없음 → 실제 브라우저 띄우기 → 사용자 로그인 → 토큰 읽기
- 프로필 경로: `~/.lilys-chrome-profile` (로그인 세션 유지)

### Technical Approach
- `chrome-remote-interface` 패키지 사용 (Puppeteer보다 가벼움)
- CDP 포트: 9223 (x-composer의 9222와 충돌 방지)
- 크로스 플랫폼 Chrome 경로 처리 (macOS/Windows/Linux)

---

## Work Objectives

### Core Objective
`lilys auth` 명령어 실행 시 자동으로 브라우저에서 토큰을 추출하여 저장

### Concrete Deliverables
- `src/utils/cdp.ts` - Chrome 실행, CDP 연결, localStorage 읽기 유틸리티
- `src/commands/login.ts` - CDP 기반 인증 로직으로 리팩토링

### Definition of Done
- [ ] `lilys auth` 실행 시 기존 로그인 세션이 있으면 headless로 토큰 자동 추출
- [ ] 로그인 안 되어 있으면 브라우저 띄워서 사용자 로그인 유도
- [ ] 로그인 완료 감지 후 토큰 자동 저장
- [ ] `bun run build` 성공

### Must Have
- `chrome-remote-interface` 패키지 의존성 추가
- macOS/Windows/Linux 크로스 플랫폼 지원
- 프로필 디렉토리 `~/.lilys-chrome-profile` 사용

### Must NOT Have (Guardrails)
- Puppeteer 사용 금지 (무거움)
- 기존 수동 토큰 입력 기능 제거 금지 (`lilys auth <token>` 유지)
- x-composer의 9222 포트와 충돌 금지

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO (CLI 프로젝트)
- **Automated tests**: None (수동 QA)
- **Agent-Executed QA**: YES

### QA Policy
- CLI이므로 `interactive_bash`로 직접 실행 검증
- macOS에서 실제 동작 확인

---

## Execution Strategy

### Sequential Execution (단일 작업)

```
Step 1: cdp.ts 유틸리티 모듈 생성
  ├── Chrome 경로 감지 (macOS/Windows/Linux)
  ├── Chrome 실행 (headless + 실제 브라우저 모두 지원)
  ├── CDP 연결
  ├── localStorage에서 토큰 읽기
  └── Chrome 종료

Step 2: login.ts 리팩토링
  ├── 토큰 인자 있으면 기존처럼 직접 저장
  ├── 토큰 인자 없으면:
  │   ├── headless로 토큰 읽기 시도
  │   ├── 토큰 있음 → 저장 완료
  │   └── 토큰 없음 → 실제 브라우저 띄우기 → 로그인 대기 → 토큰 읽기 → 저장
  └── 기존 leveldb grep 코드 제거

Step 3: 의존성 추가 및 빌드
  └── package.json에 chrome-remote-interface 추가
```

---

## TODOs

- [ ] 1. CDP 유틸리티 모듈 생성 (`src/utils/cdp.ts`)

  **What to do**:
  - `chrome-remote-interface` 패키지용 타입 정의
  - `getChromePath()`: 플랫폼별 Chrome 경로 반환
  - `isChromeRunning(port)`: Chrome CDP 실행 중 확인
  - `spawnChrome(headless)`: headless 또는 실제 브라우저 실행
  - `connectCDP(port)`: CDP 클라이언트 연결
  - `readLocalStorage(port, key)`: localStorage 값 읽기
  - `closeChrome(port)`: Chrome 종료

  **Must NOT do**:
  - Puppeteer 사용
  - 9222 포트 사용 (x-composer와 충돌)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: None

  **References**:
  - `~/.agents/skills/x-composer/scripts/cdp-launch.js` - Chrome 실행 패턴
  - `~/.agents/skills/x-composer/scripts/cdp-type.js` - CDP 연결 패턴

  **Acceptance Criteria**:
  - [ ] TypeScript 타입 정의 포함
  - [ ] macOS/Windows/Linux Chrome 경로 처리
  - [ ] headless/실제 브라우저 모드 모두 지원

  **QA Scenarios**:
  ```
  Scenario: headless로 localStorage 읽기
    Tool: Bash
    Steps:
      1. bun run src/index.ts auth 실행 전 토큰 없음 확인
      2. headless Chrome 실행 후 lilys.ai 접속
      3. localStorage.getItem('access_token') 호출
    Expected: null 반환 (로그인 안 된 상태)
  ```

  **Commit**: YES
  - Message: `feat(cdp): add CDP utility module for browser automation`

---

- [ ] 2. login.ts 리팩토링

  **What to do**:
  - 기존 leveldb grep 코드 제거
  - `fetchTokenFromCDP()` 함수 호출로 토큰 가져오기
  - 흐름:
    1. 토큰 인자 있으면 직접 저장 (기존 동작 유지)
    2. 인자 없으면:
       a. headless로 토큰 읽기 시도
       b. 토큰 있음 → 저장, 완료 메시지
       c. 토큰 없음 → "브라우저에서 로그인하세요" 메시지
       d. 실제 브라우저 띄우기 (headless=false)
       e. 5초 간격으로 토큰 폴링 (최대 2분)
       f. 토큰 감지되면 저장

  **Must NOT do**:
  - 기존 `lilys auth <token>` 기능 제거
  - 무한 대기 (타임아웃 필요)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: Task 1

  **References**:
  - `src/commands/login.ts` - 기존 인증 로직
  - `src/utils/config.ts` - setToken()

  **Acceptance Criteria**:
  - [ ] `lilys auth <token>` 기존 동작 유지
  - [ ] `lilys auth` 실행 시 자동 토큰 추출
  - [ ] 로그인 필요 시 브라우저 자동 실행
  - [ ] 2분 타임아웃

  **QA Scenarios**:
  ```
  Scenario: 이미 로그인된 상태에서 토큰 자동 추출
    Tool: Bash
    Preconditions: ~/.lilys-chrome-profile에 로그인 세션 존재
    Steps:
      1. bun run src/index.ts auth 실행
      2. headless로 localStorage 읽기
    Expected: 토큰 자동 저장, "Token saved" 메시지
  ```

  ```
  Scenario: 로그인 안 된 상태에서 브라우저 실행
    Tool: Bash
    Preconditions: ~/.lilys-chrome-profile 없음 또는 로그인 안 됨
    Steps:
      1. bun run src/index.ts auth 실행
      2. 실제 Chrome 브라우저 실행됨
      3. 사용자가 Google로 로그인
      4. 토큰 감지 후 자동 저장
    Expected: "Browser opened. Please login..." 메시지 후 로그인 완료 시 자동 저장
  ```

  **Commit**: YES
  - Message: `refactor(auth): replace leveldb grep with CDP-based token extraction`

---

- [ ] 3. 의존성 추가 및 빌드 검증

  **What to do**:
  - `package.json`에 `chrome-remote-interface` 추가
  - `bun install` 실행
  - `bun run build` 성공 확인

  **References**:
  - `package.json` - 현재 의존성

  **Acceptance Criteria**:
  - [ ] `bun run build` 에러 없음
  - [ ] `dist/index.js` 생성됨

  **QA Scenarios**:
  ```
  Scenario: 빌드 성공
    Tool: Bash
    Steps:
      1. bun run build 실행
    Expected: exit code 0, dist/ 디렉토리에 파일 생성
  ```

  **Commit**: YES
  - Message: `chore: add chrome-remote-interface dependency`

---

- [ ] 4. 통합 테스트

  **What to do**:
  - `bun run src/index.ts auth` 전체 흐름 테스트
  - macOS에서 실제 동작 확인

  **QA Scenarios**:
  ```
  Scenario: 전체 인증 흐름 E2E
    Tool: Bash
    Steps:
      1. rm -rf ~/.lilys-chrome-profile (프로필 삭제)
      2. bun run src/index.ts auth 실행
      3. 브라우저 실행 확인
      4. 수동으로 Google 로그인
      5. 토큰 자동 저장 확인
      6. bun run src/index.ts auth 재실행
      7. headless로 토큰 자동 추출 확인
    Expected: 두 번째 실행 시 브라우저 없이 토큰 자동 추출
  ```

  **Commit**: NO

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
  모든 "Must Have" 구현 확인, "Must NOT Have" 위반 없음 확인

- [ ] F2. **Code Quality Review** — `unspecified-high`
  `bun run build` 성공, TypeScript 에러 없음

---

## Commit Strategy

1. `feat(cdp): add CDP utility module for browser automation`
2. `refactor(auth): replace leveldb grep with CDP-based token extraction`
3. `chore: add chrome-remote-interface dependency`

---

## Success Criteria

### Verification Commands
```bash
bun run build  # Expected: exit code 0
bun run src/index.ts auth  # Expected: 브라우저 실행 또는 토큰 자동 추출
```

### Final Checklist
- [ ] `lilys auth` 실행 시 토큰 자동 추출
- [ ] 로그인 필요 시 브라우저 자동 실행
- [ ] 기존 `lilys auth <token>` 동작 유지
- [ ] `bun run build` 성공
