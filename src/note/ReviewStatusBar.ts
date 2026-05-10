import { App, Notice } from 'obsidian';
import SRPlugin from '@/main';

export class ReviewStatusBar {
    private statusBarItem: any;
    private plugin: SRPlugin;

    constructor(statusBarItem: any, plugin: SRPlugin) {
        this.statusBarItem = statusBarItem;
        this.plugin = plugin;
        this.statusBarItem.addEventListener('click', () => {
            const dueNotes = this.plugin.noteScheduler.getDueNotes();
            const newNotes = this.plugin.noteScheduler.getNewNotes();
            
            if (dueNotes.length > 0) {
                this.plugin.app.workspace.getLeaf(false).openFile(dueNotes[0]);
            } else if (newNotes.length > 0) {
                this.plugin.app.workspace.getLeaf(false).openFile(newNotes[0]);
            } else {
                new Notice("No notes due for review! 🎉");
            }
        });
    }

    update() {
        const dueCount = this.plugin.noteScheduler.getDueNotes().length;
        this.statusBarItem.textContent = `Review: ${dueCount} due`;
        this.statusBarItem.setAttribute('title', `${dueCount} notes due for review today`);
    }
}
