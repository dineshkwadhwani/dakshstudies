# Daksh's Study Lab — Class X CBSE

A bold, gamified study portal for Daksh's Class X CBSE prep. Built with React + Vite + Tailwind. Deploys as a static site to Vercel.

## What's inside

- **30-day study schedule** (10 May – 8 Jun 2026) with daily check-offs
- **50 chapters** across Maths (15), Science (13), and Social Science (Geography 7, History 5, Civics 5, Economics 5)
- **1,250 interactive MCQs** — 25 per chapter — with two modes:
  - 🎓 **Practice mode** — instant feedback, no timer
  - ⏱️ **Test mode** — 25-minute timer, results revealed at the end
- **160 PDFs** bundled and served — chapter summaries, MCQ worksheets, answer keys, 4 mock tests
- **Progress tracking** — quiz scores, schedule completion, test attempts (saved on the device)

Mobile-first design. Bold neo-brutalist aesthetic. All progress is stored in the browser's `localStorage` — no backend needed.

---

## Deploying to Vercel

You have three easy options. Pick whichever you're comfortable with.

### Option A — Vercel CLI (fastest, ~2 minutes)

In your terminal:

```bash
cd portal              # the unzipped folder
npm install            # install dependencies (~30 sec)
npm run build          # builds into the dist/ folder

npx vercel             # this prompts you the first time
# - It'll ask: "Set up and deploy?" → Y
# - "Which scope?" → pick your account
# - "Link to existing project?" → N (first time)
# - "Project name?" → e.g., "daksh-study"
# - "In which directory is your code located?" → ./
# - It'll auto-detect Vite. Press Enter through the rest.
```

After the first deploy, every future `npx vercel` deploys a preview, and `npx vercel --prod` deploys to production.

### Option B — GitHub + Vercel dashboard (best long-term)

1. Create a new GitHub repo and push the unzipped `portal/` folder to it.
2. Go to https://vercel.com/new
3. Import the repo. Vercel will auto-detect Vite and configure everything.
4. Hit **Deploy**. Done in ~1 min.
5. Every git push from now on triggers a redeploy.

### Option C — Drag & drop (simplest, no CLI)

1. `cd portal && npm install && npm run build`
2. Open https://vercel.com/new
3. Drag the `dist/` folder onto the page.
4. Wait ~30 sec. You're live.

---

## After deploying

Vercel gives you a URL like `https://daksh-study.vercel.app`. Open it on Daksh's phone and add to home screen for an app-like experience:

- **iPhone (Safari)**: Tap Share → Add to Home Screen
- **Android (Chrome)**: Tap menu (⋮) → Add to Home screen

The favicon and theme color are already set up so the home-screen icon looks right.

---

## Local development

```bash
npm install
npm run dev          # starts at http://localhost:5173
npm run build        # production build → dist/
npm run preview      # preview the production build
```

---

## Project layout

```
portal/
├── public/
│   ├── favicon.svg
│   └── pdfs/                # all 160 PDFs (~30 MB)
│       ├── Daksh_Study_Schedule.pdf
│       ├── Maths_Ch01_RealNumbers_MCQ_Worksheet.pdf
│       ├── Science_Ch01_ChemicalReactionsAndEquations.pdf
│       ├── Test1_Maths_QP.pdf
│       └── ... (160 files total)
├── src/
│   ├── data/                # JSON data: 1250 MCQs + schedule + tests
│   │   ├── mcqs.json        # all questions, answers, PDF paths per chapter
│   │   ├── schedule.json    # 30-day plan
│   │   └── tests.json       # 4 mock tests
│   ├── pages/               # Home, Schedule, Chapters, Quiz, Tests, Progress, PdfView
│   ├── components/          # Layout (header + bottom nav)
│   ├── hooks/               # useStorage (localStorage), useData (data accessors)
│   ├── utils/               # dates, text rendering
│   ├── App.jsx              # router
│   ├── main.jsx             # entry
│   └── index.css            # Tailwind + custom styles
├── index.html
├── tailwind.config.js
├── vite.config.js
├── vercel.json              # SPA routing for Vercel
└── package.json
```

---

## Where things live

**Want to change the schedule?** Edit `src/data/schedule.json` directly, or rebuild from a script.

**Want to add a chapter or MCQ?** Edit `src/data/mcqs.json`. Each chapter has `id`, `number`, `title`, `questions` (array of `{q, opts}`), `answers` (array of `"A"`/`"B"`/`"C"`/`"D"`).

**Want different colors / fonts?** Edit `tailwind.config.js` (palette + shadows + animations) and `src/index.css` (utility classes like `.btn-primary`, `.card`).

**Add a new PDF?** Drop it in `public/pdfs/` and link to it via a `Link` to `/pdf/pdfs/your-file.pdf?title=Your%20Title&back=/wherever`. The `PdfView` page will embed it.

---

## Future: adding login + monetization

The codebase is already structured to make this clean:

- All progress data flows through `src/hooks/useStorage.js`. Replace those `localStorage` calls with `fetch()` calls to a backend, and you're done.
- `src/hooks/useData.js` is the single point that exposes data to all pages. Adding a `useUser()` hook there next to `useQuizScores()` is straightforward.
- The MCQ JSON can stay client-side, or you can move it server-side for paywalling.

Suggested stack for v2: Supabase or Firebase for auth + a small Postgres/Firestore DB for user progress. Keep the static frontend on Vercel.

---

## License & credit

This portal was generated and personalized for Daksh's Class X prep (NCERT 2023–24 syllabus). Educational use only — questions are based on the published NCERT textbooks.
