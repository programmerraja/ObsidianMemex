import { ChatModels, ChatModelDisplayNames, OnboardingStatus } from "@/constants";

export interface SRSettings {
  defaultModel: ChatModels;
  defaultModelDisplayName: ChatModelDisplayNames;
  openAIApiKey: string;
  inlineSeparator: string;
  multilineSeparator: string;
  includeCurrentFile: boolean;
  onboardingStatus: OnboardingStatus;
  autoTrackNotes: boolean;
  aiProvider: 'openai' | 'anthropic' | 'gemini' | 'custom' | 'ollama';
  llmBaseUrl: string;
  llmModelName: string;
  reviewStreak: number;
  lastReviewDate: string; // YYYY-MM-DD
  customQuizPrompt: string;
  excludedPaths: string[]; // Folder paths or file paths to ignore
  includedPaths: string[]; // Folder paths or file paths to exclusively include (whitelist)
}
