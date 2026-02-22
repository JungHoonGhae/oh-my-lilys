# Playwright 기반 자동 토큰 인증 리팩토링

## TL;DR

> **Quick Summary**: playwright-cli를 활용하여 토큰 자동 추출. CDP보다 간단하고 안정적.
>
> **Deliverables**:
> - `src/utils/browser.ts` - Playwright 기반 브라우저 유틸리티
> - 리팩토링된 `src/commands/login.ts`
>
> **Estimated Effort**: Quick
> **Parallel Execution**: NO - 순차적 단일 작업

---

## Why Playwright instead of CDP?

| CDP (chrome-remote-interface) | Playwright-cli |
|------------------------------|----------------|
| 복잡한 타겟 연결 로직 | 단순한 CLI 명령어 |
| Page.loadEventFired 타임아웃 | 자동 대기 처리 |
| headless 모드에서 탭 생성 문제 | 세션 관리 내장 |
| localStorage 접근 불안정 | `localstorage-get` 명령어 |
| 많은 에지 케이스 | 안정적인 API |

---

## Context

### Original Request
CDP 기반으로 구현했으나 headless 모드에서 Page load timeout 발생. playwright-cli로 전환 요청.

### Technical Approach
- `playwright-cli` CLI 명령어 사용
- `--persistent --profile=~/.lilys-chrome-profile`로 세션 유지
- `localstorage-get access_token`으로 토큰 직접 읽기
- Bun의 `$` 템플릿 리터럴로 CLI 실행

---

## Work Objectives

### Core Objective
`lilys auth` 명령어 실행 시 playwright-cli로 토큰 자동 추출

### Must Have
- playwright-cli 사용
- 세션 유지 (`--persistent`)
- localStorage 직접 읽기
- 기존 `lilys auth <token>` 기능 유지

### Must NOT Have
- chrome-remote-interface 사용
- 복잡한 CDP 연결 로직

---

## TODOs

- [ ] 1. Playwright 기반 브라우저 유틸리티 생성 (`src/utils/browser.ts`)

  **What to do**:
  ```typescript
  import { $ } from "bun";
  
  const SESSION_NAME = "lilys-auth";
  
  export async function isBrowserRunning(): Promise<boolean>
  export async function openBrowser(headless: boolean): Promise<void>
  export async function readLocalStorage(key: string): Promise<string | null>
  export async function closeBrowser(): Promise<void>
  export async function fetchTokenFromBrowser(headless: boolean): Promise<string | null>
  ```

  **Commands to use**:
  - `playwright-cli -s=lilys-auth open https://lilys.ai/signup --persistent --profile=~/.lilys-chrome-profile`
  - `playwright-cli -s=lilys-auth localstorage-get access_token`
  - `playwright-cli -s=lilys-auth close`

  **Commit**: YES
  - Message: `feat(auth): use playwright-cli instead of CDP`

---

- [ ] 2. login.ts 리팩토링

  **What to do**:
  - import 변경: `cdp.js` → `browser.js`
  - 동일한 흐름 유지:
    1. headless로 토큰 시도
    2. 실패 시 visible 브라우저 실행
    3. 폴링으로 토큰 대기

  **Commit**: YES
  - Message: `refactor(auth): switch to playwright-cli`

---

- [ ] 3. 기존 CDP 파일 삭제 및 빌드

  **What to do**:
  - `src/utils/cdp.ts` 삭제
  - `bun run build` 검증

  **Commit**: YES
  - Message: `chore: remove CDP module`

---

## Success Criteria

```bash
bun run build  # Expected: exit code 0
bun run src/index.ts auth  # Expected: 토큰 자동 추출
```
