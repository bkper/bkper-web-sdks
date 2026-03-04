// @ts-check
// ---------------------------------------------------------------------------
// Generate token reference tables from bkper.css and embed them in README.md.
//
// Reads src/bkper.css, parses CSS custom properties grouped by section
// headers and selector blocks, and replaces the content between
// <!-- TOKENS:START --> and <!-- TOKENS:END --> markers in README.md with
// generated markdown tables.
//
// Run: bun scripts/generate-readme.mjs
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, '..');
const CSS_PATH = path.join(PKG_ROOT, 'src/bkper.css');
const README_PATH = path.join(PKG_ROOT, 'README.md');

const MARKER_START = '<!-- TOKENS:START -->';
const MARKER_END = '<!-- TOKENS:END -->';

// ---------------------------------------------------------------------------
// CSS parser
// ---------------------------------------------------------------------------

/**
 * @typedef {object} Token
 * @property {string}  name          - CSS custom property name
 * @property {string}  rawValue      - Full value as written in CSS
 * @property {string}  [waFallback]  - Web Awesome token referenced
 * @property {string}  defaultValue  - Hardcoded fallback value
 * @property {boolean} deprecated    - Whether the token is in a DEPRECATED block
 */

/**
 * @typedef {object} TokenSection
 * @property {string}  heading
 * @property {Token[]} tokens
 */

/**
 * @typedef {object} ParsedBlock
 * @property {'shared' | 'light' | 'dark'} selector
 * @property {TokenSection[]} sections
 */

/**
 * Parse a single CSS declaration into a Token.
 * @param {string}  line
 * @param {boolean} deprecated
 * @returns {Token | null}
 */
function parseDeclaration(line, deprecated) {
    const m = line.match(/^\s*(--bkper-[\w-]+)\s*:\s*(.+?)\s*;?\s*$/);
    if (!m) return null;

    const name = m[1];
    const rawValue = m[2].replace(/;$/, '').trim();

    const waMatch = rawValue.match(/var\(\s*(--wa-[\w-]+)\s*,\s*(.+)\s*\)/);
    const bkperRef = rawValue.match(/var\(\s*(--bkper-[\w-]+)\s*\)/);

    /** @type {string | undefined} */
    let waFallback;
    let defaultValue = rawValue;

    if (waMatch) {
        waFallback = waMatch[1];
        defaultValue = waMatch[2].trim();
    } else if (bkperRef) {
        defaultValue = rawValue;
    }

    return { name, rawValue, waFallback, defaultValue, deprecated };
}

/**
 * Parse content between { and } into sections.
 * @param {string} blockContent
 * @returns {TokenSection[]}
 */
function parseBlock(blockContent) {
    /** @type {TokenSection[]} */
    const sections = [];
    let currentHeading = 'General';
    let deprecated = false;
    /** @type {Token[]} */
    let currentTokens = [];

    for (const line of blockContent.split('\n')) {
        const headerMatch = line.match(/^\s*\/\*\s*(.+?)\s*\*\/\s*$/);
        if (headerMatch) {
            const heading = headerMatch[1].trim();
            if (currentTokens.length > 0) {
                sections.push({ heading: currentHeading, tokens: currentTokens });
                currentTokens = [];
            }
            if (heading === 'DEPRECATED') {
                deprecated = true;
                currentHeading = 'Deprecated';
            } else {
                deprecated = false;
                currentHeading = heading;
            }
            continue;
        }

        const token = parseDeclaration(line, deprecated);
        if (token) {
            currentTokens.push(token);
        }
    }

    if (currentTokens.length > 0) {
        sections.push({ heading: currentHeading, tokens: currentTokens });
    }

    return sections;
}

/**
 * Parse the full CSS file into three selector blocks.
 * @param {string} css
 * @returns {ParsedBlock[]}
 */
function parseCss(css) {
    /** @type {ParsedBlock[]} */
    const blocks = [];
    const blockRegex = /([\s\S]*?)\{([\s\S]*?)\}/g;
    let m;
    while ((m = blockRegex.exec(css)) !== null) {
        const selectorRaw = m[1].trim();
        const content = m[2];

        /** @type {'shared' | 'light' | 'dark'} */
        let selector = 'shared';
        if (/^:host,\s*\.wa-dark$/m.test(selectorRaw)) {
            selector = 'dark';
        } else if (/\.wa-light/.test(selectorRaw) && !/\.wa-dark/.test(selectorRaw)) {
            selector = 'light';
        }

        blocks.push({ selector, sections: parseBlock(content) });
    }

    return blocks;
}

// ---------------------------------------------------------------------------
// Markdown generator
// ---------------------------------------------------------------------------

const colorSemantics = /** @type {Record<string, string>} */ ({
    blue: 'Assets',
    yellow: 'Liabilities',
    green: 'Incoming',
    red: 'Outgoing',
    grey: 'Neutral',
});

/**
 * Format a value for a markdown table cell.
 * @param {string} value
 * @returns {string}
 */
function fmtValue(value) {
    if (!value) return '—';
    return `\`${value}\``;
}

/**
 * Check whether a token is an account-type color.
 * @param {string} name
 * @returns {{ color: string; level: string } | null}
 */
function parseAccountColor(name) {
    const m = name.match(/^--bkper-color-(blue|yellow|green|red|grey)-(low|medium|high)$/);
    if (!m) return null;
    return { color: m[1], level: m[2] };
}

/**
 * Generate markdown tables from parsed CSS blocks.
 * @param {ParsedBlock[]} blocks
 * @returns {string}
 */
function generateTables(blocks) {
    const shared = blocks.find(b => b.selector === 'shared');
    const light = blocks.find(b => b.selector === 'light');
    const dark = blocks.find(b => b.selector === 'dark');

    /** @type {string[]} */
    const lines = [];

    // --- Shared tokens (Typography, Border, Spacing, non-theme Colors) ---
    if (shared) {
        for (const section of shared.sections) {
            if (section.heading === 'Deprecated') continue;

            lines.push(`### ${section.heading}`);
            lines.push('');

            const regular = section.tokens.filter(t => !parseAccountColor(t.name));
            const accountColors = section.tokens.filter(t => parseAccountColor(t.name));

            if (regular.length > 0) {
                lines.push('| Token | Default | Web Awesome Fallback |');
                lines.push('| :--- | :--- | :--- |');
                for (const token of regular) {
                    lines.push(
                        `| \`${token.name}\` | ${fmtValue(token.defaultValue)} | ${token.waFallback ? fmtValue(token.waFallback) : '—'} |`
                    );
                }
                lines.push('');
            }

            if (accountColors.length > 0) {
                lines.push('#### Account Type Colors');
                lines.push('');
                lines.push(
                    'Five color families map to Bkper account types, each at three intensity levels.'
                );
                lines.push('');
                lines.push('| Token | Default |');
                lines.push('| :--- | :--- |');
                for (const token of accountColors) {
                    lines.push(`| \`${token.name}\` | ${fmtValue(token.defaultValue)} |`);
                }
                lines.push('');
            }
        }
    }

    // --- Theme-dependent tokens (light/dark Color sections) ---
    if (light || dark) {
        lines.push('### Contextual Colors');
        lines.push('');
        lines.push('These tokens change between light and dark themes.');
        lines.push('');

        /** @type {Map<string, { light: Token | undefined; dark: Token | undefined }>} */
        const merged = new Map();

        for (const block of [light, dark]) {
            if (!block) continue;
            const selector = block.selector;
            for (const section of block.sections) {
                if (section.heading === 'Deprecated') continue;
                for (const token of section.tokens) {
                    const existing = merged.get(token.name) || {
                        light: undefined,
                        dark: undefined,
                    };
                    if (selector === 'light') existing.light = token;
                    else existing.dark = token;
                    merged.set(token.name, existing);
                }
            }
        }

        /** @type {Array<{ name: string; light: Token | undefined; dark: Token | undefined }>} */
        const semantic = [];
        /** @type {Array<{ name: string; light: Token | undefined; dark: Token | undefined }>} */
        const account = [];

        for (const [name, pair] of merged) {
            if (parseAccountColor(name)) {
                account.push({ name, ...pair });
            } else {
                semantic.push({ name, ...pair });
            }
        }

        if (semantic.length > 0) {
            lines.push('| Token | Light | Dark | Web Awesome Fallback |');
            lines.push('| :--- | :--- | :--- | :--- |');
            for (const entry of semantic) {
                const lightVal = entry.light?.defaultValue ?? '—';
                const darkVal = entry.dark?.defaultValue ?? '—';
                const waFallback = entry.light?.waFallback || entry.dark?.waFallback;
                lines.push(
                    `| \`${entry.name}\` | ${fmtValue(lightVal)} | ${fmtValue(darkVal)} | ${waFallback ? fmtValue(waFallback) : '—'} |`
                );
            }
            lines.push('');
        }

        if (account.length > 0) {
            lines.push('#### Account Type Colors');
            lines.push('');
            lines.push(
                'Five color families map to Bkper account types, each at three intensity levels. Values change between themes for optimal contrast.'
            );
            lines.push('');

            /** @type {Record<string, Record<string, { light: string; dark: string }>>} */
            const families = {};
            for (const entry of account) {
                const parsed = parseAccountColor(entry.name);
                if (!parsed) continue;
                if (!families[parsed.color]) families[parsed.color] = {};
                families[parsed.color][parsed.level] = {
                    light: entry.light?.rawValue ?? '—',
                    dark: entry.dark?.rawValue ?? '—',
                };
            }

            for (const [color, levels] of Object.entries(families)) {
                const sem = colorSemantics[color] || '';
                lines.push(
                    `**${color.charAt(0).toUpperCase() + color.slice(1)}${sem ? ` — ${sem}` : ''}**`
                );
                lines.push('');
                lines.push('| Level | Token | Light | Dark |');
                lines.push('| :--- | :--- | :--- | :--- |');
                for (const level of ['low', 'medium', 'high']) {
                    const vals = levels[level];
                    if (!vals) continue;
                    lines.push(
                        `| ${level} | \`--bkper-color-${color}-${level}\` | ${fmtValue(vals.light)} | ${fmtValue(vals.dark)} |`
                    );
                }
                lines.push('');
            }
        }
    }

    // --- Deprecated tokens ---
    const deprecatedTokens = [];
    for (const block of blocks) {
        for (const section of block.sections) {
            if (section.heading === 'Deprecated') {
                deprecatedTokens.push(...section.tokens);
            }
        }
    }

    const seen = new Set();
    const uniqueDeprecated = deprecatedTokens.filter(t => {
        if (seen.has(t.name)) return false;
        seen.add(t.name);
        return true;
    });

    if (uniqueDeprecated.length > 0) {
        lines.push('### Deprecated Tokens');
        lines.push('');
        lines.push(
            'These aliases are kept for backward compatibility. Use the replacement token instead.'
        );
        lines.push('');
        lines.push('| Deprecated Token | Replacement |');
        lines.push('| :--- | :--- |');
        for (const token of uniqueDeprecated) {
            const ref = token.rawValue.match(/var\(\s*(--bkper-[\w-]+)\s*\)/);
            const replacement = ref ? `\`${ref[1]}\`` : fmtValue(token.rawValue);
            lines.push(`| \`${token.name}\` | ${replacement} |`);
        }
        lines.push('');
    }

    return lines.join('\n');
}

// ---------------------------------------------------------------------------
// README update
// ---------------------------------------------------------------------------

const css = fs.readFileSync(CSS_PATH, 'utf-8');
const blocks = parseCss(css);
const tables = generateTables(blocks);

const readme = fs.readFileSync(README_PATH, 'utf-8');

const startIdx = readme.indexOf(MARKER_START);
const endIdx = readme.indexOf(MARKER_END);

if (startIdx === -1 || endIdx === -1) {
    console.error(
        `ERROR: README.md is missing ${MARKER_START} and/or ${MARKER_END} markers.`
    );
    process.exit(1);
}

const before = readme.slice(0, startIdx + MARKER_START.length);
const after = readme.slice(endIdx);

const updated = before + '\n\n' + tables + '\n' + after;

fs.writeFileSync(README_PATH, updated);
console.log('[generate-readme] token tables updated in README.md');
