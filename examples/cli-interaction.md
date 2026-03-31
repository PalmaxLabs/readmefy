# Example CLI Interaction

This document shows what a real `readmefy` session looks like in the terminal.

---

## Scenario: New project (no README.md)

```
$ npx readmefy

  Readmefy v1.0.0
  AI-powered README generator

⠋ Analyzing project...
✔ Analysis complete

  ✔ Detected:        Astro + TypeScript + Tailwind CSS
  ✔ Dependencies:    astro, @astrojs/react, tailwindcss, react (+4 more)
  ✔ Scripts:         dev, build, preview, lint
  ✔ README:          not found
  ✔ Package manager: npm

  ────────────────────────────────────────────────

? What do you want to do?
❯   Generate README
    Exit

? Project description (optional, press Enter to skip):
  › A high-performance personal portfolio built with Astro

? Which sections should be included?
  ◉ Features
  ◉ Installation
  ◉ Usage
  ○ Configuration
  ○ API Reference
  ◉ Contributing
  ◉ License
  ○ Badges

? Choose the README tone:
❯   Professional
    Friendly
    Minimal

? Any extra context for the AI? (optional, press Enter to skip):
  › Supports dark mode and is deployed on Cloudflare Pages

  ────────────────────────────────────────────────

⠋ Preparing AI request...
⠋ Generating README... 1842 chars

✔ README generated (3201 chars via OpenRouter)

  ✔ README.md created successfully
    → /home/user/my-astro-portfolio/README.md

  ────────────────────────────────────────────────

  Preview:

  # my-astro-portfolio

  A high-performance personal portfolio built with Astro and Tailwind CSS.
  Fast by default, with zero JavaScript shipped to the browser unless needed.

  ## Features
  ...

  ────────────────────────────────────────────────
```

---

## Scenario: Existing README — improve it

```
$ npx readmefy

  Readmefy v1.0.0
  AI-powered README generator

✔ Analysis complete

  ✔ Detected:        Next.js + TypeScript + Tailwind CSS
  ✔ Dependencies:    next, react, react-dom, @prisma/client, tailwindcss
  ✔ Scripts:         dev, build, start, lint, test
  ✔ README:          found
  ✔ Package manager: npm
  ✔ CI/CD:           detected

  ────────────────────────────────────────────────

? What do you want to do?
❯   Improve existing README
    Regenerate completely
    Exit

[... section selection and tone selection ...]

✔ README generated (4102 chars via Readmefy API)

  ✔ README.md created successfully
```

---

## Scenario: Analyze only

```
$ npx readmefy analyze

  Readmefy v1.0.0
  AI-powered README generator

✔ Analysis complete

  ✔ Detected:        Express + TypeScript
  ✔ Dependencies:    express, cors, helmet, dotenv, prisma
  ✔ Scripts:         dev, build, start, test
  ✔ README:          not found
  ✔ Package manager: npm
  ✔ Docker:          detected

  Analysis complete. No files were modified.
```

---

## Scenario: Using flags

```bash
# Generate a README immediately
npx readmefy init

# Improve existing README
npx readmefy rewrite

# Analyze without generating
npx readmefy analyze

# Specify a different directory
npx readmefy analyze --cwd /path/to/project
```
