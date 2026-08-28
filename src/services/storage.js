const SELECTED_CHARACTER_KEY = "selectedCharacterId";

export function getSelectedCharacterId() {
  return localStorage.getItem(SELECTED_CHARACTER_KEY);
}

export function setSelectedCharacterId(id) {
  localStorage.setItem(SELECTED_CHARACTER_KEY, id);
}