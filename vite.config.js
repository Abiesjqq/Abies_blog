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

function extractReferencedAssetPaths(docPath, markdown) {
  const assetPaths = new Set();
  const patterns = [
    /!\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
    /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(markdown)) !== null) {
      const candidate = match[1]?.trim();
      if (!candidate || /^(?:[a-z]+:)?\/\//i.test(candidate) || candidate.startsWith("data:") || candidate.startsWith("#")) {
        continue;
      }
      assetPaths.add(resolveDocRelativePath(docPath, candidate));
    }
  }

  return assetPaths;
}

function resolveDocRelativePath(docPath, assetPath) {
  const normalizedAssetPath = normalizeContentPath(assetPath);
  if (!normalizedAssetPath || assetPath.startsWith("/")) {
    return normalizedAssetPath;
  }

  const docDirectory = path.posix.dirname(normalizeContentPath(docPath));
  return normalizeContentPath(path.posix.join(docDirectory, normalizedAssetPath));
}

function collectStaticAssets(rootDir, tree) {
  const assets = new Set();

  for (const docPath of collectDocPaths(tree)) {
    const absolutePath = path.join(rootDir, docPath);
    if (!fs.existsSync(absolutePath)) {
      continue;
    }

    const markdown = fs.readFileSync(absolutePath, "utf8");
    for (const assetPath of extractReferencedAssetPaths(docPath, markdown)) {
      const absoluteAssetPath = path.join(rootDir, assetPath);
      if (fs.existsSync(absoluteAssetPath) && fs.statSync(absoluteAssetPath).isFile()) {
        assets.add(assetPath);
      }
    }
  }

  return assets;
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
  let referencedAssets = new Set();

  return {
    name: "blog-content-plugin",
    buildStart() {
      const indexPath = path.join(rootDir, "index.md");
      const indexSource = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, "utf8") : "";
      const tree = parseIndexTree(indexSource);
      referencedAssets = collectStaticAssets(rootDir, tree);
    },
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
    generateBundle() {
      for (const assetPath of referencedAssets) {
        const absolutePath = path.join(rootDir, assetPath);
        if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
          continue;
        }

        this.emitFile({
          type: "asset",
          fileName: assetPath,
          source: fs.readFileSync(absolutePath)
        });
      }
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
