# Haziniy SSP - Balanced Scorecard System

## Overview

Haziniy SSP is a Balanced Scorecard web application designed for multi-branch learning centers in Uzbekistan. It allows management to track performance, set targets, and calculate employee bonuses effectively.

The backend infrastructure is built entirely on **Supabase** (Postgres + Auth + Edge Functions + Row Level Security) and is optimized to run completely on the Supabase **FREE plan**.

## Key Features

- **Phone-Based Authentication**: Secure login using phone number and password.
- **Automatic Plan Distribution**: Daily plan allocations derived from targeted monthly goals.
- **Real-time SSP Calculation**: Live computation of the Balanced Scorecard metrics.
- **Bonus Computation**: Automated employee bonus tracking based on scorecard performance.
- **AI-Powered Analysis**: Integrated with Google Gemini for automated data analysis and insights.
- **Robust Security**: Strict Row-Level Security (RLS) ensures multi-branch, multi-role data isolation.
- **Audit Trails**: Full audit logging of critical actions.

## Project Structure

```
haziniy-ssp/
├── supabase/     # Database migrations, seed, Edge Functions, tests
├── web/          # Frontend (built separately)
├── docs/         # API reference, setup guide, auth docs
└── .github/      # CI/CD workflows
```

## Documentation & Quick Links

- [Setup Guide](docs/SETUP.md)
- [API Reference](docs/API.md)
- [Authentication](docs/AUTH.md)
- [Import Format](docs/IMPORT.md)
