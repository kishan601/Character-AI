import React from "react";
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
} from "lucide-react";
import { RootState } from "../../store/store.js";
import {
  toggleSidebar,
  toggleMemoryDrawer,
  setPersonaModalOpen,
} from "../../store/uiSlice.js";
import {
  useGetHealthQuery,
  useGetPersonasQuery,
  Character,
  UserPersona,
} from "../../api/baseApi.js";
import { ZenToggleButton } from "../chat/ZenToggleButton.js";

interface HeaderProps {
  character?: Character | null;
  userPersona?: UserPersona | null;
  memoriesCount?: number;
  showChatControls?: boolean;
  onRefreshChat?: () => void;
  isRefreshing?: boolean;
  onOpenCharacterProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  character,
  userPersona,
  memoriesCount = 0,
  showChatControls = false,
  onRefreshChat,
  isRefreshing = false,
  onOpenCharacterProfile,
}) => {
  const dispatch = useDispatch();
  const zenMode = useSelector((state: RootState) => state.ui.zenMode);
  const sidebarOpen = useSelector((state: RootState) => state.ui.sidebarOpen);

  // Poll LM Studio connection every 15 seconds
  const { data: health } = useGetHealthQuery(undefined, {
    pollingInterval: 15000,
  });

  // Query personas if userPersona is not explicitly provided (e.g. on HomePage, Settings)
  const { data: personas = [] } = useGetPersonasQuery(undefined, {
    skip: Boolean(userPersona),
  });
  const defaultPersona = personas.find((p) => p.isDefault) || personas[0];
  const activePersona = userPersona || defaultPersona;

  const isConnected = Boolean(health?.connected);

  return (
    <header
      className={`relative z-40 w-full h-16 border-b transition-all duration-300 flex items-center justify-between px-4 sm:px-6 ${
        zenMode
          ? "opacity-0 pointer-events-none -translate-y-4"
          : "opacity-100 glass-panel border-white/10 shadow-lg"
      }`}
    >
      {/* Left side: Sidebar Toggle & Character Identity */}
      <div className="flex items-center gap-3">
        {/* Show Hamburger & Logo in Navbar when Sidebar is COLLAPSED (mobile and desktop) */}
        {!sidebarOpen && (
          <div className="flex items-center gap-2.5 mr-2">
            <button
              type="button"
              onClick={() => dispatch(toggleSidebar())}
              className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title="Open Navigation Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
                Ω
              </div>
              <span className="font-bold text-base tracking-tight text-white hidden sm:inline group-hover:text-brand-300 transition-colors">
                Aegis AI
              </span>
            </Link>
          </div>
        )}

        {/* Character Identity & Clickable Profile Drawer Trigger */}
        {character && (
          <div className={`flex items-center gap-2 ${!sidebarOpen ? "pl-3 border-l border-white/10" : ""}`}>
            <button
              type="button"
              onClick={onOpenCharacterProfile}
              className="flex items-center gap-2 group py-1 px-2 rounded-xl hover:bg-white/5 transition-all text-left"
              title="Open Character Dossier & Past Chat History"
            >
              {character.avatarUrl && (
                <img
                  src={character.avatarUrl}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover border border-white/10 group-hover:border-brand-400 transition-colors"
                />
              )}
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-sm text-slate-100 group-hover:text-brand-300 transition-colors">
                    {character.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-brand-300 transition-colors" />
                </div>
                {character.tagline && (
                  <span className="text-[10px] text-slate-400 hidden md:inline truncate max-w-xs">
                    {character.tagline}
                  </span>
                )}
              </div>
            </button>

            {/* In-Chat Soft Refresh Button (seamless re-sync without full page reload) */}
            {onRefreshChat && (
              <button
                type="button"
                onClick={onRefreshChat}
                disabled={isRefreshing}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all ml-0.5"
                title="Refresh chat messages seamlessly"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-brand-400" : ""}`} />
              </button>
            )}

            {/* Direct Edit Character Button */}
            <Link
              to={`/characters/${character.id}/edit`}
              id="header-edit-character-btn"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-dark-900/80 hover:bg-brand-600/20 text-slate-300 hover:text-white border border-white/10 hover:border-brand-500/40 text-xs font-medium transition-all ml-1 shadow-xs"
              title="Edit Character Definition, Lore, Avatar & Wallpaper"
            >
              <Edit3 className="w-3.5 h-3.5 text-brand-400" />
              <span className="hidden sm:inline">Edit Character</span>
            </Link>
          </div>
        )}
      </div>

      {/* Right side: LM Studio Health + Personas + Memories + Recent History + Zen Wallpaper Button */}
      <div className="flex items-center gap-2">
        {/* LM Studio Connection Indicator */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            isConnected
              ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
              : "bg-red-950/40 border-red-500/30 text-red-300"
          }`}
          title={
            isConnected
              ? `Connected to LM Studio (${health?.model || "Model Loaded"})`
              : "LM Studio is Offline. Ensure LM Studio is started on port 1234."
          }
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected
                ? "bg-emerald-400 animate-pulse"
                : "bg-red-400"
            }`}
          />
          <span className="hidden sm:inline text-[11px] font-mono">
            {isConnected ? health?.model || "LM Studio" : "Offline"}
          </span>
        </div>

        {/* User Persona Switcher */}
        <button
          type="button"
          onClick={() => dispatch(setPersonaModalOpen(true))}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-900/80 hover:bg-dark-800 text-slate-300 hover:text-white border border-white/10 text-xs font-medium transition-all shadow-sm"
          title="Switch User Persona Profile"
        >
          {activePersona?.avatarUrl ? (
            <img
              src={activePersona.avatarUrl}
              alt=""
              className="w-4 h-4 rounded-full object-cover border border-white/20"
            />
          ) : (
            <User className="w-3.5 h-3.5 text-brand-400" />
          )}
          <span className="hidden md:inline">{activePersona?.name || "Persona"}</span>
        </button>

        {/* Character Memory Bank Trigger */}
        {showChatControls && (
          <button
            type="button"
            onClick={() => dispatch(toggleMemoryDrawer())}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-900/80 hover:bg-dark-800 text-slate-300 hover:text-amber-300 border border-white/10 text-xs font-medium transition-all shadow-sm"
            title="Open Character Memory Bank"
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Memories</span>
            {memoriesCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30">
                {memoriesCount}
              </span>
            )}
          </button>
        )}

        {/* Recent History Trigger (opens this character's multiple chat history) */}
        {showChatControls && (
          <button
            type="button"
            onClick={onOpenCharacterProfile}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-900/80 hover:bg-dark-800 text-slate-300 hover:text-brand-300 border border-white/10 text-xs font-medium transition-all shadow-sm group"
            title="View Recent Chat History with this Character"
          >
            <History className="w-3.5 h-3.5 text-brand-400 group-hover:rotate-[-20deg] transition-transform" />
            <span className="hidden sm:inline">History</span>
          </button>
        )}

        {/* Zen Wallpaper Mode Button (In-Track aligned in navbar) */}
        {showChatControls && <ZenToggleButton />}
      </div>
    </header>
  );
};
