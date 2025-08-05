/**
 * Establishes a connection to the agent's streaming endpoint and handles real-time updates.
 *
 * @param {string} instruction - The user's instruction for the agent.
 * @param {string} code - The current code context for the agent.
 * @param {function} onUpdate - A callback function that is invoked with the agent's state for each update.
 * @param {function} onError - A callback function for handling errors.
 * @param {function} onComplete - A callback function that is invoked when the stream is closed by the server.
 * @returns {{close: function}} An object with a close function to manually terminate the connection.
 */
export function streamAgentExecution(instruction, code, onUpdate, onError, onComplete) {
  const controller = new AbortController();
  const signal = controller.signal;

  const stream = async () => {
    try {
      const response = await fetch('http://localhost:8000/agent/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          instruction: instruction,
          code: code
        }),
        signal: signal // Link the AbortController
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `API Error: ${response.status}` }));
        throw new Error(errorData.detail);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          if (onComplete) onComplete();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep incomplete messages in the buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            try {
              const update = JSON.parse(jsonStr);
              if (onUpdate) onUpdate(update);
            } catch (e) {
              console.error('Failed to parse stream data:', jsonStr, e);
              if (onError) onError(e);
            }
          }
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error("Streaming API call failed:", error);
        if (onError) onError(error);
      }
    }
  };

  stream();

  // Return an object with a 'close' method to allow aborting the fetch request
  return {
    close: () => {
      controller.abort();
    }
  };
}