import React from "react";

/**
 * The toasts currently on screen. Screens push into this store rather than rendering their own stack, so that
 * toasts from different screens queue up in the one stack that <ToastStack /> (see Toasts.tsx) renders.
 */

/** Accent colour of a card: cyan for the ordinary course of the game, magenta for someone dropping out. */
export type ToastTone = "cyan" | "magenta";

export interface Toast {
  id: number;
  /** Groups toasts, so a screen can drop the ones it put up without touching the others. */
  kind: string;
  /** Face character of the player the toast is about, shown as the avatar. */
  face: string;
  /** First line: who the toast is about. */
  title: string;
  /** Second line: what they did. */
  message: string;
  tone: ToastTone;
}

let toasts: Toast[] = [];
let nextId = 0;
const listeners = new Set<() => void>();

const setToasts = (next: Toast[]) => {
  toasts = next;
  listeners.forEach((listener) => listener());
};

export const pushToast = (toast: Omit<Toast, "id">) =>
  setToasts([...toasts, { ...toast, id: ++nextId }]);

export const dismissToast = (id: number) => {
  const next = toasts.filter((toast) => toast.id !== id);
  if (next.length !== toasts.length) setToasts(next);
};

/** Drops the toasts of one kind, or all of them when no kind is given. */
export const clearToasts = (kind?: string) => {
  const next =
    kind === undefined ? [] : toasts.filter((toast) => toast.kind !== kind);
  if (next.length !== toasts.length) setToasts(next);
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useToasts = () =>
  React.useSyncExternalStore(subscribe, () => toasts);
