import * as React from 'react';
import { useState, useRef } from 'react';
import { ChatModelDisplayNames, EntryItemGeneration } from '@/constants';
import { TFile } from 'obsidian';
import SRPlugin from '@/main';
import MentionsInput from '@/components/mentions/MentionsInput';
import { ChatMessage } from '@/chatMessage';
import Mention from '@/components/mentions/Mention';
import { useAIState } from '@/hooks/useAIState';
import { getFileContent, writeCardtoFile } from '@/utils/obsidianFiles';
import { EnterIcon, SendIcon, PlusIcon, BotIcon } from '@/components/Icons';
import ChatTag from '@/components/chat/ChatTag';
import { errorMessage } from '@/utils/errorMessage';
import Markdown from 'react-markdown';
import { EntryView } from '@/components/EntryView';
import { useFiles } from '@/hooks/useFiles';

interface MessageSegmentProps {
  segment: ChatMessage
  updateHistory: {
    updateUserMessage: (userMessage: string) => void;
    updateModifiedMessage: (modifiedMessage: string) => void;
    updateAIResponse: (aiString: string | null, aiEntries: EntryItemGeneration[] | null) => void;
    clearMessageHistory: () => void;
  };
  messageHistory: ChatMessage[],
  addNewMessage: () => void,
  clearAll: () => void,
  index: number,
  plugin: SRPlugin,
  activeFile: TFile | null,
  files: TFile[],
}

const MessageSegment: React.FC<MessageSegmentProps> = ({
  index,
  segment,
  updateHistory,
  messageHistory,
  addNewMessage,
  clearAll,
  plugin,
  activeFile,
  files,
}) => {

  // LLM
  const { aiManager } = plugin;
  const [currentModel, setModel] = useAIState(aiManager);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // We create useState in this component for variables that change often
  const [aiString, setAIString] = useState<string | null>(segment.aiString);
  const [aiEntries, setAIEntries] = useState<EntryItemGeneration[] | null>(segment.aiEntries);
  const [userMessage, setUserMessage] = useState<string | null>(segment.userMessage);

  // New state for Flashcard toggle
  const [shouldGenerateFlashcards, setShouldGenerateFlashcards] = useState(false);
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);

  const { mentionedFiles, handleFileAdd, removeFile } = useFiles(files, activeFile, plugin.settings.includeCurrentFile);

  // Mentions 
  const inputRef = useRef<HTMLDivElement | null>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);

  const {
    updateUserMessage,
    updateModifiedMessage,
    updateAIResponse,
    clearMessageHistory
  } = updateHistory;


  const handleMentionsChange = (e: any, newValue: string) => {
    const fileRegex = /@\[(.*?)\]\((.*?)\)/g;
    const newUserMessage = newValue.replace(fileRegex, '');
    setUserMessage(newUserMessage);
  };

  const handleSendMessage = async (event: React.KeyboardEvent<HTMLTextAreaElement> | React.MouseEvent<HTMLDivElement, MouseEvent> | React.MouseEvent<HTMLButtonElement, MouseEvent>) => {

    if ('key' in event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
      } else {
        return;
      }
    }

    if (!userMessage) return;

    // Optimistic UI updates
    setAIString('');
    setAIEntries([]);
    clearMessageHistory();
    handleStopGenerating();

    // Switch to view mode immediately
    setIsEditing(false);

    updateUserMessage(userMessage);

    let modifiedMessage = `<USER MESSAGE>\n\n${userMessage}</USER MESSAGE>`;

    if (mentionedFiles.length > 0) {
      modifiedMessage += `\n\n<REFERENCE FILES>`
      for (const [index, file] of mentionedFiles.entries()) {
        const fileContent = await getFileContent(file, plugin.app.vault);
        modifiedMessage += `\n\n<REFERENCE>#${index + 1}: [[${file.name}]]\n---\n\n${fileContent}</REFERENCE>`;
      }
      modifiedMessage += '</REFERENCE FILES>'
    }

    updateModifiedMessage(modifiedMessage);

    if (index < messageHistory.length - 1) {
      await aiManager.setNewThread(index);
    }

    const controller = new AbortController();
    setAbortController(controller);

    // 1. Stream Chat
    let finalStr = '';
    try {
      finalStr = await aiManager.streamChat(
        modifiedMessage,
        controller,
        setAIString
      );
    } catch (e) {
      console.error("Chat stream error", e);
    }

    // 2. Generate Flashcards (Optional)
    let finalEntries: EntryItemGeneration[] = [];
    if (shouldGenerateFlashcards && !controller.signal.aborted) {
      setIsGeneratingCards(true);
      // Combine prompt + answer for context
      const cardContext = `User Question: ${userMessage}\n\nAI Answer: ${finalStr}\n\nReference Material: ${modifiedMessage}`;
      finalEntries = await aiManager.generateFlashcards(cardContext);
      setAIEntries(finalEntries);
      setIsGeneratingCards(false);
    }

    setAbortController(null);
    updateAIResponse(finalStr, finalEntries);
    addNewMessage();
  }

  const handleStopGenerating = () => {
    if (abortController) {
      abortController.abort();
      setIsGeneratingCards(false);
    }
  };

  const handleModelChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const model = event.target.value as ChatModelDisplayNames;
    setModel(model);
  };

  const handleCardFeedback = async (feedback: 'y' | 'n', entry: EntryItemGeneration, index: number) => {
    function removeEntry() {
      if (aiEntries) {
        const updatedEntries = aiEntries.filter((_, i) => i !== index);
        setAIEntries([...updatedEntries]);
        updateAIResponse(aiString, updatedEntries);
      }
    }
    if (feedback === 'y') {
      if (activeFile) {
        await writeCardtoFile(entry, activeFile, plugin);
        removeEntry();
      } else {
        errorMessage(`Oops, please open the file where you'd like to write this flashcard`);
      }
    } else {
      removeEntry();
    }
  };

  const addAllCards = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (aiEntries && activeFile) {
      await Promise.all(aiEntries.map((entry) => writeCardtoFile(entry, activeFile, plugin)));
      setAIEntries([]);
    } else {
      errorMessage(`Oops, please open the file where you'd like to write your ${aiEntries?.length && aiEntries.length > 1 ? 'cards' : 'card'}`)
    }
  };


  // State for Display vs Edit mode
  const [isEditing, setIsEditing] = useState<boolean>(!segment.aiString && !segment.aiEntries);

  const handleSendMessageWrapper = async (e: any) => {
    await handleSendMessage(e);
  };

  return (
    <div className="w-full flex flex-col mb-2 group">

      {/* Display Mode (Chat Bubbles) */}
      {!isEditing && (
        <div className="flex flex-col gap-4">
          {/* User Message Bubble */}
          {userMessage && (
            <div className="flex justify-end w-full">
              <div className="relative max-w-[85%] bg-[var(--interactive-accent)] text-[var(--text-on-accent)] px-4 py-2.5 rounded-2xl rounded-tr-sm shadow-sm">
                <div className="whitespace-pre-wrap text-sm">{userMessage}</div>

                {/* Edit Button (Visible on Hover) */}
                <div
                  className="absolute -left-8 top-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 theme-text-faint hover:theme-text"
                  onClick={() => setIsEditing(true)}
                  title="Edit message"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Mentions Context (Read Only) */}
          {mentionedFiles.length > 0 && (
            <div className="flex justify-end gap-1 flex-wrap opacity-80">
              {mentionedFiles.map((file, i) => (
                <div key={file.path} className="text-[10px] px-2 py-0.5 rounded-full theme-bg-surface border theme-border theme-text-muted flex items-center gap-1">
                  <span className="truncate max-w-[100px]">{file.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* AI Response Bubble */}
          {(aiString || aiEntries) && (
            <div className="flex justify-start w-full pr-8">
              <div className="flex gap-3 max-w-full">
                <div className="mt-1 shrink-0">
                  <BotIcon className="size-5 theme-text-accent" />
                </div>
                <div className="flex flex-col gap-2 min-w-0">
                  {aiString && (
                    <div className="markdown-preview-view p-0 text-sm theme-text leading-relaxed">
                      <Markdown>{aiString}</Markdown>
                    </div>
                  )}

                  {/* Generated Flashcards View */}
                  {aiEntries?.map((entry, i) => (
                    <EntryView
                      handleFeedback={async (feedback: 'y' | 'n') => {
                        await handleCardFeedback(feedback, entry, i);
                      }}
                      front={entry.front || ""}
                      back={entry.back || ""}
                      key={`entry-${i}-length-${aiEntries.length}`}
                    />
                  ))}

                  {aiEntries && aiEntries.length > 0 && (
                    <div className='flex items-center gap-2 mt-2'>
                      {activeFile && activeFile.path.endsWith('.md') ? (
                        <span className="text-xs theme-text-muted">Adding to {activeFile.name}</span>
                      ) : (
                        <span className="text-xs theme-text-warning">Open a file to add cards</span>
                      )}
                      <button disabled={activeFile === null} className='text-xs px-3 py-1.5 theme-bg-surface hover:theme-bg-hover border theme-border rounded transition-colors' onClick={addAllCards}>Add all</button>
                    </div>
                  )}

                  {abortController && !isGeneratingCards && (
                    <div className="flex items-center gap-2 text-xs theme-text-muted animate-pulse">
                      <span>Streaming...</span>
                      <button className='theme-text-error hover:underline' onClick={handleStopGenerating}>Stop</button>
                    </div>
                  )}

                  {isGeneratingCards && (
                    <div className="flex items-center gap-2 text-xs theme-text-accent animate-pulse p-2 border theme-border rounded bg-blue-500/5">
                      <span className="animate-spin">✿</span>
                      <span>Generating flashcards...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Mode (Input Card) - Only show if isEditing is true */}
      {isEditing && (
        <div className="relative flex flex-col w-full border theme-border rounded-lg theme-bg-base focus-within:theme-border-focus transition-all shadow-sm mt-2">
          {/* Input Area */}
          <div className="p-1">
            {/* @ts-ignore */}
            <MentionsInput
              value={userMessage || ''}
              inputRef={inputRef}
              onChange={handleMentionsChange}
              className="w-full resize-none p-3 min-h-[50px] outline-none bg-transparent theme-text placeholder:theme-text-faint text-sm"
              placeholder={index === 0 ? 'Ask anything...' : 'Ask a follow-up...'}
              onKeyDown={async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                await handleSendMessage(e);
              }}
              suggestionsPortalHost={portalRef.current}
              style={{
                suggestions: {
                  list: {
                    backgroundColor: 'var(--background-primary)',
                    border: '1px solid var(--background-modifier-border)',
                    fontSize: 14,
                  },
                  item: {
                    padding: '5px 15px',
                    borderBottom: '1px solid var(--background-modifier-border)',
                    '&focused': {
                      backgroundColor: 'var(--background-modifier-hover)',
                    },
                  },
                },
              }}
            >
              <Mention
                trigger="[["
                // @ts-ignore
                data={files.map((file) => ({ id: file.path, display: file.path }))}
                onAdd={(id: string) => handleFileAdd(id)}
              />
            </MentionsInput>
          </div>

          {/* Footer: Hints & Send */}
          <div className="flex items-center justify-between px-3 py-2 border-t theme-border border-opacity-50">
            {/* Left: Context Files & Hints */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-[70%]">
              {/* Flashcard Toggle */}
              <div
                className={`flex items-center gap-1 cursor-pointer px-2 py-1 rounded transition-colors text-xs select-none border ${shouldGenerateFlashcards ? 'theme-bg-accent text-white border-transparent' : 'theme-text-muted border-transparent hover:theme-bg-hover'}`}
                onClick={() => setShouldGenerateFlashcards(!shouldGenerateFlashcards)}
                title="Generate Flashcards from this response"
              >
                {shouldGenerateFlashcards ? (
                  <span className="font-bold">✓ Cards</span>
                ) : (
                  <span>+ Cards</span>
                )}
              </div>

              <div className="w-[1px] h-4 theme-bg-surface mx-1"></div>

              {/* Explicit "Add Context" button if no files, or list of files */}
              {mentionedFiles.length === 0 ? (
                <div
                  className="flex items-center gap-1 cursor-pointer hover:bg-gray-500/10 px-2 py-1 rounded transition-colors text-xs theme-text-muted select-none"
                  onClick={() => {
                    setUserMessage((userMessage || '') + ' [[')
                    inputRef.current?.focus();
                  }}
                >
                  <PlusIcon className="size-3" />
                  <span>Context</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  {mentionedFiles.map((file, idx) => (
                    <ChatTag
                      key={file.path}
                      name={file.name}
                      handleRemove={() => removeFile(idx)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {abortController && (
                <button className='text-xs theme-text-error hover:text-red-600 mr-2' onClick={handleStopGenerating}>Cancel</button>
              )}
              <button
                onClick={async (e) => { await handleSendMessageWrapper(e) }}
                disabled={!userMessage}
                className={`p-1.5 rounded-md transition-all ${userMessage ? 'theme-bg-accent text-white shadow-md hover:scale-105' : 'bg-gray-500/10 theme-text-faint cursor-not-allowed'}`}
              >
                <SendIcon className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        id="suggestionPortal"
        className="flex"
        ref={portalRef}
      ></div>

    </div>
  );
};

export default MessageSegment;