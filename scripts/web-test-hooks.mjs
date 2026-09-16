import { accessSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve as resolvePath, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = resolvePath(dirname(fileURLToPath(import.meta.url)), "../apps/web");

const EXTENSIONS = [".ts", ".tsx", ".js", ".mjs"];

function resolveWebAlias(specifier) {
  const rel = specifier.slice(2);
  const base = resolvePath(webRoot, "src", rel);
  if (/\.[a-z0-9]+$/i.test(rel)) {
    return base;
  }
  for (const ext of EXTENSIONS) {
    const candidate = `${base}${ext}`;
    try {
      accessSync(candidate);
      return candidate;
    } catch {
      // try next extension
    }
  }
  return `${base}.ts`;
}

/**
 * Resolve a relative, extension-less import (`./knowledge-guidance`) the way the bundler does:
 * try the known extensions (and a directory index) and hand the real file to node. Without this,
 * any lib that imports a sibling without an extension cannot be loaded by the unit tests.
 */
function resolveRelative(specifier, context) {
  if (!context?.parentURL) return null;
  if (!specifier.startsWith("./") && !specifier.startsWith("../")) return null;
  if (/\.[a-z0-9]+$/i.test(specifier)) return null;
  const parent = dirname(fileURLToPath(context.parentURL));
  const base = resolvePath(parent, specifier);
  for (const ext of EXTENSIONS) {
    const candidate = `${base}${ext}`;
    try {
      accessSync(candidate);
      return candidate;
    } catch {
      // try next extension
    }
  }
  for (const ext of EXTENSIONS) {
    const candidate = resolvePath(base, `index${ext}`);
    try {
      accessSync(candidate);
      return candidate;
    } catch {
      // try next extension
    }
  }
  return null;
}

/** Resolve Next.js `@/*`, relative extension-less imports and `next/server` outside the bundler. */
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/server") {
    return nextResolve("next/server.js", context);
  }
  if (specifier.startsWith("@/")) {
    const file = resolveWebAlias(specifier);
    return nextResolve(pathToFileURL(file).href, context);
  }
  const relative = resolveRelative(specifier, context);
  if (relative) {
    return nextResolve(pathToFileURL(relative).href, context);
  }
  return nextResolve(specifier, context);
}
