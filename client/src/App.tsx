import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store/store.js";
import { Sidebar } from "./components/layout/Sidebar.js";
import { HomePage } from "./pages/HomePage.js";
import { ChatPage } from "./pages/ChatPage.js";
import { CharacterCreatePage } from "./pages/CharacterCreatePage.js";
import { CharacterEditPage } from "./pages/CharacterEditPage.js";
import { SettingsPage } from "./pages/SettingsPage.js";
import { GlobalPersonaModal } from "./components/personas/GlobalPersonaModal.js";

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
        <div className="flex h-full w-screen overflow-hidden bg-dark-950 text-slate-100 font-sans pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
          <Sidebar />
          <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/chat/:sessionId" element={<ChatPage />} />
              <Route path="/characters/new" element={<CharacterCreatePage />} />
              <Route path="/characters/:id/edit" element={<CharacterEditPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </div>
        </div>
        <GlobalPersonaModal />
      </BrowserRouter>
    </Provider>
  );
};

export default App;
