import MessageSegment from '@/components/chat/MessageSegment'
import * as React from 'react';
import { useState, useEffect } from 'react';
import { MessageHistoryHook } from '../hooks/useMessageHistory';
import SRPlugin from '@/main';
import { TFile } from 'obsidian';
import { getFilteredFiles } from '@/utils/obsidianFiles';

import { ChatModelDisplayNames } from '@/constants';
import { useAIState } from '@/hooks/useAIState';
import { PlusIcon } from '@/components/Icons';

interface ChatProps {
    plugin: SRPlugin;
    messageHistoryHook: MessageHistoryHook;
}

const Chat: React.FC<ChatProps> = ({
    plugin,
    messageHistoryHook,
}) => {
    const { messageHistory, createUpdateFunctions, addNewMessage, clearAll } = messageHistoryHook;

    const { workspace, vault } = plugin.app;
    const { aiManager } = plugin;
    const [currentModel, setModel] = useAIState(aiManager);

    const [activeFile, setActiveFile] = useState<TFile | null>(null);
    const [files, setFiles] = useState<TFile[]>([]);

    useEffect(() => {
        const updateAll = () => {
            getFilteredFiles(vault).then((files) => {
                setFiles(files);
            });

            const newActiveFile = workspace.getActiveFile();
            setActiveFile(newActiveFile);

        };

        updateAll();

        const onActiveLeafChange = () => {
            updateAll();
        };

        workspace.on('active-leaf-change', updateAll);

        return () => {
            workspace.off('active-leaf-change', onActiveLeafChange);
        };
    }, [vault, workspace, activeFile]);

    const handleModelChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
        const model = event.target.value as ChatModelDisplayNames;
        setModel(model);
    };

    return (
        <div className="flex flex-col h-full bg-transparent">
            {/* Global Chat Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b theme-border bg-[var(--background-secondary)] shrink-0 z-10">
                <div className="flex items-center gap-2">
                    <select
                        value={currentModel}
                        onChange={handleModelChange}
                        className="bg-transparent text-sm font-medium theme-text hover:theme-text-accent outline-none cursor-pointer appearance-none border-none p-0 focus:ring-0"
                    >
                        {Object.entries(ChatModelDisplayNames).map(([key, displayName]) => (
                            <option key={key} value={displayName}>
                                {displayName}
                            </option>
                        ))}
                    </select>
                </div>

                <div
                    onClick={async () => {
                        clearAll();
                        await aiManager.setNewThread();
                    }}
                    className="p-1.5 rounded-md hover:theme-bg-hover cursor-pointer transition-colors text-xs flex items-center gap-1 theme-text-muted"
                    title="New Chat"
                >
                    <PlusIcon className="size-4" />
                    <span className="font-medium">New</span>
                </div>
            </div>

            {/* Chat List - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {messageHistory.map((segment, index) => {
                    const updateHistory = createUpdateFunctions(index);
                    return (
                        <MessageSegment
                            key={index}
                            index={index}
                            segment={segment}
                            messageHistory={messageHistory}
                            updateHistory={updateHistory}
                            addNewMessage={addNewMessage}
                            clearAll={clearAll}
                            plugin={plugin}
                            activeFile={activeFile}
                            files={files}
                        />
                    );
                })}
            </div>
        </div>
    )
}

export default Chat