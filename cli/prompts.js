/**
 * prompts.js
 * All interactive CLI prompts for Readmefy.
 * Uses @inquirer/prompts for a clean, accessible terminal UX.
 */

import { select, checkbox, input, confirm } from '@inquirer/prompts';
import chalk from 'chalk';

// ─── Available README sections ────────────────────────────────────────────────

export const AVAILABLE_SECTIONS = [
  {
    value: 'features',
    name: 'Features',
    description: 'List of main features and capabilities',
    checked: true,
  },
  {
    value: 'installation',
    name: 'Installation',
    description: 'Step-by-step installation instructions',
    checked: true,
  },
  {
    value: 'usage',
    name: 'Usage',
    description: 'How to use the project with code examples',
    checked: true,
  },
  {
    value: 'configuration',
    name: 'Configuration',
    description: 'Environment variables and configuration options',
    checked: false,
  },
  {
    value: 'api',
    name: 'API Reference',
    description: 'API endpoints or public interface documentation',
    checked: false,
  },
  {
    value: 'contributing',
    name: 'Contributing',
    description: 'Guide for contributors',
    checked: true,
  },
  {
    value: 'license',
    name: 'License',
    description: 'License information',
    checked: true,
  },
  {
    value: 'badges',
    name: 'Badges',
    description: 'npm version, license, build status badges',
    checked: false,
  },
  {
    value: 'roadmap',
    name: 'Roadmap',
    description: 'Planned features and future work',
    checked: false,
  },
  {
    value: 'faq',
    name: 'FAQ',
    description: 'Frequently asked questions',
    checked: false,
  },
  {
    value: 'acknowledgements',
    name: 'Acknowledgements',
    description: 'Credits and thanks',
    checked: false,
  },
];

// ─── Prompt: what to do when NO readme exists ─────────────────────────────────

/**
 * Asks the user what action to take when no README.md is found.
 * @returns {'generate' | 'exit'}
 */
export async function promptNoReadme() {
  const answer = await select({
    message: chalk.bold('What do you want to do?'),
    choices: [
      {
        name: '  Generate README',
        value: 'generate',
        description: 'Create a brand new README.md for this project',
      },
      {
        name: '  Exit',
        value: 'exit',
        description: 'Exit without making changes',
      },
    ],
  });
  return answer;
}

// ─── Prompt: what to do when README exists ────────────────────────────────────

/**
 * Asks the user what action to take when a README.md already exists.
 * @returns {'improve' | 'regenerate' | 'exit'}
 */
export async function promptExistingReadme() {
  const answer = await select({
    message: chalk.bold('What do you want to do?'),
    choices: [
      {
        name: '  Improve existing README',
        value: 'improve',
        description: 'Enhance and expand the current README while preserving its structure',
      },
      {
        name: '  Regenerate completely',
        value: 'regenerate',
        description: 'Discard the current README and generate a fresh one',
      },
      {
        name: '  Exit',
        value: 'exit',
        description: 'Exit without making changes',
      },
    ],
  });
  return answer;
}

// ─── Prompt: section selection ────────────────────────────────────────────────

/**
 * Lets the user pick which sections to include in the README.
 * @returns {string[]} Array of section keys
 */
export async function promptSections() {
  const selected = await checkbox({
    message: chalk.bold('Which sections should be included?'),
    choices: AVAILABLE_SECTIONS.map(s => ({
      name: `${s.name}`,
      value: s.value,
      checked: s.checked,
      description: chalk.gray(s.description),
    })),
    instructions: chalk.gray('  Use space to toggle, enter to confirm'),
    pageSize: 12,
  });

  if (selected.length === 0) {
    // Fallback to defaults if user selects nothing
    return AVAILABLE_SECTIONS.filter(s => s.checked).map(s => s.value);
  }

  return selected;
}

// ─── Prompt: optional project description override ────────────────────────────

/**
 * Asks the user for a brief project description if none was detected.
 * @param {string|null} detected - Already detected description
 * @returns {string}
 */
export async function promptDescription(detected = null) {
  const message = detected
    ? `Project description ${chalk.gray(`(detected: "${detected.slice(0, 60)}${detected.length > 60 ? '...' : ''}")`)} — press Enter to keep:`
    : 'Brief project description (optional, press Enter to skip):';

  const answer = await input({
    message: chalk.bold(message),
    default: detected || '',
  });

  return answer.trim() || detected || '';
}

// ─── Prompt: confirm overwrite ────────────────────────────────────────────────

/**
 * Confirms before overwriting existing README.
 * @returns {boolean}
 */
export async function promptConfirmOverwrite() {
  return confirm({
    message: chalk.yellow('This will overwrite your existing README.md. Continue?'),
    default: false,
  });
}

// ─── Prompt: API key ─────────────────────────────────────────────────────────

/**
 * Asks for the OpenRouter API key if not in environment.
 * @returns {string}
 */
export async function promptApiKey() {
  const key = await input({
    message: chalk.bold('Enter your OpenRouter API key:'),
    validate: (v) => {
      if (!v || v.trim().length < 10) return 'Please enter a valid API key';
      return true;
    },
  });
  return key.trim();
}

// ─── Prompt: extra context ────────────────────────────────────────────────────

/**
 * Optional: ask for any extra context the user wants to give the AI.
 * @returns {string}
 */
export async function promptExtraContext() {
  const answer = await input({
    message: chalk.bold('Any extra context for the AI? (optional, press Enter to skip):'),
  });
  return answer.trim();
}

// ─── Prompt: tone ─────────────────────────────────────────────────────────────

/**
 * Lets the user choose the tone/style of the README.
 * @returns {'professional' | 'friendly' | 'minimal'}
 */
export async function promptTone() {
  return select({
    message: chalk.bold('Choose the README tone:'),
    choices: [
      {
        name: '  Professional',
        value: 'professional',
        description: 'Formal, structured, corporate-friendly',
      },
      {
        name: '  Friendly',
        value: 'friendly',
        description: 'Approachable, open-source community vibe',
      },
      {
        name: '  Minimal',
        value: 'minimal',
        description: 'Ultra-clean, just the essentials',
      },
    ],
  });
}
