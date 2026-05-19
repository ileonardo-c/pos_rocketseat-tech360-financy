import { gql } from "@apollo/client";

export const ME_QUERY = gql`
  query Me {
    me {
      id
      name
      email
    }
  }
`;

export const CATEGORIES_QUERY = gql`
  query Categories {
    categories {
      id
      name
    }
  }
`;

export const TRANSACTIONS_QUERY = gql`
  query Transactions {
    transactions {
      id
      title
      description
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
