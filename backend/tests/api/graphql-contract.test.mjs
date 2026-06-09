const graphqlUrl = process.env.GRAPHQL_URL ?? "http://127.0.0.1:4000/graphql";
const requestDelayMs = 500;
const maxRequestRetries = 8;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const request = async (query, token, variables = {}) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRequestRetries; attempt += 1) {
    try {
      const response = await fetch(graphqlUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query, variables }),
      });

      if (!response.ok) {
        throw new Error(`GraphQL HTTP error: ${response.status}`);
      }

      const payload = await response.json();
      if (payload.errors?.length) {
        const message = payload.errors.map((error) => error.message).join("; ");
        throw new Error(`GraphQL execution error: ${message}`);
      }

      return payload.data;
    } catch (error) {
      lastError = error;

      const isRetryableError = error instanceof TypeError && error.message === "fetch failed";
      if (!isRetryableError) {
        throw error;
      }

      if (attempt >= maxRequestRetries) {
        throw new Error(
          `GraphQL request failed after ${maxRequestRetries} attempts to ${graphqlUrl}: ${error.message}`,
        );
      }

      await sleep(requestDelayMs * attempt);
    }
  }

  throw lastError;
};

const requestWithGraphQLErrors = async (query, token, variables = {}) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRequestRetries; attempt += 1) {
    try {
      const response = await fetch(graphqlUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query, variables }),
      });

      if (!response.ok) {
        throw new Error(`GraphQL HTTP error: ${response.status}`);
      }

      const payload = await response.json();
      return {
        httpStatus: response.status,
        data: payload.data ?? null,
        errors: payload.errors ?? [],
      };
    } catch (error) {
      lastError = error;

      const isRetryableError = error instanceof TypeError && error.message === "fetch failed";
      if (!isRetryableError) {
        throw error;
      }

      if (attempt >= maxRequestRetries) {
        throw new Error(
          `GraphQL request failed after ${maxRequestRetries} attempts to ${graphqlUrl}: ${error.message}`,
        );
      }

      await sleep(requestDelayMs * attempt);
    }
  }

  throw lastError;
};

const ensure = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const uploadToSignedUrl = async (signedUrl, contentType, body) => {
  const upload = (url, headers = {}) =>
    fetch(url, {
      method: "PUT",
      headers: {
        "content-type": contentType,
        ...headers,
      },
      body,
    });

  try {
    const response = await upload(signedUrl);
    if (response.ok) {
      return response;
    }
    return response;
  } catch (error) {
    const publicEndpoint = process.env.AWS_S3_ENDPOINT_PUBLIC?.trim();
    if (!publicEndpoint) {
      throw error;
    }

    const originalUrl = new URL(signedUrl);
    const publicUrl = new URL(publicEndpoint);
    if (originalUrl.hostname !== "s3.internal" && originalUrl.hostname !== "minio") {
      throw error;
    }

    publicUrl.pathname = originalUrl.pathname;
    publicUrl.search = originalUrl.search;

    return upload(publicUrl.toString(), {
      host: originalUrl.host,
    });
  }
};

const requiredDashboardQueryFields = [
  "transactions",
  "transactionSummary",
  "transactionCategorySummary",
  "dashboardRecentTransactions",
  "categoriesList",
  "categoriesCount",
  "categoriesOverview",
];

const dashboardContractQuery = `
  query DashboardContractQueryFields {
    __type(name: "Query") {
      fields {
        name
        args {
          name
        }
      }
    }
  }
`;

const runDashboardContractCheck = async () => {
  const data = await request(dashboardContractQuery);
  const queryFields = data?.__type?.fields ?? [];
  const queryFieldSet = new Set(queryFields.map((field) => field.name));

  const missingFields = requiredDashboardQueryFields.filter((field) => !queryFieldSet.has(field));
  ensure(
    missingFields.length === 0,
    `Dashboard contract mismatch. Missing Query fields: ${missingFields.join(", ")}`,
  );

  const recentField = queryFields.find((field) => field.name === "dashboardRecentTransactions");
  const recentArgNames = new Set((recentField?.args ?? []).map((arg) => arg.name));
  ensure(
    recentArgNames.has("filter") && recentArgNames.has("limit"),
    "Dashboard contract mismatch. dashboardRecentTransactions must expose filter and limit arguments",
  );

  const categoriesListField = queryFields.find((field) => field.name === "categoriesList");
  const categoriesListArgNames = new Set((categoriesListField?.args ?? []).map((arg) => arg.name));
  ensure(
    categoriesListArgNames.has("page") && categoriesListArgNames.has("perPage"),
    "Categories contract mismatch. categoriesList must expose page and perPage arguments",
  );
};

const randomSuffix = Math.random().toString(36).slice(2, 10);
const userInput = {
  name: `Smoke User ${randomSuffix}`,
  email: `smoke.${randomSuffix}@financy.local`,
  password: "SmokePass123!",
};
const secondUserInput = {
  name: `Smoke User Two ${randomSuffix}`,
  email: `smoke.two.${randomSuffix}@financy.local`,
  password: "SmokePass123!",
};

const runGraphQLProbe = () => request("query HealthProbe { __typename }");

const registerMutation = `
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      created
      user { id email }
    }
  }
`;

const loginMutation = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user { id email }
    }
  }
`;

const meQuery = `
  query Me {
    me { id email }
  }
`;

const createCategoryMutation = `
  mutation CreateCategory($input: CreateCategoryInput!) {
    createCategory(input: $input) { id name icon color userId }
  }
`;

const createTransactionMutation = `
  mutation CreateTransaction($input: CreateTransactionInput!) {
    createTransaction(input: $input) { id title categoryId userId receiptKey receiptUrl }
  }
`;

const updateCategoryMutation = `
  mutation UpdateCategory($id: ID!, $input: UpdateCategoryInput!) {
    updateCategory(id: $id, input: $input) { id name icon color userId }
  }
`;

const updateTransactionMutation = `
  mutation UpdateTransaction($id: ID!, $input: UpdateTransactionInput!) {
    updateTransaction(id: $id, input: $input) { id title amount userId receiptKey receiptUrl }
  }
`;

const requestUploadUrlMutation = `
  mutation RequestUploadUrl($input: UploadInput!) {
    requestUploadUrl(input: $input) {
      url
      key
      publicUrl
      expiresIn
    }
  }
`;

const categoriesQuery = `
  query Categories {
    categories { id name }
  }
`;

const transactionsQuery = `
  query Transactions {
    transactions { id title }
  }
`;

const transactionsCountQuery = `
  query TransactionsCount {
    transactionsCount
  }
`;

const deleteTransactionMutation = `
  mutation DeleteTransaction($id: ID!) {
    deleteTransaction(id: $id)
  }
`;

const deleteCategoryMutation = `
  mutation DeleteCategory($id: ID!) {
    deleteCategory(id: $id)
  }
`;

const run = async () => {
  await runGraphQLProbe();
  await runDashboardContractCheck();

  const registerData = await request(registerMutation, undefined, { input: userInput });
  ensure(registerData?.register?.created === true, "Register should return created=true");
  ensure(registerData.register.user.email === userInput.email, "Registered user email mismatch");

  const loginData = await request(loginMutation, undefined, {
    input: { email: userInput.email, password: userInput.password },
  });
  const token = loginData?.login?.token;
  const userId = loginData?.login?.user?.id;
  ensure(token, "Missing token from login");
  ensure(userId, "Missing user id from login");

  const meData = await request(meQuery, token);
  ensure(meData?.me?.email === userInput.email, "me query returned unexpected user");

  const categoryName = `Smoke Category ${randomSuffix}`;
  const categoryData = await request(createCategoryMutation, token, {
    input: { name: categoryName, icon: "utensils", color: "blue" },
  });
  const categoryId = categoryData?.createCategory?.id;
  ensure(categoryId, "Category creation returned no id");

  const transactionData = await request(createTransactionMutation, token, {
    input: {
      title: `Smoke Transaction ${randomSuffix}`,
      description: "E2E smoke transaction",
      amount: 123.45,
      type: "EXPENSE",
      date: new Date().toISOString(),
      categoryId,
    },
  });
  const transactionId = transactionData?.createTransaction?.id;
  ensure(transactionId, "Transaction creation returned no id");

  const transactionCountBeforeOldTransaction = await request(transactionsCountQuery, token);
  ensure(
    transactionCountBeforeOldTransaction?.transactionsCount === 1,
    `Unfiltered transaction count should be 1 before old transaction, got ${transactionCountBeforeOldTransaction?.transactionsCount}`,
  );

  const oldTransactionData = await request(createTransactionMutation, token, {
    input: {
      title: `Old Smoke Transaction ${randomSuffix}`,
      description: "E2E smoke transaction outside the current month",
      amount: 42,
      type: "EXPENSE",
      date: "2024-01-15T12:00:00.000Z",
      categoryId,
    },
  });
  const oldTransactionId = oldTransactionData?.createTransaction?.id;
  ensure(oldTransactionId, "Old transaction creation returned no id");

  const categoriesData = await request(categoriesQuery, token);
  ensure(
    categoriesData.categories.some((category) => category.id === categoryId),
    "Created category not found in list",
  );

  const transactionsData = await request(transactionsQuery, token);
  ensure(
    transactionsData.transactions.some((transaction) => transaction.id === transactionId),
    "Created transaction not found in list",
  );
  ensure(
    transactionsData.transactions.some((transaction) => transaction.id === oldTransactionId),
    "Old transaction without date filter not found in list",
  );

  const transactionCountAfterOldTransaction = await request(transactionsCountQuery, token);
  ensure(
    transactionCountAfterOldTransaction?.transactionsCount === 2,
    `Unfiltered transaction count should include old transaction, got ${transactionCountAfterOldTransaction?.transactionsCount}`,
  );

  const updateCategoryData = await request(updateCategoryMutation, token, {
    id: categoryId,
    input: { name: `${categoryName} Editada` },
  });
  ensure(
    updateCategoryData?.updateCategory?.id === categoryId,
    "Category update returned unexpected id",
  );

  const updatedCategoryName = updateCategoryData?.updateCategory?.name;
  ensure(updatedCategoryName === `${categoryName} Editada`, "Updated category name mismatch");
  ensure(
    updateCategoryData?.updateCategory?.icon === "utensils",
    "Partial category rename should preserve icon",
  );
  ensure(
    updateCategoryData?.updateCategory?.color === "blue",
    "Partial category rename should preserve color",
  );

  const updateTransactionData = await request(updateTransactionMutation, token, {
    id: transactionId,
    input: {
      title: `Smoke Transaction ${randomSuffix} Editada`,
      amount: 222.99,
      date: new Date().toISOString(),
      categoryId,
    },
  });
  ensure(
    updateTransactionData?.updateTransaction?.id === transactionId,
    "Transaction update returned unexpected id",
  );
  ensure(
    updateTransactionData?.updateTransaction?.title === `Smoke Transaction ${randomSuffix} Editada`,
    "Updated transaction title mismatch",
  );
  ensure(
    typeof updateTransactionData?.updateTransaction?.amount === "number",
    "Updated transaction amount should be numeric",
  );

  const uploadData = await request(requestUploadUrlMutation, token, {
    input: {
      fileName: `smoke-receipt-${randomSuffix}.pdf`,
      contentType: "application/pdf",
      sizeBytes: 1024,
    },
  });
  ensure(uploadData?.requestUploadUrl?.url, "Missing signed upload URL");
  ensure(uploadData?.requestUploadUrl?.key, "Missing upload key");
  ensure(uploadData?.requestUploadUrl?.publicUrl, "Missing upload public URL");
  ensure(uploadData?.requestUploadUrl?.expiresIn > 0, "Invalid upload URL expiration");
  ensure(
    uploadData.requestUploadUrl.key.startsWith(`users/${userId}/receipts/`),
    "Upload key does not match authenticated user namespace",
  );

  const receiptPayload = new TextEncoder().encode("GraphQL smoke receipt payload");
  const uploadResponse = await uploadToSignedUrl(
    uploadData.requestUploadUrl.url,
    "application/pdf",
    receiptPayload,
  );
  ensure(uploadResponse.ok, `Receipt upload failed with status ${uploadResponse.status}`);

  const createReceiptTransactionData = await request(createTransactionMutation, token, {
    input: {
      title: `Smoke Receipt Transaction ${randomSuffix}`,
      description: "E2E smoke receipt transaction",
      amount: 77.7,
      type: "EXPENSE",
      date: new Date().toISOString(),
      categoryId,
      receiptKey: uploadData.requestUploadUrl.key,
    },
  });
  const receiptTransactionId = createReceiptTransactionData?.createTransaction?.id;
  ensure(receiptTransactionId, "Receipt transaction creation returned no id");
  ensure(
    createReceiptTransactionData?.createTransaction?.receiptKey === uploadData.requestUploadUrl.key,
    "Created transaction receipt key mismatch",
  );
  ensure(
    createReceiptTransactionData?.createTransaction?.receiptUrl ===
      uploadData.requestUploadUrl.publicUrl,
    "Created transaction receipt URL should match the public upload URL",
  );

  const updateUploadData = await request(requestUploadUrlMutation, token, {
    input: {
      fileName: `smoke-receipt-update-${randomSuffix}.pdf`,
      contentType: "application/pdf",
      sizeBytes: 1024,
    },
  });
  ensure(updateUploadData?.requestUploadUrl?.url, "Missing signed update upload URL");
  ensure(updateUploadData?.requestUploadUrl?.key, "Missing update upload key");
  ensure(updateUploadData?.requestUploadUrl?.publicUrl, "Missing update upload public URL");
  ensure(
    updateUploadData.requestUploadUrl.key.startsWith(`users/${userId}/receipts/`),
    "Update upload key does not match authenticated user namespace",
  );

  const updateReceiptPayload = new TextEncoder().encode("GraphQL smoke update receipt payload");
  const updateUploadResponse = await uploadToSignedUrl(
    updateUploadData.requestUploadUrl.url,
    "application/pdf",
    updateReceiptPayload,
  );
  ensure(
    updateUploadResponse.ok,
    `Receipt update upload failed with status ${updateUploadResponse.status}`,
  );

  const receiptTransactionData = await request(updateTransactionMutation, token, {
    id: transactionId,
    input: {
      receiptKey: updateUploadData.requestUploadUrl.key,
    },
  });
  ensure(
    receiptTransactionData?.updateTransaction?.receiptKey === updateUploadData.requestUploadUrl.key,
    "Updated transaction receipt key mismatch",
  );
  ensure(
    receiptTransactionData?.updateTransaction?.receiptUrl ===
      updateUploadData.requestUploadUrl.publicUrl,
    "Updated transaction receipt URL should match the public upload URL",
  );

  const invalidUploadContentType = await requestWithGraphQLErrors(requestUploadUrlMutation, token, {
    input: {
      fileName: `smoke-receipt-${randomSuffix}.html`,
      contentType: "text/html",
      sizeBytes: 1024,
    },
  });
  ensure(
    invalidUploadContentType.errors.some(
      (error) => error.extensions?.code === "UPLOAD_INVALID_CONTENT_TYPE",
    ),
    "HTML receipt upload should be rejected",
  );

  const invalidUploadSize = await requestWithGraphQLErrors(requestUploadUrlMutation, token, {
    input: {
      fileName: `smoke-receipt-${randomSuffix}.pdf`,
      contentType: "application/pdf",
      sizeBytes: 10 * 1024 * 1024 + 1,
    },
  });
  ensure(
    invalidUploadSize.errors.some((error) => error.extensions?.code === "UPLOAD_INVALID_SIZE"),
    "Oversized receipt upload should be rejected",
  );

  const secondRegisterData = await request(registerMutation, undefined, { input: secondUserInput });
  ensure(
    secondRegisterData?.register?.created === true,
    "Second user register should return created=true",
  );

  const secondLoginData = await request(loginMutation, undefined, {
    input: { email: secondUserInput.email, password: secondUserInput.password },
  });
  const secondToken = secondLoginData?.login?.token;
  const secondUserId = secondLoginData?.login?.user?.id;
  ensure(secondToken, "Missing token from second user login");
  ensure(secondUserId, "Missing user id from second user login");

  const secondMeData = await request(meQuery, secondToken);
  ensure(
    secondMeData?.me?.email === secondUserInput.email,
    "Second user me query returned unexpected user",
  );

  const secondUserCategoriesData = await request(categoriesQuery, secondToken);
  ensure(
    !secondUserCategoriesData.categories.some((category) => category.id === categoryId),
    "Second user should not list categories from another user",
  );

  const secondUserTransactionsData = await request(transactionsQuery, secondToken);
  ensure(
    !secondUserTransactionsData.transactions.some(
      (transaction) => transaction.id === transactionId,
    ),
    "Second user should not list transactions from another user",
  );

  const crossUpdateTransaction = await requestWithGraphQLErrors(
    updateTransactionMutation,
    secondToken,
    {
      id: transactionId,
      input: {
        title: `Smoke Transaction ${randomSuffix} Hijacked`,
      },
    },
  );
  ensure(
    crossUpdateTransaction.errors.length > 0 ||
      crossUpdateTransaction.data?.updateTransaction?.id !== transactionId,
    "Cross-user transaction update should fail",
  );

  const crossUpdateCategory = await requestWithGraphQLErrors(updateCategoryMutation, secondToken, {
    id: categoryId,
    input: {
      name: `Smoke Category ${randomSuffix} Hijacked`,
    },
  });
  ensure(
    crossUpdateCategory.errors.length > 0 ||
      crossUpdateCategory.data?.updateCategory?.id !== categoryId,
    "Cross-user category update should fail",
  );

  const crossDeleteTransaction = await requestWithGraphQLErrors(
    deleteTransactionMutation,
    secondToken,
    {
      id: transactionId,
    },
  );
  ensure(
    crossDeleteTransaction.errors.length > 0 ||
      crossDeleteTransaction.data?.deleteTransaction === false,
    "Cross-user transaction delete should fail",
  );

  const crossDeleteCategory = await requestWithGraphQLErrors(deleteCategoryMutation, secondToken, {
    id: categoryId,
  });
  ensure(
    crossDeleteCategory.errors.length > 0 || crossDeleteCategory.data?.deleteCategory === false,
    "Cross-user category delete should fail",
  );

  const deleteTransactionData = await request(deleteTransactionMutation, token, {
    id: transactionId,
  });
  ensure(deleteTransactionData.deleteTransaction === true, "Transaction deletion failed");

  const deleteReceiptTransactionData = await request(deleteTransactionMutation, token, {
    id: receiptTransactionId,
  });
  ensure(
    deleteReceiptTransactionData.deleteTransaction === true,
    "Receipt transaction deletion failed",
  );

  const deleteOldTransactionData = await request(deleteTransactionMutation, token, {
    id: oldTransactionId,
  });
  ensure(deleteOldTransactionData.deleteTransaction === true, "Old transaction deletion failed");

  const deleteCategoryData = await request(deleteCategoryMutation, token, { id: categoryId });
  ensure(deleteCategoryData.deleteCategory === true, "Category deletion failed");

  console.log("GraphQL smoke and contract flow passed");
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
