<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Rules

## Git & Milestones
- After achieving a major feature, a major fix, or a big milestone, notify the user with a summary and ask them to push the code to their GitHub repository to ensure changes are continuously saved. Do NOT ask them to push on every minor change.
- When asking the user to push to GitHub, always provide the exact git add command (using `git add .` to ensure the entire project is backed up and no local changes are lost), git commit (with a clear description), and git push commands so they can easily copy and paste them.

## UI/UX Design System & Architectural Rules

### 2. Distraction-Free & Minimalist Philosophy
- **Scholarly & Reverent Aesthetic**: Al-Juthur is an enterprise-grade academic and spiritual Qur'an research platform. The visual tone must be tranquil, dignified, and distraction-free.
- **No Heavy Animations**:
  - Avoid aggressive bouncing, multi-ring radar pings, pulsing neon glow blobs, and spring physics.
  - Keep page transitions and loading states quiet and minimalist: clean "Al-Juthur" title, subtle secondary status text, and a thin (2px) theme accent progress bar.
  - Dialogs and overlays should use gentle fades or clean instant appearances without bouncy physics.

### 3. Color Palette & Theme Tokens
- **Zero Rogue / Out-of-Place Colors**:
  - DO NOT use uncoordinated neon colors like random `blue-400/500`, `purple-400/500`, `cyan-400`, or bright neon `emerald-400/500`.
  - Never use colored markdown typography classes like `prose-emerald` or `prose-blue`. Always use `prose dark:prose-invert`.
- **Use Theme Semantic Tokens**:
  - Always rely on CSS variables and semantic Tailwind tokens defined in `globals.css`:
    - **Sepia / Paper Mode (Default)**: Background (`--background: #F4ECD8`), Reading text (`--foreground: #5B4636`), Quranic Arabic (`--arabic: #3D2B1F`), Card surface (`--card: #EFE6D0`), Accent Gold (`--accent: #8B6914`), Borders (`--border: #D4C4A8`).
    - **Dark Mode (`.dark`)**: Background (`--background: #1A1A1A`), Reading text (`--foreground: #D4D4D4`), Quranic Arabic (`--arabic: #EDE8E0`), Card surface (`--card: #242424`), Accent Gold (`--accent: #C4A574`), Borders (`--border: #3A3A3A`).
  - Use Tailwind utility classes: `bg-background`, `text-foreground`, `text-reading`, `text-arabic`, `bg-card`, `text-card-foreground`, `bg-muted`, `border-border`, `text-accent`, `bg-accent`.
  - For badges, tags, pills, and active states across Tafsir, Lexicon, RAG, and Settings: standard style is `bg-accent/10 text-accent border border-accent/25`.
  - For audio recitation and word-by-word active tracking: use `!text-accent` so words highlight in antique gold in sepia mode and illuminated gold in dark mode.
- **Do Not Alter Theme Variables**: The user is fully satisfied with the sepia and dark mode variables in `globals.css`. Do NOT change `:root` or `.dark` theme color definitions.

### 5. Codebase Discipline
- When performing UI/UX styling passes, do NOT alter backend API logic, Prisma queries, RAG retrieval logic, or audio store state management.
