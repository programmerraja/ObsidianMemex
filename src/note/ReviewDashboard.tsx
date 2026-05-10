import React, { useEffect, useState } from 'react';
import { TFile, Notice } from 'obsidian';
import SRPlugin from '@/main';
import { NoteReviewModal } from './NoteReviewModal';

interface ReviewDashboardProps {
    plugin: SRPlugin;
}

interface QueueData {
    newNotes: TFile[];
    dueNotes: TFile[];
}

export const ReviewDashboard: React.FC<ReviewDashboardProps> = ({ plugin }) => {
    const [queue, setQueue] = useState<QueueData>({ newNotes: [], dueNotes: [] });
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const streak = plugin.settings.reviewStreak;
    const totalXP = plugin.settings.totalXP || 0;
    
    // Leveling Logic: 500 XP per level
    const level = Math.floor(totalXP / 500) + 1;
    const xpInLevel = totalXP % 500;
    const progress = (xpInLevel / 500) * 100;

    // Rank Logic
    let rank = "Apprentice";
    if (level > 20) rank = "Master";
    else if (level > 10) rank = "Sage";
    else if (level > 5) rank = "Scholar";

    const loadQueue = () => {
        const due = plugin.noteScheduler.getDueNotes();
        const newN = plugin.noteScheduler.getNewNotes();
        setQueue({ dueNotes: due, newNotes: newN });
    };

    useEffect(() => {
        loadQueue();
        
        const onMetadataChange = () => loadQueue();
        plugin.app.metadataCache.on('changed', onMetadataChange);
        
        return () => {
            plugin.app.metadataCache.off('changed', onMetadataChange);
        };
    }, [refreshTrigger, plugin.settings.reviewTags]);

    const handleReview = (file: TFile) => {
        const wasEmpty = queue.dueNotes.length === 1 && queue.newNotes.length === 0;
        new NoteReviewModal(plugin.app, plugin, file, () => {
            loadQueue();
            setRefreshTrigger(prev => prev + 1);
            if (wasEmpty) {
                new Notice("🎉 Amazing! You've cleared your queue for today! Level Up! 🚀");
            }
        }).open();
    };

    const handleOpenFile = (file: TFile) => {
        plugin.app.workspace.getLeaf(false).openFile(file);
    };

    const renderNoteList = (notes: TFile[], title: string, emptyMsg: string) => (
        <div className="mb-6">
            <h3 className="text-sm font-bold theme-text-faint uppercase tracking-wider mb-2">{title}</h3>
            {notes.length === 0 ? (
                <div className="text-xs theme-text-faint italic p-2 border theme-border rounded border-dashed text-center">
                    {emptyMsg}
                </div>
            ) : (
                <div className="space-y-1">
                    {notes.map(file => (
                        <div
                            key={file.path}
                            className="p-2 theme-bg-surface theme-border border rounded cursor-pointer hover:theme-bg-hover transition-colors flex justify-between items-center group"
                            onDoubleClick={() => handleOpenFile(file)}
                        >
                            <div className="flex-1 min-w-0" onClick={() => handleOpenFile(file)}>
                                <div className="text-sm font-medium theme-text truncate">{file.basename}</div>
                                <div className="text-[10px] theme-text-faint truncate">{file.path}</div>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleReview(file); }}
                                className="text-xs theme-text-accent opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 hover:theme-bg-interactive hover:theme-text-on-interactive rounded"
                            >
                                Review
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="flex flex-col h-full overflow-hidden p-2">
            <div className="mb-6">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h2 className="text-lg font-bold theme-text m-0">Note Review Queue</h2>
                        <div className="flex gap-4 text-[10px] theme-text-faint uppercase tracking-tight mt-1">
                            <span>{queue.dueNotes.length} Due</span>
                            <span>{queue.newNotes.length} New</span>
                        </div>
                    </div>
                    {streak > 0 && (
                        <div className="flex items-center gap-1 text-xs theme-text-accent font-bold bg-accent/10 px-2 py-1 rounded-full" title="Review Streak">
                            <span>🔥</span>
                            <span>{streak}</span>
                        </div>
                    )}
                </div>

                {/* Leveling Bar */}
                <div className="mt-4 p-3 theme-bg-secondary rounded-lg border theme-border">
                    <div className="flex justify-between items-center text-xs mb-2">
                        <span className="font-bold theme-text">Level {level}</span>
                        <span className="theme-text-faint">{totalXP} XP</span>
                    </div>
                    <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden">
                        <div 
                            className="h-full theme-bg-interactive transition-all duration-500 ease-out" 
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-[10px] theme-text-faint mt-1">
                        <span>Rank: {rank}</span>
                        <span>{500 - xpInLevel} XP to next level</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
                {queue.dueNotes.length === 0 && queue.newNotes.length === 0 ? (
                    <div className="theme-text-faint text-xs p-6 border theme-border rounded border-dashed text-center space-y-3">
                        <div className="text-lg">📚</div>
                        <p>No notes found for review.</p>
                        <p className="text-[10px]">
                            To get started, add <span className="theme-text-accent font-mono">#review</span> to any markdown note. 
                            The plugin will automatically find it and show it here!
                        </p>
                        <div className="pt-2">
                            <button 
                                onClick={loadQueue}
                                className="px-2 py-1 theme-bg-hover rounded border theme-border"
                            >
                                Re-scan Vault
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {renderNoteList(queue.dueNotes, "Due Today", "No notes due! 🎉")}
                        {renderNoteList(queue.newNotes, "New Notes", "No new notes to review.")}
                    </>
                )}
            </div>

            <div className="mt-4 pt-4 border-t theme-border flex justify-between items-center">
                <span className="text-[10px] theme-text-faint italic">Double-click to open</span>
                <button
                    className="theme-bg-interactive theme-text-on-interactive text-xs px-3 py-1 rounded hover:theme-bg-interactive-accent transition-colors"
                    onClick={loadQueue}
                >
                    Refresh Sync
                </button>
            </div>
        </div>
    );
};
