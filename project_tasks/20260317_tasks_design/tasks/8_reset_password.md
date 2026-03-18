8. Implement email feature/password reset feature

# Email Feature & Password Reset – Design Document

## 1. Overview

The application requires two core email-based features:

- **Email Verification**: confirm that a user owns the email address they registered with.
- **Password Reset**: allow a user to securely regain access to their account if they forget their password.

These features rely on the existing `users` table, which already contains the necessary columns:
- `email_confirmed` (boolean)
- `email_verification_token` (text)
- `password_reset_token` (text)
- `password_reset_expiry` (timestamp with time zone)

An email sending service (`IEmailService`) is already present in the backend and configured via `appsettings.json`. It sends emails through an HTTP API (e.g., a local SMTP mock or a transactional email provider).

## 2. User Flows

### 2.1 Email Verification Flow

1. **User registers** → backend creates user with `email_confirmed = false` and generates a secure random token stored in `email_verification_token`.
2. Backend sends an email containing a verification link:  
   `https://app.example.com/verify-email?token=<token>`
3. User clicks the link → frontend calls a verification endpoint with the token.
4. Backend validates the token, marks `email_confirmed = true`, and clears the token.
5. User is redirected to a success page or automatically logged in.

**Alternative**: Resend verification email (triggered from frontend profile or login page if email not confirmed).

### 2.2 Password Reset Flow

1. **User requests reset** on login page by providing their email.
2. Backend checks if email exists. If yes, generates a secure random token and stores it in `password_reset_token` with an expiry (e.g., 1 hour) in `password_reset_expiry`.
3. Backend sends an email containing a reset link:  
   `https://app.example.com/reset-password?token=<token>`
4. User clicks link → frontend shows a form to enter new password (and confirm).
5. Frontend submits new password + token to a reset endpoint.
6. Backend validates token (not expired, matches), hashes new password, updates `password_hash`, clears token and expiry.
7. User is redirected to login page with success message.

**Note**: For security, the reset link should be single-use and expire after first use or after the set time.

## 3. API Endpoints

All endpoints are under `/api/auth`.

### 3.1 Email Verification

| Method | Endpoint                 | Request Body          | Description                           |
|--------|--------------------------|-----------------------|---------------------------------------|
| POST   | `/verify-email`          | `{ "token": "..." }`  | Verifies email using the token.       |
| POST   | `/resend-verification`   | `{ "email": "..." }`  | Resends verification email if not yet confirmed. |

**POST /verify-email**  
- Validates token, finds user by `email_verification_token`.  
- If token is valid (no expiry needed – token is cleared after use), sets `email_confirmed = true` and clears token.  
- Returns 200 OK on success, 400 if invalid/expired.

**POST /resend-verification**  
- Checks if user exists and `email_confirmed = false`.  
- Generates a new token (replace old one), stores it, sends email.  
- Returns 200 OK even if email doesn’t exist (to avoid email enumeration).  
- Rate-limited per email/IP.

### 3.2 Password Reset

| Method | Endpoint                 | Request Body                       | Description                          |
|--------|--------------------------|------------------------------------|--------------------------------------|
| POST   | `/forgot-password`       | `{ "email": "..." }`               | Initiates password reset.            |
| POST   | `/reset-password`        | `{ "token": "...", "newPassword": "..." }` | Completes password reset. |

**POST /forgot-password**  
- If user exists, generates token, stores it with expiry (e.g., UTC now + 1 hour).  
- Sends email with reset link.  
- Returns 200 OK always (prevents email enumeration).  
- Rate-limited per email/IP.

**POST /reset-password**  
- Finds user by `password_reset_token` and checks `password_reset_expiry > now`.  
- Hashes `newPassword`, updates `password_hash`.  
- Clears token and expiry.  
- Returns 200 OK on success, 400 if token invalid/expired.

## 4. Email Templates

Two simple HTML email templates are needed. They should include the app name and a clear call-to-action button.

### 4.1 Verification Email

```
Subject: Verify your email for [App Name]

Hi {{username}},

Please verify your email address by clicking the button below:

[Verify Email] (link: {{verificationLink}})

If you didn't create an account, you can ignore this email.

Thanks,
The [App Name] Team
```

### 4.2 Password Reset Email

```
Subject: Reset your password for [App Name]

Hi {{username}},

We received a request to reset your password. Click the button below to set a new password:

[Reset Password] (link: {{resetLink}})

This link will expire in 1 hour.

If you didn't request this, please ignore this email.

Thanks,
The [App Name] Team
```

Both templates will be rendered server-side using a simple string replacement (or a templating engine like Razor). The `EmailService` will accept parameters: `to`, `subject`, `htmlBody`, `textBody`.

## 5. Database Schema (already exists)

```sql
CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    email character varying(255),
    email_confirmed boolean DEFAULT false NOT NULL,
    role character varying(20) DEFAULT 'user'::character varying NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    password_reset_token text,
    password_reset_expiry timestamp with time zone,
    email_verification_token text,
    ...
);
```

- `email_verification_token` – stores a random token for email confirmation. Cleared after use.
- `password_reset_token` – stores token for password reset. Cleared after use or expiry.
- `password_reset_expiry` – timestamp after which the token is considered invalid.

No additional tables are required.

## 6. Security Considerations

### 6.1 Token Generation
- Use a cryptographically secure random generator (e.g., `RandomNumberGenerator.GetBytes` in .NET) to create tokens (32 bytes → ~43 chars in base64).
- Store tokens as strings; they are random and not predictable.

### 6.2 Token Expiry
- Password reset tokens must have an expiry (e.g., 1 hour). Use UTC time to avoid timezone issues.
- Email verification tokens do not strictly need expiry because they are cleared after first use, but setting a reasonable expiry (e.g., 24 hours) is good practice to avoid stale tokens.

### 6.3 Rate Limiting
- Apply rate limiting on `/forgot-password` and `/resend-verification` to prevent abuse (e.g., 5 requests per hour per email/IP). The existing `RateLimitingMiddleware` can be extended or a dedicated attribute can be used.
- Use Redis distributed cache to track counts across multiple instances.

### 6.4 Email Address Enumeration Prevention
- On `/forgot-password` and `/resend-verification`, always return a success response (200 OK) even if the email does not exist. This prevents attackers from discovering which emails are registered.
- However, you may optionally return a generic error message like “If the email exists, a reset link has been sent.”

### 6.5 Secure Links
- All email links should use HTTPS.
- Tokens should be passed as query parameters, not in the body, for simplicity (they are short-lived and single-use). Ensure links are not logged in plaintext (e.g., avoid exposing tokens in server logs). Use `[LogIgnore]` or similar.

### 6.6 Password Strength
- Enforce minimum password strength (e.g., length 8, mix of characters) on the reset form. The backend should validate the new password against the same policy as registration.

### 6.7 Session Invalidation
- Optionally, after a successful password reset, invalidate all active sessions for that user (except maybe the current one if they are logged in). This can be done by calling `_sessionRepo.RevokeAllForUserAsync(userId)`. The current implementation of `AdminService` already has such a method; it can be reused.

## 7. Email Service Integration

The backend already has an `IEmailService` with an implementation that uses `HttpClient` to call an email API (like MailHog, SendGrid, etc.). The `EmailSettings` are read from `appsettings.json`:

```json
"Email": {
  "ApiEndpoint": "http://localhost:8025/api/send",
  "FromEmail": "noreply@yourapp.com",
  "FromName": "Your App Name",
  "ThrowOnError": false
}
```

The service should be extended to support sending templated emails. A simple approach:

- Create helper methods `SendVerificationEmailAsync(string to, string username, string token)` and `SendPasswordResetEmailAsync(string to, string username, string token)`.
- These methods construct the HTML using templates (stored as embedded resources or inline strings) and call the low-level `SendEmailAsync`.

## 8. Frontend Components

### 8.1 Pages

- **VerifyEmail.vue** – A simple page that reads `token` from query param, calls `/verify-email`, and shows success/failure message.
- **ForgotPassword.vue** – A form with email input. On submit calls `/forgot-password` and shows “If that email is registered, a reset link has been sent.”
- **ResetPassword.vue** – Reads `token` from query param, displays new password and confirm password fields. On submit calls `/reset-password` with token and new password. Shows success/error.

### 8.2 Store/Actions

Add actions to `authStore` (or a dedicated `emailStore`) to handle these API calls.

### 8.3 Routing

Add routes (in `router/index.ts`):

```ts
{
  path: "/verify-email",
  name: "verify-email",
  component: () => import("@/features/auth/pages/VerifyEmail.vue"),
  meta: { requiresGuest: true } // or allow both authenticated and unauthenticated
},
{
  path: "/forgot-password",
  name: "forgot-password",
  component: () => import("@/features/auth/pages/ForgotPassword.vue"),
  meta: { requiresGuest: true }
},
{
  path: "/reset-password",
  name: "reset-password",
  component: () => import("@/features/auth/pages/ResetPassword.vue"),
  meta: { requiresGuest: true }
}
```

## 9. Implementation Steps

1. **Backend**:
   - Extend `AuthController` with the four new endpoints.
   - Implement token generation helpers (static class `TokenGenerator`).
   - Add validation logic for email existence (without revealing existence).
   - Integrate `IEmailService` to send emails.
   - Use `IUserRepository` methods to find by token and update.
   - Apply rate limiting attributes or middleware.

2. **Frontend**:
   - Create the three new pages.
   - Add API client methods in a separate module (e.g., `authApi.ts`).
   - Update `authStore` with actions.
   - Add links in login form: “Forgot password?” and “Resend verification email” (if user tries to log in with unconfirmed email).

3. **Testing**:
   - Test flows with MailHog or similar local SMTP server.
   - Verify token expiry and single-use.
   - Test rate limiting.

## 10. Open Questions / Future Improvements

- Should email verification be required before allowing login? Currently, the `AuthService` does not check `email_confirmed`. This can be added later as a configurable policy.
- Consider adding a “change email” feature that requires verification of the new address.
- Use background jobs (the existing `IQueueService`) to send emails asynchronously to improve response time. The email service can be called via a queued job.

This design provides a complete blueprint for implementing email verification and password reset features in the existing application.