# Rules

## 1. Production Workflow
- **Push Big Changes to Production**: When a major feature, bugfix, or milestone is completed, stage, commit, and push directly to the production repository (`git add .`, `git commit -m "..."`, and `git push origin main`).

## 2. UI/UX Design System
- **Distraction-Free & Minimalist**: Reverent aesthetic for Qur'an research. Avoid heavy animations, bouncing effects, or radar pings. Use clean fades and subtle progress bars.
- **Theme Semantic Tokens Only**: Always use Tailwind theme tokens (`bg-background`, `text-foreground`, `text-reading`, `text-arabic`, `bg-card`, `border-border`, `text-accent`, `bg-accent/10`). Never use rogue neon colors (like bright blue or emerald). Do NOT modify variables in `globals.css`.
- **Codebase Discipline**: Do not alter backend API logic or database queries during UI passes.

## 3. Build & Efficiency Rules
- **No Early Builds**: Do NOT run `npm run build` or continuous build polling until ALL code edits and file modifications for the task are completely finished.
- **Local Code Search Only**: Use `grep_search` or `find_by_name` for internal files—never `search_web`.
