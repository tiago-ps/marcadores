(() => {
  "use strict";

  const gallery = document.getElementById("gallery-grid");
  const emptyState = document.getElementById("gallery-empty");
  const itemCount = document.getElementById("item-count");
  const searchInput = document.getElementById("gallery-search");
  const searchClear = document.getElementById("gallery-search-clear");
  const resultsLabel = document.getElementById("gallery-results");
  const loadMoreButton = document.getElementById("gallery-more");
  const dialog = document.getElementById("image-dialog");
  const dialogImage = document.getElementById("dialog-image");
  const dialogTitle = document.getElementById("dialog-title");

  const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp)$/i;
  const API_URL = "https://api.github.com/repos/tiago-ps/marcadores/contents/imagens?ref=main";
  let loadedCount = 0;
  let collectionMarkers = [];
  let filteredMarkers = [];
  const PAGE_SIZE = 12;
  const selectedMarkers = new Set();

  const printPreview = document.getElementById("print-preview");
  const printSheets = document.getElementById("print-sheets");
  const printSelectionCount = document.getElementById("print-selection-count");
  const printCapacity = document.getElementById("print-capacity");

  const TITLE_REPLACEMENTS = {
    "agua": "água",
    "coracao": "coração",
    "coracoes": "corações",
    "criancas": "crianças",
    "degrade": "degradê",
    "eletronica": "eletrônica",
    "matematica": "matemática",
    "nao": "não",
    "voce": "você",
    "triangulos": "triângulos",
    "ce": "cê",
    "ta": "tá",
    "fimdaescala": "fim da escala"
  };

  const LOWERCASE_WORDS = new Set([
    "a", "as", "ao", "aos", "à", "às", "de", "do", "dos", "da", "das",
    "e", "em", "no", "nos", "na", "nas", "o", "os", "para", "por", "que",
    "um", "uma", "uns", "umas"
  ]);

  function humanizeTitle(value) {
    let title = String(value || "")
      .replace(/\.[^.]+$/, "")
      .replace(/-verso$/i, "")
      .replace(/-frente$/i, "")
      .replace(/([a-záàâãéêíóôõúç])([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ])/g, "$1 $2")
      .replace(/([A-Za-zÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç])(\d)/g, "$1 $2")
      .replace(/(\d)([A-Za-zÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const compact = title.toLowerCase().replace(/\s+/g, "");
    if (TITLE_REPLACEMENTS[compact]) title = TITLE_REPLACEMENTS[compact];

    title = title.toLowerCase().split(" ").map((word, index) => {
      const replacement = TITLE_REPLACEMENTS[word] || word;
      if (index > 0 && LOWERCASE_WORDS.has(replacement)) return replacement;
      return replacement.charAt(0).toUpperCase() + replacement.slice(1);
    }).join(" ");

    return title;
  }

  function formatTitle(filename) {
    return humanizeTitle(filename);
  }

  function updateState() {
    emptyState.hidden = loadedCount > 0;
    const total = collectionMarkers.length;
    itemCount.textContent = total === 1
      ? "1 MARCADOR NA COLEÇÃO"
      : total + " MARCADORES NA COLEÇÃO";
  }

  function openImage(src, title, side) {
    dialogImage.src = src;
    dialogImage.alt = title + (side ? " — " + side : "");
    dialogTitle.textContent = title + (side ? " · " + side : "");
    if (typeof dialog.showModal === "function") dialog.showModal();
  }

  function addImage(parent, src, title, side) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "product-side";
    button.setAttribute("aria-label", "Ampliar " + title + (side ? " — " + side : ""));

    const img = document.createElement("img");
    img.src = src;
    img.alt = title + (side ? " — " + side : "");
    img.loading = "lazy";

    button.appendChild(img);

    const label = document.createElement("span");
    label.textContent = side || "frente";
    button.appendChild(label);

    button.addEventListener("click", () => openImage(src, title, side));
    parent.appendChild(button);
    return button;
  }

  function setupMobileFlip(wrapper, frontButton, backButton) {
    frontButton.classList.add("is-active");
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "mobile-flip-toggle";
    toggle.textContent = "↔";
    toggle.setAttribute("aria-label", "Ver verso do marcador");
    let showingBack = false;
    function showSide(back) {
      showingBack = back;
      frontButton.classList.toggle("is-active", !back);
      backButton.classList.toggle("is-active", back);
      toggle.setAttribute("aria-label", back ? "Ver frente do marcador" : "Ver verso do marcador");
    }
    toggle.addEventListener("click", () => showSide(!showingBack));
    wrapper.appendChild(toggle);
    let startX = 0, startY = 0;
    wrapper.addEventListener("touchstart", event => {
      if (!event.touches || event.touches.length !== 1) return;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
    }, { passive:true });
    wrapper.addEventListener("touchend", event => {
      if (!event.changedTouches || !event.changedTouches.length) return;
      const deltaX = event.changedTouches[0].clientX - startX;
      const deltaY = event.changedTouches[0].clientY - startY;
      if (Math.abs(deltaX) > 38 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25) showSide(deltaX < 0);
    }, { passive:true });
  }

  function markerKey(marker) {
    return marker.imagem || marker.titulo;
  }

  function updatePrintSelectionUI() {
    const count = selectedMarkers.size;
    printSelectionCount.textContent = count === 0
      ? "Nenhum marcador selecionado"
      : count === 1 ? "1 marcador selecionado" : count + " marcadores selecionados";
    printCapacity.textContent = count === 0
      ? "Selecione os marcadores na coleção."
      : "A folha será organizada automaticamente conforme as medidas escolhidas.";
    document.getElementById("print-button").disabled = count === 0;
    document.querySelectorAll(".select-marker").forEach(button => {
      const selected = selectedMarkers.has(button.dataset.markerKey);
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
      button.textContent = selected ? "✓" : "+";
      button.setAttribute("aria-label", selected ? "Remover da impressão" : "Selecionar para impressão");
    });
  }

  function addSelectionControl(wrapper, marker) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "select-marker";
    button.dataset.markerKey = markerKey(marker);
    button.textContent = selectedMarkers.has(markerKey(marker)) ? "✓" : "+";
    button.setAttribute("aria-pressed", String(selectedMarkers.has(markerKey(marker))));
    button.setAttribute("aria-label", selectedMarkers.has(markerKey(marker)) ? "Remover da impressão" : "Selecionar para impressão");
    button.addEventListener("click", event => {
      event.stopPropagation();
      const key = markerKey(marker);
      if (selectedMarkers.has(key)) selectedMarkers.delete(key);
      else selectedMarkers.add(key);
      updatePrintSelectionUI();
      renderPrintPlanner();
    });
    wrapper.appendChild(button);
  }

  function normalizeSearch(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
  }

  function createMarkerCard(marker, index) {
    const card = document.createElement("article");
    card.className = "product-card";
    const imageWrap = document.createElement("div");
    imageWrap.className = marker.verso ? "product-image-wrap has-verso" : "product-image-wrap";
    addSelectionControl(imageWrap, marker);
    const frontButton = addImage(imageWrap, marker.imagem, marker.titulo, "frente");
    if (marker.verso) {
      const backButton = addImage(imageWrap, marker.verso, marker.titulo, "verso");
      setupMobileFlip(imageWrap, frontButton, backButton);
    }

    const meta = document.createElement("div");
    meta.className = "product-meta";
    const titleLine = document.createElement("div");
    titleLine.className = "product-title-line";
    const name = document.createElement("span");
    name.className = "product-name";
    name.textContent = marker.titulo;
    const number = document.createElement("span");
    number.className = "product-number";
    number.textContent = "Nº " + String(index + 1).padStart(2, "0");
    titleLine.append(name, number);
    meta.appendChild(titleLine);

    if (marker.autoria) {
      const author = marker.autorUrl ? document.createElement("a") : document.createElement("span");
      author.className = "product-author";
      author.textContent = "Por " + marker.autoria;
      if (marker.autorUrl) {
        author.href = marker.autorUrl;
        author.target = "_blank";
        author.rel = "noopener noreferrer";
        author.setAttribute("aria-label", "Ver perfil de " + marker.autoria + " no Instagram");
      }
      meta.appendChild(author);
    }
    card.append(imageWrap, meta);
    return card;
  }

  function renderGalleryPage(reset) {
    if (reset) {
      gallery.innerHTML = "";
      loadedCount = 0;
    }
    const next = filteredMarkers.slice(loadedCount, loadedCount + PAGE_SIZE);
    next.forEach(marker => gallery.appendChild(createMarkerCard(marker, collectionMarkers.indexOf(marker))));
    loadedCount += next.length;
    loadMoreButton.hidden = loadedCount >= filteredMarkers.length;
    resultsLabel.textContent = filteredMarkers.length === collectionMarkers.length
      ? filteredMarkers.length + " marcadores"
      : filteredMarkers.length + " de " + collectionMarkers.length + " marcadores";
    if (filteredMarkers.length === 0) {
      gallery.innerHTML = "";
      emptyState.hidden = false;
      emptyState.querySelector(".empty-label").textContent = "NENHUM MARCADOR ENCONTRADO";
      emptyState.querySelector("h3").innerHTML = "Não encontramos<br><em>esse marcador.</em>";
      emptyState.querySelector("p").textContent = "Tente outro título ou nome de autor.";
    } else {
      emptyState.hidden = true;
    }
    updateState();
  }

  function applyGallerySearch() {
    const query = normalizeSearch(searchInput ? searchInput.value : "");
    filteredMarkers = collectionMarkers.filter(marker =>
      !query || normalizeSearch(marker.titulo + " " + (marker.autoria || "")).includes(query)
    );
    if (searchClear) searchClear.hidden = !query;
    renderGalleryPage(true);
  }

  function renderMarkers(files) {
    const images = files
      .filter(file => file.type === "file" && IMAGE_EXTENSIONS.test(file.name))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { numeric: true, sensitivity: "base" }));
    const byName = new Map(images.map(file => [file.name.toLowerCase(), file]));
    const catalogByImage = new Map((Array.isArray(window.MARCADORES) ? window.MARCADORES : [])
      .map(marker => [String(marker.imagem || "").split("/").pop().toLowerCase(), marker]));
    const markers = [];
    const used = new Set();

    images.forEach(file => {
      if (used.has(file.name) || /-verso\.(jpe?g|png|webp)$/i.test(file.name)) return;
      let front = file;
      let baseName = file.name.replace(/\.(jpe?g|png|webp)$/i, "");
      if (/-frente$/i.test(baseName)) {
        const cleanBase = baseName.replace(/-frente$/i, "");
        const plain = [".jpg", ".jpeg", ".png", ".webp"].map(ext => byName.get((cleanBase + ext).toLowerCase())).find(Boolean);
        if (plain) { front = plain; baseName = cleanBase; used.add(file.name); }
      }
      const verso = [".jpg", ".jpeg", ".png", ".webp"]
        .map(ext => byName.get((baseName + "-verso" + ext).toLowerCase())).find(Boolean);
      const catalogEntry = catalogByImage.get(front.name.toLowerCase()) || {};
      markers.push({
        titulo: catalogEntry.titulo || formatTitle(front.name),
        imagem: front.download_url,
        verso: verso ? verso.download_url : null,
        autoria: catalogEntry.autoria || "",
        autorUrl: catalogEntry.autorUrl || ""
      });
      used.add(front.name);
      if (verso) used.add(verso.name);
    });
    images.forEach(file => {
      if (used.has(file.name)) return;
      const catalogEntry = catalogByImage.get(file.name.toLowerCase()) || {};
      markers.push({ titulo: catalogEntry.titulo || formatTitle(file.name), imagem: file.download_url, verso: null, autoria: catalogEntry.autoria || "", autorUrl: catalogEntry.autorUrl || "" });
    });
    collectionMarkers = markers;
    applyGallerySearch();
  }

  async function loadCollection() {
    try {
      const response = await fetch(API_URL, {
        headers: { Accept: "application/vnd.github+json" },
        cache: "no-store"
      });

      if (!response.ok) throw new Error("GitHub respondeu " + response.status);

      const files = await response.json();
      renderMarkers(files);
    } catch (error) {
      // Mantém o catálogo antigo como reserva caso a API esteja indisponível.
      const fallback = Array.isArray(window.MARCADORES) ? window.MARCADORES : [];

      if (fallback.length) {
        collectionMarkers = fallback.map(marker => ({ ...marker }));
        applyGallerySearch();
      } else {
        emptyState.hidden = false;
        itemCount.textContent = "NÃO FOI POSSÍVEL CARREGAR A COLEÇÃO";
      }
    }
  }


  function getPrintConfig() {
    const orientationChoice = document.getElementById("print-orientation").value;
    const width = Math.max(20, Number(document.getElementById("print-width").value) || 50);
    const height = Math.max(60, Number(document.getElementById("print-height").value) || 150);
    const gap = Math.max(0, Number(document.getElementById("print-gap").value) || 0);
    const margin = Math.max(5, Number(document.getElementById("print-margin").value) || 10);
    const duplex = document.getElementById("print-duplex").value;
    const candidates = orientationChoice === "portrait" ? ["portrait"] : orientationChoice === "landscape" ? ["landscape"] : ["portrait", "landscape"];
    const layouts = candidates.map(orientation => {
      const pageW = orientation === "portrait" ? 210 : 297;
      const pageH = orientation === "portrait" ? 297 : 210;
      const cols = Math.max(0, Math.floor((pageW - margin * 2 + gap) / (width + gap)));
      const rows = Math.max(0, Math.floor((pageH - margin * 2 + gap) / (height + gap)));
      return { orientation, pageW, pageH, cols, rows, capacity: cols * rows };
    });
    const layout = layouts.sort((a, b) => b.capacity - a.capacity)[0];
    return { ...layout, width, height, gap, margin, duplex };
  }

  function createPrintPage(markers, config, side) {
    const page = document.createElement("div");
    page.className = "print-sheet " + side;
    page.dataset.pageWidth = String(config.pageW);
    page.style.page = "print-" + config.orientation;
    page.style.setProperty("--sheet-width", config.pageW + "mm");
    page.style.setProperty("--sheet-height", config.pageH + "mm");
    page.style.setProperty("--marker-width", config.width + "mm");
    page.style.setProperty("--marker-height", config.height + "mm");
    page.style.setProperty("--marker-gap", config.gap + "mm");
    page.style.setProperty("--sheet-margin", config.margin + "mm");
    page.style.setProperty("--print-cols", config.cols);
    page.style.setProperty("--print-rows", config.rows);

    const grid = document.createElement("div");
    grid.className = "print-grid";

    markers.forEach((marker, index) => {
      const slot = document.createElement("div");
      slot.className = "print-slot";
      const row = Math.floor(index / config.cols);
      const col = index % config.cols;
      const stepX = config.width + config.gap;
      const stepY = config.height + config.gap;
      // O print-grid começa dentro da área de conteúdo da folha,
      // depois do padding (margem). Portanto, as coordenadas são relativas
      // à área útil: não somamos a margem novamente.
      const contentW = config.pageW - 2 * config.margin;
      const contentH = config.pageH - 2 * config.margin;
      let left = col * stepX;
      let top = row * stepY;

      // No verso, espelhamos somente a posição física do slot.
      // A imagem permanece sempre na orientação original, sem rotação
      // ou espelhamento do seu conteúdo.
      if (side === "verso" && config.duplex === "long") {
        // Virada pela margem longa: correspondência da esquerda para a direita.
        left = contentW - config.width - col * stepX;
      } else if (side === "verso" && config.duplex === "short") {
        // Virada pela margem curta: correspondência de cima para baixo.
        top = contentH - config.height - row * stepY;
      }

      slot.style.left = left + "mm";
      slot.style.top = top + "mm";

      const src = side === "verso" ? marker.verso : marker.imagem;
      if (src) {
        const img = document.createElement("img");
        img.src = src;
        img.alt = marker.titulo + " — " + side;
        img.draggable = false;
        // Na virada pela margem curta, a folha fica invertida em relação
        // ao observador; giramos a arte 180° no plano para que ela fique
        // na posição correta após a virada. Nunca espelhamos o texto.
        if (side === "verso" && config.duplex === "short") {
          img.style.transform = "rotate(180deg)";
        }
        slot.appendChild(img);
      }
      const cut = document.createElement("span");
      cut.className = "cut-mark";
      slot.appendChild(cut);
      grid.appendChild(slot);
    });
    page.appendChild(grid);
    return page;
  }

  function fitPrintPreview() {
    if (printPreview.hidden) return;
    const availableWidth = Math.max(0, printPreview.clientWidth - 24);
    printSheets.querySelectorAll(".print-sheet").forEach(sheet => {
      const pageWidth = Number(sheet.dataset.pageWidth) * 96 / 25.4;
      const scale = pageWidth > 0 ? Math.min(1, availableWidth / pageWidth) : 1;
      sheet.style.zoom = String(scale);
    });
  }

  function renderPrintPlanner() {
    const config = getPrintConfig();
    const selected = collectionMarkers.filter(marker => selectedMarkers.has(markerKey(marker)));
    printSheets.innerHTML = "";
    if (!selected.length || !config.capacity) {
      printPreview.hidden = true;
      if (selected.length && !config.capacity) printCapacity.textContent = "As medidas escolhidas não cabem em uma folha A4 com a margem atual.";
      return;
    }

    const hasVerso = selected.some(marker => marker.verso);
    const pageCount = Math.ceil(selected.length / config.capacity);
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      const batch = selected.slice(pageIndex * config.capacity, (pageIndex + 1) * config.capacity);
      printSheets.appendChild(createPrintPage(batch, config, "frente"));
      if (hasVerso) printSheets.appendChild(createPrintPage(batch, config, "verso"));
    }

    printPreview.hidden = false;
    const orientation = config.orientation === "portrait" ? "retrato" : "paisagem";
    const duplexText = hasVerso ? " · frente e verso preparado" : " · somente frente";
    document.getElementById("print-preview-note").textContent =
      config.capacity + " por folha · A4 " + orientation + duplexText;
    printCapacity.textContent = config.capacity + " marcador(es) por folha · " + pageCount + " folha(s) de A4 para " + selected.length + " selecionado(s).";
    requestAnimationFrame(fitPrintPreview);
  }

  function preparePrint() {
    renderPrintPlanner();
    if (!selectedMarkers.size) return;
    const images = Array.from(printSheets.querySelectorAll("img"));
    Promise.all(images.map(img => img.complete ? Promise.resolve() : new Promise(resolve => {
      img.addEventListener("load", resolve, { once: true });
      img.addEventListener("error", resolve, { once: true });
    }))).then(() => window.print());
  }

  window.addEventListener("resize", fitPrintPreview);
  document.getElementById("print-button").addEventListener("click", preparePrint);
  document.getElementById("print-clear").addEventListener("click", () => {
    selectedMarkers.clear();
    updatePrintSelectionUI();
    renderPrintPlanner();
  });
  ["print-orientation", "print-width", "print-height", "print-gap", "print-margin", "print-duplex"].forEach(id => {
    document.getElementById(id).addEventListener("input", renderPrintPlanner);
    document.getElementById(id).addEventListener("change", renderPrintPlanner);
  });

  if (searchInput) searchInput.addEventListener("input", applyGallerySearch);
  if (searchClear) searchClear.addEventListener("click", () => { searchInput.value = ""; applyGallerySearch(); searchInput.focus(); });
  if (loadMoreButton) loadMoreButton.addEventListener("click", () => renderGalleryPage(false));

  loadCollection();
  updatePrintSelectionUI();

  const choiceInputs = document.querySelectorAll('input[name="caminho"]');
  const guidance = document.getElementById("contact-guidance");
  const guidanceTitle = document.getElementById("contact-guidance-title");
  const guidanceText = document.getElementById("contact-guidance-text");
  const emailLink = document.getElementById("email-contact-link");
  const libraryEmail = "biblioteca.sabara@ifmg.edu.br";

  const emailTemplates = {
    "marcador-no-site": {
      title: "Solicitar uma alteração na coleção",
      text: "Informe seu nome e como podemos localizar o marcador. Você pode solicitar correção de autoria, alteração de autorização ou retirada da imagem, da identificação ou do original em exposição.",
      subject: "Entrelinhas — solicitação sobre marcador já publicado",
      body: "Olá, Biblioteca!\n\nGostaria de solicitar uma alteração sobre um marcador que já está na coleção do Entrelinhas.\n\nMeu nome: \nComo localizar o marcador na coleção: \nSolicitação (correção de autoria, alteração de autorização ou retirada): \n\nObrigado(a)!"
    },
    "novo-marcador": {
      title: "Apresentar um novo marcador",
      text: "Anexe uma fotografia do marcador à mensagem. Informe seu nome para contato e indique se deseja que a imagem seja publicada sem identificação ou com o crédito de autoria. A publicação depende de autorização.",
      subject: "Entrelinhas — novo marcador para a coleção",
      body: "Olá, Biblioteca!\n\nGostaria de apresentar um marcador para possível inclusão na coleção do Entrelinhas. Vou anexar a fotografia a esta mensagem.\n\nMeu nome para contato: \nNome de autoria, caso queira crédito público (opcional): \nAutorização para publicação da imagem: ( ) Sim, sem identificação   ( ) Sim, com identificação de autoria   ( ) Não autorizo a publicação\n\nObrigado(a)!"
    },
    "expor-biblioteca": {
      title: "Conversar sobre a exposição do original",
      text: "O marcador original precisa ser entregue pessoalmente na Biblioteca do IFMG Campus Sabará. Use o e-mail para avisar a equipe e combinar a entrega.",
      subject: "Entrelinhas — entrega de marcador original",
      body: "Olá, Biblioteca!\n\nGostaria de conversar sobre a possibilidade de deixar meu marcador original exposto na biblioteca. Sei que a entrega do original precisa ser feita pessoalmente.\n\nMeu nome: \nMelhor forma de combinar a entrega: \n\nObrigado(a)!"
    }
  };

  choiceInputs.forEach(input => {
    input.addEventListener("change", () => {
      const template = emailTemplates[input.value];
      if (!template) return;
      guidanceTitle.textContent = template.title;
      guidanceText.textContent = template.text;
      const subject = encodeURIComponent(template.subject);
      const body = encodeURIComponent(template.body);
      emailLink.href = "mailto:" + libraryEmail + "?subject=" + subject + "&body=" + body;
      guidance.hidden = false;
    });
  });

  const menuToggle = document.getElementById("menu-toggle");
  const nav = document.getElementById("main-nav");

  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Abrir menu" : "Fechar menu");
    nav.classList.toggle("is-open", !isOpen);
  });

  nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
    nav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Abrir menu");
  }));

  document.getElementById("dialog-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });

  document.getElementById("current-year").textContent = new Date().getFullYear();

  const revealTargets = document.querySelectorAll(
    ".intro, .collection-heading, .gallery-empty, .closing"
  );

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }), { threshold: 0.12 });

    revealTargets.forEach(target => target.classList.add("reveal"));
    revealTargets.forEach(target => observer.observe(target));
  } else {
    revealTargets.forEach(target => target.classList.add("is-visible"));
  }
})();