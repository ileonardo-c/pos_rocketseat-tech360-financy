import { type ReactNode, useEffect, useRef } from "react";

import { useToast } from "@/components/ui/toast";

type ErrorBannerProps = {
  message?: string | null;
  title?: string;
  className?: string;
  action?: ReactNode;
  actionId?: string;
};

export const ErrorBanner = ({ message, title, className, action, actionId }: ErrorBannerProps) => {
  const toast = useToast();
  const lastSignatureRef = useRef("");
  const titleOrDefault = title ?? "Não foi possível concluir a ação.";
  const actionSignature = actionId ?? (action ? "action" : "");
  const signature = `${titleOrDefault}::${actionSignature}::${message ?? ""}`;

  useEffect(() => {
    if (!message) {
      lastSignatureRef.current = "";
      return;
    }

    if (lastSignatureRef.current === signature) {
      return;
    }

    lastSignatureRef.current = signature;
    toast.showError({
      title: titleOrDefault,
      message,
      action,
      actionId,
      durationMs: 5000,
    });
  }, [action, message, signature, titleOrDefault, toast]);

  void className;
  return null;
};

export const SuccessBanner = ({
  message,
  className,
}: {
  message?: string | null;
  className?: string;
}) => {
  const toast = useToast();
  const lastSignatureRef = useRef("");
  const signature = `success::${message ?? ""}`;

  useEffect(() => {
    if (!message) {
      lastSignatureRef.current = "";
      return;
    }

    if (lastSignatureRef.current === signature) {
      return;
    }

    lastSignatureRef.current = signature;
    toast.showSuccess({
      message,
      title: "Sucesso",
      durationMs: 5000,
    });
  }, [message, signature, toast]);

  void className;
  return null;
};
