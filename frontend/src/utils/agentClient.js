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
      console.log('Starting agent stream...', { instruction: instruction.substring(0, 50) });
      
      const response = await fetch('http://localhost:8000/agent/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          instruction: instruction,
          code: code
        }),
        signal: signal // Link the AbortController
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { detail: `HTTP ${response.status}: ${response.statusText}` };
        }
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      console.log('Response received, starting to read stream...');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let updateCount = 0;

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          console.log(`Stream completed. Received ${updateCount} updates.`);
          if (onComplete) onComplete();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep incomplete messages in the buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr) {
              try {
                const update = JSON.parse(jsonStr);
                updateCount++;
                
                // Skip heartbeat messages from logging
                if (!update.heartbeat) {
                  console.log(`Update #${updateCount}:`, {
                    taskId: update.task_id,
                    complete: update.task_complete,
                    failed: update.task_failed,
                    progress: update.progress?.percentage
                  });
                }
                
                // Always call onUpdate, even for heartbeats (frontend can filter)
                if (onUpdate) onUpdate(update);
              } catch (e) {
                console.error('Failed to parse stream data:', jsonStr, e);
                if (onError) onError(new Error(`Failed to parse server response: ${e.message}`));
              }
            }
          }
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error("Streaming API call failed:", error);
        if (onError) onError(error);
      } else {
        console.log('Stream aborted by user');
      }
    }
  };

  stream();

  // Return an object with a 'close' method to allow aborting the fetch request
  return {
    close: () => {
      console.log('Closing agent stream...');
      controller.abort();
    }
  };
}