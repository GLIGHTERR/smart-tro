import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const exec = promisify(execFile);
const script = join(process.cwd(), "scripts/assemble-pages-preview.mjs");
const rootSha = "a".repeat(40);
const pilotSha = "b".repeat(40);

async function site(directory, marker) {
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "index.html"), marker);
  await writeFile(join(directory, "404.html"), marker);
  await mkdir(join(directory, "assets"));
  await writeFile(join(directory, "assets", "bundle.js"), marker);
}

test("assembles a SHA-pinned root and pilot with separate provenance", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pages-preview-"));
  const root = join(directory, "root");
  const pilot = join(directory, "pilot");
  const output = join(directory, "output");
  await site(root, "root");
  await site(pilot, "pilot");
  const { stdout } = await exec("node", [script, "--mode", "preview", "--root-dir", root, "--root-sha", rootSha, "--pilot-dir", pilot, "--pilot-sha", pilotSha, "--out-dir", output]);
  assert.match(stdout, new RegExp(`root_sha=${rootSha}`));
  assert.match(stdout, new RegExp(`pilot_sha=${pilotSha}`));
  assert.equal(await readFile(join(output, "index.html"), "utf8"), "root");
  assert.equal(await readFile(join(output, "qa-pilot", pilotSha, "index.html"), "utf8"), "pilot");
  const provenance = JSON.parse(await readFile(join(output, "preview-provenance.json"), "utf8"));
  assert.equal(provenance.root.sha, rootSha);
  assert.equal(provenance.pilot.sha, pilotSha);
  assert.match(provenance.root.digest, /^[0-9a-f]{64}$/);
  assert.match(provenance.pilot.digest, /^[0-9a-f]{64}$/);
});

test("rollback assembles only the clean root", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pages-rollback-"));
  const root = join(directory, "root");
  const output = join(directory, "output");
  await site(root, "root");
  await exec("node", [script, "--mode", "rollback", "--root-dir", root, "--root-sha", rootSha, "--out-dir", output]);
  assert.equal(JSON.parse(await readFile(join(output, "preview-provenance.json"), "utf8")).pilot, null);
  await assert.rejects(readFile(join(output, "qa-pilot", pilotSha, "index.html")));
});

test("refuses root output which already contains a pilot", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pages-guard-"));
  const root = join(directory, "root");
  await site(root, "root");
  await mkdir(join(root, "qa-pilot"));
  await assert.rejects(exec("node", [script, "--mode", "rollback", "--root-dir", root, "--root-sha", rootSha, "--out-dir", join(directory, "output")]), /Root build already contains qa-pilot/);
});

test("rejects incomplete or invalid immutable deployment inputs", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pages-inputs-"));
  const root = join(directory, "root");
  await site(root, "root");
  const output = join(directory, "output");
  await assert.rejects(exec("node", [script, "--mode", "other", "--root-dir", root, "--root-sha", rootSha, "--out-dir", output]), /mode must be preview or rollback/);
  await assert.rejects(exec("node", [script, "--mode", "rollback", "--root-dir", root, "--root-sha", "bad", "--out-dir", output]), /Invalid root-sha/);
  await assert.rejects(exec("node", [script, "--mode", "preview", "--root-dir", root, "--root-sha", rootSha, "--pilot-dir", root, "--pilot-sha", "bad", "--out-dir", output]), /Invalid pilot-sha/);
  await assert.rejects(exec("node", [script, "--mode", "rollback", "--root-dir", root, "--out-dir", output]), /Missing --root-sha/);
  await assert.rejects(exec("node", [script, "--mode", "preview", "--root-dir", root, "--root-sha", rootSha, "--out-dir", output, "ignored"]), /Missing --pilot-dir/);
});
