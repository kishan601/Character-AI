import React, { Component, ErrorInfo, ReactNode } from "react";
import { ShieldAlert, RefreshCw, Home, Terminal, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showTelemetry: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showTelemetry: false,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error("[TACTICAL ERROR BOUNDARY] Intercepted runtime exception:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showTelemetry: false });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleHardReload = () => {
    window.location.reload();
  };

  private handleReturnHome = () => {
    window.location.href = "/";
  };

  private handleCopyTelemetry = () => {
    const { error, errorInfo } = this.state;
    const text = `--- TACTICAL FAULT REPORT ---\nTimestamp: ${new Date().toISOString()}\nError: ${error?.name}: ${error?.message}\n\nStack:\n${error?.stack || "N/A"}\n\nComponent Stack:\n${errorInfo?.componentStack || "N/A"}`;
    navigator.clipboard.writeText(text);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  public render() {
    if (this.state.hasError) {
      const { error, errorInfo, showTelemetry, copied } = this.state;
      const title = this.props.fallbackTitle || "TACTICAL FAILSAFE ENGAGED";

      return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] h-full p-4 sm:p-6 select-none animate-in fade-in zoom-in-95 duration-200">
          <div className="w-full max-w-xl bg-dark-900/90 border border-red-500/30 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-red-950/40 relative overflow-hidden">
            {/* Top tactical HUD bar accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />

            {/* Header / Callout Badge */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
                <span className="text-[10px] font-mono tracking-widest uppercase text-red-400 font-semibold">
                  SECTOR INTEGRITY COMPROMISED
                </span>
              </div>
              <span className="text-[10px] font-mono tracking-wider text-slate-500">
                ERR_SUBSYSTEM_FAULT
              </span>
            </div>

            {/* Icon and Titles */}
            <div className="flex items-start gap-4 mb-5">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center flex-shrink-0 text-red-400 shadow-inner">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide uppercase font-mono">
                  {title}
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  An unhandled exception was intercepted within this sector. Command and navigation systems remain operational.
                </p>
              </div>
            </div>

            {/* Error Message Pill */}
            {error && (
              <div className="bg-dark-950/80 border border-white/5 rounded-xl p-3 mb-5 font-mono text-xs text-red-300 break-words flex items-start gap-2.5">
                <Terminal className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <span className="leading-snug">{error.message || "Unknown runtime fault"}</span>
              </div>
            )}

            {/* Tactical Action Directive Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 active:scale-95 text-white text-xs font-semibold tracking-wide uppercase font-mono transition-all shadow-lg shadow-brand-600/20"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Sector</span>
              </button>

              <button
                type="button"
                onClick={this.handleReturnHome}
                className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 active:scale-95 text-slate-200 border border-white/10 text-xs font-semibold tracking-wide uppercase font-mono transition-all"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Return to Base</span>
              </button>

              <button
                type="button"
                onClick={this.handleHardReload}
                className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 active:scale-95 text-slate-300 border border-white/5 text-xs font-semibold tracking-wide uppercase font-mono transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Force Reboot</span>
              </button>
            </div>

            {/* Collapsible Telemetry / Diagnostics Drawer */}
            <div className="border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={() => this.setState((prev) => ({ showTelemetry: !prev.showTelemetry }))}
                className="flex items-center justify-between w-full text-[11px] font-mono text-slate-400 hover:text-slate-200 transition-colors py-1"
              >
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3 h-3 text-brand-400" />
                  <span>DIAGNOSTIC TELEMETRY</span>
                </span>
                {showTelemetry ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showTelemetry && (
                <div className="mt-2.5 animate-in slide-in-from-top-2 duration-150">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={this.handleCopyTelemetry}
                      className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded bg-dark-800/90 hover:bg-dark-700 text-[10px] text-slate-300 border border-white/10 font-mono transition-colors"
                      title="Copy Telemetry to Clipboard"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">COPIED</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>COPY</span>
                        </>
                      )}
                    </button>
                    <pre className="p-3 bg-dark-950 border border-white/10 rounded-xl text-[10px] font-mono text-slate-400 overflow-x-auto max-h-48 whitespace-pre-wrap select-text leading-relaxed">
                      {error?.stack || error?.message || "No stack trace recorded."}
                      {errorInfo?.componentStack && `\n\nComponent Hierarchy:\n${errorInfo.componentStack}`}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
