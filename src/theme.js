const THEME_KEY = "energia-clara-theme";
const root = document.documentElement;
const toggle = document.querySelector("[data-theme-toggle]");
const themeLabel = document.querySelector("[data-theme-label]");
const themeColor = document.querySelector("#theme-color-meta");
const systemPreference = window.matchMedia("(prefers-color-scheme: light)");

function applyTheme(theme, persist = false) {
  const isLight = theme === "light";
  root.dataset.theme = isLight ? "light" : "dark";
  toggle.setAttribute("aria-pressed", String(isLight));
  toggle.setAttribute("aria-label", `Ativar tema ${isLight ? "escuro" : "claro"}`);
  toggle.title = `Ativar tema ${isLight ? "escuro" : "claro"}`;
  themeLabel.textContent = isLight ? "Escuro" : "Claro";
  themeColor.content = isLight ? "#f2f6f7" : "#08131c";
  if (persist) localStorage.setItem(THEME_KEY, root.dataset.theme);
}

applyTheme(root.dataset.theme || (systemPreference.matches ? "light" : "dark"));
toggle.addEventListener("click", () => {
  applyTheme(root.dataset.theme === "dark" ? "light" : "dark", true);
});
systemPreference.addEventListener("change", (event) => {
  if (!localStorage.getItem(THEME_KEY)) applyTheme(event.matches ? "light" : "dark");
});
