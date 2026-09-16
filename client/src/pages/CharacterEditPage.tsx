import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Sparkles, Sliders, Bot, Trash2 } from "lucide-react";
import {
  useGetCharacterQuery,
  useUpdateCharacterMutation,
  useDeleteCharacterMutation,
} from "../api/baseApi.js";
import { ImageUpload } from "../components/shared/ImageUpload.js";
import { Header } from "../components/layout/Header.js";

export const CharacterEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: character, isLoading } = useGetCharacterQuery(id || "", {
    skip: !id,
  });
  const [updateCharacter, { isLoading: isUpdating }] = useUpdateCharacterMutation();
  const [deleteCharacter] = useDeleteCharacterMutation();

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

  useEffect(() => {
    if (character) {
      setName(character.name);
      setTagline(character.tagline || "");
      setDescription(character.description || "");
      setGreeting(character.greeting);
      setSystemPrompt(character.systemPrompt);
      setExampleDialogue(character.exampleDialogue || "");
      setAvatarUrl(character.avatarUrl || null);
      setBackgroundUrl(character.backgroundUrl || null);
      setBgBlur(character.bgBlur ?? 0);
      setBgDim(character.bgDim ?? 40);
    }
  }, [character]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError(null);

    try {
      await updateCharacter({
        id,
        data: {
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
        },
      }).unwrap();

      navigate("/");
    } catch (err: any) {
      setError(err.data?.error || err.message || "Failed to update character");
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (window.confirm(`Are you sure you want to delete ${character?.name}? All chat history with this character will be permanently deleted.`)) {
      await deleteCharacter(id).unwrap();
      navigate("/");
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-dark-950 text-slate-400">
        Loading character details...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-dark-950 overflow-y-auto">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-8 pb-32 sm:pb-24 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-2 rounded-xl bg-dark-900/80 hover:bg-dark-800 text-slate-400 hover:text-white border border-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Edit Character Definition</h1>
              <p className="text-xs text-slate-400">Update persona parameters, avatar, and wallpaper</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDelete}
            className="px-3.5 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Delete Character
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Visuals */}
          <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-6">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-400" /> Visuals & Wallpaper
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col p-4 rounded-2xl bg-dark-900/40 border border-white/5 w-full">
                <ImageUpload
                  type="avatar"
                  currentUrl={avatarUrl}
                  onUploadSuccess={(url) => setAvatarUrl(url)}
                  label="Profile Avatar"
                  className="w-full"
                />
              </div>

              <div className="md:col-span-2 flex flex-col p-4 rounded-2xl bg-dark-900/40 border border-white/5 space-y-4">
                <ImageUpload
                  type="wallpaper"
                  currentUrl={backgroundUrl}
                  onUploadSuccess={(url) => setBackgroundUrl(url)}
                  label="Chat Background Wallpaper"
                  className="w-full"
                />

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

          {/* Details */}
          <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-6">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Bot className="w-4 h-4 text-purple-400" /> Identity
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-dark-900 border border-white/10 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tagline</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-dark-900 border border-white/10 text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Opening Greeting
              </label>
              <textarea
                required
                rows={4}
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-dark-900 border border-white/10 text-white focus:outline-none focus:border-brand-500 font-mono text-xs leading-relaxed"
              />
            </div>
          </div>

          {/* Prompt */}
          <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-6">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" /> System Instructions
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                System Prompt
              </label>
              <textarea
                required
                rows={6}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-dark-900 border border-white/10 text-white focus:outline-none focus:border-brand-500 font-mono text-xs leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Example Dialogue
              </label>
              <textarea
                rows={3}
                value={exampleDialogue}
                onChange={(e) => setExampleDialogue(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-dark-900 border border-white/10 text-white focus:outline-none focus:border-brand-500 font-mono text-xs leading-relaxed"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 pb-12">
            <Link
              to="/"
              className="w-full sm:w-auto text-center px-6 py-3.5 rounded-2xl bg-dark-900 hover:bg-dark-800 text-slate-300 text-xs font-semibold transition-colors flex items-center justify-center border border-white/5"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isUpdating}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-xl shadow-brand-500/25 transition-all flex items-center justify-center disabled:opacity-50"
            >
              {isUpdating ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};
