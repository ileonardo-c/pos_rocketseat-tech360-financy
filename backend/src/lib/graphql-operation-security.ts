import { OperationTypeNode, parse } from "graphql/language";
import type {
  DocumentNode,
  FragmentDefinitionNode,
  OperationDefinitionNode,
  SelectionNode,
} from "graphql/language/ast";

export type GraphQLOperationSecurityAnalysis = {
  operationType: "query" | "mutation" | "subscription" | "unknown";
  mutationFieldNames: string[];
  authMutationFields: string[];
  protectedMutationFields: string[];
  hasUnknownMutationField: boolean;
  hasUnknownFragment: boolean;
  hasMutationOperations: boolean;
  hasOperation: boolean;
  requiresCsrf: boolean;
  requiresAuthRateLimit: boolean;
};

const UNKNOWN_PROTECTED_MUTATION_FIELD = "__unknown_protected_mutation__";
const PUBLIC_AUTH_MUTATION_FIELDS = new Set([
  "login",
  "logout",
  "register",
  "requestPasswordReset",
  "resetPassword",
]);

const toOperationTypeLabel = (
  operationType: OperationTypeNode,
): "query" | "mutation" | "subscription" | "unknown" => {
  if (operationType === OperationTypeNode.QUERY) {
    return "query";
  }
  if (operationType === OperationTypeNode.MUTATION) {
    return "mutation";
  }
  if (operationType === OperationTypeNode.SUBSCRIPTION) {
    return "subscription";
  }
  return "unknown";
};

const isPublicAuthMutationField = (fieldName: string) => {
  return PUBLIC_AUTH_MUTATION_FIELDS.has(fieldName);
};

const collectSelectionFieldNames = (
  selections: readonly SelectionNode[],
  fragments: Map<string, FragmentDefinitionNode>,
  visitedFragments: Set<string>,
  fieldNames: string[],
) => {
  for (const selection of selections) {
    if (selection.kind === "Field") {
      fieldNames.push(selection.name.value);
      continue;
    }

    if (selection.kind === "FragmentSpread") {
      const fragmentName = selection.name.value;
      if (visitedFragments.has(fragmentName)) {
        fieldNames.push(UNKNOWN_PROTECTED_MUTATION_FIELD);
        continue;
      }

      const fragment = fragments.get(fragmentName);
      if (!fragment) {
        fieldNames.push(UNKNOWN_PROTECTED_MUTATION_FIELD);
        continue;
      }

      visitedFragments.add(fragmentName);
      collectSelectionFieldNames(
        fragment.selectionSet.selections,
        fragments,
        visitedFragments,
        fieldNames,
      );
      visitedFragments.delete(fragmentName);
    }

    if (selection.kind === "InlineFragment" && selection.selectionSet) {
      collectSelectionFieldNames(
        selection.selectionSet.selections,
        fragments,
        visitedFragments,
        fieldNames,
      );
    }
  }
};

const selectOperationByName = (
  document: DocumentNode,
  operationName: string,
): OperationDefinitionNode | null => {
  const operations = document.definitions.filter(
    (definition): definition is OperationDefinitionNode =>
      definition.kind === "OperationDefinition",
  );

  if (!operations.length) {
    return null;
  }

  if (!operationName) {
    return operations.length === 1 ? (operations[0] ?? null) : null;
  }

  return operations.find((operation) => operation.name?.value === operationName) ?? null;
};

export const analyzeGraphqlOperation = (rawBody: unknown): GraphQLOperationSecurityAnalysis => {
  if (!rawBody || typeof rawBody !== "object") {
    return {
      operationType: "unknown",
      mutationFieldNames: [],
      authMutationFields: [],
      protectedMutationFields: [],
      hasUnknownMutationField: true,
      hasUnknownFragment: true,
      hasMutationOperations: false,
      hasOperation: false,
      requiresCsrf: true,
      requiresAuthRateLimit: true,
    };
  }

  const body = rawBody as { operationName?: unknown; query?: unknown };
  if (typeof body.query !== "string") {
    return {
      operationType: "unknown",
      mutationFieldNames: [],
      authMutationFields: [],
      protectedMutationFields: [],
      hasUnknownMutationField: true,
      hasUnknownFragment: true,
      hasMutationOperations: false,
      hasOperation: false,
      requiresCsrf: true,
      requiresAuthRateLimit: true,
    };
  }

  let document: DocumentNode;
  try {
    document = parse(body.query);
  } catch {
    return {
      operationType: "unknown",
      mutationFieldNames: [],
      authMutationFields: [],
      protectedMutationFields: [],
      hasUnknownMutationField: true,
      hasUnknownFragment: true,
      hasMutationOperations: false,
      hasOperation: false,
      requiresCsrf: true,
      requiresAuthRateLimit: true,
    };
  }

  const operations = document.definitions.filter(
    (definition): definition is OperationDefinitionNode =>
      definition.kind === "OperationDefinition",
  );

  if (operations.length === 0) {
    return {
      operationType: "unknown",
      mutationFieldNames: [],
      authMutationFields: [],
      protectedMutationFields: [],
      hasUnknownMutationField: true,
      hasUnknownFragment: true,
      hasMutationOperations: false,
      hasOperation: false,
      requiresCsrf: true,
      requiresAuthRateLimit: true,
    };
  }

  const hasMutationOperations = operations.some(
    (operation) => operation.operation === OperationTypeNode.MUTATION,
  );

  const operationName =
    typeof body.operationName === "string" && body.operationName.trim().length > 0
      ? body.operationName.trim()
      : "";
  const targetOperation = selectOperationByName(document, operationName);

  if (!targetOperation) {
    if (operations.length === 1 && operations[0]?.operation === OperationTypeNode.MUTATION) {
      return {
        operationType: toOperationTypeLabel(operations[0].operation),
        mutationFieldNames: [],
        authMutationFields: [],
        protectedMutationFields: [],
        hasUnknownMutationField: true,
        hasUnknownFragment: true,
        hasMutationOperations,
        hasOperation: true,
        requiresCsrf: true,
        requiresAuthRateLimit: true,
      };
    }

    return {
      operationType: toOperationTypeLabel(operations[0]?.operation ?? OperationTypeNode.QUERY),
      mutationFieldNames: [],
      authMutationFields: [],
      protectedMutationFields: [],
      hasUnknownMutationField: true,
      hasUnknownFragment: true,
      hasMutationOperations,
      hasOperation: true,
      requiresCsrf: hasMutationOperations,
      requiresAuthRateLimit: hasMutationOperations,
    };
  }

  const fragments = new Map<string, FragmentDefinitionNode>();
  for (const definition of document.definitions) {
    if (definition.kind === "FragmentDefinition") {
      fragments.set(definition.name.value, definition);
    }
  }

  const fieldNames: string[] = [];
  collectSelectionFieldNames(
    targetOperation.selectionSet.selections,
    fragments,
    new Set<string>(),
    fieldNames,
  );

  const mutationFieldNames = fieldNames;
  const authMutationFields = mutationFieldNames.filter((fieldName) =>
    isPublicAuthMutationField(fieldName),
  );
  const protectedMutationFields = mutationFieldNames.filter(
    (fieldName) =>
      fieldName !== UNKNOWN_PROTECTED_MUTATION_FIELD && !isPublicAuthMutationField(fieldName),
  );
  const operationType = toOperationTypeLabel(targetOperation.operation);
  const hasUnknownMutationField = mutationFieldNames.includes(UNKNOWN_PROTECTED_MUTATION_FIELD);
  const hasUnknownFragment = [...mutationFieldNames].some(
    (fieldName) => fieldName === UNKNOWN_PROTECTED_MUTATION_FIELD,
  );

  return {
    operationType,
    mutationFieldNames,
    authMutationFields,
    protectedMutationFields,
    hasUnknownMutationField,
    hasUnknownFragment,
    hasMutationOperations,
    hasOperation: true,
    requiresCsrf:
      operationType === "mutation" &&
      (protectedMutationFields.length > 0 ||
        hasUnknownMutationField ||
        mutationFieldNames.length === 0),
    requiresAuthRateLimit:
      operationType === "mutation" &&
      (authMutationFields.length > 0 || (hasUnknownMutationField && hasMutationOperations)),
  };
};
