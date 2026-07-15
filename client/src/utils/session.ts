const SESSION_KEY = 'sketchgame_session';

export interface PlayerSession {
  roomId: string;
  playerName: string;
}

export function saveSession(session: PlayerSession) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore storage errors
  }
}

export function loadSession(): PlayerSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlayerSession;
    if (!parsed?.roomId || !parsed?.playerName) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
