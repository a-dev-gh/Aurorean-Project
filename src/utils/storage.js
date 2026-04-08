export const STORAGE_KEY = 'agentic_chat_v1';

export function loadState() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return JSON.parse(s);
  } catch (e) {
    // silent fail
  }
  return null;
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // silent fail
  }
}

export function clearAll() {
  localStorage.removeItem(STORAGE_KEY);
}
