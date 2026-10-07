// src/agent/canvasTypes.ts
// 通用画布接口（skill 只认这些，不碰任何画布库概念）。
// 来源：~/.workbuddy/skills/llm-laya-canvas/references/canvas_adapter.md §1。
// 放进 canva-editor 后，由 designAdapter.ts 实现，bridge / Python 侧消费。

export type TypeKind = 'text' | 'image' | 'shape' | 'group' | 'other';

export interface CanvasFrame {
  left: number;
  top: number;
  width: number;
  height: number;
  angle: number;
  opacity: number;
}

export interface CanvasLayer {
  id: string;
  type: string; // 原生类型，如 'textbox' / 'rect' / 'image'
  typeKind: TypeKind;
  name: string;
  visible: boolean;
  locked: boolean;
  frame: CanvasFrame;
  props: Record<string, unknown>; // text 有 text/fontSize，image 有 src
  summary: string; // 给人 / 模型看的摘要
}

export interface CanvasSelection {
  mode: 'none' | 'one' | 'multiple';
  ids: string[];
  typeKind?: TypeKind;
}

export interface CanvasSnapshot {
  canvas: { width: number; height: number; background: string; zoom: number };
  layers: CanvasLayer[]; // 已按视觉层序排好，顶层在前
  selection: CanvasSelection;
  meta: { truncated?: boolean; total?: number; adapterVersion: string };
}

// 写操作入参
export interface LayerInput {
  typeKind?: TypeKind;
  name?: string;
  frame?: Partial<CanvasFrame>;
  props?: Record<string, unknown>; // text: {text,fontSize,fill}; image: {src}; shape: {fill}
  place?: 'top' | 'bottom';
}

// 只允许白名单属性（见 designAdapter.capabilities）。出现未知属性 → 拒绝。
export interface LayerPatch {
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  angle?: number;
  opacity?: number;
  text?: string;
  fontSize?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fontFamily?: string;
  textAlign?: string;
}

export interface CanvasCapabilities {
  layerTypes: string[];
  writableProps: Record<string, string[]>;
  atomicCommit: boolean;
  replaceImage: boolean;
  layerOrder: boolean;
  designTokens: boolean;
}

export interface CanvasAdapter {
  snapshot(opts?: { limit?: number; includeHidden?: boolean }): Promise<CanvasSnapshot>;
  selection(): Promise<CanvasSelection>;
  getLayer(id: string): Promise<CanvasLayer | null>;
  updateLayer(id: string, patch: LayerPatch): Promise<void>;
  addLayer(layer: LayerInput): Promise<string>;
  replaceImage(id: string, source: string): Promise<void>;
  capabilities(): CanvasCapabilities;
  beginBatch?(label: string): void;
  endBatch?(commit: boolean): void;
  ready?(): Promise<void>;
}
