#!/usr/bin/env node
/**
 * index.js — Readmefy CLI entry point
 *
 * Usage:
 *   npx readmefy              → interactive mode
 *   npx readmefy --init       → generate README immediately
 *   npx readmefy --rewrite    → improve existing README
 *   npx readmefy --analyze    → analyze project only (no generation)
 *   npx readmefy --help       → show help
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

import chalk from 'chalk';
import ora from 'ora';
import { Command } from 'commander';

// Load .env if present (support OPENROUTER_API_KEY in .env file)
try {
  const { config } = await import('dotenv');
  config();
} catch {
  // dotenv is optional
}

import { analyzeProject, buildDetectionSummary, formatStack } from './analyzer.js';
import {
  promptNoReadme,
  promptExistingReadme,
  promptSections,
  promptDescription,
  promptConfirmOverwrite,
  promptApiKey,
  promptExtraContext,
  promptTone,
} from './prompts.js';
import {
  generateReadme,
  ApiKeyMissingError,
  AuthError,
  RateLimitError,
} from './api.js';

// ─── CLI version ──────────────────────────────────────────────────────────────
const __dirname = fileURLToPath(new URL('.', import.meta.url));
let VERSION = '1.0.0';
try {
  const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
  VERSION = pkg.version;
} catch { /* ignore */ }

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Print a clean banner */
function printBanner() {
  console.log('');
  console.log(chalk.bold.cyan('  Readmefy') + chalk.gray(` v${VERSION}`));
  console.log(chalk.gray('  AI-powered README generator'));
  console.log('');
}

/** Separator line */
function separator() {
  console.log(chalk.gray('  ' + '─'.repeat(44)));
}

/** Print a success tick with label */
function tick(label, value) {
  if (value !== undefined && value !== null) {
    console.log(chalk.green('  ✔ ') + chalk.bold(label + ':') + '  ' + chalk.white(value));
  } else {
    console.log(chalk.green('  ✔ ') + chalk.white(label));
  }
}

/** Print an info line */
function info(label, value) {
  if (value !== undefined && value !== null) {
    console.log(chalk.blue('  ℹ ') + chalk.bold(label + ':') + '  ' + chalk.gray(value));
  } else {
    console.log(chalk.blue('  ℹ ') + chalk.gray(label));
  }
}

/** Print an error message and exit */
function fatal(message, hint = '') {
  console.error('');
  console.error(chalk.red('  ✖ Error: ') + chalk.white(message));
  if (hint) console.error(chalk.gray('    ' + hint));
  console.error('');
  process.exit(1);
}

/** Print a warning */
function warn(message) {
  console.warn(chalk.yellow('  ⚠ ') + chalk.white(message));
}

// ─── Core flow ────────────────────────────────────────────────────────────────

/**
 * Runs the full analysis + generation pipeline.
 *
 * @param {object} opts
 * @param {string} opts.projectPath - Absolute path to the project
 * @param {'generate'|'improve'|'regenerate'|'analyze'|null} opts.forcedMode - Pre-selected mode
 * @param {boolean} opts.skipPrompts - Skip interactive prompts (use defaults)
 */
async function run({ projectPath, forcedMode = null, skipPrompts = false }) {
  printBanner();

  // ── Step 1: Analyze ────────────────────────────────────────────────────────
  const spinner = ora({
    text: chalk.gray('Analyzing project...'),
    spinner: 'dots',
    color: 'cyan',
  }).start();

  let info;
  try {
    info = await analyzeProject(projectPath);
  } catch (err) {
    spinner.fail(chalk.red('Project analysis failed'));
    fatal(err.message);
  }

  spinner.succeed(chalk.gray('Analysis complete'));
  console.log('');

  // ── Step 2: Display summary ────────────────────────────────────────────────
  const summaryLines = buildDetectionSummary(info);
  for (const { label, value } of summaryLines) {
    tick(label, value);
  }

  // Bail early for --analyze flag
  if (forcedMode === 'analyze') {
    console.log('');
    console.log(chalk.cyan('  Analysis complete. No files were modified.'));
    console.log('');
    return;
  }

  console.log('');
  separator();
  console.log('');

  // ── Step 3: Choose action ─────────────────────────────────────────────────
  let mode = forcedMode; // may be null

  if (!mode) {
    let action;
    if (info.hasReadme) {
      action = await promptExistingReadme();
    } else {
      action = await promptNoReadme();
    }

    if (action === 'exit') {
      console.log('');
      console.log(chalk.gray('  Goodbye.'));
      console.log('');
      return;
    }
    mode = action; // 'generate' | 'improve' | 'regenerate'
  }

  // Confirm overwrite if README exists and mode forces rewrite
  if (info.hasReadme && mode === 'regenerate' && !skipPrompts) {
    const confirmed = await promptConfirmOverwrite();
    if (!confirmed) {
      console.log(chalk.gray('  Aborted.'));
      return;
    }
  }

  // ── Step 4: Gather context ────────────────────────────────────────────────
  console.log('');

  // Description
  const description = skipPrompts
    ? (info.description || '')
    : await promptDescription(info.description);

  if (description && description !== info.description) {
    info.description = description;
  }

  // Sections
  const sections = skipPrompts
    ? ['features', 'installation', 'usage', 'contributing', 'license']
    : await promptSections();

  console.log('');

  // Tone
  const tone = skipPrompts
    ? 'professional'
    : await promptTone();

  // Extra context (only ask if not --init direct mode)
  let extraContext = '';
  if (!skipPrompts) {
    extraContext = await promptExtraContext();
  }

  console.log('');
  separator();
  console.log('');

  // ── Step 5: Generate ──────────────────────────────────────────────────────

  // Step display
  const steps = [
    { text: chalk.gray('Preparing AI request...') },
    { text: chalk.gray('Generating README...') },
  ];

  const genSpinner = ora({
    text: steps[0].text,
    spinner: 'dots',
    color: 'cyan',
  }).start();

  // Slight artificial step transition for UX
  await new Promise(r => setTimeout(r, 600));
  genSpinner.text = steps[1].text;

  let generatedReadme = '';
  let source = '';

  try {
    // Stream chunks into a local buffer so spinner keeps spinning
    const chunks = [];

    const result = await generateReadme({
      info,
      sections,
      tone,
      mode: mode === 'generate' ? 'generate' : mode,
      extraContext,
      onChunk: (chunk) => {
        chunks.push(chunk);
        // Update spinner text to show generation is live
        const totalChars = chunks.reduce((n, c) => n + c.length, 0);
        genSpinner.text = chalk.gray(`Generating README... ${chalk.cyan(totalChars + ' chars')}`);
      },
    });

    generatedReadme = result.readme;
    source = result.source;

  } catch (err) {
    genSpinner.fail(chalk.red('Generation failed'));
    console.log('');

    if (err instanceof ApiKeyMissingError) {
      console.error(chalk.red('  ' + err.message));
      console.log('');
      console.log(chalk.gray('  You can set your key in a .env file:'));
      console.log(chalk.white('    OPENROUTER_API_KEY=sk-or-v1-...'));
      console.log('');
      console.log(chalk.gray('  Or export it in your shell:'));
      console.log(chalk.white('    export OPENROUTER_API_KEY=sk-or-v1-...'));
      console.log('');
      console.log(chalk.gray('  Get a free key at: ') + chalk.cyan('https://openrouter.ai'));
      console.log('');

      // Offer to enter key interactively
      let apiKey;
      try {
        apiKey = await promptApiKey();
      } catch {
        process.exit(1);
      }

      // Retry with provided key
      genSpinner.start(chalk.gray('Retrying with provided key...'));
      try {
        const result = await generateReadme({
          info, sections, tone,
          mode: mode === 'generate' ? 'generate' : mode,
          extraContext,
          apiKey,
        });
        generatedReadme = result.readme;
        source = result.source;
      } catch (retryErr) {
        genSpinner.fail(chalk.red('Generation failed'));
        fatal(retryErr.message);
      }
    } else if (err instanceof AuthError) {
      fatal('Invalid API key.', 'Check your OPENROUTER_API_KEY environment variable.');
    } else if (err instanceof RateLimitError) {
      fatal('Rate limit reached.', 'Wait a moment and try again.');
    } else {
      fatal(err.message, 'If this persists, check https://status.openrouter.ai');
    }
  }

  if (!generatedReadme || generatedReadme.trim().length < 10) {
    genSpinner.fail(chalk.red('AI returned an empty response'));
    fatal('Generation failed. Try again or check your API key.');
  }

  genSpinner.succeed(
    chalk.green('README generated') +
    chalk.gray(` (${generatedReadme.length} chars via ${source === 'backend' ? 'Readmefy API' : 'OpenRouter'})`)
  );

  // ── Step 6: Write file ────────────────────────────────────────────────────
  console.log('');

  const readmePath = join(projectPath, 'README.md');
  try {
    writeFileSync(readmePath, generatedReadme, 'utf8');
  } catch (writeErr) {
    fatal(`Could not write README.md: ${writeErr.message}`);
  }

  console.log(chalk.green('  ✔ ') + chalk.bold('README.md created successfully'));
  console.log(chalk.gray('    → ' + readmePath));
  console.log('');

  // ── Step 7: Preview first 8 lines ─────────────────────────────────────────
  const preview = generatedReadme.split('\n').slice(0, 8).join('\n');
  separator();
  console.log('');
  console.log(chalk.gray('  Preview:'));
  console.log('');
  console.log(
    preview.split('\n')
      .map(line => chalk.white('  ') + chalk.italic(line))
      .join('\n')
  );
  console.log('');
  separator();
  console.log('');
}

// ─── Handle legacy flag-style invocation (--init, --rewrite, --analyze) ──────
// Must be done BEFORE Commander parses argv
// Allows: `npx readmefy --init` in addition to `npx readmefy init`
{
  const rawArgs = process.argv.slice(2);
  if (rawArgs.includes('--init')) {
    process.argv.splice(process.argv.indexOf('--init'), 1, 'init');
  } else if (rawArgs.includes('--rewrite')) {
    process.argv.splice(process.argv.indexOf('--rewrite'), 1, 'rewrite');
  } else if (rawArgs.includes('--analyze')) {
    process.argv.splice(process.argv.indexOf('--analyze'), 1, 'analyze');
  }
}

// ─── Commander setup ──────────────────────────────────────────────────────────

const program = new Command();

program
  .name('readmefy')
  .description('AI-powered README generator for any project')
  .version(VERSION, '-v, --version', 'Output the current version')
  .helpOption('-h, --help', 'Display help for command');

/** Resolve --cwd from subcommand options, falling back to process.cwd() */
function resolveCwd(options) {
  return resolve(options.cwd || process.cwd());
}

// ── readmefy (no subcommand = interactive) ─────────────────────────────────
// When no subcommand is given, run in current directory interactively.
// --cwd is NOT supported on the root command to avoid shadowing subcommands.
program
  .action(async () => {
    const projectPath = resolve(process.cwd());
    await run({ projectPath, forcedMode: null });
  });

// ── readmefy init (alias: generate) ──────────────────────────────────────────
program
  .command('init')
  .alias('generate')
  .description('Generate a README for the current project')
  .option('--cwd <path>', 'Project directory to analyze')
  .action(async (options) => {
    const projectPath = resolveCwd(options);
    await run({ projectPath, forcedMode: 'generate' });
  });

// ── readmefy rewrite (improve existing) ──────────────────────────────────────
program
  .command('rewrite')
  .alias('improve')
  .description('Improve the existing README.md')
  .option('--cwd <path>', 'Project directory to analyze')
  .action(async (options) => {
    const projectPath = resolveCwd(options);
    const info = await analyzeProject(projectPath);
    if (!info.hasReadme) {
      warn('No README.md found. Switching to generate mode.');
      await run({ projectPath, forcedMode: 'generate' });
    } else {
      await run({ projectPath, forcedMode: 'improve' });
    }
  });

// ── readmefy analyze ──────────────────────────────────────────────────────────
program
  .command('analyze')
  .description('Analyze the project without generating anything')
  .option('--cwd <path>', 'Project directory to analyze')
  .action(async (options) => {
    const projectPath = resolveCwd(options);
    await run({ projectPath, forcedMode: 'analyze' });
  });

// ─── Global error handler ─────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  if (err.name === 'ExitPromptError' || err.message?.includes('User force closed')) {
    // User pressed Ctrl+C — exit gracefully
    console.log('');
    console.log(chalk.gray('  Aborted.'));
    console.log('');
    process.exit(0);
  }
  console.error(chalk.red('\n  Unexpected error: ') + err.message);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('');
  console.log(chalk.gray('  Interrupted.'));
  process.exit(0);
});

// ─── Run ──────────────────────────────────────────────────────────────────────
program.parseAsync(process.argv).catch((err) => {
  if (err.name === 'ExitPromptError' || err.message?.includes('User force closed')) {
    console.log(chalk.gray('\n  Aborted.'));
    process.exit(0);
  }
  console.error(chalk.red('\n  Fatal: ') + err.message);
  process.exit(1);
});
