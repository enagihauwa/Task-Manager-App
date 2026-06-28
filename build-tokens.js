/**
 * build-tokens.js
 * ===============
 *
 * Reads design-tokens.tokens.json and generates design-tokens.css — a file of
 * CSS custom properties (design tokens) ready for use in the browser.
 *
 * ── Colour Architecture ──────────────────────────────────────────────────
 *
 *   Primitives  (primitive colours)
 *     The raw colour palettes (tonal steps 0–100 for each hue family).
 *     These are the **source of truth** but must NEVER be referenced directly
 *     in UI components. They exist only so that role tokens can point to them.
 *
 *   Roles  (colour roles)
 *     Semantic aliases (──primary──, ──surface──, ──error──, ──outline──, …)
 *     that resolve to a primitive value. **These are what your components
 *     should use.** If the design system needs to shift a hue, only the role
 *     mapping changes; component code stays untouched.
 *
 * ── Usage ────────────────────────────────────────────────────────────────
 *
 *   node build-tokens.js
 *
 *   Output:  design-tokens.css  (auto-generated, do not edit by hand)
 *
 * ── Reference syntax ─────────────────────────────────────────────────────
 *
 *   Colour role values in the JSON use Figma‑style references:
 *     {primitive colours.key colours group.primary key colour}
 *
 *   The script resolves these by walking the flattened primitive colour map.
 */

"use strict";

// ---------------------------------------------------------------------------
//  Dependencies
// ---------------------------------------------------------------------------

const fs = require("node:fs");
const path = require("node:path");

// ---------------------------------------------------------------------------
//  Configuration
// ---------------------------------------------------------------------------

const INPUT_FILE = "design-tokens.tokens.json";
const OUTPUT_FILE = "design-tokens.css";

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

/**
 * Slugify a token name into a CSS‑friendly identifier.
 *
 * "extra small spacing"      → "xs"
 * "primary colour palette"   → "primary"
 * "surface container lowest" → "surface-container-lowest"
 *
 * Special‑case known spacing names so the output is semantic.
 */
const SPACING_ALIASES = {
  "no spacing": "none",
  "extra small spacing": "xs",
  "small spacing": "sm",
  "medium spacing": "md",
  "base spacing": "base",
  "large spacing": "lg",
  "extra large spacing": "xl",
  "very large spacing": "2xl",
};

function slugify(name) {
  if (SPACING_ALIASES[name]) return SPACING_ALIASES[name];
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Convert a hex colour to an RGBA tuple.
 * 8‑digit hex (#2563ebff) → rgba(r, g, b, a)
 */
function hexToRgba(hex) {
  hex = hex.replace("#", "");
  if (hex.length === 3)
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  if (hex.length === 8) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = (parseInt(hex.slice(6, 8), 16) / 255).toFixed(3);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 1)`;
}

/**
 * Compose a CSS box‑shadow value from a shadow-descriptor object.
 */
function formatShadow(shadow) {
  const { offsetX, offsetY, radius, spread, color } = shadow;
  return `${offsetX}px ${offsetY}px ${radius}px ${spread}px ${color}`;
}

// ---------------------------------------------------------------------------
//  Token file loader
// ---------------------------------------------------------------------------

function loadTokens(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

// ---------------------------------------------------------------------------
//  Primitive colour map builder
// ---------------------------------------------------------------------------

/**
 * Walk the `primitive colours` section and build a flat map of
 *   "dot.separated.path" → rgba-colour-string
 *
 * Only entries with type === "color" are included.
 */
function buildPrimitiveMap(primitiveSection) {
  const map = new Map();

  function walk(obj, prefix) {
    if (obj === null || typeof obj !== "object") return;

    if (obj.type === "color" && typeof obj.value === "string") {
      map.set(prefix, hexToRgba(obj.value));
      return;
    }

    for (const [key, val] of Object.entries(obj)) {
      if (["type", "value", "blendMode", "extensions"].includes(key)) continue;
      // Normalize whitespace so double spaces in keys match references
      const cleanKey = key.replace(/\s+/g, " ").trim();
      const nextPrefix = prefix ? `${prefix}.${cleanKey}` : cleanKey;
      walk(val, nextPrefix);
    }
  }

  walk(primitiveSection, "primitive colours");
  return map;
}

// ---------------------------------------------------------------------------
//  Reference resolver
// ---------------------------------------------------------------------------

const REF_PATTERN = /\{([^}]+)\}/g;

function resolveReferences(value, primitiveMap) {
  return value.replace(REF_PATTERN, (match, refPath) => {
    const normalised = refPath.replace(/\s+/g, " ").trim();
    const resolved = primitiveMap.get(normalised);
    if (resolved === undefined) {
      console.warn(`  ⚠  Unresolved reference: "${refPath}"`);
      return match;
    }
    return resolved;
  });
}

// ---------------------------------------------------------------------------
//  CSS generation helpers
// ---------------------------------------------------------------------------

const INDENT = "  ";

function line(text) {
  return text + "\n";
}

function comment(text) {
  return `/* ${text} */\n`;
}

function sectionDivider(title) {
  const bar = "─".repeat(60);
  return `\n/* ${bar}\n   ${title}\n   ${bar} */\n\n`;
}

function cssVar(category, name, value) {
  const varName = `--${category}-${slugify(name)}`;
  return `${INDENT}${varName}: ${value};\n`;
}

// ---------------------------------------------------------------------------
//  Main generator
// ---------------------------------------------------------------------------

function generate(tokens) {
  const lines = [];
  const now = new Date().toISOString().replace(/T/, " ").split(".")[0];

  // ── Header ──────────────────────────────────────────────────────────────
  lines.push(
    line("/**"),
    line(" * design-tokens.css"),
    line(` * Generated ${now} from design-tokens.tokens.json`),
    line(" * Do not edit by hand — run `node build-tokens.js` to regenerate."),
    line(" */\n"),
    line(":root {\n")
  );

  // ═════════════════════════════════════════════════════════════════════════
  //  1.  PRIMITIVE COLOURS  (foundations — NOT for direct use)
  // ═════════════════════════════════════════════════════════════════════════
  lines.push(
    sectionDivider(
      "PRIMITIVE COLOURS — Do NOT reference these directly in your components."
    )
  );
  lines.push(
    comment(
      "These are the foundational palette values. They exist solely so the"
    ),
    comment(
      "semantic colour-role tokens (see next section) can point to them."
    ),
    comment("Always use the role tokens in your UI code.\n")
  );

  const primitiveSection = tokens["primitive colours"];
  if (primitiveSection) {
    for (const [groupName, group] of Object.entries(primitiveSection)) {
      if (typeof group !== "object" || group.type === "color") continue;
      lines.push(comment(`· ${groupName}`));
      for (const [entryName, entry] of Object.entries(group)) {
        if (typeof entry !== "object" || entry.type !== "color") continue;
        const groupSlug = slugify(groupName);
        const entrySlug = slugify(entryName.replace(groupName, "").trim());
        const tokenName = entrySlug ? `${groupSlug}-${entrySlug}` : groupSlug;
        lines.push(cssVar("clr", `${groupName}-${entryName}`, hexToRgba(entry.value)));
      }
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  2.  COLOUR ROLES  (semantic — use these in UI)
  // ═════════════════════════════════════════════════════════════════════════
  lines.push(
    sectionDivider(
      "COLOUR ROLES — The semantic colour tokens for use in UI components."
    )
  );
  lines.push(comment("Use these — never the primitive colours above — in your styles.\n"));

  const primitiveMap = buildPrimitiveMap(primitiveSection);
  const colourRoles = tokens["colour roles"];

  if (colourRoles) {
    for (const [roleName, role] of Object.entries(colourRoles)) {
      if (typeof role !== "object" || role.type !== "color") continue;
      const resolved = resolveReferences(role.value, primitiveMap);
      lines.push(cssVar("clr", roleName, resolved));
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  3.  SPACING
  // ═════════════════════════════════════════════════════════════════════════
  lines.push(sectionDivider("SPACING — Margin, padding, gap, inset tokens."));

  const spacing = tokens["spacing collection"];
  if (spacing) {
    for (const [name, entry] of Object.entries(spacing)) {
      if (typeof entry !== "object" || entry.type !== "dimension") continue;
      const value = entry.value === 0 ? "0" : `${entry.value}px`;
      lines.push(cssVar("spacing", name, value));
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  4.  TYPOGRAPHY
  // ═════════════════════════════════════════════════════════════════════════
  lines.push(
    sectionDivider(
      "TYPOGRAPHY — Font size, weight, line-height, letter-spacing, etc."
    )
  );
  lines.push(
    comment(
      "Each style is prefixed with its category (display, headline, title,"
    ),
    comment("body, label) and size (large, medium, small).\n")
  );

  const typography = tokens["typography"];
  const TYPO_PROP_MAP = {
    fontSize: "font-size",
    fontWeight: "font-weight",
    fontFamily: "font-family",
    lineHeight: "line-height",
    letterSpacing: "letter-spacing",
    textDecoration: "text-decoration",
    fontStyle: "font-style",
    textCase: "text-case",
  };

  if (typography) {
    for (const [styleName, style] of Object.entries(typography)) {
      if (typeof style !== "object") continue;
      lines.push(comment(`· ${styleName}`));
      for (const [prop, descriptor] of Object.entries(style)) {
        const cssProp = TYPO_PROP_MAP[prop];
        if (!cssProp) continue;

        let cssValue;
        if (descriptor.type === "dimension") {
          cssValue = descriptor.value === 0 ? "0" : `${descriptor.value}px`;
        } else if (descriptor.type === "number") {
          cssValue = String(descriptor.value);
        } else if (descriptor.type === "string") {
          cssValue =
            prop === "fontFamily" ? `"${descriptor.value}"` : descriptor.value;
        } else {
          cssValue = String(descriptor.value);
        }

        lines.push(cssVar("typography", `${styleName}-${cssProp}`, cssValue));
      }
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  5.  EFFECTS / SHADOWS
  // ═════════════════════════════════════════════════════════════════════════
  lines.push(sectionDivider("EFFECTS — Box-shadow presets."));

  const effects = tokens["effect"];
  if (effects) {
    for (const [name, entry] of Object.entries(effects)) {
      if (typeof entry !== "object" || entry.type !== "custom-shadow") continue;
      lines.push(cssVar("shadow", name, formatShadow(entry.value)));
    }
  }

  // ── Close :root ─────────────────────────────────────────────────────────
  lines.push(line("}"));

  return lines.join("");
}

// ---------------------------------------------------------------------------
//  Entry point
// ---------------------------------------------------------------------------

function main() {
  const inputPath = path.resolve(__dirname, INPUT_FILE);

  if (!fs.existsSync(inputPath)) {
    console.error(`\n  ✖  Input file not found: ${INPUT_FILE}`);
    console.error(`     Run this script from the project root directory.\n`);
    process.exit(1);
  }

  console.log(`\n  ◆  Loading ${INPUT_FILE} …`);
  const tokens = loadTokens(inputPath);

  console.log(`  ◆  Generating CSS custom properties …`);
  const css = generate(tokens);

  const outputPath = path.resolve(__dirname, OUTPUT_FILE);
  fs.writeFileSync(outputPath, css, "utf-8");

  console.log(`  ✔  Written ${OUTPUT_FILE}`);
  console.log(`     ${css.length.toLocaleString()} bytes\n`);
}

main();
