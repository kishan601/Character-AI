import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Menu,
  Bookmark,
  User,
  RotateCw,
  History,
  ChevronDown,
  Edit3,
  MoreVertical,
  Eye,
  EyeOff,
  Sparkles,
  Trash2,
  Sliders,
  X,
} from "lucide-react";
import { RootState } from "../../store/store.js";
import {
  toggleSidebar,
  toggleMemoryDrawer,
  setPersonaModalOpen,
  toggleZenMode,
} from "../../store/uiSlice.js";
import {
  useGetHealthQuery,
  useGetPersonasQuery,
  useUpdateCharacterMutation,
  Character,
  UserPersona,
} from "../../api/baseApi.js";

interface HeaderProps {
  character?: Character | null;
  userPersona?: UserPersona | null;
  memoriesCount?: number;
  showChatControls?: boolean;
  onRefreshChat?: () => void;
  isRefreshing?: boolean;
  onOpenCharacterProfile?: () => void;
  onToggleDeleteMode?: () => void;
  isDeleteMode?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  character,
  userPersona,
  memoriesCount = 0,
  showChatControls = false,
  onRefreshChat,
  isRefreshing = false,
  onOpenCharacterProfile,
  onToggleDeleteMode,
  isDeleteMode = false,
}) => {
  const dispatch = useDispatch();
  const zenMode = useSelector((state: RootState) => state.ui.zenMode);
  const sidebarOpen = useSelector((state: RootState) => state.ui.sidebarOpen);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close 3-dots dropdown on clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  // Poll LM Studio connection every 15 seconds
  const { data: health } = useGetHealthQuery(undefined, {
    pollingInterval: 15000,
  });

  // Query personas if userPersona is not explicitly provided
  const { data: personas = [] } = useGetPersonasQuery(undefined, {
    skip: Boolean(userPersona),
  });
  const defaultPersona = personas.find((p) => p.isDefault) || personas[0];
  const activePersona = userPersona || defaultPersona;

  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState(character?.persona || "");
  const [updateCharacter, { isLoading: isSavingPersona }] = useUpdateCharacterMutation();

  useEffect(() => {
    setEditingPersona(character?.persona || "");
  }, [character?.persona]);

  const handleSavePersona = async () => {
    if (!character?.id) return;
    try {
      await updateCharacter({
        id: character.id,
        data: { persona: editingPersona.trim() || null },
      }).unwrap();
      setIsPersonaModalOpen(false);
    } catch (e) {
      console.error("Failed to update character persona:", e);
    }
  };

  const isConnected = Boolean(health?.connected);

  return (
    <header
      className={`relative z-40 w-full min-h-[4rem] sm:min-h-[4rem] sm:h-16 flex-shrink-0 border-b transition-all duration-300 flex items-center justify-between px-3 sm:px-6 pb-2 sm:pb-0 pt-[max(env(safe-area-inset-top),1.5rem)] sm:pt-[env(safe-area-inset-top)] ${
        zenMode
          ? "opacity-0 pointer-events-none -translate-y-4"
          : "opacity-100 glass-panel border-white/10 shadow-lg"
      }`}
    >
      {/* Left side: Sidebar Toggle & Character Identity */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Show Hamburger & Logo in Navbar when Sidebar is COLLAPSED */}
        {!sidebarOpen && (
          <div className="flex items-center gap-1.5 sm:gap-2.5 mr-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => dispatch(toggleSidebar())}
              className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title="Open Navigation Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo shown on desktop, or on mobile only if no character is active */}
            <Link
              to="/"
              className={`items-center gap-2 group ${
                character ? "hidden sm:flex" : "flex"
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
                Ω
              </div>
              <span className="font-bold text-base tracking-tight text-white hidden md:inline group-hover:text-brand-300 transition-colors">
                Aegis AI
              </span>
            </Link>
          </div>
        )}

        {/* Character Identity & Clickable Profile Drawer Trigger */}
        {character && (
          <div
            className={`flex items-center gap-1.5 sm:gap-2 min-w-0 ${
              !sidebarOpen ? "pl-2 sm:pl-3 border-l border-white/10" : ""
            }`}
          >
            <button
              type="button"
              onClick={onOpenCharacterProfile}
              className="flex items-center gap-2 group py-1 px-1.5 sm:px-2 rounded-xl hover:bg-white/5 transition-all text-left min-w-0"
              title="Open Character Dossier & Past Chat History"
            >
              {character.avatarUrl && (
                <img
                  src={character.avatarUrl}
                  alt=""
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-white/10 group-hover:border-brand-400 transition-colors flex-shrink-0"
                />
              )}
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="font-semibold text-sm text-slate-100 group-hover:text-brand-300 transition-colors truncate max-w-[130px] xs:max-w-[170px] sm:max-w-xs">
                    {character.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-brand-300 transition-colors flex-shrink-0" />
                </div>
                {character.tagline && (
                  <span className="text-[10px] text-slate-400 hidden md:inline truncate max-w-xs">
                    {character.tagline}
                  </span>
                )}
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Right side: Desktop Direct Actions + Mobile 3-Dots Menu */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Desktop Direct Controls (Visible on md: and up) */}
        <div className="hidden md:flex items-center gap-1.5 lg:gap-2">
          {/* 1. LM Studio Status Pill */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-dark-900/60 border border-white/5 backdrop-blur-sm text-xs">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                isConnected ? "bg-emerald-400 animate-pulse" : "bg-red-400"
              }`}
            />
            <span className="font-mono text-[11px] text-slate-300 max-w-[120px] truncate">
              {isConnected ? health?.model || "LM Studio" : "Offline"}
            </span>
          </div>

          {/* 2. Zen Mode Toggle */}
          {showChatControls && (
            <button
              type="button"
              onClick={() => dispatch(toggleZenMode())}
              className={`p-1.5 rounded-xl transition-all ${
                zenMode
                  ? "bg-brand-600/30 text-white border border-brand-500/40"
                  : "hover:bg-white/10 text-slate-400 hover:text-white"
              }`}
              title="Zen Wallpaper Mode"
            >
              {zenMode ? <Eye className="w-4 h-4 text-brand-400" /> : <EyeOff className="w-4 h-4" />}
            </button>
          )}

          {/* 3. Character Memories Drawer Trigger */}
          {showChatControls && (
            <button
              type="button"
              onClick={() => dispatch(toggleMemoryDrawer())}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors border border-transparent hover:border-white/5 text-xs font-medium"
              title="Character Memories"
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden lg:inline text-xs">Memories</span>
              {memoriesCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30">
                  {memoriesCount}
                </span>
              )}
            </button>
          )}

          {/* 3.5 In-Chat Persona & Behavior Editor */}
          {character && (
            <button
              type="button"
              onClick={() => {
                setEditingPersona(character.persona || "");
                setIsPersonaModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors border border-transparent hover:border-white/5 text-xs font-medium"
              title="Adjust Character Persona & Demeanor"
            >
              <Sliders className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden lg:inline text-xs">Persona</span>
            </button>
          )}

          {/* 4. Delete Messages Mode Toggle */}
          {showChatControls && onToggleDeleteMode && (
            <button
              type="button"
              onClick={onToggleDeleteMode}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-colors text-xs font-medium ${
                isDeleteMode
                  ? "bg-red-500/20 text-red-300 border border-red-500/30"
                  : "hover:bg-white/10 text-slate-400 hover:text-red-400"
              }`}
              title="Delete Messages"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden lg:inline text-xs">{isDeleteMode ? "Cancel" : "Delete"}</span>
            </button>
          )}

          {/* 5. Soft Refresh Chat */}
          {showChatControls && onRefreshChat && (
            <button
              type="button"
              onClick={onRefreshChat}
              disabled={isRefreshing}
              className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
              title="Refresh Chat"
            >
              <RotateCw className={`w-3.5 h-3.5 text-emerald-400 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          )}

          {/* 6. Switch User Persona */}
          <button
            type="button"
            onClick={() => dispatch(setPersonaModalOpen(true))}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-dark-900/80 hover:bg-dark-800 border border-white/10 text-xs text-slate-200 transition-colors"
            title="Switch User Persona"
          >
            {activePersona?.avatarUrl ? (
              <img
                src={activePersona.avatarUrl}
                alt=""
                className="w-4 h-4 rounded-full object-cover border border-white/20 flex-shrink-0"
              />
            ) : (
              <User className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
            )}
            <span className="font-medium max-w-[80px] truncate text-xs">
              {activePersona?.name || "Persona"}
            </span>
          </button>
        </div>

        {/* Mobile 3-Dots Consolidated Dropdown Menu (ONLY on mobile `< md`) */}
        <div className="relative flex items-center md:hidden" ref={menuRef}>
          {/* 3-Dots Menu Trigger Button */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`p-2 rounded-xl transition-all duration-200 relative flex items-center justify-center ${
              isMenuOpen
                ? "bg-brand-600/30 text-white border border-brand-500/40"
                : "hover:bg-white/10 text-slate-300 hover:text-white border border-transparent"
            }`}
            title="More options & settings"
          >
            <MoreVertical className="w-5 h-5" />
            {/* Active Memories indicator badge dot */}
            {memoriesCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse ring-2 ring-dark-950" />
            )}
          </button>

        {/* Floating Glassmorphic Dropdown Menu */}
        {isMenuOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 glass-panel bg-dark-950/95 border border-white/10 shadow-2xl rounded-2xl p-2 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 z-50 flex flex-col gap-1">
            {/* 1. LM Studio Status Banner */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-dark-900/70 border border-white/5 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    isConnected ? "bg-emerald-400 animate-pulse" : "bg-red-400"
                  }`}
                />
                <span className="text-xs font-mono truncate text-slate-200">
                  {isConnected ? health?.model || "LM Studio Active" : "LM Studio Offline"}
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 ml-2">
                {isConnected ? "Ready" : "Offline"}
              </span>
            </div>

            {/* 2. Zen Wallpaper Mode */}
            {showChatControls && (
              <button
                type="button"
                onClick={() => {
                  dispatch(toggleZenMode());
                  setIsMenuOpen(false);
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 text-xs font-medium transition-colors text-left"
              >
                {zenMode ? (
                  <Eye className="w-4 h-4 text-brand-400" />
                ) : (
                  <EyeOff className="w-4 h-4 text-slate-400" />
                )}
                <span>Zen Wallpaper Mode</span>
              </button>
            )}

            {/* 3. Character Memory Bank */}
            {showChatControls && (
              <button
                type="button"
                onClick={() => {
                  dispatch(toggleMemoryDrawer());
                  setIsMenuOpen(false);
                }}
                className="flex items-center justify-between w-full px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 text-xs font-medium transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Bookmark className="w-4 h-4 text-amber-400" />
                  <span>Character Memories</span>
                </div>
                {memoriesCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30">
                    {memoriesCount}
                  </span>
                )}
              </button>
            )}

            {/* 4. Past Chat History */}
            {showChatControls && onOpenCharacterProfile && (
              <button
                type="button"
                onClick={() => {
                  onOpenCharacterProfile();
                  setIsMenuOpen(false);
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 text-xs font-medium transition-colors text-left"
              >
                <History className="w-4 h-4 text-brand-400" />
                <span>Chat Sessions History</span>
              </button>
            )}

            {/* 4.5 Adjust Character Persona & Behavior */}
            {character && (
              <button
                type="button"
                onClick={() => {
                  setEditingPersona(character.persona || "");
                  setIsPersonaModalOpen(true);
                  setIsMenuOpen(false);
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 text-xs font-medium transition-colors text-left"
              >
                <Sliders className="w-4 h-4 text-purple-400" />
                <span>Adjust Persona & Demeanor</span>
              </button>
            )}

            {/* 5. Direct Edit Character */}
            {character && (
              <Link
                to={`/characters/${character.id}/edit`}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 text-xs font-medium transition-colors text-left"
              >
                <Edit3 className="w-4 h-4 text-purple-400" />
                <span>Edit Character Lore & Wallpaper</span>
              </Link>
            )}

            {/* 6. Soft Refresh Chat */}
            {showChatControls && onRefreshChat && (
              <button
                type="button"
                onClick={() => {
                  onRefreshChat();
                  setIsMenuOpen(false);
                }}
                disabled={isRefreshing}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 text-xs font-medium transition-colors text-left disabled:opacity-50"
              >
                <RotateCw
                  className={`w-4 h-4 text-emerald-400 ${
                    isRefreshing ? "animate-spin" : ""
                  }`}
                />
                <span>{isRefreshing ? "Syncing Chat..." : "Refresh Chat"}</span>
              </button>
            )}

            {/* 7. Delete Messages Mode */}
            {showChatControls && onToggleDeleteMode && (
              <button
                type="button"
                onClick={() => {
                  onToggleDeleteMode();
                  setIsMenuOpen(false);
                }}
                className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                  isDeleteMode
                    ? "bg-red-500/20 text-red-300 border border-red-500/30"
                    : "hover:bg-red-500/10 text-red-400"
                }`}
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>{isDeleteMode ? "Cancel Delete Mode" : "Delete Messages"}</span>
              </button>
            )}

            <div className="my-1 border-t border-white/10" />

            {/* 8. Switch User Persona */}
            <button
              type="button"
              onClick={() => {
                dispatch(setPersonaModalOpen(true));
                setIsMenuOpen(false);
              }}
              className="flex items-center justify-between w-full px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 text-xs font-medium transition-colors text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {activePersona?.avatarUrl ? (
                  <img
                    src={activePersona.avatarUrl}
                    alt=""
                    className="w-4 h-4 rounded-full object-cover border border-white/20 flex-shrink-0"
                  />
                ) : (
                  <User className="w-4 h-4 text-brand-400 flex-shrink-0" />
                )}
                <span className="truncate">Persona: {activePersona?.name || "Default"}</span>
              </div>
              <span className="text-[10px] text-brand-400 font-semibold uppercase tracking-wider">
                Switch
              </span>
            </button>
          </div>
        )}
        </div>
      </div>

      {/* Lightweight In-Chat Persona Editor Modal */}
      {isPersonaModalOpen && character && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg p-6 rounded-3xl glass-panel bg-dark-950/95 border border-white/15 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Adjust Persona & Demeanor</h3>
                  <p className="text-[11px] text-slate-400">
                    Tune how {character.name} acts and speaks right now without resetting your conversation.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPersonaModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Layer 2: Character Persona (Speaking Style, Attitude, Demeanor)
              </label>
              <textarea
                rows={4}
                value={editingPersona}
                onChange={(e) => setEditingPersona(e.target.value)}
                placeholder="e.g. Speaks poetically with subtle, dry sarcasm. Guarded at first. Becomes formal when flustered."
                className="w-full px-3 py-2.5 text-xs rounded-xl bg-dark-900 border border-white/10 text-white focus:outline-none focus:border-brand-500 font-mono leading-relaxed resize-y"
              />
              <p className="text-[10px] text-slate-500">
                Takes effect on your next message. Leaves all chat history and canonical lore completely intact.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setIsPersonaModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePersona}
                disabled={isSavingPersona}
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-500/25 transition-all disabled:opacity-50"
              >
                {isSavingPersona ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
};
