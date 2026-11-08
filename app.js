(() => {
  "use strict";

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

  function renderMarkers(files) {
    const images = files
      .filter(file => file.type === "file" && IMAGE_EXTENSIONS.test(file.name))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", {
        numeric: true,
        sensitivity: "base"
      }));

    const byName = new Map(images.map(file => [file.name.toLowerCase(), file]));
    const catalogByImage = new Map((Array.isArray(window.MARCADORES) ? window.MARCADORES : []).map(marker => [String(marker.imagem || "").split("/").pop().toLowerCase(), marker]));
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
        titulo: (catalogByImage.get(front.name.toLowerCase()) || {}).titulo || formatTitle(front.name),
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

      const frontButton = addImage(imageWrap, marker.imagem, marker.titulo, "frente");
      if (marker.verso) {
        const backButton = addImage(imageWrap, marker.verso, marker.titulo, "verso");
        setupMobileFlip(imageWrap, frontButton, backButton);
      }

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

          const frontButton = addImage(imageWrap, marker.imagem, marker.titulo, "frente");
          if (marker.verso) {
            const backButton = addImage(imageWrap, marker.verso, marker.titulo, "verso");
            setupMobileFlip(imageWrap, frontButton, backButton);
          }

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
      const params = new URLSearchParams({ subject: template.subject, body: template.body });
      emailLink.href = "mailto:" + libraryEmail + "?" + params.toString();
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