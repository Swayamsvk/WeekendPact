import fs from "node:fs";
import path from "node:path";

// Every workspace that has its own ESLint config
const workspaces = ["apps", "packages"]
  .flatMap((dir) =>
    fs.existsSync(dir)
      ? fs.readdirSync(dir).map((name) => path.join(dir, name))
      : [],
  )
  .filter((dir) => fs.existsSync(path.join(dir, "eslint.config.mjs")));

const quote = (files) => files.map((f) => JSON.stringify(f)).join(" ");

export default {
  "*.{js,jsx,ts,tsx}": (files) => {
    const commands = [];

    for (const ws of workspaces) {
      const wsRoot = path.resolve(ws) + path.sep;
      const wsFiles = files.filter((f) => f.startsWith(wsRoot));
      if (wsFiles.length > 0) {
        commands.push(
          `npm exec --workspace=${ws} -- eslint --fix --max-warnings=0 --no-warn-ignored ${quote(wsFiles)}`,
        );
      }
    }

    commands.push(`prettier --write --ignore-unknown ${quote(files)}`);
    return commands;
  },

  "*.{json,md,yml,yaml}": "prettier --write --ignore-unknown",
};
