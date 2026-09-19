import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronRight, Sparkles, Globe, Key, Check, Server } from "lucide-react";

// Hook to manage local storage state easily
function useLocalState(key: string, defaultValue: string) {
  const [value, setValue] = useState(() => {
    return localStorage.getItem(key) || defaultValue;
  });

  useEffect(() => {
    localStorage.setItem(key, value);
  }, [key, value]);

  return [value, setValue] as const;
}

export const AIIntegrationPage: React.FC = () => {
  // State from LocalStorage
  const [provider, setProvider] = useLocalState("ai_provider", "Custom");
  const [endpoint, setEndpoint] = useLocalState("ai_endpoint", "http://192.168.29.240:1234/v1/chat/completions");
  const [apiKey, setApiKey] = useLocalState("ai_api_key", "");
  const [model, setModel] = useLocalState("ai_model", "local-model");
  const [contextLimit, setContextLimit] = useLocalState("ai_context_limit", "8192");

  // Modal states
  const [activeModal, setActiveModal] = useState<"provider" | "endpoint" | "apiKey" | "model" | "contextLimit" | null>(null);

  // Temporary edit states for modals
  const [editValue, setEditValue] = useState("");

  // Test API state
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "ready" | "error">("idle");

  // Debug console state
  const [debugLog, setDebugLog] = useState<Array<{ ts: string; label: string; ok: boolean; body: string }>>([]);
  const [isDebugging, setIsDebugging] = useState(false);

  const addLog = (label: string, ok: boolean, body: string) => {
    setDebugLog(prev => [{ ts: new Date().toISOString().slice(11, 23), label, ok, body }, ...prev.slice(0, 19)]);
  };

  const runDiagnostics = async () => {
    if (isDebugging) return;
    setIsDebugging(true);
    setDebugLog([]);
    const base = "/api";

    // 1. Test backend health
    try {
      const r = await fetch(`${base}/health`, { method: "GET" });
      const txt = await r.text();
      addLog("Backend /health", r.ok, txt);
    } catch (e: any) {
      addLog("Backend /health", false, e.message);
    }

    // 2. Test LM Studio proxy
    try {
      const r = await fetch(`${base}/generate/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiConfig: { aiProvider: provider, aiEndpoint: endpoint, aiApiKey: apiKey, aiModel: model } })
      });
      const txt = await r.text();
      addLog(`LM Studio via backend`, r.ok, txt);
    } catch (e: any) {
      addLog("LM Studio via backend", false, e.message);
    }

    // 3. Test raw endpoint from phone directly (will likely fail due to CORS but useful for info)
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: model || "local-model", messages: [{ role: "user", content: "ping" }], max_tokens: 3 })
      });
      const txt = await r.text();
      addLog("Direct LM Studio (phone→PC)", r.ok, txt.slice(0, 200));
    } catch (e: any) {
      addLog("Direct LM Studio (phone→PC)", false, e.message);
    }

    setIsDebugging(false);
  };

  const openModal = (modalName: typeof activeModal, currentValue: string) => {
    setEditValue(currentValue);
    setActiveModal(modalName);
  };

  const handleSave = () => {
    if (activeModal === "provider") setProvider(editValue);
    if (activeModal === "endpoint") setEndpoint(editValue);
    if (activeModal === "apiKey") setApiKey(editValue);
    if (activeModal === "model") setModel(editValue);
    if (activeModal === "contextLimit") setContextLimit(editValue);
    setActiveModal(null);
    setTestStatus("idle"); // Reset status when settings change
  };

  const handleTestAPI = async () => {
    if (isTesting) return;
    setIsTesting(true);
    setTestStatus("idle");
    
    try {
      const res = await fetch(`/api/generate/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          aiConfig: {
            aiProvider: provider,
            aiEndpoint: endpoint,
            aiApiKey: apiKey,
            aiModel: model,
          }
        })
      });

      if (res.ok) {
        setTestStatus("ready");
      } else {
        setTestStatus("error");
      }
    } catch (err) {
      setTestStatus("error");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#131718] font-sans text-slate-100 overflow-hidden relative">
      {/* Header matching screenshot */}
      <div className="flex items-center gap-4 px-4 py-5 flex-shrink-0 pt-[calc(1.25rem+env(safe-area-inset-top))]">
        <Link to="/" className="p-1 -ml-1 text-slate-200 hover:text-white transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-[19px] font-normal text-[#f4f3f0]">AI Integration</h1>
      </div>

      <main className="flex-1 overflow-y-auto px-4 pb-12 w-full max-w-2xl mx-auto">
        {/* Section Title */}
        <div className="text-[14px] font-medium text-[#c58245] mb-2.5 ml-0.5">
          Provider
        </div>

        {/* List Container */}
        <div className="bg-[#1f2223] rounded-[28px] overflow-hidden shadow-lg border border-white/[0.03] divide-y divide-white/[0.03]">
          
          {/* AI Provider */}
          <div 
            onClick={() => openModal("provider", provider)}
            className="flex items-center justify-between p-[18px] cursor-pointer hover:bg-white/5 transition-colors active:bg-white/10"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-[46px] h-[46px] flex-shrink-0 rounded-[18px] bg-[#fdb76e] flex items-center justify-center text-[#2a1708]">
                <Sparkles className="w-[26px] h-[26px] fill-current" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[16px] font-medium text-[#f4f3f0] mb-[3px]">AI provider</span>
                <span className="text-[14px] text-[#8e9699] truncate">Choose the AI service.</span>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="px-3.5 py-[5px] rounded-full bg-[#3f2a1b] text-[#c58245] text-[14px] font-medium">
                {provider}
              </span>
              <ChevronRight className="w-5 h-5 text-slate-500" />
            </div>
          </div>

          {/* Custom Endpoint */}
          <div 
            onClick={() => openModal("endpoint", endpoint)}
            className="flex items-center p-[18px] cursor-pointer hover:bg-white/5 transition-colors active:bg-white/10"
          >
            <div className="flex items-center gap-4 min-w-0 w-full">
              <div className="w-[46px] h-[46px] flex-shrink-0 rounded-[18px] bg-[#dfa467] flex items-center justify-center text-[#2a1708]">
                <Globe className="w-[26px] h-[26px] stroke-[2]" />
              </div>
              <div className="flex flex-col min-w-0 w-full pr-2">
                <span className="text-[16px] font-medium text-[#f4f3f0] mb-[3px]">Custom endpoint</span>
                <span className="text-[14px] text-[#8e9699] truncate w-full block">{endpoint}</span>
              </div>
            </div>
          </div>

          {/* API Key */}
          <div 
            onClick={() => openModal("apiKey", apiKey)}
            className="flex items-center p-[18px] cursor-pointer hover:bg-white/5 transition-colors active:bg-white/10"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-[46px] h-[46px] flex-shrink-0 rounded-[18px] bg-[#e1a35f] flex items-center justify-center text-[#2a1708]">
                <Key className="w-[22px] h-[22px] stroke-[2.5] fill-current" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[16px] font-medium text-[#f4f3f0] mb-[3px]">API key</span>
                <span className="text-[14px] text-[#8e9699] truncate">{apiKey ? "Configured" : "Not configured"}</span>
              </div>
            </div>
          </div>

          {/* Model */}
          <div 
            onClick={() => openModal("model", model)}
            className="flex items-center p-[18px] cursor-pointer hover:bg-white/5 transition-colors active:bg-white/10"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-[46px] h-[46px] flex-shrink-0 rounded-[18px] bg-[#fdb76e] flex items-center justify-center text-[#2a1708]">
                <Sparkles className="w-[26px] h-[26px] fill-current" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[16px] font-medium text-[#f4f3f0] mb-[3px]">Model</span>
                <span className="text-[14px] text-[#8e9699] truncate">{model}</span>
              </div>
            </div>
          </div>

          {/* Context Limit */}
          <div 
            onClick={() => openModal("contextLimit", contextLimit)}
            className="flex items-center p-[18px] cursor-pointer hover:bg-white/5 transition-colors active:bg-white/10"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-[46px] h-[46px] flex-shrink-0 rounded-[18px] bg-[#c58245] flex items-center justify-center text-[#2a1708]">
                <Server className="w-[24px] h-[24px] fill-current opacity-80" strokeWidth={2} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[16px] font-medium text-[#f4f3f0] mb-[3px]">Context Limit</span>
                <span className="text-[14px] text-[#8e9699] truncate">{contextLimit} tokens</span>
              </div>
            </div>
          </div>

          {/* Test API */}
          <div 
            onClick={handleTestAPI}
            className={`flex items-center p-[18px] cursor-pointer hover:bg-white/5 transition-colors active:bg-white/10 ${isTesting ? "opacity-70 pointer-events-none" : ""}`}
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className={`w-[46px] h-[46px] flex-shrink-0 rounded-[18px] flex items-center justify-center ${testStatus === 'error' ? 'bg-red-500/20 text-red-500' : 'bg-[#f8b76c] text-[#2a1708]'}`}>
                {isTesting ? (
                  <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-[26px] h-[26px] stroke-[3]" />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[16px] font-medium text-[#f4f3f0] mb-[3px]">Test API</span>
                <span className={`text-[14px] font-medium ${testStatus === 'error' ? 'text-red-400' : 'text-[#c58245]'}`}>
                  {isTesting ? "Testing connection..." : testStatus === "ready" ? "API ready" : testStatus === "error" ? "Connection failed" : "Tap to test"}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Debug Console */}
        <div className="mt-6">
          <div className="text-[14px] font-medium text-[#c58245] mb-2.5 ml-0.5">Network Diagnostics</div>
          <div className="bg-[#1f2223] rounded-[28px] overflow-hidden shadow-lg border border-white/[0.03]">
            <button
              onClick={runDiagnostics}
              disabled={isDebugging}
              className={`w-full flex items-center gap-4 p-[18px] hover:bg-white/5 active:bg-white/10 transition-colors ${isDebugging ? "opacity-60" : ""}`}
            >
              <div className={`w-[46px] h-[46px] flex-shrink-0 rounded-[18px] flex items-center justify-center text-[#2a1708] ${isDebugging ? "bg-amber-400" : "bg-[#f8b76c]"}`}>
                {isDebugging
                  ? <div className="w-6 h-6 border-2 border-[#2a1708] border-t-transparent rounded-full animate-spin" />
                  : <span className="text-[22px]">🔬</span>}
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[16px] font-medium text-[#f4f3f0]">Run Diagnostics</span>
                <span className="text-[13px] text-[#8e9699]">
                  {isDebugging ? "Testing all hops..." : "Backend → LM Studio → Direct"}
                </span>
              </div>
            </button>

            {debugLog.length > 0 && (
              <div className="border-t border-white/[0.04] px-4 py-3 space-y-2 max-h-[60vh] overflow-y-auto">
                {debugLog.map((entry, i) => (
                  <div key={i} className={`rounded-[14px] p-3 text-[12px] font-mono border ${
                    entry.ok
                      ? "bg-emerald-950/50 border-emerald-600/20"
                      : "bg-red-950/50 border-red-600/20"
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] text-slate-500">{entry.ts}</span>
                      <span className={`font-bold ${entry.ok ? "text-emerald-400" : "text-red-400"}`}>
                        {entry.ok ? "✓" : "✗"} {entry.label}
                      </span>
                    </div>
                    <pre className={`whitespace-pre-wrap break-all text-[11px] leading-relaxed ${
                      entry.ok ? "text-emerald-300" : "text-red-300"
                    }`}>{entry.body}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </main>

      {/* MODALS */}
      
      {/* Backdrop */}
      {activeModal && (
        <div 
          className="absolute inset-0 z-50 bg-[#121516]/70 backdrop-blur-[1px] transition-opacity"
          onClick={() => setActiveModal(null)}
        />
      )}

      {/* Provider Modal */}
      <div className={`absolute bottom-0 left-0 right-0 z-50 bg-[#252b2c] rounded-t-[32px] transform transition-transform duration-300 ease-out shadow-2xl ${activeModal === "provider" ? "translate-y-0" : "translate-y-full"}`}>
        <div className="w-9 h-[3px] bg-[#4f5556] rounded-full mx-auto mt-4 mb-3" />
        <div className="px-2 pb-6">
          <h3 className="text-[20px] font-medium text-[#f4f3f0] mb-2 mt-1 px-4">AI provider</h3>
          <div className="space-y-0.5">
            {["ChatGPT", "Gemini", "Claude", "OpenRouter", "Custom", "None (Disabled)"].map((opt) => (
              <button 
                key={opt}
                onClick={() => { setProvider(opt); setActiveModal(null); }}
                className="w-full flex items-center justify-between px-4 py-[14px] hover:bg-white/5 transition-colors active:bg-white/10 rounded-2xl"
              >
                <span className="text-[16px] text-[#e0e3e4]">{opt}</span>
                {provider === opt && <Check className="w-[22px] h-[22px] text-[#c58245]" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Endpoint Modal */}
      <div className={`absolute bottom-0 left-0 right-0 z-50 bg-[#252b2c] rounded-t-[32px] transform transition-transform duration-300 ease-out shadow-2xl ${activeModal === "endpoint" ? "translate-y-0" : "translate-y-full"}`}>
        <div className="px-6 pt-7 pb-6">
          <h3 className="text-[19px] font-normal text-[#f4f3f0] mb-7">Custom endpoint</h3>
          <input 
            type="text"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            className="w-full bg-transparent border-b-[2px] border-[#c58245] text-[#f4f3f0] text-[16px] pb-2.5 focus:outline-none placeholder-[#6b7280]"
            autoFocus={activeModal === "endpoint"}
          />
          <div className="flex justify-end gap-7 mt-9">
            <button onClick={() => setActiveModal(null)} className="text-[#c58245] text-[14px] font-medium uppercase tracking-[0.03em] px-1 py-1">Cancel</button>
            <button onClick={handleSave} className="text-[#c58245] text-[14px] font-medium uppercase tracking-[0.03em] px-1 py-1">OK</button>
          </div>
        </div>
      </div>

      {/* API Key Modal */}
      <div className={`absolute bottom-0 left-0 right-0 z-50 bg-[#252b2c] rounded-t-[32px] transform transition-transform duration-300 ease-out shadow-2xl ${activeModal === "apiKey" ? "translate-y-0" : "translate-y-full"}`}>
        <div className="px-6 pt-7 pb-6 flex flex-col items-center">
          <div className="mb-2 flex items-center justify-center">
            <Key className="w-[22px] h-[22px] text-[#e0e3e4] fill-current" />
          </div>
          <h3 className="text-[22px] font-normal text-[#f4f3f0] mb-8">API key</h3>
          
          <div className="w-full relative">
            <label className="absolute -top-[9px] left-[14px] px-1.5 bg-[#252b2c] text-[12px] text-[#8e9699] font-medium z-10 tracking-wide">API key</label>
            <input 
              type="password"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              className="w-full bg-transparent border-[1.5px] border-[#5a6265] rounded-[14px] text-[#f4f3f0] text-[16px] px-[18px] py-[14px] focus:outline-none focus:border-[#c58245] transition-colors placeholder-[#8e9699]"
              autoFocus={activeModal === "apiKey"}
              placeholder="••••••••"
            />
          </div>

          <div className="flex justify-end w-full gap-7 mt-10">
            <button onClick={() => setActiveModal(null)} className="text-[#c58245] text-[14px] font-medium uppercase tracking-[0.03em] px-1 py-1">Cancel</button>
            <button onClick={handleSave} className="text-[#c58245] text-[14px] font-medium uppercase tracking-[0.03em] px-1 py-1">Save</button>
          </div>
        </div>
      </div>

      {/* Model Modal */}
      <div className={`absolute bottom-0 left-0 right-0 z-50 bg-[#252b2c] rounded-t-[32px] transform transition-transform duration-300 ease-out shadow-2xl ${activeModal === "model" ? "translate-y-0" : "translate-y-full"}`}>
        <div className="px-6 pt-7 pb-6">
          <h3 className="text-[19px] font-normal text-[#f4f3f0] mb-7">Model</h3>
          <input 
            type="text"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            className="w-full bg-transparent border-b-[2px] border-[#c58245] text-[#f4f3f0] text-[16px] pb-2.5 focus:outline-none placeholder-[#6b7280]"
            autoFocus={activeModal === "model"}
          />
          <div className="flex justify-end gap-7 mt-9">
            <button onClick={() => setActiveModal(null)} className="text-[#c58245] text-[14px] font-medium uppercase tracking-[0.03em] px-1 py-1">Cancel</button>
            <button onClick={handleSave} className="text-[#c58245] text-[14px] font-medium uppercase tracking-[0.03em] px-1 py-1">OK</button>
          </div>
        </div>
      </div>

    </div>
  );
};
