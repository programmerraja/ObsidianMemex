import { App, PluginSettingTab, Setting } from "obsidian";
import SRPlugin from "@/main";
import { ChatModels, MODEL_TO_DISPLAY_NAME } from "@/constants";

export class SRSettingTab extends PluginSettingTab {
  plugin: SRPlugin;

  constructor(app: App, plugin: SRPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Separator for inline flashcards')
      .setDesc(`We'll detect and generate cards with this separator, when both the front and back are single lines. Note that you will need to edit your existing cards upon changing this separator`)
      .addText(text => text
        .setValue(this.plugin.settings.inlineSeparator)
        .onChange(async (value) => {
          this.plugin.settings.inlineSeparator = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Separator for multiline flashcards')
      .setDesc(`We'll detect and generate cards with this separator, when either the front or back are multiline. Note that you will need to edit your existing cards upon changing this separator`)
      .addText(text => text
        .setValue(this.plugin.settings.multilineSeparator)
        .onChange(async (value) => {
          this.plugin.settings.multilineSeparator = value;
          await this.plugin.saveSettings();
        })
      );



    new Setting(containerEl)
      .setName('Include current file by default')
      .setDesc('While chatting with your notes, include the last active file as context by default')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.includeCurrentFile)
        .onChange((value) => {
          this.plugin.settings.includeCurrentFile = value;
          this.plugin.saveSettings();
        })
      )

    new Setting(containerEl)
      .setName('Auto-track new notes')
      .setDesc('Automatically enable spaced repetition tracking for newly created notes.')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoTrackNotes)
        .onChange(async (value) => {
          this.plugin.settings.autoTrackNotes = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Excluded Paths')
      .setDesc('Paths or folders to ignore (one per line).')
      .addTextArea(text => text
        .setValue(this.plugin.settings.excludedPaths.join('\n'))
        .setPlaceholder('Templates/\nArchive/\nSecret.md')
        .onChange(async (value) => {
          this.plugin.settings.excludedPaths = value.split('\n').map(p => p.trim()).filter(p => p.length > 0);
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Included Paths (Whitelist)')
      .setDesc('Only track notes in these paths. Leave empty to track all (except excluded).')
      .addTextArea(text => text
        .setValue(this.plugin.settings.includedPaths.join('\n'))
        .setPlaceholder('School/Biology/\nImportant/')
        .onChange(async (value) => {
          this.plugin.settings.includedPaths = value.split('\n').map(p => p.trim()).filter(p => p.length > 0);
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('AI Provider')
      .setDesc('Select which AI provider to use.')
      .addDropdown(dropdown => dropdown
        .addOption('openai', 'OpenAI')
        .addOption('anthropic', 'Anthropic')
        .addOption('gemini', 'Google Gemini')
        .addOption('ollama', 'Ollama (Local)')
        .addOption('custom', 'Custom OpenAI-Compatible')
        .setValue(this.plugin.settings.aiProvider)
        .onChange(async (value: any) => {
          this.plugin.settings.aiProvider = value;
          await this.plugin.saveSettings();
          this.display(); // Refresh to show/hide relevant fields
        })
      );

    new Setting(containerEl)
      .setName('API Key')
      .setDesc('API Key for the selected provider.')
      .addText(text => text
        .setPlaceholder('sk-...')
        .setValue(this.plugin.settings.openAIApiKey ? '•'.repeat(16) : '')
        .onChange(async (value) => {
          this.plugin.settings.openAIApiKey = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Model Name')
      .setDesc('e.g., gpt-4o, claude-3-5-sonnet-20240620, llama3')
      .addText(text => text
        .setValue(this.plugin.settings.llmModelName)
        .onChange(async (value) => {
          this.plugin.settings.llmModelName = value;
          await this.plugin.saveSettings();
        })
      );

    if (this.plugin.settings.aiProvider === 'custom' || this.plugin.settings.aiProvider === 'ollama') {
      new Setting(containerEl)
        .setName('Base URL')
        .setDesc('Endpoint URL (e.g., http://localhost:11434/v1)')
        .addText(text => text
          .setValue(this.plugin.settings.llmBaseUrl)
          .onChange(async (value) => {
            this.plugin.settings.llmBaseUrl = value;
            await this.plugin.saveSettings();
          })
        );
    }

    new Setting(containerEl)
      .setName('Custom Quiz Prompt')
      .setDesc('Override the system prompt used to generate quizzes.')
      .addTextArea(text => text
        .setValue(this.plugin.settings.customQuizPrompt)
        .setPlaceholder('You are a strict teacher...')
        .onChange(async (value) => {
          this.plugin.settings.customQuizPrompt = value;
          await this.plugin.saveSettings();
        })
      );



  }
}

