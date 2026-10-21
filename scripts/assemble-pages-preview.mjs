import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";

const values = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, args) => {
  if (value.startsWith("--")) pairs.push([value.slice(2), args[index + 1]]);
  return pairs;
}, []));
const shaPattern = /^[0-9a-f]{40}$/;
const required = (name) => { if (!values[name]) throw new Error(`Missing --${name}`); return values[name]; };
const assertSha = (name) => { const sha = required(name); if (!shaPattern.test(sha)) throw new Error(`Invalid ${name}`); return sha; };

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]))).flat();
}
async function digest(directory) {
  const source = createHash("sha256");
  for (const file of (await files(directory)).sort()) { source.update(`${relative(directory, file)}\0`); source.update(await readFile(file)); }
  return source.digest("hex");
}

const mode = required("mode");
if (!["preview", "rollback"].includes(mode)) throw new Error("mode must be preview or rollback");
const rootDir = required("root-dir");
const outputDir = required("out-dir");
const rootSha = assertSha("root-sha");
await stat(join(rootDir, "index.html"));
await stat(join(rootDir, "404.html"));
try { await stat(join(rootDir, "qa-pilot")); throw new Error("Root build already contains qa-pilot"); } catch (error) { if (error.code !== "ENOENT") throw error; }
await rm(outputDir, { recursive: true, force: true });
await cp(rootDir, outputDir, { recursive: true });
const rootDigest = await digest(rootDir);
let pilot = null;
if (mode === "preview") {
  const pilotDir = required("pilot-dir");
  const pilotSha = assertSha("pilot-sha");
  await stat(join(pilotDir, "index.html"));
  await stat(join(pilotDir, "404.html"));
  const pilotDigest = await digest(pilotDir);
  const pilotOutput = join(outputDir, "qa-pilot", pilotSha);
  await mkdir(pilotOutput, { recursive: true });
  await cp(pilotDir, pilotOutput, { recursive: true });
  pilot = { sha: pilotSha, path: `qa-pilot/${pilotSha}`, digest: pilotDigest };
  await writeFile(join(pilotOutput, "preview-provenance.json"), `${JSON.stringify({ mode, rootSha, pilot }, null, 2)}\n`);
}
const provenance = { mode, root: { sha: rootSha, digest: rootDigest }, pilot };
await writeFile(join(outputDir, "preview-provenance.json"), `${JSON.stringify(provenance, null, 2)}\n`);
console.log(`mode=${mode}`);
console.log(`root_sha=${rootSha}`);
console.log(`root_digest=${rootDigest}`);
if (pilot) { console.log(`pilot_sha=${pilot.sha}`); console.log(`pilot_digest=${pilot.digest}`); }
