import { getCharacterReply } from "../services/aiClient.js";
import { debounce, wait } from "../services/debounce.js";
import { getUserMessage } from "../ui/messages.js";
import { getSelectedCharacterId } from "../services/storage.js";
import { CHARACTERS } from "../services/prompts.js"; 

const state = {
    characterId: "", 
    messages: [],
    status: "idle",
    error: null,
    lastUserMessage: null,
    retryCountdown: null,
};

export function renderChat() {
    // Leemos el ID guardado justo al renderizar la vista
    const currentCharacter = getSelectedCharacterId() || "vegeta";
    
    // Si el estado está vacío o cambió de personaje, reiniciamos los mensajes y el ID
    if (!state.characterId || state.characterId !== currentCharacter) {
        state.characterId = currentCharacter;
        state.messages = [{ role: "character", text: "Hola, soy tu personaje favorito. Qué quieres saber?" }];
        state.status = "idle";
        state.error = null;
    }

    // Buscamos el objeto del personaje actual dentro del array
    const characterData = CHARACTERS.find(c => c.id === state.characterId);

    const app = document.querySelector("#app");
    app.innerHTML = `
        <div class="chatApp">
            <header class="chatHeader" style="border-bottom: 1px solid #eee; padding-bottom: 0.5rem; margin-bottom: 1rem;">
                <div class="chatHeader__profile" style="display: flex; align-items: center; gap: 1rem; padding: 0.5rem 0;">
                    
                    <!-- Botón para regresar a la galería de personajes -->
                    <a href="/" class="chatHeader__back" style="text-decoration: none; font-size: 1.5rem; color: #333; padding: 0.2rem 0.5rem; transition: opacity 0.2s;" title="Volver al inicio">
                        ←
                    </a>

                    <img 
                        class="chatHeader__avatar" 
                        src="${characterData?.image || ''}" 
                        alt="${characterData?.name || 'Personaje'}" 
                        style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid #ccc;"
                    />
                    <div class="chatHeader__meta" style="display: flex; flex-direction: column;">
                        <h1 class="chatHeader__title" style="margin: 0; font-size: 1.5rem;">Chat con ${characterData?.name || 'Tu personaje'}</h1>
                        <p class="chatHeader__subtitle" style="margin: 0; color: #666; font-size: 0.9rem;">${characterData?.tagline || ''}</p>
                    </div>
                </div>
            </header>

            <main class="chatMessages" id="chatMessages" aria-live="polite">
                ${renderMessages()}
                ${renderStatus()}
            </main>

            <form class="chatComposer" id="chatComposer">
                <input
                    class="chatComposer__input"
                    id="chatInput"
                    type="text"
                    placeholder="Escribe un mensaje..."
                    aria-label="Escribe tu mensaje"
                    ${state.status === "loading" ? "disabled" : ""}
                />
                <button class="chatComposer__send" type="submit" ${state.status === "loading" ? "disabled" : ""}>
                    Enviar
                </button>
            </form>
        </div>
    `;

    setupChat();
    scrollToBottom();
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
    renderChat();
}

function setupChat() {
    const $form = document.querySelector("#chatComposer");
    const $input = document.querySelector("#chatInput");
    const $retry = document.querySelector("#retryBtn");

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

    $input.focus();
}

async function sendMessage(text, isRetry = false) {
    const nextMessages = isRetry ? state.messages : [...state.messages, { role: "user", text }];

    setState({
        messages: nextMessages,
        status: "loading",
        error: null,
        lastUserMessage: isRetry ? state.lastUserMessage : text,
    });

    try {
        const reply = await getCharacterReply(state.characterId, nextMessages);
        setState({
            messages: [...nextMessages, { role: "character", text: reply }],
            status: "idle",
            error: null,
            lastUserMessage: null,
        });

    } catch (error) {
        if (error.status === 429) {
            const seconds = error.retryAfterSeconds ?? 5;

            for (let s = seconds; s > 0; s--) {
                setState({ status: "loading", retryCountdown: s });
                await wait(1000);
            }

            try {
                setState({ status: "loading", retryCountdown: null });
                const reply = await getCharacterReply(state.characterId, nextMessages);
                setState({
                    messages: [...nextMessages, { role: "character", text: reply }],
                    status: "idle",
                    error: null,
                    lastUserMessage: null,
                });
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

function scrollToBottom() {
    const $messages = document.querySelector("#chatMessages");
    if ($messages) {
        $messages.scrollTop = $messages.scrollHeight;
    }
}
