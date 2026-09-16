# Complete Bug Fixes & Architecture Audit Log
**Project:** Character AI (Local, Uncensored & High-Performance)  
**Date:** September 8, 2026  
**Status:** All 17 Bugs Resolved & Verified  

---

## Table of Contents
1. [Navigation & Routing (Bugs 1–4)](#1-navigation--routing)
2. [Session Management & Deletion (Bugs 5–8)](#2-session-management--deletion)
3. [Modals & Viewport Responsiveness (Bugs 9–11)](#3-modals--viewport-responsiveness)
4. [Personas & Header UI (Bugs 12–14)](#4-personas--header-ui)
5. [Backend, Database & LLM Engine (Bugs 15–17)](#5-backend-database--llm-engine)

---

## 1. Navigation & Routing

### Bug 1: Card "Chat" Button Spawning Duplicate Fresh Chats Every Click
* **The Issue:** On the home page, clicking the "Chat" button or clicking on any character card called `createSession`, creating a brand-new empty session every single time. Users were unable to return to their existing conversation with that character from the home view.
* **The Fix:**
  * Created `POST /api/sessions/resume` in `server/src/routes/sessions.ts` which checks if there is already an existing session for that character (`orderBy: { updatedAt: "desc" }`). If found, it returns that session; if none exists, it initializes the first session with the character's opening greeting.
  * Updated `CharacterCard.tsx` and home screen navigation to call `resumeSession({ characterId })`, seamlessly restoring prior conversations.

### Bug 2: "All Characters" in Sidebar Opening Edit Panel Instead of Chat
* **The Issue:** In `client/src/components/layout/Sidebar.tsx`, clicking on any character under the "All Characters" section was hardcoded to `/characters/:id/edit`. Clicking a character opened the character definition form rather than launching a conversation.
* **The Fix:**
  * Changed the main click handler in `Sidebar.tsx` to invoke `resumeSession(char.id)` and navigate directly to `/chat/${session.id}`.
  * Added a dedicated hover settings/pencil icon (`<Settings className="w-3 h-3" />`) that stops event propagation when the user explicitly wants to edit the character definition.

### Bug 3: Desktop Hamburger Button Not Collapsing Sidebar
* **The Issue:** Clicking the hamburger menu button in the sidebar failed to collapse the sidebar on desktop screens. The Redux state toggled `sidebarOpen` to `false`, but Tailwind's `md:translate-x-0` on `<aside>` overrode `-translate-x-full`, forcing the sidebar to remain permanently open.
* **The Fix:**
  * Updated `Sidebar.tsx` aside styling to transition width dynamically between `w-64` (open) and `w-0 overflow-hidden md:border-r-0` (collapsed) on desktop.
  * Wrapped the sidebar content in an inner `<div className="w-64 flex flex-col h-full">` container to ensure content never reflows or squishes during width animation.

### Bug 4: Isolated Vertical Gray Line Artifact in Navbar
* **The Issue:** Whenever the sidebar was closed or toggled, an orphaned vertical gray line (`|`) appeared directly to the left of the character's avatar in the top navbar.
* **Root Cause:** In `client/src/components/layout/Header.tsx`, the navbar hamburger container was marked `md:hidden`, so the hamburger icon was hidden on desktop. However, the character container had:
  ```tsx
  <div className={`flex items-center gap-2 ${!sidebarOpen ? "pl-3 border-l border-white/10" : ""}`}>
  ```
  Because the hamburger was hidden, the `border-l` separator was left with nothing to its left, rendering an isolated vertical line.
* **The Fix:**
  * Removed `md:hidden` from the navbar hamburger container so that when the sidebar collapses on desktop, the hamburger icon and Aegis logo appear in the navbar to allow re-opening.
  * When the sidebar is open, `!sidebarOpen` is `false`, so no `border-l` is rendered, completely eliminating the stray line artifact.

---

## 2. Session Management & Deletion

### Bug 5: Session Deletion Returning `304 Not Modified` and Failing to Delete
* **The Issue:** Clicking the delete button on chat sessions often returned HTTP 304, and the session remained visible in the UI.
* **Root Cause:**
  1. Express ETag calculation combined with default browser caching resulted in 304 responses for dynamic records.
  2. The backend `DELETE /api/sessions/:id` route failed when foreign key constraints encountered child messages or memories.
* **The Fix:**
  * In `server/src/index.ts`, disabled ETags (`app.set("etag", false)`) and added global cache prevention headers (`no-store, no-cache, must-revalidate, proxy-revalidate`) for all `/api` routes.
  * In `server/src/routes/sessions.ts`, explicitly removed associated `Message` and `PinnedMemory` records before deleting the `ChatSession` record.

### Bug 6: Recent Conversations Showing Duplicates of the Same Character
* **The Issue:** If multiple conversations existed for a character (e.g. Commander Jack Kane), both the new chat and older chats showed up as separate items in the sidebar's "Recent Conversations" list.
* **The Fix:**
  * In `Sidebar.tsx`, added deduplication to `recentSessionsList` using a `Set<string>` over `characterId`. Each character now appears **at most once**, showing only their most recently active conversation and timestamp.

### Bug 7: Deleting a Recent Chat Revealing Older Ghost Sessions
* **The Issue:** When a character's recent conversation was deleted from the sidebar, the deletion appeared to fail or "refresh" because an older session for that same character immediately took its place.
* **The Fix:**
  * Created `DELETE /api/sessions/character/:characterId` in `server/src/routes/sessions.ts` to delete all sessions, messages, and memories associated with that character.
  * Added `useDeleteCharacterSessionsMutation` in `client/src/api/baseApi.ts` with 0ms optimistic cache removal. Clicking trash next to a character under Recent Conversations now completely purges that character's conversation history in 0ms without ghost sessions reappearing.

### Bug 8: Active Session Deletion Leaving Chat in Invalid State
* **The Issue:** If the user deleted the session they were currently viewing, the application remained on the deleted URL (`/chat/:deletedId`), showing a broken state or error.
* **The Fix:**
  * In `Sidebar.tsx` and `CharacterProfileDrawer.tsx`, added route redirect logic: if `location.pathname === /chat/${deletedId}`, the application automatically navigates to the next remaining conversation, or redirects to `/` if no conversations remain.

---

## 3. Modals & Viewport Responsiveness

### Bug 9: Image Crop Modal Slidebar Clipped on Small Screens
* **The Issue:** In `ImageCropModal.tsx`, on smaller viewports or laptops, the zoom slidebar (`50%–300%`), percentage readout, and action footer were pushed below the bottom edge of the browser viewport.
* **The Fix:**
  * Rendered `ImageCropModal` using **React Portal** (`createPortal(..., document.body)`), detaching it from parent relative stacking contexts.
  * Constrained the canvas preview height dynamically (`240px` for avatars, `220px` for wallpapers) with a scrollable interior container, ensuring 100% of controls remain visible on any display height.

### Bug 10: Animated WebP / GIF Avatars Freezing into Static Images
* **The Issue:** Uploading an animated GIF or animated WebP character portrait froze into a single still frame when cropped, because HTML5 canvas exports (`canvas.toBlob()`) cannot preserve animation frames.
* **The Fix:**
  * Added file signature sniffing (`isAnimatedWebPOrGif`) to detect moving images.
  * Added a purple notice banner with a prominent **"Keep Moving Picture"** button that directly passes through the original animated file, preserving full animation.

### Bug 11: Missing Mobile/Tablet Touch Drag in Crop Modal
* **The Issue:** Users on mobile or touchscreens could not drag or reposition images inside the crop canvas because only `onMouseDown` and `onMouseMove` were handled.
* **The Fix:**
  * Added `onTouchStart`, `onTouchMove`, `onTouchEnd`, and `onTouchCancel` handlers in `ImageCropModal.tsx` alongside `touch-none` styling, allowing smooth touch panning on phones and tablets.

---

## 4. Personas & Header UI

### Bug 12: Persona Button Not Working on Home Page
* **The Issue:** The Persona button in the top navbar worked inside the chat screen, but clicking it on the Home screen (or create/edit character pages) did nothing.
* **Root Cause:** `<UserPersonaModal />` was previously hardcoded and mounted **only inside `ChatPage.tsx`**. When on other routes, no modal was rendered to receive the `personaModalOpen` Redux state.
* **The Fix:**
  * Created `client/src/components/personas/GlobalPersonaModal.tsx` and mounted it inside the root router in `App.tsx`.
  * Designed context-aware selection: on Home/Settings, selecting a persona updates the global default persona (`isDefault: true`); inside Chat, selecting a persona updates that specific active chat session.
  * Wrapped `UserPersonaModal.tsx` with `createPortal(..., document.body)` to ensure reliable z-index overlay.

### Bug 13: Header Persona Button Showing Generic Label
* **The Issue:** Outside of an active chat, the navbar button only displayed generic text ("Persona") rather than the user's selected identity.
* **The Fix:**
  * In `Header.tsx`, added automatic fallback fetching via `useGetPersonasQuery` when `userPersona` is not provided.
  * The button now displays the user's active persona name and avatar thumbnail directly in the header across all pages.

### Bug 14: Misaligned Horizontal Seam Between Sidebar and Navbar
* **The Issue:** The bottom border of the sidebar top header was noticeably higher (~56px) than the navbar bottom border (64px / `h-16`), producing an 8px stair-step seam across the top of the application.
* **The Fix:**
  * Standardized the sidebar brand header container in `Sidebar.tsx` to `h-16 px-4 border-b border-white/10 flex items-center justify-between flex-shrink-0`.
  * Both headers now have an identical 64px height and border line, forming a flush, continuous horizontal line across the entire screen.

---

## 5. Backend, Database & LLM Engine

### Bug 15: Backend 500 Error (`ERR_HTTP_HEADERS_SENT`)
* **The Issue:** API requests suddenly failed with 500 errors, and Vite's proxy logged `ECONNREFUSED`.
* **Root Cause:** In `server/src/index.ts`, response timing was added via:
  ```ts
  res.on("finish", () => {
    res.setHeader("X-Response-Time", `${duration}ms`);
  });
  ```
  In Node.js, once `finish` fires, HTTP headers have already been transmitted over the socket. Calling `setHeader` threw `ERR_HTTP_HEADERS_SENT`, crashing the Express server.
* **The Fix:**
  * Replaced the post-finish header mutation with a `res.writeHead` interceptor that attaches `X-Response-Time` before headers are sent.
  * Retained console duration logging inside `res.on("finish")`. Added root `/api/health` JSON endpoint.

### Bug 16: Swipe Switching Desynchronizing Rolling Memory
* **The Issue:** Changing an active swipe on an earlier message or editing older turns caused conversational hallucination because rolling summaries still contained context from the abandoned swipe branches.
* **The Fix:**
  * In `server/src/routes/messages.ts`, switching swipes or editing message order $K$ now resets `summarizedUpToIndex = K - 1` and resets `rollingSummary = null`. Summarization only rolls forward from the branched point.
  * In `MessageBubble.tsx`, restricted regeneration to the latest assistant message (`canRegenerate={isLastAssistant}`) and added a visual warning guard when switching older turns.

### Bug 17: Repetitive LLM Regenerations & Neon Query Latency
* **The Issue:** Regenerating alternate swipes often yielded identical or 90%+ verbatim responses. Additionally, queries sorting sessions by `characterId` and `updatedAt` lacked database indexing on Neon PostgreSQL.
* **The Fix:**
  * Created `server/src/services/observability.ts`:
    * Lexical Jaccard similarity detector (`calculateJaccardSimilarity`).
    * Opening action extraction and match check (`extractOpeningAction`, `hasDuplicateOpeningAction`).
    * Structured console telemetry logging.
  * In `server/src/routes/generation.ts`, dynamically scaled temperature on successive regenerations (`Math.min(0.8 + (currentSwipes.length - 1) * 0.05, 1.05)`) to promote phrasing variance.
  * Added composite index to `ChatSession` in `server/prisma/schema.prisma`:
    ```prisma
    @@index([characterId, updatedAt(sort: Desc)])
    ```
    Executed `npx prisma db push` to synchronize Neon PostgreSQL. Added non-intrusive Prisma query timing logger in `server/src/db.ts`.

---

## Verification Summary
* **Client Production Build:** `tsc && vite build` completes with **0 errors**.
* **Backend:** Running stably on port 3001 with active observability logs.
* **Database:** In sync on Neon PostgreSQL with composite indices and clean cascading deletions.

---

# Mobile & AI Integration Session — Bug Fixes
**Date:** September 16, 2026  
**Status:** All 9 Bugs Resolved  
**Focus:** Android APK connectivity, AI Integration settings UI, WebView security policies

---

## 6. Android / Capacitor

### Bug 18: Android WebView Mixed Content Blocking (Root Cause of ALL Connection Failures)
* **The Issue:** Every API request from the installed APK showed `blocked:mixed-content` in DevTools — characters, sessions, health, and chat generation all silently failed. The app appeared completely broken.
* **Root Cause:** Capacitor serves the app from `http://localhost` inside Android WebView. Android treats `http://localhost` as a **secure origin** (equivalent to HTTPS on desktop). Any outbound `fetch()` to `http://192.168.x.x:3001` (plain HTTP to an external LAN IP) was classified as mixed content and blocked at the OS level — before even touching the network. This is governed by Android's `MIXED_CONTENT_COMPATIBILITY_MODE` default.
* **The Fix:** Added `android.allowMixedContent: true` to `client/capacitor.config.ts`, setting the WebView to `MIXED_CONTENT_ALWAYS_ALLOW` mode — equivalent to a regular browser's behavior.
* **Commit:** `833351b`

### Bug 19: Windows Firewall Blocking Port 3001
* **The Issue:** The Android phone could not reach the Node.js backend at `192.168.29.240:3001` — all connection attempts timed out silently even though both devices were on the same Wi-Fi.
* **Root Cause:** Windows Firewall had no inbound rule for TCP port 3001. All LAN connection attempts from the phone were dropped at the OS firewall, even though the Node.js server was correctly bound to `0.0.0.0` (all interfaces).
* **The Fix:** Added a Windows Firewall inbound rule (requires admin PowerShell):
  ```powershell
  netsh advfirewall firewall add rule name="Aegis AI Port 3001" dir=in action=allow protocol=TCP localport=3001 profile=private,domain
  ```
* **Verification:** `netsh advfirewall firewall show rule name="Aegis AI Port 3001"` confirmed rule as Enabled.

---

## 7. CI/CD

### Bug 20: New Page File Not Staged — GitHub Actions Build Failure
* **The Issue:** GitHub Actions failed with `TS2307: Cannot find module './pages/AIIntegrationPage.js' or its corresponding type declarations`.
* **Root Cause:** `git commit -am` only stages files that are already tracked by Git. `AIIntegrationPage.tsx` was a brand-new file and untracked, so Git silently skipped it. The file existed locally but was absent from the repository.
* **The Fix:** Used `git add .` explicitly before committing to stage all new untracked files.

---

## 8. AI Integration Settings

### Bug 21: Test API Button Non-Functional (Static UI)
* **The Issue:** The "Test API" button in the AI Integration settings page was a visual placeholder — tapping it did nothing at all.
* **The Fix:** Implemented `handleTestAPI()` in `AIIntegrationPage.tsx`: POSTs to `/api/generate/test`, shows an animated spinner during the test, and updates the status label to "API ready" (green) or "Connection failed" (red) based on the backend response.
* **Commit:** `ded0c7a`

### Bug 22: Test API Calling LM Studio Directly From Phone (404 / CORS Failure)
* **The Issue:** After the button was wired up, it returned 404. The frontend was directly calling `http://192.168.29.240:1234/v1/chat/completions` (LM Studio's port) from the phone WebView — a different port with no firewall rule and no CORS headers.
* **Root Cause:** Initial implementation made the test request directly from the WebView to LM Studio instead of routing through the Node.js backend.
* **The Fix:**
  * Created `POST /api/generate/test` backend endpoint in `server/src/routes/generation.ts` that proxies the connectivity test.
  * Updated `AIIntegrationPage.tsx` to call `${getApiBaseUrl()}/generate/test` — the phone calls the Node backend, and the backend calls LM Studio. The phone never talks to LM Studio directly.
* **Commit:** `ded0c7a`

### Bug 23: `aiConfig` Not Passed to Backend During Chat Generation
* **The Issue:** The app always used the hardcoded `.env` LM Studio URL for generation regardless of what the user configured in AI Integration settings.
* **Root Cause:** `useStreamChat.ts` never read from `localStorage` or included `aiConfig` in the POST body to `/api/generate` or `/api/generate/regenerate`.
* **The Fix:** Added `getAiConfig()` helper in `useStreamChat.ts` that reads `ai_provider`, `ai_endpoint`, `ai_api_key`, `ai_model` from `localStorage` and injects them into all three generation request paths (send, go-on, regenerate).
* **Commit:** `4499ab4`

---

## 9. Mobile UI / UX

### Bug 24: Sidebar Not Closing on Mobile When Tapping Settings Links
* **The Issue:** Tapping "AI Integration Settings" or "App & Database Settings" in the sidebar navigated to the correct page, but the sidebar overlay remained open on top of the new page.
* **Root Cause:** The `<Link>` components at the bottom of `Sidebar.tsx` had no `onClick` handler to close the sidebar.
* **The Fix:** Added `onClick={() => dispatch(setSidebarOpen(false))}` to both settings links.
* **Commit:** `a86a338`

### Bug 25: Navbar UI Overlapping Punch-Hole Camera on Android
* **The Issue:** The header bar was crammed into the punch-hole camera cutout area — action buttons and the character name were visually hidden behind the camera.
* **Root Cause:** `pt-[env(safe-area-inset-top)]` alone was insufficient. Some Android devices with punch-hole displays do not correctly report the safe area inset, and the header was fixed at `h-14` with no minimum guaranteed gap.
* **The Fix:** Changed `Header.tsx` to use `pt-[max(env(safe-area-inset-top),1.5rem)]` with `min-h-[4rem]` (dynamic height), ensuring a guaranteed minimum clearance regardless of device-reported insets.
* **Commit:** `a86a338`

---

## Verification Summary (Session 2)
* **Android APK:** Mixed content blocking resolved — all API requests now reach `192.168.29.240:3001` successfully.
* **Windows Firewall:** Port 3001 rule confirmed active via `netsh`.
* **AI Integration UI:** Test API functional with backend proxy; Network Diagnostics console added for real-time debugging.
* **GitHub Actions:** Build pipeline unblocked — all new files staged and committed correctly.
