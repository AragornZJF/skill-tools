// src/agent/designAdapter.ts
// canva-editor 的 CanvasAdapter 实现：把 fabric 画布包成 llm-laya-canvas skill 认识的接口。
// 对应 docs/AGENT-SDK.md §④（该 SDK 尚未实现，本文件自带实现）。
// 安全：属性白名单（未知属性直接拒绝）、数值钳制、写操作走 object:modified 进撤销栈。
//
// 与 skill 原始骨架的差异（针对本项目修正）：
//  - 不再依赖 (window as any).fabric，改为直接 import { fabric } from 'fabric'
//  - addLayer 支持 text / image / shape 三类（原骨架只支持 textbox）
//  - snapshot 排除结构层（workspace / 遮罩），只返回设计元素
//  - updateLayer 按 capabilities 白名单拒绝未知属性

import { fabric } from 'fabric';
import type {
  CanvasAdapter,
  CanvasLayer,
  CanvasSnapshot,
  LayerInput,
  LayerPatch,
  TypeKind,
} from './canvasTypes';

// 结构层 id（页面底板 / 遮罩），不是设计内容，快照里排除
const STRUCT_IDS = new Set(['workspace', 'coverMask', 'topMask', 'bottomMask']);

const KIND_MAP: Record<string, TypeKind> = {
  textbox: 'text',
  'i-text': 'text',
  text: 'text',
  image: 'image',
  rect: 'shape',
  circle: 'shape',
  triangle: 'shape',
  line: 'shape',
  path: 'shape',
  group: 'group',
};

export function createDesignAdapter(editor: any): CanvasAdapter {
  const canvas = editor.fabricCanvas;
  if (!canvas) throw new Error('Editor 尚未 init，无法创建适配器');

  function normalize(obj: any): CanvasLayer {
    const type = obj.type ?? 'other';
    const kind = KIND_MAP[type] ?? 'other';
    const rect = obj.getBoundingRect(true); // 绝对包围盒
    const zoom = canvas.getZoom();
    return {
      id: obj.id,
      type,
      typeKind: kind,
      name: obj.name || type,
      visible: obj.visible !== false,
      locked: !obj.selectable || !!obj.lockMovementX,
      frame: {
        left: rect.left / zoom,
        top: rect.top / zoom,
        width: rect.width / zoom,
        height: rect.height / zoom,
        angle: obj.angle ?? 0,
        opacity: obj.opacity ?? 1,
      },
      props:
        kind === 'text'
          ? { text: obj.text, fontSize: obj.fontSize, fill: obj.fill, textAlign: obj.textAlign }
          : kind === 'image'
          ? { src: obj._element?.src }
          : { fill: obj.fill },
      summary: summarize(obj, kind),
    };
  }

  function summarize(obj: any, kind: TypeKind) {
    if (kind === 'text') return `[文本] "${obj.text}" ${obj.fontSize}px ${obj.fill}`;
    if (kind === 'image') return `[图片] ${obj.name || ''}`;
    return `[${kind}]`;
  }

  // 写操作前的属性白名单校验：出现白名单外属性 → 拒绝（不是忽略）
  const caps = {
    text: [
      'text',
      'fontSize',
      'fontFamily',
      'fill',
      'textAlign',
      'left',
      'top',
      'width',
      'height',
      'angle',
      'opacity',
    ],
    image: ['left', 'top', 'width', 'height', 'angle', 'opacity'],
    shape: ['fill', 'stroke', 'strokeWidth', 'left', 'top', 'width', 'height', 'angle', 'opacity'],
    group: ['left', 'top', 'width', 'height', 'angle', 'opacity'],
  };
  const ALLOWED = new Set(Object.values(caps).flat());

  function validatePatch(patch: LayerPatch) {
    for (const key of Object.keys(patch)) {
      if (!ALLOWED.has(key)) throw new Error(`属性不在白名单，已拒绝：${key}`);
    }
  }

  function clamp(patch: LayerPatch) {
    const w = canvas.getWidth() / canvas.getZoom();
    const h = canvas.getHeight() / canvas.getZoom();
    const out: LayerPatch = { ...patch };
    if (typeof out.left === 'number') out.left = Math.min(Math.max(out.left, 0), w);
    if (typeof out.top === 'number') out.top = Math.min(Math.max(out.top, 0), h);
    if (typeof out.width === 'number') out.width = Math.max(out.width, 1);
    if (typeof out.height === 'number') out.height = Math.max(out.height, 1);
    if (typeof out.fontSize === 'number') out.fontSize = Math.min(Math.max(out.fontSize, 4), 400);
    if (typeof out.opacity === 'number') out.opacity = Math.min(Math.max(out.opacity, 0), 1);
    if (typeof out.angle === 'number') out.angle = ((out.angle % 360) + 360) % 360;
    return out;
  }

  function find(id: string) {
    return canvas.getObjects().find((o: any) => o.id === id);
  }

  return {
    async snapshot(_opts) {
      const objects = canvas.getObjects().filter((o: any) => o.id && !STRUCT_IDS.has(o.id));
      const layers = [...objects].reverse().map(normalize); // fabric 底层在前 → 倒序，顶层在前
      const active = canvas.getActiveObjects();
      const snap: CanvasSnapshot = {
        canvas: {
          width: canvas.getWidth() / canvas.getZoom(),
          height: canvas.getHeight() / canvas.getZoom(),
          background: String(canvas.backgroundColor ?? '#ffffff'),
          zoom: canvas.getZoom(),
        },
        layers,
        selection: {
          mode: active.length === 0 ? 'none' : active.length === 1 ? 'one' : 'multiple',
          ids: active.map((o: any) => o.id),
          typeKind: active.length === 1 ? normalize(active[0]).typeKind : undefined,
        },
        meta: { truncated: false, total: layers.length, adapterVersion: '1.0.0' },
      };
      return snap;
    },

    async selection() {
      return (await this.snapshot()).selection;
    },

    async getLayer(id) {
      const obj = find(id);
      return obj ? normalize(obj) : null;
    },

    async updateLayer(id, patch) {
      const obj = find(id);
      if (!obj) throw new Error(`图层不存在：${id}`);
      validatePatch(patch);
      obj.set(clamp(patch));
      canvas.requestRenderAll();
      canvas.fire('object:modified', { target: obj }); // 进撤销栈（HistoryPlugin）
    },

    async addLayer(layer: LayerInput) {
      const frame = layer.frame || {};
      let obj: any;
      if (layer.typeKind === 'image' && layer.props?.src) {
        obj = await new Promise<any>((resolve, reject) => {
          fabric.Image.fromURL(
            String(layer.props!.src),
            (img: any) => (img ? resolve(img) : reject(new Error('图片加载失败'))),
            { crossOrigin: 'anonymous' }
          );
        });
        if (frame.width) obj.scaleToWidth(frame.width);
      } else if (layer.typeKind === 'shape') {
        obj = new fabric.Rect({
          fill: (layer.props?.fill as string) || '#cccccc',
          width: frame.width || 120,
          height: frame.height || 120,
        });
      } else {
        obj = new fabric.Textbox(String(layer.props?.text ?? ''), {
          fontSize: (layer.props?.fontSize as number) || 24,
          fill: (layer.props?.fill as string) || '#000000',
          width: frame.width || 200,
          textAlign: (layer.props?.textAlign as string) || 'left',
        });
      }
      const id = `lay_${Date.now()}_${Math.floor(Math.random() * 1e4)}`;
      obj.id = id;
      obj.set({
        left: frame.left ?? 0,
        top: frame.top ?? 0,
        angle: frame.angle ?? 0,
        opacity: frame.opacity ?? 1,
      });
      canvas.add(obj);
      if (layer.place === 'bottom') canvas.sendToBack(obj);
      canvas.requestRenderAll();
      canvas.fire('object:modified', { target: obj });
      return id;
    },

    async replaceImage(id, source) {
      const obj = find(id);
      if (!obj) throw new Error(`图层不存在：${id}`);
      const img: any = await new Promise((resolve, reject) => {
        fabric.Image.fromURL(
          source,
          (im: any) => (im ? resolve(im) : reject(new Error('图片加载失败'))),
          { crossOrigin: 'anonymous' }
        );
      });
      img.set({ left: obj.left, top: obj.top, scaleX: obj.scaleX, scaleY: obj.scaleY });
      img.id = id;
      canvas.remove(obj);
      canvas.add(img);
      canvas.requestRenderAll();
      canvas.fire('object:modified', { target: img });
    },

    capabilities() {
      return {
        layerTypes: ['text', 'image', 'shape', 'group'],
        writableProps: caps,
        atomicCommit: true,
        replaceImage: true,
        layerOrder: true,
        designTokens: false,
      };
    },

    beginBatch() {
      (canvas as any).renderOnAddRemove = false;
      (canvas as any).__batchDepth = ((canvas as any).__batchDepth ?? 0) + 1;
    },
    endBatch(commit) {
      (canvas as any).renderOnAddRemove = true;
      canvas.renderAll();
      if (commit) canvas.fire('object:modified'); // 整体入栈一次
    },

    async ready() {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    },
  };
}
