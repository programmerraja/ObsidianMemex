import { Plugin, WorkspaceLeaf, Notice, TFile } from 'obsidian';
import { ViewType, SubviewType, DEFAULT_SETTINGS } from '@/constants';
import MainView from '@/views/MainView';
import { SRSettingTab } from '@/components/SettingsPage';
import { SRSettings } from '@/settings';
import '@/tailwind.css';
import EncryptionService from '@/utils/encryptionService';
import MemoryManager from './memory/memoryManager';
import { DeckManager } from './fsrs/Deck';
import AIManager from './LLM/AIManager';
import { errorMessage } from './utils/errorMessage';
import { NoteScheduler } from './note/NoteScheduler';
import { NoteStatus } from './note/NoteStatus';
import { QuizManager } from './note/QuizManager';
import { NoteReviewModal } from './note/NoteReviewModal';

export default class SRPlugin extends Plugin {
	settings: SRSettings;
	memoryManager: MemoryManager;
	deckManager: DeckManager;
	aiManager: AIManager;
	subviewType: SubviewType;
	noteScheduler: NoteScheduler;
	noteStatus: NoteStatus;
	quizManager: QuizManager;

	async onload(): Promise<void> {

		await this.loadSettings();

		this.subviewType = SubviewType.REVIEW; // Update this to change default view
		this.memoryManager = new MemoryManager(this.app.vault)
		this.deckManager = new DeckManager(this.memoryManager, this.app.vault, this.settings)
		this.noteScheduler = new NoteScheduler(this.app, this);
		this.quizManager = new QuizManager(this.app);
		this.noteStatus = new NoteStatus(this, this.noteScheduler);

		this.registerEvent(
			this.app.workspace.on('file-open', (file) => {
				this.noteStatus.update(file);
			})
		);

		this.registerEvent(
			this.app.metadataCache.on('changed', (file) => {
				if (file === this.app.workspace.getActiveFile()) {
					this.noteStatus.update(file);
				}
			})
		);



		// Check for due notes on startup
		this.app.workspace.onLayoutReady(() => {
			this.registerEvent(
				this.app.vault.on('create', (file) => {
					if (this.settings.autoTrackNotes && file instanceof TFile && file.extension === 'md') {
						this.noteScheduler.trackNote(file);
					}
				})
			);
			const dueNotes = this.noteScheduler.getDueNotes();
			if (dueNotes.length > 0) {
				new Notice(`You have ${dueNotes.length} notes due for review today!`);
			}
		});


		const key = this.settings.openAIApiKey;
		const decryptedKey = EncryptionService.getDecryptedKey(key);
		// Update settings object to have the decrypted key in memory for AIManager to use
		const runtimeSettings = { ...this.settings, openAIApiKey: decryptedKey };
		this.aiManager = AIManager.getInstance(runtimeSettings);

		this.addSettingTab(new SRSettingTab(this.app, this));

		this.addCommand({
			id: "chat-toggle-window",
			name: "Chat with your notes",
			callback: () => {
				this.toggleView(ViewType.MAIN, SubviewType.CHAT);
			},
		});

		this.addCommand({
			id: "review-toggle-window",
			name: "Review your flashcards",
			callback: () => {
				this.toggleView(ViewType.MAIN, SubviewType.REVIEW);
			}
		});

		this.addCommand({
			id: 'track-note',
			name: 'Enable Incremental Review for this Note',
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (file) {
					if (!checking) {
						this.noteScheduler.trackNote(file);
					}
					return true;
				}
				return false;
			}
		});

		this.addCommand({
			id: 'practice-flashcards',
			name: 'Practice Flashcards for this Note (No Scheduling)',
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (file) {
					if (!checking) {
						new NoteReviewModal(this.app, this, file, undefined, true).open();
					}
					return true;
				}
				return false;
			}
		});

		this.registerView(
			ViewType.MAIN,
			(leaf: WorkspaceLeaf) => new MainView(leaf, this),
		);

		// This creates an icon in the left ribbon.
		this.addRibbonIcon('documents', 'Review your flashcards and notes', (evt: MouseEvent) => {
			this.toggleView(ViewType.MAIN, this.subviewType);
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		// this.addSettingTab(new SRSettingTab(this.app, this));

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(changed: {
		apiKey?: boolean,
		defaultModel?: boolean
	} = {}): Promise<void> {
		try {
			if (changed) {
				// Decrypt key for immediate usage update
				const key = EncryptionService.getDecryptedKey(this.settings.openAIApiKey);
				const runtimeSettings = { ...this.settings, openAIApiKey: key };
				console.log(runtimeSettings, "runtimeSettings")

				// Update AIManager with new settings
				this.aiManager.updateSettings(runtimeSettings);

				if (changed.apiKey) {
					new Notice("API Key updated for session.");
					// Encryption happens before save in older logic, 
					// but here we just ensure we save what is in this.settings (which should be encrypted if UI handles it)
					// The UI sets this.settings.openAIApiKey directly. 
					// If we utilize EncryptionService, we should ensure it encrypts before save.
					// Assuming EncryptionService.encryptAllKeys handles this.settings in place or returns new.

					this.settings = EncryptionService.encryptAllKeys(this.settings);
				}
			}
			await this.saveData(this.settings);
		} catch (e) {
			errorMessage(e);
		}
	}

	toggleView(viewType: ViewType, subviewType: SubviewType) {
		const leaves = this.app.workspace.getLeavesOfType(viewType);
		if (leaves.length > 0) {
			if (this.subviewType !== subviewType) {
				this.subviewType = subviewType;
				this.activateView(viewType);
			}
		} else {
			this.subviewType = subviewType;
			this.activateView(viewType);
		}
	}

	async activateView(viewType: ViewType) {
		const leaves = this.app.workspace.getLeavesOfType(viewType);
		if (leaves.length === 0) {
			await this.app.workspace
				.getLeaf(false)
				.setViewState({
					type: viewType,
					active: true,
				});
			this.app.workspace.revealLeaf(
				this.app.workspace.getLeavesOfType(viewType)[0],
			);
		}
	}

	async deactivateView(viewType: ViewType) {
		// Let Obsidian handle view lifecycle
	}


}
