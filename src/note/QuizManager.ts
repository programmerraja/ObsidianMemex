import { App, TFile, Notice } from 'obsidian';
import { NoteQuizItem } from '@/constants';

export class QuizManager {
    app: App;
    private quizFolder = '.obsidian/plugins/obsidian-memex/quiz-data';

    constructor(app: App) {
        this.app = app;
        this.ensureQuizFolder();
    }

    private async ensureQuizFolder() {
        if (!(await this.app.vault.adapter.exists(this.quizFolder))) {
            await this.app.vault.createFolder(this.quizFolder);
        }
    }

    async saveQuiz(file: TFile, quiz: NoteQuizItem[]): Promise<void> {
        const quizId = this.getQuizId(file);

        // If file doesn't have an ID, generate one and update frontmatter
        let finalQuizId = quizId;

        if (!finalQuizId) {
            finalQuizId = window.crypto.randomUUID();
            await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
                frontmatter['sr-quiz-id'] = finalQuizId;
            });
        }

        const quizPath = `${this.quizFolder}/${finalQuizId}.json`;
        await this.app.vault.adapter.write(quizPath, JSON.stringify(quiz, null, 2));
    }

    async loadQuiz(file: TFile): Promise<NoteQuizItem[] | null> {
        const quizId = this.getQuizId(file);
        if (!quizId) return null;

        const quizPath = `${this.quizFolder}/${quizId}.json`;
        if (await this.app.vault.adapter.exists(quizPath)) {
            const content = await this.app.vault.adapter.read(quizPath);
            try {
                return JSON.parse(content);
            } catch (e) {
                console.error('Failed to parse quiz JSON', e);
                return null;
            }
        }
        return null;
    }

    async hasQuiz(file: TFile): Promise<boolean> {
        const quizId = this.getQuizId(file);
        if (!quizId) return false;

        const quizPath = `${this.quizFolder}/${quizId}.json`;
        return this.app.vault.adapter.exists(quizPath);
    }

    private getQuizId(file: TFile): string | undefined {
        const cache = this.app.metadataCache.getFileCache(file);
        return cache?.frontmatter?.['sr-quiz-id'];
    }
}
