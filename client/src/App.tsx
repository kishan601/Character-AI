import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store/store.js";
import { Sidebar } from "./components/layout/Sidebar.js";
import { HomePage } from "./pages/HomePage.js";
import { ChatPage } from "./pages/ChatPage.js";
import { GlobalPersonaModal } from "./components/personas/GlobalPersonaModal.js";

import { ErrorBoundary } from "./components/shared/ErrorBoundary.js";

// Lazy-load secondary administrative & creation pages
const CharacterCreatePage = React.lazy(() =>
  import("./pages/CharacterCreatePage.js").then((m) => ({ default: m.CharacterCreatePage }))
);
const CharacterEditPage = React.lazy(() =>
  import("./pages/CharacterEditPage.js").then((m) => ({ default: m.CharacterEditPage }))
);
const SettingsPage = React.lazy(() =>
  import("./pages/SettingsPage.js").then((m) => ({ default: m.SettingsPage }))
);
const AIIntegrationPage = React.lazy(() =>
  import("./pages/AIIntegrationPage.js").then((m) => ({ default: m.AIIntegrationPage }))
);

const PageFallback: React.FC = () => (
  <div className="flex-1 flex items-center justify-center min-h-screen bg-dark-950 text-slate-500">
    <div className="flex items-center gap-2 text-xs font-medium">
      <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
      <span>Loading...</span>
    </div>
  </div>
);

export const App: React.FC = () => {
  React.useEffect(() => {
    window.scrollTo(0, 0);
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  return (
    <Provider store={store}>
      <BrowserRouter>
        <div className="flex h-full w-screen overflow-hidden bg-dark-950 text-slate-100 font-sans">
          <Sidebar />
          <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            <ErrorBoundary fallbackTitle="SECTOR RUNTIME FAULT DETECTED">
              <React.Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/chat/:sessionId" element={<ChatPage />} />
                  <Route path="/characters/new" element={<CharacterCreatePage />} />
                  <Route path="/characters/:id/edit" element={<CharacterEditPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/settings/ai" element={<AIIntegrationPage />} />
                </Routes>
              </React.Suspense>
            </ErrorBoundary>
          </div>
        </div>
        <GlobalPersonaModal />
      </BrowserRouter>
    </Provider>
  );
};

export default App;
