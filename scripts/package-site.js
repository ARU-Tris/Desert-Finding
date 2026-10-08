import { mkdir, copyFile, cp } from "node:fs/promises";
// Publish only the static runtime. Test dependencies and authoring files stay
// in the repository instead of inflating the Pages artifact.
await mkdir(".site", { recursive: true });
for (const file of ["index.html", "style.css", ".nojekyll"])
  await copyFile(file, `.site/${file}`);
for (const folder of ["assets", "src"])
  await cp(folder, `.site/${folder}`, { recursive: true });
