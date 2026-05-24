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
- `co pamiętasz o Aurorze`
- `jak było z Adamem`
- `znajdź fakturę`
- `przypomnij mi jutro o fakturze`
- `echo rozwiń projekt Aurora`

## Co działa lokalnie

- PWA manifest i service worker offline-first.
- Auto-init pierwszego startu w `localStorage`.
- Boot 11/11 warstw MVP.
- Relational Memory v2.
- Smart Recall po projekcie, osobie i tagu.
- Przypomnienia jako lokalne zadania.
- Ekran `Telefon` ze statusem aplikacji, storage, service workera, Echo i warstw.
- Komenda `healthcheck`.

## Co jest mockiem

- Echo GPT Layer jest mockiem w `app.js`.
- `server-example.js` pokazuje kierunek backendu, ale nie woła jeszcze prawdziwego API.
- Local AI jest placeholderem.

## Echo GPT Layer

Echo jest domyślnie wyłączone. Komendy typu `echo`, `rozwiń`, `przeanalizuj`, `głębiej`, `strategia`, `napisz lepiej` ustawiają router na `needsEcho` i pokazują zgodę:

```text
To wymaga Echo GPT. Wysłać tylko potrzebny kontekst?
```

Frontend wysyłałby tylko:

- `userRequest`
- `selectedMemory`
- `taskType`
- `privacyNote`

Nie wysyła całej pamięci i nie ma klucza API.

## Gdzie podpiąć prawdziwe GPT API

Prawdziwe API podepnij później w:

```text
server-example.js
```

Klucz API ma być tylko na serwerze, np. w `process.env.OPENAI_API_KEY`. Nie wkładać klucza do `app.js`, `localStorage`, manifestu ani żadnego pliku frontendu.

Więcej szczegółów:

- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [TESTING.md](./TESTING.md)
