# My Blog

一个基于 Markdown 的静态博客站点，支持：

- 自动解析根目录 `index.md` 生成折叠导航
- 渲染 Markdown、GitHub Flavored Markdown 与 LaTeX 公式
- 显示页内 H1-H3 导航
- 使用 GitHub Actions 自动部署到 GitHub Pages

## 内容组织

根目录的 `index.md` 负责定义站点导航，格式示例：

```md
- 分类:
    - 子分类:
        - 文章标题: Folder/Post.md
```

其中 `Folder/Post.md` 是相对于仓库根目录的 Markdown 文件路径。

## 本地开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## GitHub Pages 部署

1. 把仓库推送到 GitHub，并确保默认分支是 `main`
2. 在 GitHub 仓库设置中打开 `Settings -> Pages`
3. `Source` 选择 `GitHub Actions`
4. 每次推送到 `main` 后，`.github/workflows/deploy.yml` 会自动构建并部署

## 注意

- 当前 `index.md` 中引用的很多 Markdown 文件尚未加入仓库，页面会把这些缺失文件列出来，但不会阻止站点构建
- 新增或修改 Markdown 文件后，重新运行开发服务器或重新构建即可看到更新
