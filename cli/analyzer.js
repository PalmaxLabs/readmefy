/**
 * analyzer.js
 * Reads the current project directory and extracts all relevant metadata:
 * - package.json fields (name, description, scripts, dependencies)
 * - Detected framework / stack
 * - Whether README.md already exists
 * - File structure hints (presence of src/, app/, pages/, etc.)
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

// ─── Framework detection map ─────────────────────────────────────────────────
// Maps a dependency name → human-readable label
const FRAMEWORK_MAP = {
  // Frontend frameworks
  next: 'Next.js',
  'next-auth': 'Next.js',
  nuxt: 'Nuxt',
  astro: 'Astro',
  '@astrojs/react': 'Astro + React',
  '@astrojs/vue': 'Astro + Vue',
  '@astrojs/svelte': 'Astro + Svelte',
  vite: 'Vite',
  react: 'React',
  'react-dom': 'React',
  vue: 'Vue',
  svelte: 'Svelte',
  '@sveltejs/kit': 'SvelteKit',
  solid: 'SolidJS',
  'solid-js': 'SolidJS',
  angular: 'Angular',
  '@angular/core': 'Angular',
  ember: 'Ember',
  'ember-source': 'Ember',
  preact: 'Preact',
  qwik: 'Qwik',
  '@builder.io/qwik': 'Qwik',
  remix: 'Remix',
  '@remix-run/react': 'Remix',
  // Backend frameworks
  express: 'Express',
  fastify: 'Fastify',
  koa: 'Koa',
  hono: 'Hono',
  nestjs: 'NestJS',
  '@nestjs/core': 'NestJS',
  'next/server': 'Next.js',
  elysia: 'Elysia (Bun)',
  // Meta / tooling
  gatsby: 'Gatsby',
  '@11ty/eleventy': 'Eleventy',
  docusaurus: 'Docusaurus',
  '@docusaurus/core': 'Docusaurus',
  storybook: 'Storybook',
  '@storybook/react': 'Storybook',
  // CSS / styling
  tailwindcss: 'Tailwind CSS',
  'styled-components': 'Styled Components',
  '@emotion/react': 'Emotion',
  '@mui/material': 'Material UI',
  'bootstrap': 'Bootstrap',
  bulma: 'Bulma',
  // Testing
  jest: 'Jest',
  vitest: 'Vitest',
  '@testing-library/react': 'Testing Library',
  cypress: 'Cypress',
  playwright: '@playwright/test',
  // Database / ORM
  prisma: 'Prisma',
  '@prisma/client': 'Prisma',
  drizzle: 'Drizzle ORM',
  typeorm: 'TypeORM',
  mongoose: 'Mongoose',
  sequelize: 'Sequelize',
  // Language runtimes
  typescript: 'TypeScript',
  'ts-node': 'TypeScript',
  '@types/node': 'TypeScript',
};

// ─── Language / runtime detection helpers ────────────────────────────────────

/** Infer runtime from project files and deps */
function detectRuntime(projectPath, allDeps) {
  if (allDeps['bun'] || existsSync(join(projectPath, 'bun.lockb'))) return 'Bun';
  if (allDeps['deno'] || existsSync(join(projectPath, 'deno.json')) || existsSync(join(projectPath, 'deno.jsonc'))) return 'Deno';
  return 'Node.js';
}

/** Detect package manager from lock files */
function detectPackageManager(projectPath) {
  if (existsSync(join(projectPath, 'bun.lockb'))) return 'bun';
  if (existsSync(join(projectPath, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(projectPath, 'yarn.lock'))) return 'yarn';
  return 'npm';
}

/** Detect primary language: TypeScript vs JavaScript */
function detectLanguage(projectPath, allDeps) {
  if (allDeps['typescript'] || allDeps['ts-node'] || allDeps['@types/node']) return 'TypeScript';
  if (existsSync(join(projectPath, 'tsconfig.json'))) return 'TypeScript';
  return 'JavaScript';
}

/** Returns first N lines of a file, trimmed */
function readFirstLines(filePath, n = 20) {
  try {
    return readFileSync(filePath, 'utf8').split('\n').slice(0, n).join('\n');
  } catch {
    return '';
  }
}

/** Safely list top-level project files/dirs for context */
function listTopLevel(projectPath) {
  try {
    return readdirSync(projectPath).filter(f => !f.startsWith('.') && f !== 'node_modules');
  } catch {
    return [];
  }
}

/** Sniff README.md content if it exists */
function readExistingReadme(projectPath) {
  const readmePath = join(projectPath, 'README.md');
  if (!existsSync(readmePath)) return null;
  try {
    return readFileSync(readmePath, 'utf8');
  } catch {
    return null;
  }
}

// ─── Main analyzer ────────────────────────────────────────────────────────────

/**
 * Analyzes the project at the given path.
 * @param {string} projectPath - Absolute path to the project root
 * @returns {ProjectInfo} Structured project metadata
 */
export async function analyzeProject(projectPath = process.cwd()) {
  const result = {
    path: projectPath,
    name: null,
    description: null,
    version: null,
    author: null,
    license: null,
    scripts: {},
    dependencies: [],
    devDependencies: [],
    allDeps: {},
    detectedFrameworks: [],
    detectedStyling: [],
    detectedTesting: [],
    detectedDatabase: [],
    runtime: 'Node.js',
    packageManager: 'npm',
    language: 'JavaScript',
    hasReadme: false,
    existingReadme: null,
    hasPackageJson: false,
    topLevelFiles: [],
    hasSrc: false,
    hasTests: false,
    hasDocker: false,
    hasCi: false,
    isMonorepo: false,
  };

  // ── Top-level directory snapshot ──────────────────────────────────────────
  result.topLevelFiles = listTopLevel(projectPath);
  result.hasSrc = result.topLevelFiles.some(f => ['src', 'lib', 'app', 'pages', 'source'].includes(f));
  result.hasTests = result.topLevelFiles.some(f => ['test', 'tests', '__tests__', 'spec', 'e2e'].includes(f));
  result.hasDocker = existsSync(join(projectPath, 'Dockerfile')) || existsSync(join(projectPath, 'docker-compose.yml'));
  result.hasCi = existsSync(join(projectPath, '.github', 'workflows')) || existsSync(join(projectPath, '.circleci')) || existsSync(join(projectPath, '.travis.yml'));
  result.isMonorepo = existsSync(join(projectPath, 'packages')) || existsSync(join(projectPath, 'apps')) || existsSync(join(projectPath, 'lerna.json')) || existsSync(join(projectPath, 'pnpm-workspace.yaml'));

  // ── README ────────────────────────────────────────────────────────────────
  result.hasReadme = existsSync(join(projectPath, 'README.md'));
  result.existingReadme = readExistingReadme(projectPath);

  // ── package.json ──────────────────────────────────────────────────────────
  const pkgPath = join(projectPath, 'package.json');
  if (!existsSync(pkgPath)) {
    // No package.json – try to infer name from directory
    result.name = projectPath.split('/').filter(Boolean).pop() || 'my-project';
    result.hasPackageJson = false;
    return result;
  }

  result.hasPackageJson = true;

  let pkg = {};
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  } catch {
    result.name = projectPath.split('/').filter(Boolean).pop() || 'my-project';
    return result;
  }

  // Basic fields
  result.name = pkg.name || projectPath.split('/').filter(Boolean).pop() || 'my-project';
  result.description = pkg.description || null;
  result.version = pkg.version || null;
  result.author = typeof pkg.author === 'string' ? pkg.author : pkg.author?.name || null;
  result.license = pkg.license || null;
  result.scripts = pkg.scripts || {};

  // Merge deps
  const deps = Object.keys(pkg.dependencies || {});
  const devDeps = Object.keys(pkg.devDependencies || {});
  result.dependencies = deps;
  result.devDependencies = devDeps;
  result.allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
    ...pkg.peerDependencies,
  };

  // ── Runtime / language / package manager ──────────────────────────────────
  result.runtime = detectRuntime(projectPath, result.allDeps);
  result.packageManager = detectPackageManager(projectPath);
  result.language = detectLanguage(projectPath, result.allDeps);

  // ── Framework detection ───────────────────────────────────────────────────
  const frameworkSet = new Set();
  const stylingSet = new Set();
  const testingSet = new Set();
  const dbSet = new Set();

  const STYLING_DEPS = ['tailwindcss', 'styled-components', '@emotion/react', '@mui/material', 'bootstrap', 'bulma', 'sass', 'less', 'postcss', 'unocss', 'windicss'];
  const TESTING_DEPS = ['jest', 'vitest', '@testing-library/react', '@testing-library/vue', 'cypress', 'playwright', '@playwright/test', 'mocha', 'chai', 'supertest'];
  const DB_DEPS = ['prisma', '@prisma/client', 'drizzle-orm', 'typeorm', 'mongoose', 'sequelize', 'knex', '@supabase/supabase-js', 'firebase', 'pg', 'mysql2', 'better-sqlite3'];

  const allDepKeys = Object.keys(result.allDeps);

  for (const dep of allDepKeys) {
    const label = FRAMEWORK_MAP[dep];
    if (label) {
      if (STYLING_DEPS.includes(dep)) {
        stylingSet.add(label);
      } else if (TESTING_DEPS.includes(dep)) {
        testingSet.add(label);
      } else if (DB_DEPS.includes(dep)) {
        dbSet.add(label);
      } else if (label !== 'TypeScript') {
        frameworkSet.add(label);
      }
    }
    // Catch styling / testing / db deps not in FRAMEWORK_MAP
    if (STYLING_DEPS.includes(dep) && !stylingSet.has(dep)) {
      const niceName = dep.charAt(0).toUpperCase() + dep.slice(1);
      if (FRAMEWORK_MAP[dep]) stylingSet.add(FRAMEWORK_MAP[dep]);
    }
    if (TESTING_DEPS.includes(dep) && FRAMEWORK_MAP[dep]) {
      testingSet.add(FRAMEWORK_MAP[dep]);
    }
    if (DB_DEPS.includes(dep) && FRAMEWORK_MAP[dep]) {
      dbSet.add(FRAMEWORK_MAP[dep]);
    }
  }

  result.detectedFrameworks = [...frameworkSet];
  result.detectedStyling = [...stylingSet];
  result.detectedTesting = [...testingSet];
  result.detectedDatabase = [...dbSet];

  return result;
}

/**
 * Formats detection results into a short human-readable stack string.
 * e.g. "Next.js + TypeScript + Tailwind CSS"
 */
export function formatStack(info) {
  const parts = [];

  if (info.detectedFrameworks.length > 0) {
    // Prioritize: avoid duplicates like "React" when "Next.js" is present
    const primary = info.detectedFrameworks.filter(f => {
      if (f === 'React' && info.detectedFrameworks.some(x => ['Next.js', 'Remix', 'Gatsby'].includes(x))) return false;
      return true;
    });
    parts.push(...primary.slice(0, 3));
  }

  if (info.language === 'TypeScript') parts.push('TypeScript');

  if (info.detectedStyling.length > 0) {
    parts.push(...info.detectedStyling.slice(0, 2));
  }

  if (parts.length === 0) {
    parts.push(info.runtime);
  }

  return parts.join(' + ');
}

/**
 * Returns a neat summary array for CLI display
 */
export function buildDetectionSummary(info) {
  const lines = [];

  const stack = formatStack(info);
  if (stack) lines.push({ label: 'Detected', value: stack });

  const allDepsDisplay = [
    ...info.dependencies.slice(0, 6),
    ...(info.devDependencies.slice(0, 4)),
  ].slice(0, 8);
  if (allDepsDisplay.length > 0) {
    lines.push({ label: 'Dependencies', value: allDepsDisplay.join(', ') + (info.dependencies.length > 8 ? ` (+${info.dependencies.length - 8} more)` : '') });
  }

  if (Object.keys(info.scripts).length > 0) {
    const scriptNames = Object.keys(info.scripts).slice(0, 5).join(', ');
    lines.push({ label: 'Scripts', value: scriptNames });
  }

  lines.push({ label: 'README', value: info.hasReadme ? 'found' : 'not found' });
  lines.push({ label: 'Package manager', value: info.packageManager });

  if (info.hasDocker) lines.push({ label: 'Docker', value: 'detected' });
  if (info.hasCi) lines.push({ label: 'CI/CD', value: 'detected' });
  if (info.isMonorepo) lines.push({ label: 'Monorepo', value: 'detected' });

  return lines;
}
