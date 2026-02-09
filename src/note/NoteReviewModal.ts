import { App, Modal, TFile, Setting, Notice } from 'obsidian';
import SRPlugin from '@/main';

export class NoteReviewModal extends Modal {
    plugin: SRPlugin;
    file: TFile;
    isPractice: boolean;
    onCloseCallback?: () => void;

    constructor(app: App, plugin: SRPlugin, file: TFile, onCloseCallback?: () => void, isPractice: boolean = false) {
        super(app);
        this.plugin = plugin;
        this.file = file;
        this.onCloseCallback = onCloseCallback;
        this.isPractice = isPractice;
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.addClass('note-review-modal');
        const title = this.isPractice ? `Practice: ${this.file.basename}` : `Review: ${this.file.basename}`;
        contentEl.createEl('h2', { text: title });

        // Content Area
        const contentContainer = contentEl.createDiv({ cls: 'note-review-content' });
        contentContainer.style.minHeight = '800px';
        contentContainer.style.padding = '20px';
        contentContainer.style.marginBottom = '20px';
        contentContainer.style.border = '1px solid var(--background-modifier-border)';
        contentContainer.style.borderRadius = '8px';
        contentContainer.style.overflowY = 'auto';
        contentContainer.style.maxHeight = '800px';

        contentContainer.createEl('p', {
            text: 'Generating quiz... 🤖',
            cls: 'theme-text-faint',
            attr: { style: 'text-align: center; margin-top: 50px;' }
        });

        // Actions
        const actionsContainer = contentEl.createDiv({ cls: 'note-review-actions' });
        actionsContainer.style.display = 'flex';
        actionsContainer.style.justifyContent = 'center';
        actionsContainer.style.marginBottom = '20px';

        const showButton = actionsContainer.createEl('button', { text: 'Show Note Content' });
        showButton.onclick = () => this.showNoteContent(contentContainer, showButton);

        // Grading Buttons
        const gradingContainer = contentEl.createDiv({ cls: 'note-review-grading' });
        gradingContainer.style.display = 'flex';
        gradingContainer.style.justifyContent = 'center';
        gradingContainer.style.gap = '10px';

        // Button Logic: 1=Again (Fail), 3=Good (Pass), 4=Easy (Pass+)
        const buttons = [
            { label: 'Again', grade: 1, color: 'var(--text-error)' },
            { label: 'Hard', grade: 2, color: 'var(--text-warning)' },
            { label: 'Good', grade: 3, color: 'var(--text-success)' },
            { label: 'Easy', grade: 4, color: 'var(--text-accent)' }
        ];

        buttons.forEach(btnConfig => {
            const btn = gradingContainer.createEl('button', { text: btnConfig.label });
            btn.style.color = btnConfig.color;
            btn.onclick = () => this.handleGrade(btnConfig.grade);
        });

        // Async fetch quiz
        let questions = await this.plugin.quizManager.loadQuiz(this.file);

        if (!questions || questions.length === 0) {
            const fileContent = await this.app.vault.read(this.file);
            questions = await this.plugin.aiManager.generateNoteQuiz(fileContent);
            if (questions && questions.length > 0) {
                await this.plugin.quizManager.saveQuiz(this.file, questions);
            }
        }

        if (contentContainer.innerText.includes('Generating')) {
            contentContainer.empty();
            if (questions && questions.length > 0) {
                questions.forEach((q: any, idx: number) => {
                    const qEl = contentContainer.createDiv({ cls: 'quiz-item' });
                    qEl.style.marginBottom = '15px';
                    qEl.createEl('h3', { text: `Q${idx + 1}: ${q.question}`, cls: 'theme-text-strong' });

                    const aDetails = qEl.createEl('details');
                    aDetails.createEl('summary', { text: 'Show Answer', cls: 'cursor-pointer theme-text-accent' });
                    aDetails.createEl('p', { text: q.answer, cls: 'mt-2 pl-4 border-l-2 theme-border-accent' });
                });
            } else {
                contentContainer.createEl('p', {
                    text: 'Could not generate quiz. Try recalling the key concepts yourself!',
                    cls: 'theme-text-warning',
                    attr: { style: 'text-align: center;' }
                });
            }
        }
    }

    async showNoteContent(container: HTMLElement, button: HTMLElement) {
        button.hide();
        const content = await this.app.vault.read(this.file);
        container.empty();

        // Allow scrolling
        container.style.overflowY = 'auto';
        container.style.maxHeight = '400px';

        // Creating a simple preservation of whitespace for now
        // In future: Render Markdown properly using MarkdownRenderer
        const pre = container.createEl('div');
        pre.style.whiteSpace = 'pre-wrap';
        pre.setText(content);
    }

    async handleGrade(grade: number) {
        if (!this.isPractice) {
            await this.plugin.noteScheduler.reviewNote(this.file, grade);
        } else {
            new Notice('Practice complete! No changes to schedule.');
        }
        this.close();
        if (this.onCloseCallback) this.onCloseCallback();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
