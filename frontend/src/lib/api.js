const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

// === WebSocket Generation Client ===
export function connectAndGenerate(requestData, callbacks) {
  const { onAgentStart, onAgentResult, onComplete, onError, onClose } = callbacks;
  
  // Establish WebSocket connection
  const socket = new WebSocket(`${WS_URL}/ws/generate`);

  socket.onopen = () => {
    // Send request payload once connection is open
    socket.send(JSON.stringify(requestData));
  };

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'agent_start':
          if (onAgentStart) onAgentStart(message.agent, message.message);
          break;
        case 'agent_result':
          if (onAgentResult) onAgentResult(message.agent, message.data);
          break;
        case 'complete':
          if (onComplete) onComplete(message.data, message.generation_id);
          socket.close();
          break;
        case 'error':
          if (onError) onError(message.message);
          socket.close();
          break;
        default:
          break;
      }
    } catch (err) {
      if (onError) onError('Failed to parse response stream from server.');
    }
  };

  socket.onerror = (error) => {
    if (onError) onError('WebSocket connection encountered an error.');
  };

  socket.onclose = () => {
    if (onClose) onClose();
  };

  return socket;
}

// === Settings REST Client ===
export async function getSettings() {
  const res = await fetch(`${API_URL}/api/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateSettings(data) {
  const res = await fetch(`${API_URL}/api/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to save settings');
  return res.json();
}

// === History REST Client ===
export async function getHistory() {
  const res = await fetch(`${API_URL}/api/history`);
  if (!res.ok) throw new Error('Failed to load generation history');
  return res.json();
}

export async function getGeneration(id) {
  const res = await fetch(`${API_URL}/api/history/${id}`);
  if (!res.ok) throw new Error('Failed to load generation detail');
  return res.json();
}

export async function deleteGeneration(id) {
  const res = await fetch(`${API_URL}/api/history/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete history item');
  return res.json();
}

// === Utility REST Clients ===
export async function healthCheck() {
  const res = await fetch(`${API_URL}/api/health`);
  if (!res.ok) throw new Error('Backend server is offline');
  return res.json();
}

