# Readmefy

AI-powered CLI tool that automatically analyzes your project and generates a professional, high-quality `README.md` in seconds.

```bash
npx readmefy
```

---

## How it works

1. Runs `npx readmefy` in any project directory
2. Automatically detects your stack, dependencies, scripts, and existing README
3. Asks a few quick questions (sections, tone, extra context)
4. Sends project metadata to the AI via OpenRouter
5. Writes a clean, formatted `README.md` to your project root

---

## Features

- Zero configuration — works in any Node.js project out of the box
- Detects 40+ frameworks: Next.js, Astro, Remix, SvelteKit, NestJS, Hono, and more
- Detects styling, testing, database, and CI/CD tooling
- Three generation modes: **generate**, **improve**, **regenerate**
- Customizable sections (Installation, Usage, Features, Contributing, License, Badges, FAQ, and more)
- Choose the tone: Professional, Friendly, or Minimal
- Streams AI output in real-time so the terminal never goes blank
- Fallback from primary model to secondary model on failure
- Works with or without an OpenRouter API key (Readmefy backend proxy)
- Handles Ctrl+C gracefully, never leaves broken state

---

## Requirements

- Node.js >= 18.0.0
- npm, pnpm, or yarn

An [OpenRouter API key](https://openrouter.ai) is optional but recommended for unrestricted usage.

---

## Installation

### Run directly (no install needed)

```bash
npx readmefy
```

### Install globally

```bash
npm install -g readmefy
readmefy
```

### Install as a dev dependency

```bash
npm install --save-dev readmefy
npx readmefy
```

---

## Usage

### Interactive mode (recommended)

```bash
npx readmefy
```

Guides you through analysis, section selection, tone choice, and generation.

### Commands

| Command                    | Description                                      |
|----------------------------|--------------------------------------------------|
| `npx readmefy`             | Interactive mode (detects and prompts)           |
| `npx readmefy init`        | Generate a new README                           |
| `npx readmefy rewrite`     | Improve the existing README                     |
| `npx readmefy analyze`     | Analyze project only, no generation             |
| `npx readmefy --version`   | Print the current version                       |
| `npx readmefy --help`      | Show help                                       |

### Options

| Option            | Description                        | Default         |
|-------------------|------------------------------------|-----------------|
| `--cwd <path>`    | Path to the project to analyze     | `process.cwd()` |
| `-v, --version`   | Print version                      | —               |
| `-h, --help`      | Show help                          | —               |

### Flag aliases (legacy style)

These also work for compatibility:

```bash
npx readmefy --init
npx readmefy --rewrite
npx readmefy --analyze
```

---

## API Key Setup

Readmefy uses the **OpenRouter API** to generate README content.

### Option 1 — Environment variable

```bash
export OPENROUTER_API_KEY=sk-or-v1-...
npx readmefy
```

### Option 2 — `.env` file

Create a `.env` file in your project root:

```env
OPENROUTER_API_KEY=sk-or-v1-...
```

Readmefy will pick it up automatically.

### Option 3 — Enter it interactively

If no key is found, Readmefy will prompt you to enter it in the terminal.

### Getting a key

1. Go to [https://openrouter.ai](https://openrouter.ai)
2. Sign in and navigate to **API Keys**
3. Create a new key (free tier available)

---

## Models used

| Role     | Model                              |
|----------|------------------------------------|
| Primary  | `mistralai/mistral-7b-instruct`    |
| Fallback | `openchat/openchat-7b`             |

If the primary model fails (rate limit, overload), the fallback is tried automatically.

---

## Project Structure

```
readmefy/
├── cli/
│   ├── index.js       # CLI entry point, Commander setup, main flow
│   ├── analyzer.js    # Project analysis: package.json, stack detection
│   ├── prompts.js     # All interactive Inquirer prompts
│   └── api.js         # OpenRouter integration, prompt builder, stream reader
├── examples/
│   ├── cli-interaction.md          # Example terminal sessions
│   └── generated-readme-astro.md  # Example generated README
├── .env.example       # Environment variable template
├── .gitignore
├── package.json
└── README.md
```

---

## Example terminal session

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

? Which sections should be included?
  ◉ Features  ◉ Installation  ◉ Usage  ◉ Contributing  ◉ License

? Choose the README tone:
❯   Professional

? Any extra context for the AI? (optional, press Enter to skip):
  › Deployed on Cloudflare Pages

⠋ Generating README... 1842 chars

✔ README generated (3201 chars via OpenRouter)
  ✔ README.md created successfully
    → /home/user/my-astro-portfolio/README.md
```

See [`examples/cli-interaction.md`](./examples/cli-interaction.md) for more scenarios.

---

## Framework detection

Readmefy detects 40+ technologies automatically:

| Category   | Detected technologies                                                      |
|------------|----------------------------------------------------------------------------|
| Frontend   | React, Next.js, Astro, Remix, SvelteKit, Vue, Nuxt, Qwik, Solid, Gatsby  |
| Backend    | Express, Fastify, Hono, NestJS, Koa, Elysia                               |
| Styling    | Tailwind CSS, Styled Components, Emotion, Material UI, Bootstrap           |
| Database   | Prisma, Drizzle, TypeORM, Mongoose, Supabase                               |
| Testing    | Jest, Vitest, Cypress, Playwright, Testing Library                         |
| Runtimes   | Node.js, Bun, Deno (auto-detected)                                         |
| Language   | TypeScript / JavaScript (auto-detected from tsconfig.json or deps)        |

---

## Contributing

Contributions are welcome. To get started:

```bash
git clone https://github.com/yourusername/readmefy.git
cd readmefy
npm install
```

Test your changes:

```bash
node cli/index.js analyze --cwd /path/to/any/project
node cli/index.js --help
```

Please keep code modular and well-commented. Open an issue before implementing large features.

---

## License

MIT License. See [LICENSE](./LICENSE) for details.

---

## Acknowledgements

Inspired by [autoskills](https://github.com/midudev/autoskills) by [@midudev](https://github.com/midudev).
Powered by [OpenRouter](https://openrouter.ai) and [Mistral AI](https://mistral.ai).
