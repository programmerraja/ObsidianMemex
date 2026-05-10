import { TFile } from 'obsidian';
import { NoteScheduler } from './NoteScheduler';
import SRPlugin from '@/main';

export class NoteStatus {
    plugin: SRPlugin;
    noteScheduler: NoteScheduler;
    statusBarItem: HTMLElement;

    constructor(plugin: SRPlugin, noteScheduler: NoteScheduler) {
        this.plugin = plugin;
        this.noteScheduler = noteScheduler;
        this.statusBarItem = this.plugin.addStatusBarItem();
        this.update(this.plugin.app.workspace.getActiveFile());
    }

    update(file: TFile | null) {
        if (!file || file.extension !== 'md') {
            this.statusBarItem.textContent = '';
            this.statusBarItem.style.display = 'none';
            return;
        }

        this.statusBarItem.style.display = 'inline-block';
        const reviewData = this.noteScheduler.getReviewData(file);
        const dueNotes = this.noteScheduler.getDueNotes();
        const isDue = dueNotes.includes(file);

        if (reviewData) {
            const statusText = isDue ? `🔥 Ready for Review` : `🧠 Next: ${reviewData.due}`;
            this.statusBarItem.textContent = statusText;
            this.statusBarItem.setAttribute('title', `Interval: ${reviewData.interval} days | Ease: ${reviewData.ease}% | Gaining XP: 15max`);
            this.statusBarItem.className = 'status-bar-item mod-clickable';
            if (isDue) this.statusBarItem.style.color = 'var(--text-accent)';
            else this.statusBarItem.style.color = '';
            
            this.statusBarItem.onclick = () => {
                this.noteScheduler.reviewNote(file, 2); // Quick "Good" review on click? 
                // Or better, open the modal:
                this.plugin.toggleView('sr-main-view' as any, 'sr-main-review-view' as any);
            };
        } else {
            this.statusBarItem.textContent = '➕ Track for Review';
            this.statusBarItem.setAttribute('title', 'Add this note to your spaced repetition queue');
            this.statusBarItem.className = 'status-bar-item mod-clickable';
            this.statusBarItem.style.color = 'var(--text-muted)';
            this.statusBarItem.onclick = () => {
                this.noteScheduler.trackNote(file);
                this.update(file); 
            };
        }
    }
}
