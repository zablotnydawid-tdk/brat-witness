# BRAT WITNESS Phone MVP v0.1

Statyczny prototyp pierwszej warstwy companion AI pod telefon.

## Co działa

- widok dnia,
- rozmowa,
- prosty Intent Engine,
- zapisywanie pamięci relacyjnej w `localStorage`,
- przypomnienia jako lokalne akcje,
- wyszukiwanie po pamięci,
- router `local` / `cloud-ready`,
- ekran 11 warstw implementacyjnych.

## Jak uruchomić

Otwórz `index.html` w przeglądarce.

## Przykładowe komendy

- `Co mam dziś ogarnąć?`
- `Zapamiętaj: Samsung A17 to pierwszy telefon pod MVP Brat Witness`
- `Przypomnij mi jutro sprawdzić local AI na telefonie`
- `Znajdź Samsung`

## Następny krok techniczny

Ten prototyp można przenieść do React Native albo Fluttera. Najpierw warto dopiąć kontrakty modułów:

- `IntentEngine.parse(text, context)`,
- `MemoryStore.add/search/list`,
- `Router.pick(intent, privacyMode, complexity)`,
- `ActionLayer.execute(action)`.
