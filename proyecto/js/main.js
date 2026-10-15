"use strict";
const menu = document.querySelector(".menu-button");
const navigation = document.querySelector(".nav");
menu?.addEventListener("click", () => {
  const expanded = menu.getAttribute("aria-expanded") === "true";
  menu.setAttribute("aria-expanded", String(!expanded));
  menu.setAttribute("aria-label", expanded ? "Abrir menú" : "Cerrar menú");
  navigation.classList.toggle("open", !expanded);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && navigation.classList.contains("open")) {
    navigation.classList.remove("open");
    menu.setAttribute("aria-expanded", "false");
    menu.setAttribute("aria-label", "Abrir menú");
    menu.focus();
  }
});
const searchDialog = document.querySelector("#search-dialog");
document
  .querySelector("#search-open")
  ?.addEventListener("click", () => searchDialog.showModal());
document
  .querySelector("#search-close")
  ?.addEventListener("click", () => searchDialog.close());
searchDialog?.addEventListener("click", (event) => {
  if (event.target === searchDialog) {
    const rect = searchDialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      searchDialog.close();
  }
});
let saved = [];
try {
  const value = JSON.parse(localStorage.getItem("viveverde-favorites") || "[]");
  if (Array.isArray(value))
    saved = value.filter((id) => typeof id === "string");
} catch {
  /* Favorites remain available in memory when storage is unavailable. */
}
const favorites = new Set(saved);
const savedCatalog = document.querySelector(".catalog-grid");
if (
  savedCatalog &&
  new URLSearchParams(location.search).get("favoritos") === "1"
) {
  savedCatalog.append(
    document.querySelector("#variant-products").content.cloneNode(true),
  );
}
const favoriteButtons = [...document.querySelectorAll("[data-favorite]")];
const toast = document.querySelector(".toast");
let toastTimer;
function notify(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2800);
}
function updateFavorites() {
  document.querySelector("#favorite-count").textContent = favorites.size;
  favoriteButtons.forEach((button) => {
    const selected = favorites.has(button.dataset.favorite);
    button.setAttribute("aria-pressed", String(selected));
    const title = button.closest("article").querySelector("h3").textContent;
    button.setAttribute(
      "aria-label",
      `${selected ? "Quitar" : "Guardar"} ${title} ${selected ? "de" : "en"} favoritos`,
    );
  });
}
updateFavorites();
favoriteButtons.forEach((button) =>
  button.addEventListener("click", () => {
    const id = button.dataset.favorite;
    if (favorites.has(id)) {
      favorites.delete(id);
      notify("Producto eliminado de tus favoritos.");
    } else {
      favorites.add(id);
      notify("Producto guardado en tus favoritos.");
    }
    try {
      localStorage.setItem(
        "viveverde-favorites",
        JSON.stringify([...favorites]),
      );
    } catch {
      notify("Favorito actualizado. Solo se guardará durante esta visita.");
    }
    updateFavorites();
    filterCatalog();
  }),
);
const homeGrid = document.querySelector(".home-grid");
document.querySelectorAll("[data-filter]").forEach((button) =>
  button.addEventListener("click", () => {
    document
      .querySelectorAll("[data-filter]")
      .forEach((tab) =>
        tab.setAttribute("aria-pressed", String(tab === button)),
      );
    const category = button.dataset.filter;
    homeGrid.classList.toggle("is-filtered", category !== "all");
    homeGrid.querySelectorAll("article").forEach((card) => {
      card.hidden = category !== "all" && card.dataset.category !== category;
    });
  }),
);
const catalog = document.querySelector(".catalog-grid");
const query = new URLSearchParams(location.search);
const normalize = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
function filterCatalog() {
  if (!catalog) return;
  const search = normalize(query.get("q") || "").trim();
  const onlySaved = query.get("favoritos") === "1";
  let count = 0;
  catalog.querySelectorAll("article").forEach((card) => {
    const id = card.dataset.productId;
    const isSaved = favorites.has(id);
    card.hidden =
      !normalize(card.dataset.search).includes(search) ||
      (onlySaved && !isSaved);
    if (!card.hidden) count++;
  });
  document.querySelector("#results-count").textContent =
    `${count} producto${count === 1 ? "" : "s"}${onlySaved ? " en favoritos" : search ? " encontrados" : " · Precios en COP"}`;
  document.querySelector(".empty-state").hidden = count > 0;
  if (onlySaved)
    document.querySelector(".page-intro h1").textContent =
      "Tus favoritos, con propósito.";
  else if (search)
    document.querySelector(".page-intro h1").textContent =
      `Resultados para “${query.get("q")}”`;
}
filterCatalog();
document.querySelector("#product-sort")?.addEventListener("change", (event) => {
  const cards = [...catalog.querySelectorAll("article")];
  cards.forEach((card, index) => {
    if (!card.dataset.originalOrder)
      card.dataset.originalOrder = String(index + 1);
  });
  const price = (card) =>
    Number(
      card.querySelector(".product-bottom>span").textContent.replace(/\D/g, ""),
    );
  cards.sort((a, b) =>
    event.target.value === "asc"
      ? price(a) - price(b)
      : event.target.value === "desc"
        ? price(b) - price(a)
        : Number(a.dataset.originalOrder) - Number(b.dataset.originalOrder),
  );
  cards.forEach((card) => catalog.append(card));
});
const energy = document.querySelector("#energia");
energy?.addEventListener("input", () => {
  document.querySelector("#energy-value").value = energy.value;
});
const result = document.querySelector("#result-number");
if (result) {
  const energyValue = Number(query.get("energia"));
  const km = Number(query.get("km"));
  const mode = query.get("transporte");
  const factors = { auto: 0.192, publico: 0.089, bici: 0 };
  if (
    query.has("energia") &&
    query.get("energia")?.trim() &&
    query.has("km") &&
    query.get("km")?.trim() &&
    Number.isFinite(energyValue) &&
    energyValue >= 0 &&
    energyValue <= 1000 &&
    Number.isFinite(km) &&
    km >= 0 &&
    km <= 100000 &&
    Object.hasOwn(factors, mode)
  ) {
    const electricity = energyValue * 0.126;
    const transport = km * factors[mode];
    const format = (value) =>
      value.toLocaleString("es-CO", { maximumFractionDigits: 1 });
    result.replaceChildren(
      document.createTextNode(format(electricity + transport) + " "),
    );
    const unit = document.createElement("small");
    unit.textContent = "kg CO₂e / mes";
    result.append(unit);
    document.querySelector("#result-description").textContent =
      mode === "bici"
        ? "Moverte en bicicleta o a pie evita emisiones directas en tus desplazamientos. Sigue cuidando tu consumo de energía."
        : "Prueba a compartir tus trayectos, caminar distancias cortas y apagar los aparatos que no utilizas. Cada pequeño hábito cuenta.";
    const breakdown = document.querySelector("#result-breakdown");
    breakdown.hidden = false;
    for (const text of [
      `Electricidad: ${format(electricity)} kg CO₂e`,
      `Transporte: ${format(transport)} kg CO₂e`,
    ]) {
      const span = document.createElement("span");
      span.textContent = text;
      breakdown.append(span);
    }
  }
}
document.querySelector("#contact-form")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const text = `CONSULTA VIVEVERDE\n\nNombre: ${data.get("nombre")}\nCorreo: ${data.get("correo")}\nAsunto: ${data.get("asunto")}\n\n${data.get("mensaje")}\n\nEste archivo es una copia local. No se ha enviado ningún mensaje.`;
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "mi-consulta-viveverde.txt";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  document.querySelector("#contact-status").textContent =
    "Tu consulta está lista para descargar. No se ha enviado ningún mensaje.";
});
