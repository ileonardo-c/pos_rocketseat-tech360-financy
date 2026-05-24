import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type ModalState = "closed" | "open" | "closing";

type ModalProps = {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
};

const getCloseDurationMs = () => {
  if (typeof window === "undefined") return 150;
  const raw = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue("--modal-close-dur");
  const parsed = Number.parseFloat(raw);
  return Number.isNaN(parsed) ? 150 : parsed;
};

export const Modal = ({ isOpen, title, children, onClose }: ModalProps) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [modalState, setModalState] = useState<ModalState>("closed");
  const timeoutRef = useRef<number | null>(null);

  // Sync isOpen prop → animated state machine (t-modal pattern from transitions-dev)
  useEffect(() => {
    if (isOpen) {
      setModalState("open");

      const dialog = dialogRef.current;
      if (dialog && !dialog.open) {
        dialog.showModal();
      }
    } else if (modalState === "open") {
      // Start closing animation
      setModalState("closing");

      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        setModalState("closed");
        timeoutRef.current = null;

        const dialog = dialogRef.current;
        if (dialog?.open) {
          dialog.close();
        }
      }, getCloseDurationMs());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Cancel any pending close timer on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (modalState === "closed") {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <button
        aria-label="Fechar modal"
        className="absolute inset-0"
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />
      <dialog
        ref={dialogRef}
        aria-label={title}
        aria-modal="true"
        className={`t-modal relative w-full max-w-md rounded-lg border border-slate-200 bg-financy-surface p-4 shadow-2xl ${
          modalState === "open" ? "is-open" : "is-closing"
        }`}
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
      >
        <h2 className="mb-3 text-lg font-semibold text-financy-text">{title}</h2>
        {children}
      </dialog>
    </div>
  );
};
