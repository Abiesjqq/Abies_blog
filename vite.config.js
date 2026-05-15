import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const VIRTUAL_MODULE_ID = "virtual:blog-content";
const RESOLVED_VIRTUAL_MODULE_ID = "\0" + VIRTUAL_MODULE_ID;

function parseIndexTree(source) {
  const lines = source.split(/\r?\n/);
  const root = [];
  const stack = [{ indent: -1, children: root }];
  let nodeCounter = 0;

  for (const rawLine of lines) {
    if (!rawLine.trim()) {
      continue;
    }

    const indent = rawLine.match(/^ */)?.[0].length ?? 0;
    const trimmed = rawLine.trim();

    if (!trimmed.startsWith("- ")) {
      continue;
    }

    const body = trimmed.slice(2).trim();
    const node = buildNode(body, nodeCounter++);

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    stack[stack.length - 1].children.push(node);

    if (!node.path) {
      stack.push({ indent, children: node.children });
    }
  }

  return root;
}

function buildNode(body, counter) {
  if (body.endsWith(":")) {
    return createGroupNode(body.slice(0, -1).trim(), counter);
  }

  const match = body.match(/^(.*?):\s*(.+)$/);
  if (match && /\.md$/i.test(match[2].trim())) {
    return {
      id: `doc-${counter}`,
      title: match[1].trim(),
      path: normalizeContentPath(match[2].trim()),
      children: []
    };
  }

  return createGroupNode(body.trim(), counter);
}

function createGroupNode(title, counter) {
  return {
    id: `group-${counter}`,
    title,
    path: null,
    children: []
  };
}

function normalizeContentPath(input) {
  return input.replace(/\\/g, "/").replace(/^\.?\//, "");
}

function collectDocPaths(nodes, output = new Set()) {
  for (const node of nodes) {
    if (node.path) {
      output.add(node.path);
    }
    if (node.children.length) {
      collectDocPaths(node.children, output);
    }
  }
  return output;
}

function createContentModule(rootDir) {
  const indexPath = path.join(rootDir, "index.md");
  const indexSource = fs.existsSync(indexPath)
    ? fs.readFileSync(indexPath, "utf8")
    : "";
  const tree = parseIndexTree(indexSource);
  const docs = {};
  const missing = [];

  for (const docPath of collectDocPaths(tree)) {
    const absolutePath = path.join(rootDir, docPath);
    if (fs.existsSync(absolutePath)) {
      docs[docPath] = fs.readFileSync(absolutePath, "utf8");
    } else {
      missing.push(docPath);
    }
  }

  return `
export const navTree = ${JSON.stringify(tree, null, 2)};
export const docs = ${JSON.stringify(docs, null, 2)};
export const missingDocs = ${JSON.stringify(missing, null, 2)};
`;
}

function blogContentPlugin() {
  const rootDir = process.cwd();

  return {
    name: "blog-content-plugin",
    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID;
      }
      return null;
    },
    load(id) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        return createContentModule(rootDir);
      }
      return null;
    },
    configureServer(server) {
      const indexPath = path.join(rootDir, "index.md");
      if (fs.existsSync(indexPath)) {
        server.watcher.add(indexPath);
      }

      server.watcher.on("all", (eventName, filePath) => {
        if (!filePath.endsWith(".md")) {
          return;
        }

        if (!filePath.startsWith(rootDir)) {
          return;
        }

        const module = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID);
        if (module) {
          server.moduleGraph.invalidateModule(module);
        }

        server.ws.send({ type: "full-reload" });
      });
    }
  };
}

function getBasePath() {
  if (!process.env.GITHUB_ACTIONS) {
    return "/";
  }

  const repository = process.env.GITHUB_REPOSITORY ?? "";
  const repoName = repository.split("/")[1];
  return repoName ? `/${repoName}/` : "/";
}

export default defineConfig({
  plugins: [react(), blogContentPlugin()],
  base: getBasePath()
});
