import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Server, User, Database, Sparkles, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { useGetHealthQuery, useGetPersonasQuery, useCreatePersonaMutation, useDeletePersonaMutation, useUpdatePersonaMutation } from "../api/baseApi.js";
import { Header } from "../components/layout/Header.js";
import { ImageUpload } from "../components/shared/ImageUpload.js";

export const SettingsPage: React.FC = () => {
  const { data: health, refetch: refetchHealth, isFetching: isCheckingHealth } = useGetHealthQuery();
  const { data: personas = [], refetch: refetchPersonas } = useGetPersonasQuery();
  const [createPersona] = useCreatePersonaMutation();
  const [updatePersona] = useUpdatePersonaMutation();
  const [deletePersona] = useDeletePersonaMutation();

  const [newPersonaName, setNewPersonaName] = useState("");
  const [newPersonaDesc, setNewPersonaDesc] = useState("");
  const [newPersonaAvatar, setNewPersonaAvatar] = useState<string | null>(null);
  const [newPersonaGender, setNewPersonaGender] = useState("male");
  const [newPersonaPreset, setNewPersonaPreset] = useState("male");
  const [newPronounSubject, setNewPronounSubject] = useState("he");
  const [newPronounObject, setNewPronounObject] = useState("him");
  const [newPronounPossessive, setNewPronounPossessive] = useState("his");
  const [newPronounDeterminer, setNewPronounDeterminer] = useState("his");
  const [isCustomPronouns, setIsCustomPronouns] = useState(false);
  const [isAddingPersona, setIsAddingPersona] = useState(false);
  const [editingPersonaId, setEditingPersonaId] = useState<string | null>(null);

  const handleCancelForm = () => {
    setNewPersonaName("");
    setNewPersonaDesc("");
    setNewPersonaAvatar(null);
    setEditingPersonaId(null);
    setIsAddingPersona(false);
  };

  const openEditPersona = (p: any) => {
    setEditingPersonaId(p.id);
    setNewPersonaName(p.name);
    setNewPersonaDesc(p.description || "");
    setNewPersonaAvatar(p.avatarUrl || null);
    
    setNewPersonaGender(p.gender || "");
    setNewPronounSubject(p.pronounSubject || "");
    setNewPronounObject(p.pronounObject || "");
    setNewPronounPossessive(p.pronounPossessive || "");
    setNewPronounDeterminer(p.pronounDeterminer || "");
    
    if (p.gender === "male" && p.pronounSubject === "he") {
      setNewPersonaPreset("male");
      setIsCustomPronouns(false);
    } else if (p.gender === "female" && p.pronounSubject === "she") {
      setNewPersonaPreset("female");
      setIsCustomPronouns(false);
    } else if (p.gender === "non-binary" && p.pronounSubject === "they") {
      setNewPersonaPreset("non-binary");
      setIsCustomPronouns(false);
    } else if (!p.gender && !p.pronounSubject) {
      setNewPersonaPreset("unspecified");
      setIsCustomPronouns(false);
    } else {
      setNewPersonaPreset("custom");
      setIsCustomPronouns(true);
    }
    
    setIsAddingPersona(true);
  };

  const handlePresetChange = (preset: string) => {
    setNewPersonaPreset(preset);
    if (preset === "male") {
      setNewPersonaGender("male");
      setNewPronounSubject("he");
      setNewPronounObject("him");
      setNewPronounPossessive("his");
      setNewPronounDeterminer("his");
      setIsCustomPronouns(false);
    } else if (preset === "female") {
      setNewPersonaGender("female");
      setNewPronounSubject("she");
      setNewPronounObject("her");
      setNewPronounPossessive("hers");
      setNewPronounDeterminer("her");
      setIsCustomPronouns(false);
    } else if (preset === "non-binary") {
      setNewPersonaGender("non-binary");
      setNewPronounSubject("they");
      setNewPronounObject("them");
      setNewPronounPossessive("theirs");
      setNewPronounDeterminer("their");
      setIsCustomPronouns(false);
    } else if (preset === "unspecified") {
      setNewPersonaGender("");
      setNewPronounSubject("");
      setNewPronounObject("");
      setNewPronounPossessive("");
      setNewPronounDeterminer("");
      setIsCustomPronouns(false);
    } else if (preset === "custom") {
      setIsCustomPronouns(true);
    }
  };

  const handleAddPersona = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonaName.trim() || !newPersonaDesc.trim()) return;

    const payload = {
      name: newPersonaName.trim(),
      description: newPersonaDesc.trim(),
      gender: newPersonaGender.trim() || undefined,
      pronounSubject: newPronounSubject.trim() || undefined,
      pronounObject: newPronounObject.trim() || undefined,
      pronounPossessive: newPronounPossessive.trim() || undefined,
      pronounDeterminer: newPronounDeterminer.trim() || undefined,
      avatarUrl: newPersonaAvatar || undefined,
    };

    if (editingPersonaId) {
      await updatePersona({ id: editingPersonaId, data: payload }).unwrap();
    } else {
      await createPersona({
        ...payload,
        isDefault: personas.length === 0,
      }).unwrap();
    }

    handleCancelForm();
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-dark-950 overflow-y-auto">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full p-6 sm:p-8 space-y-8">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-2 rounded-xl bg-dark-900/80 hover:bg-dark-800 text-slate-400 hover:text-white border border-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">System Settings & Engine</h1>
            <p className="text-xs text-slate-400">Configure LM Studio, personas, and database</p>
          </div>
        </div>

        {/* 1. LM Studio Status */}
        <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-brand-400" /> LM Studio Engine Connection
            </h2>
            <button
              type="button"
              onClick={() => refetchHealth()}
              disabled={isCheckingHealth}
              className="px-3 py-1.5 rounded-xl bg-dark-900 hover:bg-dark-800 text-slate-300 text-xs flex items-center gap-1.5 border border-white/10 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingHealth ? "animate-spin" : ""}`} /> Check Connection
            </button>
          </div>

          <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
            health?.connected
              ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
              : "bg-red-950/20 border-red-500/30 text-red-300"
          }`}>
            {health?.connected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="space-y-1 text-xs">
              <div className="font-bold text-sm text-white">
                {health?.connected ? "LM Studio Local Server is Online" : "LM Studio is Disconnected"}
              </div>
              <p className="text-slate-300">
                {health?.connected
                  ? `Active Model: ${health.model || "Default local model loaded"}`
                  : "Please launch LM Studio, click the '<->' Local Server icon, ensure port 1234 is selected, and click 'Start Server'."}
              </p>
              <p className="text-[11px] text-slate-500 font-mono">
                Target: http://localhost:1234/v1
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-brand-950/20 border border-brand-500/20 text-xs text-slate-300 space-y-2">
            <span className="font-bold text-brand-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Recommended Uncensored Roleplay Models in LM Studio:
            </span>
            <ul className="list-disc list-inside space-y-1 pl-1 text-slate-400">
              <li><strong className="text-slate-200">Llama-3-8B-Instruct-Abliterated</strong> — Completely unfiltered, exceptional conversational flow.</li>
              <li><strong className="text-slate-200">Stheno-v3.2 / Fimbulvetr</strong> — Purpose-built for creative writing, nuance, and rich roleplay.</li>
              <li><strong className="text-slate-200">Mistral-Nemo-Instruct-2407 (12B)</strong> — 128k context support with vivid descriptive prose.</li>
            </ul>
          </div>
        </div>

        {/* 2. User Persona Profiles */}
        <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-purple-400" /> User Persona Profiles
            </h2>
            <button
              type="button"
              onClick={() => isAddingPersona ? handleCancelForm() : setIsAddingPersona(true)}
              className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm"
            >
              {isAddingPersona ? "Cancel" : "+ Add Persona"}
            </button>
          </div>

          {isAddingPersona && (
            <form onSubmit={handleAddPersona} className="p-4 rounded-2xl bg-dark-900/60 border border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <ImageUpload
                  type="avatar"
                  currentUrl={newPersonaAvatar}
                  onUploadSuccess={(url) => setNewPersonaAvatar(url)}
                  label="Persona Avatar"
                />
                <div className="flex-1 w-full space-y-1">
                  <label className="block text-xs font-medium text-slate-300">
                    Persona Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. John, Commander, Raven"
                    value={newPersonaName}
                    onChange={(e) => setNewPersonaName(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-dark-950 border border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-dark-950/70 border border-white/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-200">
                    Gender & Pronoun Configuration
                  </label>
                  <select
                    value={newPersonaPreset}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    className="px-2.5 py-1 text-xs rounded-lg bg-dark-800 border border-white/10 text-brand-300 focus:outline-none"
                  >
                    <option value="male">Male (he/him/his)</option>
                    <option value="female">Female (she/her/hers)</option>
                    <option value="non-binary">Non-Binary (they/them/theirs)</option>
                    <option value="unspecified">Unspecified / Neutral</option>
                    <option value="custom">Custom...</option>
                  </select>
                </div>

                {(isCustomPronouns || newPersonaPreset !== "unspecified") && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-white/5">
                    <div>
                      <label className="block text-[9px] uppercase font-mono text-slate-400">Subject</label>
                      <input
                        type="text"
                        placeholder="he / she / they"
                        value={newPronounSubject}
                        onChange={(e) => {
                          setNewPronounSubject(e.target.value);
                          setIsCustomPronouns(true);
                          setNewPersonaPreset("custom");
                        }}
                        className="w-full px-2 py-1 text-xs rounded bg-dark-900 border border-white/10 text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase font-mono text-slate-400">Object</label>
                      <input
                        type="text"
                        placeholder="him / her / them"
                        value={newPronounObject}
                        onChange={(e) => {
                          setNewPronounObject(e.target.value);
                          setIsCustomPronouns(true);
                          setNewPersonaPreset("custom");
                        }}
                        className="w-full px-2 py-1 text-xs rounded bg-dark-900 border border-white/10 text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase font-mono text-slate-400">Possessive</label>
                      <input
                        type="text"
                        placeholder="his / hers / theirs"
                        value={newPronounPossessive}
                        onChange={(e) => {
                          setNewPronounPossessive(e.target.value);
                          setIsCustomPronouns(true);
                          setNewPersonaPreset("custom");
                        }}
                        className="w-full px-2 py-1 text-xs rounded bg-dark-900 border border-white/10 text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase font-mono text-slate-400">Determiner</label>
                      <input
                        type="text"
                        placeholder="his / her / their"
                        value={newPronounDeterminer}
                        onChange={(e) => {
                          setNewPronounDeterminer(e.target.value);
                          setIsCustomPronouns(true);
                          setNewPersonaPreset("custom");
                        }}
                        className="w-full px-2 py-1 text-xs rounded bg-dark-900 border border-white/10 text-slate-200 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Backstory & Appearance
                </label>
                <textarea
                  placeholder="Backstory, appearance, traits... Characters will react to this."
                  value={newPersonaDesc}
                  onChange={(e) => setNewPersonaDesc(e.target.value)}
                  required
                  rows={3}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-dark-950 border border-white/10 text-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold"
                >
                  {editingPersonaId ? "Update Persona" : "Save Persona"}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {personas.map((p) => (
              <div
                key={p.id}
                className="p-3.5 rounded-2xl bg-dark-900/50 border border-white/5 flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {p.avatarUrl ? (
                    <img
                      src={p.avatarUrl}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover border border-white/10 flex-shrink-0 mt-0.5"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-brand-900/40 border border-brand-500/30 text-brand-300 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      {p.name[0]}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white truncate">{p.name}</span>
                      {p.gender && (
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-brand-500/15 text-brand-300 border border-brand-500/30">
                          {p.gender}
                        </span>
                      )}
                      {p.pronounSubject && (
                        <span className="text-[10px] font-mono text-slate-400">
                          ({p.pronounSubject}/{p.pronounObject || p.pronounSubject})
                        </span>
                      )}
                      {p.isDefault && (
                        <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{p.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditPersona(p)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors text-xs"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePersona(p.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors text-xs"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Neon PostgreSQL Switcher Guide */}
        <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-3">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" /> Database Engine (Neon PostgreSQL)
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Your application is currently running on a fast local SQLite database (<code className="font-mono text-brand-300">server/prisma/dev.db</code>).
            When you want to sync with Neon PostgreSQL in the cloud, simply paste your Neon connection string in <code className="font-mono text-brand-300">server/.env</code>:
          </p>
          <pre className="p-3 rounded-xl bg-dark-950 border border-white/5 font-mono text-[11px] text-slate-400 overflow-x-auto">
            DATABASE_URL="postgresql://username:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require"
          </pre>
          <p className="text-[11px] text-slate-500">
            Run <code className="font-mono text-slate-300">Copy-Item -Path "prisma\schema.postgres.prisma" -Destination "prisma\schema.prisma" -Force; npx prisma db push</code> inside <code className="font-mono">server/</code> to deploy to Neon.
          </p>
        </div>
      </main>
    </div>
  );
};
