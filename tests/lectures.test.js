import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildManifest } from "../scripts/lectures-manifest.mjs";

test("лекциялар тізімі файлдар мен lectures.json-нан құрастырылады", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "lec-"));
  await fs.writeFile(path.join(dir, "02-atom_economy.pdf"), "x");
  await fs.writeFile(path.join(dir, "01-intro.pptx"), "x");
  await fs.writeFile(path.join(dir, "notes.exe"), "x");
  await fs.writeFile(path.join(dir, "README.md"), "x");
  await fs.writeFile(
    path.join(dir, "lectures.json"),
    JSON.stringify({ items: [{ file: "01-intro.pptx", title: "Кіріспе", module: "1-апта" }, { url: "https://youtu.be/dQw4w9WgXcQ", title: "Бейне", order: 5 }] })
  );
  const m = await buildManifest(dir);
  assert.deepEqual(m.items.map((x) => x.title), ["Кіріспе", "Atom economy", "Бейне"]);
  assert.equal(m.items[0].type, "slides");
  assert.equal(m.items[2].type, "youtube");
  assert.equal(m.items[2].youtube, "dQw4w9WgXcQ");
});
