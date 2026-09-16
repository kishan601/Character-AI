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

  const { data: character, isLoading, isError } = useGetCharacterQuery(id || "", {
    skip: !id,
  });
  const [updateCharacter, { isLoading: isUpdating }] = useUpdateCharacterMutation();
  const [deleteCharacter] = useDeleteCharacterMutation();

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [persona, setPersona] = useState("");
  const [gender, setGender] = useState("");
  const [pronounPreset, setPronounPreset] = useState("unspecified");
  const [pronounSubject, setPronounSubject] = useState("");
  const [pronounObject, setPronounObject] = useState("");
  const [pronounPossessive, setPronounPossessive] = useState("");
  const [pronounDeterminer, setPronounDeterminer] = useState("");
  const [isCustomPronouns, setIsCustomPronouns] = useState(false);

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
      setName(character.name || "");
      setTagline(character.tagline || "");
      setDescription(character.description || "");
      setPersona(character.persona || "");
      setGreeting(character.greeting || "");
      setSystemPrompt(character.systemPrompt || "");
      setExampleDialogue(character.exampleDialogue || "");
      setAvatarUrl(character.avatarUrl || null);
      setBackgroundUrl(character.backgroundUrl || null);
      setBgBlur(character.bgBlur ?? 0);
      setBgDim(character.bgDim ?? 40);

      // Populate gender and pronouns
      const g = character.gender || "";
      const ps = character.pronounSubject || "";
      const po = character.pronounObject || "";
      const pp = character.pronounPossessive || "";
      const pd = character.pronounDeterminer || "";

      setGender(g);
      setPronounSubject(ps);
      setPronounObject(po);
      setPronounPossessive(pp);
      setPronounDeterminer(pd);

      if (ps === "she" && po === "her") {
        setPronounPreset("female");
        setIsCustomPronouns(false);
      } else if (ps === "he" && po === "him") {
        setPronounPreset("male");
        setIsCustomPronouns(false);
      } else if (ps === "they" && po === "them") {
        setPronounPreset("non-binary");
        setIsCustomPronouns(false);
      } else if (!ps && !po) {
        setPronounPreset("unspecified");
        setIsCustomPronouns(false);
      } else {
        setPronounPreset("custom");
        setIsCustomPronouns(true);
      }
    }
  }, [character]);

  const handlePresetChange = (preset: string) => {
    setPronounPreset(preset);
    if (preset === "female") {
      setGender("female");
      setPronounSubject("she");
      setPronounObject("her");
      setPronounPossessive("hers");
      setPronounDeterminer("her");
      setIsCustomPronouns(false);
    } else if (preset === "male") {
      setGender("male");
      setPronounSubject("he");
      setPronounObject("him");
      setPronounPossessive("his");
      setPronounDeterminer("his");
      setIsCustomPronouns(false);
    } else if (preset === "non-binary") {
      setGender("non-binary");
      setPronounSubject("they");
      setPronounObject("them");
      setPronounPossessive("theirs");
      setPronounDeterminer("their");
      setIsCustomPronouns(false);
    } else if (preset === "unspecified") {
      setGender("");
      setPronounSubject("");
      setPronounObject("");
      setPronounPossessive("");
      setPronounDeterminer("");
      setIsCustomPronouns(false);
    } else if (preset === "custom") {
      setIsCustomPronouns(true);
    }
  };

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
          persona: persona.trim() || null,
          gender: gender.trim() || null,
          pronounSubject: pronounSubject.trim() || null,
          pronounObject: pronounObject.trim() || null,
          pronounPossessive: pronounPossessive.trim() || null,
          pronounDeterminer: pronounDeterminer.trim() || null,
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

  if (!character || isError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-dark-950 text-slate-400 gap-4 p-6 text-center">
        <Bot className="w-12 h-12 text-slate-600" />
        <div>
          <h2 className="text-lg font-bold text-white mb-1">Character Not Found</h2>
          <p className="text-xs text-slate-500 max-w-sm">
            This character may have been deleted or the ID is invalid.
          </p>
        </div>
        <Link
          to="/"
          className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Characters
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-dark-950 overflow-y-auto">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-8 space-y-8 pb-[calc(7rem+env(safe-area-inset-bottom,0px))]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-2 rounded-xl bg-dark-900/80 hover:bg-dark-800 text-slate-400 hover:text-white border border-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Edit Character</h1>
              <p className="text-xs text-slate-400">
                Modify 7-layer identity configuration, pronouns, definition, and appearance.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/20 text-xs font-semibold transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Delete Character</span>
          </button>
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
              <Sparkles className="w-4 h-4 text-brand-400" /> Visual Identity & Wallpaper
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-dark-900/40 border border-white/5">
                <ImageUpload
                  type="avatar"
                  currentUrl={avatarUrl}
                  onUploadSuccess={(url) => setAvatarUrl(url)}
                  label="Avatar"
                />
              </div>

              <div className="md:col-span-2 flex flex-col p-4 rounded-2xl bg-dark-900/40 border border-white/5 space-y-4">
                <ImageUpload
                  type="wallpaper"
                  currentUrl={backgroundUrl}
                  onUploadSuccess={(url) => setBackgroundUrl(url)}
                  label="Wallpaper"
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

          {/* Section 2: Identity & Pronoun Mapping */}
          <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-6">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Bot className="w-4 h-4 text-purple-400" /> Identity & Linguistic Configuration
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

            {/* Gender & Pronoun Configuration */}
            <div className="p-4 rounded-2xl bg-dark-900/50 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-semibold text-slate-200">
                    Gender & Linguistic Pronoun Map
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Deterministic pronouns prevent local models from reversing actor and recipient.
                  </p>
                </div>
                <select
                  value={pronounPreset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl bg-dark-800 border border-white/10 text-brand-300 focus:outline-none focus:border-brand-500 cursor-pointer"
                >
                  <option value="female">Female (she/her/hers)</option>
                  <option value="male">Male (he/him/his)</option>
                  <option value="non-binary">Non-Binary (they/them/theirs)</option>
                  <option value="unspecified">Unspecified / Neutral</option>
                  <option value="custom">Custom...</option>
                </select>
              </div>

              {(isCustomPronouns || pronounPreset !== "unspecified") && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-white/5">
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-400 mb-0.5">Subject</label>
                    <input
                      type="text"
                      placeholder="she / he / they"
                      value={pronounSubject}
                      onChange={(e) => {
                        setPronounSubject(e.target.value);
                        setIsCustomPronouns(true);
                        setPronounPreset("custom");
                      }}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-dark-950 border border-white/10 text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-400 mb-0.5">Object</label>
                    <input
                      type="text"
                      placeholder="her / him / them"
                      value={pronounObject}
                      onChange={(e) => {
                        setPronounObject(e.target.value);
                        setIsCustomPronouns(true);
                        setPronounPreset("custom");
                      }}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-dark-950 border border-white/10 text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-400 mb-0.5">Possessive</label>
                    <input
                      type="text"
                      placeholder="hers / his / theirs"
                      value={pronounPossessive}
                      onChange={(e) => {
                        setPronounPossessive(e.target.value);
                        setIsCustomPronouns(true);
                        setPronounPreset("custom");
                      }}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-dark-950 border border-white/10 text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-400 mb-0.5">Determiner</label>
                    <input
                      type="text"
                      placeholder="her / his / their"
                      value={pronounDeterminer}
                      onChange={(e) => {
                        setPronounDeterminer(e.target.value);
                        setIsCustomPronouns(true);
                        setPronounPreset("custom");
                      }}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-dark-950 border border-white/10 text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Opening Greeting
              </label>
              <textarea
                required
                rows={3}
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-dark-900 border border-white/10 text-white focus:outline-none focus:border-brand-500 font-mono text-xs leading-relaxed"
              />
            </div>
          </div>

          {/* Section 3: Definition, Persona & Instructions */}
          <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-6">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" /> Definition, Persona & Lore
            </h2>

            {/* Layer 1: Canonical Definition */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Layer 1: Canonical Character Definition (Who &#123;&#123;char&#125;&#125; is)
                </label>
                <span className="text-[11px] text-brand-400 font-mono">Persistent Core Lore</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">
                Define the character's canonical identity, backstory, origin, fixed traits, and core relationship with &#123;&#123;user&#125;&#125;.
              </p>
              <textarea
                rows={3}
                placeholder="Backstory, origin lore, and fixed traits..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-dark-900 border border-white/10 text-white focus:outline-none focus:border-brand-500 font-mono text-xs leading-relaxed resize-y"
              />
            </div>

            {/* Layer 2: Dynamic Persona */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Layer 2: Character Persona & Speaking Demeanor (How &#123;&#123;char&#125;&#125; behaves right now)
                </label>
                <span className="text-[11px] text-purple-400 font-mono">Editable Mid-Chat</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">
                Define speaking style, current mood, conversational manner, and behavioral quirks.
              </p>
              <textarea
                rows={3}
                placeholder="Speaking habits, attitude, demeanor..."
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-dark-900 border border-white/10 text-white focus:outline-none focus:border-brand-500 font-mono text-xs leading-relaxed resize-y"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                System Prompt (Directives & Universe Rules)
              </label>
              <textarea
                required
                rows={4}
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
                rows={2}
                value={exampleDialogue}
                onChange={(e) => setExampleDialogue(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-dark-900 border border-white/10 text-white focus:outline-none focus:border-brand-500 font-mono text-xs leading-relaxed"
              />
            </div>
          </div>

          <div className="sticky bottom-4 z-20 flex items-center justify-end gap-3 p-3 sm:p-4 rounded-2xl bg-dark-950/90 border border-white/10 backdrop-blur-xl shadow-2xl">
            <Link
              to="/"
              className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-dark-900 hover:bg-dark-800 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isUpdating}
              className="px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-xl shadow-brand-500/25 transition-all flex items-center gap-2"
            >
              {isUpdating ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};
