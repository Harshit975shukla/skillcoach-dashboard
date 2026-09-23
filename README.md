# SkillCoach Dashboard

Live progress dashboard for my interview & technical-skills practice.

**→ https://harshit975shukla.github.io/skillcoach-dashboard**

The site is static. A Telegram bot pushes `docs/data.json` here whenever I
complete a task, finish a mock interview, or get a resume review.

| File | Purpose |
|---|---|
| `docs/index.html` | Dashboard markup |
| `docs/app.js` | Loads `data.json` and renders it |
| `docs/styles.css` | Styling (dark/light, responsive) |
| `docs/data.json` | Progress snapshot, written by the bot |

No build step, no dependencies.
