# Task Checklist: Note-Level Incremental Reading

## Phase 1: Core Note Tracking & Metadata (Foundation)

- [ ] **Task 1: NoteScheduler Class**
  - Create `src/note/NoteScheduler.ts`.
  - Implement methods to read/write custom frontmatter (`sr-due`, `sr-interval`, `sr-ease`).
  - _Goal_: Ability to programmatically tag a note with a review date.
- [ ] **Task 2: "Track This Note" Command**
  - Register a command in `main.ts` that initializes tracking for the active file.
  - Set default values (Due: Tomorrow, Interval: 1, Ease: 2.5).
  - _Goal_: User can manually add a note to the review queue.
- [ ] **Task 3: Visual Indicator**
  - Add a StatusBar item that shows "Review Status: [Due Date]" for the active file.
  - _Goal_: User sees if the current note is tracked.

## Phase 2: Review Queue & Interface (UI)

- [ ] **Task 4: Get Due Notes**
  - Implement `getDueNotes()` in `NoteScheduler` to scan vault for notes with `sr-due <= Today`.
- [ ] **Task 5: Review Queue View**
  - Create a new View (or subview in `MainView`) to list all due notes.
  - _Goal_: User can see a list of what needs reviewing.
- [ ] **Task 6: Basic Review Modal**
  - Create `NoteReviewModal.ts`.
  - Functionality: Show the note title, hide content initially.
  - Add "Reveal" button to show content.
  - Add Grading buttons (Again, Hard, Good, Easy).
  - _Goal_: A dedicated interface to perform the review.

## Phase 3: AI Quiz Generation (Intelligence)

- [ ] **Task 7: AI "Quiz" Prompt**
  - Add a new prompt constant in `src/constants.ts` (or `src/LLM/prompts.ts`) designed to generate 3 conceptual questions from note content.
- [ ] **Task 8: AIManager Extension**
  - Add `generateNoteQuiz(content: string)` method to `AIManager.ts`.
  - _Goal_: Fetch questions from OpenAI.
- [ ] **Task 9: Integrate Quiz into Review Modal**
  - Update `NoteReviewModal` to:
    1. Fetch quiz questions when opened.
    2. Display questions _instead_ of hidden content.
    3. Reveal content on "Show Answer" / "Fail".

## Phase 4: Scheduling Logic (Algorithm)

- [ ] **Task 10: FSRS Integration**
  - Connect the Grading buttons in `NoteReviewModal` to `fsrs` logic.
  - Calculate new `sr-due`, `sr-interval`, `sr-ease` based on user grade.
  - Update the note's frontmatter with new values.
  - _Goal_: The note disappears from the queue and reappears on the correct future date.

## Phase 5: Polish & Automation

- [ ] **Task 11: Auto-Track Settings**
  - Add "Auto-track new notes" toggle in Settings.
  - Add "Excluded Folders" setting.
- [ ] **Task 12: Content Hashing (Optional but recommended)**
  - Implement simplistic content hashing to detect if a note changed significantly since the last review.
