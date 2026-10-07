# 微信公众号 API 与发布排错手册

> 发布失败、JSON 返回 errcode 时按本手册排查。先查「错误码速查表」，再查「踩坑记录」。

## 目录

- [API 基础](#api-基础)
- [三个端点](#三个端点)
- [错误码速查表](#错误码速查表)
- [六大踩坑记录](#六大踩坑记录)
- [wenyan CLI 速查](#wenyan-cli-速查)
- [IP 白名单与代理方案](#ip-白名单与代理方案)

## API 基础

- 基础地址：`https://api.weixin.qq.com`
- 认证方式：`access_token` 查询参数（`GET cgi-bin/token?grant_type=client_credential&appid=APPID&secret=SECRET` 获取，有效期 7200s）
- **调用方 IP 必须在公众号后台「设置与开发 → 安全中心 → IP 白名单」内**，否则报 `40164`
- AppSecret 在「设置与开发 → 基本配置」获取

## 三个端点

### 1. 获取 access_token

```
GET /cgi-bin/token?grant_type=client_credential&appid={appid}&secret={secret}
→ {"access_token": "...", "expires_in": 7200}
```

### 2. 上传封面图（永久素材）

```
POST /cgi-bin/material/add_material?access_token={token}&type=image
Content-Type: multipart/form-data; boundary={boundary}
（media 字段携带图片二进制）
→ {"media_id": "...", "url": "http://mmbiz.qpic.cn/..."}
```

草稿的 `thumb_media_id` 必填即来自此步；`url` 用于替换正文中的本地封面路径。

### 3. 创建草稿

```
POST /cgi-bin/draft/add?access_token={token}
Content-Type: application/json; charset=utf-8
{"articles": [{"title", "content"(HTML), "thumb_media_id", "need_open_comment": 0, "only_fans_can_comment": 0}]}
→ {"media_id": "..."}
```

**序列化必须 `json.dumps(data, ensure_ascii=False).encode('utf-8')`**（见坑 5）。

## 错误码速查表

| errcode | 含义 | 处理建议 |
|---|---|---|
| `45166` | invalid content（内容安全审查） | 正文含 `[text](#anchor)` 锚点链接触发。脚本已自动清理；仍报错则进一步简化内容（如删除可疑段落二分定位） |
| `45003` | title size out of limit | 标题限 **64 UTF-8 字节**（中文每字 3 字节，非 64 个字符）。脚本已自动截断；完整标题到草稿箱手动补 |
| `40007` | invalid media_id | 封面图上传失败或 media_id 为空。检查封面文件存在且为合法图片 |
| `40013` | invalid appid | AppID 错误，或工具层 token 缓存串号（见坑 1） |
| `40001` | invalid credential | AppSecret 错误或 access_token 过期 |
| `40164` | IP 不在白名单 | 把本机公网 IP 加入公众号后台白名单，或用 wenyan serve 代理 |
| `48001` | api unauthorized | 公众号**未获得该 API 权限**。草稿箱接口要求**认证服务号**；个人未认证订阅号无此权限（新号最常见） |

## 六大踩坑记录

### 坑 1：wenyan CLI `40013: invalid appid`
凭证正确却报 40013 → wenyan 的 TokenStore 缓存了过期/其他 AppID 的 token。清 `%APPDATA%/wenyan-md/token.json`；根治方案是绕过 wenyan publish、直调 API（本技能脚本即此方案）。

### 坑 2：wenyan publish exit 0 但无输出
静默退出、拿不到 media_id，无法确认是否发布。→ 发布环节不用 wenyan publish，只用 `wenyan render`（渲染与发布解耦）。

### 坑 3：`45166` 锚点链接触发内容安全
目录中 `[一、xxx](#一xxx)` 这类 anchor link 会被微信判定可疑（二分法验证：5 行能过、含 TOC 的 10 行就挂）。→ 发布前删除所有 `[text](#anchor)`。

### 坑 4：`45003` 标题限 64 字节不是 64 字符
`"Ralph 实践手册二：让 AI 自主循环编码指南（附实操）"` UTF-8 约 76 字节 → 超限；按字节逐字符回退截断。

### 坑 5：中文乱码（`ensure_ascii` 默认值）
`json.dumps` 默认 `ensure_ascii=True`，中文被转义成 `\uXXXX` 字面量，微信不解码直接显示乱码。→ 必须 `ensure_ascii=False` 且 `.encode('utf-8')`。

### 坑 6：`codehilite` 使 HTML 体积翻倍
Pygments 给每个 token 包 `<span>`，15K→30K，微信编辑器渲染异常。→ 不要启用 codehilite；高亮交给 `wenyan render -h <主题>`。

## wenyan CLI 速查

```bash
npm install -g @wenyan-md/cli   # 安装
wenyan --version                 # 验证
wenyan render -f a.md -c theme.css -h atom-one-dark --no-mac-style --no-footnote  # 本技能使用的渲染命令
wenyan theme -l                  # 列出已安装主题
```

注意：只用 `render`（Markdown→内联样式 HTML），**不用 `publish`**（坑 1/2）。

## IP 白名单与代理方案

本机 IP 不固定时，在固定 IP 服务器上启动代理：

```bash
wenyan serve --port 3000 --api-key your-api-key
```

之后把请求发到代理地址。直调 API 的场景则需自行把代理网关替换 `api.weixin.qq.com`。
