"use client";

/**
 * 3D 沉浸模式外部 store（plan 003 §3-2 / §4-3 + 用户 2026-09-11 转向：放弃 classic view，只 3D）。
 *
 * 设计：useSyncExternalStore 订阅的轻量 store。
 * - view('globe' | 'craft' | 'swing') - 3D 内部视图
 * - phase('idle' | 'transition') - 过渡锁
 * - webglOk - WebGL 探测结果
 *
 * 动作：
 * - requestEnter(room) - 进入产品房间（globe → room）
 * - requestExit() - 退出房间回到 globe
 *
 * 没有 mode：站点只有 3D（用户 2026-09-11）。setMode 保留为 no-op 以兼容旧调用方，
 * 但不再切换到 classic。
 *
 * Hash 语义：
 * - mount 时读 location.hash：#craft / #swing → 进对应房间
 * - view 变更时 history.replaceState 回写 hash
 */

import { useSyncExternalStore } from "react";

export type View = "globe" | "craft" | "swing";
export type Phase = "idle" | "transition";

type State = {
  view: View;
  phase: Phase;
  webglOk: boolean;
  /** 用户 v20：双击面板进入详细模式 popup；null = 在 3D 中 */
  detailView: { product: "craft" | "swing"; panelIndex: number } | null;
};

const listeners = new Set<() => void>();

let state: State = {
  view: "globe",
  phase: "idle",
  webglOk: true,
  detailView: null,
};

function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot() {
  return state;
}

export function getViewState() {
  return state;
}

export function getDetailView() {
  return state.detailView;
}

export function requestEnter(room: "craft" | "swing") {
  if (state.phase !== "idle") return;
  setState({ view: room, phase: "transition" });
  setTimeout(() => setState({ phase: "idle" }), 0);
  syncHash();
}

export function requestExit() {
  if (state.phase !== "idle") return;
  setState({ view: "globe", phase: "transition" });
  setTimeout(() => setState({ phase: "idle" }), 0);
  syncHash();
}

/** 保留以兼容 SceneManager 等旧调用；现在 no-op（用户 2026-09-11 转向后只有 3D）。 */
export function setMode(_m: "3d" | "classic") {
  /* no-op: classic view 已废弃 */
}

export function setWebglOk(ok: boolean) {
  if (state.webglOk === ok) return;
  setState({ webglOk: ok });
}

export function setPhase(p: Phase) {
  setState({ phase: p });
}

/** 用户 2026-09-11 v20：双击面板打开详细模式 popup */
export function requestDetail(product: "craft" | "swing", panelIndex: number) {
  setState({ detailView: { product, panelIndex } });
}

export function closeDetail() {
  setState({ detailView: null });
}

/** 翻到下一页 / 上一页（detail popup 用） */
export function navDetail(delta: number) {
  if (!state.detailView) return;
  setState({
    detailView: { ...state.detailView, panelIndex: state.detailView.panelIndex + delta },
  });
}

function syncHash() {
  if (typeof window === "undefined") return;
  const hash =
    state.view === "craft"
      ? "#craft"
      : state.view === "swing"
        ? "#swing"
        : "";
  const current = window.location.hash;
  if (current === hash) return;
  try {
    window.history.replaceState(null, "", hash || window.location.pathname);
  } catch {
    /* history may be unavailable */
  }
}

/** mount 时读 hash 初始化 view */
export function initFromHash() {
  if (typeof window === "undefined") return;
  const h = window.location.hash.toLowerCase();
  if (h === "#craft") setState({ view: "craft" });
  else if (h === "#swing") setState({ view: "swing" });
}

export function useThreeView(): View {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot).view;
}

export function useThreePhase(): Phase {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot).phase;
}

export function useThreeWebglOk(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot).webglOk;
}

export function useDetailView(): State["detailView"] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot).detailView;
}