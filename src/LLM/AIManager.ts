import {
  ChatModels,
  EntryItemGeneration,
  NOTE_QUIZ_PROMPT,
  NoteQuizItem,
  FLASHCARD_GENERATION_PROMPT,
} from "@/constants";
import { errorMessage } from "@/utils/errorMessage";
// @ts-ignore
import { LLMClient } from '@unified-llm/core';
import { SRSettings } from "@/settings";

const PROMPT = `You are a helpful AI assistant integrated into Obsidian.
You can help the user with their notes, answer questions, and explain concepts.
Use Markdown formatting for your responses.
`;

type Message = {
  role: 'user' | 'assistant' | 'developer';
  content: string;
};

export default class AIManager {
  private static instance: AIManager;
  private client: any; // LLMClient
  private messageHistory: Message[];
  public chatModel: ChatModels;
  private customQuizPrompt: string; // Store custom prompt

  constructor(settings: SRSettings) {
    this.chatModel = settings.defaultModel;
    this.customQuizPrompt = settings.customQuizPrompt;
    this.messageHistory = [];
    this.setNewThread();
    this.initClient(settings);
  }

  static getInstance(settings: SRSettings): AIManager {
    if (!AIManager.instance) {
      AIManager.instance = new AIManager(settings);
    }
    return AIManager.instance;
  }

  // Allow re-initializing with new settings
  public updateSettings(settings: SRSettings) {
    this.chatModel = settings.defaultModel;
    this.customQuizPrompt = settings.customQuizPrompt;
    this.initClient(settings);
  }

  private initClient(settings: SRSettings) {
    const config: any = {
      provider: settings.aiProvider,
      model: settings.llmModelName || settings.defaultModel,
      apiKey: settings.openAIApiKey
    };

    if (settings.llmBaseUrl) {
      config.baseURL = settings.llmBaseUrl;
    }

    try {
      this.client = new LLMClient(config);
    } catch (e) {
      console.error("Failed to initialize LLM Client:", e);
    }
  }

  setModel(newModel: ChatModels): void {
    this.chatModel = newModel;
  }

  async setNewThread(index?: number): Promise<void> {
    if (index) {
      const historyToUse = index !== undefined ? this.messageHistory.slice(0, index * 2 + 1) : [];
      this.messageHistory = [...historyToUse];
    } else {
      // 'developer' role might not be supported by all providers, using 'system' safe bet
      this.messageHistory = [{ role: 'developer' as any, content: PROMPT }];
    }
  }

  async streamChat(
    newMessageModded: string,
    abortController: AbortController,
    setAIString: (response: string) => void
  ): Promise<string> {
    if (!this.client) return '';

    try {
      this.messageHistory.push({ role: 'user', content: newMessageModded });

      // Map internal history to LLMClient format
      const messages = this.messageHistory.map((m, idx) => ({
        role: m.role === 'developer' ? 'system' : m.role,
        content: m.content,
        id: idx.toString(),
        createdAt: new Date()
      }));

      const stream = await this.client.stream({
        messages: messages,
      });

      let fullResponse = '';

      for await (const ev of stream) {
        if (abortController.signal.aborted) {
          break;
        }

        // Debugging: handle various stream formats
        let chunkContent = '';

        // 1. Unified LLM / Generic Event Type
        if (ev.eventType === 'text_delta' || ev.eventType === 'text_snapshot') {
          if (ev.text && ev.text.length > fullResponse.length) {
            fullResponse = ev.text; // Snapshot
            setAIString(fullResponse);
            continue;
          } else if (ev.delta?.text) {
            chunkContent = ev.delta.text;
          }
        }
        // 2. Raw OpenAI Style (choices[0].delta.content)
        else if (ev.choices && ev.choices[0]?.delta?.content) {
          chunkContent = ev.choices[0].delta.content;
        }
        // 3. Raw Anthropic / Simple Content Style
        else if (ev.content) {
          chunkContent = ev.content;
        }
        // 4. Fallback for 'text' property directly on event
        else if (ev.text && typeof ev.text === 'string') {
          // Some adapters might just emit { text: "partial" }
          chunkContent = ev.text;
        }

        if (chunkContent) {
          fullResponse += chunkContent;
          setAIString(fullResponse);
        }
      }

      this.messageHistory.push({
        role: 'assistant',
        content: fullResponse
      });

      return fullResponse;

    } catch (e) {
      console.error('Error in AI stream:', e);
      errorMessage(`Streaming AI response ${e}`);
      return '';
    }
  }

  async generateFlashcards(context: string): Promise<EntryItemGeneration[]> {
    if (!this.client) return [];

    try {
      const messages = [
        { role: 'system', content: FLASHCARD_GENERATION_PROMPT },
        { role: 'user', content: `Context:\n${context}` }
      ];

      const response = await this.client.chat({
        messages: messages
        // mode: 'json' // If supported by provider, else prompt engineering handles it
      });

      let jsonString = response.message?.content[0].text || "{}";
      jsonString = jsonString.replace(/^```json\n/, '').replace(/\n```$/, ''); // Cleanup markdown code blocks

      const parsed = JSON.parse(jsonString);
      return parsed.cards || [];

    } catch (e) {
      console.error("Flashcard generation failed", e);
      errorMessage("Failed to generate flashcards: " + e);
      return [];
    }
  }

  async generateNoteQuiz(content: string): Promise<NoteQuizItem[]> {
    if (!this.client) return [];

    try {
      const response = await this.client.chat({
        messages: [
          { role: 'system', content: this.customQuizPrompt || NOTE_QUIZ_PROMPT },
          { role: 'user', content: `Note content:\n\n${content}` }
        ]
      });

      let jsonString = response.message?.content[0].text || "{}";
      jsonString = jsonString.replace(/^```json\n/, '').replace(/\n```$/, '');

      const parsed = JSON.parse(jsonString);
      return parsed.questions || [];
    } catch (e) {
      console.error("Quiz generation failed", e);
      return [];
    }
  }
}
