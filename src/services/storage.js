const SELECTED_CHARACTER_KEY = "selectedCharacterId";
const CHAT_HISTORY_PREFIX = "chatHistory:";

export function getSelectedCharacterId() {
  return localStorage.getItem(SELECTED_CHARACTER_KEY);
}

export function setSelectedCharacterId(id) {
  localStorage.setItem(SELECTED_CHARACTER_KEY, id);
}

export function getChatHistory(characterId) {
  const raw = localStorage.getItem(CHAT_HISTORY_PREFIX + characterId);
  return raw ? JSON.parse(raw) : null;
}

export function setChatHistory(characterId, messages) {
  localStorage.setItem(CHAT_HISTORY_PREFIX + characterId, JSON.stringify(messages));
}

export function getChattedCharacterIds() {
  const ids = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CHAT_HISTORY_PREFIX)) {
      ids.push(key.slice(CHAT_HISTORY_PREFIX.length));
    }
  }
  return ids;
}

export function clearChatHistory(characterId) {
  localStorage.removeItem(CHAT_HISTORY_PREFIX + characterId);
}