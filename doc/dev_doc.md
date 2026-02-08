# Developer Documentation: Incremental Note Review

## Architecture Overview

This document outlines the technical implementation for the Note-Level Incremental Reading feature. The goal is to integrate note tracking, AI question generation, and spaced repetition scheduling into the existing Obsidian plugin structure.

## Core Components

### 1. Data Model

- **Review Metadata**: Store scheduling information in the note's frontmatter (YAML).
  - `sr-due`: Date string (YYYY-MM-DD). Date the note is due for review.
  - `sr-interval`: Number (days). Current interval between reviews.
  - `sr-ease`: Number (float). FSRS ease factor.
- **Note Content Awareness**: Store a content hash to detect changes.
  - `sr-content-hash`: String. Hash of note content at last review.
  - If hash triggers mismatch on review day -> Prompt to regenerate quiz.

### 2. Note Tracking Logic (`src/tracking`)

- **Event Listener**: `plugin.app.workspace.on('file-open', ...)` or `vault.on('create', ...)` to detect new notes.
- **Heuristic**:
  - If `plugin.settings.autoTrack` is true: Add default metadata immediately.
  - Else: Show a quiet UI element (StatusBar item) "Track Note?"
- **Manual Trigger**: Command palette "Track this note".

### 3. AI Quiz Generation (`src/LLM`)

- **Prompt Engineering**: New system prompt for "Note Review".
  - Input: Entire note content.
  - Output: 3-5 high-level conceptual questions (JSON/XML format).
- **Generation Trigger**:
  - **Option A (Lazy)**: Generate when user opens the note for review. (Cons: Latency).
  - **Option B (Eager)**: Generate in background when note is scheduled/modified. Store questions in hidden block at end of file `%% ... %%`. (Pros: Instant review).
  - **Recommendation**: Option B for better UX.

### 4. Review Interface (`src/views`)

- **Modal/View**: specialised `NoteReviewView`.
- **Flow**:
  1.  **Hide Content**: CSS overlay or temporary empty render.
  2.  **Display Questions**: Render generated questions one by one.
  3.  **User Self-Grading**: Buttons (Again, Hard, Good, Easy) - mapped to FSRS.
  4.  **Result**:
      - **Pass**: Update `sr-due`, `sr-interval`. Close view.
      - **Fail**: Reveal note content. Schedule `sr-due` = Tomorrow.

### 5. Scheduling Algorithm (`src/fsrs`)

- **Reuse Existing Logic**: The plugin already has `fsrs` implementation.
- **Adaptation**: Treat the _Note_ as a single "Card".
  - Input: Current interval, Ease, Grade.
  - Output: New interval, New Ease.

## Implementation Steps

1.  **Metadata Management**:
    - Create `NoteScheduler` class to handle reading/writing frontmatter.
    - Implement `hashContent(content: string)` utility.

2.  **UI Integration**:
    - Add "Track Note" ribbon icon/command.
    - Add "Review Queue" view (list of notes with `sr-due <= Today`).

3.  **AI Integration**:
    - Extend `AIManager` with `generateNoteQuiz(content: string)`.
    - Define prompt for "General Comprehension" questions.

4.  **The Review Loop**:
    - Create `NoteReviewModal`.
    - Connect "Grade" buttons to `DeckManager` (or similar scheduler).

## Considerations

- **Performance**: Don't block the main thread when hashing large notes.
- **Cost**: Generating quizzes for every note can be expensive (OpenAI tokens). Make this opt-in or use cheaper models (GPT-4o-mini).
- **Privacy**: Ensure users know note content is sent to AI.

If you have doubt refer there offical doc here https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin
