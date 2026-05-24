# Testing Brat Witness Phone MVP v1

## First boot

- Otwórz aplikację pierwszy raz przez HTTP.
- Oczekiwane: wiadomość `Dobra, lokalna warstwa gotowa. Wszystko siedzi na tym telefonie.`
- W `localStorage` powinny powstać: `bratWitnessPhoneConfig`, `bratWitnessLayers`, `brat-witness-phone-memory-v2`.

## Live companion loop

Komenda:

```text
Projekt Aurora z Adamem jest ważny
```

Oczekiwane: Witness nie zapisuje od razu. Pyta: `Mam zapamiętać?`

Potem:

```text
tak
```

Oczekiwane: zapis do Memory V3 i odpowiedź `Dobra, mam to.`

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

## Reminder consent

Komenda:

```text
Jutro faktura
```

Oczekiwane: Witness pyta, czy zrobić przypomnienie.

Potem:

```text
nie teraz
```

Oczekiwane: pending action jest anulowane.

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
Echo, przeanalizuj Aurorę
```

Oczekiwane: aplikacja prosi o zgodę i głosem pyta o wysłanie tylko potrzebnego kontekstu. Po `tak` albo kliknięciu `Użyj Echo GPT` pokazuje odpowiedź `Echo GPT mock`.

## Witness log

Komenda:

```text
pokaż log witness
```

Oczekiwane: ostatnie decyzje orchestratora, bez czytania długiego logu głosem.

## Microphone input

- Wejdź w `Rozmowa`.
- Kliknij `🎤`.
- Powiedz `status telefonu`.
- Oczekiwane: status `Słucham...`, potem `Przetwarzam...`, tekst trafia do inputu i komenda się wykonuje.

## Voice output

- Wpisz `status telefonu`.
- Oczekiwane: Witness pokazuje tekst i czyta krótką odpowiedź głosem, jeśli przeglądarka wspiera `speechSynthesis`.

## Toggle voice

Komendy:

```text
wyłącz głos
włącz głos
```

Oczekiwane: przycisk zmienia się między `🔊` i `🔇`, a preferencja zapisuje się w `localStorage`.

## Pending action voice confirmation

- Uruchom komendę, która wymaga zgody lub działania.
- Oczekiwane: Witness głosem pyta `Mam to zrobić?`, jeśli akcja jest oznaczona jako pending.

## Echo voice confirmation

Komenda:

```text
echo rozwiń projekt Aurora
```

Oczekiwane: Witness głosem mówi `Echo może pomóc głębiej. Wysłać tylko potrzebny kontekst?`.

## Stop speaking

Komenda:

```text
stop mówienie
```

Oczekiwane: bieżące mówienie zatrzymuje się.

## Unsupported browser fallback

- Otwórz aplikację w przeglądarce bez Web Speech API.
- Oczekiwane: tekst działa normalnie, a UI pokazuje `Voice unsupported` albo komunikat o braku wsparcia mikrofonu/outputu.

## Clear memory

- Wejdź w `Pamięć`.
- Kliknij `Wyczyść pamięć`.
- Oczekiwane: wpisy pamięci znikają, rozmowa pokazuje krótki komunikat.
