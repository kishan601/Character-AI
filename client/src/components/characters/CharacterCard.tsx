import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageSquare, Settings, Bot, Sparkles } from "lucide-react";
import { Character, useResumeSessionMutation } from "../../api/baseApi.js";

interface CharacterCardProps {
  character: Character;
}

export const CharacterCard: React.FC<CharacterCardProps> = React.memo(({ character }) => {
  const navigate = useNavigate();
  const [resumeSession, { isLoading }] = useResumeSessionMutation();

  const handleStartChat = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const session = await resumeSession({ characterId: character.id }).unwrap();
      navigate(`/chat/${session.id}`);
    } catch (err) {
      console.error("Failed to resume session:", err);
    }
  };

  return (
    <div
      data-testid="character-card"
      onClick={handleStartChat}
      style={{ willChange: "transform" }}
      className="group relative rounded-3xl overflow-hidden bg-dark-900/85 hover:bg-dark-900/95 border border-white/10 hover:border-brand-500/40 transition-all duration-300 hover:shadow-2xl hover:shadow-brand-950/40 flex flex-col h-full cursor-pointer"
    >
      {/* Background Wallpaper Banner */}
      <div className="h-28 w-full relative overflow-hidden bg-gradient-to-br from-dark-900 via-dark-800 to-brand-950">
        {character.backgroundUrl && (
          <img
            src={character.backgroundUrl}
            alt={character.name}
            decoding="async"
            loading="lazy"
            className="w-full h-full object-cover opacity-60 group-hover:scale-105 group-hover:opacity-75 transition-[transform,opacity] duration-500"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/40 to-transparent" />

        {/* Quick Edit button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            navigate(`/characters/${character.id}/edit`);
          }}
          className="absolute top-3 right-3 p-2 rounded-xl bg-dark-950/70 hover:bg-dark-900 text-slate-400 hover:text-white border border-white/10 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all backdrop-blur-md z-20"
          title="Edit Character Definition"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Avatar & Details */}
      <div className="p-5 pt-0 flex-1 flex flex-col -mt-10 relative z-10">
        <div className="flex items-end justify-between mb-3">
          {character.avatarUrl ? (
            <img
              src={character.avatarUrl}
              alt={character.name}
              decoding="async"
              className="w-16 h-16 rounded-2xl object-cover border-2 border-brand-500/40 shadow-xl ring-4 ring-dark-950 group-hover:border-brand-400 transition-colors"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-brand-900/70 flex items-center justify-center text-brand-300 border-2 border-brand-500/40 shadow-xl ring-4 ring-dark-950">
              <Bot className="w-8 h-8" />
            </div>
          )}

          <button
            type="button"
            onClick={handleStartChat}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all flex items-center gap-1.5 hover:scale-105 active:scale-95"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat</span>
          </button>
        </div>

        <h3 className="font-bold text-lg text-white group-hover:text-brand-300 transition-colors">
          {character.name}
        </h3>

        {character.tagline && (
          <p className="text-xs font-medium text-brand-400 mt-0.5 line-clamp-1">
            {character.tagline}
          </p>
        )}


        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
          <span>{character._count?.sessions || 0} chats</span>
          <span className="text-brand-400 flex items-center gap-1 font-medium">
            <Sparkles className="w-3 h-3" /> Unfiltered RP
          </span>
        </div>
      </div>
    </div>
  );
}, (prev, next) =>
  prev.character.id === next.character.id &&
  prev.character.name === next.character.name &&
  prev.character.avatarUrl === next.character.avatarUrl &&
  prev.character.backgroundUrl === next.character.backgroundUrl &&
  prev.character.tagline === next.character.tagline &&
  prev.character._count?.sessions === next.character._count?.sessions
);
