# Database Schema

Database architecture diagram for Finly PWA application.

## ER Diagram

```mermaid
erDiagram
    TRANSACTIONS {
        int id PK
        decimal amount
        string type "income|expense"
        string categoryId FK
        int date
        string currency
        decimal rate
        string comment
        int templateId FK
        int createdAt
    }

    CATEGORIES {
        string id PK
        string name
        string icon
        string color
        boolean isSystem
        string type "income|expense"
        string parentId FK
    }

    BUDGETS {
        int id PK
        string categoryId FK
        decimal limitAmount
        string period "week|month"
        int startDate
    }

    GOALS {
        int id PK
        string name
        decimal targetAmount
        decimal currentAmount
        int deadline
        boolean isActive
    }

    RECURRING_TEMPLATES {
        int id PK
        decimal amount
        string type "income|expense"
        string categoryId FK
        string interval "daily|weekly|monthly|yearly"
        int nextDate
        boolean isActive
    }

    SETTINGS {
        string key PK
        any value
    }

    AI_PATTERNS {
        int id PK
        string pattern
        string categoryId FK
        decimal confidence
        int usageCount
    }

    TRANSACTIONS ||--o{ CATEGORIES : "belongs to"
    BUDGETS ||--o{ CATEGORIES : "tracks"
    RECURRING_TEMPLATES ||--o{ CATEGORIES : "categorizes"
    AI_PATTERNS ||--o{ CATEGORIES : "suggests"
    CATEGORIES ||--o{ CATEGORIES : "parent-child"
    RECURRING_TEMPLATES ||--o{ TRANSACTIONS : "generates"
```

## Tables Description

| Table | Primary Key | Description |
|-------|-------------|-------------|
| `transactions` | `id` (auto-increment) | Financial transactions (income/expenses) |
| `categories` | `id` (UUID string) | Categories with icons and colors |
| `budgets` | `id` (auto-increment) | Spending limits per category and period |
| `goals` | `id` (auto-increment) | Financial goals / savings targets |
| `recurringTemplates` | `id` (auto-increment) | Templates for recurring payments |
| `settings` | `key` (string) | Key-value store for app settings |
| `aiPatterns` | `id` (auto-increment) | AI patterns for auto-categorization |

## Relationships

- **Transactions → Categories**: Many-to-one (each transaction belongs to a category)
- **Budgets → Categories**: Many-to-one (budgets track limits per category)
- **Recurring Templates → Categories**: Many-to-one (templates define category for payments)
- **AI Patterns → Categories**: Many-to-one (patterns suggest categories)
- **Categories → Categories**: Self-referencing (support for subcategories via `parentId`)
- **Recurring Templates → Transactions**: One-to-many (templates generate transactions)
