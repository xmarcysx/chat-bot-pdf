# Chatbot PDF z RAG i Ollama

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

🤖 **Inteligentny chatbot oparty na dokumentach PDF z wykorzystaniem technologii RAG i Ollama**

Projekt wykorzystuje architekturę Retrieval-Augmented Generation (RAG) do tworzenia chatbota, który może rozmawiać wyłącznie na podstawie instrukcji zawartych w dokumentach PDF użytkownika. System integruje lokalny model językowy Ollama przez API.
## 🚀 Funkcjonalności

- 📄 **Przetwarzanie dokumentów PDF** - Automatyczne ekstrakcję tekstu z plików PDF
- 🧠 **Retrieval-Augmented Generation (RAG)** - Inteligentne wyszukiwanie i generowanie odpowiedzi na podstawie kontekstu
- 🤖 **Integracja z Ollama** - Wykorzystanie lokalnych modeli językowych przez API
- 🔒 **Izolacja kontekstu** - Chatbot rozmawia wyłącznie na podstawie załadowanych dokumentów
- 💾 **Baza danych wektorowa** - Przechowywanie embeddingów dla efektywnego wyszukiwania
- 🌐 **Nowoczesny interfejs webowy** - Angular z Material Design
- ⚡ **Mikrousługi** - Backend oparty na NestJS z separacją odpowiedzialności

## 🏗️ Architektura

### Komponenty systemu:

1. **Frontend (Angular)** - Interfejs użytkownika do zarządzania dokumentami i prowadzenia rozmów
2. **Backend API (NestJS)** - REST API obsługujące logikę biznesową
3. **Vector Database** - ChromaDB / Pinecone do przechowywania embeddingów
4. **PDF Processor** - Ekstrakcja tekstu z dokumentów PDF
5. **RAG Engine** - System wyszukiwania i generowania odpowiedzi
6. **Ollama API** - Lokalny model językowy

## 🛠️ Technologie

- **Frontend**: Angular 21, Angular Material, RxJS
- **Backend**: NestJS, TypeScript, Express
- **AI/ML**: Ollama, LangChain, ChromaDB
- **Baza danych**: PostgreSQL + wektorowa baza danych
- **Build Tool**: Nx Workspace
- **Testing**: Vitest, Jest

## 📦 Instalacja i uruchomienie

### Wymagania wstępne

- Node.js 20+
- npm lub yarn
- Ollama zainstalowany lokalnie
- PostgreSQL

### 1. Klonowanie repozytorium

```bash
git clone <repository-url>
cd chat-bot-pdf
```

### 2. Instalacja zależności

```bash
npm install
```

### 3. Uruchomienie Ollama

```bash
# Zainstaluj model (np. llama2)
ollama pull llama2

# Uruchom serwer Ollama
ollama serve
```

### 4. Konfiguracja bazy danych

```bash
# Utwórz bazę danych PostgreSQL
createdb chat_bot_pdf

# Skonfiguruj połączenie w pliku .env
cp .env.example .env
# Edytuj .env z właściwymi danymi bazy
```

### 5. Uruchomienie aplikacji

```bash
# Uruchom backend API
npx nx serve api

# Uruchom frontend (w nowym terminalu)
npx nx serve web
```

Aplikacja będzie dostępna pod:
- Frontend: http://localhost:4200
- Backend API: http://localhost:3000

## 🔧 Konfiguracja

### Zmienne środowiskowe (.env)

```env
# Baza danych
DATABASE_URL=postgresql://user:password@localhost:5432/chat_bot_pdf

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2

# Vector Database
VECTOR_DB_URL=http://localhost:8000

# JWT
JWT_SECRET=your-secret-key
```

## 📚 Użycie

### 1. Dodawanie dokumentów PDF

1. Przejdź do zakładki "Dokumenty"
2. Kliknij "Dodaj dokument"
3. Wybierz plik PDF z instrukcjami
4. Poczekaj na przetworzenie dokumentu

### 2. Rozmowa z chatbotem

1. Przejdź do zakładki "Chat"
2. Wybierz dokument kontekstowy
3. Zadaj pytanie dotyczące instrukcji z dokumentu
4. Chatbot odpowie wyłącznie na podstawie załadowanych dokumentów

## 🧪 Testowanie

```bash
# Uruchom testy jednostkowe
npx nx test

# Uruchom testy e2e
npx nx e2e api-e2e

# Uruchom wszystkie testy
npx nx run-many --target=test
```

## 🚀 Wdrożenie

### Development

```bash
npx nx build
```

### Production

```bash
# Build wszystkich aplikacji
npx nx run-many --target=build --configuration=production

# Uruchomienie w trybie produkcyjnym
npx nx serve api --configuration=production
npx nx serve web --configuration=production
```

## 📁 Struktura projektu

```
chat-bot-pdf/
├── api/                    # Backend NestJS
│   ├── src/
│   │   ├── modules/
│   │   │   ├── chat/       # Moduł chat
│   │   │   ├── documents/  # Moduł dokumentów
│   │   │   └── rag/        # Moduł RAG
│   │   └── main.ts
│   └── project.json
├── web/                    # Frontend Angular
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   └── pages/
│   │   └── main.ts
│   └── project.json
├── api-e2e/               # Testy e2e
├── packages/              # Wspólne biblioteki
└── nx.json               # Konfiguracja Nx
```

## 🔧 Rozwój

### Dodawanie nowych funkcji

```bash
# Generowanie nowego modułu w API
npx nx g @nx/nest:module modules/new-feature --project=api

# Generowanie komponentu w Angular
npx nx g @nx/angular:component components/new-component --project=web
```

### Debugowanie

```bash
# Uruchomienie z debugowaniem
npx nx serve api --inspect

# Podgląd grafu zależności
npx nx graph
```

## 🤝 Przyczynianie się

1. Fork projektu
2. Utwórz branch dla nowej funkcji (`git checkout -b feature/nazwa-funkcji`)
3. Zacommituj zmiany (`git commit -am 'Dodaj nową funkcję'`)
4. Wypchnij branch (`git push origin feature/nazwa-funkcji`)
5. Utwórz Pull Request

## 📄 Licencja

Ten projekt jest licencjonowany na warunkach MIT - zobacz plik [LICENSE](LICENSE) dla szczegółów.

## 📞 Kontakt

Jeśli masz pytania lub potrzebujesz pomocy, śmiało napisz!

---

*Powered by Nx, Angular, NestJS, Ollama i RAG*
