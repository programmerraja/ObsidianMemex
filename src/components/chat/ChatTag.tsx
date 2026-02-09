import * as React from 'react';
import { CloseIcon } from '../Icons';

export default function ChatTag({ name, handleRemove, handleClick }: { name: string, handleRemove?: () => void, handleClick?: () => void }) {
  return (
    <div
      className={`theme-bg-surface theme-border px-3 py-0.5 m-1 border rounded-full inline-flex items-center justify-between text-xs transition-colors ${handleClick ? 'cursor-pointer hover:theme-bg-hover' : ''}`}
      onClick={() => { handleClick && handleClick() }}
    >
      <span className="whitespace-pre-wrap theme-text-muted font-medium pr-2 max-w-[200px] truncate" title={name}>{name}</span>
      {handleRemove && (
        <span className="cursor-pointer hover:theme-text-accent transition-colors" onClick={(e) => { e.stopPropagation(); handleRemove(); }}><CloseIcon className="size-3" /></span>
      )}
    </div>
  )
}