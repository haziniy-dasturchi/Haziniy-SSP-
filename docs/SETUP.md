# Setup Guide (Non-Developer)

Welcome to the Haziniy SSP project. Follow these step-by-step instructions to set up the backend infrastructure using Supabase.

### 1. Create a Supabase Project
- Navigate to [https://supabase.com](https://supabase.com) and create an account or sign in.
- Create a new project (the Free plan is sufficient). Note down your **Project Reference ID**.
- Locate your credentials in the Supabase Dashboard:
  - **Settings > API**:
    - `SUPABASE_URL` (Your Project URL)
    - `SUPABASE_ANON_KEY` (Your public anonymous key)
    - `SUPABASE_SERVICE_ROLE_KEY` (Your service_role secret key — **NEVER expose this to browsers!**)
  - **Settings > Database**:
    - `SUPABASE_DB_URL` (Find this under Connection string > URI)

### 2. Install Supabase CLI
You need the Supabase Command Line Interface to interact with your project locally.
- **Windows**: Run `scoop install supabase` or `npm install -g supabase` in your terminal.
- **Mac**: Run `brew install supabase/tap/supabase`

### 3. Clone the Repository
Download the project code to your machine:
```bash
git clone https://github.com/haziniy-dasturchi/haziniy-ssp.git
cd haziniy-ssp
```

### 4. Link to your Supabase Project
Link your local codebase to the Supabase project you created in Step 1:
```bash
supabase link --project-ref your-project-ref
```

### 5. Push Migrations
Set up your database tables and schemas:
```bash
supabase db push
```

### 6. Seed the Database
Populate your database with essential starting data:
```bash
supabase db push --include-seed
```
*(Alternatively, you can manually copy the contents of `seed.sql` and run it in the Supabase SQL Editor on the dashboard).*

### 7. Set Edge Function Secrets
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are automatically injected into Supabase Edge Functions by default (Supabase prevents setting custom secrets starting with `SUPABASE_`).

Only configure external secrets like Google Gemini:
```bash
supabase secrets set GEMINI_API_KEY=your-gemini-api-key
supabase secrets set GEMINI_MODEL=gemini-2.5-flash
```

### 8. Deploy Edge Functions
Deploy the serverless functions that handle backend logic:
```bash
supabase functions deploy admin-users
supabase functions deploy ai-analyze
```

### 9. Create the Owner Account
The initial Owner account is generated automatically if you ran the seed in Step 6.
To create it manually:
- Go to the **Supabase Dashboard > SQL Editor**.
- Run the bootstrap SQL command provided in `seed.sql` with your chosen phone number and password.
- *(Developers can also achieve this by setting environment variables and invoking the bootstrap function).*

### 10. Configure GitHub Actions (Optional)
If you are setting up Continuous Integration via GitHub, add the following Repository Secrets to your GitHub repository settings:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_DB_URL`

### 11. Disable Public Signup (IMPORTANT)
To ensure only administrators can create users:
- Go to **Supabase Dashboard > Authentication > Settings > Auth Providers > Email**.
- Turn OFF **'Enable email signup'**.
*(Note: The `config.toml` file in the repository already sets `enable_signup = false`, but it is best practice to verify this in the dashboard).*
