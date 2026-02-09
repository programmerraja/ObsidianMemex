# V2: Quiz Persistence & Practice Mode

## Phase 2.1: Quiz Persistence (Separate Storage)

- [ ] **Task 3.1: Define Quiz Storage Structure**
  - Create a hidden folder `.obsidian-memex/quizzes/` to store generated quizzes.
  - Format: JSON files named by `file-id` or hash of the file path. E.g., `hash(path).json`.
  - Update frontmatter to reference this quiz file ID (optional, or just rely on path hash).
- [ ] **Task 3.2: Quiz Manager Class**
  - Create `src/note/QuizManager.ts`.
  - Methods: `saveQuiz(file: TFile, quiz: QuizItem[])`, `loadQuiz(file: TFile)`, `hasQuiz(file: TFile)`.
- [ ] **Task 3.3: Integration with Review Modal**
  - Update `NoteReviewModal.ts`:
    - On open, check `QuizManager.hasQuiz(file)`.
    - If yes, load and display questions.
    - If no, generate via AI -> Save -> Display.
- [ ] **Task 3.4: Custom Quiz Prompt**
  - Add `quizPrompt` to `SRSettings` (textarea).
  - Update `AIManager` to use this setting if present.

## Phase 2.2: Practice Mode (Deck View)

- [ ] **Task 3.5: "Practice Deck" Command**
  - Add command: "Practice Flashcards for this Note".
  - Opens a new modal `PracticeModal.ts` (reusing `NoteReviewModal` UI logic but ignoring scheduling).
- [ ] **Task 3.6: Status Bar Integration**
  - Add a small "cards" icon or button in `NoteStatus` to launch Practice Mode directly.

## Phase 2.3: Advanced Tracking Control

- [ ] **Task 3.7: Settings for Exclusions**
  - Add `excludedPaths: string[]` to settings.
  - Add UI to manage this list (textarea, newline separated).
- [ ] **Task 3.8: Update Scheduler Logic**
  - Modify `NoteScheduler.trackNote` and `getDueNotes` to respect exclusions.
  - Add support for frontmatter `sr-ignore: true`.
