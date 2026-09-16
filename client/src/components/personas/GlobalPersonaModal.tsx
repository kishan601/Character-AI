import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useMatch } from "react-router-dom";
import { RootState } from "../../store/store.js";
import { setPersonaModalOpen } from "../../store/uiSlice.js";
import {
  useGetPersonasQuery,
  useGetSessionQuery,
  useUpdateSessionMutation,
  useUpdatePersonaMutation,
} from "../../api/baseApi.js";
import { UserPersonaModal } from "./UserPersonaModal.js";

export const GlobalPersonaModal: React.FC = () => {
  const dispatch = useDispatch();
  const isOpen = useSelector((state: RootState) => state.ui.personaModalOpen);

  const chatMatch = useMatch("/chat/:sessionId");
  const sessionId = chatMatch?.params.sessionId;

  const { data: session } = useGetSessionQuery(sessionId || "", {
    skip: !sessionId,
  });

  const { data: personas = [] } = useGetPersonasQuery();
  const [updateSession] = useUpdateSessionMutation();
  const [updatePersona] = useUpdatePersonaMutation();

  if (!isOpen) return null;

  const activePersonaId = sessionId
    ? session?.userPersona?.id || session?.userPersonaId
    : personas.find((p) => p.isDefault)?.id || personas[0]?.id;

  const handleSelectPersona = async (personaId: string) => {
    try {
      if (sessionId) {
        await updateSession({
          id: sessionId,
          data: { userPersonaId: personaId },
        }).unwrap();
      } else {
        await updatePersona({
          id: personaId,
          data: { isDefault: true },
        }).unwrap();
      }
    } catch (err) {
      console.error("Failed to select persona:", err);
    } finally {
      dispatch(setPersonaModalOpen(false));
    }
  };

  return (
    <UserPersonaModal
      isOpen={isOpen}
      onClose={() => dispatch(setPersonaModalOpen(false))}
      activePersonaId={activePersonaId}
      onSelectPersona={handleSelectPersona}
    />
  );
};
