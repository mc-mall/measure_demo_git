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

## 原型维护范围

- 后续需求默认只修改本仓库 `demo_measure_git/` 内的静态交互原型及其 README 文档。
- 不同步修改上级项目中的正式源码、Python 服务端、SQLite 数据库或部署配置。
- 只有在需求中明确写明“修改源码”“接入服务端”“修改数据库”等要求时，才调整 `demo_measure_git/` 以外的正式实现。
- 管理后台原型功能以 `measure_admin/index.html`、`measure_admin/app.js`、`measure_admin/styles.css` 和 `measure_admin/README.md` 为准。

## 本轮新增：退换登记

管理后台新增“退换登记”模块，用于店员登记员工到店提出的换货或服装修改需求。原型覆盖员工搜索、按订单与性别带出服装及数量、逐项填写需求、保存为已登记、列表筛选、批量状态修改、详情与状态历史；状态为“已发回”后本轮结束，二次修改需重新登记。
