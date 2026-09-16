import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface Character {
  id: string;
  name: string;
  tagline?: string | null;
  description?: string | null;
  greeting: string;
  systemPrompt: string;
  exampleDialogue?: string | null;
  avatarUrl?: string | null;
  backgroundUrl?: string | null;
  bgBlur: number;
  bgDim: number;
  createdAt: string;
  updatedAt: string;
  _count?: { sessions: number };
}

export interface UserPersona {
  id: string;
  name: string;
  description: string;
  avatarUrl?: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  sessionId: string;
  orderIndex: number;
  sender: "user" | "assistant";
  swipes: string[];
  activeSwipeIndex: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PinnedMemory {
  id: string;
  characterId: string;
  sessionId?: string | null;
  content: string;
  label?: string | null;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title?: string | null;
  characterId: string;
  character: Character;
  userPersonaId?: string | null;
  userPersona?: UserPersona | null;
  rollingSummary?: string | null;
  summarizedUpToIndex: number;
  preferredMaxTokens: number;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
  memories?: PinnedMemory[];
  _count?: { messages: number };
}

export interface LMStudioHealth {
  connected: boolean;
  model: string | null;
  models: string[];
  error?: string;
}

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  keepUnusedDataFor: 120,
  refetchOnMountOrArgChange: 30,
  tagTypes: ["Characters", "Character", "Personas", "Sessions", "Session", "Messages", "Memories", "Health"],
  endpoints: (builder) => ({
    // Health
    getHealth: builder.query<LMStudioHealth, void>({
      query: () => "/health/lm-studio",
      providesTags: ["Health"],
    }),

    // Characters
    getCharacters: builder.query<Character[], void>({
      query: () => "/characters",
      providesTags: ["Characters"],
    }),
    getCharacter: builder.query<Character, string>({
      query: (id) => `/characters/${id}`,
      providesTags: (result, error, id) => [{ type: "Character", id }],
    }),
    createCharacter: builder.mutation<Character, Partial<Character>>({
      query: (body) => ({
        url: "/characters",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Characters"],
    }),
    updateCharacter: builder.mutation<Character, { id: string; data: Partial<Character> }>({
      query: ({ id, data }) => ({
        url: `/characters/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => ["Characters", { type: "Character", id }],
    }),
    deleteCharacter: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/characters/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Characters", "Sessions"],
    }),

    // User Personas
    getPersonas: builder.query<UserPersona[], void>({
      query: () => "/personas",
      providesTags: ["Personas"],
    }),
    createPersona: builder.mutation<UserPersona, Partial<UserPersona>>({
      query: (body) => ({
        url: "/personas",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Personas"],
    }),
    updatePersona: builder.mutation<UserPersona, { id: string; data: Partial<UserPersona> }>({
      query: ({ id, data }) => ({
        url: `/personas/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Personas"],
    }),
    deletePersona: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/personas/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Personas"],
    }),

    // Chat Sessions
    getSessions: builder.query<ChatSession[], { characterId?: string } | void>({
      query: (params) => {
        const queryParams = params?.characterId ? `?characterId=${params.characterId}` : "";
        return `/sessions${queryParams}`;
      },
      providesTags: ["Sessions"],
    }),
    getSession: builder.query<ChatSession, string>({
      query: (id) => `/sessions/${id}`,
      providesTags: (result, error, id) => [{ type: "Session", id }, "Messages", "Memories"],
    }),
    createSession: builder.mutation<ChatSession, { characterId: string; userPersonaId?: string; preferredMaxTokens?: number }>({
      query: (body) => ({
        url: "/sessions",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Sessions"],
    }),
    resumeSession: builder.mutation<ChatSession, { characterId: string; userPersonaId?: string }>({
      query: (body) => ({
        url: "/sessions/resume",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Sessions"],
    }),
    updateSession: builder.mutation<ChatSession, { id: string; data: Partial<ChatSession> }>({
      query: ({ id, data }) => ({
        url: `/sessions/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Session", id }, "Sessions"],
    }),
    deleteSession: builder.mutation<{ success: boolean; deletedId?: string }, string>({
      query: (id) => ({
        url: `/sessions/${id}`,
        method: "DELETE",
      }),
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        // Optimistically remove session from cache immediately (0ms UI feedback)
        const patchResult = dispatch(
          baseApi.util.updateQueryData("getSessions", undefined, (draft) => {
            return draft.filter((s) => s.id !== id);
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo(); // Rollback if backend request failed
        }
      },
      invalidatesTags: (result, error, id) => [
        { type: "Session", id },
      ],
    }),
    deleteCharacterSessions: builder.mutation<{ success: boolean; deletedSessionIds?: string[] }, string>({
      query: (characterId) => ({
        url: `/sessions/character/${characterId}`,
        method: "DELETE",
      }),
      async onQueryStarted(characterId, { dispatch, queryFulfilled }) {
        // Optimistically remove all sessions of this character from cache immediately (0ms UI feedback)
        const patchResult = dispatch(
          baseApi.util.updateQueryData("getSessions", undefined, (draft) => {
            return draft.filter((s) => s.characterId !== characterId);
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: ["Sessions"],
    }),

    // Messages
    getMessages: builder.query<Message[], string>({
      query: (sessionId) => `/messages/session/${sessionId}`,
      providesTags: ["Messages"],
    }),
    editMessage: builder.mutation<{ message: Message; softDeletedCount: number }, { id: string; content: string }>({
      query: ({ id, content }) => ({
        url: `/messages/${id}`,
        method: "PUT",
        body: { content },
      }),
      invalidatesTags: ["Messages", "Session"],
    }),
    switchSwipe: builder.mutation<Message, { id: string; swipeIndex: number }>({
      query: ({ id, swipeIndex }) => ({
        url: `/messages/${id}/swipe`,
        method: "PATCH",
        body: { swipeIndex },
      }),
      invalidatesTags: ["Messages"],
    }),

    // Memories
    getMemories: builder.query<PinnedMemory[], { characterId: string; sessionId?: string }>({
      query: ({ characterId, sessionId }) => {
        const sess = sessionId ? `&sessionId=${sessionId}` : "";
        return `/memories?characterId=${characterId}${sess}`;
      },
      providesTags: ["Memories"],
    }),
    pinMemory: builder.mutation<PinnedMemory, { characterId: string; sessionId?: string; content: string; label?: string }>({
      query: (body) => ({
        url: "/memories",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Memories", "Session"],
    }),
    unpinMemory: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/memories/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Memories", "Session"],
    }),
  }),
});

export const {
  useGetHealthQuery,
  useGetCharactersQuery,
  useGetCharacterQuery,
  useCreateCharacterMutation,
  useUpdateCharacterMutation,
  useDeleteCharacterMutation,
  useGetPersonasQuery,
  useCreatePersonaMutation,
  useUpdatePersonaMutation,
  useDeletePersonaMutation,
  useGetSessionsQuery,
  useGetSessionQuery,
  useCreateSessionMutation,
  useResumeSessionMutation,
  useUpdateSessionMutation,
  useDeleteSessionMutation,
  useDeleteCharacterSessionsMutation,
  useGetMessagesQuery,
  useEditMessageMutation,
  useSwitchSwipeMutation,
  useGetMemoriesQuery,
  usePinMemoryMutation,
  useUnpinMemoryMutation,
} = baseApi;
