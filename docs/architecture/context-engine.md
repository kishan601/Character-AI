# 7-Layer Context Engine Specification

Aegis employs a multi-tiered context builder to ensure high-fidelity roleplay and conversation coherence without exceeding token context budgets.

## Layer Hierarchy (Top to Bottom)
1. **System Persona Prompt**: Base behavioral boundaries and character identity.
2. **Character Definition & World Lore**: Greeting, dialogue style, and scenario backstory.
3. **User Persona Profile**: The user persona identity, backstory, and preferences.
4. **Pinned Memories**: Explicit user-pinned memory anchors that never expire.
5. **Dynamic Memory Summaries**: Compacted summaries of historical conversation segments.
6. **Recent Raw Turn Window**: Sliding window of recent turns preserved word-for-word.
7. **Current User Turn**: The active message prompting generation.
