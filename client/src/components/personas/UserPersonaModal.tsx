import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, User, Plus, Check, Trash2, Sparkles } from "lucide-react";
import {
  useGetPersonasQuery,
  useCreatePersonaMutation,
  useUpdatePersonaMutation,
  useDeletePersonaMutation,
  UserPersona,
} from "../../api/baseApi.js";
import { ImageUpload } from "../shared/ImageUpload.js";

interface UserPersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePersonaId?: string | null;
  onSelectPersona: (personaId: string) => void;
}

export const UserPersonaModal: React.FC<UserPersonaModalProps> = ({
  isOpen,
  onClose,
  activePersonaId,
  onSelectPersona,
}) => {
  const { data: personas = [], isLoading } = useGetPersonasQuery();
  const [createPersona] = useCreatePersonaMutation();
  const [deletePersona] = useDeletePersonaMutation();

  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) return;

    const res = await createPersona({
      name: name.trim(),
      description: description.trim(),
      avatarUrl: avatarUrl || undefined,
      isDefault: personas.length === 0,
    }).unwrap();

    onSelectPersona(res.id);
    setName("");
    setDescription("");
    setAvatarUrl(null);
    setIsCreating(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg glass-panel rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-dark-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-600/20 text-brand-300 border border-brand-500/30">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Your Persona Profiles</h3>
              <p className="text-xs text-slate-400">
                Choose who you are in this conversation. The AI character addresses you by this identity.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-slate-500 text-sm">Loading personas...</div>
          ) : isCreating ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-brand-400" /> Create New Persona
                </h4>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Back to list
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <ImageUpload
                  type="avatar"
                  currentUrl={avatarUrl}
                  onUploadSuccess={(url) => setAvatarUrl(url)}
                  label="Persona Avatar"
                />
                <div className="flex-1 w-full space-y-1">
                  <label className="block text-xs font-medium text-slate-300">
                    Your Persona Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Michael, Alistair, Captain Morgan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-dark-900 border border-white/10 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Persona Details & Backstory
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe your appearance, personality, relationship to the character, or powers. Characters will perceive and react to this."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-dark-900 border border-white/10 text-white focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-500/20"
                >
                  Save Persona
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              {personas.map((p) => {
                const isSelected = p.id === activePersonaId || (!activePersonaId && p.isDefault);
                return (
                  <div
                    key={p.id}
                    onClick={() => onSelectPersona(p.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                      isSelected
                        ? "bg-brand-950/40 border-brand-500/50 shadow-lg shadow-brand-950/50"
                        : "bg-dark-900/60 border-white/5 hover:border-white/15"
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {p.avatarUrl ? (
                        <img
                          src={p.avatarUrl}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover border border-white/10 flex-shrink-0 mt-0.5"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-brand-900/40 border border-brand-500/30 text-brand-300 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                          {p.name[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-sm text-white truncate">{p.name}</span>
                          {p.isDefault && (
                            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                          {p.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isSelected ? (
                        <div className="p-1.5 rounded-full bg-brand-500 text-white shadow-sm">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePersona(p.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                          title="Delete persona"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="w-full py-3 rounded-2xl border border-dashed border-white/20 hover:border-brand-500/50 hover:bg-white/5 text-slate-300 hover:text-brand-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all mt-2"
              >
                <Plus className="w-4 h-4" /> Create New Persona Profile
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
