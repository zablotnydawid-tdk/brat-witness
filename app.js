const STORAGE_KEY = "brat-witness-phone-v01";

const layers = [
  ["UX", "Rozmowa, głos, feed dnia i szybkie akcje."],
  ["Voice/Input", "Miejsce pod Whisper local i tekst z klawiatury."],
  ["Intent Engine", "Tłumaczy naturalne zdania na akcje."],
  ["Context Collector", "Zbiera dzień, sprawy, przypomnienia i konflikty."],
  ["Relational Memory", "Pamięta projekty, osoby, tematy i styl."],
  ["Privacy", "Domyślnie lokalnie, minimalizacja danych."],
  ["Router", "Decyduje: telefon, większy model, czy chmura."],
  ["Local AI", "Lekki model pod Samsung A17 i proste decyzje."],
  ["Cloud AI", "Tylko trudniejsze sprawy i większy kontekst."],
  ["Action Layer", "Przypomnienia, notatki, organizacja."],
  ["Learning Layer", "Uczy się rytmu użytkownika bez korpo energii."],
];

const starterMessages = [
  {
    role: "ai",
    text: "Jestem. Powiedz mi: co dziś, zapamiętaj coś, albo daj sprawę do przypomnienia.",
  },
];

const state = loadState();

const els = {
  phone: document.querySelector(".phone"),
  todayDate: document.querySelector("#todayDate"),
  dailyLine: document.querySelector("#dailyLine"),
  dailySummary: document.querySelector("#dailySummary"),
  intentReadout: document.querySelector("#intentReadout"),
  routerReadout: document.querySelector("#routerReadout"),
  privacyReadout: document.querySelector("#privacyReadout"),
  messages: document.querySelector("#messages"),
  input: document.querySelector("#messageInput"),
  composer: document.querySelector("#composer"),
  memoryList: document.querySelector("#memoryList"),
  layerGrid: document.querySelector("#layerGrid"),
  privacyToggle: document.querySelector("#privacyToggle"),
  clearMemory: document.querySelector("#clearMemory"),
};

init();

function init() {
  els.todayDate.textContent = new Intl.DateTimeFormat("pl-PL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date());

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => setView(tab.dataset.view));
  });

  document.querySelectorAll("[data-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      setView("chat");
      handleUserMessage(button.dataset.prompt);
    });
  });

  els.composer.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = els.input.value.trim();
    if (!text) return;
    els.input.value = "";
    handleUserMessage(text);
  });

  els.privacyToggle.addEventListener("click", () => {
    state.privacyMode = !state.privacyMode;
    saveState();
    render();
  });

  els.clearMemory.addEventListener("click", () => {
    state.memories = [];
    state.reminders = [];
    state.messages.push({
      role: "ai",
      text: "Wyczyszczone. Zaczynamy od lekkiej głowy.",
    });
    saveState();
    render();
  });

  renderLayers();
  render();
}

function setView(viewName) {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === viewName);
  });
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === viewName);
  });
}

function handleUserMessage(text) {
  state.messages.push({ role: "user", text });
  const result = runIntentEngine(text);
  state.lastIntent = result.intent;
  state.lastRoute = result.route;
  state.messages.push({ role: "ai", text: result.reply });
  saveState();
  render();
}

function runIntentEngine(rawText) {
  const text = rawText.toLowerCase();
  const complexity = rawText.length + state.memories.length * 12;
  const route = complexity > 240 ? "cloud-ready" : "local";

  if (text.includes("zapamiętaj") || text.includes("pamietaj")) {
    const memory = cleanPayload(rawText, ["zapamiętaj:", "zapamietaj:", "zapamiętaj", "zapamietaj"]);
    addMemory("temat", memory || rawText);
    return {
      intent: "memory.write",
      route,
      reply: "Dobra, zapamiętałem. To już siedzi w pamięci Brata.",
    };
  }

  if (text.includes("przypomnij")) {
    const reminder = cleanPayload(rawText, ["przypomnij mi", "przypomnij"]);
    state.reminders.unshift({
      text: reminder || rawText,
      createdAt: new Date().toISOString(),
    });
    return {
      intent: "action.reminder.create",
      route,
      reply: "Dobra, wpisuję to jako przypomnienie. W pełnej wersji pójdzie do systemowego kalendarza.",
    };
  }

  if (text.includes("co dziś") || text.includes("co dzis") || text.includes("ogarnąć") || text.includes("ogarnac")) {
    return {
      intent: "context.daily.plan",
      route,
      reply: buildDailyReply(),
    };
  }

  if (text.includes("znajdź") || text.includes("znajdz") || text.includes("szukaj")) {
    const query = cleanPayload(rawText, ["znajdź", "znajdz", "szukaj"]).toLowerCase();
    const hit = state.memories.find((item) => item.text.toLowerCase().includes(query));
    return {
      intent: "memory.search",
      route,
      reply: hit ? `Mam to: ${hit.text}` : "Nie widzę tego jeszcze w pamięci. Jak chcesz, powiedz: zapamiętaj...",
    };
  }

  if (text.includes("samsung") || text.includes("a17") || text.includes("sm-a176b")) {
    addMemory("telefon", "Samsung Galaxy A17 SM-A176B/DS jako pierwsza warstwa companion AI.");
    return {
      intent: "device.profile",
      route: "local",
      reply: "Ten Samsung nada się na pierwszą warstwę: rozmowa, pamięć, intencje i lekkie lokalne AI. Cięższe modele damy przez router.",
    };
  }

  return {
    intent: "chat.reflect",
    route,
    reply: "Słyszę. Na MVP potraktuję to jako kontekst rozmowy i zapamiętam, jeśli powiesz mi wprost: zapamiętaj.",
  };
}

function buildDailyReply() {
  const reminders = state.reminders.slice(0, 3).map((item) => item.text);
  if (!reminders.length && !state.memories.length) {
    return "Na teraz masz czysty start. Najpierw wrzuć jedną ważną rzecz, potem ułożymy dzień.";
  }

  const parts = [];
  if (reminders.length) parts.push(`Do ogarnięcia: ${reminders.join("; ")}.`);
  if (state.memories.length) parts.push(`W tle pamiętam: ${state.memories[0].text}`);
  return `${parts.join(" ")} Proponuję jedną rzecz naraz.`;
}

function addMemory(type, text) {
  if (!text.trim()) return;
  const exists = state.memories.some((item) => item.text.toLowerCase() === text.toLowerCase());
  if (exists) return;
  state.memories.unshift({
    type,
    text,
    createdAt: new Date().toISOString(),
  });
}

function cleanPayload(text, prefixes) {
  let output = text.trim();
  prefixes.forEach((prefix) => {
    const expression = new RegExp(`^${escapeRegExp(prefix)}\\s*`, "i");
    output = output.replace(expression, "");
  });
  return output.trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function render() {
  els.phone.classList.toggle("privacy-on", state.privacyMode);
  els.intentReadout.textContent = intentLabel(state.lastIntent);
  els.routerReadout.textContent =
    state.lastRoute === "cloud-ready"
      ? "Router oznaczył sprawę jako kandydat do większego modelu."
      : "Router trzyma sprawę lokalnie.";
  els.privacyReadout.textContent = state.privacyMode
    ? "Tryb prywatny aktywny. Zero wysyłki w prototypie."
    : "Dane zostają lokalnie w tej przeglądarce.";

  const count = state.memories.length + state.reminders.length;
  els.dailyLine.textContent =
    count > 3 ? "Ej, masz dziś trochę rzeczy. Ułóżmy to po kolei." : "Dobra, ogarnijmy dzień spokojnie.";
  els.dailySummary.textContent =
    count === 0
      ? "Dodaj pierwszą rzecz przez rozmowę albo szybkie akcje."
      : `Pamięć: ${state.memories.length}. Przypomnienia: ${state.reminders.length}.`;

  renderMessages();
  renderMemory();
}

function renderMessages() {
  els.messages.innerHTML = "";
  state.messages.forEach((message) => {
    const bubble = document.createElement("div");
    bubble.className = `bubble ${message.role}`;
    bubble.textContent = message.text;
    els.messages.appendChild(bubble);
  });
  els.messages.scrollTop = els.messages.scrollHeight;
}

function renderMemory() {
  const items = [
    ...state.reminders.map((item) => ({ ...item, type: "przypomnienie" })),
    ...state.memories,
  ];

  if (!items.length) {
    els.memoryList.innerHTML = '<div class="empty">Pamięć jest pusta. Powiedz: zapamiętaj...</div>';
    return;
  }

  els.memoryList.innerHTML = "";
  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "memory-card";
    card.innerHTML = `<span>${item.type}</span><p></p>`;
    card.querySelector("p").textContent = item.text;
    els.memoryList.appendChild(card);
  });
}

function renderLayers() {
  layers.forEach(([name, description], index) => {
    const card = document.createElement("article");
    card.className = "layer-card";
    card.innerHTML = `<span>${String(index + 1).padStart(2, "0")} - ${name}</span><p>${description}</p>`;
    els.layerGrid.appendChild(card);
  });
}

function intentLabel(intent) {
  const labels = {
    "idle": "Czeka na sygnał.",
    "memory.write": "Zapis do pamięci relacyjnej.",
    "action.reminder.create": "Akcja: przypomnienie.",
    "context.daily.plan": "Analiza dziennego kontekstu.",
    "memory.search": "Wyszukiwanie w pamięci.",
    "device.profile": "Profil urządzenia i local AI.",
    "chat.reflect": "Rozmowa kontekstowa.",
  };
  return labels[intent] || intent;
}

function loadState() {
  const fallback = {
    messages: starterMessages,
    memories: [],
    reminders: [],
    privacyMode: true,
    lastIntent: "idle",
    lastRoute: "local",
  };

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? { ...fallback, ...saved } : fallback;
  } catch {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
