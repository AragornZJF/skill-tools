#!/usr/bin/env node
/**
 * gen_scene.mjs — 把简化规格（nodes + edges）转成合法的 Excalidraw scene JSON。
 *
 * 用法:
 *   node gen_scene.mjs scene.json     # 读取规格文件，输出单行压缩 JSON {elements, appState}
 *   node gen_scene.mjs --demo         # 输出一个示例流程图
 *
 * 规格格式:
 * {
 *   "background": "#ffffff",                 // 可选，画布背景色
 *   "nodes": [
 *     { "id": "a", "type": "rectangle", "label": "开始" },                        // 自动纵向布局
 *     { "id": "b", "type": "diamond",   "label": "已登录?", "x": 100, "y": 260,
 *       "width": 160, "height": 80, "backgroundColor": "#a5d8ff" }               // 手动布局
 *   ],
 *   "edges": [
 *     { "from": "a", "to": "b", "label": "下一步" }
 *   ]
 * }
 *
 * 支持 type: rectangle | ellipse | diamond | text
 * 未指定 x/y 的节点会按连线关系做简单纵向分层布局。
 */
import { readFileSync } from "node:fs";

let idCounter = 0;
const rand = () => Math.floor(Math.random() * 2 ** 31);
const newId = () =>
  `el-${Date.now().toString(36)}-${(idCounter++).toString(36)}-${rand().toString(36)}`;

function baseElement(type, x, y, extra = {}) {
  return {
    id: newId(),
    type,
    x: Math.round(x),
    y: Math.round(y),
    angle: 0,
    strokeColor: "#1e1e1e",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: rand(),
    version: 1,
    versionNonce: rand(),
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    ...extra,
  };
}

function measureText(text, fontSize) {
  const lines = String(text).split("\n");
  // CJK 及全角字符实际渲染宽度 ≈ 1.0 × fontSize（拉丁字符 ≈ 0.62 × fontSize）。
  // 低估宽度会导致声明边界小于实际文字，Excalidraw 渲染时裁掉首尾字符。
  const charWidth = (ch) => {
    const code = ch.codePointAt(0);
    return code > 0x2e7f ? fontSize : fontSize * 0.62;
  };
  const width = Math.max(
    1,
    ...lines.map((l) => [...l].reduce((w, ch) => w + charWidth(ch), 0)),
  );
  const height = lines.length * fontSize * 1.25;
  return { width: Math.ceil(width), height: Math.ceil(height) };
}

function makeText(text, opts = {}) {
  const fontSize = opts.fontSize ?? 20;
  const { width, height } = measureText(text, fontSize);
  const centerX = opts.centerX ?? 0;
  const centerY = opts.centerY ?? 0;
  return baseElement("text", centerX - width / 2, centerY - height / 2, {
    width,
    height,
    text: String(text),
    fontSize,
    fontFamily: opts.fontFamily ?? 5, // 5 = Excalifont
    textAlign: opts.textAlign ?? "center",
    verticalAlign: "middle",
    containerId: null,
    originalText: String(text),
    autoResize: true,
    lineHeight: 1.25,
    baseline: fontSize,
    strokeColor: opts.strokeColor ?? "#1e1e1e",
  });
}

/** 从节点中心向目标点方向求形状边界上的交点 */
function borderPoint(node, tx, ty) {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return [cx, cy];
  let t;
  if (node.type === "ellipse") {
    t = 1 / Math.sqrt((dx / (node.width / 2)) ** 2 + (dy / (node.height / 2)) ** 2);
  } else if (node.type === "diamond") {
    t = 1 / (Math.abs(dx) / (node.width / 2) + Math.abs(dy) / (node.height / 2));
  } else {
    t = Math.min(
      (node.width / 2) / Math.abs(dx || 1e-9),
      (node.height / 2) / Math.abs(dy || 1e-9),
    );
  }
  return [cx + dx * t, cy + dy * t];
}

/** 未指定坐标的节点：按连线 BFS 分层，纵向排列 */
function autoLayout(nodes) {
  if (!nodes.some((n) => n.x == null || n.y == null)) return;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const indeg = new Map(nodes.map((n) => [n.id, 0]));
  const children = new Map(nodes.map((n) => [n.id, []]));
  for (const e of nodes.__edges ?? []) {
    if (byId.has(e.from) && byId.has(e.to)) {
      indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
      children.get(e.from).push(e.to);
    }
  }
  const roots = nodes.filter((n) => (indeg.get(n.id) ?? 0) === 0).map((n) => n.id);
  const queue = roots.length ? roots : nodes.slice(0, 1).map((n) => n.id);
  const layer = new Map();
  for (const id of queue) layer.set(id, 0);
  const seen = new Set(queue);
  while (queue.length) {
    const id = queue.shift();
    for (const c of children.get(id)) {
      if (!seen.has(c)) {
        seen.add(c);
        layer.set(c, layer.get(id) + 1);
        queue.push(c);
      }
    }
  }
  // 没被遍历到的孤立节点追加到末尾
  let fallback = Math.max(-1, ...layer.values()) + 1;
  for (const n of nodes) if (!layer.has(n.id)) layer.set(n.id, fallback++);
  const perLayer = new Map();
  for (const n of nodes) {
    const l = layer.get(n.id);
    perLayer.set(l, (perLayer.get(l) ?? 0) + 1);
  }
  for (const n of nodes) {
    if (n.x != null && n.y != null) continue;
    const l = layer.get(n.id);
    const idx = [...nodes].filter((m) => layer.get(m.id) === l && m.x == null).indexOf(n);
    n.width = n.width ?? 180;
    n.height = n.height ?? (n.type === "diamond" ? 96 : 64);
    n.x = 400 + (idx - (perLayer.get(l) - 1) / 2) * (n.width + 60);
    n.y = 80 + l * 200;
  }
}

function makeNode(n) {
  const type = ["rectangle", "ellipse", "diamond", "text"].includes(n.type)
    ? n.type
    : "rectangle";
  const width = n.width ?? (type === "text" ? undefined : 180);
  const height = n.height ?? (type === "diamond" ? 96 : type === "text" ? undefined : 64);

  if (type === "text") {
    return [makeText(n.label ?? n.text ?? "", { centerX: n.x, centerY: n.y, fontSize: n.fontSize })];
  }

  const shape = baseElement(type, n.x, n.y, {
    width,
    height,
    backgroundColor: n.backgroundColor ?? "transparent",
    strokeColor: n.strokeColor,
    roundness: n.rounded ? { type: 3 } : null,
  });
  const els = [shape];
  if (n.label) {
    els.push(
      makeText(n.label, {
        centerX: n.x + width / 2,
        centerY: n.y + height / 2,
        fontSize: n.fontSize ?? 20,
        strokeColor: n.labelColor,
      }),
    );
  }
  return els;
}

function makeEdge(e, byId) {
  const a = byId.get(e.from);
  const b = byId.get(e.to);
  if (!a || !b) throw new Error(`edge 引用了不存在的节点: ${JSON.stringify(e)}`);
  const bcx = b.x + b.width / 2;
  const bcy = b.y + b.height / 2;
  const [x1, y1] = borderPoint(a, bcx, bcy);
  const [x2, y2] = borderPoint(b, x1, y1);
  const els = [
    baseElement("arrow", x1, y1, {
      width: x2 - x1,
      height: y2 - y1,
      points: [
        [0, 0],
        [Math.round(x2 - x1), Math.round(y2 - y1)],
      ],
      roundness: { type: 2 },
      startArrowhead: null,
      endArrowhead: e.endArrowhead ?? "arrow",
      startBinding: null,
      endBinding: null,
      lastCommittedPoint: null,
      strokeColor: e.strokeColor,
    }),
  ];
  if (e.label) {
    els.push(
      makeText(e.label, {
        centerX: (x1 + x2) / 2 + 40,
        centerY: (y1 + y2) / 2 - 18,
        fontSize: 16,
      }),
    );
  }
  return els;
}

// ---------- main ----------
const arg = process.argv[2];
if (!arg) {
  console.error("用法: node gen_scene.mjs <scene.json | --demo>");
  process.exit(1);
}

let spec;
if (arg === "--demo") {
  spec = {
    background: "#ffffff",
    nodes: [
      { id: "start", type: "rectangle", label: "打开 excalidraw.com" },
      { id: "inject", type: "rectangle", label: "注入 localStorage", backgroundColor: "#a5d8ff" },
      { id: "reload", type: "rectangle", label: "location.reload()" },
      { id: "check", type: "diamond", label: "截图正常?" },
      { id: "done", type: "rectangle", label: "完成", backgroundColor: "#b2f2bb" },
    ],
    edges: [
      { from: "start", to: "inject" },
      { from: "inject", to: "reload" },
      { from: "reload", to: "check" },
      { from: "check", to: "done", label: "是" },
      { from: "check", to: "inject", label: "否", strokeColor: "#e03131" },
    ],
  };
} else {
  spec = JSON.parse(readFileSync(arg, "utf8"));
}

const nodes = (spec.nodes ?? []).map((n) => ({ ...n }));
nodes.__edges = spec.edges ?? [];
autoLayout(nodes);

const elements = [];
const byId = new Map();
for (const n of nodes) {
  const els = makeNode(n);
  byId.set(n.id, { ...n, x: els[0].x, y: els[0].y, width: els[0].width ?? 0, height: els[0].height ?? 0 });
  elements.push(...els);
}
for (const e of spec.edges ?? []) elements.push(...makeEdge(e, byId));

const out = {
  elements,
  appState: {
    viewBackgroundColor: spec.background ?? "#ffffff",
    ...(spec.appState ?? {}),
  },
};
process.stdout.write(JSON.stringify(out)); // 单行压缩：便于整段内联进浏览器注入脚本
