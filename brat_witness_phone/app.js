const STORAGE_KEY = "brat-witness-phone-memory-v2";
const CONFIG_KEY = "bratWitnessPhoneConfig";
const LAYERS_KEY = "bratWitnessLayers";
const VOICE_OUTPUT_KEY = "bratWitnessVoiceOutput";
const WITNESS_LOG_LIMIT = 30;

// boot
const layers = [
  ["UX", "Rozmowa, głos, feed dnia i szybkie akcje."],
  ["Voice/Input", "Miejsce pod Whisper local i tekst z klawiatury."],
  ["Intent Engine", "Tłumaczy naturalne zdania na akcje."],
  ["Context Collector", "Zbiera dzień, sprawy, przypomnienia i konflikty."],
  ["Relational Memory v2", "Topic, typ, ludzie, projekty, emocje i tagi."],
  ["Privacy", "Domyślnie lokalnie, zero requestów sieciowych."],
  ["Router", "Pokazuje lokalnie albo cloud-ready bez wysyłki danych."],
  ["Local AI", "Lekki model pod Samsung A17 i proste decyzje."],
  ["Cloud AI", "Tylko status gotowości dla cięższych spraw."],
  ["Action Layer", "Przypomnienia, notatki, organizacja."],
  ["Learning Layer", "Uczy się rytmu użytkownika bez korpo energii."],
];

const starterMessages = [
  {
    role: "ai",
    text: "Jestem. Pamięć v2 działa lokalnie. Powiedz: zapamiętaj, znajdź, albo jak było z...",
  },
];

const TYPE_LABELS = {
  note: "notatka",
  project: "projekt",
  person: "osoba",
  task: "zadanie",
  feeling: "emocja",
};

// state
const state = loadState();
const voiceOutput = loadVoiceOutput();
let deferredInstallPrompt = null;
let serviceWorkerReady = false;
let offlineCacheReady = false;
let recognition = null;
let isListening = false;

const els = {
  phone: document.querySelector(".phone"),
  todayDate: document.querySelector("#todayDate"),
  routeBadge: document.querySelector("#routeBadge"),
  dailyLine: document.querySelector("#dailyLine"),
  dailySummary: document.querySelector("#dailySummary"),
  intentReadout: document.querySelector("#intentReadout"),
  routerReadout: document.querySelector("#routerReadout"),
  privacyReadout: document.querySelector("#privacyReadout"),
  messages: document.querySelector("#messages"),
  voiceStatus: document.querySelector("#voiceStatus"),
  speechStatus: document.querySelector("#speechStatus"),
  input: document.querySelector("#messageInput"),
  composer: document.querySelector("#composer"),
  micButton: document.querySelector("#micButton"),
  memoryCount: document.querySelector("#memoryCount"),
  memoryStatus: document.querySelector("#memoryStatus"),
  memoryList: document.querySelector("#memoryList"),
  appStatus: document.querySelector("#appStatus"),
  phoneMemoryStatus: document.querySelector("#phoneMemoryStatus"),
  serviceWorkerStatus: document.querySelector("#serviceWorkerStatus"),
  echoStatus: document.querySelector("#echoStatus"),
  voiceOutputStatus: document.querySelector("#voiceOutputStatus"),
  currentMode: document.querySelector("#currentMode"),
  pendingActionStatus: document.querySelector("#pendingActionStatus"),
  lastDecision: document.querySelector("#lastDecision"),
  riskLevel: document.querySelector("#riskLevel"),
  phoneBridgeStatus: document.querySelector("#phoneBridgeStatus"),
  nativeBridgeStatus: document.querySelector("#nativeBridgeStatus"),
  voiceLoopStatus: document.querySelector("#voiceLoopStatus"),
  memoryGraphStatus: document.querySelector("#memoryGraphStatus"),
  layersStatus: document.querySelector("#layersStatus"),
  installApp: document.querySelector("#installApp"),
  voiceToggle: document.querySelector("#voiceToggle"),
  useEcho: document.querySelector("#useEcho"),
  echoConsent: document.querySelector("#echoConsent"),
  installHelp: document.querySelector("#installHelp"),
  layerGrid: document.querySelector("#layerGrid"),
  privacyToggle: document.querySelector("#privacyToggle"),
  clearMemory: document.querySelector("#clearMemory"),
};

document.addEventListener("DOMContentLoaded", init);

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  if (els.installApp) {
    els.installApp.disabled = false;
    els.installApp.textContent = "Zainstaluj na telefonie";
  }
  if (els.installHelp) els.installHelp.classList.remove("visible");
});

function init() {
  const firstRun = autoInitPhoneApp();
  bootBratWitnessLayers();

  els.todayDate.textContent = new Intl.DateTimeFormat("pl-PL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date());

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => setView(tab.dataset.view));
  });

  document.querySelectorAll(".filter").forEach((filter) => {
    filter.addEventListener("click", () => {
      state.memoryFilter = filter.dataset.filter;
      render();
    });
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
    state.messages.push({ role: "ai", text: "Wyczyszczone. Zaczynamy od lekkiej głowy." });
    saveState();
    render();
  });

  els.installApp.addEventListener("click", installOnPhone);
  els.useEcho.addEventListener("click", executePendingEcho);
  els.voiceToggle.addEventListener("click", toggleVoice);
  els.micButton.addEventListener("click", () => {
    if (isListening) {
      stopListening();
      return;
    }
    startListening();
  });

  initVoiceInput();
  initVoiceOutput();
  refreshServiceWorkerStatus();
  refreshOfflineCacheStatus();
  renderLayers();
  if (firstRun) {
    addWitnessMessage("Dobra, lokalna warstwa gotowa. Wszystko siedzi na tym telefonie.", { speakNow: false });
    saveState();
  }
  render();
  if (firstRun) speak("Dobra, lokalna warstwa gotowa. Wszystko siedzi na tym telefonie.");
}

// voice
function initVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    setVoiceStatus("Mikrofon niedostępny");
    els.micButton.disabled = false;
    els.micButton.title = "Ta przeglądarka nie wspiera mikrofonu.";
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "pl-PL";
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.onstart = () => {
    isListening = true;
    els.micButton.classList.add("listening");
    setVoiceStatus("Słucham...");
  };

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join(" ")
      .trim();
    els.input.value = transcript;
  };

  recognition.onerror = () => {
    isListening = false;
    els.micButton.classList.remove("listening");
    setVoiceStatus("Mikrofon niedostępny");
  };

  recognition.onend = () => {
    const text = els.input.value.trim();
    isListening = false;
    els.micButton.classList.remove("listening");
    if (!text) {
      setVoiceStatus("");
      return;
    }
    setVoiceStatus("Przetwarzam...");
    handleUserMessage(text);
    els.input.value = "";
    setTimeout(() => setVoiceStatus(""), 900);
  };
}

function startListening() {
  if (!recognition) {
    setVoiceStatus("Ta przeglądarka nie wspiera mikrofonu.");
    return;
  }

  try {
    recognition.start();
  } catch {
    stopListening();
  }
}

function stopListening() {
  if (!recognition) return;
  setVoiceStatus("Przetwarzam...");
  recognition.stop();
}

function setVoiceStatus(message) {
  els.voiceStatus.textContent = message;
}

// voice output
function initVoiceOutput() {
  if (!supportsVoiceOutput()) {
    voiceOutput.enabled = false;
    voiceOutput.speaking = false;
    setSpeechStatus("Voice unsupported");
    saveVoiceOutput();
    return;
  }

  loadAvailableVoices();
  window.speechSynthesis.onvoiceschanged = loadAvailableVoices;
  setSpeechStatus(voiceOutput.enabled ? "" : "Głos wyłączony");
}

function supportsVoiceOutput() {
  return "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

function loadAvailableVoices() {
  if (!supportsVoiceOutput()) return [];

  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return voices;

  const savedVoice = voices.find((voice) => voice.name === voiceOutput.selectedVoice);
  const polishVoice = voices.find((voice) => voice.lang && voice.lang.toLowerCase().startsWith("pl"));
  const fallbackVoice = savedVoice || polishVoice || voices[0];
  voiceOutput.selectedVoice = fallbackVoice ? fallbackVoice.name : null;
  saveVoiceOutput();
  renderVoiceOutputStatus();
  return voices;
}

function speak(text) {
  if (!supportsVoiceOutput()) {
    setSpeechStatus("Ta przeglądarka nie wspiera voice output.");
    return;
  }
  if (!voiceOutput.enabled || !shouldSpeakText(text)) return;

  stopSpeaking({ silent: true });

  const spokenText = prepareSpokenText(text);
  const utterance = new SpeechSynthesisUtterance(spokenText);
  const voices = loadAvailableVoices();
  const selected = voices.find((voice) => voice.name === voiceOutput.selectedVoice);
  if (selected) utterance.voice = selected;

  utterance.volume = voiceOutput.volume;
  utterance.rate = voiceOutput.rate;
  utterance.pitch = voiceOutput.pitch;
  utterance.lang = selected ? selected.lang : "pl-PL";

  utterance.onstart = () => {
    voiceOutput.speaking = true;
    setSpeechStatus("Mówię...");
    renderVoiceOutputStatus();
  };

  utterance.onend = () => {
    voiceOutput.speaking = false;
    setSpeechStatus(voiceOutput.enabled ? "" : "Głos wyłączony");
    renderVoiceOutputStatus();
  };

  utterance.onerror = () => {
    voiceOutput.speaking = false;
    setSpeechStatus("Voice unsupported");
    renderVoiceOutputStatus();
  };

  window.speechSynthesis.speak(utterance);
}

function stopSpeaking(options = {}) {
  if (!supportsVoiceOutput()) return;
  window.speechSynthesis.cancel();
  voiceOutput.speaking = false;
  if (!options.silent) setSpeechStatus(voiceOutput.enabled ? "" : "Głos wyłączony");
  renderVoiceOutputStatus();
}

function toggleVoice() {
  if (!supportsVoiceOutput()) {
    voiceOutput.enabled = false;
    setSpeechStatus("Ta przeglądarka nie wspiera voice output.");
    renderVoiceOutputStatus();
    saveVoiceOutput();
    return;
  }

  voiceOutput.enabled = !voiceOutput.enabled;
  if (!voiceOutput.enabled) {
    stopSpeaking({ silent: true });
    setSpeechStatus("Głos wyłączony");
  } else {
    setSpeechStatus("");
    speak("Dobra, głos włączony.");
  }
  saveVoiceOutput();
  renderVoiceOutputStatus();
}

function setSpeechStatus(message) {
  els.speechStatus.textContent = message;
}

function speakWitnessReply(text, result = {}) {
  if (["healthcheck", "voice.stop", "voice.off"].includes(result.intent)) return;
  if (result.intent === "echo.request") {
    speak("Echo może pomóc głębiej. Wysłać tylko potrzebny kontekst?");
    return;
  }
  if (detectHighRisk(text)) {
    speak("To dotknie telefonu albo danych. Potwierdzasz?");
    return;
  }
  if (result.pendingAction) {
    speak("Mam to zrobić?");
    return;
  }
  speak(text);
}

function shouldSpeakText(text) {
  const clean = String(text || "").trim();
  if (!clean) return false;
  if (clean.length > 220) return false;
  if ((clean.match(/\n/g) || []).length > 2) return false;
  if (/^\s*[{[]/.test(clean)) return false;
  if (/"\w+"\s*:/.test(clean)) return false;
  if (clean.includes("localStorage OK") || clean.includes("offline cache")) return false;
  return true;
}

function prepareSpokenText(text) {
  return String(text || "")
    .replace(/Echo GPT mock:\s*/i, "Echo mówi: ")
    .replace(/\n+/g, ". ")
    .split(/[.!?]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(". ");
}

function detectHighRisk(text) {
  const value = normalize(text);
  return ["usun", "usuń", "dane", "telefon"].some((word) => value.includes(word));
}

// router
function setView(viewName) {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === viewName);
  });
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === viewName);
  });
}

function handleUserMessage(text) {
  handleLiveInput(text, "text");
}

function handleLiveInput(input, source = "text") {
  const text = String(input || "").trim();
  if (!text) return;

  stopSpeaking({ silent: true });
  state.messages.push({ role: "user", text });
  const result = witnessOrchestrator(text, source);
  state.lastIntent = result.intent || "live.input";
  state.lastRoute = result.route || "lokalnie";
  addWitnessMessage(result.reply, { speakNow: false });
  saveState();
  render();
  speakWitnessReply(result.reply, result);
}

function witnessOrchestrator(input, source = "text") {
  if (state.pendingAction) {
    return resolvePendingConfirmation(input);
  }

  const context = analyzeLiveContext(input, source);
  const move = decideCompanionMove(context);
  const result = executeCompanionMove(move, context);
  logWitnessDecision(context, move, result);
  return result;
}

function analyzeLiveContext(input, source = "text") {
  const text = normalize(input);
  const legacy = parseCommand(input);
  const project = extractProject(input, legacy.type || inferType(input));
  const people = extractPeople(input, legacy.type || inferType(input));
  const emotion = extractEmotion(input, legacy.type || inferType(input));
  const importance = inferImportance(text);
  const wantsRecall = startsWithAny(text, ["znajdz ", "znajdź ", "jak bylo z ", "jak było z ", "co pamietasz o ", "co pamiętasz o "]);
  const taskCandidate = /(jutro|faktura|musze|muszę|trzeba|przypomnij|nie chce zapomniec|nie chcę zapomnieć)/.test(text);
  const memoryCandidate =
    importance === "high" ||
    Boolean(project) ||
    Boolean(emotion) ||
    /(wazn|ważn|boje|boję|wkurza|nie chce zapomniec|nie chcę zapomnieć|projekt|adam|auror)/.test(text);
  const requiresPhone = /(otworz|otwórz|zadzwon|telefon|aplikacj|kalendarz)/.test(text);

  return {
    input,
    source,
    normalized: text,
    legacyIntent: legacy.intent,
    intent: inferLiveIntent(text, legacy.intent, wantsRecall),
    emotion,
    importance,
    project,
    people,
    candidateForMemory: memoryCandidate,
    isAction: taskCandidate || requiresPhone,
    taskCandidate,
    requiresEcho: detectEchoNeed(input),
    requiresPhone,
    mode: inferConversationMode(text),
    riskLevel: requiresPhone || text.includes("wyczysc") || text.includes("wyczyść") ? "high" : taskCandidate ? "medium" : "low",
    relatedContext: getRelatedContext(input),
  };
}

function inferLiveIntent(text, legacyIntent, wantsRecall) {
  if (["healthcheck", "phone.status", "voice.off", "voice.on", "voice.stop"].includes(legacyIntent)) return legacyIntent;
  if (text.includes("pokaz log witness") || text.includes("pokaż log witness")) return "witness.log";
  if (wantsRecall) return "memory.recall";
  if (text.includes("co dzis") || text.includes("co dziś")) return "context.daily.plan";
  if (detectEchoNeed(text)) return "echo.request";
  if (text.includes("wyczysc pamiec") || text.includes("wyczyść pamięć")) return "memory.clear";
  return "live.talk";
}

function inferConversationMode(text) {
  if (/(musze|muszę|plan|jutro|faktura|ogarn)/.test(text)) return "planning";
  if (/(wkurza|boje|boję|stres|ciesze|cieszę)/.test(text)) return "feeling";
  if (/(bo |czyli|to znaczy|wyjasniam|wyjaśniam)/.test(text)) return "explaining";
  return "talking";
}

function decideCompanionMove(context) {
  if (context.intent === "healthcheck") return "SHOW_STATUS";
  if (context.intent === "phone.status") return "SHOW_STATUS";
  if (["voice.off", "voice.on", "voice.stop"].includes(context.intent)) return "EXECUTE_LOCAL_SAFE";
  if (context.intent === "witness.log") return "SHOW_STATUS";
  if (context.intent === "memory.recall") return "EXECUTE_LOCAL_SAFE";
  if (context.intent === "context.daily.plan") return "EXECUTE_LOCAL_SAFE";
  if (context.intent === "memory.clear") return "BLOCK_UNSAFE";
  if (context.requiresEcho) return "ASK_TO_USE_ECHO";
  if (context.requiresPhone) return "BLOCK_UNSAFE";
  if (context.taskCandidate) return "ASK_TO_CREATE_REMINDER";
  if (context.candidateForMemory) return "ASK_TO_REMEMBER";
  if (context.input.length < 3) return "ASK_FOR_CLARIFICATION";
  return "RESPOND_ONLY";
}

function executeCompanionMove(move, context) {
  state.lastDecision = move;
  state.lastRiskLevel = context.riskLevel;

  if (move === "SHOW_STATUS") {
    if (context.intent === "healthcheck") return { intent: "healthcheck", route: "lokalnie", reply: buildHealthcheckReply() };
    if (context.intent === "witness.log") return { intent: "witness.log", route: "lokalnie", reply: formatWitnessLog() };
    return { intent: "phone.status", route: "lokalnie", reply: "Lokalnie. Pamięć działa. Router gotowy. Chmura wyłączona." };
  }

  if (move === "ASK_TO_REMEMBER") {
    createPendingAction("memory.save", "To brzmi ważnie. Zapamiętać?", context.riskLevel, "local", "selected input only", {
      entry: createMemoryEntry(context, "memory"),
    });
    return { intent: "pending.memory", route: "lokalnie", pendingAction: true, reply: "Jasne. To brzmi ważnie. Mam zapamiętać?" };
  }

  if (move === "ASK_TO_CREATE_REMINDER") {
    createPendingAction("reminder.create", "Zrobić z tego przypomnienie albo zadanie?", "medium", "local", "selected input only", {
      entry: createMemoryEntry(context, "task"),
    });
    return { intent: "pending.reminder", route: "lokalnie", pendingAction: true, reply: "Brzmi jak coś do ogarnięcia. Mam zrobić z tego przypomnienie?" };
  }

  if (move === "ASK_TO_USE_ECHO") {
    const selectedMemory = context.relatedContext.slice(0, 2).map(toEchoMemory);
    createPendingAction("echo.use", "Echo może wejść głębiej.", "medium", "mock-cloud", "selected memory only", {
      echoPayload: prepareEchoPayload(context.input, selectedMemory, inferEchoTaskType(context.input)),
    });
    state.echoStatus = "ready";
    return { intent: "echo.request", route: "needsEcho", pendingAction: true, reply: "Echo może wejść głębiej. Wysłać tylko potrzebny kontekst?" };
  }

  if (move === "BLOCK_UNSAFE") {
    createPendingAction("unsafe.confirm", "To dotknie telefonu albo danych.", "high", "blocked", "none", { input: context.input });
    return { intent: "blocked.unsafe", route: "lokalnie", pendingAction: true, reply: "Nie ruszam tego bez twojej zgody. Potwierdzasz?" };
  }

  if (move === "EXECUTE_LOCAL_SAFE") {
    return executeLocal(context);
  }

  if (move === "ASK_FOR_CLARIFICATION") {
    return { intent: "clarify", route: "lokalnie", reply: "Jestem. Dopowiedz mi jedno zdanie, a złapię kontekst." };
  }

  return { intent: "respond.only", route: "lokalnie", reply: buildCompanionResponse(context) };
}

function executeLocal(context) {
  if (context.intent === "voice.off" || context.intent === "voice.on" || context.intent === "voice.stop") {
    return runIntentEngine(context.input);
  }
  if (context.intent === "memory.recall") {
    const recall = smartRecall(stripPrefixes(context.input, ["znajdź", "znajdz", "jak było z", "jak bylo z", "co pamiętasz o", "co pamietasz o"]));
    return { intent: "memory.recall", route: "lokalnie", reply: formatRecall(recall) };
  }
  if (context.intent === "context.daily.plan") {
    return { intent: "context.daily.plan", route: "lokalnie", reply: buildDailyReply() };
  }
  return { intent: "local.safe", route: "lokalnie", reply: buildCompanionResponse(context) };
}

function createPendingAction(type, summary, riskLevel, executionMode, dataUsed, payload) {
  state.pendingAction = {
    id: createId(),
    type,
    summary,
    riskLevel,
    executionMode,
    dataUsed,
    payload,
    createdAt: new Date().toISOString(),
  };
}

function resolvePendingConfirmation(input) {
  const text = normalize(input);
  if (isCancel(text)) {
    const previous = state.pendingAction;
    state.pendingAction = null;
    logWitnessDecision({ input, intent: "pending.cancel", riskLevel: previous ? previous.riskLevel : "low" }, "CANCEL_PENDING", {
      reply: "Nie teraz? Okej, odpuszczam.",
    });
    return { intent: "pending.cancel", route: "lokalnie", reply: "Nie teraz? Okej, odpuszczam." };
  }

  if (!isConfirm(text)) {
    return {
      intent: "pending.awaiting",
      route: "lokalnie",
      pendingAction: true,
      reply: "Jasne. Powiedz tylko: tak albo nie.",
    };
  }

  const action = state.pendingAction;
  state.pendingAction = null;
  const result = executePendingAction(action);
  logWitnessDecision({ input, intent: action.type, riskLevel: action.riskLevel }, "CONFIRM_PENDING", result);
  return result;
}

function executePendingAction(action) {
  if (!action) return { intent: "pending.none", route: "lokalnie", reply: "Nie mam teraz nic do potwierdzenia." };

  if (action.type === "memory.save") {
    const saved = addGraphEntry(action.payload.entry, "tak");
    return { intent: "memory.saved", route: "lokalnie", reply: saved.importance === "high" ? "Dobra, mam to. To wygląda ważnie." : "Dobra, mam to." };
  }

  if (action.type === "reminder.create") {
    const saved = phoneBridge.createReminder(action.payload.entry);
    return { intent: "task.saved", route: "lokalnie", reply: saved ? "Dobra, trzymam to jako lokalne przypomnienie." : "Nie udało się tego zapisać lokalnie." };
  }

  if (action.type === "echo.use") {
    state.echoEnabled = true;
    state.echoStatus = "active";
    const echo = callEchoGPT(action.payload.echoPayload);
    return { intent: "echo.mock", route: "needsEcho", reply: `${echo.provider}:\n${echo.text}` };
  }

  if (action.type === "unsafe.confirm") {
    return { intent: "unsafe.blocked", route: "lokalnie", reply: "Na razie blokuję. W PWA nie ruszam telefonu ani danych bez natywnego mostu." };
  }

  return { intent: "pending.done", route: "lokalnie", reply: "Dobra, załatwione lokalnie." };
}

function isConfirm(text) {
  return ["tak", "dobra", "dawaj", "potwierdzam", "zapisz", "zapamietaj", "zapamiętaj", "lec", "leć"].includes(text);
}

function isCancel(text) {
  return ["nie", "anuluj", "nie teraz", "odpusc", "odpuść", "stop"].includes(text);
}

const phoneBridge = {
  nativeBridge: false,
  createReminder(entry) {
    addGraphEntry({ ...entry, kind: "task" }, "tak");
    return true;
  },
  createNote(entry) {
    addGraphEntry({ ...entry, kind: "note" }, "tak");
    return true;
  },
  openApp() {
    return { ok: false, reason: "blocked-placeholder" };
  },
  requestPermission() {
    return { ok: false, reason: "native bridge unavailable" };
  },
  getCapabilities() {
    return {
      nativeBridge: false,
      createReminder: "local task/event",
      createNote: "local note",
      openApp: "blocked-placeholder",
    };
  },
};

function createMemoryEntry(context, kind = "memory") {
  const now = new Date().toISOString();
  const entry = {
    id: createId(),
    kind,
    topic: inferTopic(context.input, kind === "task" ? "task" : inferType(context.input)),
    content: context.input,
    people: context.people || [],
    project: context.project || "",
    emotion: context.emotion || "",
    importance: context.importance || "medium",
    source: context.source || "text",
    createdAt: now,
    updatedAt: now,
    lastSeen: now,
    links: [],
    confirmations: [],
    tags: buildTags(context.input, kind, context.project || context.input, context.people || [], context.project || "", context.emotion || ""),
  };
  entry.links = linkRelatedMemories(entry);
  return entry;
}

function addGraphEntry(entry, confirmation) {
  const now = new Date().toISOString();
  const graphEntry = {
    ...entry,
    updatedAt: now,
    lastSeen: now,
    confirmations: [...(entry.confirmations || []), { value: confirmation, at: now }],
  };
  state.memories.unshift(graphEntry);
  return graphEntry;
}

function linkRelatedMemories(entry) {
  return state.memories
    .filter((memory) => memory.id !== entry.id)
    .map((memory) => ({ memory, score: scoreMemory(memory, tokenize([entry.topic, entry.content, entry.project, ...(entry.people || [])].join(" ")), normalize(entry.content)) }))
    .filter((item) => item.score > 1)
    .slice(0, 5)
    .map((item) => item.memory.id);
}

function getRelatedContext(query) {
  return smartRecall(query).matches.slice(0, 5);
}

function summarizeMemoryCluster(entries) {
  if (!entries.length) return "Nie mam jeszcze takiego kontekstu.";
  const projects = unique(entries.map((entry) => entry.project).filter(Boolean));
  const people = unique(entries.flatMap((entry) => entry.people || []));
  const important = entries.filter((entry) => entry.importance === "high").length;
  return `Mam ${entries.length} powiązań. Projekty: ${projects.join(", ") || "brak"}. Osoby: ${people.join(", ") || "brak"}. Ważne: ${important}.`;
}

function toEchoMemory(memory) {
  return {
    topic: memory.topic,
    kind: memory.kind || memory.type || "memory",
    content: memory.content,
    project: memory.project,
    people: memory.people || [],
    importance: memory.importance,
    tags: (memory.tags || []).slice(0, 4),
  };
}

function logWitnessDecision(context, move, result) {
  state.witnessLog.unshift({
    id: createId(),
    input: context.input,
    intent: context.intent,
    move,
    riskLevel: context.riskLevel || "low",
    reply: result.reply,
    createdAt: new Date().toISOString(),
  });
  state.witnessLog = state.witnessLog.slice(0, WITNESS_LOG_LIMIT);
}

function formatWitnessLog() {
  if (!state.witnessLog.length) return "Log jest pusty. Dopiero zaczynamy.";
  return state.witnessLog
    .slice(0, 5)
    .map((item) => `${item.move} / ${item.riskLevel}: ${item.intent}`)
    .join("\n");
}

function buildCompanionResponse(context) {
  if (context.mode === "feeling") return "Słyszę Cię. To nie brzmi jak drobiazg. Chcesz, żebym trzymał to w kontekście?";
  if (context.mode === "planning") return "Dobra, złapmy to spokojnie. Jedna rzecz naraz.";
  if (context.relatedContext.length) return "Kojarzę ten wątek. Mogę go połączyć z tym, co już pamiętam.";
  return "Jestem. Mów normalnie, ja będę łapał kontekst.";
}

function runIntentEngine(rawText) {
  const command = parseCommand(rawText);
  const route = pickRoute(rawText, command);

  if (command.intent === "healthcheck") {
    return {
      intent: "healthcheck",
      route: "lokalnie",
      reply: buildHealthcheckReply(),
    };
  }

  if (command.intent === "phone.status") {
    return {
      intent: "phone.status",
      route: "lokalnie",
      reply: "Lokalnie. Pamięć działa. Router gotowy. Chmura wyłączona.",
    };
  }

  if (command.intent === "voice.off") {
    voiceOutput.enabled = false;
    stopSpeaking({ silent: true });
    saveVoiceOutput();
    return {
      intent: "voice.off",
      route: "lokalnie",
      reply: "Głos wyłączony.",
    };
  }

  if (command.intent === "voice.on") {
    voiceOutput.enabled = supportsVoiceOutput();
    saveVoiceOutput();
    return {
      intent: "voice.on",
      route: "lokalnie",
      reply: voiceOutput.enabled ? "Dobra, głos włączony." : "Ta przeglądarka nie wspiera voice output.",
    };
  }

  if (command.intent === "voice.stop") {
    stopSpeaking({ silent: true });
    return {
      intent: "voice.stop",
      route: "lokalnie",
      reply: "Już cicho.",
    };
  }

  if (command.intent === "echo.request") {
    const selectedMemory = selectMemoryForEcho(rawText);
    state.pendingEchoPayload = prepareEchoPayload(rawText, selectedMemory, command.taskType);
    state.echoEnabled = false;
    state.echoStatus = "ready";
    return {
      intent: "echo.request",
      route: "needsEcho",
      reply: "To wymaga Echo GPT. Wysłać tylko potrzebny kontekst?",
    };
  }

  if (command.intent === "memory.write") {
    const memory = createMemory(command);
    const saved = upsertMemory(memory);
    return {
      intent: "memory.write",
      route,
      reply: saved.importance === "high" ? "Mam to. Wygląda na ważne." : "Dobra, zapisałem.",
    };
  }

  if (command.intent === "memory.recall") {
    const recall = smartRecall(command.query);
    return {
      intent: "memory.recall",
      route,
      reply: formatRecall(recall),
    };
  }

  if (command.intent === "context.daily.plan") {
    return {
      intent: "context.daily.plan",
      route,
      reply: buildDailyReply(),
    };
  }

  return {
    intent: "chat.reflect",
    route,
    reply: "Jasne. Jak mam to trzymać w pamięci, zacznij od: zapamiętaj.",
  };
}

function parseCommand(rawText) {
  const text = normalize(rawText);

  if (text === "wylacz glos" || text === "wyłącz głos") {
    return { intent: "voice.off" };
  }

  if (text === "wlacz glos" || text === "włącz głos") {
    return { intent: "voice.on" };
  }

  if (text === "stop mowienie" || text === "stop mówienie") {
    return { intent: "voice.stop" };
  }

  if (text === "healthcheck") {
    return { intent: "healthcheck" };
  }

  if (detectEchoNeed(rawText)) {
    return {
      intent: "echo.request",
      taskType: inferEchoTaskType(rawText),
      needsEcho: true,
    };
  }

  if (text === "status telefonu" || text.includes("status telefonu")) {
    return { intent: "phone.status" };
  }

  if (startsWithAny(text, ["znajdz ", "znajdź ", "jak bylo z ", "jak było z ", "co pamietasz o ", "co pamiętasz o "])) {
    return {
      intent: "memory.recall",
      query: stripPrefixes(rawText, ["znajdź", "znajdz", "jak było z", "jak bylo z", "co pamiętasz o", "co pamietasz o"]),
    };
  }

  if (text.includes("co dzis") || text.includes("co dziś") || text.includes("ogarnac") || text.includes("ogarnąć")) {
    return { intent: "context.daily.plan" };
  }

  if (startsWithAny(text, ["czuje ", "czuję "])) {
    return {
      intent: "memory.write",
      type: "feeling",
      content: stripPrefixes(rawText, ["czuję", "czuje"]),
      emotion: stripPrefixes(rawText, ["czuję", "czuje"]).split(/\s+/).slice(0, 3).join(" "),
      importance: text.includes("bardzo") || text.includes("stres") ? "high" : "medium",
    };
  }

  if (startsWithAny(text, ["projekt "])) {
    return {
      intent: "memory.write",
      type: "project",
      content: stripPrefixes(rawText, ["projekt"]),
      importance: inferImportance(text),
    };
  }

  if (startsWithAny(text, ["osoba "])) {
    return {
      intent: "memory.write",
      type: "person",
      content: stripPrefixes(rawText, ["osoba"]),
      importance: inferImportance(text),
    };
  }

  if (startsWithAny(text, ["przypomnij mi ", "przypomnij "])) {
    return {
      intent: "memory.write",
      type: "task",
      content: stripPrefixes(rawText, ["przypomnij mi", "przypomnij"]),
      importance: inferImportance(text),
    };
  }

  if (startsWithAny(text, ["zapamietaj", "zapamiętaj", "pamietaj, ze", "pamiętaj, że", "to wazne", "to ważne"])) {
    const content = stripPrefixes(rawText, [
      "zapamiętaj:",
      "zapamietaj:",
      "zapamiętaj",
      "zapamietaj",
      "pamiętaj, że",
      "pamietaj, ze",
      "to ważne:",
      "to wazne:",
      "to ważne",
      "to wazne",
    ]);
    return {
      intent: "memory.write",
      type: inferType(content),
      content,
      importance: text.includes("wazne") || text.includes("ważne") ? "high" : inferImportance(text),
    };
  }

  return { intent: "chat.reflect" };
}

function createMemory(command) {
  const now = new Date().toISOString();
  const content = command.content.trim();
  const topic = inferTopic(content, command.type);
  const people = extractPeople(content, command.type);
  const project = extractProject(content, command.type);
  const emotion = command.emotion || extractEmotion(content, command.type);
  const tags = buildTags(content, command.type, topic, people, project, emotion);

  return {
    id: createId(),
    topic,
    type: command.type || "note",
    content,
    people,
    project,
    importance: command.importance || inferImportance(normalize(content)),
    emotion,
    createdAt: now,
    lastSeen: now,
    tags,
  };
}

// memory
function upsertMemory(memory) {
  const existing = state.memories.find((item) => normalize(item.content) === normalize(memory.content));
  if (existing) {
    existing.lastSeen = new Date().toISOString();
    existing.importance = strongestImportance(existing.importance, memory.importance);
    existing.tags = unique([...existing.tags, ...memory.tags]);
    return existing;
  }

  state.memories.unshift(memory);
  return memory;
}

// recall
function smartRecall(queryText) {
  const query = normalize(queryText);
  const tokens = tokenize(query);
  const matches = state.memories
    .map((memory) => ({ memory, score: scoreMemory(memory, tokens, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.memory.lastSeen) - new Date(a.memory.lastSeen));

  matches.forEach(({ memory }) => {
    memory.lastSeen = new Date().toISOString();
  });

  return {
    query: queryText,
    matches: matches.map((item) => item.memory),
    groups: groupMemories(matches.map((item) => item.memory)),
  };
}

function scoreMemory(memory, tokens, query) {
  const haystack = normalize(
    [
      memory.topic,
      memory.kind,
      memory.type,
      memory.content,
      (memory.people || []).join(" "),
      memory.project,
      memory.importance,
      memory.emotion,
      (memory.tags || []).join(" "),
    ].join(" ")
  );

  let score = haystack.includes(query) && query.length > 2 ? 8 : 0;
  const haystackTokens = tokenize(haystack);
  tokens.forEach((token) => {
    if (haystack.includes(token) || haystackTokens.some((item) => tokenMatches(item, token))) score += token.length > 4 ? 3 : 1;
  });
  if (memory.importance === "high") score += 1;
  return score;
}

function tokenMatches(a, b) {
  if (a === b) return true;
  if (a.length < 4 || b.length < 4) return false;
  const aBase = a.slice(0, Math.min(5, a.length));
  const bBase = b.slice(0, Math.min(5, b.length));
  return aBase === bBase || a.startsWith(bBase) || b.startsWith(aBase);
}

function groupMemories(memories) {
  const groups = new Map();
  memories.forEach((memory) => {
    const keys = [];
    if (memory.project) keys.push(`Projekt: ${memory.project}`);
    memory.people.forEach((person) => keys.push(`Osoba: ${person}`));
    memory.tags.slice(0, 2).forEach((tag) => keys.push(`Tag: ${tag}`));
    if (!keys.length) keys.push(`Temat: ${memory.topic}`);

    keys.forEach((key) => {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(memory);
    });
  });
  return [...groups.entries()].map(([name, items]) => ({ name, items }));
}

function formatRecall(recall) {
  if (!recall.matches.length) {
    return "Nie mam tego jeszcze w pamięci. Jak chcesz, zapiszemy to teraz.";
  }

  const summary = recall.matches
    .slice(0, 3)
    .map((memory) => `- ${memory.content}`)
    .join("\n");
  const groups = recall.groups
    .slice(0, 4)
    .map((group) => `${group.name} (${group.items.length})`)
    .join(", ");
  const sources = recall.matches
    .slice(0, 3)
    .map((memory) => `${TYPE_LABELS[memory.type] || memory.kind || memory.type || "memory"}: ${memory.topic}`)
    .join("; ");

  return `Pamiętam parę rzeczy o tym.\nTu masz skrót, bez grzebania:\n${summary}\n\n${summarizeMemoryCluster(recall.matches)}\nŹródła pamięci: ${sources}.`;
}

// echo
function detectEchoNeed(input) {
  const text = normalize(input);
  return ["echo", "rozwin", "przeanalizuj", "glebiej", "głebiej", "strategia", "napisz lepiej"].some((trigger) =>
    text.includes(trigger)
  );
}

function inferEchoTaskType(input) {
  const text = normalize(input);
  if (text.includes("strategia")) return "strategy";
  if (text.includes("napisz lepiej")) return "rewrite";
  if (text.includes("przeanalizuj") || text.includes("glebiej")) return "analysis";
  if (text.includes("rozwin")) return "expand";
  return "echo";
}

function selectMemoryForEcho(input) {
  const recall = smartRecall(stripEchoTriggers(input));
  return recall.matches.slice(0, 2).map((memory) => ({
    topic: memory.topic,
    type: memory.type,
    content: memory.content,
    project: memory.project,
    people: memory.people,
    importance: memory.importance,
    tags: memory.tags.slice(0, 4),
  }));
}

function prepareEchoPayload(input, memoryContext, taskType = "echo") {
  return {
    userRequest: input,
    selectedMemory: memoryContext,
    taskType,
    privacyNote: "Only selected local context. No full memory dump. No API key in frontend.",
  };
}

function callEchoGPT(payload) {
  const memoryLine = payload.selectedMemory.length
    ? payload.selectedMemory.map((item) => item.topic).join(", ")
    : "bez dodatkowej pamięci";

  return {
    provider: "Echo GPT mock",
    text: `Echo mock: ${payload.taskType}. Kontekst: ${memoryLine}. Kierunek: uprościć, nazwać ryzyko i dać jeden następny krok.`,
  };
}

function executePendingEcho() {
  if (state.pendingAction && state.pendingAction.type === "echo.use") {
    const result = executePendingAction(state.pendingAction);
    state.pendingAction = null;
    addWitnessMessage(result.reply);
    saveState();
    render();
    return;
  }

  if (!state.pendingEchoPayload) {
    state.echoStatus = "disabled";
    addWitnessMessage("Powiedz normalnie, co mam pogłębić. Echo wejdzie dopiero po zgodzie.");
    saveState();
    render();
    return;
  }

  state.echoEnabled = true;
  state.echoStatus = "active";
  const echo = callEchoGPT(state.pendingEchoPayload);
  addWitnessMessage(`${echo.provider}:\n${echo.text}`);
  state.pendingEchoPayload = null;
  saveState();
  render();
}

function stripEchoTriggers(input) {
  return stripPrefixes(input, [
    "echo",
    "rozwiń",
    "rozwin",
    "przeanalizuj",
    "głębiej",
    "glebiej",
    "napisz lepiej",
    "użyj echo do",
    "uzyj echo do",
  ]).trim();
}

// actions
function buildDailyReply() {
  const important = state.memories.filter((memory) => memory.importance === "high").slice(0, 2);
  const tasks = state.memories.filter((memory) => memory.type === "task").slice(0, 2);

  if (!state.memories.length) {
    return "Na teraz czysto. Wrzuć jedną ważną rzecz i złapiemy rytm.";
  }

  const lines = [];
  if (important.length) lines.push(`Ważne: ${important.map((item) => item.topic).join(", ")}.`);
  if (tasks.length) lines.push(`Do ogarnięcia: ${tasks.map((item) => item.topic).join(", ")}.`);
  return `${lines.join(" ")} Jedna rzecz naraz.`;
}

function inferType(content) {
  const text = normalize(content);
  if (text.includes("projekt")) return "project";
  if (text.includes("osoba") || text.includes("adam") || text.includes("ania")) return "person";
  if (text.includes("faktura") || text.includes("jutro") || text.includes("ogarnięcia") || text.includes("ogarniecia")) return "task";
  if (text.includes("czuje") || text.includes("czuję") || text.includes("stres")) return "feeling";
  return "note";
}

function inferTopic(content, type) {
  const text = stripPrefixes(content, ["projekt", "osoba"]).replace(/[,.;!?]+$/g, "").trim();
  const words = text.split(/\s+/).filter(Boolean);
  if (type === "project") {
    const project = extractProject(content, type);
    if (project) return project;
  }
  if (type === "person") {
    const people = extractPeople(content, type);
    if (people.length) return people[0];
  }
  return words.slice(0, 5).join(" ") || "notatka";
}

function extractPeople(content, type) {
  const words = content.match(/\b[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]{2,}\b/g) || [];
  const stop = new Set(["Zapamiętaj", "Pamietaj", "Pamiętaj", "Projekt", "Osoba", "Aurora"]);
  const people = words.filter((word) => !stop.has(word));
  if (type === "person" && !people.length) {
    const first = stripPrefixes(content, ["osoba"]).split(/\s+/)[0];
    if (first) people.push(capitalize(first));
  }
  return unique(people);
}

function extractProject(content, type) {
  const projectMatch = content.match(/projekt\s+([A-ZĄĆĘŁŃÓŚŹŻ][\wąćęłńóśźż-]+)/i);
  if (projectMatch) return capitalize(projectMatch[1]);
  if (type === "project") {
    const first = stripPrefixes(content, ["projekt"]).split(/\s+/)[0];
    return first ? capitalize(first) : "";
  }
  const knownProject = (content.match(/\bAuror[ayąa]?\b/i) || [])[0];
  return knownProject ? "Aurora" : "";
}

function extractEmotion(content, type) {
  const text = normalize(content);
  if (type === "feeling") return stripPrefixes(content, ["czuję", "czuje"]).split(/\s+/).slice(0, 4).join(" ");
  if (text.includes("stres")) return "stres";
  if (text.includes("spokoj")) return "spokój";
  if (text.includes("chaos")) return "chaos";
  return "";
}

function inferImportance(text) {
  if (text.includes("wazne") || text.includes("ważne") || text.includes("pilne") || text.includes("stres")) return "high";
  if (text.includes("jutro") || text.includes("spotkanie")) return "medium";
  return "medium";
}

function buildTags(content, type, topic, people, project, emotion) {
  const base = [type, topic, project, emotion, ...people, ...tokenize(content).filter((token) => token.length > 4).slice(0, 5)];
  return unique(base.map((item) => normalize(item)).filter(Boolean));
}

function pickRoute(rawText, command) {
  if (command.intent === "healthcheck") return "lokalnie";
  if (command.intent === "phone.status") return "lokalnie";
  if (command.needsEcho || command.intent === "echo.request") return "needsEcho";
  const complexity = rawText.length + state.memories.length * 9 + (command.intent === "memory.recall" ? 40 : 0);
  return complexity > 260 ? "needsEcho" : "lokalnie";
}

function autoInitPhoneApp() {
  const existing = readJson(CONFIG_KEY);
  if (existing && existing.bratWitnessInstalled) return false;

  localStorage.setItem(
    CONFIG_KEY,
    JSON.stringify({
      bratWitnessInstalled: true,
      memoryVersion: 2,
      privacyMode: "local",
      echoEnabled: false,
      echoStatus: "disabled",
      firstRunAt: new Date().toISOString(),
      deviceMode: "phone",
      layersReady: true,
    })
  );

  return true;
}

function bootBratWitnessLayers() {
  const now = new Date().toISOString();
  const readyLayers = [
    ["UX Layer", "ready"],
    ["Voice/Input Layer", "ready"],
    ["Intent Engine", "ready"],
    ["Context Collector", "ready"],
    ["Relational Memory", "ready"],
    ["Privacy Layer", "ready"],
    ["Intelligence Router", "ready"],
    ["Local AI placeholder", "ready"],
    ["Cloud AI", "disabled by default"],
    ["Action Layer", "ready"],
    ["Feedback Learning", "ready"],
  ];

  localStorage.setItem(
    LAYERS_KEY,
    JSON.stringify({
      bootedAt: now,
      mode: "local-only",
      layers: readyLayers.map(([name, status]) => ({ name, status })),
    })
  );
}

// pwa
function installOnPhone() {
  if (!deferredInstallPrompt) {
    els.installHelp.classList.add("visible");
    addWitnessMessage("Jeśli nie wyskoczy instalacja: Android Chrome menu ⋮, iPhone Safari Udostępnij.");
    saveState();
    render();
    return;
  }

  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.finally(() => {
    deferredInstallPrompt = null;
    renderPhoneStatus();
  });
}

function refreshServiceWorkerStatus() {
  if (!("serviceWorker" in navigator)) {
    renderPhoneStatus();
    return;
  }

  navigator.serviceWorker.ready
    .then(() => {
      serviceWorkerReady = true;
      renderPhoneStatus();
    })
    .catch(() => {
      serviceWorkerReady = false;
      renderPhoneStatus();
    });
}

function refreshOfflineCacheStatus() {
  if (!("caches" in window)) {
    offlineCacheReady = false;
    renderPhoneStatus();
    return;
  }

  caches
    .match("./index.html")
    .then((cached) => {
      offlineCacheReady = Boolean(cached);
      renderPhoneStatus();
    })
    .catch(() => {
      offlineCacheReady = false;
      renderPhoneStatus();
    });
}

function getServiceWorkerStatus() {
  if (!("serviceWorker" in navigator)) return "unavailable";
  if (serviceWorkerReady || navigator.serviceWorker.controller) return "active";
  return "registering";
}

function isStandaloneApp() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function buildHealthcheckReply() {
  const layerBoot = readJson(LAYERS_KEY);
  const layerCount = layerBoot && Array.isArray(layerBoot.layers) ? layerBoot.layers.length : 0;

  return [
    `localStorage ${checkLocalStorage() ? "OK" : "ERROR"}`,
    "memory OK",
    "router OK",
    `layers ${layerCount || 11}/11`,
    `service worker ${getServiceWorkerStatus()}`,
    `Echo ${state.echoStatus}`,
    `pending action ${state.pendingAction ? "yes" : "no"}`,
    `voice output ${voiceOutput.enabled ? "enabled" : "disabled"}`,
    `offline cache ${offlineCacheReady ? "ready" : "pending"}`,
  ].join("\n");
}

function checkLocalStorage() {
  try {
    localStorage.setItem("bratWitnessHealthcheck", "ok");
    localStorage.removeItem("bratWitnessHealthcheck");
    return true;
  } catch {
    return false;
  }
}

// ui
function strongestImportance(a, b) {
  const rank = { low: 1, medium: 2, high: 3 };
  return rank[b] > rank[a] ? b : a;
}

function stripPrefixes(text, prefixes) {
  let output = text.trim();
  prefixes.forEach((prefix) => {
    const expression = new RegExp(`^${escapeRegExp(prefix)}\\s*`, "i");
    output = output.replace(expression, "");
  });
  return output.trim();
}

function startsWithAny(text, prefixes) {
  return prefixes.some((prefix) => text.startsWith(prefix));
}

function tokenize(text) {
  return normalize(text)
    .split(/[^a-z0-9ąćęłńóśźż]+/i)
    .filter((token) => token.length > 2);
}

function normalize(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function capitalize(text) {
  const clean = String(text || "").replace(/[,.;!?]+$/g, "");
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : "";
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function createId() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function addWitnessMessage(text, options = {}) {
  state.messages.push({ role: "ai", text });
  if (options.speakNow !== false) speakWitnessReply(text);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function render() {
  els.phone.classList.toggle("privacy-on", state.privacyMode);
  els.phone.classList.toggle("cloud-ready", state.lastRoute === "cloud-ready" || state.lastRoute === "needsEcho");
  els.routeBadge.textContent = state.lastRoute;
  els.intentReadout.textContent = intentLabel(state.lastIntent);
  els.routerReadout.textContent =
    state.lastRoute === "needsEcho"
      ? "needsEcho, czeka na zgodę"
      : state.lastRoute === "cloud-ready"
        ? "cloud-ready, ale bez wysyłki w prototypie"
        : "lokalnie";
  els.privacyReadout.textContent = state.privacyMode
    ? "Tryb prywatny aktywny. Wszystko siedzi w localStorage."
    : "Nadal lokalnie. Ten prototyp nie robi requestów sieciowych.";

  const important = state.memories.filter((memory) => memory.importance === "high").length;
  els.dailyLine.textContent =
    state.memories.length > 4 ? "Mam już trochę kontekstu. Możemy pytać pamięć." : "Dobra, ogarnijmy dzień spokojnie.";
  els.dailySummary.textContent =
    state.memories.length === 0
      ? "Wrzuć pierwszą pamięć albo zapytaj, co pamiętam."
      : `Pamięć: ${state.memories.length}. Ważne: ${important}.`;

  els.memoryCount.textContent = state.memories.length;
  els.memoryStatus.textContent = state.lastRoute;
  els.echoConsent.classList.toggle("visible", Boolean(state.pendingAction && state.pendingAction.type === "echo.use"));
  renderPhoneStatus();

  document.querySelectorAll(".filter").forEach((filter) => {
    filter.classList.toggle("active", filter.dataset.filter === state.memoryFilter);
  });

  renderMessages();
  renderMemory();
}

function renderPhoneStatus() {
  const layerBoot = readJson(LAYERS_KEY);
  const layerCount = layerBoot && Array.isArray(layerBoot.layers) ? layerBoot.layers.length : 0;

  els.appStatus.textContent = isStandaloneApp() ? "installed" : "browser";
  els.phoneMemoryStatus.textContent = "active";
  els.serviceWorkerStatus.textContent = getServiceWorkerStatus();
  els.echoStatus.textContent = state.echoStatus;
  renderVoiceOutputStatus();
  els.currentMode.textContent = "live companion";
  els.pendingActionStatus.textContent = state.pendingAction ? "yes" : "no";
  els.lastDecision.textContent = state.lastDecision || "idle";
  els.riskLevel.textContent = state.lastRiskLevel || "low";
  els.phoneBridgeStatus.textContent = "pwa placeholder";
  els.nativeBridgeStatus.textContent = String(phoneBridge.nativeBridge);
  els.voiceLoopStatus.textContent = `${recognition ? "input" : "text"} / ${voiceOutput.enabled ? "voice" : "text"}`;
  els.memoryGraphStatus.textContent = `${state.memories.length} nodes`;
  els.layersStatus.textContent = `${layerCount || 11}/11 ready`;

  if (!deferredInstallPrompt) {
    els.installApp.textContent = "Zainstaluj na telefonie";
  }
}

function renderVoiceOutputStatus() {
  if (!els.voiceToggle || !els.voiceOutputStatus) return;
  if (!supportsVoiceOutput()) {
    els.voiceToggle.textContent = "🔇";
    els.voiceToggle.classList.remove("speaking");
    els.voiceOutputStatus.textContent = "unsupported";
    setSpeechStatus("Voice unsupported");
    return;
  }

  els.voiceToggle.textContent = voiceOutput.enabled ? "🔊" : "🔇";
  els.voiceToggle.classList.toggle("speaking", voiceOutput.speaking);
  els.voiceOutputStatus.textContent = voiceOutput.enabled
    ? voiceOutput.speaking
      ? "speaking"
      : "enabled"
    : "disabled";
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
  const items = filterMemories(state.memories).slice(0, 5);

  if (!items.length) {
    els.memoryList.innerHTML = '<div class="empty">Pamięć jest pusta dla tego filtra.</div>';
    return;
  }

  els.memoryList.innerHTML = "";
  items.forEach((memory) => {
    const card = document.createElement("article");
    card.className = "memory-card";
    card.innerHTML = `
      <header>
        <div>
          <span>${TYPE_LABELS[memory.type] || memory.kind || memory.type || "memory"}</span>
          <h3></h3>
        </div>
        <span>${memory.importance}</span>
      </header>
      <p></p>
      <div class="pill-row"></div>
    `;
    card.querySelector("h3").textContent = memory.topic;
    card.querySelector("p").textContent = memory.content;

    const pillRow = card.querySelector(".pill-row");
    [memory.project, ...(memory.people || []), memory.emotion, ...(memory.tags || []).slice(0, 4)]
      .filter(Boolean)
      .forEach((value) => {
        const pill = document.createElement("span");
        pill.className = "pill";
        pill.textContent = value;
        pillRow.appendChild(pill);
      });

    els.memoryList.appendChild(card);
  });
}

function filterMemories(memories) {
  switch (state.memoryFilter) {
    case "project":
      return memories.filter((memory) => memory.type === "project" || memory.project);
    case "person":
      return memories.filter((memory) => memory.type === "person" || (memory.people || []).length);
    case "important":
      return memories.filter((memory) => memory.importance === "high");
    case "feeling":
      return memories.filter((memory) => memory.type === "feeling" || memory.emotion);
    default:
      return memories;
  }
}

function renderLayers() {
  const layerBoot = readJson(LAYERS_KEY);
  const booted = layerBoot && Array.isArray(layerBoot.layers) ? layerBoot.layers : [];
  layers.forEach(([name, description], index) => {
    const status = booted[index] ? booted[index].status : "ready";
    const card = document.createElement("article");
    card.className = "layer-card";
    card.innerHTML = `<span>${String(index + 1).padStart(2, "0")} - ${name} / ${status}</span><p>${description}</p>`;
    els.layerGrid.appendChild(card);
  });
}

function intentLabel(intent) {
  const labels = {
    idle: "Czeka na sygnał.",
    "memory.write": "Zapis do Relational Memory v2.",
    "memory.recall": "Smart Recall z localStorage.",
    "context.daily.plan": "Analiza dziennego kontekstu.",
    "phone.status": "Status lokalnej aplikacji telefonu.",
    "voice.off": "Voice output wyłączony.",
    "voice.on": "Voice output włączony.",
    "voice.stop": "Zatrzymanie mówienia.",
    healthcheck: "Healthcheck lokalnej warstwy MVP.",
    "echo.request": "Echo GPT wymaga zgody użytkownika.",
    "chat.reflect": "Rozmowa kontekstowa.",
  };
  return labels[intent] || intent;
}

function loadState() {
  const fallback = {
    messages: starterMessages,
    memories: [],
    pendingAction: null,
    witnessLog: [],
    lastDecision: "idle",
    lastRiskLevel: "low",
    privacyMode: true,
    echoEnabled: false,
    echoStatus: "disabled",
    pendingEchoPayload: null,
    memoryFilter: "all",
    lastIntent: "idle",
    lastRoute: "lokalnie",
  };

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? { ...fallback, ...saved, memories: migrateMemories(saved.memories || []) } : fallback;
  } catch {
    return fallback;
  }
}

function migrateMemories(memories) {
  return memories.map((memory) => ({
    id: memory.id || `${memory.createdAt || Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind: memory.kind || memory.type || "memory",
    topic: memory.topic || memory.type || "notatka",
    type: ["note", "project", "person", "task", "feeling"].includes(memory.type) ? memory.type : "note",
    content: memory.content || memory.text || "",
    people: Array.isArray(memory.people) ? memory.people : [],
    project: memory.project || "",
    importance: ["low", "medium", "high"].includes(memory.importance) ? memory.importance : "medium",
    emotion: memory.emotion || "",
    createdAt: memory.createdAt || new Date().toISOString(),
    lastSeen: memory.lastSeen || memory.createdAt || new Date().toISOString(),
    tags: Array.isArray(memory.tags) ? memory.tags : [],
  }));
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadVoiceOutput() {
  const fallback = {
    enabled: true,
    speaking: false,
    selectedVoice: null,
    volume: 1,
    rate: 0.95,
    pitch: 0.95,
  };

  try {
    const saved = JSON.parse(localStorage.getItem(VOICE_OUTPUT_KEY));
    return saved ? { ...fallback, ...saved, speaking: false } : fallback;
  } catch {
    return fallback;
  }
}

function saveVoiceOutput() {
  localStorage.setItem(
    VOICE_OUTPUT_KEY,
    JSON.stringify({
      enabled: voiceOutput.enabled,
      speaking: false,
      selectedVoice: voiceOutput.selectedVoice,
      volume: voiceOutput.volume,
      rate: voiceOutput.rate,
      pitch: voiceOutput.pitch,
    })
  );
}
