import { configureStore } from "@reduxjs/toolkit";
import { baseApi } from "../api/baseApi.js";
import uiReducer from "./uiSlice.js";
import chatReducer from "./chatSlice.js";

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    ui: uiReducer,
    chat: chatReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
