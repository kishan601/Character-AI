import React from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  MessageSquare,
  PlusCircle,
  Trash2,
  Calendar,
  Clock,
  Sparkles,
  BookOpen,
  History,
  Edit3,
} from "lucide-react";
import {
  Character,
  ChatSession,
  useGetSessionsQuery,
  useCreateSessionMutation,
  useDeleteSessionMutation,
} from "../../api/baseApi.js";

interface CharacterProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character;
  activeSessionId: string;
}

export const CharacterProfileDrawer: React.FC<CharacterProfileDrawerProps> = ({
  isOpen,
  onClose,
  character,
  activeSessionId,
}) => {
  const navigate = useNavigate();
  const { data: sessions = [], refetch } = useGetSessionsQuery({ characterId: character.id });
  const [createSession, { isLoading: isCreating }] = useCreateSessionMutation();
  const [deleteSession] = useDeleteSessionMutation();

  if (!isOpen) return null;

  const handleStartNewChat = async () => {
    try {
      const newSession = await createSession({ characterId: character.id }).unwrap();
      onClose();
      navigate(`/chat/${newSession.id}`);
    } catch (err) {
      console.error("Failed to start new chat:", err);
    }
  };

  const handleSwitchSession = (sessionId: string) => {
    onClose();
    navigate(`/chat/${sessionId}`);
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (window.confirm("Are you sure you want to delete this chat history?")) {
      try {
        await deleteSession(sessionId).unwrap();
        if (activeSessionId === sessionId) {
          const remaining = sessions.filter((s) => s.id !== sessionId);
          if (remaining.length > 0) {
            navigate(`/chat/${remaining[0].id}`);
          } else {
            onClose();
            navigate("/");
          }
        }
      } catch (err) {
        console.error("Failed to delete session:", err);
      }
    }
  };

  const handleDeleteAllSessions = async () => {
    if (window.confirm(`Are you sure you want to delete all ${sessions.length} conversations with ${character.name}?`)) {
      try {
        for (const s of sessions) {
          await deleteSession(s.id).unwrap();
        }
        onClose();
        navigate("/");
      } catch (err) {
        console.error("Failed to delete all sessions:", err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-300"
      />

      {/* Drawer Panel */}
      <div className="w-full max-w-md h-full glass-panel border-l border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 bg-dark-950/95">
        {/* Header Bar */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-dark-950/80">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-brand-400" />
            <span className="font-bold text-white text-base">Recent History & Dossier</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Character Profile Header Card */}
          <div className="flex flex-col items-center text-center p-5 rounded-3xl bg-dark-900/60 border border-white/5 backdrop-blur-md relative overflow-hidden">
            {character.backgroundUrl && (
              <img
                src={character.backgroundUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-20 filter blur-xs"
              />
            )}
            <div className="relative z-10 flex flex-col items-center">
              {character.avatarUrl ? (
                <img
                  src={character.avatarUrl}
                  alt={character.name}
                  className="w-20 h-20 rounded-full object-cover border-2 border-brand-500/50 shadow-xl mb-3 ring-4 ring-dark-950"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-brand-900/50 flex items-center justify-center text-brand-300 border-2 border-brand-500/30 text-2xl font-bold mb-3">
                  {character.name[0]}
                </div>
              )}
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">{character.name}</h3>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(`/characters/${character.id}/edit`);
                  }}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-brand-300 transition-colors"
                  title="Edit Character Definition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
              {character.tagline && (
                <p className="text-xs font-medium text-brand-300 mt-0.5">{character.tagline}</p>
              )}
              {character.description && (
                <p className="text-xs text-slate-400 mt-2 leading-relaxed max-w-xs">
                  {character.description}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons: New Chat & Edit Character */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleStartNewChat}
              disabled={isCreating}
              className="py-2.5 px-3 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-brand-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" /> New Chat
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/characters/${character.id}/edit`);
              }}
              className="py-2.5 px-3 rounded-2xl bg-dark-900/80 hover:bg-dark-800 text-slate-200 hover:text-white font-semibold text-xs flex items-center justify-center gap-1.5 border border-white/10 hover:border-brand-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Edit3 className="w-4 h-4 text-brand-400" /> Edit Character
            </button>
          </div>

          {/* Conversations History with THIS character */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-brand-400" /> Recent History ({sessions.length})
              </span>
              {sessions.length > 1 && (
                <button
                  type="button"
                  onClick={handleDeleteAllSessions}
                  className="text-[11px] text-red-400/80 hover:text-red-300 transition-colors flex items-center gap-1 font-medium"
                  title="Delete all chat history with this character"
                >
                  <Trash2 className="w-3 h-3" /> Clear All
                </button>
              )}
            </div>

            {sessions.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                No past conversations with {character.name}.
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => {
                  const isActive = s.id === activeSessionId;
                  const dateStr = new Date(s.updatedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={s.id}
                      onClick={() => handleSwitchSession(s.id)}
                      className={`group p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isActive
                          ? "bg-brand-950/50 border-brand-500/50 shadow-md shadow-brand-950/40"
                          : "bg-dark-900/50 border-white/5 hover:border-white/15 hover:bg-dark-900"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs font-semibold truncate ${isActive ? "text-brand-300 font-bold" : "text-slate-200"}`}>
                            {s.title || `Chat with ${character.name}`}
                          </span>
                          {isActive && (
                            <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.2 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {dateStr}
                          </span>
                          <span>•</span>
                          <span>{s._count?.messages || 0} msgs</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteSession(e, s.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all"
                        title="Delete this chat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
