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
      token
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
    createCategory(input: $input) { id name userId }
  }
`;

const createTransactionMutation = `
  mutation CreateTransaction($input: CreateTransactionInput!) {
    createTransaction(input: $input) { id title categoryId userId }
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

  const registerData = await request(registerMutation, undefined, { input: userInput });
  ensure(registerData?.register?.token, "Missing token from register");
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
    input: { name: categoryName },
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

  const uploadData = await request(requestUploadUrlMutation, token, {
    input: {
      fileName: `smoke-receipt-${randomSuffix}.txt`,
      contentType: "text/plain",
    },
  });
  ensure(uploadData?.requestUploadUrl?.url, "Missing signed upload URL");
  ensure(uploadData?.requestUploadUrl?.key, "Missing upload key");
  ensure(uploadData?.requestUploadUrl?.publicUrl, "Missing upload public URL");
  ensure(uploadData?.requestUploadUrl?.expiresIn > 0, "Invalid upload URL expiration");
  ensure(
    uploadData.requestUploadUrl.key.startsWith(`users/${userId}/`),
    "Upload key does not match authenticated user namespace",
  );

  const secondRegisterData = await request(registerMutation, undefined, { input: secondUserInput });
  ensure(secondRegisterData?.register?.token, "Missing token from second user register");

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

  const crossDeleteTransaction = await requestWithGraphQLErrors(
    deleteTransactionMutation,
    secondToken,
    {
      id: transactionId,
    },
  );
  ensure(crossDeleteTransaction.errors.length > 0, "Cross-user transaction delete should fail");

  const crossDeleteCategory = await requestWithGraphQLErrors(deleteCategoryMutation, secondToken, {
    id: categoryId,
  });
  ensure(crossDeleteCategory.errors.length > 0, "Cross-user category delete should fail");

  const deleteTransactionData = await request(deleteTransactionMutation, token, {
    id: transactionId,
  });
  ensure(deleteTransactionData.deleteTransaction === true, "Transaction deletion failed");

  const deleteCategoryData = await request(deleteCategoryMutation, token, { id: categoryId });
  ensure(deleteCategoryData.deleteCategory === true, "Category deletion failed");

  console.log("GraphQL smoke flow passed");
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
