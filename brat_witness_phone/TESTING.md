# Testing Brat Witness Phone MVP v1

## First boot

- Otwórz aplikację pierwszy raz przez HTTP.
- Oczekiwane: wiadomość `Dobra, lokalna warstwa gotowa. Wszystko siedzi na tym telefonie.`
- W `localStorage` powinny powstać: `bratWitnessPhoneConfig`, `bratWitnessLayers`, `brat-witness-phone-memory-v2`.

## PWA install

- Android Chrome: kliknij `Zainstaluj na telefonie` albo użyj menu `⋮`.
- iPhone Safari: `Udostępnij` → `Do ekranu początkowego`.
- Oczekiwane: aplikacja startuje w trybie zbliżonym do standalone, jeśli platforma wspiera PWA.

## Offline mode

- Uruchom aplikację przez HTTP.
- Poczekaj na service worker.
- Odśwież stronę.
- Odłącz internet.
- Oczekiwane: aplikacja nadal się otwiera, a `healthcheck` pokazuje cache jako ready lub pending, jeśli przeglądarka jeszcze aktywuje SW.

## Memory save

Komenda:

```text
zapamiętaj projekt Aurora z Adamem, ważne
```

Oczekiwane: odpowiedź `Mam to. Wygląda na ważne.` i wpis w zakładce `Pamięć`.

## Smart Recall

Komendy:

```text
co pamiętasz o Aurorze
jak było z Adamem
znajdź fakturę
```

Oczekiwane: krótki skrót, powiązania i źródła pamięci.

## Reminder

Komenda:

```text
przypomnij mi jutro o fakturze
```

Oczekiwane: zapis jako lokalne zadanie w pamięci.

## Phone status

Komenda:

```text
status telefonu
```

Oczekiwane:

```text
Lokalnie. Pamięć działa. Router gotowy. Chmura wyłączona.
```

## Healthcheck

Komenda:

```text
healthcheck
```

Oczekiwane: status `localStorage`, `memory`, `router`, `layers`, service workera, Echo i offline cache.

## Echo mock

Komenda:

```text
echo rozwiń projekt Aurora
```

Oczekiwane: aplikacja prosi o zgodę. Po kliknięciu `Użyj Echo GPT` pokazuje odpowiedź `Echo GPT mock`.

## Clear memory

- Wejdź w `Pamięć`.
- Kliknij `Wyczyść pamięć`.
- Oczekiwane: wpisy pamięci znikają, rozmowa pokazuje krótki komunikat.
