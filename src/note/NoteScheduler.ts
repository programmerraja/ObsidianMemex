import { TFile, App, Notice, getAllTags } from 'obsidian';
import { FSRS, Card, Rating, State, createEmptyCard, Entry, EntryType, Grade } from '@/fsrs';
import { DEFAULT_FSRS_WEIGHTS } from '@/constants';
import SRPlugin from '@/main';
import moment from 'moment';

interface NoteReviewData {
    due: string;
    interval: number;
    difficulty: number;
    state: string;
    ease?: number;
}

export class NoteScheduler {
    app: App;
    plugin: SRPlugin;
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
        if (excludedPaths.some(p => file.path.startsWith(p))) {
            return true;
        }

        const cache = this.app.metadataCache.getFileCache(file);
        if (cache?.frontmatter?.['sr-ignore'] === true) {
            return true;
        }

        return false;
    }

    private hasReviewTag(file: TFile): boolean {
        const cache = this.app.metadataCache.getFileCache(file);
        if (!cache) return false;

        const tags = getAllTags(cache) || [];
        const reviewTags = this.plugin.settings.reviewTags;

        return tags.some(tag => reviewTags.includes(tag) || reviewTags.some(rt => tag.startsWith(rt + '/')));
    }

    getNewNotes(): TFile[] {
        const allFiles = this.app.vault.getMarkdownFiles();
        return allFiles.filter(file => {
            if (this.isIgnored(file)) return false;
            if (this.isTracked(file)) return false;
            return this.hasReviewTag(file);
        });
    }

    getScheduledNotes(): TFile[] {
        const allFiles = this.app.vault.getMarkdownFiles();
        return allFiles.filter(file => {
            if (this.isIgnored(file)) return false;
            return this.isTracked(file); // No tag required if already tracked
        });
    }

    getDueNotes(): TFile[] {
        const today = moment().startOf('day');
        const scheduled = this.getScheduledNotes();

        return scheduled.filter(file => {
            const cache = this.app.metadataCache.getFileCache(file);
            const dueStr = cache?.frontmatter?.['sr-due'];
            if (!dueStr) return false;

            // Try to parse with common formats to be robust
            const due = moment(dueStr, ['YYYY-MM-DD', 'DD/MM/YYYY', 'DD-MM-YYYY', 'YYYY/MM/DD'], true);
            return due.isValid() && due.isSameOrBefore(today, 'day');
        });
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

        const algorithm = this.plugin.settings.schedulingAlgorithm;
        if (algorithm === 'fsrs') {
            const now = new Date();
            const entry = this.getDummyEntry(file);
            const card = createEmptyCard(entry, now);

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            card.due = tomorrow;
            card.scheduled_days = 1;

            await this.saveCardToNote(file, card);
        } else {
            // SM-2 Initial State
            await this.app.fileManager.processFrontMatter(file, (fm) => {
                fm['sr-due'] = moment().format('YYYY-MM-DD');
                fm['sr-interval'] = 0;
                fm['sr-ease'] = 250;
            });
        }

        new Notice(`Tracking enabled for ${file.basename}.`);
    }

    getReviewData(file: TFile): NoteReviewData | null {
        const cache = this.app.metadataCache.getFileCache(file);
        const f = cache?.frontmatter;
        if (!f?.['sr-due']) return null;

        return {
            due: f['sr-due'],
            interval: f['sr-interval'] || 0,
            difficulty: f['sr-difficulty'] || 0,
            state: f['sr-state'] !== undefined ? State[f['sr-state']] : 'Unknown',
            ease: f['sr-ease']
        };
    }

    async reviewNote(file: TFile, grade: number): Promise<void> {
        const algorithm = this.plugin.settings.schedulingAlgorithm;

        if (algorithm === 'fsrs') {
            await this.reviewNoteFSRS(file, grade);
        } else {
            await this.reviewNoteSM2(file, grade);
        }

        // Grant XP for gamification
        const xpMap: Record<number, number> = { 3: 15, 2: 10, 1: 5 };
        const xpGained = xpMap[grade] || 0;
        this.plugin.settings.totalXP += xpGained;
        
        await this.updateStreak();

        if (this.plugin.settings.autoNext) {
            this.openNextDueNote();
        } else {
            new Notice(`Gained ${xpGained} XP! Total: ${this.plugin.settings.totalXP} XP`);
        }
    }

    private async reviewNoteFSRS(file: TFile, grade: number): Promise<void> {
        const rating = grade as Grade;
        const card = this.loadCardFromNote(file);
        if (!card) return;

        const now = new Date();
        const schedulingCards = this.fsrs.repeat(card, now);
        const newCard = schedulingCards[rating].card;

        await this.saveCardToNote(file, newCard);
        new Notice(`Reviewed (FSRS): Next due in ${newCard.scheduled_days} days`);
    }

    private async reviewNoteSM2(file: TFile, grade: number): Promise<void> {
        // Grade: 1=Hard, 2=Good, 3=Easy
        await this.app.fileManager.processFrontMatter(file, (fm) => {
            let ease = fm['sr-ease'] || 250;
            let interval = fm['sr-interval'] || 0;

            if (grade === 3) { // Easy
                ease += 20;
                interval = interval === 0 ? 4 : Math.ceil(interval * 3);
            } else if (grade === 2) { // Good
                // Ease stays stable
                interval = interval === 0 ? 1 : Math.ceil(interval * 2);
            } else { // Hard
                ease = Math.max(130, ease - 20);
                interval = 1; // Reset to 1 day
            }

            fm['sr-ease'] = ease;
            fm['sr-interval'] = interval;
            fm['sr-due'] = moment().add(interval, 'days').format('YYYY-MM-DD');
        });

        const cache = this.app.metadataCache.getFileCache(file);
        const newDue = cache?.frontmatter?.['sr-due'];
        new Notice(`Reviewed (SM-2): Next due on ${newDue}`);
    }

    private openNextDueNote() {
        const dueNotes = this.getDueNotes();
        const newNotes = this.getNewNotes();

        let nextFile: TFile | undefined;

        if (dueNotes.length > 0) {
            nextFile = dueNotes[0];
        } else if (newNotes.length > 0) {
            nextFile = newNotes[0];
        }

        if (nextFile) {
            this.app.workspace.getLeaf(false).openFile(nextFile);
        } else {
            new Notice("No more notes due for review! All caught up. 🎉");
        }
    }

    private async updateStreak(): Promise<void> {
        const today = moment().format('YYYY-MM-DD');
        const lastReview = this.plugin.settings.lastReviewDate;

        if (lastReview === today) return;

        const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');

        if (lastReview === yesterday) {
            this.plugin.settings.reviewStreak += 1;
        } else {
            this.plugin.settings.reviewStreak = 1;
        }

        this.plugin.settings.lastReviewDate = today;
        await this.plugin.saveSettings();
    }

    private loadCardFromNote(file: TFile): Card | null {
        const cache = this.app.metadataCache.getFileCache(file);
        const f = cache?.frontmatter;
        if (!f?.['sr-due']) return null;

        const entry = this.getDummyEntry(file);
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
            frontmatter['sr-interval'] = card.scheduled_days;
        });
    }
}
