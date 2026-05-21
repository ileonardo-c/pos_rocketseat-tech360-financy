const graphqlUrl = process.env.GRAPHQL_URL ?? "http://127.0.0.1:4000/graphql";
const requestDelayMs = 500;
const maxRequestRetries = 8;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const request = async (query, variables = {}, token) => {
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

const runGraphQLProbe = () =>
  request(`query HealthProbe { __typename }`);

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

  const registerData = await request(registerMutation, { input: userInput });
  ensure(registerData?.register?.token, "Missing token from register");
  ensure(registerData.register.user.email === userInput.email, "Registered user email mismatch");

  const loginData = await request(loginMutation, {
    input: { email: userInput.email, password: userInput.password },
  });
  const token = loginData?.login?.token;
  ensure(token, "Missing token from login");

  const meData = await request(meQuery, {}, token);
  ensure(meData?.me?.email === userInput.email, "me query returned unexpected user");

  const categoryName = `Smoke Category ${randomSuffix}`;
  const categoryData = await request(createCategoryMutation, { input: { name: categoryName } }, token);
  const categoryId = categoryData?.createCategory?.id;
  ensure(categoryId, "Category creation returned no id");

  const transactionData = await request(
    createTransactionMutation,
    {
      input: {
        title: `Smoke Transaction ${randomSuffix}`,
        description: "E2E smoke transaction",
        amount: 123.45,
        type: "EXPENSE",
        date: new Date().toISOString(),
        categoryId,
      },
    },
    token,
  );
  const transactionId = transactionData?.createTransaction?.id;
  ensure(transactionId, "Transaction creation returned no id");

  const categoriesData = await request(categoriesQuery, {}, token);
  ensure(
    categoriesData.categories.some((category) => category.id === categoryId),
    "Created category not found in list",
  );

  const transactionsData = await request(transactionsQuery, {}, token);
  ensure(
    transactionsData.transactions.some((transaction) => transaction.id === transactionId),
    "Created transaction not found in list",
  );

  const deleteTransactionData = await request(deleteTransactionMutation, { id: transactionId }, token);
  ensure(deleteTransactionData.deleteTransaction === true, "Transaction deletion failed");

  const deleteCategoryData = await request(deleteCategoryMutation, { id: categoryId }, token);
  ensure(deleteCategoryData.deleteCategory === true, "Category deletion failed");

  console.log("GraphQL smoke flow passed");
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
