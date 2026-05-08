# Database Schema & Relational Model

Aegis persists conversations, character dossiers, memories, and user personas using Prisma ORM with an embedded SQLite database.

## Entities
- **Character**: Stores identity, greeting, definition, avatar URL, and background wallpaper URL.
- **ChatSession**: Represents an individual conversation thread linked to a Character.
- **Message**: Stores individual conversation turns, including alternative swipe options (swipes: JSON).
- **PinnedMemory**: High-importance user memories anchored across sessions.
- **UserPersona**: Custom user profiles defining user name, avatar, and persona prompt.
