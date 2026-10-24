# 03: Git and workflow

How the repo and the push workflow were set up, and the git hiccups along the way.

## The workflow

After every working step: commit, then push to `main` on GitHub (`raj2208/Clock`). Each step is its own commit, so I can always roll back one step.

Commit history so far:

| Commit | What |
|---|---|
| Add README | First commit |
| add gitignore for skill folders | Keeps local skill files out of GitHub |
| add context file describing the clock project idea | Requirements |
| update context with hotkey and settings window decisions | Decisions |
| add comparison of technology options for the clock | Why Electron |
| add roadmap with step by step build plan | The plan |
| add electron hello window for step one | Step 1 |
| move docs into docs folder | Tidy-up |
| add live ticking time to the window | Step 2 |
| make the clock a frameless always on top corner window | Step 3 |
| show the clock over full screen apps | Step 4 |
| add journey docs explaining the build and hiccups | The docs in this folder |
| document the journey docs skill and commit history | Notes on the second skill |
| add countdown timer with adjustable duration | Step 5a |
| add stopwatch that counts up with tenths | Step 5b |
| add mode button to switch clock timer stopwatch | Step 5c |
| add start pause and reset for timer and stopwatch | Step 5d |
| document step five timer stopwatch and modes | Journey notes for Step 5 |
| make the clock resizable with scaling content | Step 7a |
| add opacity button using a safe preload bridge | Step 7b |
| document step seven resize and opacity | Journey notes for Step 7 |

For Step 7 I committed each sub-step locally as soon as it worked, but did not push until I said "push". That is the habit from the Step 3 and 4 hiccup: commit as soon as something works, so steps never get tangled, and still keep control over when code goes to GitHub.

## A custom push skill

I wanted one consistent way to commit and push, so I copied a skill from my Terraform project and renamed it `clock-git-push`. A skill is a small instruction file that tells the AI assistant exactly how to do a task. This one says:

1. Say that the skill is being used.
2. `git add .`
3. Use my commit message, or write a short lowercase one (5 to 10 words, no punctuation at the end).
4. `git commit -m "message"` with **no** `Co-Authored-By` line.
5. `git push origin main`.

The skill lives in `.agents/skills/clock-git-push/SKILL.md` with a symlink at `.claude/skills/clock-git-push`. Both folders are in `.gitignore`, so the skill stays on my machine and is not published.

## A second skill: documenting as I go

Writing the journey docs at the end would mean forgetting the details, so I made a second skill, `clock-journey-docs`. After each finished step, solved bug, or changed decision, it updates `docs/journey/` and pushes the docs to GitHub.

- **Standing permission:** I told it to push these documentation updates without asking me each time. Code pushes still wait for me to say "push".
- **Docs only:** it stages `docs/` only (`git add docs/`), not everything. If it used `git add .` like `clock-git-push`, a docs commit could sweep up code changes I had not approved yet.
- **Honest by design:** it must only record what actually happened and say what was not verified.
- **Local only:** like the push skill, it lives in `.agents/skills/` and is gitignored.

## Hiccups

### Hiccup 1: a co-author line I did not want

My first commit was automatically signed with a `Co-Authored-By: Claude` line. GitHub then listed "claude" as a second contributor on the repo.

**The fix:** I rewrote the commit.

```bash
git commit --amend -m "Add README"
git push --force-with-lease origin main
```

- `--amend` replaces the last commit with a new one, here with a cleaner message.
- A plain push is rejected after a rewrite, because the remote has a commit that my history no longer contains. `--force` overrides that.
- I used `--force-with-lease` instead, which is safer: it only overwrites the remote if it still has the commit I expect, so I cannot accidentally wipe out someone else's work.
- Rewriting published history is only safe when nobody else has built on it. Here the repo had a single commit.

**Lesson:** the skill now forbids the co-author line, so it does not happen again.

### Hiccup 2: GitHub still showed the old contributor

Even after the fix, the Contributors list on GitHub still showed Claude. The repo history was clean: both commits were by `raj2208` and neither had a co-author line.

**Why:** GitHub caches the contributors list, and the old commit stays on GitHub's servers for a while as an unreferenced object. It is not under my control, and it usually clears within a day or so. If not, GitHub Support can clear it.

**Lesson:** a clean history and what a website displays can disagree because of caching. Check the real data (`git log`) first.

### Hiccup 3: two steps in one file, but I wanted two commits

By the time I tested Step 3, I had already written Step 4 into `main.js`. I wanted to push them as two separate commits.

`git add -p` (pick parts of a file) is interactive and was not available in my setup. Instead:

1. Saved the Step 4 version of `main.js` to a temporary file.
2. Wrote the Step 3 version back, committed, and pushed it.
3. Restored the Step 4 version, committed, and pushed it.

**Lesson:** commit each step as soon as it works. It is much easier than separating them afterwards.

### Hiccup 4: the push skill was not a listed skill at first

I asked for "the git push skill" before it existed in this project, so the assistant did the same steps by hand. Only after I copied the skill over could it be invoked by name.

**Lesson:** a skill has to exist, in the right folder, before it can be called.

## Files that do and do not go to GitHub

| In GitHub | Not in GitHub (`.gitignore`) |
|---|---|
| `main.js`, `index.html`, `renderer.js`, `style.css` | `node_modules/` (272 MB, can be recreated with `pnpm install`) |
| `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` | `.agents/`, `.claude/` (local skills) |
| `docs/` | |
