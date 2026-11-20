#!/usr/bin/env node
/**
 * gen_scene.mjs — 把简化规格（nodes + edges）转成合法的 Excalidraw scene JSON。
 *
 * 用法:
 *   node gen_scene.mjs scene.json                 # 输出单行压缩 JSON 到 stdout
 *   node gen_scene.mjs --demo                     # 输出内置示例
 *   node gen_scene.mjs scene.json --out a.excalidraw
 *   node gen_scene.mjs scene.json --out a.json --pretty
 *   node gen_scene.mjs scene.json --no-bind       # 不绑定 text/arrow 到节点
 *
 * 规格格式:
 * {
 *   "background": "#ffffff",
 *   "nodes": [
 *     { "id": "a", "type": "rectangle", "label": "开始" },
 *     { "id": "b", "type": "diamond", "label": "已登录?", "backgroundColor": "#a5d8ff" }
 *   ],
 *   "edges": [
 *     { "from": "a", "to": "b", "label": "下一步" }
 *   ]
 * }
 *
 * 支持 type: rectangle | ellipse | diamond | text
 * 未指定 x/y 的节点会按连线关系做简单纵向分层布局。
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

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
    containerId: opts.containerId ?? null,
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
function autoLayout(nodes, edges) {
  if (!nodes.some((n) => n.x == null || n.y == null)) return;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const indeg = new Map(nodes.map((n) => [n.id, 0]));
  const children = new Map(nodes.map((n) => [n.id, []]));
  for (const e of edges) {
    if (byId.has(e.from) && byId.has(e.to) && e.from !== e.to) {
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
  // 没被遍历到的孤立节点/环上节点追加到末尾
  let fallback = Math.max(-1, ...layer.values()) + 1;
  for (const n of nodes) if (!layer.has(n.id)) layer.set(n.id, fallback++);
  const perLayer = new Map();
  for (const n of nodes) {
    const l = layer.get(n.id);
    perLayer.set(l, (perLayer.get(l) ?? 0) + 1);
  }
  const layerIndex = new Map();
  for (const n of nodes) {
    if (n.x != null && n.y != null) continue;
    const l = layer.get(n.id);
    const idx = layerIndex.get(l) ?? 0;
    layerIndex.set(l, idx + 1);
    n.width = n.width ?? 180;
    n.height = n.height ?? (n.type === "diamond" ? 96 : 64);
    n.x = 400 + (idx - (perLayer.get(l) - 1) / 2) * (n.width + 60);
    n.y = 80 + l * 200;
  }
}

function validateSpec(spec, edges) {
  const errors = [];
  const warnings = [];
  const seen = new Set();
  const byId = new Map();

  for (const [i, n] of (spec.nodes ?? []).entries()) {
    if (!n || typeof n !== "object") {
      errors.push(`nodes[${i}] 不是对象`);
      continue;
    }
    if (!n.id) errors.push(`nodes[${i}] 缺少 id`);
    else if (seen.has(n.id)) errors.push(`重复节点 id: ${n.id}`);
    else seen.add(n.id);
    if (n.id) byId.set(n.id, n);
    if (n.type && !["rectangle", "ellipse", "diamond", "text"].includes(n.type)) {
      warnings.push(`节点 ${n.id} 的 type "${n.type}" 无效，已回退为 rectangle`);
    }
    if (n.width != null && n.width <= 0) errors.push(`节点 ${n.id} 的 width 必须 > 0`);
    if (n.height != null && n.height <= 0) errors.push(`节点 ${n.id} 的 height 必须 > 0`);
  }

  for (const [i, e] of edges.entries()) {
    if (!e || typeof e !== "object") {
      errors.push(`edges[${i}] 不是对象`);
      continue;
    }
    if (!byId.has(e.from)) errors.push(`edges[${i}] 引用了不存在的 from 节点: ${e.from}`);
    if (!byId.has(e.to)) errors.push(`edges[${i}] 引用了不存在的 to 节点: ${e.to}`);
    if (e.from === e.to) warnings.push(`edges[${i}] 是自环，当前不会绘制可见箭头`);
  }

  return { errors, warnings };
}

function makeNode(n, bind) {
  const type = ["rectangle", "ellipse", "diamond", "text"].includes(n.type)
    ? n.type
    : "rectangle";
  const width = n.width ?? (type === "text" ? undefined : 180);
  const height = n.height ?? (type === "diamond" ? 96 : type === "text" ? undefined : 64);

  if (type === "text") {
    const text = makeText(n.label ?? n.text ?? "", {
      centerX: n.x,
      centerY: n.y,
      fontSize: n.fontSize,
    });
    return { shape: text, label: null, isShape: false };
  }

  const shape = baseElement(type, n.x, n.y, {
    width,
    height,
    backgroundColor: n.backgroundColor ?? "transparent",
    strokeColor: n.strokeColor ?? "#1e1e1e",
    roundness: n.rounded ? { type: 3 } : (n.roundness ?? null),
  });
  let label = null;
  if (n.label) {
    label = makeText(n.label, {
      centerX: n.x + width / 2,
      centerY: n.y + height / 2,
      fontSize: n.fontSize ?? 20,
      strokeColor: n.labelColor ?? "#1e1e1e",
      containerId: bind ? shape.id : null,
    });
    if (bind) shape.boundElements = [{ type: "text", id: label.id }];
  }
  return { shape, label, isShape: true };
}

function makeEdge(e, byId, bind) {
  const a = byId.get(e.from);
  const b = byId.get(e.to);
  if (!a || !b) throw new Error(`edge 引用了不存在的节点: ${JSON.stringify(e)}`);
  const bcx = b.x + b.width / 2;
  const bcy = b.y + b.height / 2;
  const [x1, y1] = borderPoint(a, bcx, bcy);
  const [x2, y2] = borderPoint(b, x1, y1);
  const startBinding =
    bind && a.isShape
      ? { elementId: a.shape.id, focus: 0, gap: 4, fixedPoint: null }
      : null;
  const endBinding =
    bind && b.isShape
      ? { elementId: b.shape.id, focus: 0, gap: 4, fixedPoint: null }
      : null;
  const arrow = baseElement("arrow", x1, y1, {
    width: x2 - x1,
    height: y2 - y1,
    points: [
      [0, 0],
      [Math.round(x2 - x1), Math.round(y2 - y1)],
    ],
    roundness: { type: 2 },
    startArrowhead: e.startArrowhead ?? null,
    endArrowhead: e.endArrowhead ?? "arrow",
    startBinding,
    endBinding,
    lastCommittedPoint: null,
    strokeColor: e.strokeColor ?? "#1e1e1e",
  });
  let label = null;
  if (e.label) {
    const [ox, oy] = e.labelOffset ?? [40, -18];
    label = makeText(e.label, {
      centerX: (x1 + x2) / 2 + ox,
      centerY: (y1 + y2) / 2 + oy,
      fontSize: e.fontSize ?? 16,
      strokeColor: e.labelColor ?? "#1e1e1e",
    });
  }
  return { arrow, label };
}

function buildScene(spec, { bind = true } = {}) {
  const nodes = (spec.nodes ?? []).map((n) => ({ ...n }));
  const edges = spec.edges ?? [];
  autoLayout(nodes, edges);

  const shapes = [];
  const arrows = [];
  const labels = [];
  const byId = new Map();
  const nodeRefs = new Map();
  const edgeRefs = [];

  for (const n of nodes) {
    const { shape, label, isShape } = makeNode(n, bind);
    const ref = { ...n, shape, label, isShape };
    byId.set(n.id, ref);
    nodeRefs.set(n.id, ref);
    shapes.push(shape);
    if (label) labels.push(label);
  }
  for (const e of edges) {
    const { arrow, label } = makeEdge(e, byId, bind);
    edgeRefs.push({ arrow, label });
    arrows.push(arrow);
    if (label) labels.push(label);
  }

  // 层级：shape → arrow → label，避免箭头压住节点文字
  const elements = [...shapes, ...arrows, ...labels];
  const scene = {
    elements,
    appState: {
      viewBackgroundColor: spec.background ?? "#ffffff",
      ...(spec.appState ?? {}),
    },
  };
  return { scene, nodeRefs, edgeRefs, nodes, edges };
}

function resolveEdgeRefs(edgeRefs, edges, refs) {
  const out = [];
  for (const r of refs ?? []) {
    const idx = typeof r === "number" ? r : edges.findIndex((e) => e.id === r);
    const ref = edgeRefs[idx];
    if (!ref) throw new Error(`批次引用了不存在的边: ${r}`);
    out.push(ref);
  }
  return out;
}

/** 按 spec.batches 把完整场景切成多个可逐批追加的元素组 */
function buildBatches(spec, built) {
  const { scene, nodeRefs, edgeRefs, edges } = built;
  const batches = (spec.batches ?? []).map((b, i) => {
    const nodeRefsInBatch = (b.nodes ?? []).map((id) => {
      const ref = nodeRefs.get(id);
      if (!ref) throw new Error(`批次 ${i + 1} 引用了不存在的节点: ${id}`);
      return ref;
    });
    const edgeRefsInBatch = resolveEdgeRefs(edgeRefs, edges, b.edges ?? b.edgeIds);

    // 依赖顺序：shape → arrow → label，保证绑定目标已在本批或之前批次出现
    const shapes = nodeRefsInBatch.map((r) => r.shape).filter(Boolean);
    const arrows = edgeRefsInBatch.map((r) => r.arrow).filter(Boolean);
    const labels = [
      ...nodeRefsInBatch.map((r) => r.label).filter(Boolean),
      ...edgeRefsInBatch.map((r) => r.label).filter(Boolean),
    ];
    const elements = [...shapes, ...arrows, ...labels];
    return {
      name: b.name ?? `batch-${i + 1}`,
      nodeIds: b.nodes ?? [],
      elements,
      appState: scene.appState,
    };
  });

  const covered = new Set(batches.flatMap((b) => b.elements.map((e) => e.id)));
  const missing = scene.elements.filter((e) => !covered.has(e.id));
  if (missing.length) {
    console.error(
      `WARN: batches 未覆盖 ${missing.length} 个元素（前 3 个类型: ${missing.slice(0, 3).map((e) => e.type).join(",")}）`,
    );
  }
  return { full: scene, batches };
}

function toExcalidrawFile(scene) {
  return {
    type: "excalidraw",
    version: 2,
    source: "https://excalidraw.com",
    elements: scene.elements,
    appState: { ...scene.appState, gridSize: null },
    files: {},
  };
}

const demoSpec = {
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

// ---------- main ----------
const args = process.argv.slice(2);
let arg = null;
let out = null;
let pretty = false;
let bind = true;
let batchesMode = false;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--demo") arg = "--demo";
  else if (a === "--out") out = args[++i];
  else if (a === "--pretty") pretty = true;
  else if (a === "--no-bind") bind = false;
  else if (a === "--batches") batchesMode = true;
  else if (a === "--scene") arg = args[++i];
  else if (!a.startsWith("-") && arg == null) arg = a;
  else {
    console.error(`未知参数: ${a}`);
    process.exit(1);
  }
}

if (!arg) {
  console.error("用法: node gen_scene.mjs <scene.json | --demo> [--out file] [--pretty] [--no-bind] [--batches]");
  process.exit(1);
}
if (out && !pretty && out.endsWith(".excalidraw")) pretty = false;

let spec;
if (arg === "--demo") {
  spec = demoSpec;
} else {
  try {
    spec = JSON.parse(readFileSync(arg, "utf8"));
  } catch (e) {
    console.error(`读取规格失败 ${arg}: ${e.message}`);
    process.exit(1);
  }
}

const edges = spec.edges ?? [];
const { errors, warnings } = validateSpec(spec, edges);
for (const w of warnings) console.error(`WARN: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`ERROR: ${e}`);
  process.exit(1);
}

const built = buildScene(spec, { bind });
const scene = built.scene;
let payload;
if (batchesMode) {
  if (!spec.batches?.length) {
    console.error("ERROR: --batches 需要规格中包含非空的 batches 数组");
    process.exit(1);
  }
  payload = buildBatches(spec, built);
} else if (out?.endsWith(".excalidraw")) {
  payload = toExcalidrawFile(scene);
} else {
  payload = scene;
}
const json = pretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);

if (out) {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, json);
  const summary = batchesMode
    ? `${payload.batches.length} batches, ${scene.elements.length} elements`
    : `${scene.elements.length} elements`;
  console.log(`wrote ${out} (${summary}${bind ? ", bound" : ""})`);
} else {
  process.stdout.write(json);
}
