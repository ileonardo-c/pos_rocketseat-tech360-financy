import { gql } from "@apollo/client";

export const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      created
      user {
        id
        name
        email
        avatarUrl
      }
    }
  }
`;

export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        id
        name
        email
        avatarUrl
      }
    }
  }
`;

export const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`;

export const ME_QUERY = gql`
  query Me {
    me {
      id
      name
      email
      avatarUrl
    }
  }
`;

export const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      name
      email
      avatarUrl
    }
  }
`;

export const REQUEST_PROFILE_AVATAR_UPLOAD_URL_MUTATION = gql`
  mutation RequestProfileAvatarUploadUrl($input: ProfileAvatarUploadInput!) {
    requestProfileAvatarUploadUrl(input: $input) {
      url
      key
      publicUrl
      expiresIn
    }
  }
`;

export const UPDATE_PROFILE_AVATAR_MUTATION = gql`
  mutation UpdateProfileAvatar($input: UpdateProfileAvatarInput!) {
    updateProfileAvatar(input: $input) {
      id
      name
      email
      avatarUrl
    }
  }
`;

export const REMOVE_PROFILE_AVATAR_MUTATION = gql`
  mutation RemoveProfileAvatar {
    removeProfileAvatar {
      id
      name
      email
      avatarUrl
    }
  }
`;

export const REQUEST_PASSWORD_RESET_MUTATION = gql`
  mutation RequestPasswordReset($input: RequestPasswordResetInput!) {
    requestPasswordReset(input: $input)
  }
`;

export const RESET_PASSWORD_MUTATION = gql`
  mutation ResetPassword($input: ResetPasswordInput!) {
    resetPassword(input: $input)
  }
`;

export const CATEGORIES_QUERY = gql`
  query Categories {
    categories {
      id
      name
      description
      icon
      color
      transactionsCount
      userId
    }
  }
`;

export const CATEGORIES_LIST_QUERY = gql`
  query CategoriesList($page: Int, $perPage: Int) {
    categoriesList(page: $page, perPage: $perPage) {
      id
      name
      description
      icon
      color
      transactionsCount
      userId
    }
  }
`;

export const CATEGORIES_COUNT_QUERY = gql`
  query CategoriesCount {
    categoriesCount
  }
`;

export const CATEGORIES_OVERVIEW_QUERY = gql`
  query CategoriesOverview {
    categoriesOverview {
      totalCategories
      totalTransactions
      mostUsedCategory {
        id
        name
        icon
        color
        count
      }
    }
  }
`;

export const CREATE_CATEGORY_MUTATION = gql`
  mutation CreateCategory($input: CreateCategoryInput!) {
    createCategory(input: $input) {
      id
      name
      description
      icon
      color
      transactionsCount
      userId
    }
  }
`;

export const UPDATE_CATEGORY_MUTATION = gql`
  mutation UpdateCategory($id: ID!, $input: UpdateCategoryInput!) {
    updateCategory(id: $id, input: $input) {
      id
      name
      description
      icon
      color
      transactionsCount
      userId
    }
  }
`;

export const DELETE_CATEGORY_MUTATION = gql`
  mutation DeleteCategory($id: ID!) {
    deleteCategory(id: $id)
  }
`;

export const TRANSACTIONS_QUERY = gql`
  query Transactions(
    $filter: TransactionListFilterInput
    $sort: TransactionSortInput
    $page: Int
    $perPage: Int
  ) {
    transactions(filter: $filter, sort: $sort, page: $page, perPage: $perPage) {
      id
      title
      description
      amount
      type
      date
      receiptKey
      receiptUrl
      userId
      categoryId
      category {
        id
        name
        icon
        color
      }
      createdAt
      updatedAt
    }
  }
`;

export const TRANSACTIONS_COUNT_QUERY = gql`
  query TransactionsCount($filter: TransactionListFilterInput) {
    transactionsCount(filter: $filter)
  }
`;

export const TRANSACTIONS_INITIAL_PERIOD_QUERY = gql`
  query TransactionsInitialPeriod {
    transactionsInitialPeriod {
      from
      to
      source
    }
  }
`;

const DASHBOARD_CATEGORIES_QUERY = gql`
  query DashboardCategories {
    categories {
      id
      name
      icon
      color
    }
  }
`;

export const DASHBOARD_TRANSACTIONS_QUERY = gql`
  query DashboardTransactions {
    transactions {
      id
      title
      amount
      type
      date
      category {
        id
        name
      }
    }
  }
`;

export const DASHBOARD_RECENT_TRANSACTIONS_QUERY = gql`
  query DashboardRecentTransactions($filter: TransactionSummaryFilterInput, $limit: Int) {
    dashboardRecentTransactions(filter: $filter, limit: $limit) {
      id
      title
      amount
      type
      date
      category {
        id
        name
      }
    }
  }
`;

export const DASHBOARD_TRANSACTION_SUMMARY_QUERY = gql`
  query DashboardTransactionSummary($filter: TransactionSummaryFilterInput) {
    transactionSummary(filter: $filter) {
      incomeTotal
      expenseTotal
      balance
      totalCount
      byType {
        type
        total
        count
      }
    }
  }
`;

export const DASHBOARD_TRANSACTION_CATEGORY_SUMMARY_QUERY = gql`
  query DashboardTransactionCategorySummary(
    $filter: TransactionSummaryFilterInput
    $limit: Int
  ) {
    transactionCategorySummary(filter: $filter, limit: $limit) {
      categoryId
      categoryName
      total
      count
      incomeTotal
      expenseTotal
      balance
    }
  }
`;

const DASHBOARD_TRANSACTION_TIMELINE_QUERY = gql`
  query DashboardTransactionTimeline(
    $filter: TransactionSummaryFilterInput
    $interval: TransactionTimelineInterval
  ) {
    transactionTimeline(filter: $filter, interval: $interval) {
      period
      incomeTotal
      expenseTotal
      balance
      cumulativeBalance
      count
    }
  }
`;

export const CREATE_TRANSACTION_MUTATION = gql`
  mutation CreateTransaction($input: CreateTransactionInput!) {
    createTransaction(input: $input) {
      id
      title
      description
      amount
      type
      date
      receiptKey
      receiptUrl
      userId
      categoryId
      category {
        id
        name
      }
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_TRANSACTION_MUTATION = gql`
  mutation UpdateTransaction($id: ID!, $input: UpdateTransactionInput!) {
    updateTransaction(id: $id, input: $input) {
      id
      title
      description
      amount
      type
      date
      receiptKey
      receiptUrl
      userId
      categoryId
      category {
        id
        name
      }
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_TRANSACTION_MUTATION = gql`
  mutation DeleteTransaction($id: ID!) {
    deleteTransaction(id: $id)
  }
`;

const REQUEST_UPLOAD_URL_MUTATION = gql`
  mutation RequestUploadUrl($input: UploadInput!) {
    requestUploadUrl(input: $input) {
      url
      key
      publicUrl
      expiresIn
    }
  }
`;
