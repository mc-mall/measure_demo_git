# MC 量体三端交互原型

本仓库包含管理后台、裁缝端和客户端三个独立静态入口。

根目录 `index.html` 提供三端统一预览入口，GitHub Pages 通过 `.github/workflows/deploy-pages.yml` 自动部署静态文件。

## 访问入口

- 管理后台：`/measure_admin/`
- 裁缝端：`/tailor/`
- 客户端：`/client/`

## 本地运行

在仓库根目录执行：

```bash
python3 -m http.server 8767
```

然后访问：

```text
http://localhost:8767/measure_admin/
http://localhost:8767/tailor/
http://localhost:8767/client/
```

各端当前均为静态交互原型，不连接生产数据库。详细交互和数据规则见各目录内的 README。
