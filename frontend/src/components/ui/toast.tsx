import {
  type MutableRefObject,
  type PropsWithChildren,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { cx } from "@/lib/utils";

type ToastType = "error" | "success" | "info";
type ToastState = "closed" | "open" | "closing";

type ToastData = {
  id: number;
  message: string;
  type: ToastType;
  state: ToastState;
  repeatCount: number;
  signature: string;
  title?: string;
  durationMs: number;
  action?: ReactNode;
};

type ToastRefsMap = Map<number, number>;

type ToastInput = Omit<ToastData, "id" | "type" | "state" | "repeatCount" | "signature"> & {
  actionId?: string;
};

type ToastContextValue = {
  showError: (input: ToastInput) => void;
  showInfo: (input: ToastInput) => void;
  showSuccess: (input: ToastInput) => void;
};

const TOAST_AUTO_DISMISS_MS = 5_000;
const TOAST_MAX_VISIBLE = 3;

const ToastContext = createContext<ToastContextValue | null>(null);

const getDefaultToastTitle = (type: ToastType) =>
  type === "error" ? "Erro" : type === "success" ? "Sucesso" : "Informação";

const getToastCloseDurationMs = () => {
  if (typeof window === "undefined") {
    return 350;
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return 0;
  }

  const raw = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue("--panel-close-dur")
    .trim();
  const parsed = Number.parseFloat(raw);
  if (Number.isNaN(parsed)) {
    return 350;
  }

  return raw.endsWith("ms") ? parsed : parsed * 1000;
};

const Toast = ({
  message,
  type,
  state,
  repeatCount,
  title,
  action,
  onClose,
}: {
  message: string;
  type: ToastType;
  state: ToastState;
  repeatCount: number;
  title?: string;
  action?: ReactNode;
  onClose: () => void;
}) => {
  return (
    <div
      className="t-toast-slot"
      data-open={state === "open" ? "true" : "false"}
      data-testid="toast-slot"
    >
      <output
        aria-live={type === "error" ? "assertive" : "polite"}
        data-open={state === "open" ? "true" : "false"}
        data-testid="toast-item"
        data-toast-type={type}
        className={cx(
          "t-toast block w-full rounded-[12px] border p-4 shadow-2xl shadow-black/10 ring-1",
          "pointer-events-auto relative isolate bg-white",
          type === "error"
            ? "border-red-200 bg-red-50 text-red-700 ring-red-100"
            : type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 ring-emerald-100"
              : "border-sky-200 bg-sky-50 text-sky-700 ring-sky-100",
        )}
      >
        <div className="flex min-h-8 items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold leading-5">
              {title ?? getDefaultToastTitle(type)}
            </div>
            <p className="mt-0.5 text-sm leading-5 text-slate-700">{message}</p>
            {repeatCount > 1 ? (
              <p className="mt-1 text-xs font-medium leading-4 text-slate-500">
                Repetido {repeatCount} vezes
              </p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Fechar notificação"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-current/15 bg-white/70 text-base font-semibold leading-none transition-[background-color,opacity] duration-150 hover:bg-white hover:opacity-80"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {action ? (
          <div className="mt-2 flex justify-end border-t border-current/15 pt-2">{action}</div>
        ) : null}
      </output>
    </div>
  );
};

export const ToastProvider = ({ children }: PropsWithChildren) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const nextToastIdRef = useRef(1);
  const openFrameRefs = useRef<ToastRefsMap | null>(null);
  const closeTimeoutRefs = useRef<ToastRefsMap | null>(null);
  const autoDismissRefs = useRef<ToastRefsMap | null>(null);
  const getFrameMap = (refs: MutableRefObject<ToastRefsMap | null>) => {
    if (refs.current === null) {
      refs.current = new Map<number, number>();
    }
    return refs.current;
  };

  const clearToastLifecycle = useCallback((id: number) => {
    const openFrameMap = getFrameMap(openFrameRefs);
    const frame = openFrameMap.get(id);
    if (frame !== undefined) {
      window.cancelAnimationFrame(frame);
      openFrameMap.delete(id);
    }

    const closeTimeoutMap = getFrameMap(closeTimeoutRefs);
    const timeout = closeTimeoutMap.get(id);
    if (timeout !== undefined) {
      window.clearTimeout(timeout);
      closeTimeoutMap.delete(id);
    }

    const autoDismissMap = getFrameMap(autoDismissRefs);
    const autoDismiss = autoDismissMap.get(id);
    if (autoDismiss !== undefined) {
      window.clearTimeout(autoDismiss);
      autoDismissMap.delete(id);
    }
  }, []);

  const removeToast = useCallback(
    (id: number) => {
      clearToastLifecycle(id);
      setToasts((current) => current.filter((item) => item.id !== id));
    },
    [clearToastLifecycle],
  );

  const closeToast = useCallback(
    (id: number) => {
      const openFrameMap = getFrameMap(openFrameRefs);
      const frame = openFrameMap.get(id);
      if (frame !== undefined) {
        window.cancelAnimationFrame(frame);
        openFrameMap.delete(id);
      }

      setToasts((current) =>
        current.map((item) => (item.id === id ? { ...item, state: "closing" } : item)),
      );

      const closeTimeoutMap = getFrameMap(closeTimeoutRefs);
      const previousTimeout = closeTimeoutMap.get(id);
      if (previousTimeout !== undefined) {
        window.clearTimeout(previousTimeout);
      }
      const autoDismissMap = getFrameMap(autoDismissRefs);
      const autoDismiss = autoDismissMap.get(id);
      if (autoDismiss !== undefined) {
        window.clearTimeout(autoDismiss);
        autoDismissMap.delete(id);
      }

      const timeout = window.setTimeout(() => {
        closeTimeoutMap.delete(id);
        removeToast(id);
      }, getToastCloseDurationMs());
      closeTimeoutMap.set(id, timeout);
    },
    [removeToast],
  );

  useEffect(() => {
    return () => {
      const openFrameMap = getFrameMap(openFrameRefs);
      for (const frame of openFrameMap.values()) {
        window.cancelAnimationFrame(frame);
      }
      openFrameMap.clear();

      const closeTimeoutMap = getFrameMap(closeTimeoutRefs);
      for (const timeout of closeTimeoutMap.values()) {
        window.clearTimeout(timeout);
      }
      closeTimeoutMap.clear();

      const autoDismissMap = getFrameMap(autoDismissRefs);
      for (const timeout of autoDismissMap.values()) {
        window.clearTimeout(timeout);
      }
      autoDismissMap.clear();
    };
  }, []);

  const show = useCallback(
    (type: ToastType, input: ToastInput) => {
      const message = input.message.trim();
      if (!message) {
        return;
      }

      const title = input.title?.trim();
      const actionId = input.actionId ?? (input.action ? "action" : "");
      const signature = `${type}::${title ?? ""}::${message}::${actionId}`;
      const durationMs = input.durationMs ?? TOAST_AUTO_DISMISS_MS;
      let toastId: number | null = null;
      let isNewToast = false;

      setToasts((current) => {
        const existingToast = current.find(
          (toast) => toast.signature === signature && toast.state !== "closing",
        );
        if (existingToast) {
          toastId = existingToast.id;

          return current.map((item) =>
            item.id === existingToast.id
              ? {
                  ...item,
                  repeatCount: item.repeatCount + 1,
                  durationMs,
                  action: input.action,
                }
              : item,
          );
        }

        const id = nextToastIdRef.current;
        nextToastIdRef.current += 1;
        isNewToast = true;
        toastId = id;

        const nextVisibleToasts = current.slice(-(TOAST_MAX_VISIBLE - 1));
        const nextVisibleIds = new Set(nextVisibleToasts.map((toast) => toast.id));
        for (const toast of current) {
          if (!nextVisibleIds.has(toast.id)) {
            clearToastLifecycle(toast.id);
          }
        }

        return [
          ...nextVisibleToasts,
          {
            id,
            type,
            state: "closed",
            repeatCount: 1,
            signature,
            title,
            message,
            action: input.action,
            durationMs,
          },
        ];
      });

      if (toastId === null) {
        return;
      }
      const resolvedToastId = toastId;

      const autoDismissMap = getFrameMap(autoDismissRefs);
      const previousAutoDismiss = autoDismissMap.get(resolvedToastId);
      if (previousAutoDismiss !== undefined) {
        window.clearTimeout(previousAutoDismiss);
      }

      if (!isNewToast) {
        const autoDismiss = window.setTimeout(() => {
          closeToast(resolvedToastId);
        }, durationMs);
        autoDismissMap.set(resolvedToastId, autoDismiss);
        return;
      }

      const frame = window.requestAnimationFrame(() => {
        setToasts((current) =>
          current.map((item) => (item.id === resolvedToastId ? { ...item, state: "open" } : item)),
        );
        const openFrameMap = getFrameMap(openFrameRefs);
        openFrameMap.delete(resolvedToastId);
      });
      getFrameMap(openFrameRefs).set(resolvedToastId, frame);

      const autoDismiss = window.setTimeout(() => {
        closeToast(resolvedToastId);
      }, durationMs);
      autoDismissMap.set(resolvedToastId, autoDismiss);
    },
    [clearToastLifecycle, closeToast],
  );

  const showError = useCallback(
    (input: ToastInput) => {
      show("error", input);
    },
    [show],
  );

  const showSuccess = useCallback(
    (input: ToastInput) => {
      show("success", input);
    },
    [show],
  );

  const showInfo = useCallback(
    (input: ToastInput) => {
      show("info", input);
    },
    [show],
  );

  const toastStack = (
    <div
      data-testid="toast-stack"
      className="pointer-events-none fixed inset-x-0 top-4 z-[80] flex justify-center px-3 sm:right-0 sm:top-6 sm:justify-end sm:pr-4"
    >
      <div className="flex w-full max-w-sm flex-col sm:w-[min(24rem,calc(100%-1.5rem))]">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            type={toast.type}
            state={toast.state}
            repeatCount={toast.repeatCount}
            title={toast.title}
            message={toast.message}
            action={toast.action}
            onClose={() => closeToast(toast.id)}
          />
        ))}
      </div>
    </div>
  );

  const contextValue = useMemo(
    () => ({
      showError,
      showSuccess,
      showInfo,
    }),
    [showError, showSuccess, showInfo],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {typeof window !== "undefined" ? createPortal(toastStack, document.body) : null}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return value;
};
