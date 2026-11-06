(() => {
  "use strict";

  const gallery = document.getElementById("gallery-grid");
  const emptyState = document.getElementById("gallery-empty");
  const itemCount = document.getElementById("item-count");
  const dialog = document.getElementById("image-dialog");
  const dialogImage = document.getElementById("dialog-image");
  const dialogTitle = document.getElementById("dialog-title");
  const extensions = ["jpg", "jpeg", "png", "webp"];

  let loadedCount = 0;
  let completedCount = 0;
  const markers = Array.isArray(window.MARCADORES) ? window.MARCADORES : [];

  function updateGalleryState() {
    if (loadedCount > 0) {
      emptyState.hidden = true;
      itemCount.textContent = loadedCount === 1 ? "1 MARCADOR NA COLEÇÃO" : loadedCount + " MARCADORES NA COLEÇÃO";
    } else if (completedCount >= markers.length) {
      emptyState.hidden = false;
      itemCount.textContent = "FOTOS EM PREPARAÇÃO";
    }
  }

  function openImage(src, title, alt) {
    dialogImage.src = src;
    dialogImage.alt = alt || title;
    dialogTitle.textContent = title;
    if (typeof dialog.showModal === "function") dialog.showModal();
  }

  function createCard(marker, index) {
    const card = document.createElement("button");
    card.className = "product-card";
    card.type = "button";
    card.setAttribute("aria-label", "Ampliar " + marker.titulo);

    const imageWrap = document.createElement("span");
    imageWrap.className = "product-image-wrap";
    const image = document.createElement("img");
    image.className = "product-image";
    image.alt = marker.descricao || marker.titulo;
    image.loading = "lazy";
    imageWrap.appendChild(image);

    const meta = document.createElement("span");
    meta.className = "product-meta";
    const name = document.createElement("span");
    name.className = "product-name";
    name.textContent = marker.titulo || ("Marcador " + String(index + 1).padStart(2, "0"));
    const number = document.createElement("span");
    number.className = "product-number";
    number.textContent = "Nº " + String(index + 1).padStart(2, "0");
    meta.append(name, number);
    card.append(imageWrap, meta);

    card.addEventListener("click", () => openImage(image.currentSrc || image.src, name.textContent, image.alt));
    gallery.appendChild(card);

    let attempt = 0;
    const base = marker.imagem;
    const tryExtension = () => {
      if (attempt >= extensions.length) {
        card.remove();
        completedCount += 1;
        updateGalleryState();
        return;
      }
      image.src = base + "." + extensions[attempt++];
    };
    image.addEventListener("load", () => {
      loadedCount += 1;
      completedCount += 1;
      updateGalleryState();
    }, { once: true });
    image.addEventListener("error", tryExtension);
    tryExtension();
  }

  if (markers.length) {
    markers.forEach(createCard);
  } else {
    completedCount = 1;
    updateGalleryState();
  }

  const menuToggle = document.getElementById("menu-toggle");
  const nav = document.getElementById("main-nav");
  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Abrir menu" : "Fechar menu");
    nav.classList.toggle("is-open", !isOpen);
  });

  nav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Abrir menu");
    });
  });

  document.getElementById("dialog-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });
  document.getElementById("current-year").textContent = new Date().getFullYear();

  const revealTargets = document.querySelectorAll(".intro, .collection-heading, .gallery-empty, .manifesto, .closing");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealTargets.forEach(target => target.classList.add("reveal"));
    revealTargets.forEach(target => observer.observe(target));
  } else {
    revealTargets.forEach(target => target.classList.add("is-visible"));
  }
})();