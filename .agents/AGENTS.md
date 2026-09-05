# Rules
- **Default Auto-Push Rule (Active until explicitly told otherwise):**
  - On every change or feature completion, automatically push the code to GitHub.
  - **Do NOT stage all files (Never use `git add .` or `git commit -a`)**: Only stage the specific files that were created or modified for that feature/change (e.g. `git add <file1> <file2>`).
  - Execute `git add <files>`, `git commit -m "<clear description>"`, and `git push origin main` automatically, and notify the user with the commit summary.


