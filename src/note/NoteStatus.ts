import { Plugin, TFile } from 'obsidian';
import { NoteScheduler } from './NoteScheduler';

export class NoteStatus {
    plugin: Plugin;
    noteScheduler: NoteScheduler;
    statusBarItem: HTMLElement;

    constructor(plugin: Plugin, noteScheduler: NoteScheduler) {
        this.plugin = plugin;
        this.noteScheduler = noteScheduler;
        this.statusBarItem = this.plugin.addStatusBarItem();
        this.update(this.plugin.app.workspace.getActiveFile());
    }

    update(file: TFile | null) {
        if (!file) {
            this.statusBarItem.setText('');
            return;
        }

        const reviewData = this.noteScheduler.getReviewData(file);
        if (reviewData) {
            this.statusBarItem.setText(`🧠 Review Due: ${reviewData.due}`);
            this.statusBarItem.setAttr('title', `Interval: ${reviewData.interval} days, Difficulty: ${reviewData.difficulty}`);
            this.statusBarItem.addClass('mod-clickable');
            this.statusBarItem.onclick = () => {
                // Future: Open review view
            };
        } else {
            this.statusBarItem.setText('⚪ Not Tracked');
            this.statusBarItem.setAttr('title', 'Click to track this note');
            this.statusBarItem.addClass('mod-clickable');
            this.statusBarItem.onclick = () => {
                this.noteScheduler.trackNote(file);
                this.update(file); 
            };
        }
    }
}
