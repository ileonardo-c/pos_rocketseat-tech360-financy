import { useMutation, useQuery } from "@apollo/client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Navigate } from "react-router-dom";

import { IconLogOut, IconMail, IconTrash, IconUserRound, IconUserRoundPlus } from "@/assets/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardNav } from "@/components/ui/dashboard-nav";
import { ErrorBanner, SuccessBanner } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  ME_QUERY,
  REMOVE_PROFILE_AVATAR_MUTATION,
  REQUEST_PROFILE_AVATAR_UPLOAD_URL_MUTATION,
  UPDATE_PROFILE_AVATAR_MUTATION,
  UPDATE_PROFILE_MUTATION,
} from "@/lib/graphql/operations";
import {
  clearManagedTimeout,
  scheduleManagedTimeout,
  useTimeoutCleanup,
} from "@/lib/hooks/use-timeout-cleanup";
import { cx } from "@/lib/utils";

type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

type UploadPayload = {
  url: string;
  key: string;
  publicUrl: string;
  expiresIn: number;
};

type MeQueryData = {
  me: User;
};

type UpdateProfileMutationData = {
  updateProfile: User;
};

type RequestProfileAvatarUploadUrlMutationData = {
  requestProfileAvatarUploadUrl: UploadPayload;
};

type UpdateProfileAvatarMutationData = {
  updateProfileAvatar: User;
};

type RemoveProfileAvatarMutationData = {
  removeProfileAvatar: User;
};

type ProfileForm = {
  name: string;
  email: string;
};

const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024;

const resolveErrorCode = (error: unknown): string | null => {
  if (!error || typeof error !== "object") {
    return null;
  }

  if (
    "graphQLErrors" in error &&
    Array.isArray(error.graphQLErrors) &&
    error.graphQLErrors.length > 0
  ) {
    const first = error.graphQLErrors[0] as { extensions?: { code?: unknown } };
    if (typeof first?.extensions?.code === "string") {
      return first.extensions.code;
    }
  }

  if ("cause" in error) {
    return resolveErrorCode((error as { cause?: unknown }).cause);
  }

  return null;
};

const resolveProfileMessage = (error: unknown, fallback: string) => {
  const code = resolveErrorCode(error);

  switch (code) {
    case "AUTH_INVALID_NAME":
      return "Informe um nome válido com pelo menos 2 caracteres.";
    case "AUTH_EMAIL_UPDATE_NOT_ALLOWED":
      return "O e-mail não pode ser alterado por esta tela.";
    case "AUTH_INVALID_AVATAR_CONTENT_TYPE":
      return "Selecione uma imagem JPG, PNG ou WEBP.";
    case "AUTH_INVALID_AVATAR_SIZE":
      return "Selecione uma imagem de até 5 MB.";
    case "AUTH_INVALID_AVATAR_KEY":
      return "Não foi possível concluir a atualização da foto. Tente novamente.";
    case "AUTH_UNAUTHENTICATED":
      return "Sua sessão expirou. Faça login novamente.";
    default:
      return fallback;
  }
};

export const ProfilePage = () => {
  const { signout, updateSessionUser, user } = useAuth();
  const { data, loading, error } = useQuery<MeQueryData>(ME_QUERY, {
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  const [updateProfile, { loading: updating }] = useMutation<UpdateProfileMutationData>(
    UPDATE_PROFILE_MUTATION,
    {
      refetchQueries: [{ query: ME_QUERY }],
      awaitRefetchQueries: true,
    },
  );

  const [requestProfileAvatarUploadUrlMutation] =
    useMutation<RequestProfileAvatarUploadUrlMutationData>(
      REQUEST_PROFILE_AVATAR_UPLOAD_URL_MUTATION,
    );

  const [updateProfileAvatarMutation] = useMutation<UpdateProfileAvatarMutationData>(
    UPDATE_PROFILE_AVATAR_MUTATION,
    {
      refetchQueries: [{ query: ME_QUERY }],
      awaitRefetchQueries: true,
    },
  );

  const [removeProfileAvatarMutation, { loading: removingAvatar }] =
    useMutation<RemoveProfileAvatarMutationData>(REMOVE_PROFILE_AVATAR_MUTATION, {
      refetchQueries: [{ query: ME_QUERY }],
      awaitRefetchQueries: true,
    });

  const [form, setForm] = useState<ProfileForm>({ name: "", email: "" });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"error" | "success" | null>(null);
  const [isNameInputShaking, setIsNameInputShaking] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [isRemoveAvatarModalOpen, setIsRemoveAvatarModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const shakeReplayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useTimeoutCleanup(shakeReplayTimeoutRef, shakeTimeoutRef);

  const me = data?.me ?? null;
  const isBusy = updating || isAvatarUploading || removingAvatar;

  useEffect(() => {
    if (!me) {
      return;
    }
    setForm({ name: me.name, email: me.email });
  }, [me]);

  const hasChanges = useMemo(() => {
    if (!me) {
      return false;
    }
    return form.name.trim() !== me.name;
  }, [form.name, me]);

  const initials = useMemo(() => {
    const source = me?.name || user?.name || "U";
    const parts = source.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return "U";
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }, [me?.name, user?.name]);

  const triggerNameShake = () => {
    clearManagedTimeout(shakeReplayTimeoutRef);
    clearManagedTimeout(shakeTimeoutRef);

    setIsNameInputShaking(false);
    scheduleManagedTimeout(
      shakeReplayTimeoutRef,
      () => {
        setIsNameInputShaking(true);
        scheduleManagedTimeout(
          shakeTimeoutRef,
          () => {
            setIsNameInputShaking(false);
          },
          420,
        );
      },
      0,
    );
  };

  const handleAvatarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";

    if (!selectedFile) {
      return;
    }

    if (!ALLOWED_AVATAR_TYPES.has(selectedFile.type)) {
      setFeedback("Selecione uma imagem JPG, PNG ou WEBP.");
      setFeedbackType("error");
      return;
    }

    if (selectedFile.size > AVATAR_MAX_SIZE_BYTES) {
      setFeedback("Selecione uma imagem de até 5 MB.");
      setFeedbackType("error");
      return;
    }

    setFeedback(null);
    setFeedbackType(null);
    setIsAvatarUploading(true);

    try {
      const signedUrlResponse = await requestProfileAvatarUploadUrlMutation({
        variables: {
          input: {
            fileName: selectedFile.name,
            contentType: selectedFile.type,
            sizeBytes: selectedFile.size,
          },
        },
      });

      const uploadPayload = signedUrlResponse.data?.requestProfileAvatarUploadUrl;
      if (!uploadPayload) {
        throw new Error("Missing upload payload");
      }

      const uploadResponse = await fetch(uploadPayload.url, {
        method: "PUT",
        headers: {
          "Content-Type": selectedFile.type,
        },
        body: selectedFile,
      });

      if (!uploadResponse.ok) {
        throw new Error("Avatar upload failed");
      }

      const updateResponse = await updateProfileAvatarMutation({
        variables: {
          input: {
            avatarKey: uploadPayload.key,
          },
        },
      });

      if (updateResponse.data?.updateProfileAvatar) {
        updateSessionUser(updateResponse.data.updateProfileAvatar);
      }

      setFeedback("Foto de perfil atualizada com sucesso.");
      setFeedbackType("success");
    } catch (mutationError) {
      setFeedback(
        resolveProfileMessage(mutationError, "Não foi possível atualizar a foto de perfil agora."),
      );
      setFeedbackType("error");
    } finally {
      setIsAvatarUploading(false);
    }
  };

  const handleRemoveAvatar = () => {
    if (!me?.avatarUrl || isBusy) {
      return;
    }

    setIsRemoveAvatarModalOpen(true);
  };

  const handleConfirmRemoveAvatar = async () => {
    if (!me?.avatarUrl || isBusy) {
      return;
    }

    setFeedback(null);
    setFeedbackType(null);

    try {
      const response = await removeProfileAvatarMutation();
      if (response.data?.removeProfileAvatar) {
        updateSessionUser(response.data.removeProfileAvatar);
      }
      setFeedback("Foto de perfil removida com sucesso.");
      setFeedbackType("success");
      setIsRemoveAvatarModalOpen(false);
    } catch (mutationError) {
      setFeedback(
        resolveProfileMessage(mutationError, "Não foi possível remover a foto de perfil agora."),
      );
      setFeedbackType("error");
    }
  };

  if (loading && !me) {
    return (
      <main className="min-h-screen bg-financy-page">
        <DashboardNav />
        <section className="mx-auto w-full max-w-[1184px] px-4 py-8 sm:px-6">
          <Card className="border-financy-border p-6">
            <p className="text-sm text-financy-muted">Carregando perfil...</p>
          </Card>
        </section>
      </main>
    );
  }

  if (error) {
    return <Navigate replace to="/" />;
  }

  if (!me) {
    return <Navigate replace to="/" />;
  }

  return (
    <main className="min-h-screen bg-financy-page pb-12">
      <DashboardNav />
      <Modal
        isOpen={isRemoveAvatarModalOpen}
        onClose={() => {
          if (removingAvatar) {
            return;
          }
          setIsRemoveAvatarModalOpen(false);
        }}
        showCloseButton
        title="Remover foto de perfil"
        subtitle="Essa ação removerá a foto atual da sua conta."
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold text-financy-muted">
            Deseja confirmar a remoção da foto de perfil?
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={removingAvatar}
              onClick={() => setIsRemoveAvatarModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={removingAvatar}
              startIcon={<IconTrash className="h-4 w-4" />}
              className="!text-financy-danger hover:!text-financy-danger"
              onClick={handleConfirmRemoveAvatar}
            >
              {removingAvatar ? "Removendo..." : "Remover foto"}
            </Button>
          </div>
        </div>
      </Modal>

      <section className="mx-auto w-full max-w-[1184px] px-4 py-12 sm:px-6">
        <Card className="mx-auto w-full max-w-[448px] border-financy-border p-6 sm:p-8">
          <div className="mb-8 flex flex-col items-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isBusy}
              className="inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gray-300 text-2xl font-semibold text-financy-text transition-[box-shadow,opacity] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-financy-primary/60 disabled:pointer-events-none disabled:opacity-60"
              aria-label="Alterar foto de perfil"
            >
              {me.avatarUrl ? (
                <img
                  src={me.avatarUrl}
                  alt={`Foto de perfil de ${me.name}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarFileChange}
              disabled={isBusy}
            />

            <div className="mt-3 flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isBusy}
                startIcon={<IconUserRoundPlus className="h-4 w-4" />}
              >
                <span className="t-text-swap">
                  {isAvatarUploading ? "Enviando..." : "Alterar foto"}
                </span>
              </Button>

              {me.avatarUrl ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleRemoveAvatar}
                  disabled={isBusy}
                  startIcon={<IconTrash className="h-4 w-4" />}
                  className="!text-financy-danger hover:!text-financy-danger"
                >
                  <span className="t-text-swap">
                    {removingAvatar ? "Removendo..." : "Remover foto"}
                  </span>
                </Button>
              ) : null}
            </div>

            <h1 className="mt-4 text-center text-2xl font-semibold leading-8 text-financy-heading">
              {me.name}
            </h1>
            <p className="mt-0.5 text-center text-sm leading-5 text-financy-muted">{me.email}</p>
          </div>

          <div className="my-8 border-t border-financy-border" />

          {feedbackType === "error" ? <ErrorBanner message={feedback} /> : null}
          {feedbackType === "success" ? <SuccessBanner message={feedback} /> : null}

          <form
            className="flex flex-col gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setFeedback(null);
              setFeedbackType(null);

              if (!hasChanges) {
                setFeedback("Nenhuma alteração para salvar.");
                setFeedbackType("error");
                triggerNameShake();
                return;
              }

              try {
                const result = await updateProfile({
                  variables: {
                    input: {
                      name: form.name.trim(),
                    },
                  },
                });
                if (result.data?.updateProfile) {
                  updateSessionUser(result.data.updateProfile);
                }
                setFeedback("Perfil atualizado com sucesso.");
                setFeedbackType("success");
              } catch (mutationError) {
                setFeedback(
                  resolveProfileMessage(mutationError, "Não foi possível atualizar o perfil."),
                );
                setFeedbackType("error");
                triggerNameShake();
              }
            }}
          >
            <Input
              label="Nome completo"
              value={form.name}
              className={cx("t-input", isNameInputShaking ? "is-shaking" : "")}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              startIcon={<IconUserRound className="h-4 w-4" />}
              disabled={isBusy}
              required
            />

            <Input
              label="E-mail"
              type="email"
              value={form.email}
              disabled
              helper="O e-mail não pode ser alterado."
              startIcon={<IconMail className="h-4 w-4" />}
            />

            <div className="mt-8 flex flex-col gap-4">
              <Button type="submit" disabled={isBusy || !hasChanges}>
                <span className="t-text-swap">
                  {updating ? "Salvando..." : "Salvar alterações"}
                </span>
              </Button>

              <Button
                variant="outline"
                onClick={() => signout()}
                disabled={isBusy}
                startIcon={<IconLogOut className="h-[18px] w-[18px] text-financy-danger" />}
              >
                Sair da conta
              </Button>
            </div>
          </form>
        </Card>
      </section>
    </main>
  );
};
