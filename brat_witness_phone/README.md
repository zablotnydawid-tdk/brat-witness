# Brat Witness Phone MVP v1

Brat Witness to lokalny prototyp companion AI na telefon: krótka rozmowa, pamięć relacyjna, Smart Recall, status telefonu, PWA offline i opcjonalny Echo GPT Layer jako mock. Domyślnie wszystko działa lokalnie w przeglądarce telefonu.

## Jak odpalić

Uruchom lokalny serwer HTTP:

```bash
cd /mnt/c/BRAT_WITNESS_PHONE_MVP/brat_witness_phone
python3 -m http.server 8080
```

Na komputerze otwórz:

```text
http://localhost:8080
```

Na telefonie w tej samej sieci otwórz:

```text
http://IP_KOMPUTERA:8080
```

## Jak dodać na telefon

Android Chrome:

1. Otwórz adres aplikacji.
2. Kliknij `Zainstaluj na telefonie`, jeśli przeglądarka pokaże instalację.
3. Jeśli nie pokaże: menu `⋮` → `Dodaj do ekranu głównego`.

iPhone Safari:

1. Otwórz adres aplikacji w Safari.
2. Kliknij `Udostępnij`.
3. Wybierz `Do ekranu początkowego`.

## Jak testować

W zakładce `Rozmowa` wpisz:

- `status telefonu`
- `healthcheck`
- `co dziś`
- `zapamiętaj projekt Aurora z Adamem, ważne`
- `Projekt Aurora z Adamem jest ważny`
- `tak`
- `co pamiętasz o Aurorze`
- `jak było z Adamem`
- `znajdź fakturę`
- `Jutro faktura`
- `nie teraz`
- `Echo, przeanalizuj Aurorę`
- `pokaż log witness`
- `przypomnij mi jutro o fakturze`
- `echo rozwiń projekt Aurora`

## Co działa lokalnie

- PWA manifest i service worker offline-first.
- Auto-init pierwszego startu w `localStorage`.
- Boot 11/11 warstw MVP.
- Voice Input przez Web Speech API, jeśli wspiera go przeglądarka.
- Voice Output przez Web Speech Synthesis API, jeśli wspiera go przeglądarka.
- Relational Memory v2.
- Smart Recall po projekcie, osobie i tagu.
- Przypomnienia jako lokalne zadania.
- Ekran `Telefon` ze statusem aplikacji, storage, service workera, Echo i warstw.
- Komenda `healthcheck`.

## Live Companion Loop

Główna ścieżka rozmowy idzie przez `handleLiveInput(input, source)` i `witnessOrchestrator(input, source)`. Użytkownik nie musi używać magicznych komend. Może powiedzieć normalnie: `Projekt Aurora z Adamem jest ważny`, a Witness sam wykryje, że to kandydat do pamięci i zapyta o zgodę.

Kolejność:

1. zatrzymanie aktualnego głosu,
2. obsługa `pendingAction`, jeśli czeka zgoda,
3. analiza kontekstu,
4. decyzja companion engine,
5. utworzenie zgody albo lokalne wykonanie,
6. odpowiedź tekstem i głosem.

## Witness Orchestrator

Orchestrator pilnuje pamięci, Echo, phone bridge, ryzyka, zgody, logu decyzji i odpowiedzi głosowej. Ważne decyzje trafiają do `witnessLog`, który pokażesz zdaniem:

```text
pokaż log witness
```

## Memory V3 Event Graph

Pamięć ma teraz formę event graph. Wpisy mają `kind`, `topic`, `content`, `people`, `project`, `emotion`, `importance`, `source`, `links`, `confirmations` i `tags`.

Witness nie zapisuje ważnych rzeczy bez zgody. Najpierw pyta:

```text
To brzmi ważnie. Mam zapamiętać?
```

## Consent model

Centralny `pendingAction` obsługuje pamięć, przypomnienia, Echo, notatki, czyszczenie pamięci i akcje telefonu.

Potwierdzenia: `tak`, `dobra`, `dawaj`, `potwierdzam`, `zapisz`, `zapamiętaj`, `leć`.

Anulowanie: `nie`, `anuluj`, `nie teraz`, `odpuść`, `stop`.

## Co jest mockiem

- Echo GPT Layer jest mockiem w `app.js`.
- `server-example.js` pokazuje kierunek backendu, ale nie woła jeszcze prawdziwego API.
- Local AI jest placeholderem.

## Voice Input

W zakładce `Rozmowa` przy inputcie jest przycisk `🎤`. Na Android Chrome aplikacja używa Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) do rozpoznania mowy i wpisania tekstu do pola rozmowy.

Statusy:

- `Słucham...`
- `Przetwarzam...`
- `Mikrofon niedostępny`

Aplikacja nie zapisuje audio i nie wysyła plików audio. Używa tylko mechanizmu rozpoznawania mowy dostępnego w przeglądarce. Jeśli przeglądarka nie wspiera tej funkcji, pokaże komunikat:

```text
Ta przeglądarka nie wspiera mikrofonu.
```

## Voice Companion Layer

Brat Witness ma też output głosowy przez Web Speech Synthesis API (`speechSynthesis` i `SpeechSynthesisUtterance`). Tekst zostaje jako fallback, ale na wspieranych przeglądarkach Witness czyta krótkie odpowiedzi głosem.

Komendy:

- `wyłącz głos`
- `włącz głos`
- `stop mówienie`

Zasady:

- nie czyta długich logów, JSON ani dużych list,
- czyta krótkie potwierdzenia, alerty i pytania,
- przed następną odpowiedzią zatrzymuje poprzedni głos,
- zapamiętuje w `localStorage`, czy głos jest włączony i jaki głos był ostatnio używany,
- nie zapisuje audio.

Android Chrome jest rekomendowany. Jeśli przeglądarka nie wspiera voice output, aplikacja pokaże:

```text
Ta przeglądarka nie wspiera voice output.
```

## Voice-first mode

Mikrofon i głos wyjściowy są spięte z live loop. Rozpoznany tekst idzie przez `handleLiveInput()`, a Witness czyta krótkie odpowiedzi, pytania o zgodę i alerty. Długie logi, JSON i diagnostyka nie są czytane.

## Echo GPT Layer

Echo jest domyślnie wyłączone. Prośby typu `echo`, `rozwiń`, `przeanalizuj`, `głębiej`, `strategia`, `napisz lepiej` ustawiają router na `needsEcho` i pokazują zgodę:

```text
To wymaga Echo GPT. Wysłać tylko potrzebny kontekst?
```

Frontend wysyłałby tylko:

- `userRequest`
- `selectedMemory`
- `taskType`
- `privacyNote`

Nie wysyła całej pamięci i nie ma klucza API.

## Echo safety

`callEchoGPT()` zostaje mockiem. Payload Echo zawiera tylko `userRequest`, `selectedMemory`, `taskType` i `privacyNote`. Frontend nie ma klucza API.

## Phone Bridge limitations

`phoneBridge` jest placeholderem PWA:

- `createReminder` zapisuje lokalne task/event,
- `createNote` zapisuje lokalną notatkę,
- `openApp` jest zablokowany,
- `nativeBridge` ma wartość `false`.

Akcje telefonu wymagają zgody i docelowo natywnego mostu Android.

## Gdzie podpiąć prawdziwe GPT API

Prawdziwe API podepnij później w:

```text
server-example.js
```

Klucz API ma być tylko na serwerze, np. w `process.env.OPENAI_API_KEY`. Nie wkładać klucza do `app.js`, `localStorage`, manifestu ani żadnego pliku frontendu.

Więcej szczegółów:

- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [TESTING.md](./TESTING.md)
