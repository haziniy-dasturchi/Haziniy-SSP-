# Authentication System

## Overview
The authentication system for the Haziniy SSP project leverages Supabase Auth but restricts signups to an internal administrative flow. The primary login method is a phone number and password.

## Mechanism
- **Phone + Password Login**: Login strictly uses phone number and password. There is no SMS OTP or email verification involved.
- **Synthetic Email Mapping**: Supabase Auth primarily relies on email. To adapt phone numbers, they are mapped to synthetic emails under the format: `998XXXXXXXXX@users.haziniyssp.app`.
- **Hidden Synthetic Email**: The synthetic email is **NEVER** shown to users. It is an internal construct purely to maintain compatibility with Supabase Auth requirements.
- **User Creation**: Users cannot publicly sign up. Account creation is exclusively handled via the `admin-users` Edge Function. The Supabase public signup feature is disabled.
- **Frontend Implementation**:
  - The frontend only asks the user for their phone number and password.
  - When submitting the login request, the frontend seamlessly formats the email:
    ```javascript
    supabase.auth.signInWithPassword({
      email: phone + '@users.haziniyssp.app',
      password: password
    });
    ```
- **Tracking Login**:
  - Immediately after a successful login, the frontend must execute `supabase.rpc('update_last_login')` to track the user's login timestamp in the database.
- **Initial Setup (Owner)**:
  - The very first Owner account is generated via `seed.sql` or a dedicated bootstrap function.
  - It utilizes environment variables: `OWNER_PHONE`, `OWNER_PASSWORD`, `OWNER_NAME`.
- **Requirements**:
  - **Password**: Must be at least 8 characters in length.
  - **Phone Format**: Must be exactly `998` followed by `9` digits (standard Uzbekistan format).
- **Session Management**:
  - Handled via JWT with a 1-hour expiration time.
  - Refresh token rotation is enabled for security.
