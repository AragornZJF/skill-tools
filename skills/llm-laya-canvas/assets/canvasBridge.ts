// src/agent/canvasBridge.ts
// 把 CanvasAdapter 暴露为本地 HTTP 桥的 Vite dev 中间件。
// 让 llm-laya-canvas skill 的 Python 脚本能用 GET/POST 读写真实画布。
// 放进 vite.config.ts：import { canvasBridge } from './src/agent/canvasBridge'，加到 plugins 数组。
//
// 用法（vite.config.ts）:
//   import { canvasBridge } from './src/agent/canvasBridge'
//   import { getCanvasAdapter } from './src/agent/agentState'
//   // 在拿到 canvasEditor 实例后由 Vue 组件 setCanvasAdapter(...) 写入
//   plugins: [vue(), ..., canvasBridge(getCanvasAdapter)]
//
// 约定（Python 侧默认 base = http://127.0.0.1:3000）：
//   GET  /canvas/snapshot     → CanvasSnapshot JSON
//   GET  /canvas/capabilities → CanvasCapabilities JSON
//   POST /canvas/layer        → {"action":"add"|"update"|"replace", ...}
//     add:    {"action":"add","layer":{typeKind,name?,frame?,props?}} → {"id"}
//     update: {"action":"update","id":...,"patch":{...}}
//     replace:{"action":"replace","id":...,"source":"<svg or image url>"}

import type { Connect } from 'vite';

export function canvasBridge(getAdapter: () => unknown | null) {
  return {
    name: 'canvas-bridge',
    configureServer(server: any) {
      server.middlewares.use('/canvas', async (req: any, res: any, next: any) => {
        const adapter = getAdapter() as any;
        if (!adapter) {
          res.statusCode = 503;
          return res.end('canvas not ready');
        }
        const url = req.url || '';
        try {
          if (req.method === 'GET' && url.startsWith('/snapshot')) {
            const snap = await adapter.snapshot();
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify(snap));
          }
          if (req.method === 'GET' && url.startsWith('/capabilities')) {
            const caps = adapter.capabilities();
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify(caps));
          }
          if (req.method === 'POST' && url.startsWith('/layer')) {
            let body = '';
            for await (const c of req) body += c;
            const cmd = JSON.parse(body || '{}');
            if (cmd.action === 'add') {
              const id = await adapter.addLayer(cmd.layer);
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ id }));
            }
            if (cmd.action === 'update') {
              await adapter.updateLayer(cmd.id, cmd.patch);
              return res.end('ok');
            }
            if (cmd.action === 'replace') {
              await adapter.replaceImage(cmd.id, cmd.source);
              return res.end('ok');
            }
            res.statusCode = 400;
            return res.end('unknown action');
          }
          next();
        } catch (e: any) {
          res.statusCode = 500;
          res.end(String(e?.message || e));
        }
      });
    },
  } satisfies Connect.Plugin;
}
