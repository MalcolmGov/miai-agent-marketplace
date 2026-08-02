import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
register(pathToFileURL(resolve(dir, "web-test-hooks.mjs")).href, import.meta.url);
