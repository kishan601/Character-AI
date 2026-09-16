import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UiState {
  zenMode: boolean; // 1-click wallpaper toggle mode: hides all chat UI to reveal clean wallpaper
  sidebarOpen: boolean;
  memoryDrawerOpen: boolean;
  personaModalOpen: boolean;
}

const initialState: UiState = {
  zenMode: false,
  sidebarOpen: true,
  memoryDrawerOpen: false,
  personaModalOpen: false,
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleZenMode: (state) => {
      state.zenMode = !state.zenMode;
    },
    setZenMode: (state, action: PayloadAction<boolean>) => {
      state.zenMode = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    toggleMemoryDrawer: (state) => {
      state.memoryDrawerOpen = !state.memoryDrawerOpen;
    },
    setMemoryDrawerOpen: (state, action: PayloadAction<boolean>) => {
      state.memoryDrawerOpen = action.payload;
    },
    setPersonaModalOpen: (state, action: PayloadAction<boolean>) => {
      state.personaModalOpen = action.payload;
    },
  },
});

export const {
  toggleZenMode,
  setZenMode,
  toggleSidebar,
  setSidebarOpen,
  toggleMemoryDrawer,
  setMemoryDrawerOpen,
  setPersonaModalOpen,
} = uiSlice.actions;

export default uiSlice.reducer;
