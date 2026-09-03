import { getCharacterReply } from "../services/aiClient.js";
import { debounce, wait } from "../services/debounce.js";
import { getUserMessage } from "../ui/messages.js";
import {
    getSelectedCharacterId,
    setSelectedCharacterId,
    getChatHistory,
    setChatHistory,
    getChattedCharacterIds,
} from "../services/storage.js";
import { CHARACTERS } from "../services/prompts.js";

const state = {
    characterId: "",
    messages: [],
    status: "idle",
    error: null,
    lastUserMessage: null,
    retryCountdown: null,
};

// Cuando esto es true, el próximo renderChat() fuerza scroll al fondo
// sin importar dónde estaba el usuario (ej: acaba de mandar un mensaje).
let forceScrollToBottom = false;

export function renderChat() {
    const currentCharacter = getSelectedCharacterId() || "vegeta";

    // Medimos la posición de scroll ANTES de reconstruir el DOM,
    // porque después de app.innerHTML = ... el elemento es nuevo
    // y su scrollTop siempre arranca en 0.
    const $prevMessages = document.querySelector("#chatMessages");
    const wasNearBottom = $prevMessages
        ? $prevMessages.scrollHeight - $prevMessages.scrollTop - $prevMessages.clientHeight < 150
        : true; // primera carga: no hay nada que medir, asumimos "al fondo"

    const shouldScrollToBottom = forceScrollToBottom || wasNearBottom;
    forceScrollToBottom = false; // se consume en este render

    if (!state.characterId || state.characterId !== currentCharacter) {
        state.characterId = currentCharacter;

        const characterData = CHARACTERS.find(c => c.id === currentCharacter);
        const savedHistory = getChatHistory(currentCharacter);

        state.messages =
            savedHistory && savedHistory.length > 0
                ? savedHistory
                : [{ role: "character", text: characterData?.greeting || "Hola, ¿qué quieres saber?" }];

        state.status = "idle";
        state.error = null;
    }

    const characterData = CHARACTERS.find(c => c.id === state.characterId);

    const app = document.querySelector("#app");
    app.innerHTML = `
        <div class="chatApp">
            <aside class="chatSidebar">
                <h2 class="chatSidebar__title">Tus conversaciones</h2>
                <div class="chatSidebar__list" id="chatSidebarList">
                    ${renderSidebar()}
                </div>
            </aside>

            <div class="chatMain">
                <header class="chatHeader">
                    <div class="chatHeader__profile">
                        <a href="/" class="chatHeader__back" title="Volver al inicio">←</a>
                        <img
                            class="chatHeader__avatar"
                            src="${characterData?.image || ''}"
                            alt="${characterData?.name || 'Personaje'}"
                        />
                        <div class="chatHeader__meta">
                            <h1 class="chatHeader__title">Chat con ${characterData?.name || 'Tu personaje'}</h1>
                            <p class="chatHeader__subtitle">${characterData?.tagline || ''}</p>
                        </div>
                    </div>
                </header>

                <main class="chatMessages" id="chatMessages" aria-live="polite">
                    ${renderMessages()}
                    ${renderStatus()}
                </main>

                <form class="chatComposer" id="chatComposer" autocomplete="off">
                    <input
                        class="chatComposer__input"
                        id="chatInput"
                        type="text"
                        placeholder="Escribe un mensaje..."
                        aria-label="Escribe tu mensaje"
                        autocomplete="off"
                        ${state.status === "loading" ? "disabled" : ""}
                    />
                    <button class="chatComposer__send" type="submit" ${state.status === "loading" ? "disabled" : ""}>
                        Enviar
                    </button>
                </form>
            </div>
        </div>
    `;

    setupChat();
    scrollToBottom(shouldScrollToBottom);
}

function renderSidebar() {
    const chattedIds = getChattedCharacterIds();

    if (chattedIds.length === 0) {
        return `<p class="chatSidebar__empty">Todavía no tenés conversaciones guardadas.</p>`;
    }

    return CHARACTERS.filter(c => chattedIds.includes(c.id))
        .map(
            (c) => `
            <button
                type="button"
                class="chatSidebar__item ${c.id === state.characterId ? "chatSidebar__item--active" : ""}"
                data-character-id="${c.id}"
            >
                <img class="chatSidebar__avatar" src="${c.image}" alt="${c.name}" />
                <span class="chatSidebar__name">${c.name}</span>
            </button>
        `,
        )
        .join("");
}

function renderMessages() {
    return state.messages
        .map(
            (msg) => `
             <div class="message message--${msg.role}">${escapeHtml(msg.text)}</div>
            `,
        )
        .join("");
}

function renderStatus() {
    if (state.status === "loading" && state.retryCountdown != null) {
        return `
            <div class="message message--character message--typing">
                Esperando para reintentar (${state.retryCountdown} segundos)...
            </div>
        `;
    }

    if (state.status === "loading") {
        return `<div class="message message--character message--typing">escribiendo...</div>`;
    }

    if (state.status === "error") {
        return `
            <div class="message message--error">
                ${state.error}
                <button class="message__retry" id="retryBtn" type="button">Reintentar</button>
            </div>
        `;
    }

    return "";
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function setState(updates) {
    Object.assign(state, updates);

    if (updates.messages) {
        setChatHistory(state.characterId, state.messages);
    }

    renderChat();
}

function setupChat() {
    const $form = document.querySelector("#chatComposer");
    const $input = document.querySelector("#chatInput");
    const $retry = document.querySelector("#retryBtn");
    const $sidebarList = document.querySelector("#chatSidebarList");

    const debouncedSend = debounce(async () => {
        if (state.status === "loading") return;

        const text = $input.value.trim();
        if (!text) return;

        await sendMessage(text);
        $input.value = "";
    }, 200);

    $form.addEventListener("submit", async (event) => {
        event.preventDefault();
        debouncedSend();
    });

    $retry?.addEventListener("click", () => {
        if (state.lastUserMessage) {
            sendMessage(state.lastUserMessage, true);
        }
    });

    $sidebarList.addEventListener("click", (event) => {
        const $button = event.target.closest("[data-character-id]");
        if (!$button) return;

        const characterId = $button.dataset.characterId;
        if (characterId === state.characterId) return;

        setSelectedCharacterId(characterId);
        state.characterId = ""; // fuerza a renderChat a recargar el historial de este personaje
        renderChat();
    });

    $input.focus();
}

async function attemptSend(nextMessages) {
    const reply = await getCharacterReply(state.characterId, nextMessages);
    setState({
        messages: [...nextMessages, { role: "character", text: reply }],
        status: "idle",
        error: null,
        lastUserMessage: null,
    });
}

async function sendMessage(text, isRetry = false) {
    const nextMessages = isRetry ? state.messages : [...state.messages, { role: "user", text }];

    // El usuario acaba de mandar un mensaje: siempre queremos verlo,
    // sin importar en qué parte del historial estaba haciendo scroll.
    forceScrollToBottom = true;

    setState({
        messages: nextMessages,
        status: "loading",
        error: null,
        lastUserMessage: isRetry ? state.lastUserMessage : text,
    });

    try {
        await attemptSend(nextMessages);
    } catch (error) {
        if (error.status === 429) {
            const seconds = error.retryAfterSeconds ?? 5;

            for (let s = seconds; s > 0; s--) {
                setState({ status: "loading", retryCountdown: s });
                await wait(1000);
            }

            try {
                setState({ status: "loading", retryCountdown: null });
                await attemptSend(nextMessages);
                return;
            } catch (errorRetry) {
                setState({
                    status: "error",
                    error: getUserMessage(errorRetry),
                });
                return;
            }
        }

        setState({
            status: "error",
            error: getUserMessage(error),
        });
    }
}

function scrollToBottom(shouldScroll) {
    const $messages = document.querySelector("#chatMessages");
    if (!$messages) return;

    if (shouldScroll) {
        $messages.scrollTop = $messages.scrollHeight;
    }
}