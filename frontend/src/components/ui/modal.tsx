import { useEffect } from "react";
import type { ReactNode } from "react";

type ModalProps = {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export const Modal = ({ isOpen, title, children, onClose }: ModalProps) => {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("keydown", onEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      onKeyDown={(event) => {
        if ((event.key === "Enter" || event.key === " ") && event.target === event.currentTarget) {
          onClose();
        }
      }}
      onClick={(event) => {
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
        aria-label={title}
        aria-modal="true"
        className="relative w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-2xl"
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
        open
      >
        <h2 className="mb-3 text-lg font-semibold text-slate-900">{title}</h2>
        {children}
      </dialog>
    </div>
  );
};
