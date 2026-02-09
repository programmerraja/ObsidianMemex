# Refined Roadmap: UI Simplification & Unified AI

## Phase 1: Clean Up & UI Consolidation

- [ ] **Task 2.1: Remove "Deck" UI**
  - Delete `src/components/Review.tsx`.
  - Delete `src/fsrs/Deck.ts` (if not needed for base logic).
  - Remove "Review" tab from `NavBar.tsx` and `MainView.tsx`.
  - _Goal_: Eliminate the confusing "Flashcard Deck" concept from the main view.
- [ ] **Task 2.2: Promote "Note Review"**
  - Rename `NoteReviewQueue` to `ReviewDashboard`.
  - Make `ReviewDashboard` the default subview in `MainView`.
  - Update `NavBar` to only show "Chat" and "Review".

## Phase 2: Unified LLM Integration

- [ ] **Task 2.3: Install SDK**
  - Run `npm install @unified-llm/core`.
- [ ] **Task 2.4: Settings Overhaul**
  - Update `SRSettings` to support:
    - `aiProvider`: 'openai' | 'anthropic' | 'gemini' | 'custom'
    - `apiKey`: (already exists, maybe rename or support multiple)
    - `baseUrl`: For custom/local endpoints.
    - `modelName`: String input (e.g., 'llama3', 'gpt-4o').
  - Update `SettingsPage.tsx` to reflect new options.
- [ ] **Task 2.5: Rewrite AIManager**
  - Re-implement `AIManager.ts` using `@unified-llm/core`.
  - Ensure `streamAIResponse` and `generateNoteQuiz` work with the new unified client.
  - _Goal_: Seamless switching between OpenAI, Claude, and Local LLMs.

## Phase 3: Gamification & Alerts

- [ ] **Task 2.6: "Due Today" Alert**
  - On plugin load, check `getDueNotes()`.
  - If count > 0, show a `Notice` or a small UI callout: "5 notes due for review!".
- [ ] **Task 2.7: Streak Counter**
  - Add `streak` to `data.json` (plugin core data).
  - Increment streak if user completes at least 1 review per day.
  - Display fire icon + count in `ReviewDashboard`.

## Phase 4: Post-Review Verification (Advanced)

- [ ] **Task 2.8: "Explain" Mode (Optional)**
  - In `NoteReviewModal`, if user clicks "Hard" or "Again":
  - Prompt: "Briefly calculate/summarize the key point..."
  - User types response.
  - AI grades the response against note content.
