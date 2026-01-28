# WordMaster - Offline Vocabulary Learning Tool

**WordMaster** is a lightweight, offline-first desktop application designed to help users (especially students and language learners in Taiwan) master vocabulary through efficient spaced repetition (SRS), inspired by Anki but with a cleaner, more modern interface and additional gamified elements.

Built with **React + Vite + Electron**, it runs completely offline, stores all data locally using IndexedDB, and supports importing decks from Anki (.apkg) and CSV formats.

### Core Features

- **Spaced Repetition System (SRS)**  
  Implements a standard Anki-like algorithm with four familiar ratings:  
  - **Again** — reset interval, lower ease  
  - **Hard** — shorter interval  
  - **Good** — standard interval increase  
  - **Easy** — longer interval, higher ease

- **Flexible Review Filtering**  
  Users can freely choose which difficulty levels to review in each session (multi-select: Again / Hard / Good / Easy / New cards).  
  When no filters are selected, defaults to standard "due cards only" behavior.

- **Multiple Question Types**  
  - Flashcard (classic front ↔ back flip)  
  - Tapping (select correct translation / fill-in from options)  
  - Typing (type the answer)  
  - Listening (audio recognition with TTS fallback)

- **Deck Management**  
  - Import from Anki .apkg (parses notes, fields, media)  
  - Import from CSV (word,translation,example,phonetic,tags)  
  - Export to CSV / JSON  
  - Edit / delete / merge decks  
  - Search, sort, filter, and bulk actions in deck editor

- **Statistics & Feedback**  
  - Session accuracy (Good + Easy %)  
  - Daily review count (unique cards reviewed today)  
  - Mastery progress pie chart  
  - Quick visual & audio feedback (correct/incorrect animations & sounds)

- **UI / UX Highlights**  
  - Clean, modern Tailwind interface  
  - Dark mode support  
  - Fully localized in Traditional Chinese (繁體中文)  
  - Responsive layout (desktop-first, mobile-friendly)

### Current Status & Known Limitations (as of Jan 2026)

**Working well**
- SRS algorithm & rating system
- Deck listing, editing, basic statistics
- CSV import
- Flashcard & Tapping modes
- Dark mode & language toggle UI (though English is partial)

**Known issues / not yet stable**
- .apkg import is partially implemented but still unstable (occasional ENOTDIR / parsing errors)
- Some advanced question types (Listening, Typing in certain modes) may fall back or crash on small decks
- Preload / contextIsolation configuration is fragile during development → occasional white screen on startup
- IndexedDB initialization can fail on first run or after cache corruption (requires manual ~/Library/Application Support/wordmaster deletion on macOS)
- Accuracy & "today completed" calculations sometimes inconsistent when session is interrupted
- No export to .apkg (only CSV/JSON)
- No sync across devices (purely local)

**Not implemented yet (future roadmap ideas)**
- Full Anki .apkg export
- Audio recording / pronunciation check
- Cloud backup (optional, with user consent)
- Custom deck templates / note types
- Mobile layout polish & touch gestures

### How to Use

1. **Launch the app**  
   Run `npm run dev` + `electron .` (development) or use the packaged installer (once available).

2. **Import your first deck**  
   - Click **+ Import Deck** on the main screen  
   - Choose a CSV file or Anki .apkg export  
   - Wait for import completion (progress bar shown)

3. **Start learning**  
   - Click a deck card → **學習選項**  
   - Choose learning direction (中文→English / English→中文)  
   - Select which difficulty levels to review (multi-select)  
   - Choose question type (Flashcard / Tapping / Typing / Listening)  
   - Click **開始學習**

4. **During review**  
   - Flashcard: click to flip, then rate Again/Hard/Good/Easy  
   - Other modes: answer → instant feedback → auto rate (correct=Good, wrong=Hard)  
   - Finish session → see accuracy, time, and celebration animation

### Development Setup

```bash
# Install dependencies
npm install

# Start Vite dev server (terminal 1)
npm run dev

# Start Electron (terminal 2)
electron .
```

**Recommended VS Code extensions**  
- ESLint  
- Prettier  
- Tailwind CSS IntelliSense  
- React Developer Tools (Chrome extension)  
- Electron DevTools

### Contributing / Reporting Bugs

Feel free to open issues or PRs. Especially welcome:
- Stable .apkg import fixes
- Better error handling for IndexedDB failures
- Performance improvements on large decks (>10k cards)
- Additional question types or gamification

Happy learning! 🚀

WordMaster – Learn smarter, not harder.
