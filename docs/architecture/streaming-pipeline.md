# Token Streaming & Frame Synchronization

High-throughput local LLMs emit SSE token packets faster than the browser DOM can reconcile, creating main-thread layout starvation on mobile devices.

## Solution Architecture
1. **Accumulator Buffer**: Incoming SSE text chunks are pushed to an in-memory queue rather than immediately triggering React state updates.
2. **requestAnimationFrame Synchronization**: A scheduled animation frame flushes accumulated text to React state exactly once per frame (16.6ms / 8.3ms for 120Hz displays).
3. **Isolated Component**: Live tokens render exclusively inside a dedicated <StreamingMessage /> component, preventing historical chat turns from re-evaluating.
