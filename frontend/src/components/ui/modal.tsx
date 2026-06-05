import { useEffect, useId, useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  showCloseButton?: boolean;
  children: ReactNode;
  lockBody?: "always" | "auto" | "never";
  onClose: () => void;
};

let activeModalCount = 0;
let lockedBodyOverflow = "";
let lockedBodyPaddingRight = "";

const focusableSelector =
  'a[href], area[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

const getFocusableElements = (container: HTMLElement) => {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) =>
      !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true",
  );
};

const lockBodyScroll = () => {
  if (activeModalCount === 0) {
    const body = document.body;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    lockedBodyOverflow = body.style.overflow;
    lockedBodyPaddingRight = body.style.paddingRight;

    body.style.overflow = "hidden";
    body.style.touchAction = "none";
    body.style.overscrollBehavior = "none";

    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  activeModalCount += 1;
};

const unlockBodyScroll = () => {
  activeModalCount = Math.max(0, activeModalCount - 1);

  if (activeModalCount === 0) {
    const body = document.body;

    body.style.overflow = lockedBodyOverflow;
    body.style.paddingRight = lockedBodyPaddingRight;
    body.style.touchAction = "";
    body.style.overscrollBehavior = "";
  }
};

export const Modal = ({
  isOpen,
  title,
  subtitle,
  showCloseButton,
  lockBody = "always",
  children,
  onClose,
}: ModalProps) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const dialogId = useId();
  const dialogTitleId = `${dialogId}-title`;
  const dialogDescriptionId = `${dialogId}-description`;
  const scrollLockActiveRef = useRef(false);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  const setScrollLock = (shouldLockBody: boolean) => {
    if (shouldLockBody && !scrollLockActiveRef.current) {
      lockBodyScroll();
      scrollLockActiveRef.current = true;
    }
    if (!shouldLockBody && scrollLockActiveRef.current) {
      unlockBodyScroll();
      scrollLockActiveRef.current = false;
    }
  };

  const evaluateScrollLock = (mode: "always" | "auto" | "never") => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    if (mode === "always") {
      setScrollLock(true);
      return;
    }

    if (mode === "never") {
      setScrollLock(false);
      return;
    }

    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    requestAnimationFrame(() => {
      const hasOverflow = dialog.scrollHeight > dialog.clientHeight;
      setScrollLock(hasOverflow);
    });
  };

  // Keep background scroll lock stable while modal is visible.
  useLayoutEffect(() => {
    const mode = lockBody;

    if (!isOpen) {
      setScrollLock(false);
      return;
    }

    evaluateScrollLock(mode);

    if (typeof window === "undefined") {
      return;
    }

    const onResize = () => {
      evaluateScrollLock(mode);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [lockBody, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;

    const frame = window.requestAnimationFrame(() => {
      const focusables = getFocusableElements(dialog);
      const firstFocusable = focusables[0];
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        dialog.focus();
      }
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      return;
    }

    const previous = previouslyFocusedElementRef.current;
    if (previous && document.contains(previous)) {
      previous.focus();
    }
    previouslyFocusedElementRef.current = null;
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (scrollLockActiveRef.current) {
        unlockBodyScroll();
        scrollLockActiveRef.current = false;
      }

      previouslyFocusedElementRef.current = null;
    };
  }, []);

  if (!isOpen) {
    return null;
  }

  const modal = (
    <div
      className="t-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 overscroll-none is-open"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <dialog
        ref={dialogRef}
        open
        id={dialogId}
        aria-labelledby={dialogTitleId}
        aria-describedby={subtitle ? dialogDescriptionId : undefined}
        aria-modal={true}
        tabIndex={-1}
        className="t-modal relative flex w-[calc(100%-2rem)] sm:w-full max-w-[448px] max-h-[min(90vh,680px)] flex-col overflow-hidden rounded-[12px] border border-financy-border bg-financy-surface shadow-2xl is-open"
        onKeyDown={(event) => {
          if (event.key !== "Tab") {
            return;
          }

          const dialog = dialogRef.current;
          if (!dialog) {
            return;
          }

          const focusables = getFocusableElements(dialog);
          if (focusables.length === 0) {
            event.preventDefault();
            dialog.focus();
            return;
          }

          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          const target = event.target as HTMLElement;

          if (event.shiftKey) {
            if (target === first || !dialog.contains(target)) {
              event.preventDefault();
              last?.focus();
            }
            return;
          }

          if (target === last || !dialog.contains(target)) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <div className="shrink-0 px-5 pt-5 sm:px-[25px] sm:pt-[25px]">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex-1 pr-4">
              <h2
                id={dialogTitleId}
                className="text-base font-semibold leading-6 text-financy-text"
              >
                {title}
              </h2>
              {subtitle ? (
                <p
                  id={dialogDescriptionId}
                  className="mt-0.5 text-sm font-normal text-financy-muted"
                >
                  {subtitle}
                </p>
              ) : null}
            </div>
            {showCloseButton && (
              <button
                aria-label="Fechar"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-financy-field-border bg-financy-surface text-financy-muted transition-[background-color,color,border-color] duration-150 hover:bg-financy-surface-hover"
                onClick={onClose}
                type="button"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div
          data-modal-scroll-root="true"
          className="min-h-0 overflow-y-auto px-5 pb-5 sm:px-[25px] sm:pb-[25px]"
        >
          {children}
        </div>
      </dialog>
    </div>
  );

  return createPortal(modal, document.body);
};
