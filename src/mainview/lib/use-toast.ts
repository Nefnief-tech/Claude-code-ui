import { useSyncExternalStore } from "react";

export type ToastType = "success" | "error" | "info";

export type Toast = {
	id: string;
	message: string;
	type: ToastType;
};

type Listener = () => void;

let toasts: Toast[] = [];
let listeners: Listener[] = [];
let nextId = 0;

function emitChange() {
	for (const fn of listeners) fn();
}

function subscribe(fn: Listener) {
	listeners = [...listeners, fn];
	return () => {
		listeners = listeners.filter((l) => l !== fn);
	};
}

function getSnapshot(): Toast[] {
	return toasts;
}

export function addToast(message: string, type: ToastType = "info", duration = 3000) {
	const id = String(++nextId);
	toasts = [...toasts, { id, message, type }];
	emitChange();
	if (duration > 0) {
		setTimeout(() => removeToast(id), duration);
	}
}

export function removeToast(id: string) {
	toasts = toasts.filter((t) => t.id !== id);
	emitChange();
}

export function useToast() {
	const toasts = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
	return { toasts, addToast, removeToast };
}
