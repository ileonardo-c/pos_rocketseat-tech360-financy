import { useMutation, useQuery } from "@apollo/client";
import { useState } from "react";
import { Navigate } from "react-router-dom";

import { IconArrowUpDown, IconPlus, IconTag, IconTrash } from "@/assets/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { CategoryOverviewCard } from "@/components/ui/category-overview-card";
import { CategoryTileCard } from "@/components/ui/category-tile-card";
import {
  CATEGORY_COLOR_OPTIONS,
  CATEGORY_ICON_OPTIONS,
  type CategoryColorOption,
  type CategoryIconOption,
  CategoryVisualPicker,
} from "@/components/ui/category-visual-picker";
import { DashboardNav } from "@/components/ui/dashboard-nav";
import { ErrorBanner, SuccessBanner } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeading } from "@/components/ui/page-heading";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  CATEGORIES_COUNT_QUERY,
  CATEGORIES_LIST_QUERY,
  CATEGORIES_OVERVIEW_QUERY,
  CREATE_CATEGORY_MUTATION,
  DELETE_CATEGORY_MUTATION,
  UPDATE_CATEGORY_MUTATION,
} from "@/lib/graphql/operations";

type Category = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  transactionsCount: number;
  userId: string;
};

type CategoriesListNode = {
  categoriesList: Category[];
};

type CategoriesCountNode = {
  categoriesCount: number;
};

type CategoriesOverviewNode = {
  categoriesOverview: {
    totalCategories: number;
    totalTransactions: number;
    mostUsedCategory: {
      id: string;
      name: string;
      icon: string;
      color: string;
      count: number;
    } | null;
  };
};

type CategoryFieldErrors = {
  name?: string;
  description?: string;
};

const ITEMS_PER_PAGE = 8;

type TagCategory = "gray" | "blue" | "purple" | "pink" | "red" | "orange" | "yellow" | "green";

const colorClassMap: Record<
  string,
  { tagCategory: TagCategory; iconContainerClassName: string; iconClassName: string }
> = {
  gray: {
    tagCategory: "gray",
    iconContainerClassName: "bg-financy-tag-gray-bg",
    iconClassName: "text-financy-tag-gray-text",
  },
  blue: {
    tagCategory: "blue",
    iconContainerClassName: "bg-financy-tag-blue-bg",
    iconClassName: "text-financy-tag-blue-text",
  },
  purple: {
    tagCategory: "purple",
    iconContainerClassName: "bg-financy-tag-purple-bg",
    iconClassName: "text-financy-tag-purple-text",
  },
  pink: {
    tagCategory: "pink",
    iconContainerClassName: "bg-financy-tag-pink-bg",
    iconClassName: "text-financy-tag-pink-text",
  },
  red: {
    tagCategory: "red",
    iconContainerClassName: "bg-financy-tag-red-bg",
    iconClassName: "text-financy-tag-red-text",
  },
  orange: {
    tagCategory: "orange",
    iconContainerClassName: "bg-financy-tag-orange-bg",
    iconClassName: "text-financy-tag-orange-text",
  },
  yellow: {
    tagCategory: "yellow",
    iconContainerClassName: "bg-financy-tag-yellow-bg",
    iconClassName: "text-financy-tag-yellow-text",
  },
  green: {
    tagCategory: "green",
    iconContainerClassName: "bg-financy-tag-green-bg",
    iconClassName: "text-financy-tag-green-text",
  },
};

const defaultColorClass = colorClassMap.gray;

const resolveColorClass = (color: string) => {
  return colorClassMap[color] ?? defaultColorClass;
};

const getGraphQLErrorCode = (error: unknown): string => {
  if (!error || typeof error !== "object") {
    return "";
  }

  const graphQLErrors = (error as { graphQLErrors?: unknown[] }).graphQLErrors;
  const first = Array.isArray(graphQLErrors) ? graphQLErrors[0] : null;
  if (!first || typeof first !== "object") {
    return "";
  }

  const code = (first as { extensions?: { code?: unknown } }).extensions?.code;
  return typeof code === "string" ? code : "";
};

const mapCategoryErrorMessage = (error: unknown, fallback: string) => {
  const code = getGraphQLErrorCode(error);

  const map: Record<string, string> = {
    CATEGORY_NAME_REQUIRED: "O nome da categoria é obrigatório.",
    CATEGORY_DESCRIPTION_TOO_LONG: "A descrição deve ter no máximo 80 caracteres.",
    CATEGORY_INVALID_ICON: "Ícone inválido para categoria.",
    CATEGORY_INVALID_COLOR: "Cor inválida para categoria.",
    CATEGORY_ALREADY_EXISTS: "Já existe uma categoria com este nome.",
    CATEGORY_NOT_FOUND: "Categoria não encontrada.",
    CATEGORY_HAS_LINKED_TRANSACTIONS: "Não é possível excluir categoria com transações vinculadas.",
    CATEGORY_INVALID_PAGE: "Página inválida.",
    CATEGORY_INVALID_PER_PAGE: "Quantidade por página inválida.",
  };

  return map[code] ?? fallback;
};

const validateCategoryForm = (name: string, description: string): CategoryFieldErrors => {
  const errors: CategoryFieldErrors = {};
  if (!name.trim()) {
    errors.name = "Informe o título da categoria.";
  }

  if (description.trim().length > 80) {
    errors.description = "A descrição deve ter no máximo 80 caracteres.";
  }

  return errors;
};

const resolveInputState = ({
  value,
  error,
  focused,
}: {
  value: string;
  error?: string;
  focused: boolean;
}) => {
  if (error) {
    return "error";
  }
  if (focused) {
    return "active";
  }
  if (value) {
    return "filled";
  }
  return "empty";
};

const isSessionErrorCode = (code: string) => {
  return (
    code === "CATEGORY_UNAUTHENTICATED" ||
    code === "AUTH_UNAUTHENTICATED" ||
    code === "UNAUTHENTICATED"
  );
};

export const CategoriesPage = () => {
  const { user } = useAuth();

  const [pageStep, setPageStep] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createTouched, setCreateTouched] = useState({ name: false, description: false });
  const [createFocused, setCreateFocused] = useState({ name: false, description: false });
  const [createFieldErrors, setCreateFieldErrors] = useState<CategoryFieldErrors>({});
  const [createIcon, setCreateIcon] = useState<CategoryIconOption>(CATEGORY_ICON_OPTIONS[0]);
  const [createColor, setCreateColor] = useState<CategoryColorOption>(
    CATEGORY_COLOR_OPTIONS[0].key,
  );
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [editingTouched, setEditingTouched] = useState({ name: false, description: false });
  const [editingFocused, setEditingFocused] = useState({ name: false, description: false });
  const [editingFieldErrors, setEditingFieldErrors] = useState<CategoryFieldErrors>({});
  const [editingIcon, setEditingIcon] = useState<CategoryIconOption>(CATEGORY_ICON_OPTIONS[0]);
  const [editingColor, setEditingColor] = useState<CategoryColorOption>(
    CATEGORY_COLOR_OPTIONS[0].key,
  );
  const [categoryPendingDelete, setCategoryPendingDelete] = useState<Category | null>(null);

  const {
    data: listData,
    loading: listLoading,
    error: listError,
    refetch: refetchList,
    fetchMore,
    networkStatus: listNetworkStatus,
  } = useQuery<CategoriesListNode>(CATEGORIES_LIST_QUERY, {
    variables: {
      page: 1,
      perPage: ITEMS_PER_PAGE,
    },
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  const {
    data: countData,
    loading: countLoading,
    error: countError,
    refetch: refetchCount,
  } = useQuery<CategoriesCountNode>(CATEGORIES_COUNT_QUERY, {
    fetchPolicy: "cache-and-network",
  });

  const {
    data: overviewData,
    error: overviewError,
    refetch: refetchOverview,
  } = useQuery<CategoriesOverviewNode>(CATEGORIES_OVERVIEW_QUERY, {
    fetchPolicy: "cache-and-network",
  });

  const categoryRefetchQueries = [
    { query: CATEGORIES_LIST_QUERY, variables: { page: 1, perPage: ITEMS_PER_PAGE } },
    { query: CATEGORIES_COUNT_QUERY },
    { query: CATEGORIES_OVERVIEW_QUERY },
  ];
  const [createCategory, { loading: creating }] = useMutation(CREATE_CATEGORY_MUTATION, {
    awaitRefetchQueries: true,
    refetchQueries: categoryRefetchQueries,
  });
  const [updateCategory, { loading: updating }] = useMutation(UPDATE_CATEGORY_MUTATION, {
    awaitRefetchQueries: true,
    refetchQueries: categoryRefetchQueries,
  });
  const [deleteCategory, { loading: deleting }] = useMutation(DELETE_CATEGORY_MUTATION);

  const categories = listData?.categoriesList ?? [];
  const categoriesCount = countData?.categoriesCount ?? categories.length;
  const overview = overviewData?.categoriesOverview;
  const listErrorCode = getGraphQLErrorCode(listError);
  const countErrorCode = getGraphQLErrorCode(countError);
  const overviewErrorCode = getGraphQLErrorCode(overviewError);
  const hasSessionError = [listErrorCode, countErrorCode, overviewErrorCode].some(
    isSessionErrorCode,
  );
  const hasListLoadError = Boolean(listError) && !isSessionErrorCode(listErrorCode);
  const loadErrorMessage = hasListLoadError ? "Não foi possível carregar categorias." : null;

  const hasMore = categories.length < categoriesCount;
  const isLoadingMore = listNetworkStatus === 3 && categories.length > 0;
  const isInitialLoading = listLoading && categories.length === 0;
  const createClientErrors = validateCategoryForm(createName, createDescription);
  const createNameError =
    createFieldErrors.name ?? (createTouched.name ? createClientErrors.name : undefined);
  const createDescriptionError =
    createFieldErrors.description ??
    (createTouched.description ? createClientErrors.description : undefined);
  const createNameState = resolveInputState({
    value: createName,
    error: createNameError,
    focused: createFocused.name,
  });
  const createDescriptionState = resolveInputState({
    value: createDescription,
    error: createDescriptionError,
    focused: createFocused.description,
  });
  const canCreateCategory = !createClientErrors.name && !createClientErrors.description;

  const editClientErrors = validateCategoryForm(editingName, editingDescription);
  const editingNameError =
    editingFieldErrors.name ?? (editingTouched.name ? editClientErrors.name : undefined);
  const editingDescriptionError =
    editingFieldErrors.description ??
    (editingTouched.description ? editClientErrors.description : undefined);
  const editingNameState = resolveInputState({
    value: editingName,
    error: editingNameError,
    focused: editingFocused.name,
  });
  const editingDescriptionState = resolveInputState({
    value: editingDescription,
    error: editingDescriptionError,
    focused: editingFocused.description,
  });
  const canEditCategory = !editClientErrors.name && !editClientErrors.description;

  const refreshCategories = async () => {
    setPageStep(1);
    await Promise.all([
      refetchList({ page: 1, perPage: ITEMS_PER_PAGE }),
      refetchCount(),
      refetchOverview(),
    ]);
  };

  const loadMoreCategories = async () => {
    const nextPage = pageStep + 1;
    await fetchMore({
      variables: {
        page: nextPage,
        perPage: ITEMS_PER_PAGE,
      },
      updateQuery: (previousResult, { fetchMoreResult }) => {
        if (!fetchMoreResult?.categoriesList?.length) {
          return previousResult;
        }

        return {
          categoriesList: [
            ...(previousResult.categoriesList ?? []),
            ...fetchMoreResult.categoriesList,
          ],
        };
      },
    });
    setPageStep(nextPage);
  };

  if (!user) {
    return <Navigate replace to="/login" />;
  }

  if (hasSessionError) {
    return null;
  }

  if (isInitialLoading) {
    return (
      <main className="min-h-screen bg-financy-page">
        <DashboardNav />
        <section className="mx-auto w-full max-w-[1184px] px-4 py-8 sm:px-6">
          <Card className="border-financy-border p-5">
            <p className="text-sm text-financy-muted">Carregando categorias...</p>
          </Card>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-financy-page pb-12">
      <DashboardNav />

      <section className="mx-auto w-full max-w-[1184px] px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-8">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <PageHeading
              className="flex flex-col gap-0.5"
              title="Categorias"
              description="Organize suas transações por categorias"
            />

            <Button
              size="sm"
              startIcon={<IconPlus className="h-4 w-4" />}
              onClick={() => {
                setActionError(null);
                setActionSuccess(null);
                setCreateName("");
                setCreateDescription("");
                setCreateTouched({ name: false, description: false });
                setCreateFocused({ name: false, description: false });
                setCreateFieldErrors({});
                setCreateIcon(CATEGORY_ICON_OPTIONS[0]);
                setCreateColor(CATEGORY_COLOR_OPTIONS[0].key);
                setIsCreateDialogOpen(true);
              }}
            >
              Nova categoria
            </Button>
          </header>

          <ErrorBanner message={loadErrorMessage} />
          <ErrorBanner message={actionError} />
          <SuccessBanner message={actionSuccess} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <CategoryOverviewCard
              label="total de categorias"
              value={`${overview?.totalCategories ?? categoriesCount ?? 0}`}
              icon={<IconTag className="h-6 w-6" />}
              iconClassName="text-financy-text-secondary"
            />
            <CategoryOverviewCard
              label="total de transações"
              value={`${overview?.totalTransactions ?? 0}`}
              icon={<IconArrowUpDown className="h-6 w-6" />}
              iconClassName="text-financy-tag-purple-text"
            />
            <CategoryOverviewCard
              label="categoria mais utilizada"
              value={overview?.mostUsedCategory?.name ?? "Sem dados"}
              icon={
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${
                    resolveColorClass(overview?.mostUsedCategory?.color ?? "gray")
                      .iconContainerClassName
                  }`}
                >
                  <CategoryIcon
                    icon={overview?.mostUsedCategory?.icon ?? "tag"}
                    className={`inline-flex h-4 w-4 ${
                      resolveColorClass(overview?.mostUsedCategory?.color ?? "gray").iconClassName
                    }`}
                  />
                </span>
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {categories.map((category) => {
              const visual = resolveColorClass(category.color);

              return (
                <CategoryTileCard
                  key={category.id}
                  categoryId={category.id}
                  name={category.name}
                  description={category.description}
                  icon={category.icon}
                  tagCategory={visual.tagCategory}
                  iconContainerClassName={visual.iconContainerClassName}
                  iconClassName={visual.iconClassName}
                  itemsCount={category.transactionsCount}
                  deleting={deleting}
                  onEdit={() => {
                    setActionError(null);
                    setActionSuccess(null);
                    setEditingCategory(category);
                    setEditingName(category.name);
                    setEditingDescription(category.description);
                    setEditingTouched({ name: false, description: false });
                    setEditingFocused({ name: false, description: false });
                    setEditingFieldErrors({});
                    setEditingIcon(
                      CATEGORY_ICON_OPTIONS.includes(category.icon as CategoryIconOption)
                        ? (category.icon as CategoryIconOption)
                        : CATEGORY_ICON_OPTIONS[0],
                    );
                    setEditingColor(
                      CATEGORY_COLOR_OPTIONS.some((option) => option.key === category.color)
                        ? (category.color as CategoryColorOption)
                        : CATEGORY_COLOR_OPTIONS[0].key,
                    );
                  }}
                  onDelete={async () => {
                    setActionError(null);
                    setActionSuccess(null);
                    setCategoryPendingDelete(category);
                  }}
                />
              );
            })}
          </div>

          {!listLoading && !hasListLoadError && categories.length === 0 ? (
            <Card className="border-financy-border p-6">
              <p className="text-center text-sm text-financy-muted">
                Nenhuma categoria encontrada.
              </p>
            </Card>
          ) : null}

          {hasMore ? (
            <div className="flex justify-center">
              <Button
                variant="outline"
                disabled={isLoadingMore || countLoading}
                onClick={() => {
                  void loadMoreCategories();
                }}
              >
                <span className="t-text-swap">
                  {isLoadingMore || countLoading ? "Carregando..." : "Carregar mais"}
                </span>
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      <Modal
        isOpen={isCreateDialogOpen}
        onClose={() => {
          setIsCreateDialogOpen(false);
          setCreateTouched({ name: false, description: false });
          setCreateFocused({ name: false, description: false });
          setCreateFieldErrors({});
        }}
        title="Nova categoria"
        subtitle="Organize suas transações com categorias"
        showCloseButton
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setCreateTouched({ name: true, description: true });
            setCreateFieldErrors({});

            const validationErrors = validateCategoryForm(createName, createDescription);
            if (validationErrors.name || validationErrors.description) {
              return;
            }

            try {
              setActionError(null);
              setActionSuccess(null);
              await createCategory({
                variables: {
                  input: {
                    name: createName.trim(),
                    description: createDescription.trim() || undefined,
                    icon: createIcon,
                    color: createColor,
                  },
                },
              });
              setIsCreateDialogOpen(false);
              setCreateTouched({ name: false, description: false });
              setCreateFocused({ name: false, description: false });
              setCreateFieldErrors({});
              await refreshCategories();
              setActionSuccess("Categoria criada com sucesso.");
            } catch (mutationError) {
              const code = getGraphQLErrorCode(mutationError);
              if (code === "CATEGORY_NAME_REQUIRED") {
                setCreateFieldErrors({ name: "O nome da categoria é obrigatório." });
                return;
              }
              if (code === "CATEGORY_DESCRIPTION_TOO_LONG") {
                setCreateFieldErrors({
                  description: "A descrição deve ter no máximo 80 caracteres.",
                });
                return;
              }
              if (code === "CATEGORY_INVALID_ICON") {
                setActionError("Selecione um ícone válido.");
                return;
              }
              if (code === "CATEGORY_INVALID_COLOR") {
                setActionError("Selecione uma cor válida.");
                return;
              }
              setActionError(
                mapCategoryErrorMessage(mutationError, "Não foi possível criar a categoria."),
              );
            }
          }}
        >
          <Input
            data-testid="categories-create-name"
            label="Título"
            value={createName}
            onChange={(event) => {
              setCreateName(event.target.value);
              setCreateFieldErrors((current) => ({ ...current, name: undefined }));
              setActionError(null);
            }}
            placeholder="Ex. Alimentação"
            required
            disabled={creating}
            state={createNameState}
            helper={createNameError}
            helperError={Boolean(createNameError)}
            onFocus={() => setCreateFocused((current) => ({ ...current, name: true }))}
            onBlur={() => {
              setCreateFocused((current) => ({ ...current, name: false }));
              setCreateTouched((current) => ({ ...current, name: true }));
            }}
          />
          <Input
            data-testid="categories-create-description"
            label="Descrição"
            value={createDescription}
            onChange={(event) => {
              setCreateDescription(event.target.value);
              setCreateFieldErrors((current) => ({ ...current, description: undefined }));
              setActionError(null);
            }}
            placeholder="Descrição da categoria"
            helper={createDescriptionError ?? "Opcional"}
            helperError={Boolean(createDescriptionError)}
            disabled={creating}
            state={createDescriptionState}
            onFocus={() => setCreateFocused((current) => ({ ...current, description: true }))}
            onBlur={() => {
              setCreateFocused((current) => ({ ...current, description: false }));
              setCreateTouched((current) => ({ ...current, description: true }));
            }}
          />
          <CategoryVisualPicker
            mode="create"
            selectedIcon={createIcon}
            selectedColor={createColor}
            disabled={creating}
            onIconChange={(nextIcon) => {
              setCreateIcon(nextIcon);
              setActionError(null);
            }}
            onColorChange={(nextColor) => {
              setCreateColor(nextColor);
              setActionError(null);
            }}
          />

          <div className="flex flex-col gap-2">
            <Button
              data-testid="categories-create-confirm"
              type="submit"
              disabled={creating || !canCreateCategory}
              className="relative w-full"
            >
              <span
                className={`transition-opacity duration-200 ${
                  creating ? "opacity-0" : "opacity-100"
                }`}
              >
                Salvar
              </span>
              <span
                className={`absolute inset-0 inline-flex items-center justify-center gap-2 transition-opacity duration-200 ${
                  creating ? "opacity-100" : "opacity-0"
                }`}
              >
                <span
                  className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  aria-hidden="true"
                />
                Criando...
              </span>
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(editingCategory)}
        onClose={() => {
          setEditingCategory(null);
          setEditingName("");
          setEditingDescription("");
          setEditingTouched({ name: false, description: false });
          setEditingFocused({ name: false, description: false });
          setEditingFieldErrors({});
          setEditingIcon(CATEGORY_ICON_OPTIONS[0]);
          setEditingColor(CATEGORY_COLOR_OPTIONS[0].key);
        }}
        title="Editar categoria"
        subtitle="Organize suas transações com categorias"
        showCloseButton
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!editingCategory) {
              return;
            }

            setEditingTouched({ name: true, description: true });
            setEditingFieldErrors({});

            const validationErrors = validateCategoryForm(editingName, editingDescription);
            if (validationErrors.name || validationErrors.description) {
              return;
            }

            try {
              setActionError(null);
              setActionSuccess(null);
              await updateCategory({
                variables: {
                  id: editingCategory.id,
                  input: {
                    name: editingName.trim(),
                    description: editingDescription.trim(),
                    icon: editingIcon,
                    color: editingColor,
                  },
                },
              });
              setEditingCategory(null);
              setEditingName("");
              setEditingDescription("");
              setEditingTouched({ name: false, description: false });
              setEditingFocused({ name: false, description: false });
              setEditingFieldErrors({});
              await refreshCategories();
              setActionSuccess("Categoria atualizada com sucesso.");
            } catch (mutationError) {
              const code = getGraphQLErrorCode(mutationError);
              if (code === "CATEGORY_NAME_REQUIRED") {
                setEditingFieldErrors({ name: "O nome da categoria é obrigatório." });
                return;
              }
              if (code === "CATEGORY_DESCRIPTION_TOO_LONG") {
                setEditingFieldErrors({
                  description: "A descrição deve ter no máximo 80 caracteres.",
                });
                return;
              }
              if (code === "CATEGORY_INVALID_ICON") {
                setActionError("Selecione um ícone válido.");
                return;
              }
              if (code === "CATEGORY_INVALID_COLOR") {
                setActionError("Selecione uma cor válida.");
                return;
              }
              setActionError(
                mapCategoryErrorMessage(mutationError, "Não foi possível atualizar a categoria."),
              );
            }
          }}
        >
          <Input
            data-testid="categories-edit-name"
            label="Título"
            value={editingName}
            onChange={(event) => {
              setEditingName(event.target.value);
              setEditingFieldErrors((current) => ({ ...current, name: undefined }));
              setActionError(null);
            }}
            placeholder="Ex. Alimentação"
            required
            disabled={updating}
            state={editingNameState}
            helper={editingNameError}
            helperError={Boolean(editingNameError)}
            onFocus={() => setEditingFocused((current) => ({ ...current, name: true }))}
            onBlur={() => {
              setEditingFocused((current) => ({ ...current, name: false }));
              setEditingTouched((current) => ({ ...current, name: true }));
            }}
          />
          <Input
            data-testid="categories-edit-description"
            label="Descrição"
            value={editingDescription}
            onChange={(event) => {
              setEditingDescription(event.target.value);
              setEditingFieldErrors((current) => ({ ...current, description: undefined }));
              setActionError(null);
            }}
            placeholder="Descrição da categoria"
            helper={editingDescriptionError ?? "Opcional"}
            helperError={Boolean(editingDescriptionError)}
            disabled={updating}
            state={editingDescriptionState}
            onFocus={() => setEditingFocused((current) => ({ ...current, description: true }))}
            onBlur={() => {
              setEditingFocused((current) => ({ ...current, description: false }));
              setEditingTouched((current) => ({ ...current, description: true }));
            }}
          />
          <CategoryVisualPicker
            mode="edit"
            selectedIcon={editingIcon}
            selectedColor={editingColor}
            disabled={updating}
            onIconChange={(nextIcon) => {
              setEditingIcon(nextIcon);
              setActionError(null);
            }}
            onColorChange={(nextColor) => {
              setEditingColor(nextColor);
              setActionError(null);
            }}
          />

          <div className="flex flex-col gap-2">
            <Button
              data-testid="categories-edit-confirm"
              type="submit"
              disabled={updating || !canEditCategory}
              className="w-full"
            >
              <span className="t-text-swap">{updating ? "Salvando..." : "Salvar"}</span>
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(categoryPendingDelete)}
        onClose={() => {
          if (!deleting) {
            setCategoryPendingDelete(null);
          }
        }}
        title="Excluir categoria"
        subtitle={
          categoryPendingDelete
            ? `Deseja realmente excluir a categoria "${categoryPendingDelete.name}"?`
            : undefined
        }
        showCloseButton
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm font-semibold leading-6 text-financy-muted">
            Esta ação não poderá ser desfeita.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              disabled={deleting}
              onClick={() => {
                setCategoryPendingDelete(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="ghost"
              disabled={deleting || !categoryPendingDelete}
              startIcon={<IconTrash className="h-4 w-4" />}
              className="!text-financy-danger hover:!text-financy-danger"
              onClick={async () => {
                if (!categoryPendingDelete) {
                  return;
                }

                try {
                  setActionError(null);
                  setActionSuccess(null);
                  const response = await deleteCategory({
                    variables: { id: categoryPendingDelete.id },
                  });

                  if (!response.data?.deleteCategory) {
                    setActionError("Categoria não encontrada para exclusão.");
                    return;
                  }

                  setCategoryPendingDelete(null);
                  await refreshCategories();
                  setActionSuccess("Categoria excluída com sucesso.");
                } catch (mutationError) {
                  setActionError(
                    mapCategoryErrorMessage(mutationError, "Não foi possível excluir a categoria."),
                  );
                }
              }}
            >
              <span className="t-text-swap">{deleting ? "Excluindo..." : "Excluir categoria"}</span>
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
};
