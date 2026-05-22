import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

type ModalProps = {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export const Modal = ({ isOpen, title, children, onClose }: ModalProps) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, [isOpen]);

  if (!isOpen) {
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
        className="relative w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-2xl"
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
      >
        <h2 className="mb-3 text-lg font-semibold text-slate-900">{title}</h2>
        {children}
      </dialog>
    </div>
  );
};
