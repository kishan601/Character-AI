# Aegis Gateway Architecture & Inference Pipeline

The Aegis architecture decouples the React frontend from the local LM Studio instance via a dedicated Express gateway.

## Topology
`
React Client / Android WebView
       │  (HTTP / SSE)
       ▼
Express API Gateway (:3001)
       │  (OpenAI-compatible HTTP)
       ▼
LM Studio Server (:1234)
`

## Key Principles
1. **Network Isolation**: The client never directly calls LM Studio. All requests pass through the gateway to enforce validation, CORS, and request tracking.
2. **SSE Streaming**: Responses are streamed via Server-Sent Events with line-delimited JSON chunks.
3. **Session State**: Gateway persists conversation history in SQLite via Prisma.
