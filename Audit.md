# Character AI Engine

## Master Scalability, Memory, Context & Generation Optimization Implementation Plan

### Version

Final architecture plan following the discovery of the automatic context-compaction failure, severe Neon/Prisma latency, excessive cache refetching, generation lifecycle problems, and oversized model prompts.

---

# 1. Executive Objective

Transform the current Character AI engine from an architecture where:

```text
conversation grows
        ↓
raw messages accumulate
        ↓
auto-compact silently fails
        ↓
context keeps growing
        ↓
prompt becomes huge
        ↓
LM Studio spends excessive time on prompt evaluation
        ↓
generation may fail / terminate immediately
        ↓
frontend retains stale or previous content
        ↓
cache invalidation causes more network/database activity
        ↓
UI becomes increasingly sluggish
```

into an architecture where:

```text
conversation grows
        ↓
auto-compact triggers reliably
        ↓
older dialogue becomes durable summary memory
        ↓
raw history is excluded from active generation context
        ↓
context compiler applies a hard token budget
        ↓
only relevant recent dialogue + memory + current turn are sent
        ↓
generation receives a bounded prompt
        ↓
active response streams into isolated UI state
        ↓
only necessary data is persisted/refetched
```

At the same time, eliminate unnecessary database work:

```text
small UI operation
        ↓
small API operation
        ↓
small DB operation
        ↓
small cache update
        ↓
small UI update
```

The final system must remain bounded as:

* messages increase;
* conversations increase;
* swipe variants increase;
* memory grows;
* characters increase;
* generations increase;
* users navigate/refresh repeatedly;
* model context becomes more complex.

---

# 2. Newly Confirmed Root Cause

The most important discovery is that **automatic context compaction is not functioning because the summarizer is not using the same AI configuration as the primary generation path**.

Primary generation uses the configured LM Studio endpoint, for example:

```text
192.168.29.240:1234
```

while the summarizer falls back to an incorrect default such as:

```text
localhost:1234
```

The summarizer consequently fails in the background.

The failure then causes:

```text
no summary
+
no historical reduction
+
raw history continues accumulating
```

This is a P0 defect.

It is not merely a memory-quality issue.

It is a **context-boundedness failure**.

---

# 3. Root-Cause Architecture

The current failure chain is:

```text
                  CONVERSATION
                       │
                       ▼
                MESSAGE GROWTH
                       │
                       ▼
               AUTO-COMPACT TRIGGER
                       │
                       ▼
                 SUMMARIZER
                       │
                       ▼
              WRONG LM CONFIG
                       │
                       ▼
               REQUEST FAILURE
                       │
                       ▼
               SUMMARY NOT SAVED
                       │
                       ▼
              OLD HISTORY REMAINS
                       │
                       ▼
                CONTEXT GROWS
                       │
                       ▼
          6,000–8,000+ TOKEN PROMPT
                       │
                       ▼
          LONG LM STUDIO PREFILL
                       │
                       ▼
        27s / 36s / 100s+ PROCESSING
                       │
                       ▼
        IMMEDIATE / EMPTY GENERATION
                       │
                       ▼
        FRONTEND FALLBACK / STALE UI
```

This must become:

```text
                  CONVERSATION
                       │
                       ▼
               MESSAGE STORAGE
                       │
                       ▼
             COMPACTION CONTROLLER
                       │
              threshold reached?
                 /          \
               no            yes
               │              │
               │              ▼
               │          Summarizer
               │              │
               │              ▼
               │        Summary persisted
               │              │
               └──────┬───────┘
                      ▼
               Context Compiler
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
       Summary     Recent      Current
       Memory      Dialogue      Turn
          │           │           │
          └───────────┼───────────┘
                      ▼
                Token Budget
                      │
                      ▼
              Model Generation
                      │
                      ▼
             Active Message UI
```

---

# 4. Phase 0: Observability & Baseline (P0)

No significant architectural optimisation should proceed without measurable baselines.

The engine must become capable of explaining:

```text
What request happened?
Why did it happen?
Which component triggered it?
How much data was transferred?
Which DB query was executed?
How long did it wait?
Which model was called?
How many input tokens were sent?
How many output tokens were generated?
Why did generation stop?
Did compaction run?
Did compaction succeed?
```

---

## 4.1 API Instrumentation

Every API request should record:

```text
requestId
endpoint
method
source/trigger
sessionId
characterId
messageId where relevant
startedAt
completedAt
duration
responseBytes
status
retryCount
aborted
```

The frontend should be able to distinguish:

```text
initial load
user action
cache refetch
focus refetch
reconnect refetch
background operation
retry
```

---

## 4.2 Database Instrumentation

Current logs already show severe values such as:

```text
Character.findUnique       ~2–4s
ChatSession.findMany       ~2–5.5s
Message.findMany           ~1.5–3.5s
UserPersona.findMany       ~1–4s
```

These values require further breakdown.

Measure separately:

```text
connection acquisition
database execution
Prisma processing
result materialisation
serialization
route total
```

The goal is to determine whether:

```text
SQL itself is slow
```

or:

```text
the application is waiting for a connection/resource
```

---

## 4.3 React Instrumentation

Measure:

```text
ChatPage render count
MessageList render count
MessageBubble render count
ActiveMessage render count
commit duration
long commits
render count per token
render count per swipe
render count per mutation
```

---

## 4.4 Generation Instrumentation

Every generation receives:

```text
generationId
sessionId
messageId
characterId
model
startedAt
firstTokenAt
completedAt
cancelledAt
inputTokens
outputTokens
finishReason
promptHash
```

---

## 4.5 Memory/Compaction Instrumentation

Every compaction operation must record:

```text
compactionId
sessionId
triggerReason
rawMessageRange
rawTokenCount
summaryTokenCount
model
AI endpoint
start time
completion time
success/failure
error
summary version
```

The system must never silently fail.

---

# 5. Phase 1: Centralise AI Configuration (P0)

This directly fixes the discovered root cause.

## 5.1 Create One Authoritative AI Client

There should be exactly one central configuration/service responsible for LM Studio connectivity.

Conceptually:

```text
AI Service
 ├── baseURL
 ├── model
 ├── API configuration
 ├── generation settings
 └── request helpers
```

All AI operations use it:

```text
primary generation
summarization
memory extraction
future background AI tasks
```

No subsystem should independently default to:

```text
localhost:1234
```

unless explicitly configured to do so.

---

## 5.2 Eliminate Configuration Duplication

Avoid:

```text
generation → aiConfig A
summarizer → aiConfig B
memory → aiConfig C
```

Use:

```text
Application AI Configuration
              ↓
          AI Client
              ↓
     ┌────────┼─────────┐
     ▼        ▼         ▼
 generation summarizer memory
```

---

## 5.3 Configuration Validation

At startup or AI configuration changes:

```text
endpoint reachable
model available
configuration valid
```

If the summarizer cannot reach the configured endpoint, report a visible/observable failure.

Do not silently fall back to localhost.

---

# 6. Phase 2: Repair Auto-Compact (P0)

Auto-compact must become a first-class subsystem.

## 6.1 Define the Trigger

The compaction trigger should use token estimates rather than raw message count alone.

Conceptually:

```text
estimated active context
+
reserved output budget
+
system/context overhead
>= compaction threshold
```

For example:

```text
context budget
    ↓
reserve output tokens
    ↓
reserve fixed system layers
    ↓
remaining budget for dialogue
```

This is better than:

```text
compact every 20 messages
```

because 20 short messages and 20 giant messages have radically different token costs.

---

## 6.2 Compaction State Machine

Use an explicit lifecycle:

```text
IDLE
  ↓
THRESHOLD_REACHED
  ↓
COMPACTION_PENDING
  ↓
COMPACTING
  ↓
COMPACTED
```

Failure branch:

```text
COMPACTING
    ↓
FAILED
    ↓
RETRYABLE / FALLBACK
```

Cancellation branch:

```text
COMPACTING
    ↓
CANCELLED
```

---

## 6.3 Compact the Oldest Eligible Region

Conceptually:

```text
raw conversation
│
├── newest / important
│
├── recent dialogue
│
└── old dialogue  ← compact this
```

Do not compact away the latest user turn.

Do not compact the currently active generation state.

---

# 7. Phase 3: Hard Context Safety Ceiling (P0)

Auto-compact must not be the only protection.

Even if summarization fails, the compiler must refuse to blindly send unlimited history.

This is a critical architectural invariant:

> **Compaction failure must degrade context quality, not destroy system performance.**

Fallback:

```text
Compaction succeeds
→ summary + recent dialogue

Compaction fails
→ recent bounded dialogue + existing memory
→ log failure
→ retry later
```

Never:

```text
compaction fails
→ send entire history
```

---

## 7.1 Context Budget

Define:

```text
MODEL_CONTEXT_LIMIT
SYSTEM_LAYER_BUDGET
MEMORY_BUDGET
RECENT_DIALOGUE_BUDGET
CURRENT_TURN_BUDGET
OUTPUT_RESERVE
```

The compiler then calculates:

```text
available dialogue budget
=
context limit
-
fixed context
-
memory
-
current turn
-
output reserve
```

The final prompt must remain under the calculated ceiling.

---

# 8. Phase 4: Seven-Layer Context Compiler Optimization (P0/P1)

The seven layers remain:

```text
1. Character Definition
2. Character Persona
3. User Definition
4. Pronoun Map / Participants
5. Conversation State
6. Recent Dialogue
7. Compiled Prompt
```

However, these layers should remain **compact and non-duplicative**.

---

## 8.1 Layer Responsibilities

```text
Layer 1
WHO IS THE CHARACTER?

Layer 2
HOW DOES THE CHARACTER BEHAVE?

Layer 3
WHO IS THE USER?

Layer 4
WHO ARE THE PARTICIPANTS / WHAT ARE THEIR PRONOUNS?

Layer 5
WHAT IS HAPPENING NOW?

Layer 6
WHAT RECENTLY HAPPENED?

Layer 7
HOW DO WE SERIALIZE ALL OF THIS?
```

Each layer should have one canonical responsibility.

---

## 8.2 Exact Current User Turn

The current user message must be immutable.

Invariant:

```text
compiled.currentUserTurn === originalUserMessage
```

The compiler may add metadata around it.

It must not replace it with a paraphrase.

---

## 8.3 Generation Snapshot

At Send/Regenerate:

```text
capture immutable context snapshot
```

The snapshot contains:

```text
character definition
character persona
user definition
participant/pronoun map
conversation state
recent dialogue
current user turn
model configuration
```

The compiler works against that snapshot.

The generation must not read moving UI state halfway through execution.

---

# 9. Phase 5: Context Budgeting & Intelligent History Selection (P0)

The compiler should not simply take:

```text
last N messages
```

without understanding token size.

Use a budget-based selection process.

Conceptually:

```text
old memory summary
+
recent dialogue
+
current turn
```

where recent history fills only the remaining token budget.

---

## 9.1 Priority Rules

Recommended priorities:

```text
1. Current user turn
2. Character identity
3. Character persona
4. Participant/pronoun map
5. Conversation state
6. Persistent memory summary
7. Recent dialogue
8. Older dialogue
```

When context becomes tight:

```text
remove/reduce oldest dialogue first
```

never silently truncate the current turn.

---

# 10. Phase 6: Prompt Serialization & Model Compatibility (P0)

Different models can require different templates.

Therefore Aegis should have:

```text
Canonical GenerationContext
        ↓
Model Adapter
        ↓
Model-specific formatting
```

The seven-layer semantic model remains stable.

The adapter controls:

```text
chat template
role formatting
generation boundary
thinking mode
special tokens
stop behaviour
```

---

## 10.1 Never Assume One Prompt Format Fits Every Model

For example:

```text
LFM
Nemotron
Bonsai/Qwen-family models
```

may behave differently with:

```text
system
user
assistant
```

serialization and generation boundaries.

Do not manually force one universal formatting scheme onto every model without testing.

---

## 10.2 Development Prompt Inspection

Provide a debug view showing:

```text
model
messages count
role for every message
character count
estimated tokens
last role
current user turn
generator identity
stop settings
thinking settings
max tokens
```

This should be the exact payload immediately before transmission.

---

# 11. Phase 7: Stop / EOS / Empty Response Safety (P0)

The earlier logs showed:

```text
prompt processing completed
eval = 0
1 token
finish_reason = stop
```

This represents an empty/near-empty generation path.

The frontend must not treat this as a successful normal response containing meaningful content.

---

## 11.1 Distinguish Generation States

Use explicit states:

```text
PENDING
STREAMING
COMPLETED
EMPTY
FAILED
CANCELLED
```

Do not use:

```text
content === ""
```

as the state machine.

An empty string is valid data and is also ambiguous as a status signal.

---

## 11.2 Empty Response Handling

When the model returns no useful content:

```text
generation
→ EMPTY
```

The UI should show an explicit generation failure/retry state rather than silently retaining an unrelated previous response.

---

## 11.3 Investigate Stop Configuration

During debugging, inspect:

```text
stop[]
max_tokens
chat template
EOS behaviour
generation boundary
```

Avoid generic stop sequences that accidentally terminate the response.

---

# 12. Phase 8: Generation Request Verification (P0)

Every generation must verify:

```text
requested model
=
actual model
```

The earlier logs demonstrated that a test intended to involve another model actually executed against:

```text
liquid/lfm2.5-1.2b
```

This must become impossible to miss.

Log:

```text
Aegis selected model:
LM Studio requested model:
LM Studio returned model:
```

Mismatch should generate a clear error.

---

# 13. Phase 9: Isolated Streaming State (P1)

The active generation must be separated from historical messages.

Architecture:

```text
Historical Conversation
        │
        └── stable cached state

Active Generation
        │
        └── high-frequency state
```

Only the active response should update rapidly.

---

## 13.1 Avoid Full Message Array Reconstruction Per Token

Do not perform O(N) conversation updates for each streamed token.

Use:

```text
stream
 ↓
buffer
 ↓
active generation state
 ↓
controlled UI commits
```

---

## 13.2 Control Commit Frequency

The stream can arrive rapidly.

The UI should commit at a measured cadence that preserves perceived typing smoothness without causing excessive reconciliation.

---

# 14. Phase 10: Granular RTK Query Cache Architecture (P0)

Eliminate broad invalidation.

Use resource-specific cache identities:

```text
Session:<id>
Messages:<sessionId>
Message:<id>
Character:<id>
Memory:<id>
```

---

## 14.1 Mutation Scope = Cache Scope

Examples:

```text
edit message
→ Message:<id>

switch swipe
→ Message:<id>

rename session
→ Session:<id>

character change
→ Character:<id>
```

Do not invalidate the full session unless the entire resource really changed.

---

## 14.2 Direct Cache Updates

When mutation responses contain enough information:

```text
mutation response
        ↓
cache patch
```

instead of:

```text
mutation
        ↓
destroy cache
        ↓
download everything
```

Use `onQueryStarted` where appropriate.

---

# 15. Phase 11: Bounded Conversation API (P0)

The session endpoint should no longer retrieve all messages.

Instead:

```text
GET /sessions/:id
→ metadata

GET /sessions/:id/messages
→ bounded page
```

---

## 15.1 Cursor Pagination

Example:

```text
GET /sessions/:id/messages?limit=40
```

and:

```text
GET /sessions/:id/messages?limit=40&beforeCursor=<cursor>
```

Use stable ordering.

Potential cursor:

```text
createdAt + unique id
```

when necessary.

---

## 15.2 Message Variant Handling

Do not allow every historical swipe to inflate every message response.

Determine whether normal conversation retrieval needs:

```text
active swipe only
```

or:

```text
variant metadata
```

with full variant content fetched only when required.

---

# 16. Phase 12: Database & Neon Performance (P0)

The current logs indicate a separate severe latency issue.

Examples:

```text
Character.findUnique
~2–4s

ChatSession.findMany
~2–5.5s

Message.findMany
~1.5–3.5s

UserPersona.findMany
~1–4s
```

These values should not be accepted as normal.

---

## 12.1 Determine Actual DB Wait

Separate:

```text
connection acquisition
```

from:

```text
SQL execution
```

from:

```text
Prisma result handling
```

---

## 12.2 Inspect Connection Pool Behaviour

Investigate:

```text
Prisma connection pool size
Neon connection limits
active connections
waiting connections
connection acquisition latency
transaction duration
idle connections
```

A unique lookup taking seconds is particularly worth investigating.

---

## 12.3 Query Index Audit

Verify indexes for every frequently queried field, especially:

```text
session ID
character ID
user ID
message ID
createdAt / ordering fields
foreign keys
compound cursor fields
```

Do not assume an index exists simply because the application uses the field frequently.

---

# 17. Phase 13: Reduce DB Operations Per User Action (P0)

The previous swipe endpoint reportedly performed:

```text
Message.findUnique
Message.update
ChatSession.updateMany
```

serially.

The redesign should minimise unnecessary critical-path work.

Desired:

```text
swipe
 ↓
single required mutation
 ↓
response
```

while unrelated side effects happen separately.

---

## 13.1 Background Persistence

If a memory-boundary update does not need to delay the UI:

```text
user-visible mutation
        ↓
respond
        ↓
background persistence
```

But background operations must have:

```text
error handling
logging
retry strategy
observability
```

Never silently discard failures.

---

# 18. Phase 14: Request Deduplication & Lifecycle Ownership (P0)

For every logical resource:

```text
one in-flight request where possible
```

Avoid:

```text
CharacterPage
ChatHeader
Sidebar
MessageList
```

all generating separate equivalent requests.

---

## 18.1 Cancellation

Page-owned operations require:

```text
AbortController
```

or equivalent cancellation.

Cancel on:

```text
navigation
session change
superseded request
user cancel
refresh lifecycle
new generation
```

---

## 18.2 Stale Result Protection

If:

```text
Request A starts
Request B starts
B completes
A completes
```

A must not overwrite B.

Use request/generation identity.

---

# 19. Phase 15: Background Work Audit (P1)

Inventory:

```text
setInterval
setTimeout
polling
health checks
SSE
WebSockets
refetchOnFocus
refetchOnReconnect
observers
listeners
subscriptions
```

Every one must have:

```text
owner
reason
start condition
stop condition
frequency
failure behaviour
```

---

# 20. Phase 16: DOM & Virtualization (P1)

Long conversations must not create unbounded DOM growth.

Use:

```text
virtualized message list
```

with support for:

```text
variable heights
markdown
images
streaming
scroll restoration
prepend history
auto-scroll
```

---

## 16.1 Pagination + Virtualization

These solve separate problems.

```text
Pagination
→ limits how much data is fetched

Virtualization
→ limits how much DOM is actively rendered
```

Both are required for long conversations.

---

# 21. Phase 17: Image & Media Optimization (P1)

Implement:

```text
loading="lazy"
decoding="async"
```

where appropriate.

Also ensure:

```text
stable image URLs
proper Cache-Control
appropriate image dimensions
efficient formats
no unnecessary remounting
```

Do not treat lazy loading as a substitute for virtualization.

---

# 22. Phase 18: Visual Compositing Optimization (P2)

Audit full-screen blur and other expensive visual effects.

Prefer:

```text
pre-blurred asset
```

over runtime full-viewport blur where visually acceptable.

Do not automatically add:

```text
will-change: filter
transform: translateZ(0)
```

because forced promotion can increase compositing and memory usage.

Measure first.

---

# 23. Phase 19: Prompt Token Efficiency (P1)

Every generation should expose:

```text
Layer 1 tokens
Layer 2 tokens
Layer 3 tokens
Layer 4 tokens
Layer 5 tokens
Layer 6 tokens
Current turn tokens
Output reserve
Total input tokens
```

This immediately identifies where the context is growing.

---

## 19.1 Context Target

The objective is not:

```text
smallest possible prompt
```

It is:

```text
smallest context that preserves necessary behaviour and continuity
```

---

## 19.2 Duplicate Information Removal

Do not repeat:

```text
character identity
gender
pronouns
relationship
personality
```

across five different layers.

Each fact should have a canonical location.

---

# 24. Phase 20: Golden Behaviour & Character Fidelity Testing (P1)

The existing Luna behaviour provides an excellent behavioural baseline.

Create a golden test suite covering:

```text
identity
persona
roleplay participation
pronouns
speaker ownership
current-turn adherence
continuity
format
emotional response
instruction leakage
```

Run the same prompts against:

```text
current model
Luna baseline
candidate models
```

without changing Aegis context.

---

# 25. Phase 21: Model-Independent Aegis Evaluation

Do not optimise Aegis around one specific model.

The architecture should provide:

```text
canonical context
        ↓
model adapter
```

This allows controlled comparison between:

```text
LFM
Nemotron
Gemma
Qwen
Bonsai
Luna
```

without rewriting the context engine for each model.

---

# 26. Phase 22: Auto-Compact Regression Test Suite (P0)

Create deterministic tests.

### Test 1: Trigger

Start with enough history to exceed the configured threshold.

Expected:

```text
compaction triggered
```

### Test 2: Endpoint correctness

Verify:

```text
summarizer uses configured AI endpoint
```

not:

```text
localhost fallback
```

### Test 3: Persistence

Verify summary is stored.

### Test 4: History boundary

Verify compacted raw messages are no longer included in active generation context.

### Test 5: Retrieval

Verify next generation retrieves the summary.

### Test 6: Failure fallback

Make summarizer unavailable.

Expected:

```text
bounded recent context
```

not:

```text
entire history
```

### Test 7: Retry

Restore AI endpoint.

Expected:

```text
pending compaction retries successfully
```

---

# 27. Phase 23: Context Invariants

The following become hard architectural invariants.

```text
1. Final prompt never exceeds configured context budget.

2. Current user turn is never silently removed to make room.

3. Compaction failure never causes unlimited history inclusion.

4. Successful compaction removes the corresponding raw dialogue from active context.

5. Summary retrieval does not duplicate the same raw dialogue.

6. Prompt compiler never includes the same history twice.

7. Generation uses one immutable context snapshot.

8. Every generation identifies its model explicitly.

9. Empty generation is not treated as a valid previous response.

10. Failed background compaction is observable.
```

---

# 28. Phase 24: End-to-End Data Flow

The final architecture should look like:

```text
                   USER MESSAGE
                        │
                        ▼
              Immutable Current Turn
                        │
                        ▼
                Generation Snapshot
                        │
        ┌───────────────┼────────────────┐
        │               │                │
        ▼               ▼                ▼
 Character Context   User Context   Conversation State
        │                                │
        └──────────────┬─────────────────┘
                       ▼
                 Memory Layer
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
       Rolling Summary     Recent Dialogue
              │                 │
              └────────┬────────┘
                       ▼
                Context Compiler
                       │
                 Token Budget
                       │
                       ▼
                Model Adapter
                       │
                       ▼
                  LM Studio
                       │
                       ▼
                Streamed Output
                       │
                       ▼
              Active Message State
                       │
              ┌────────┴────────┐
              ▼                 ▼
          UI rendering      Persistence
                                │
                                ▼
                         Neon PostgreSQL
```

---

# 29. Phase 25: Exact User Action Request Budgets

Establish expected API behaviour.

## Open conversation

```text
session metadata
+
bounded message page
+
required memory
```

No redundant full-history request.

---

## Edit message

```text
one mutation
+
targeted cache update
```

No complete session refetch.

---

## Swipe

```text
targeted mutation
+
targeted UI update
```

No unrelated character/persona/session reload.

---

## Generate

```text
one active generation
+
necessary persistence
```

No duplicated generation streams.

---

## Navigate away

```text
page-owned streams = 0
page-owned timers = 0
page-owned subscriptions = 0
```

---

# 30. Phase 26: Long-Conversation Testing

Create controlled datasets:

```text
50 messages
100 messages
250 messages
500 messages
1,000 messages
2,500 messages
5,000 messages
```

For each test measure:

```text
session response size
message response size
database latency
prompt tokens
compaction count
summary size
generation prefill
generation speed
browser heap
DOM node count
render duration
```

The expected characteristic is:

```text
conversation size ↑
        ↓
stored data ↑
        ↓
active generation context ≈ bounded
```

---

# 31. Phase 27: Lifecycle Stress Testing

Run:

```text
open
generate
navigate
return
generate
switch
regenerate
refresh
refresh
refresh
```

Then:

```text
disconnect network
reconnect
```

Then:

```text
trigger rate limit
```

Then:

```text
navigate away while streaming
```

Check that no resource accumulation occurs.

---

# 32. Phase 28: Memory Leak Verification

Run:

```text
open → generate → leave → return
```

10–20 times.

Measure:

```text
JS heap
DOM nodes
active requests
active streams
subscriptions
timers
```

The correct result is:

```text
initial growth
        ↓
stabilisation
```

not:

```text
cycle 1 → X
cycle 2 → 2X
cycle 3 → 3X
```

---

# 33. Phase 29: Rendering Verification

For one swipe:

```text
click
↓
mutation
↓
cache update
↓
affected MessageBubble changes
```

Record:

```text
MessageList render count
MessageBubble render count
ChatPage render count
commit duration
```

The objective is to ensure the UI work remains proportional to the changed resource.

---

# 34. Phase 30: Generation Verification

For one generation:

```text
capture snapshot
↓
compile
↓
send
↓
stream
↓
complete
```

Verify:

```text
exact current user turn
correct model
correct character
correct pronoun map
bounded prompt
no stale generation
no duplicate generation
```

---

# 35. Phase 31: Performance Acceptance Criteria

## Context

```text
Final prompt remains below configured model budget.

Compaction occurs before runaway context growth.

Compaction failure does not produce unbounded prompts.
```

## Generation

```text
One user generation produces one active request unless parallel generation is explicit.

Cancelled generation does not continue.

Empty response is classified explicitly.

Stale generation cannot overwrite current state.
```

## Database

```text
No broad historical retrieval during ordinary chat actions.

Message mutation does not require unrelated session reads.

DB latency is measurable independently from connection wait.
```

## Cache

```text
Small mutations do not trigger full-session refetch.

Repeated refreshes do not multiply requests.
```

## Rendering

```text
Historical messages remain stable during streaming.

Long chats do not create unbounded DOM growth.

Image work remains bounded.
```

---

# 36. Phase 32: Rollout Strategy

Implement behind feature flags where practical.

Recommended rollout:

```text
1. Instrumentation
2. Central AI configuration
3. Auto-compact repair
4. Context hard ceiling
5. Prompt budget enforcement
6. DB critical-path fixes
7. Granular cache updates
8. Request cancellation
9. Streaming isolation
10. Pagination
11. Virtualization
12. image optimisation
13. visual compositing optimisation
```

Each phase must have rollback capability.

---

# 37. P0 Priority List

These are the immediate production-confidence blockers:

```text
1. Fix summarizer AI configuration.
2. Prevent silent compaction failure.
3. Add hard context-budget fallback.
4. Verify compaction actually removes old raw context.
5. Instrument prompt token composition.
6. Verify exact model routing.
7. Validate model chat-template/generation boundaries.
8. Handle empty generation explicitly.
9. Investigate Neon/Prisma multi-second latency.
10. Remove redundant critical-path DB operations.
11. Eliminate broad cache invalidation.
12. Add request/generation cancellation.
13. Prevent duplicate generation requests.
14. Add stale-generation protection.
```

---

# 38. P1 Priority List

```text
15. Isolate streaming state.
16. Control stream-to-UI update frequency.
17. Implement cursor-based history pagination.
18. Implement message virtualization.
19. Optimise image lifecycle.
20. Audit duplicated state between RTK/Zustand/localStorage.
21. Audit timers, subscriptions, observers and background work.
22. Add golden character-behaviour test suite.
23. Implement model adapters.
24. Add prompt snapshots and hashes.
25. Add long-conversation regression tests.
```

---

# 39. P2 Priority List

```text
26. Replace runtime full-screen blur where beneficial.
27. Optimise background/media assets.
28. Measure browser GPU compositing.
29. Tune visual layer promotion only where profiling supports it.
```

---

# 40. Final Production Architecture

The final Aegis system should satisfy this model:

```text
                 ┌─────────────────────┐
                 │    Character UI     │
                 └──────────┬──────────┘
                            │
                    ┌───────▼────────┐
                    │    UI State    │
                    └───────┬────────┘
                            │
              ┌─────────────┼─────────────┐
              │                           │
              ▼                           ▼
       RTK Query / Server State      Generation State
              │                           │
              ▼                           ▼
       Bounded API Data             Immutable Snapshot
              │                           │
       ┌──────┴──────┐             ┌──────┴──────┐
       ▼             ▼             ▼             ▼
   Session      Message Pages   7 Layers     Current Turn
   Metadata                    + Memory
       │                           │
       └──────────────┬────────────┘
                      ▼
               Context Compiler
                      │
               Hard Token Budget
                      │
                Model Adapter
                      │
                      ▼
                  LM Studio
                      │
                      ▼
               Streamed Response
                      │
                      ▼
                Active Message
```

---

# 41. Core Engineering Invariants

These are the permanent rules for the engine.

```text
1. Session metadata is not conversation history.

2. Conversation history is not generation state.

3. Generation state is not UI state.

4. The current user turn is immutable.

5. Compaction is reliable, observable and retryable.

6. Compaction failure cannot create unlimited context.

7. The final compiled prompt has a hard ceiling.

8. The same history must never appear twice in the final prompt.

9. The current user turn must never be silently paraphrased away.

10. The model used for a generation must be explicitly identifiable.

11. The prompt format must be compatible with the selected model.

12. An empty completion is a distinct generation state.

13. A cancelled generation must actually terminate.

14. An old generation cannot overwrite a newer generation.

15. A small mutation must not invalidate a large unrelated cache.

16. A page-owned request must have an owner and cancellation path.

17. A background task must have an owner, stop condition and error path.

18. Conversation DOM size must not grow without bound.

19. Image loading must be bounded and cache-friendly.

20. Performance claims must be supported by measurements.
```

---

# 42. Definition of Done

The system is considered architecturally remediated when the following can be demonstrated.

```text
✓ Auto-compact triggers at the configured threshold.

✓ Summarizer uses the same authoritative AI configuration as generation.

✓ Summarizer never silently falls back to an invalid localhost endpoint.

✓ Failed compaction is observable.

✓ Failed compaction does not cause unlimited raw-history inclusion.

✓ Successful compaction creates persistent summary memory.

✓ Compacted dialogue is excluded from the active raw-history window.

✓ Final prompt remains within its token budget.

✓ Seven-layer context remains compact and non-duplicative.

✓ Current user wording reaches the model unchanged.

✓ Generation uses an immutable context snapshot.

✓ Model identity is visible in generation diagnostics.

✓ Model-specific prompt formatting is handled by an adapter.

✓ Empty model responses do not resurrect previous content.

✓ Repeated generation cannot create stale-overwrite races.

✓ Session endpoint does not return unbounded message history.

✓ Message history is paginated.

✓ Small mutations do not refetch the complete session.

✓ Database critical-path latency is measured and reduced.

✓ Duplicate requests are eliminated or intentionally justified.

✓ Page-owned requests and streams are cancelled correctly.

✓ Streaming does not cause unnecessary historical-message rerenders.

✓ Long conversations use bounded DOM rendering.

✓ Images are lazy and cache-efficient.

✓ Background timers/subscriptions have clear lifecycle ownership.

✓ Repeated refreshes do not multiply network activity.

✓ Repeated navigation/generation cycles do not create unbounded heap growth.

✓ Long-conversation tests demonstrate bounded active context.

✓ Production-style lifecycle tests pass consistently.
```

---

# 43. Final Target Behaviour

The completed engine should exhibit this property:

```text
Conversation grows
        ↓
Database grows
        ↓
Memory system compresses history
        ↓
Active raw history remains bounded
        ↓
Prompt remains bounded
        ↓
Generation prefill remains predictable
        ↓
Response generation remains responsive
        ↓
Only active message updates rapidly
        ↓
Only affected data is persisted/refetched
        ↓
UI remains responsive
```

The system must therefore scale in **stored information** without scaling uncontrollably in **per-generation work**.

That distinction is the fundamental architectural goal.

---

# 44. Final Guiding Principle

Aegis should never rely on one optimisation to save another broken subsystem.

Do not depend on:

```text
cache
to hide excessive DB work

lazy loading
to hide unbounded DOM

memoisation
to hide unnecessary state updates

model speed
to hide oversized prompts

auto-compact
to hide the absence of a hard context budget

background tasks
to hide missing lifecycle management
```

Instead, every subsystem should have an independent boundary:

```text
Database
→ bounded query cost

API
→ bounded request cost

Cache
→ bounded invalidation scope

Memory
→ bounded active history

Context
→ bounded token budget

Generation
→ bounded concurrency

Rendering
→ bounded update frequency

DOM
→ bounded mounted content

Media
→ bounded loading/decode work

Lifecycle
→ bounded resource ownership
```

That is the final architecture required for a Character AI engine that can grow from a single-character development environment into a production system without gradually turning every conversation into a heavier and heavier computational snowball.


# Phase 2:

# Character AI Engine

## Dedicated Memory Compaction, Context Pressure & Manual Control Implementation Plan

### Scope

This plan covers **only the conversation memory-compaction subsystem**.

It is responsible for:

```text
conversation history
        ↓
memory pressure detection
        ↓
automatic compaction
        ↓
rolling summary
        ↓
summary persistence
        ↓
compaction boundary tracking
        ↓
active-context reduction
        ↓
manual compaction
        ↓
memory visualisation
        ↓
context safety fallback
```

This plan does **not** cover:

* database performance optimisation;
* React rendering optimisation;
* API refactoring unrelated to memory;
* request deduplication;
* image loading;
* model benchmarking;
* general application caching;
* overall application scalability.

The purpose is to make the memory subsystem itself **reliable, bounded, observable, recoverable, and controllable**.

---

# 1. Objective

The memory system must ensure that conversation length can increase indefinitely without forcing the active LLM prompt to increase indefinitely.

The desired behaviour is:

```text
Conversation grows
        ↓
uncompacted history grows
        ↓
memory threshold approaches
        ↓
automatic compaction
        ↓
older dialogue becomes summary memory
        ↓
compaction boundary advances
        ↓
old raw dialogue leaves active context
        ↓
recent dialogue remains available
        ↓
future generations remain bounded
```

The system must never depend exclusively on successful summarisation.

If compaction fails, a hard context guard must prevent unlimited history from entering the model prompt.

---

# 2. Current Failure Being Solved

The current architecture has demonstrated a critical failure path:

```text
Generation
   ↓
Auto-compact trigger
   ↓
Summarizer
   ↓
incorrect/unavailable LM Studio configuration
   ↓
background failure
   ↓
summary not created
   ↓
summary boundary does not advance
   ↓
raw messages continue accumulating
   ↓
context grows
   ↓
6K–8K+ token prompts
```

The system previously allowed the failure to remain effectively invisible.

That behaviour must be eliminated.

A memory-compaction failure must become:

```text
observable
+
recoverable
+
bounded
```

rather than:

```text
silent
+
persistent
+
unbounded
```

---

# 3. Memory Architecture

The subsystem should conceptually contain four distinct representations.

```text
                    SESSION HISTORY
                          │
              ┌───────────┴───────────┐
              │                       │
              ▼                       ▼
       COMPACTED REGION         UNCOMPACTED TAIL
              │                       │
              ▼                       ▼
        SUMMARY MEMORY          RECENT RAW MESSAGES
              │                       │
              └───────────┬───────────┘
                          ▼
                  ACTIVE CONTEXT
                          │
                          ▼
                    LLM GENERATION
```

The critical distinction is:

```text
stored history
    ≠
uncompacted history
    ≠
active model context
```

---

# 4. Memory Terminology

Use precise terminology throughout the codebase.

### Stored History

All persistent conversation messages.

Example:

```text
2,000 messages
```

### Compacted History

Messages whose information has already been incorporated into one or more summaries.

Example:

```text
1,600 messages represented by summaries
```

### Uncompacted Tail

The raw messages not yet incorporated into summary memory.

Example:

```text
400 messages
```

### Active Context

The exact information selected for the current generation.

Example:

```text
summary memory
+
recent raw messages
+
current user turn
```

The active context can be much smaller than stored history.

---

# 5. Canonical Memory State

Define an explicit session memory state.

Conceptually:

```ts
type MemoryState = {
  sessionId: string;

  compactionStatus:
    | "idle"
    | "pending"
    | "compacting"
    | "completed"
    | "failed";

  compactionBoundary: {
    messageId: string | null;
    createdAt: string | null;
  };

  unsummarizedMessageCount: number;
  unsummarizedTokenEstimate: number;

  summaryTokenEstimate: number;

  lastCompactedAt: string | null;

  lastCompactionError: string | null;

  compactionVersion: number;
};
```

The exact schema may differ from the existing implementation, but the state should be explicit.

---

# 6. Replace Index-Based Compaction Boundaries

Do not rely primarily on:

```text
summarizedUpToIndex
```

because message indexes can become unstable when messages are:

* deleted;
* edited;
* inserted;
* reordered;
* branched;
* regenerated.

Use a stable message identity or cursor.

Preferred conceptual representation:

```text
compactionBoundaryMessageId
```

or:

```text
(createdAt, uniqueId)
```

This provides a durable boundary between:

```text
already compacted
```

and:

```text
still uncompacted
```

---

# 7. Rolling Summary Model

The memory subsystem should maintain a rolling summary rather than endlessly generating unrelated summaries.

Conceptually:

```text
Old Summary
+
Newly eligible dialogue
        ↓
Updated Summary
```

rather than:

```text
Summary A
Summary B
Summary C
Summary D
...
```

with no coherent relationship.

Depending on the existing implementation, multiple summary segments may be preferable for very long histories, but the active context should still have a deterministic method for selecting them.

---

# 8. Summary Data Structure

Each summary should carry provenance.

Recommended conceptual fields:

```ts
type ConversationSummary = {
  id: string;
  sessionId: string;

  sourceStartMessageId: string;
  sourceEndMessageId: string;

  sourceMessageCount: number;
  sourceTokenEstimate: number;

  summaryText: string;
  summaryTokenEstimate: number;

  model: string;
  modelVersion: string | null;

  createdAt: string;
  updatedAt: string;

  version: number;
};
```

The exact storage model can follow the current Prisma schema.

The important requirement is that a summary must answer:

> Which exact portion of the conversation does this summary represent?

---

# 9. Compaction Trigger

Do not trigger compaction solely from message count.

Use token pressure.

Conceptually:

```text
estimated uncompacted tokens
        +
estimated fixed context
        +
reserved output tokens
>= configured threshold
```

This prevents:

```text
20 tiny messages
```

from being treated identically to:

```text
20 enormous messages
```

---

# 10. Configurable Thresholds

Define explicit memory configuration:

```text
MEMORY_COMPACTION_THRESHOLD
MEMORY_TARGET_AFTER_COMPACTION
MIN_MESSAGES_TO_COMPACT
MAX_MESSAGES_PER_COMPACTION
MAX_SUMMARY_TOKENS
OUTPUT_RESERVE
HARD_CONTEXT_LIMIT
```

Example conceptual behaviour:

```text
Threshold:
3,500 tokens

Target:
2,000 tokens

Hard limit:
4,000 tokens
```

These numbers should be model-specific configuration rather than hard-coded throughout the codebase.

---

# 11. Two-Threshold Model

Use both:

### Soft Threshold

Triggers normal automatic compaction.

```text
70–85% of allowed memory
```

### Hard Threshold

Protects the model even if compaction is unavailable.

```text
near actual model/context limit
```

The architecture becomes:

```text
                  MEMORY PRESSURE
                        │
           ┌────────────┴────────────┐
           │                         │
      below soft                  above soft
           │                         │
           ▼                         ▼
         normal                AUTO COMPACT
                                     │
                              ┌──────┴──────┐
                              │             │
                           success       failure
                              │             │
                              ▼             ▼
                         normal use     HARD GUARD
```

---

# 12. Compaction Controller

The compaction logic should be centralized.

Conceptual service:

```text
memoryCompactionController
```

Responsibilities:

```text
check threshold
identify eligible messages
lock compaction
invoke summarizer
persist summary
advance boundary
release lock
report status
```

Generation code should not duplicate compaction logic.

---

# 13. Automatic Compaction Lifecycle

The normal automatic flow:

```text
Generation requested
        ↓
memory status evaluated
        ↓
threshold reached?
        │
       yes
        ↓
compaction requested
        ↓
eligible region selected
        ↓
summary generated
        ↓
summary persisted
        ↓
boundary advanced
        ↓
context rebuilt
        ↓
generation continues
```

The implementation may choose to compact before generation or schedule it asynchronously depending on the current architecture.

However, the resulting generation must never accidentally include both the newly compacted raw history and its summary.

---

# 14. Compaction Concurrency Lock

Only one compaction operation should be active for a session at a time.

Example:

```text
Session A
    ↓
COMPACTING
```

A second request:

```text
manual compact
```

must not produce another independent summarizer job.

Instead:

```text
already compacting
→ attach/observe existing operation
```

or return:

```text
status = compacting
```

---

# 15. Manual Compaction API

Provide:

```text
POST /api/sessions/:id/compact
```

Its responsibility should be:

> Compact eligible historical context for this session now.

It should not accept raw model endpoint configuration from the client.

The frontend should only express the action:

```text
compact this session
```

The backend should obtain AI configuration through the authoritative AI service.

---

# 16. Manual Compaction Request

Conceptually:

```http
POST /api/sessions/:id/compact
```

Optional request parameters can identify behaviour such as:

```text
mode = manual
```

but the API should not require:

```text
baseURL
API key
model endpoint
```

from the frontend.

---

# 17. Manual Compaction Response

Return useful status information.

Example:

```json
{
  "status": "completed",
  "compactedMessages": 18,
  "inputTokens": 2840,
  "summaryTokens": 410,
  "newBoundaryMessageId": "...",
  "durationMs": 1860
}
```

Possible outcomes:

```text
completed
already_compacting
nothing_to_compact
failed
```

---

# 18. Central AI Service for Summarization

The summarizer must never construct its own independent LM Studio configuration.

Architecture:

```text
                    AI CONFIGURATION
                           │
                           ▼
                       AI CLIENT
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
         generation    summarizer    memory tasks
```

All AI subsystems therefore share the same configuration rules.

This directly prevents the previous:

```text
generation → 192.168.29.240:1234
summarizer → localhost:1234
```

failure.

---

# 19. AI Configuration Validation

Before compaction:

```text
configured endpoint
        ↓
health/reachability check
        ↓
selected model available?
        ↓
summarization permitted?
```

Failure should produce an explicit compaction error.

Do not silently continue.

---

# 20. Summarizer Failure Handling

A summarization failure must result in:

```text
compactionStatus = failed
```

and:

```text
lastCompactionError = ...
```

The system should retain the previous valid memory state.

Never partially advance the boundary before summary persistence succeeds.

---

# 21. Atomic Compaction Commit

The compaction process should conceptually follow:

```text
generate summary
        ↓
validate summary
        ↓
persist summary
        ↓
advance boundary
```

Do not:

```text
advance boundary
        ↓
try to save summary
```

because a failure would make the system believe information was already compacted when it was not.

The summary and boundary update should ideally be committed atomically where the storage model permits.

---

# 22. Summary Validation

Before accepting a generated summary, validate:

```text
summary exists
summary is not malformed
summary length is within expected range
source range is valid
source boundary is valid
```

The summary should not be accepted simply because the model returned HTTP 200.

---

# 23. Prevent Duplicate Historical Representation

After compaction:

```text
summary contains messages 1–40
```

The active context must not also include:

```text
raw messages 1–40
```

Otherwise the system has effectively duplicated the same information.

The context compiler must therefore understand:

```text
compaction boundary
```

and exclude already represented raw dialogue.

---

# 24. Context Retrieval Rule

The active context should conceptually be:

```text
persistent summaries
+
messages after compaction boundary
+
current user turn
```

not:

```text
persistent summaries
+
all historical messages
+
current user turn
```

This is the most important invariant of the memory subsystem.

---

# 25. Hard Context Guard

Even if:

```text
compaction failed
```

the compiler must have a fallback.

Example:

```text
summary unavailable
        ↓
select newest bounded raw messages
        ↓
respect hard token budget
        ↓
generate
```

This means the character may temporarily lose access to distant uncompressed history, but the system remains responsive.

That trade-off is intentional.

---

# 26. Emergency Context Reduction

If the compiled context still exceeds the hard budget:

```text
remove oldest raw dialogue
        ↓
recalculate
        ↓
repeat
```

until the request fits.

Never allow:

```text
context overflow
→ blindly send oversized prompt
```

---

# 27. Memory Pressure API

Provide a read endpoint:

```text
GET /api/sessions/:id/memory-status
```

The endpoint should report:

```json
{
  "rawMessageCount": 52,
  "unsummarizedMessageCount": 14,
  "unsummarizedTokenEstimate": 2140,
  "summaryTokenEstimate": 480,
  "softThreshold": 3200,
  "hardLimit": 4000,
  "memoryPressure": 0.67,
  "compactionStatus": "idle",
  "lastCompactedAt": "...",
  "lastCompactionError": null
}
```

The exact field names can follow project conventions.

---

# 28. Memory Pressure Calculation

Do not calculate pressure using only:

```text
messageCount / threshold
```

Prefer:

```text
unsummarizedTokenEstimate
/
configuredCompactionBudget
```

Message count may remain as secondary information.

This better represents actual context pressure.

---

# 29. Memory Pressure Visualizer

Add a compact visual indicator to the chat interface.

Potential location:

```text
client/src/components/layout/Header.tsx
```

The indicator should communicate:

```text
low pressure
approaching threshold
compacting
failed/blocked
```

A circular/disk-style indicator is suitable for the existing UI concept.

---

# 30. Visualizer States

Recommended states:

### Low

```text
Memory
32%
```

### Approaching

```text
Memory
78%
Compaction approaching
```

### Compacting

```text
Memory
•••
Compacting
```

### Failed

```text
Memory
92%
Compaction failed
```

### Hard Guard

```text
Memory
97%
Context protection active
```

The exact visual language can follow the existing application theme.

---

# 31. Visualizer Tooltip / Expanded Details

Click or hover should reveal:

```text
Uncompacted messages: 14
Uncompacted tokens: 2,140
Soft threshold: 3,200
Hard limit: 4,000
Last compacted: 4m ago
Status: idle
```

This makes the UI useful during development rather than decorative.

---

# 32. Manual "Compact Now" Control

The visualizer should provide:

```text
Compact now
```

when manual compaction is available.

Click flow:

```text
user clicks
      ↓
POST /sessions/:id/compact
      ↓
status = compacting
      ↓
visualizer animates
      ↓
summary saved
      ↓
status = idle
      ↓
pressure recalculated
```

---

# 33. Disable Duplicate Manual Actions

While:

```text
compactionStatus = compacting
```

do not allow additional manual compaction requests.

Display:

```text
Compacting...
```

rather than allowing repeated clicks to create duplicate jobs.

---

# 34. Manual Compaction With Nothing to Compact

If all eligible dialogue is already represented:

```text
status = nothing_to_compact
```

The UI should not show this as a failure.

Example:

```text
Memory is already compact.
```

---

# 35. Manual Compaction of Partial History

Manual compaction should compact only an eligible region.

It should never unexpectedly consume:

```text
current turn
active generation
important protected recent messages
```

Define the compaction range explicitly.

---

# 36. Protected Recent Window

The memory subsystem should maintain a recent dialogue window that remains raw.

For example:

```text
SUMMARY MEMORY
+
protected recent dialogue
```

The exact window can be token-based.

Example conceptual rule:

```text
Never compact the newest X tokens unless emergency behaviour is explicitly invoked.
```

This preserves natural conversational continuity.

---

# 37. Summary Quality Objective

The summary is not supposed to reproduce the conversation word-for-word.

It should preserve information useful for future conversations:

```text
important facts
relationship developments
decisions
established lore
preferences
important events
unresolved topics
emotional/contextual developments
```

Avoid filling the summary with transient chatter.

---

# 38. Summary Compression Target

A useful summary should be substantially smaller than its source.

Measure:

```text
source tokens
summary tokens
compression ratio
```

Example:

```text
Source:
3,000 tokens

Summary:
450 tokens

Compression:
85%
```

The actual target should be determined experimentally.

---

# 39. Summary Prompt Isolation

The summarizer should receive only the information needed to summarize.

It should not receive:

```text
entire application prompt
all seven layers
unrelated UI metadata
unnecessary generation instructions
```

Its job is:

```text
historical dialogue
→ durable memory summary
```

Keeping this prompt focused reduces summarization cost.

---

# 40. Summary Semantics

Use explicit instructions such as:

```text
Create a concise factual continuity summary of the supplied conversation.

Preserve:
- important facts
- established relationships
- significant events
- decisions
- unresolved topics
- persistent preferences
- important emotional developments

Do not invent information.
Do not include system instructions.
Do not describe this summarization task.
```

The exact wording should be tuned against the target model.

---

# 41. Summary Versioning

When a summary is regenerated:

```text
version 1
version 2
version 3
```

can be tracked.

This allows debugging of memory drift.

Each summary should identify:

```text
which model generated it
when it was generated
which source range it represents
```

---

# 42. Compaction Observability Events

Emit structured events:

```text
COMPACTION_CHECK
COMPACTION_TRIGGERED
COMPACTION_STARTED
COMPACTION_REQUESTED
COMPACTION_SUMMARY_GENERATED
COMPACTION_SUMMARY_SAVED
COMPACTION_COMPLETED
COMPACTION_FAILED
COMPACTION_RETRYING
COMPACTION_SKIPPED
```

Each event should include:

```text
sessionId
compactionId
source range
token counts
model
duration
error if applicable
```

---

# 43. Silent Failure Elimination

The following behaviour is forbidden:

```text
try summarise
catch {}
```

Every failure must become observable through at least one of:

```text
server log
persistent status
monitoring event
UI status
```

Preferably more than one.

---

# 44. Compaction Retry Strategy

If compaction fails because the AI endpoint is temporarily unavailable:

```text
FAILED
   ↓
RETRYABLE
```

The retry should use controlled backoff.

Do not repeatedly hammer the model endpoint.

If the failure is configuration-related:

```text
invalid model
invalid endpoint
authentication failure
```

mark it as non-transient and surface it clearly.

---

# 45. Recovery Behaviour

When the summarizer becomes available again:

```text
failed compaction
        ↓
detect/retry
        ↓
compact pending region
        ↓
advance boundary
```

The user should not need to manually repair the conversation state.

---

# 46. Memory Status Consistency

The visualizer, compiler, and compaction controller must derive their understanding from the same canonical memory state.

Do not have:

```text
Header calculates 80%
Compiler calculates 40%
Backend calculates 60%
```

because each uses a different definition.

The memory status endpoint/controller should be authoritative.

---

# 47. Context Compiler Integration

The compiler should receive:

```text
MemoryState
```

rather than independently searching raw history.

Conceptually:

```text
Generation Context
        │
        ├── Character layers
        ├── Persistent summaries
        ├── Recent uncompacted dialogue
        └── Current user turn
```

This keeps memory selection separate from prompt formatting.

---

# 48. Memory and Seven-Layer Separation

The memory subsystem should not become another hidden eighth personality layer.

Memory provides:

```text
historical information
```

The seven-layer engine provides:

```text
identity
persona
user context
participants
state
recent dialogue
prompt compilation
```

Memory should feed relevant historical information into the appropriate context location.

---

# 49. Prevent Summary Duplication Across Layers

Do not place the same summary simultaneously in:

```text
Layer 5
Layer 6
Pinned memory
System prompt
```

unless each copy has a distinct purpose.

A summary should have one canonical source in the compiled context.

---

# 50. Generation-Time Memory Snapshot

Before each generation:

```text
read memory state
        ↓
create immutable memory snapshot
```

The generation sees a stable view of:

```text
summary boundary
summary memory
recent dialogue
```

If compaction completes after generation starts, that generation continues using its snapshot.

The next generation uses the new memory state.

---

# 51. Prevent Mid-Generation Memory Mutation

Never do:

```text
generation starts
        ↓
compaction completes
        ↓
same generation dynamically swaps context
```

The generation input must remain immutable.

This prevents inconsistent prompts.

---

# 52. Memory Integrity Checks

Before generating:

```text
summary boundary valid?
summary exists?
recent dialogue starts after boundary?
duplicate history detected?
token estimate valid?
```

If something is inconsistent, fail safely into the hard context guard.

---

# 53. Compaction Integrity Rules

The system must guarantee:

```text
summary source range is contiguous
summary boundary advances monotonically
summary does not skip messages accidentally
summary does not overlap already-compacted range
summary does not include future messages
```

These properties should be tested.

---

# 54. Monotonic Boundary

The compaction boundary should only move forward.

Example:

```text
Message 1 → 10
Message 1 → 20
Message 1 → 30
```

Never:

```text
1 → 30
1 → 20
```

unless an explicit recovery/rebuild mechanism is being performed.

This makes the memory state much easier to reason about.

---

# 55. Branching / Regeneration Considerations

If the application supports swipes or conversation branches, determine explicitly how compaction behaves.

The memory system must not accidentally compact one branch and inject its events into another branch.

Memory identity should therefore include the logical conversation/session/branch relationship where applicable.

---

# 56. Editing Historical Messages

If a message that has already been incorporated into a summary is edited:

```text
summary may become stale
```

The memory subsystem needs an explicit policy.

Possible policy:

```text
historical edit detected
        ↓
invalidate affected summary
        ↓
rebuild from earliest affected boundary
```

Do not silently leave a summary containing outdated information.

---

# 57. Deleting Historical Messages

Similarly:

```text
message deleted
```

may invalidate the summary that represented it.

The system should either:

```text
rebuild affected summary
```

or:

```text
mark summary stale and schedule rebuild
```

according to product requirements.

---

# 58. Summary Staleness State

Consider explicit:

```text
summaryStatus:
  valid
  stale
  rebuilding
  failed
```

This is useful for edits/deletions of already-compacted history.

---

# 59. Memory Visualizer Data Model

The frontend visualizer should consume a compact memory-status object.

Example:

```ts
type MemoryStatus = {
  pressure: number;
  unsummarizedTokens: number;
  thresholdTokens: number;
  hardLimitTokens: number;

  unsummarizedMessages: number;

  status:
    | "idle"
    | "compacting"
    | "failed";

  lastCompactedAt: string | null;
};
```

The frontend should not calculate these values from arbitrary session fields.

---

# 60. Visual Pressure Calculation

Conceptually:

```ts
pressure =
  Math.min(
    unsummarizedTokens / thresholdTokens,
    1
  );
```

The visualiser can then render:

```text
0.00 → empty
0.50 → half
0.85 → nearly full
1.00 → threshold
```

A second representation can display hard-limit pressure.

---

# 61. Manual Compaction Feedback

After manual compaction:

```text
Before:
2,850 / 3,200 tokens

After:
640 / 3,200 tokens
```

The UI should update from the authoritative backend status rather than guessing.

---

# 62. Developer Diagnostics Panel

Provide a development-only panel containing:

```text
Compaction status
Uncompacted messages
Uncompacted tokens
Compaction threshold
Hard limit
Summary tokens
Summary count
Compaction boundary
Last compaction
Last compaction error
AI endpoint/model
```

This would have exposed the previous incorrect-LM-endpoint problem immediately.

---

# 63. Compaction Debug Command

Provide a development command/function:

```text
forceCompact(sessionId)
```

which bypasses threshold checks but still obeys:

```text
lock
boundary
validity
summary persistence
error handling
```

This enables deterministic testing.

---

# 64. Testing: Trigger Test

Construct a session just below threshold.

Expected:

```text
no compaction
```

Add enough content to exceed threshold.

Expected:

```text
compaction triggered
```

---

# 65. Testing: Endpoint Test

Configure AI endpoint:

```text
192.168.29.240:1234
```

Trigger compaction.

Verify the summarizer uses exactly that authoritative endpoint.

Then deliberately make it unavailable.

Expected:

```text
compaction = failed
error visible
```

not:

```text
compaction silently disappears
```

---

# 66. Testing: Persistence Test

Trigger compaction.

Verify:

```text
summary saved
boundary saved
status updated
```

Restart the server.

Verify memory state persists.

---

# 67. Testing: Boundary Test

After compacting messages 1–20:

```text
generation context
```

must not contain raw messages 1–20.

It may contain:

```text
summary for 1–20
```

plus:

```text
messages 21+
```

---

# 68. Testing: Duplicate Representation Test

Ensure:

```text
summary of messages 1–20
```

and:

```text
raw messages 1–20
```

never appear together in the active context.

---

# 69. Testing: Compaction Failure Test

Disable LM Studio.

Allow threshold to be reached.

Expected:

```text
compaction fails
```

but:

```text
final generation context remains below hard limit
```

This test is mandatory.

---

# 70. Testing: Recovery Test

After a failed compaction:

```text
restore AI endpoint
```

Expected:

```text
pending history becomes compactable
        ↓
compaction succeeds
        ↓
boundary advances
```

---

# 71. Testing: Double Trigger Test

Simultaneously trigger:

```text
automatic compaction
+
manual compaction
```

Expected:

```text
one compaction operation
```

not:

```text
two summarizer requests
```

---

# 72. Testing: Repeated Compaction Test

Run compaction multiple times.

Expected:

```text
boundary continuously advances
```

without:

```text
duplicate summaries
overlapping ranges
lost messages
```

---

# 73. Testing: Large Conversation Test

Create:

```text
100 messages
500 messages
1,000 messages
2,500 messages
5,000 messages
```

Verify:

```text
stored history grows
```

while:

```text
active generation context remains bounded
```

---

# 74. Testing: Large Message Test

Use a small number of extremely long messages.

This verifies token-based pressure rather than message-count-based pressure.

Expected:

```text
long messages trigger compaction appropriately
```

even if message count is low.

---

# 75. Testing: Summary Compression Test

Measure:

```text
source tokens
summary tokens
compression ratio
```

over multiple conversations.

Look for pathological cases where summaries become almost as large as their source.

---

# 76. Testing: Summary Quality Test

Use a fixed conversation containing:

```text
important facts
relationship changes
events
preferences
unresolved topics
```

Compact it.

Then generate a later response requiring those facts.

Verify the model can still access the relevant historical information through memory.

---

# 77. Testing: Edit-After-Compaction Test

1. Compact messages 1–20.
2. Edit message 10.
3. Verify affected summary becomes invalid/stale.
4. Rebuild or otherwise reconcile the summary.
5. Verify future context reflects the edited message.

---

# 78. Testing: Delete-After-Compaction Test

1. Compact messages 1–20.
2. Delete message 10.
3. Verify summary consistency.
4. Rebuild affected summary if required.

---

# 79. Testing: Restart Test

1. Trigger compaction.
2. Restart backend.
3. Reload session.
4. Verify:

```text
summary
boundary
pressure
status
```

all remain consistent.

---

# 80. Testing: Visualizer Test

Verify the visual indicator correctly reflects:

```text
low pressure
high pressure
compacting
failed
hard guard
```

The visualizer must not rely on stale client-side estimates.

---

# 81. Testing: Manual Button Test

Click:

```text
Compact Now
```

while idle.

Expected:

```text
request
→ compacting state
→ progress state
→ completed
→ pressure decreases
```

Click repeatedly during compaction.

Expected:

```text
one active operation
```

---

# 82. Testing: Empty Compaction Test

With no eligible historical messages:

```text
Compact Now
```

Expected:

```text
nothing_to_compact
```

and no unnecessary model call.

---

# 83. Metrics

Track:

```text
compaction_count
compaction_success_count
compaction_failure_count
compaction_duration
source_tokens
summary_tokens
compression_ratio
memory_pressure_before
memory_pressure_after
fallback_count
```

The most important metrics are:

```text
compaction success rate
average compression ratio
final prompt token count
hard-limit fallback frequency
```

---

# 84. Alert Conditions

Potential warning conditions:

```text
compaction failed repeatedly
summary does not shrink substantially
memory pressure remains high after successful compaction
compaction boundary stops advancing
fallback context guard activates frequently
manual compaction repeatedly fails
```

These should be visible during development.

---

# 85. Memory Pressure UX Philosophy

The visualizer should communicate information without becoming another source of anxiety.

Recommended semantics:

```text
Normal
→ nothing needed

Approaching
→ automatic compaction soon

Compacting
→ memory operation active

Failed
→ fallback protection active

Hard guard
→ raw context is being restricted
```

The user should understand what the system is doing without needing to inspect logs.

---

# 86. Security / Trust Boundary

The summarizer must treat conversation text as data.

The summary process must not allow historical dialogue to become application-level instructions.

Historical content remains:

```text
conversation data
```

and should be clearly separated from:

```text
summarizer instructions
```

---

# 87. Failure Philosophy

The memory subsystem should fail according to this hierarchy:

```text
Best:
summarize successfully

Acceptable:
use existing summary + bounded recent history

Emergency:
truncate oldest raw history to satisfy hard token budget

Unacceptable:
send unlimited raw history
```

This creates graceful degradation.

---

# 88. Memory State Machine

The final state machine should resemble:

```text
                 ┌───────────┐
                 │   IDLE    │
                 └─────┬─────┘
                       │
                 threshold
                       │
                       ▼
                ┌─────────────┐
                │   PENDING   │
                └──────┬──────┘
                       │
                       ▼
                ┌─────────────┐
                │  COMPACTING │
                └──────┬──────┘
                   ┌───┴───┐
                   │       │
                success   failure
                   │       │
                   ▼       ▼
               ┌──────┐  ┌────────┐
               │ IDLE │  │ FAILED │
               └──────┘  └───┬────┘
                              │
                          retry/recovery
                              │
                              ▼
                         COMPACTING
```

---

# 89. Final Memory Flow

The completed subsystem should behave like:

```text
                  CONVERSATION
                       │
                       ▼
                MEMORY CONTROLLER
                       │
               token pressure check
                       │
          ┌────────────┴────────────┐
          │                         │
       below                     above
       threshold                threshold
          │                         │
          │                         ▼
          │                  AUTO COMPACT
          │                         │
          │                    ┌────┴────┐
          │                    │         │
          │                 success   failure
          │                    │         │
          └─────────┬──────────┘         │
                    │                    │
                    ▼                    ▼
              MEMORY STATE        HARD CONTEXT GUARD
                    │                    │
                    └────────┬───────────┘
                             ▼
                      ACTIVE CONTEXT
                             │
                             ▼
                           LLM
```

---

# 90. Definition of Done

The memory subsystem is complete when all of the following are true:

```text
✓ Automatic compaction reliably triggers.

✓ Summarizer uses the authoritative AI configuration.

✓ No hidden localhost/default endpoint remains in the compaction path.

✓ Compaction failure is observable.

✓ Compaction failure does not create unlimited context.

✓ Successful compaction persists a summary.

✓ Summary provenance is recorded.

✓ Compaction boundary is stable and monotonic.

✓ Already-compacted raw messages are excluded from future active context.

✓ Summary and raw dialogue are never duplicated in active context.

✓ Memory pressure is measured using token-aware accounting.

✓ Manual compaction is available.

✓ Manual compaction cannot create duplicate concurrent jobs.

✓ Visual memory pressure is visible.

✓ Compaction status is visible.

✓ Generation uses a stable memory snapshot.

✓ Editing/deleting compacted history has a defined consistency strategy.

✓ Context has a hard upper safety ceiling.

✓ Long conversations maintain bounded active context.

✓ Recovery from summarizer failure works.

✓ Compaction behaviour survives server restart.

✓ Memory metrics are observable.

✓ Memory regression tests pass.
```

---

# 91. Core Invariants

These should become permanent engineering rules:

```text
1. Stored conversation length may grow without bound.

2. Active generation context may not grow without bound.

3. Compaction must be token-aware.

4. Compaction must be observable.

5. Compaction failure must never be silent.

6. Compaction failure must never remove the context safety ceiling.

7. A successful summary must be persisted before the boundary advances.

8. The compaction boundary must move forward monotonically.

9. Compacted raw history must not re-enter active context accidentally.

10. Summary + represented raw history must never coexist in the same active context.

11. Only one compaction operation may run for a session at a time.

12. Manual compaction must use the same summarizer infrastructure as automatic compaction.

13. The frontend requests compaction; it does not own AI endpoint configuration.

14. Every generation receives a consistent memory snapshot.

15. Memory pressure shown to the UI must come from canonical memory state.

16. When memory fails, context quality may degrade, but system stability must remain intact.
```

---

# 92. Final Architecture Principle

The memory subsystem should make this promise:

```text
A conversation can become arbitrarily long.

Its permanent history can continue growing.

Its summaries can continue accumulating.

But the amount of historical information inserted into any individual model request remains deliberately bounded.
```

That is the purpose of the memory system.

The compactor is therefore not merely a convenience feature.

It is the mechanism that converts:

```text
unbounded historical conversation
```

into:

```text
bounded active model context
+
durable historical memory
```

while preserving enough information for the character to maintain continuity over long-running conversations.

The visualizer, manual trigger, token-aware pressure meter, compaction state machine, hard context guard, summary provenance, and recovery mechanisms all exist to make that guarantee reliable and observable.
