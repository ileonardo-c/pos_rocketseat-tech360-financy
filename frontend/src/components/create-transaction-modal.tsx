import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import { IconCircleArrowDown, IconCircleArrowUp } from "@/assets/icons";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import {
  CATEGORIES_QUERY,
  CREATE_TRANSACTION_MUTATION,
  DASHBOARD_RECENT_TRANSACTIONS_QUERY,
  DASHBOARD_TRANSACTIONS_QUERY,
  DASHBOARD_TRANSACTION_CATEGORY_SUMMARY_QUERY,
  DASHBOARD_TRANSACTION_SUMMARY_QUERY,
  UPDATE_TRANSACTION_MUTATION,
} from "@/lib/graphql/operations";
import { cx } from "@/lib/utils";
import { useMutation, useQuery } from "@apollo/client";

type CreateTransactionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (mode: "create" | "edit") => void | Promise<void>;
  filter: {
    from: string;
    to: string;
  };
  mode?: "create" | "edit";
  transactionId?: string | null;
  initialValues?: {
    description: string;
    date: string;
    amount: number;
    type: TransactionType;
    categoryId: string;
  } | null;
};

type TransactionType = "INCOME" | "EXPENSE";

type Category = {
  id: string;
  name: string;
  icon: string;
};

type CategoriesNode = {
  categories: Category[];
};

type TransactionForm = {
  description: string;
  date: string;
  amount: string;
  categoryId: string;
};

type TransactionInput = {
  title: string;
  description: string | null;
  amount: number;
  type: TransactionType;
  date: string;
  categoryId: string;
};

type TransactionUpdateInput = Omit<TransactionInput, "description">;

const emptyForm: TransactionForm = {
  description: "",
  date: "",
  amount: "",
  categoryId: "",
};

const getInitialForm = (
  mode: "create" | "edit",
  initialValues: CreateTransactionModalProps["initialValues"],
  fallbackCategoryId: string,
) => {
  if (mode !== "edit" || !initialValues) {
    return {
      ...emptyForm,
      categoryId: fallbackCategoryId,
    };
  }

  return {
    description: initialValues.description,
    date: initialValues.date,
    amount: initialValues.amount == null ? "" : formatCurrencyFromNumber(initialValues.amount),
    categoryId: initialValues.categoryId,
  };
};

const parseCurrencyToNumber = (value: string) => {
  const normalized = value
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const formatCurrencyInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const numeric = Number(digits) / 100;
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
};

const formatCurrencyFromNumber = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const parseMonthYearFromIsoDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }

  return {
    year,
    month,
  };
};

type TransactionFormProps = {
  filter: {
    from: string;
    to: string;
  };
  mode: "create" | "edit";
  transactionId?: string | null;
  initialValues: CreateTransactionModalProps["initialValues"];
  categories: Category[];
  categorySelectIconMap: Record<string, ReactNode>;
  creating: boolean;
  updating: boolean;
  onCreate: (input: TransactionInput) => Promise<void>;
  onUpdate: (input: TransactionUpdateInput, id: string) => Promise<void>;
  onSave: (mode: "create" | "edit") => void | Promise<void>;
  onClose: () => void;
};

const TransactionForm = ({
  filter,
  mode,
  transactionId,
  initialValues,
  categories,
  categorySelectIconMap,
  creating,
  updating,
  onCreate,
  onUpdate,
  onSave,
  onClose,
}: TransactionFormProps) => {
  const firstCategoryId = categories[0]?.id ?? "";
  const isEditMode = mode === "edit";

  const [transactionType, setTransactionType] = useState<TransactionType>(() => {
    if (!isEditMode || !initialValues?.type) {
      return "EXPENSE";
    }

    return initialValues.type;
  });
  const [form, setForm] = useState<TransactionForm>(() =>
    getInitialForm(mode, initialValues, firstCategoryId),
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const suggestedPeriodLabel = useMemo(() => {
    const period = parseMonthYearFromIsoDate(filter.from) ?? parseMonthYearFromIsoDate(filter.to);
    if (!period) {
      return null;
    }

    return `${String(period.month).padStart(2, "0")}/${period.year}`;
  }, [filter.from, filter.to]);

  const selectedCategoryId = useMemo(() => {
    if (form.categoryId && categories.some((category) => category.id === form.categoryId)) {
      return form.categoryId;
    }

    return firstCategoryId;
  }, [categories, firstCategoryId, form.categoryId]);

  const isSubmitDisabled = useMemo(() => {
    if (creating || updating) return true;
    if (!form.description.trim()) return true;
    if (!form.date) return true;
    if (!selectedCategoryId) return true;
    const amount = parseCurrencyToNumber(form.amount);
    return !Number.isFinite(amount) || amount <= 0;
  }, [creating, form, selectedCategoryId, updating]);

  const submitLabel = creating || updating ? "Salvando..." : "Salvar";
  const modalTitle = isEditMode ? "Editar transação" : "Nova transação";
  const modalSubtitle = isEditMode
    ? "Atualize os dados da transação"
    : "Registre sua despesa ou receita";

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={async (event) => {
        event.preventDefault();
        if (isSubmitDisabled) return;

        setSubmitError(null);
        const amount = parseCurrencyToNumber(form.amount);

        try {
          if (isEditMode) {
            if (!transactionId) {
              setSubmitError(
                "Não foi possível salvar a transação. Verifique os dados e tente novamente.",
              );
              return;
            }

            await onUpdate(
              {
                title: form.description.trim(),
                amount,
                type: transactionType,
                date: form.date,
                categoryId: selectedCategoryId,
              },
              transactionId,
            );
          } else {
            await onCreate({
              title: form.description.trim(),
              description: null,
              amount,
              type: transactionType,
              date: form.date,
              categoryId: selectedCategoryId,
            });
          }

          onClose();
          await onSave(mode);
        } catch {
          setSubmitError(
            "Não foi possível salvar a transação. Verifique os dados e tente novamente.",
          );
        }
      }}
    >
      <div className="rounded-xl border border-financy-border p-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTransactionType("EXPENSE")}
            className={cx(
              "inline-flex h-[46px] items-center justify-center gap-3 rounded-lg border px-3 text-base leading-[18px] transition-[color,border-color,background-color] duration-150",
              transactionType === "EXPENSE"
                ? "border-financy-danger bg-financy-page text-financy-text"
                : "border-transparent text-financy-muted hover:bg-financy-page",
            )}
          >
            <IconCircleArrowDown
              className={cx(
                "h-4 w-4",
                transactionType === "EXPENSE" ? "text-financy-danger" : "text-financy-muted",
              )}
            />
            <span className={cx(transactionType === "EXPENSE" ? "font-medium" : "font-normal")}>
              Despesa
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTransactionType("INCOME")}
            className={cx(
              "inline-flex h-[46px] items-center justify-center gap-3 rounded-lg border px-3 text-base leading-[18px] transition-[color,border-color,background-color] duration-150",
              transactionType === "INCOME"
                ? "border-financy-success bg-financy-page text-financy-text"
                : "border-transparent text-financy-muted hover:bg-financy-page",
            )}
          >
            <IconCircleArrowUp
              className={cx(
                "h-4 w-4",
                transactionType === "INCOME" ? "text-financy-success" : "text-financy-muted",
              )}
            />
            <span className={cx(transactionType === "INCOME" ? "font-medium" : "font-normal")}>
              Receita
            </span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Input
          id="dashboard-transaction-description"
          label="Descrição"
          placeholder="Ex. Almoço no restaurante"
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          disabled={creating || updating}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="dashboard-transaction-date"
            label="Data"
            type="date"
            value={form.date}
            helper={suggestedPeriodLabel ? `Período sugerido: ${suggestedPeriodLabel}` : undefined}
            onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
            disabled={creating || updating}
            required
          />

          <Input
            id="dashboard-transaction-amount"
            label="Valor"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={form.amount}
            startIcon={<span className="text-sm font-medium text-financy-text">R$</span>}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, amount: formatCurrencyInput(event.target.value) }))
            }
            disabled={creating || updating}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="dashboard-transaction-category"
            className="text-sm font-medium leading-5 text-financy-text-secondary"
          >
            Categoria
          </label>
          <Select
            id="dashboard-transaction-category"
            value={selectedCategoryId}
            optionLeadingIconByValue={categorySelectIconMap}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                categoryId: event.target.value,
              }))
            }
            disabled={creating || updating || categories.length === 0}
            required
          >
            {categories.length === 0 ? (
              <option value="">Sem categorias</option>
            ) : (
              categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))
            )}
          </Select>
        </div>
      </div>

      {submitError ? (
        <p className="rounded-md border border-financy-danger/30 bg-financy-danger/10 px-3 py-2 text-sm text-financy-danger">
          {submitError}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="primary"
        className="h-12 w-full justify-center text-base"
        disabled={isSubmitDisabled}
      >
        <span className="t-text-swap">{submitLabel}</span>
      </Button>
    </form>
  );
};

export const CreateTransactionModal = ({
  isOpen,
  onClose,
  onSaved,
  filter,
  mode = "create",
  transactionId,
  initialValues,
}: CreateTransactionModalProps) => {
  const { data: categoriesData } = useQuery<CategoriesNode>(CATEGORIES_QUERY, {
    fetchPolicy: "cache-and-network",
    skip: !isOpen,
  });

  const [createTransaction, { loading: creating }] = useMutation(CREATE_TRANSACTION_MUTATION, {
    refetchQueries: [
      { query: DASHBOARD_TRANSACTION_SUMMARY_QUERY, variables: { filter } },
      { query: DASHBOARD_TRANSACTION_CATEGORY_SUMMARY_QUERY, variables: { filter, limit: 5 } },
      { query: DASHBOARD_RECENT_TRANSACTIONS_QUERY, variables: { filter, limit: 5 } },
      { query: DASHBOARD_TRANSACTIONS_QUERY },
    ],
  });
  const [updateTransaction, { loading: updating }] = useMutation(UPDATE_TRANSACTION_MUTATION, {
    refetchQueries: [
      { query: DASHBOARD_TRANSACTION_SUMMARY_QUERY, variables: { filter } },
      { query: DASHBOARD_TRANSACTION_CATEGORY_SUMMARY_QUERY, variables: { filter, limit: 5 } },
      { query: DASHBOARD_RECENT_TRANSACTIONS_QUERY, variables: { filter, limit: 5 } },
      { query: DASHBOARD_TRANSACTIONS_QUERY },
    ],
  });

  const categories = categoriesData?.categories ?? [];
  const categorySelectIconMap = useMemo<Record<string, ReactNode>>(() => {
    return Object.fromEntries(
      categories.map((category) => [
        category.id,
        <CategoryIcon key={category.id} icon={category.icon} className="h-4 w-4" />,
      ]),
    );
  }, [categories]);

  const isEditMode = mode === "edit";
  const initialValuesKey = useMemo(() => {
    if (!isEditMode || !initialValues) {
      return "new";
    }

    return `${initialValues.description}|${initialValues.date}|${initialValues.amount}|${initialValues.type}|${initialValues.categoryId}`;
  }, [initialValues, isEditMode]);
  const formResetKey = useMemo(
    () => `${isOpen ? "open" : "closed"}:${mode}:${transactionId ?? "new"}:${initialValuesKey}`,
    [initialValuesKey, isOpen, mode, transactionId],
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? "Editar transação" : "Nova transação"}
      subtitle={isEditMode ? "Atualize os dados da transação" : "Registre sua despesa ou receita"}
      showCloseButton
    >
      <TransactionForm
        key={formResetKey}
        filter={filter}
        mode={mode}
        transactionId={transactionId}
        initialValues={initialValues}
        categories={categories}
        categorySelectIconMap={categorySelectIconMap}
        creating={creating}
        updating={updating}
        onClose={onClose}
        onCreate={async (input) => {
          await createTransaction({
            variables: {
              input,
            },
          });
        }}
        onUpdate={async (input, id) => {
          await updateTransaction({
            variables: {
              id,
              input,
            },
          });
        }}
        onSave={async (nextMode) => {
          await onSaved?.(nextMode);
        }}
      />
    </Modal>
  );
};
