import React, { useEffect, useState } from 'react';
import { TFile } from 'obsidian';
import SRPlugin from '@/main';
import { NoteReviewModal } from './NoteReviewModal';

interface NoteReviewQueueProps {
    plugin: SRPlugin;
}

export const NoteReviewQueue: React.FC<NoteReviewQueueProps> = ({ plugin }) => {
    const [dueNotes, setDueNotes] = useState<TFile[]>([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const loadDueNotes = () => {
        const notes = plugin.noteScheduler.getDueNotes();
        setDueNotes(notes);
    };

    useEffect(() => {
        loadDueNotes();
        // Optional: Listen to file changes or refresh manually
    }, [refreshTrigger]);

    const handleReview = (file: TFile) => {
        new NoteReviewModal(plugin.app, plugin, file, () => {
            // Callback when modal closes (review done)
            setRefreshTrigger(prev => prev + 1);
        }).open();
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="mb-4">
                <h2 className="text-xl font-bold theme-text mb-2">Note Review Queue</h2>
                <p className="theme-text-faint text-sm">
                    {dueNotes.length} notes due for review.
                </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {dueNotes.length === 0 ? (
                    <div className="theme-text-faint text-center p-8 border theme-border rounded-lg border-dashed">
                        No notes due! 🎉<br />
                        Track more notes or check back tomorrow.
                    </div>
                ) : (
                    dueNotes.map(file => (
                        <div
                            key={file.path}
                            onClick={() => handleReview(file)}
                            className="p-3 theme-bg-surface theme-border border rounded-lg cursor-pointer hover:theme-bg-hover transition-colors flex justify-between items-center"
                        >
                            <div>
                                <div className="font-semibold theme-text">{file.basename}</div>
                                <div className="text-xs theme-text-faint truncate max-w-[200px]">{file.path}</div>
                            </div>
                            <div className="theme-text-accent">
                                Review
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="mt-4 pt-4 border-t theme-border flex justify-end">
                <button
                    className="theme-bg-interactive theme-text-on-interactive px-3 py-1 rounded"
                    onClick={loadDueNotes}
                >
                    Refresh
                </button>
            </div>
        </div>
    );
};
