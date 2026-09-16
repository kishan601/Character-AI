import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Sparkles, Sliders, Info, Bot } from "lucide-react";
import { useCreateCharacterMutation, useCreateSessionMutation } from "../api/baseApi.js";
import { ImageUpload } from "../components/shared/ImageUpload.js";
import { Header } from "../components/layout/Header.js";

export const CharacterCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [createCharacter, { isLoading }] = useCreateCharacterMutation();
  const [createSession] = useCreateSessionMutation();

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [greeting, setGreeting] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [exampleDialogue, setExampleDialogue] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [bgBlur, setBgBlur] = useState<number>(0);
  const [bgDim, setBgDim] = useState<number>(40);

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !greeting.trim() || !systemPrompt.trim()) {
      setError("Name, Greeting, and System Prompt are required.");
      return;
    }

    try {
      const char = await createCharacter({
        name: name.trim(),
        tagline: tagline.trim() || null,
        description: description.trim() || null,
        greeting: greeting.trim(),
        systemPrompt: systemPrompt.trim(),
        exampleDialogue: exampleDialogue.trim() || null,
        avatarUrl,
        backgroundUrl,
        bgBlur,
        bgDim,
      }).unwrap();

      // Automatically create a new session and navigate to chat
      const session = await createSession({ characterId: char.id }).unwrap();
      navigate(`/chat/${session.id}`);
    } catch (err: any) {
      setError(err.data?.error || err.message || "Failed to create character");
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-dark-950 overflow-y-auto">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-8 pb-32 sm:pb-24 space-y-8">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-2 rounded-xl bg-dark-900/80 hover:bg-dark-800 text-slate-400 hover:text-white border border-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Character Studio</h1>
            <p className="text-xs text-slate-400">
              Build your custom uncensored AI character with personalized system instructions, memory, and visuals.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Visual Identity */}
          <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-6">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-400" /> Visual Identity & Wallpapers
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Avatar Upload */}
              <div className="flex flex-col p-4 rounded-2xl bg-dark-900/40 border border-white/5 w-full">
                <ImageUpload
                  type="avatar"
                  currentUrl={avatarUrl}
                  onUploadSuccess={(url) => setAvatarUrl(url)}
                  label="Profile Avatar"
                  className="w-full"
                />
              </div>

              {/* Background Wallpaper Upload */}
              <div className="md:col-span-2 flex flex-col p-4 rounded-2xl bg-dark-900/40 border border-white/5 space-y-4">
                <ImageUpload
                  type="wallpaper"
                  currentUrl={backgroundUrl}
                  onUploadSuccess={(url) => setBackgroundUrl(url)}
                  label="Chat Background Wallpaper"
                  className="w-full"
                />

                {/* Wallpaper Blur & Dim sliders */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Wallpaper Blur</span>
                      <span className="font-mono text-brand-400">{bgBlur}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={15}
                      value={bgBlur}
                      onChange={(e) => setBgBlur(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Overlay Dimming</span>
                      <span className="font-mono text-brand-400">{bgDim}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={85}
                      value={bgDim}
                      onChange={(e) => setBgDim(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Core Details */}
          <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-6">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Bot className="w-4 h-4 text-purple-400" /> Identity & Introduction
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Character Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Saber, Geralt, Yennefer"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-dark-900 border border-white/10 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tagline (Subtitle)
                </label>
                <input
                  type="text"
                  placeholder="e.g. King of Knights / Wandering Witcher"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-dark-900 border border-white/10 text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Opening Greeting Message <span className="text-red-400">*</span>
              </label>
              <p className="text-[11px] text-slate-400 mb-2">
                This is the first message the character says when a new chat starts. Set the scene and tone! Supports <code>&#123;&#123;user&#125;&#125;</code> and <code>*actions*</code>.
              </p>
              <textarea
                required
                rows={4}
                placeholder="*The fire crackles in the hearth as she looks up from her book.* &quot;Welcome home, {{user}}. You're later than usual.&quot;"
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-dark-900 border border-white/10 text-white focus:outline-none focus:border-brand-500 font-mono text-xs leading-relaxed resize-y"
              />
            </div>
          </div>

          {/* Section 3: AI Brain & Behavior */}
          <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-6">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" /> Behavioral Instructions & Lore
            </h2>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  System Prompt (Character Lore & Personality) <span className="text-red-400">*</span>
                </label>
                <span className="text-[11px] text-brand-400 font-mono">
                  Macros: &#123;&#123;char&#125;&#125; and &#123;&#123;user&#125;&#125;
                </span>
              </div>
              <textarea
                required
                rows={6}
                placeholder="Describe personality, speech habits, background lore, likes/dislikes, physical appearance, and boundaries. Example: You are {{char}}, a sarcastic cybernetic mercenary who..."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-dark-900 border border-white/10 text-white focus:outline-none focus:border-brand-500 font-mono text-xs leading-relaxed resize-y"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Example Dialogue (Optional few-shot calibration)
              </label>
              <textarea
                rows={3}
                placeholder="{{user}}: Do you trust me?&#10;{{char}}: *A cynical grin crosses her lips.* &quot;Trust is expensive in this city.&quot;"
                value={exampleDialogue}
                onChange={(e) => setExampleDialogue(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-dark-900 border border-white/10 text-white focus:outline-none focus:border-brand-500 font-mono text-xs leading-relaxed resize-y"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 pb-12">
            <Link
              to="/"
              className="w-full sm:w-auto text-center px-6 py-3.5 rounded-2xl bg-dark-900 hover:bg-dark-800 text-slate-300 text-xs font-semibold transition-colors flex items-center justify-center border border-white/5"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-xl shadow-brand-500/25 transition-all hover:scale-105 active:scale-95 flex items-center justify-center disabled:opacity-50"
            >
              {isLoading ? "Summoning Character..." : "Create & Start Chatting"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};
