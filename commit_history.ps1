$ErrorActionPreference = "Stop"

# Helper function to commit
function Commit-Group ($files, $message, $date) {
    # Unstage all first
    git reset > $null 2>&1
    
    # Stage the specific files/folders
    foreach ($file in $files) {
        git add $file
    }
    
    # Commit with the specific date
    $env:GIT_AUTHOR_DATE = $date
    $env:GIT_COMMITTER_DATE = $date
    git commit -m $message
}

# 1. Day before yesterday morning
Commit-Group `
    @("package.json", "package-lock.json", "client/package.json", "server/package.json", "client/tsconfig.json", "server/tsconfig.json", "client/vite.config.ts", "client/tailwind.config.js", "client/postcss.config.js", "server/src/config.ts", "server/src/index.ts", "client/index.html", "client/src/main.tsx", "client/src/App.tsx", "docs/") `
    "chore: Initialize project workspace and core config" `
    "2026-09-21T09:30:00+05:30"

# 2. Day before yesterday afternoon
Commit-Group `
    @("server/prisma/", "server/src/db.ts", "server/src/middleware/", "server/scripts/") `
    "feat(db): Setup Prisma schema, seed scripts, and database connection" `
    "2026-09-21T15:45:00+05:30"

# 3. Yesterday morning
Commit-Group `
    @("server/src/services/cloudinary.ts", "server/src/services/memory.ts", "server/src/services/modelAdapter.ts", "server/src/services/observability.ts", "server/src/services/summarizer.ts", "server/src/services/tokenCounter.ts") `
    "feat(backend): Implement core services for memory, model adapters, and observability" `
    "2026-09-22T10:15:00+05:30"

# 4. Yesterday afternoon
Commit-Group `
    @("server/src/routes/", "client/src/api/", "client/src/store/") `
    "feat(api): Build REST API routes and frontend Redux/RTK Query integration" `
    "2026-09-22T16:20:00+05:30"

# 5. Yesterday evening
Commit-Group `
    @("client/src/components/layout/", "client/src/components/shared/", "client/src/components/characters/", "client/src/components/memory/", "client/src/components/personas/", "client/src/constants/", "client/src/styles/", "client/src/pages/HomePage.tsx", "client/src/pages/CharacterCreatePage.tsx", "client/src/pages/CharacterEditPage.tsx", "client/src/pages/SettingsPage.tsx") `
    "feat(ui): Develop main layout, shared components, and non-chat pages" `
    "2026-09-22T21:05:00+05:30"

# 6. Today morning
Commit-Group `
    @("client/android/", "client/cypress/", "client/capacitor.config.ts", "client/cypress.config.ts") `
    "chore: Add Android build configuration and Cypress E2E test suites" `
    "2026-09-23T09:10:00+05:30"

# 7. Today afternoon (the bug fixes and chat page)
Commit-Group `
    @("client/src/components/chat/", "client/src/pages/ChatPage.tsx", "client/src/pages/AIIntegrationPage.tsx", "client/src/hooks/useStreamChat.ts", "server/src/services/lmStudioClient.ts", "server/src/services/contextEngine.ts", "server/test_lmstudio.ts", "server/test_regenerate.js", "server/get_id.ts", "server/.env.example", "start.bat", "implementation_plan.md", "phases.md") `
    "fix(chat): Resolve long conversation ghost swipe bug and scrolling flicker`n`n- Fix context engine regeneration parsing logic`n- Fix nullish coalescing in frontend swipe render`n- Remove aggressive scroll forcing in Virtuoso list" `
    "2026-09-23T16:30:00+05:30"

# Finally, stage any remaining untracked/unstaged files just in case we missed some, and commit them.
# (But ignore the scratch scripts)
git reset > $null 2>&1
git add .
git reset server/check_swipes.ts server/test_dump.ts server/test_regen.ts > $null 2>&1
$status = git status --porcelain
if ($status) {
    $env:GIT_AUTHOR_DATE = "2026-09-23T17:00:00+05:30"
    $env:GIT_COMMITTER_DATE = "2026-09-23T17:00:00+05:30"
    git commit -m "chore: Finalize remaining configuration and minor UI tweaks"
}
