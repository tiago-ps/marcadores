(() => {
  "use strict";\n\n  // Forminit SDK: endpoint público para formulários do GitHub Pages.

  const gallery = document.getElementById("gallery-grid");
  const emptyState = document.getElementById("gallery-empty");
  const itemCount = document.getElementById("item-count");
  const dialog = document.getElementById("image-dialog");
  const dialogImage = document.getElementById("dialog-image");
  const dialogTitle = document.getElementById("dialog-title");

  const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp)$/i;
  const API_URL = "https://api.github.com/repos/tiago-ps/marcadores/contents/imagens?ref=main";
  let loadedCount = 0;

  function formatTitle(filename) {
    return filename
      .replace(/\.[^.]+$/, "")
      .replace(/-verso$/i, "")
      .replace(/-frente$/i, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  function updateState() {
    emptyState.hidden = loadedCount > 0;
    itemCount.textContent = loadedCount === 1
      ? "1 MARCADOR NA COLEÇÃO"
      : loadedCount + " MARCADORES NA COLEÇÃO";
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
  }

  function renderMarkers(files) {
    const images = files
      .filter(file => file.type === "file" && IMAGE_EXTENSIONS.test(file.name))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", {
        numeric: true,
        sensitivity: "base"
      }));

    const byName = new Map(images.map(file => [file.name.toLowerCase(), file]));
    const markers = [];
    const used = new Set();

    images.forEach(file => {
      if (used.has(file.name)) return;

      // Arquivos com "-verso" pertencem à imagem correspondente.
      if (/-verso\.(jpe?g|png|webp)$/i.test(file.name)) return;

      let front = file;
      let baseName = file.name.replace(/\.(jpe?g|png|webp)$/i, "");

      // Aceita tanto "nome.jpg" quanto "nome-frente.jpg".
      if (/-frente$/i.test(baseName)) {
        const cleanBase = baseName.replace(/-frente$/i, "");
        const plainCandidates = [
          cleanBase + ".jpg",
          cleanBase + ".jpeg",
          cleanBase + ".png",
          cleanBase + ".webp"
        ];
        const plain = plainCandidates
          .map(name => byName.get(name.toLowerCase()))
          .find(Boolean);

        if (plain) {
          front = plain;
          baseName = cleanBase;
          used.add(file.name);
        }
      }

      const versoCandidates = [
        baseName + "-verso.jpg",
        baseName + "-verso.jpeg",
        baseName + "-verso.png",
        baseName + "-verso.webp"
      ];

      const verso = versoCandidates
        .map(name => byName.get(name.toLowerCase()))
        .find(Boolean);

      markers.push({
        titulo: formatTitle(front.name),
        imagem: front.download_url,
        verso: verso ? verso.download_url : null
      });

      used.add(front.name);
      if (verso) used.add(verso.name);
    });

    // Um arquivo "-verso" sem frente continua visível, para nenhum trabalho desaparecer.
    images.forEach(file => {
      if (used.has(file.name)) return;

      markers.push({
        titulo: formatTitle(file.name),
        imagem: file.download_url,
        verso: null
      });
    });

    gallery.innerHTML = "";
    loadedCount = 0;

    markers.forEach((marker, index) => {
      const card = document.createElement("article");
      card.className = "product-card";

      const imageWrap = document.createElement("div");
      imageWrap.className = marker.verso
        ? "product-image-wrap has-verso"
        : "product-image-wrap";

      addImage(imageWrap, marker.imagem, marker.titulo, "frente");
      if (marker.verso) addImage(imageWrap, marker.verso, marker.titulo, "verso");

      const meta = document.createElement("div");
      meta.className = "product-meta";

      const name = document.createElement("span");
      name.className = "product-name";
      name.textContent = marker.titulo;

      const number = document.createElement("span");
      number.className = "product-number";
      number.textContent = "Nº " + String(index + 1).padStart(2, "0");

      meta.append(name, number);
      card.append(imageWrap, meta);
      gallery.appendChild(card);
      loadedCount += 1;
    });

    updateState();
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
        gallery.innerHTML = "";
        loadedCount = 0;

        fallback.forEach((marker, index) => {
          const card = document.createElement("article");
          card.className = "product-card";

          const imageWrap = document.createElement("div");
          imageWrap.className = marker.verso
            ? "product-image-wrap has-verso"
            : "product-image-wrap";

          addImage(imageWrap, marker.imagem, marker.titulo, "frente");
          if (marker.verso) addImage(imageWrap, marker.verso, marker.titulo, "verso");

          const meta = document.createElement("div");
          meta.className = "product-meta";

          const name = document.createElement("span");
          name.className = "product-name";
          name.textContent = marker.titulo;

          const number = document.createElement("span");
          number.className = "product-number";
          number.textContent = "Nº " + String(index + 1).padStart(2, "0");

          meta.append(name, number);
          card.append(imageWrap, meta);
          gallery.appendChild(card);
          loadedCount += 1;
        });

        updateState();
      } else {
        emptyState.hidden = false;
        itemCount.textContent = "NÃO FOI POSSÍVEL CARREGAR A COLEÇÃO";
      }
    }
  }

  loadCollection();

  const interactionForm = document.getElementById("interaction-form");
  const formFeedback = document.getElementById("form-feedback");
  const submitButton = document.getElementById("form-submit");
  const forminit = new Forminit();
  const FORMINIT_FORM_ID = "COLE_AQUI_O_ID_DO_FORMINIT";

  const choicePanels = {
    "marcador-no-site": document.getElementById("existing-panel"),
    "novo-marcador": document.getElementById("new-panel"),
    "expor-biblioteca": document.getElementById("exhibit-panel")
  };

  function updateParticipationChoice() {
    const selected = interactionForm.querySelector('input[name="caminho"]:checked');
    const value = selected ? selected.value : "";
    Object.entries(choicePanels).forEach(([key, panel]) => {
      panel.hidden = key !== value;
    });
    const photoInput = document.getElementById("marker-photos");
    if (photoInput) photoInput.required = value === "novo-marcador";
  }

  interactionForm.querySelectorAll('input[name="caminho"]').forEach(input => {
    input.addEventListener("change", updateParticipationChoice);
  });

  interactionForm.addEventListener("submit", async event => {
    event.preventDefault();
    formFeedback.textContent = "";

    if (FORMINIT_FORM_ID === "COLE_AQUI_O_ID_DO_FORMINIT") {
      formFeedback.textContent = "O formulário está preparado, mas falta conectar o ID do Forminit. A biblioteca precisa concluir essa configuração antes de receber envios.";
      return;
    }

    const selected = interactionForm.querySelector('input[name="caminho"]:checked');
    if (!selected) {
      formFeedback.textContent = "Escolha uma das três opções para continuar.";
      return;
    }

    const photoInput = document.getElementById("marker-photos");
    if (selected.value === "novo-marcador" && (!photoInput.files || photoInput.files.length === 0)) {
      formFeedback.textContent = "Selecione pelo menos uma foto do marcador.";
      photoInput.focus();
      return;
    }

    const files = photoInput ? Array.from(photoInput.files) : [];
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > 25 * 1024 * 1024) {
      formFeedback.textContent = "As fotos ultrapassam o limite total de 25 MB. Reduza o tamanho ou envie menos imagens.";
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Enviando…";
    formFeedback.textContent = "Estamos enviando sua mensagem. Aguarde um instante.";

    try {
      const formData = new FormData(interactionForm);
      formData.append("fi-text-tipo_participacao", selected.value);
      const { data, error } = await forminit.submit(FORMINIT_FORM_ID, formData);
      if (error) throw new Error(error.message || "Não foi possível enviar o formulário.");

      interactionForm.reset();
      updateParticipationChoice();
      formFeedback.textContent = "Mensagem enviada! Obrigado por participar do Entrelinhas. A biblioteca recebeu seu envio.";
    } catch (error) {
      formFeedback.textContent = "Não foi possível enviar agora. Verifique sua conexão e tente novamente. " + error.message;
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = 'Enviar para a biblioteca <span aria-hidden="true">↗</span>';
    }
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
    ".intro, .collection-heading, .gallery-empty, .manifesto, .closing"
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