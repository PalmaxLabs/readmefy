# Readmefy

AI-powered CLI tool that automatically analyzes your project and generates a professional, high-quality `README.md` file in seconds.

## Features

*   Zero configuration: works in any Node.js project out of the box.
*   Detects 40+ frameworks: Next.js, Astro, Remix, SvelteKit, NestJS, Hono, and more.
*   Detects styling, testing, database, and CI/CD tooling.
*   Three generation modes: **generate**, **improve**, and **regenerate**.
*   Customizable sections (Installation, Usage, Features, Contributing, License, Badges, FAQ, and more).
*   Choose the tone: Professional, Friendly, or Minimal.
*   Streams AI output in real-time.
*   Fallback from primary model to secondary model on failure.
*   Works with or without an OpenRouter API key (Readmefy backend proxy).
*   Handles `Ctrl+C` gracefully.

## How It Works

1.  Run `npx readmefy` in any project directory.
2.  Automatically detect your stack, dependencies, scripts, and existing README.
3.  Answer a few quick questions regarding sections, tone, and extra context.
4.  Send project metadata to the AI via OpenRouter.
5.  Write a clean, formatted `README.md` to your project root.

## Requirements

*   Node.js >= 18.0.0
*   npm, pnpm, or yarn

An [OpenRouter API key](https://openrouter.ai) is optional but recommended for unrestricted usage.

## Installation

You can install and run `readmefy` in several ways:

### Run Directly (No Installation Needed)

```bash
npx readmefy
```

This command executes `readmefy` directly using `npx` without requiring a global installation. This is the quickest way to get started.

### Install Globally

```bash
npm install -g readmefy
readmefy
```

This installs `readmefy` globally, making it available as a command in your terminal.

### Install as a Dev Dependency

```bash
npm install --save-dev readmefy
npx readmefy
```

This installs `readmefy` as a development dependency in your project. Use `npx` to execute the locally installed version. This is useful for ensuring that everyone working on the project uses the same version of `readmefy`.

## Usage

### Interactive Mode (Recommended)

```bash
npx readmefy
```

This starts `readmefy` in interactive mode, guiding you through project analysis, section selection, tone choice, and README generation. This mode is recommended for most users, as it provides a guided experience.

### Command-Line Options

While `readmefy` is primarily designed for interactive use, future versions may support command-line options for advanced use cases. Refer to the help documentation (`readmefy --help`) for available options.

## Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes and commit them with clear, concise messages.
4.  Submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
