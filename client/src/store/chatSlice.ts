import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ChatState {
  activeSessionId: string | null;
  activeCharacterId: string | null;
  currentMaxTokens: number;
  isStreaming: boolean;
  streamingContent: string;
}

const initialState: ChatState = {
  activeSessionId: null,
  activeCharacterId: null,
  currentMaxTokens: 400,
  isStreaming: false,
  streamingContent: "",
};

export const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setActiveSessionId: (state, action: PayloadAction<string | null>) => {
      state.activeSessionId = action.payload;
    },
    setActiveCharacterId: (state, action: PayloadAction<string | null>) => {
      state.activeCharacterId = action.payload;
    },
    setMaxTokens: (state, action: PayloadAction<number>) => {
      state.currentMaxTokens = action.payload;
    },
    setIsStreaming: (state, action: PayloadAction<boolean>) => {
      state.isStreaming = action.payload;
      if (!action.payload) {
        state.streamingContent = "";
      }
    },
    appendStreamingToken: (state, action: PayloadAction<string>) => {
      state.streamingContent += action.payload;
    },
    clearStreaming: (state) => {
      state.isStreaming = false;
      state.streamingContent = "";
    },
  },
});

export const {
  setActiveSessionId,
  setActiveCharacterId,
  setMaxTokens,
  setIsStreaming,
  appendStreamingToken,
  clearStreaming,
} = chatSlice.actions;

export default chatSlice.reducer;
