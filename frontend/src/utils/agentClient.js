export async function callAgent(code, instruction) {
  try {
    const res = await fetch('/api/agent', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ 
        code, 
        instruction,
        stream: false, // Use non-streaming API
        config: {
          max_iterations: 5,
          temperature: 0.7
        }
      })
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || `API Error: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    
    // Map backend response to frontend expected format
    return {
      result: data.final_code,
      plan: data.execution_log || []
    };
    
  } catch (error) {
    console.error("API Call Failed:", error);
    throw error;
  }
}

// New function for streaming execution
export async function streamAgentExecution(code, instruction, onUpdate) {
  try {
    const res = await fetch('/api/agent/stream', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ 
        code, 
        instruction,
        config: {
          max_iterations: 8,
          temperature: 0.8
        }
      })
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || `API Error: ${res.status} ${res.statusText}`);
    }
    
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      // Process each event
      const events = buffer.split('\n\n');
      buffer = events.pop() || ''; // Keep incomplete events in buffer
      
      for (const event of events) {
        if (event.startsWith('data: ')) {
          const jsonStr = event.slice(6);
          try {
            const update = JSON.parse(jsonStr);
            onUpdate(update);
          } catch (e) {
            console.error('Error parsing SSE event:', e);
          }
        }
      }
    }
    
  } catch (error) {
    console.error("Streaming API Call Failed:", error);
    throw error;
  }
}