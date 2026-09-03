import { CHARACTERS } from "../services/prompts.js";
import { setSelectedCharacterId } from "../services/storage.js";
import { navigateTo } from "../navigation.js";

export function renderAbout() {
    const app = document.querySelector("#app");

    app.innerHTML = `
        <div class="view">
            <h1>Sobre los personajes</h1>
            <p>Conocé un poquito de cada uno antes de empezar a chatear.</p>

            <div class="aboutList" id="aboutList">
                ${renderCharacterCards()}
            </div>

            <a href="/" class="btn btn--primary">Volver al inicio</a>
        </div>
    `;

    setupAbout();
}

function renderCharacterCards() {
    return CHARACTERS
        .map(
            (c) => `
            <article class="aboutCard">
                <img class="aboutCard__image" src="${c.image}" alt="${c.name}" />
                <div class="aboutCard__info">
                    <h2 class="aboutCard__name">${c.name}</h2>
                    <p class="aboutCard__tagline">${c.tagline}</p>
                    <p class="aboutCard__desc">${getCharacterDescription(c.id)}</p>
                    <button type="button" class="aboutCard__cta" data-character-id="${c.id}">
                        Chatear con ${c.name}
                    </button>
                </div>
            </article>
        `,
        )
        .join("");
}

function getCharacterDescription(id) {
    const descriptions = {
        vegeta:
            "El Príncipe de los Saiyajin. Orgulloso, arrogante y obsesionado con superar a Goku. No tolera a los débiles, pero su honor guerrero es innegociable.",
        cartman:
            "El líder autoproclamado de su grupo de amigos en South Park. Manipulador, egocéntrico y siempre buscando salirse con la suya... o culpar a alguien más.",
        stewie:
            "Un bebé con inteligencia de genio malvado y acento británico. Entre pañales y biberones, encuentra tiempo para sus planes de dominación mundial.",
    };

    return descriptions[id] || "";
}

function setupAbout() {
    const $list = document.querySelector("#aboutList");

    $list.addEventListener("click", (event) => {
        const $button = event.target.closest("[data-character-id]");
        if (!$button) return;

        const characterId = $button.dataset.characterId;
        setSelectedCharacterId(characterId);
        navigateTo("/chat");
    });
}