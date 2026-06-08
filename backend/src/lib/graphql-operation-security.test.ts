import { analyzeGraphqlOperation } from "./graphql-operation-security";

type AnalysisScenario = {
  description: string;
  query: string;
  operationName?: string;
  expectedAuthRateLimit: boolean;
  expectedAuthFields: string[];
  expectedProtectedStateChanging?: boolean;
};

const assert = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const toSet = (values: string[]) => values.sort().join(",");

const tests: AnalysisScenario[] = [
  {
    description: "login mutation directly",
    query: `
      mutation {
        login(input: { email: "user@example.com", password: "password" }) {
          token
        }
      }
    `,
    expectedAuthRateLimit: true,
    expectedAuthFields: ["login"],
    expectedProtectedStateChanging: false,
  },
  {
    description: "login mutation through named fragment",
    query: `
      mutation {
        ...AuthFields
      }

      fragment AuthFields on Mutation {
        login(input: { email: "user@example.com", password: "password" }) {
          token
        }
      }
    `,
    expectedAuthRateLimit: true,
    expectedAuthFields: ["login"],
    expectedProtectedStateChanging: false,
  },
  {
    description: "requestPasswordReset through named fragment",
    query: `
      mutation {
        ...AuthFields
      }

      fragment AuthFields on Mutation {
        requestPasswordReset(input: { email: "user@example.com" })
      }
    `,
    expectedAuthRateLimit: true,
    expectedAuthFields: ["requestPasswordReset"],
    expectedProtectedStateChanging: false,
  },
  {
    description: "resetPassword through inline fragment",
    query: `
      mutation {
        ... on Mutation {
          resetPassword(input: { token: "token", newPassword: "new-pass" })
        }
      }
    `,
    expectedAuthRateLimit: true,
    expectedAuthFields: ["resetPassword"],
    expectedProtectedStateChanging: false,
  },
  {
    description: "nested fragments",
    query: `
      mutation {
        ...A
      }

      fragment A on Mutation {
        ...B
      }

      fragment B on Mutation {
        login(input: { email: "user@example.com", password: "password" }) {
          token
        }
      }
    `,
    expectedAuthRateLimit: true,
    expectedAuthFields: ["login"],
    expectedProtectedStateChanging: false,
  },
  {
    description: "alias on auth mutation",
    query: `
      mutation {
        auth: login(input: { email: "user@example.com", password: "password" }) {
          token
        }
      }
    `,
    expectedAuthRateLimit: true,
    expectedAuthFields: ["login"],
    expectedProtectedStateChanging: false,
  },
  {
    description: "repeated aliases on auth mutation",
    query: `
      mutation {
        first: login(input: { email: "user@example.com", password: "password" }) {
          token
        }
        second: login(input: { email: "user@example.com", password: "password" }) {
          token
        }
      }
    `,
    expectedAuthRateLimit: true,
    expectedAuthFields: ["login", "login"],
    expectedProtectedStateChanging: false,
  },
  {
    description: "unknown fragment should trigger conservative auth rate limit",
    query: `
      mutation {
        ...UnknownAuthFields
      }
    `,
    expectedAuthRateLimit: true,
    expectedAuthFields: [],
    expectedProtectedStateChanging: true,
  },
  {
    description: "protected mutation through fragment",
    query: `
      mutation {
        ...AuthFields
      }

      fragment AuthFields on Mutation {
        removeProfileAvatar
      }
    `,
    expectedAuthRateLimit: false,
    expectedAuthFields: [],
    expectedProtectedStateChanging: true,
  },
  {
    description: "mixed public auth and protected mutation in same operation",
    query: `
      mutation {
        logout
        ...AuthFields
      }

      fragment AuthFields on Mutation {
        login(input: { email: "user@example.com", password: "password" }) {
          token
        }
      }
    `,
    expectedAuthRateLimit: true,
    expectedAuthFields: ["login", "logout"],
    expectedProtectedStateChanging: false,
  },
  {
    description: "multiple operations with operationName targets selected operation",
    query: `
      mutation Update {
        requestPasswordReset(input: { email: "ignored@example.com" })
      }

      mutation Login {
        login(input: { email: "user@example.com", password: "password" }) {
          token
        }
      }
    `,
    operationName: "Login",
    expectedAuthRateLimit: true,
    expectedAuthFields: ["login"],
    expectedProtectedStateChanging: false,
  },
  {
    description: "multiple operations without operationName must stay conservatively protected",
    query: `
      mutation {
        login(input: { email: "user@example.com", password: "password" }) {
          token
        }
      }

      query {
        me {
          id
        }
      }
    `,
    expectedAuthRateLimit: true,
    expectedAuthFields: [],
    expectedProtectedStateChanging: true,
  },
];

for (const scenario of tests) {
  const analysis = analyzeGraphqlOperation({
    query: scenario.query,
    operationName: scenario.operationName,
  });

  assert(
    analysis.requiresAuthRateLimit === scenario.expectedAuthRateLimit,
    `${scenario.description}: expected requiresAuthRateLimit=${scenario.expectedAuthRateLimit}, got ${analysis.requiresAuthRateLimit}`,
  );

  const receivedAuthFields = [...analysis.authMutationFields].sort();
  assert(
    toSet(receivedAuthFields) === toSet(scenario.expectedAuthFields),
    `${scenario.description}: expected auth fields "${scenario.expectedAuthFields.join(",")}", got "${receivedAuthFields.join(",")}"`,
  );

  if (scenario.expectedProtectedStateChanging !== undefined) {
    assert(
      analysis.requiresCsrf === scenario.expectedProtectedStateChanging,
      `${scenario.description}: expected requiresCsrf=${scenario.expectedProtectedStateChanging}, got ${analysis.requiresCsrf}`,
    );
  }

  console.log(`graphql-security: ${scenario.description}`);
}

console.log("graphql-security: all scenarios passed");
