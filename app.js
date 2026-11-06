(() => {
  "use strict";
  const gallery = document.getElementById("gallery-grid");
  const emptyState = document.getElementById("gallery-empty");
  const itemCount = document.getElementById("item-count");
  const dialog = document.getElementById("image-dialog");
  const dialogImage = document.getElementById("dialog-image");
  const dialogTitle = document.getElementById("dialog-title");
  let loadedCount = 0;
  const markers = Array.isArray(window.MARCADORES) ? window.MARCADORES : [];
  function updateState() {
    emptyState.hidden = loadedCount > 0;
    itemCount.textContent = loadedCount === 1 ? "1 MARCADOR NA COLEÇÃO" : loadedCount + " MARCADORES NA COLEÇÃO";
  }
  function openImage(src, title, side) {
    dialogImage.src = src;
    dialogImage.alt = title + (side ? " — " + side : "");
    dialogTitle.textContent = title + (side ? " · " + side : "");
    if (typeof dialog.showModal === "function") dialog.showModal();
  }
  function addImage(parent, src, title, side) {
    const button = document.createElement("button");
    button.type = "button"; button.className = "product-side";
    button.setAttribute("aria-label", "Ampliar " + title + (side ? " — " + side : ""));
    const img = document.createElement("img");
    img.src = src; img.alt = title + (side ? " — " + side : ""); img.loading = "lazy";
    button.appendChild(img);
    const label = document.createElement("span"); label.textContent = side || "frente"; button.appendChild(label);
    button.addEventListener("click", () => openImage(src, title, side));
    parent.appendChild(button);
  }
  markers.forEach((marker, index) => {
    const card = document.createElement("article"); card.className = "product-card";
    const imageWrap = document.createElement("div");
    imageWrap.className = marker.verso ? "product-image-wrap has-verso" : "product-image-wrap";
    addImage(imageWrap, marker.imagem, marker.titulo, "frente");
    if (marker.verso) addImage(imageWrap, marker.verso, marker.titulo, "verso");
    const meta = document.createElement("div"); meta.className = "product-meta";
    const name = document.createElement("span"); name.className = "product-name"; name.textContent = marker.titulo;
    const number = document.createElement("span"); number.className = "product-number"; number.textContent = "Nº " + String(index + 1).padStart(2, "0");
    meta.append(name, number); card.append(imageWrap, meta); gallery.appendChild(card); loadedCount += 1;
  });
  updateState();
  const menuToggle = document.getElementById("menu-toggle"); const nav = document.getElementById("main-nav");
  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Abrir menu" : "Fechar menu");
    nav.classList.toggle("is-open", !isOpen);
  });
  nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
    nav.classList.remove("is-open"); menuToggle.setAttribute("aria-expanded", "false"); menuToggle.setAttribute("aria-label", "Abrir menu");
  }));
  document.getElementById("dialog-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
  document.getElementById("current-year").textContent = new Date().getFullYear();
  const revealTargets = document.querySelectorAll(".intro, .collection-heading, .gallery-empty, .manifesto, .closing");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
    }), { threshold: 0.12 });
    revealTargets.forEach(target => target.classList.add("reveal")); revealTargets.forEach(target => observer.observe(target));
  } else revealTargets.forEach(target => target.classList.add("is-visible"));
})();