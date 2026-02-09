import { TFile, App, Notice } from 'obsidian';
import { FSRS, Card, Rating, State, createEmptyCard, Entry, EntryType, Grade } from '@/fsrs';
import { DEFAULT_FSRS_WEIGHTS } from '@/constants';
import SRPlugin from '@/main';

interface NoteReviewData {
    due: string;
    interval: number;
    difficulty: number;
    state: string;
}

export class NoteScheduler {
    app: App;
    plugin: SRPlugin; // Need plugin to access settings
    fsrs: FSRS;

    constructor(app: App, plugin: SRPlugin) {
        this.app = app;
        this.plugin = plugin;
        this.fsrs = new FSRS({
            w: DEFAULT_FSRS_WEIGHTS,
        });
    }

    private getDummyEntry(file: TFile): Entry {
        return {
            front: file.basename,
            back: '',
            path: file.path,
            entryType: EntryType.Inline
        };
    }

    isTracked(file: TFile): boolean {
        const cache = this.app.metadataCache.getFileCache(file);
        return !!cache?.frontmatter?.['sr-due'];
    }

    private isIgnored(file: TFile): boolean {
        const excludedPaths = this.plugin.settings.excludedPaths;
        // Check folder/file path exclusion
        if (excludedPaths.some(p => file.path.startsWith(p))) {
            return true;
        }

        // Check frontmatter exclusion
        const cache = this.app.metadataCache.getFileCache(file);
        if (cache?.frontmatter?.['sr-ignore'] === true) {
            return true;
        }

        return false;
    }

    async trackNote(file: TFile): Promise<void> {
        if (this.isTracked(file)) {
            new Notice('This note is already being tracked!');
            return;
        }

        if (this.isIgnored(file)) {
            new Notice('This note is ignored via settings or frontmatter.');
            return;
        }

        const now = new Date();
        const entry = this.getDummyEntry(file);
        const card = createEmptyCard(entry, now);

        // Schedule first review for TOMORROW
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        card.due = tomorrow;
        card.scheduled_days = 1;

        await this.saveCardToNote(file, card);
        new Notice(`Tracking enabled for ${file.basename}. First review due: ${card.due.toISOString().split('T')[0]}`);
    }

    getReviewData(file: TFile): NoteReviewData | null {
        const cache = this.app.metadataCache.getFileCache(file);
        const f = cache?.frontmatter;
        if (!f?.['sr-due']) return null;

        return {
            due: f['sr-due'],
            interval: f['sr-interval'] || 0,
            difficulty: f['sr-difficulty'] || 0,
            state: f['sr-state'] !== undefined ? State[f['sr-state']] : 'Unknown'
        };
    }

    getDueNotes(): TFile[] {
        const today = new Date().toISOString().split('T')[0];
        const allFiles = this.app.vault.getMarkdownFiles();

        return allFiles.filter(file => {
            if (this.isIgnored(file)) return false;

            const cache = this.app.metadataCache.getFileCache(file);
            const due = cache?.frontmatter?.['sr-due'];
            return due && due <= today;
        });
    }

    async reviewNote(file: TFile, grade: number): Promise<void> {
        // Grade: 1=Again, 2=Hard, 3=Good, 4=Easy
        const rating = grade as Grade;

        const card = this.loadCardFromNote(file);
        if (!card) {
            console.error("Cannot review untracked note");
            return;
        }

        const now = new Date();
        const schedulingCards = this.fsrs.repeat(card, now);

        const recordLog = schedulingCards[rating];
        const newCard = recordLog.card;

        await this.saveCardToNote(file, newCard);

        // Update Streak
        await this.updateStreak();

        new Notice(`Reviewed: Next due in ${newCard.scheduled_days} days`);
    }

    private async updateStreak(): Promise<void> {
        const today = new Date().toISOString().split('T')[0];
        const lastReview = this.plugin.settings.lastReviewDate;

        if (lastReview === today) {
            return; // Already reviewed today
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toISOString().split('T')[0];

        if (lastReview === yesterdayString) {
            this.plugin.settings.reviewStreak += 1;
        } else {
            this.plugin.settings.reviewStreak = 1; // Reset or start new
        }

        this.plugin.settings.lastReviewDate = today;
        await this.plugin.saveSettings();
    }

    private loadCardFromNote(file: TFile): Card | null {
        const cache = this.app.metadataCache.getFileCache(file);
        const f = cache?.frontmatter;
        if (!f?.['sr-due']) return null;

        const entry = this.getDummyEntry(file);

        // Handle due date parsing (string to Date)
        const dueDate = new Date(f['sr-due']);

        return {
            ...entry,
            due: dueDate,
            state: f['sr-state'] ?? State.New,
            stability: f['sr-stability'] ?? 0,
            difficulty: f['sr-difficulty'] ?? 0,
            elapsed_days: f['sr-elapsed-days'] ?? 0,
            scheduled_days: f['sr-scheduled-days'] ?? 0,
            reps: f['sr-reps'] ?? 0,
            lapses: f['sr-lapses'] ?? 0,
            last_review: f['sr-last-review'] ? new Date(f['sr-last-review']) : undefined,
        } as Card;
    }

    private async saveCardToNote(file: TFile, card: Card): Promise<void> {
        await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
            frontmatter['sr-due'] = card.due.toISOString().split('T')[0];
            frontmatter['sr-state'] = card.state;
            frontmatter['sr-stability'] = Number(card.stability.toFixed(4));
            frontmatter['sr-difficulty'] = Number(card.difficulty.toFixed(4));
            frontmatter['sr-elapsed-days'] = card.elapsed_days;
            frontmatter['sr-scheduled-days'] = card.scheduled_days;
            frontmatter['sr-reps'] = card.reps;
            frontmatter['sr-lapses'] = card.lapses;
            frontmatter['sr-last-review'] = card.last_review ? card.last_review.toISOString() : '';

            // For UI display / compat
            frontmatter['sr-interval'] = card.scheduled_days;
        });
    }
}
