# Deployment Brat Witness Phone MVP v1

## Uruchomienie lokalne

```bash
cd /mnt/c/BRAT_WITNESS_PHONE_MVP/brat_witness_phone
python3 -m http.server 8080
```

Na komputerze:

```text
http://localhost:8080
```

## Wejście z telefonu przez IP komputera

1. Upewnij się, że telefon i komputer są w tej samej sieci Wi-Fi.
2. Sprawdź IP komputera w sieci lokalnej.
3. Wejdź z telefonu na:

```text
http://IP_KOMPUTERA:8080
```

Przykład:

```text
http://192.168.1.23:8080
```

## Instalacja PWA Android

1. Otwórz aplikację w Chrome na Androidzie.
2. Kliknij `Zainstaluj na telefonie`, jeśli przycisk uruchomi prompt instalacji.
3. Jeśli prompt nie jest dostępny: menu `⋮` → `Dodaj do ekranu głównego`.
4. Uruchom aplikację z ikony na ekranie głównym.

## Instalacja PWA iPhone

1. Otwórz aplikację w Safari.
2. Kliknij `Udostępnij`.
3. Wybierz `Do ekranu początkowego`.
4. Uruchom aplikację z ikony na ekranie początkowym.

## Test offline

1. Otwórz aplikację przez HTTP.
2. Poczekaj chwilę, aż service worker zapisze app shell.
3. Odśwież raz stronę.
4. Włącz tryb samolotowy albo odłącz sieć.
5. Otwórz aplikację ponownie z tej samej karty albo z ikony PWA.
6. Wpisz `healthcheck` i sprawdź `offline cache ready`.

## Przyszły deploy

Możliwe ścieżki:

- GitHub Pages dla statycznego PWA.
- Netlify dla prostego deployu HTTPS.
- Własny serwer z HTTPS.

Service worker wymaga HTTP na `localhost` albo HTTPS w normalnym deployu.

## Przyszłe podpięcie Echo backend

Backend Echo zaczyna się w:

```text
server-example.js
```

Docelowo endpoint:

```text
POST /api/echo
```

Zasady:

- klucz API tylko na serwerze,
- frontend nigdy nie trzyma klucza,
- do backendu idzie tylko minimalny payload,
- nie wysyłamy całej pamięci.

## Phone Bridge limitations

Obecny build to PWA. Nie ma natywnego mostu Android:

- `nativeBridge: false`,
- przypomnienia i notatki są lokalne,
- otwieranie aplikacji telefonu jest zablokowane jako placeholder,
- prawdziwe integracje Android wymagają osobnej warstwy natywnej.
