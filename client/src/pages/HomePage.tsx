import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Search, PlusCircle, Sparkles, Bot, ShieldCheck } from "lucide-react";
import { useGetCharactersQuery } from "../api/baseApi.js";
import { CharacterCard } from "../components/characters/CharacterCard.js";
import { Header } from "../components/layout/Header.js";

export const HomePage: React.FC = () => {
  const { data: characters = [], isLoading } = useGetCharactersQuery();
  const [search, setSearch] = useState("");

  const filtered = characters.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.tagline?.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-dark-950 overflow-y-auto">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 sm:p-8 space-y-8">
        {/* Hero Section */}
        <div className="relative rounded-3xl p-8 sm:p-10 overflow-hidden glass-panel border border-white/10 shadow-2xl bg-gradient-to-r from-dark-900 via-dark-850 to-brand-950/40">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-semibold border border-brand-500/30">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% Private, Local & Unfiltered
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Create & Chat with AI Personas
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Powered by LM Studio running on your hardware. No censorship, no subscriptions, unlimited context memory, and full creative roleplay freedom.
            </p>

            <div className="pt-2 flex items-center gap-3">
              <Link
                to="/characters/new"
                className="px-5 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95"
              >
                <PlusCircle className="w-4 h-4" /> Create Character
              </Link>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search characters by name, genre, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-dark-900/80 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline font-mono">
            {filtered.length} {filtered.length === 1 ? "character" : "characters"} available
          </span>
        </div>

        {/* Character Grid */}
        {isLoading ? (
          <div className="text-center py-20 text-slate-500">Loading characters...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <Bot className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-slate-400 font-medium">No characters found matching your search.</p>
            <Link
              to="/characters/new"
              className="inline-flex items-center gap-2 text-brand-400 hover:text-brand-300 text-sm font-semibold"
            >
              <PlusCircle className="w-4 h-4" /> Create this character now
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((char) => (
              <CharacterCard key={char.id} character={char} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
