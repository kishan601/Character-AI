import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  PlusCircle,
  MessageSquare,
  Users,
  Settings,
  Sparkles,
  Trash2,
  X,
  Bot,
  Menu,
} from "lucide-react";
import { RootState } from "../../store/store.js";
import { toggleSidebar, setSidebarOpen } from "../../store/uiSlice.js";
import {
  useGetCharactersQuery,
  useGetSessionsQuery,
  useResumeSessionMutation,
  useDeleteSessionMutation,
  useDeleteCharacterSessionsMutation,
} from "../../api/baseApi.js";

export const Sidebar: React.FC = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();

  const sidebarOpen = useSelector((state: RootState) => state.ui.sidebarOpen);
  const zenMode = useSelector((state: RootState) => state.ui.zenMode);

  const { data: characters = [] } = useGetCharactersQuery();
  const { data: sessions = [] } = useGetSessionsQuery();
  const [resumeSession] = useResumeSessionMutation();
  const [deleteCharacterSessions] = useDeleteCharacterSessionsMutation();

  const handleSelectCharacter = async (charId: string) => {
    try {
      const session = await resumeSession({ characterId: charId }).unwrap();
      dispatch(setSidebarOpen(false));
      navigate(`/chat/${session.id}`);
    } catch (err) {
      console.error("Failed to resume session:", err);
    }
  };

  const handleDeleteCharacterRecent = async (
    e: React.MouseEvent,
    sess: (typeof sessions)[0]
  ) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await deleteCharacterSessions(sess.characterId).unwrap();
      // If currently chatting with this character, redirect cleanly
      const currentSession = sessions.find(
        (s) => `/chat/${s.id}` === location.pathname
      );
      if (currentSession && currentSession.characterId === sess.characterId) {
        const remaining = sessions.filter(
          (s) => s.characterId !== sess.characterId
        );
        if (remaining.length > 0) {
          navigate(`/chat/${remaining[0].id}`);
        } else {
          navigate("/");
        }
      }
    } catch (err) {
      console.error("Failed to delete character conversation:", err);
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return "just now";
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return "";
    }
  };

  // Deduplicate by characterId: exactly 1 recent entry per character
  const recentSessionsList = React.useMemo(() => {
    const seen = new Set<string>();
    const unique: typeof sessions = [];
    for (const sess of sessions) {
      if (!seen.has(sess.characterId)) {
        seen.add(sess.characterId);
        unique.push(sess);
      }
    }
    return unique.slice(0, 10);
  }, [sessions]);

  if (zenMode) return null;

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => dispatch(setSidebarOpen(false))}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Panel with Smooth Desktop & Mobile Collapse */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 z-40 glass-panel border-r border-white/10 flex flex-col transition-all duration-300 ease-in-out bg-dark-950/95 flex-shrink-0 pt-[env(safe-area-inset-top)] ${
          sidebarOpen
            ? "w-64 translate-x-0 opacity-100"
            : "w-0 -translate-x-full md:w-0 md:translate-x-0 opacity-0 pointer-events-none md:border-r-0 overflow-hidden"
        }`}
      >
        <div className="w-64 flex flex-col h-full">
          {/* Brand Header: Exactly h-16 to align seamlessly with Navbar seam */}
          <div className="h-16 px-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => dispatch(toggleSidebar())}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                title="Collapse sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
              <Link to="/" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-brand-600 to-purple-500 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-brand-500/25 group-hover:scale-105 transition-transform">
                  Ω
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm tracking-tight text-white group-hover:text-brand-300 transition-colors">
                    Aegis AI
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Uncensored Engine</span>
                </div>
              </Link>
            </div>

            <button
              type="button"
              onClick={() => dispatch(setSidebarOpen(false))}
              className="md:hidden p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action: New Character */}
          <div className="p-3 flex-shrink-0">
            <Link
              to="/characters/new"
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" /> Create New Character
          </Link>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
          {/* Active / Recent Sessions */}
          <div>
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Recent Conversations
              </span>
            </div>

            <div className="space-y-1">
              {recentSessionsList.length === 0 ? (
                <div className="px-3 py-3 text-center text-xs text-slate-500">
                  No active chats yet
                </div>
              ) : (
                recentSessionsList.map((sess) => {
                  const isActive = location.pathname === `/chat/${sess.id}`;
                  return (
                    <div
                      key={sess.id}
                      onClick={() => {
                        dispatch(setSidebarOpen(false));
                        navigate(`/chat/${sess.id}`);
                      }}
                      className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                        isActive
                          ? "bg-brand-600/30 text-white border border-brand-500/40"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 mr-2">
                        {sess.character.avatarUrl ? (
                          <img
                            src={sess.character.avatarUrl}
                            alt=""
                            className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <Bot className="w-4 h-4 text-brand-400 flex-shrink-0" />
                        )}
                        <div className="flex flex-col truncate min-w-0">
                          <span className="truncate leading-tight font-semibold text-slate-200">
                            {sess.character.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatRelativeTime(sess.updatedAt)}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCharacterRecent(e, sess)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-slate-500 transition-opacity flex-shrink-0"
                        title={`Delete conversation with ${sess.character.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Character Library */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-2 block mb-2">
              All Characters ({characters.length})
            </span>
            <div className="space-y-1">
              {characters.map((char) => (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => handleSelectCharacter(char.id)}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors group text-left"
                >
                  <div className="flex items-center gap-2.5 truncate flex-1">
                    {char.avatarUrl ? (
                      <img
                        src={char.avatarUrl}
                        alt=""
                        className="w-4 h-4 rounded-full object-cover"
                      />
                    ) : (
                      <Users className="w-3.5 h-3.5 text-purple-400" />
                    )}
                    <span className="truncate">{char.name}</span>
                  </div>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch(setSidebarOpen(false));
                      navigate(`/characters/${char.id}/edit`);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-brand-300 text-slate-500 transition-opacity"
                    title="Edit character definition"
                  >
                    <Settings className="w-3 h-3" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar: Settings */}
        <div className="p-3 border-t border-white/10 bg-dark-950/40 flex-shrink-0 flex flex-col gap-1">
          <Link
            to="/settings/ai"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#d9904d] hover:text-[#f4f3f0] hover:bg-white/5 transition-colors"
          >
            <Sparkles className="w-4 h-4" /> AI Integration Settings
          </Link>
          <Link
            to="/settings"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Settings className="w-4 h-4" /> App & Database Settings
          </Link>
        </div>
        </div>
      </aside>
    </>
  );
};
