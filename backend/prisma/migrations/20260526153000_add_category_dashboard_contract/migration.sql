ALTER TABLE "Category"
ADD COLUMN "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN "icon" TEXT NOT NULL DEFAULT 'tag',
ADD COLUMN "color" TEXT NOT NULL DEFAULT 'gray';

UPDATE "Category"
SET
  "icon" = CASE
    WHEN lower("name") LIKE '%alimenta%' THEN 'utensils'
    WHEN lower("name") LIKE '%transporte%' THEN 'car-front'
    WHEN lower("name") LIKE '%mercado%' THEN 'shopping-cart'
    WHEN lower("name") LIKE '%entretenimento%' THEN 'ticket'
    WHEN lower("name") LIKE '%investimento%' THEN 'piggy-bank'
    WHEN lower("name") LIKE '%salário%' OR lower("name") LIKE '%salario%' THEN 'briefcase-business'
    WHEN lower("name") LIKE '%saúde%' OR lower("name") LIKE '%saude%' THEN 'heart-pulse'
    WHEN lower("name") LIKE '%utilidade%' THEN 'tool-case'
    ELSE 'tag'
  END,
  "color" = CASE
    WHEN lower("name") LIKE '%alimenta%' THEN 'blue'
    WHEN lower("name") LIKE '%transporte%' THEN 'purple'
    WHEN lower("name") LIKE '%mercado%' THEN 'orange'
    WHEN lower("name") LIKE '%entretenimento%' THEN 'pink'
    WHEN lower("name") LIKE '%investimento%' THEN 'green'
    WHEN lower("name") LIKE '%salário%' OR lower("name") LIKE '%salario%' THEN 'green'
    WHEN lower("name") LIKE '%saúde%' OR lower("name") LIKE '%saude%' THEN 'red'
    WHEN lower("name") LIKE '%utilidade%' THEN 'yellow'
    ELSE 'gray'
  END;
