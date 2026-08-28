import { CHARACTERS } from "../services/prompts.js";
import { getSelectedCharacterId, setSelectedCharacterId } from "../services/storage.js";

const state = {
  selectedCharacterId: getSelectedCharacterId() ?? CHARACTERS[0].id,
};

export function renderHome() {
  const app = document.querySelector("#app");
  app.innerHTML = `
    <section class="view view--home">
      <h1>Chatea con tu personaje favorito</h1>
      <p>Una experiencia conversacional con IA.</p>

      <section class="characterGallery">
        <h2 class="characterGallery__title">Elegí con quién querés chatear</h2>
        <div class="characterGallery__grid" id="characterGalleryGrid">
          ${renderGallery()}
        </div>
      </section>

      <p style="text-align:center; margin-top: 2rem;">
        <a class="btn btn--primary" href="/chat">Empezar a chatear</a>
      </p>
    </section>
  `;

  setupHome();
}

function renderGallery() {
  return CHARACTERS.map(
    (c) => `
    <button
      type="button"
      class="characterGallery__item ${state.selectedCharacterId === c.id ? "characterGallery__item--selected" : ""}"
      data-character-id="${c.id}"
    >
      <img
        class="characterGallery__image"
        src="${c.image}"
        alt="${c.name}"
      />
      <h3 class="characterGallery__name">${c.name}</h3>
      <p class="characterGallery__tagline">${c.tagline}</p>
    </button>
  `,
  ).join("");
}

function setState(updates) {
  Object.assign(state, updates);
  renderHome();
}

function setupHome() {
  const $galleryGrid = document.querySelector("#characterGalleryGrid");

  $galleryGrid.addEventListener("click", (event) => {
    const $button = event.target.closest("[data-character-id]");
    if (!$button) return;

    const characterId = $button.dataset.characterId;
    setSelectedCharacterId(characterId);
    setState({ selectedCharacterId: characterId });
  });
}