import { copyFile, stat } from "node:fs/promises";
import { join } from "node:path";

const directory = process.argv[2] ?? "dist";
const index = join(directory, "index.html");
const fallback = join(directory, "404.html");

await stat(index);
await copyFile(index, fallback);
