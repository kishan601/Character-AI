import React, { useState } from "react";
import { X, Bookmark, Plus, Trash2, Sparkles, BookOpen } from "lucide-react";
import { PinnedMemory } from "../../api/baseApi.js";

interface PinnedMemoriesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  memories: PinnedMemory[];
  characterName: string;
  onAddMemory: (content: string, label?: string) => Promise<void>;
  onDeleteMemory: (id: string) => Promise<void>;
}

export const PinnedMemoriesDrawer: React.FC<PinnedMemoriesDrawerProps> = ({
  isOpen,
  onClose,
  memories,
  characterName,
  onAddMemory,
  onDeleteMemory,
}) => {
  const [newContent, setNewContent] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    await onAddMemory(newContent.trim(), newLabel.trim() || undefined);
    setNewContent("");
    setNewLabel("");
    setIsAdding(false);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 max-w-full z-50 glass-panel border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-dark-950/60">
        <div className="flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold text-white text-base">Core Lore & Memory Bank</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 py-3 bg-brand-950/20 border-b border-white/5 text-xs text-slate-400 flex items-center justify-between">
        <span>Memories always stay in prompt context</span>
        <span className="font-mono bg-dark-900 px-2 py-0.5 rounded text-amber-400 font-semibold border border-amber-500/20">
          {memories.length} Pinned
        </span>
      </div>

      {/* Memory List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {memories.length === 0 ? (
          <div className="text-center py-10 px-4 text-slate-500 text-sm flex flex-col items-center gap-2">
            <BookOpen className="w-8 h-8 text-slate-600" />
            <p>No pinned memories yet.</p>
            <p className="text-xs text-slate-600">
              Pin key milestones or facts from chat messages, or add them manually below so {characterName} never forgets.
            </p>
          </div>
        ) : (
          memories.map((mem) => (
            <div
              key={mem.id}
              className="p-3 rounded-xl bg-dark-900/70 border border-white/5 hover:border-amber-500/30 transition-all flex flex-col gap-1.5 group"
            >
              <div className="flex items-center justify-between">
                {mem.label ? (
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded">
                    {mem.label}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500">Fact</span>
                )}
                <button
                  type="button"
                  onClick={() => onDeleteMemory(mem.id)}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all"
                  title="Delete memory"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-sm text-slate-200 leading-snug">{mem.content}</p>
            </div>
          ))
        )}
      </div>

      {/* Add Memory Form */}
      <div className="p-4 border-t border-white/10 bg-dark-950/80">
        {isAdding ? (
          <form onSubmit={handleAdd} className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Label (e.g., Secret, Meeting, Rule)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg bg-dark-900 border border-white/10 text-white focus:outline-none focus:border-brand-500"
            />
            <textarea
              placeholder="What should the character never forget? (supports {{char}} & {{user}})"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={3}
              required
              className="w-full px-3 py-2 text-xs rounded-lg bg-dark-900 border border-white/10 text-white focus:outline-none focus:border-brand-500 resize-none"
            />
            <div className="flex items-center justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1 rounded text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm"
              >
                Save Memory
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="w-full py-2 rounded-xl border border-dashed border-white/20 hover:border-brand-500/50 hover:bg-white/5 text-slate-300 hover:text-brand-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Permanent Fact / Memory
          </button>
        )}
      </div>
    </div>
  );
};
