# Product Documentation: Note-Level Incremental Reading

## Overview

This feature transforms Obsidian from a static note repository into an active learning system. Instead of passively reading notes or forgetting them entirely, users are prompted to actively recall the key insights from their notes through AI-generated quizzes.

## Problem Statement

Users write many notes but often fail to review them effectively.

1.  **Passive Review:** Reading a note later is often ineffective for retention.
2.  **Forgotten Notes:** Without a reminder system, valuable insights are lost in the stack.
3.  **Lack of Engagement:** Reviewing is boring and easy to skip.

## Solution: Active Note Recall

An intelligent system that:

1.  **Tracks** newly created notes.
2.  **Schedules** reviews based on spaced repetition (FSRS).
3.  **Quizzes** the user on the content using AI-generated questions, rather than just showing the text.

## User Stories & Features

### 1. Note Tracking

- **As a user**, when I create a new note, I want the system to ask if I should be reminded to review it later.
- **As a user**, I can configure the system to automatically track all new notes in specific folders.
- **As a user**, I can manually trigger "Track this Note" on existing files.

### 2. Intelligent Scheduling (The "Remind Me" Logic)

- **Initial Review**: The user sets an initial review date (e.g., "Remind me in 3 days").
- **Spaced Repetition**: Subsequent reviews are scheduled based on performance.
  - **Success**: If the user answers quiz questions correctly, the interval increases (e.g., 3 days -> 10 days).
  - **Failure**: If the user struggles, the interval resets, and they are prompted to re-read the note immediately.

### 3. AI-Generated Quizzes

- **Mechanism**: On the scheduled review day, the AI analyzes the note content and generates 3-5 specific questions about the key concepts.
- **Format**: Flashcard style (Question on front, Answer on back) or Multiple Choice.
- **Goal**: Force active recall of the _entire_ note's core message.

### 4. The Review Workflow

1.  User opens their "Daily Review Queue" (a list of due notes).
2.  User selects a note.
3.  **Quiz Mode**: The note content is hidden. The user faces the AI questions.
4.  **Feedback**: The user rates their own answers (Easy, Good, Hard, Again).
5.  **Completion**:
    - **Pass**: Schedule next review further out.
    - **Fail**: Reveal the note content for immediate re-reading.

## Settings & Configuration

- **Auto-Track Guidelines**: Options to auto-track notes created in specific folders (e.g., "Learning", "Projects").
- **Default Interval**: Users can set the default "first review" delay (e.g., 1 day, 3 days, 1 week).
- **Strict Mode**: Ensure users cannot skip the quiz before seeing the note content.

## Future Enhancements

- **Integrate with Graph View**: Visually highlight notes due for review.
- **"Gist" Generation**: Ask one "Big Picture" question before diving into details.
