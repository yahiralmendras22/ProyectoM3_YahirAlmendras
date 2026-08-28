import { renderHome } from "./views/home.js";
import { renderChat } from "./views/chat.js";
import { renderAbout } from "./views/about.js";
import { renderNotFound } from "./views/notFound.js";

const routes = {
  "/": renderHome,
  "/chat": renderChat,
  "/about": renderAbout,
};

export function router() {
  const path = window.location.pathname;
  const render = routes[path] || renderNotFound;
  render();
}

export function navigateTo(path) {
  window.history.pushState({}, "", path);
  router();
}

export function initRouter() {
  // Interceptar clicks en cualquier <a> interno
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (!link) return;
    if (link.origin !== window.location.origin) return; // links externos, dejalos pasar
    e.preventDefault();
    navigateTo(link.pathname);
  });

  // Botones atrás/adelante del navegador
  window.addEventListener("popstate", router);

  router(); // render inicial
}