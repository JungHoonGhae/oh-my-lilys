# Draft: oh-my-lilys 고도화 계획

## 사용자 요구사항 (확인됨)

1. **자주 사용** - 많이 자주 씀
2. **Automation 방향** - 대량 처리, 파이프라인, CI/CD
3. **새로운 기능 발견** - 웹 UI 기능을 CLI로

### 현재 문제점

| 문제            | 상태      | 우선순위 |
| --------------- | --------- | -------- |
| Report 생성     | 잘 안 됨  | HIGH     |
| Report 가져오기 | 문제 있음 | HIGH     |
| 실시간 스트리밍 | 미구현    | MEDIUM   |
| 컬렉션 조회     | 미구현    | MEDIUM   |
| 컬렉션 생성     | 미구현    | MEDIUM   |

---

## 리버스 엔지니어링 결과

### 새로 발견된 API 베이스

| API 베이스                        | 용도              |
| --------------------------------- | ----------------- |
| `https://agent-release.lilys.ai`  | AI/채팅/제안      |
| `https://task-runner.lilys.ai`    | 설정/설문/작업    |
| `https://payment.lilys.ai`        | 결제              |

### 새로 발견된 엔드포인트

```yaml
# agent-release.lilys.ai
chat_threads:
  - GET /sessions/{sessionId}/chat-threads
  - GET /chat-threads/{threadId}?limit=12

lily_suggestions:
  - POST /v3/lily-suggestions
  - POST /v3/lily-suggestions/consume-cache

model:
  - GET /v1/model-profile-info
  - POST /deepsearch-questions

# AWS Notes API
notes:
  - GET /note-templates
  - POST /note-tabs
  - GET /recommend/note-tabs/{sessionId}
  - PUT /notes  # UPDATE 지원
  - GET /notes/{sid}/{nid}?whisper=false

# Main API
sessions:
  - GET /resource-data?sessionId={id}
  - GET /digest-session/{sessionId}
  - GET /v2/user
```

### 기존 코드에서 발견된 한계점

1. **재시도/백오프 없음** - 네트워크 실패 시 즉시 종료
2. **토큰 평문 저장** - ~/.lilys/config.json에 평문
3. **--json 출력 없음** - 파이프라인 연계 불가
4. **테스트 없음** - 커버리지 0%
5. **캐싱 없음** - 매번 API 호출

---

## 기술 결정사항

### 1. Report 문제 해결 방향
- 새로 발견된 `PUT /notes` 엔드포인트 활용
- `note-tabs`, `note-templates` API 통합
- `whisper` 파라미터가 스트리밍 관련일 가능성

### 2. Automation 기능 추가
- `--json` 출력 포맷 지원
- 배치 처리 (파일에서 URL 목록 읽기)
- stdin 파이프 입력 지원
- 진행률 표시

### 3. 새로운 기능
- 컬렉션 API (추가 탐색 필요)
- 채팅 스레드 API
- Lily AI 제안 API

---

## 범위 경계

### INCLUDE (고도화 범위)
- Report 생성/조회 문제 해결
- --json, --md 출력 포맷
- 배치 처리 기능
- 재시도/백오프 로직
- 새로 발견된 API 통합 (컬렉션, 채팅, 제안)
- 토큰 보안 (키체인)

### EXCLUDE (제외)
- UI/웹 인터페이스
- 결제 API
- 유지보수 외의 리팩토링

---

## 미해결 질문

1. 컬렉션 API의 정확한 엔드포인트는? (추가 탐색 필요)
2. 실시간 스트리밍은 어떤 프로토콜 사용? (SSE? WebSocket?)
3. `whisper` 파라미터의 정확한 용도는?

---

## Open Questions for User

1. **테스트 전략**: TDD vs Tests-after vs None?
2. **우선순위**: Report 수정 먼저 vs 새 기능 추가 먼저?
