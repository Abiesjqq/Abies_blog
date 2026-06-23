import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { docs, navTree } from "virtual:blog-content";
import leafAccent from "./assets/leaf-accent.png";
import leafClusterLeft from "./assets/leaf-cluster-left.png";
import leafClusterRight from "./assets/leaf-cluster-right.png";

const ADMONITION_META = {
  remarks: { label: "补充内容", className: "remarks", icon: "◌" },
  examples: { label: "示例", className: "examples", icon: "◇" },
  warning: { label: "警告", className: "warning", icon: "△" },
  "normal-comment": { label: "备注", className: "normal-comment", icon: "·" }
};

function ChevronIcon({ className = "" }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 12 12">
      <path d="M2.5 2.35L8.75 6L2.5 9.65" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.15" />
    </svg>
  );
}

function flattenDocs(nodes, output = []) {
  for (const node of nodes) {
    if (node.path) {
      output.push(node);
    }
    if (node.children.length) {
      flattenDocs(node.children, output);
    }
  }
  return output;
}

function buildInitialOpenState(nodes, state = {}) {
  for (const node of nodes) {
    if (!node.path) {
      state[node.id] = false;
      buildInitialOpenState(node.children, state);
    }
  }
  return state;
}

function getFirstDocPath(node) {
  if (node.path) {
    return node.path;
  }
  for (const child of node.children) {
    const match = getFirstDocPath(child);
    if (match) {
      return match;
    }
  }
  return "";
}

function countImmediateDocs(node) {
  return flattenDocs(node.children).length;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[`~!@#$%^&*()+={}|:;"'<>,.?/\\[\]\s]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractHeadings(markdown) {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.match(/^(#{1,3})\s+(.+?)\s*$/))
    .filter(Boolean)
    .map((match) => ({
      level: match[1].length,
      text: match[2].replace(/[`*_[\]]/g, ""),
      anchor: slugify(match[2])
    }));
}

function findNodeTitleByPath(nodes, targetPath) {
  for (const node of nodes) {
    if (node.path === targetPath) {
      return node.title;
    }
    if (node.children.length) {
      const match = findNodeTitleByPath(node.children, targetPath);
      if (match) {
        return match;
      }
    }
  }
  return "";
}

function findTopLevelNodeByPath(nodes, targetPath) {
  for (const node of nodes) {
    const descendants = flattenDocs([node]);
    if (descendants.some((item) => item.path === targetPath)) {
      return node;
    }
  }
  return null;
}

function findTopLevelNodeById(nodes, targetId) {
  return nodes.find((node) => node.id === targetId) ?? null;
}

function isKnownPath(nodes, targetPath) {
  return flattenDocs(nodes).some((item) => item.path === targetPath);
}

function expandPath(nodes, targetPath, state = {}) {
  for (const node of nodes) {
    if (node.path === targetPath) {
      return true;
    }
    if (node.children.length) {
      const found = expandPath(node.children, targetPath, state);
      if (found) {
        state[node.id] = true;
        return true;
      }
    }
  }
  return false;
}

function resolveImageSource(docPath, source) {
  if (!source) {
    return "";
  }

  if (/^(?:[a-z]+:)?\/\//i.test(source) || source.startsWith("data:") || source.startsWith("#")) {
    return source;
  }

  const normalizedBase = import.meta.env.BASE_URL || "/";
  const trimmedBase = normalizedBase.endsWith("/") ? normalizedBase.slice(0, -1) : normalizedBase;

  if (source.startsWith("/")) {
    return `${trimmedBase}${source}`;
  }

  const segments = docPath.split("/").slice(0, -1);
  const parts = source.split("/");

  for (const part of parts) {
    if (!part || part === ".") {
      continue;
    }
    if (part === "..") {
      segments.pop();
      continue;
    }
    segments.push(part);
  }

  return `${trimmedBase}/${segments.join("/")}`;
}

function renderMarkdownBlock(content, key, docPath = "") {
  const normalizedContent = normalizeMathDelimiters(content);

  return (
    <ReactMarkdown
      key={key}
      components={{
        img({ src = "", alt = "", title = "" }) {
          const resolvedSrc = resolveImageSource(docPath, src);
          return <img alt={alt} loading="lazy" src={resolvedSrc} title={title || undefined} />;
        }
      }}
      rehypePlugins={[
        [
          rehypeHighlight,
          {
            aliases: {
              c: ["h"],
              cpp: ["c++", "cc", "cxx", "hpp", "h++"],
              python: ["py"],
              java: ["jsp"],
              verilog: ["v", "sv", "systemverilog"]
            }
          }
        ],
        rehypeKatex,
        rehypeSlug,
        [rehypeAutolinkHeadings, { behavior: "append" }]
      ]}
      remarkPlugins={[remarkGfm, remarkMath]}
    >
      {normalizedContent}
    </ReactMarkdown>
  );
}

function normalizeMathDelimiters(content) {
  return content
    .replace(/\\\[((?:.|\n)*?)\\\]/g, (_, expr) => `\n$$\n${expr.trim()}\n$$\n`)
    .replace(/\\\(((?:\\.|[^\\])+?)\\\)/g, (_, expr) => `$${expr.trim()}$`);
}

function parseBlocks(lines, startIndex = 0) {
  const blocks = [];
  let markdownBuffer = [];
  let index = startIndex;

  function flushMarkdown() {
    const content = markdownBuffer.join("\n").trim();
    if (content) {
      blocks.push({ type: "markdown", content });
    }
    markdownBuffer = [];
  }

  while (index < lines.length) {
    const line = lines[index];
    const match = line.match(/^(\!\!\!|\?\?\?)\s+([a-z-]+)(?:\s+"([^"]+)")?\s*$/);

    if (!match) {
      markdownBuffer.push(line);
      index += 1;
      continue;
    }

    flushMarkdown();

    const [, marker, kind, title] = match;
    index += 1;
    const bodyLines = [];

    while (index < lines.length) {
      const nextLine = lines[index];
      if (!nextLine.trim()) {
        bodyLines.push("");
        index += 1;
        continue;
      }

      if (/^(?: {4}|\t)/.test(nextLine)) {
        bodyLines.push(nextLine.replace(/^(?: {4}|\t)/, ""));
        index += 1;
        continue;
      }

      break;
    }

    blocks.push({
      type: "admonition",
      open: marker === "!!!",
      kind,
      title: title?.trim() || "",
      children: parseBlocks(bodyLines).blocks
    });
  }

  flushMarkdown();
  return { blocks, nextIndex: index };
}

function parseArticleBlocks(markdown) {
  return parseBlocks(markdown.replace(/\r\n/g, "\n").split("\n")).blocks;
}

function renderBlocks(blocks, docPath, keyPrefix = "block") {
  return blocks.map((block, index) => {
    if (block.type === "markdown") {
      return renderMarkdownBlock(block.content, `${keyPrefix}-markdown-${index}`, docPath);
    }

    const meta = ADMONITION_META[block.kind] ?? {
      label: block.kind,
      className: "remarks",
      icon: "◌"
    };
    const title = block.title?.trim() || "";

    return (
      <details
        className={`admonition-card admonition-${meta.className}`}
        key={`${keyPrefix}-admonition-${index}`}
        open={block.open}
      >
        <summary>
          <ChevronIcon className="admonition-toggle-indicator" />
          <span aria-hidden="true" className={`admonition-kind-icon admonition-kind-${meta.className}`}>
            {meta.icon}
          </span>
          {title ? <span className="admonition-title">{title}</span> : null}
        </summary>
        <div className="admonition-body">{renderBlocks(block.children, docPath, `${keyPrefix}-${index}`)}</div>
      </details>
    );
  });
}

function SidebarNode({ node, currentPath, openState, onToggle, onSelect, level }) {
  if (node.path) {
    return (
      <li className="nav-item">
        <button
          className={`nav-link ${currentPath === node.path ? "active" : ""}`}
          onClick={() => onSelect(node.path)}
          type="button"
        >
          <span className={`nav-level nav-level-${level}`}>{node.title}</span>
        </button>
      </li>
    );
  }

  const isOpen = openState[node.id] ?? false;

  return (
    <li className="nav-group">
      <button className="nav-group-toggle" onClick={() => onToggle(node.id)} type="button">
        <span aria-hidden="true" className="nav-group-indicator">
          {isOpen ? "−" : "+"}
        </span>
        <span className={`nav-level nav-level-${level}`}>{node.title}</span>
      </button>
      {isOpen ? (
        <ul className="nav-children">
          {node.children.map((child) => (
            <SidebarNode
              currentPath={currentPath}
              key={child.id}
              level={Math.min(level + 1, 3)}
              node={child}
              onSelect={onSelect}
              onToggle={onToggle}
              openState={openState}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function SectionOverview({ section, onSelectDoc }) {
  return (
    <div className="section-overview">
      <header className="section-overview-header">
        <span className="section-overview-kicker">章节目录</span>
        <h1>{section.title}</h1>
      </header>

      <div className="section-overview-grid">
        {section.children.map((child) => {
          const docsInChild = flattenDocs([child]);
          const previewDocs = docsInChild.slice().reverse().slice(0, 3);
          const childTitle = child.title;

          return (
            <section className="section-overview-card" key={child.id}>
              <h2>{childTitle}</h2>
              <p>{docsInChild.length ? `${docsInChild.length} 篇内容` : "当前没有文档"}</p>
              {previewDocs.length ? (
                <ul>
                  {previewDocs.map((doc) => (
                    <li key={doc.path}>
                      <button onClick={() => onSelectDoc(doc.path)} type="button">
                        {doc.title}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>

      <div className="section-overview-accent" aria-hidden="true">
        <img alt="" className="section-overview-leaf section-overview-leaf-left" src={leafClusterLeft} />
        <img alt="" className="section-overview-leaf section-overview-leaf-right" src={leafAccent} />
      </div>
    </div>
  );
}

function NotFoundArticle({ currentPath }) {
  return (
    <div className="not-found-page">
      <h1>404</h1>
      <p>文档不存在或尚未加入仓库。</p>
      <code>{currentPath}</code>
    </div>
  );
}

export default function App() {
  const topSections = useMemo(
    () =>
      navTree.map((node) => ({
        ...node,
        firstDocPath: getFirstDocPath(node),
        docCount: flattenDocs([node]).length
      })),
    []
  );
  const [openState, setOpenState] = useState(() => buildInitialOpenState(navTree));
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [viewState, setViewState] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const docParam = params.get("doc");
    const sectionParam = params.get("section");

    if (docParam && isKnownPath(navTree, docParam)) {
      const section = findTopLevelNodeByPath(navTree, docParam);
      return {
        home: false,
        sectionId: section?.id ?? "",
        currentPath: docParam
      };
    }

    if (sectionParam && findTopLevelNodeById(navTree, sectionParam)) {
      return {
        home: false,
        sectionId: sectionParam,
        currentPath: ""
      };
    }

    return {
      home: true,
      sectionId: "",
      currentPath: ""
    };
  });

  const currentSection = viewState.sectionId ? findTopLevelNodeById(navTree, viewState.sectionId) : null;
  const article = viewState.currentPath ? docs[viewState.currentPath] ?? "" : "";
  const articleExists = Boolean(viewState.currentPath && docs[viewState.currentPath]);
  const articleTitle = viewState.currentPath ? findNodeTitleByPath(navTree, viewState.currentPath) : currentSection?.title ?? "首页";
  const headings = useMemo(() => extractHeadings(article), [article]);
  const articleBlocks = useMemo(() => (article ? parseArticleBlocks(article) : []), [article]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (viewState.home) {
      url.searchParams.delete("section");
      url.searchParams.delete("doc");
    } else if (viewState.currentPath) {
      url.searchParams.set("section", viewState.sectionId);
      url.searchParams.set("doc", viewState.currentPath);
    } else if (viewState.sectionId) {
      url.searchParams.set("section", viewState.sectionId);
      url.searchParams.delete("doc");
    }
    window.history.replaceState({}, "", url);
  }, [viewState]);

  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const docParam = params.get("doc");
      const sectionParam = params.get("section");

      if (docParam && isKnownPath(navTree, docParam)) {
        const section = findTopLevelNodeByPath(navTree, docParam);
        setViewState({
          home: false,
          sectionId: section?.id ?? "",
          currentPath: docParam
        });
        return;
      }

      if (sectionParam && findTopLevelNodeById(navTree, sectionParam)) {
        setViewState({
          home: false,
          sectionId: sectionParam,
          currentPath: ""
        });
        return;
      }

      setViewState({
        home: true,
        sectionId: "",
        currentPath: ""
      });
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!viewState.currentPath) {
      return;
    }
    const next = buildInitialOpenState(navTree);
    expandPath(navTree, viewState.currentPath, next);
    setOpenState(next);
  }, [viewState.currentPath]);

  function handleToggle(id) {
    setOpenState((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleSelectDoc(path) {
    const section = findTopLevelNodeByPath(navTree, path);
    const next = buildInitialOpenState(navTree);
    expandPath(navTree, path, next);
    setOpenState(next);
    setViewState({
      home: false,
      sectionId: section?.id ?? viewState.sectionId,
      currentPath: path
    });
    setMobileSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function handleEnterSection(sectionId) {
    setOpenState(buildInitialOpenState(navTree));
    setViewState({
      home: false,
      sectionId,
      currentPath: ""
    });
    setMobileSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function handleGoHome() {
    setViewState({
      home: true,
      sectionId: "",
      currentPath: ""
    });
    setMobileSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  return (
    <div className={`app-shell ${viewState.home ? "is-home" : "is-article"}`}>
      <main className="page-stage">
        {viewState.home ? (
          <section className="landing-page">
            <div className="landing-illustration landing-illustration-left" aria-hidden="true">
              <img alt="" className="landing-leaf-cluster" src={leafClusterLeft} />
            </div>
            <div className="landing-illustration landing-illustration-right" aria-hidden="true">
              <img alt="" className="landing-leaf-cluster" src={leafClusterRight} />
            </div>

            <div className="landing-hero">
              <h1>导航首页</h1>
            </div>

            <div className="section-grid">
              {topSections.map((section) => (
                <button
                  className="section-card"
                  key={section.id}
                  onClick={() => handleEnterSection(section.id)}
                  type="button"
                >
                  <h2>{section.title}</h2>
                  <p>{section.docCount ? `包含 ${section.docCount} 篇文档` : "当前分类还没有可进入的文档"}</p>
                </button>
              ))}
            </div>

            <div className="landing-accent" aria-hidden="true">
              <img alt="" className="landing-leaf" src={leafAccent} />
            </div>
          </section>
        ) : (
          <section className="reader-shell">
            <header className="topbar">
              <div className="topbar-main">
                <a
                  aria-label="返回首页"
                  className="home-link"
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    handleGoHome();
                  }}
                >
                  <span aria-hidden="true">⌂</span>
                </a>
                <button
                  aria-label="切换文档导航"
                  className="sidebar-trigger topbar-sidebar-trigger"
                  onClick={() => setMobileSidebarOpen((prev) => !prev)}
                  type="button"
                >
                  目录
                </button>
                <div className="topbar-title">{articleTitle}</div>
              </div>
              <div className="top-sections" aria-label="一级导航">
                {topSections.map((section) => (
                  <button
                    className={`top-section-link ${viewState.sectionId === section.id ? "active" : ""}`}
                    key={section.id}
                    onClick={() => handleEnterSection(section.id)}
                    type="button"
                  >
                    {section.title}
                  </button>
                ))}
              </div>
            </header>

            <div className="reader-layout">
              <aside className={`sidebar ${mobileSidebarOpen ? "open" : ""}`}>
                <nav className="nav-tree" aria-label="文章导航">
                  <ul>
                    {(currentSection?.children ?? []).map((node) => (
                      <SidebarNode
                        currentPath={viewState.currentPath}
                        key={node.id}
                        level={1}
                        node={node}
                        onSelect={handleSelectDoc}
                        onToggle={handleToggle}
                        openState={openState}
                      />
                    ))}
                  </ul>
                </nav>
              </aside>

              <div className="article-stage">
                <article className="article-card">
                  {viewState.currentPath ? (
                    articleExists ? (
                      renderBlocks(articleBlocks, viewState.currentPath)
                    ) : (
                      <NotFoundArticle currentPath={viewState.currentPath} />
                    )
                  ) : currentSection ? (
                    <SectionOverview section={currentSection} onSelectDoc={handleSelectDoc} />
                  ) : null}
                </article>
              </div>

              {viewState.currentPath && articleExists ? (
                <aside className="toc-dock">
                  <div className="toc-card">
                    {headings.length ? (
                      <ul className="toc-list">
                        {headings.map((heading) => (
                          <li className={`toc-level toc-level-${heading.level}`} key={`${heading.anchor}-${heading.text}`}>
                            <a href={`#${heading.anchor}`}>{heading.text}</a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="toc-empty">当前页面没有 H1-H3 标题。</p>
                    )}
                  </div>
                </aside>
              ) : null}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
