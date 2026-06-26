# Security Specification - GSM SMTP Tips Portal

This document outlines the core data invariants, a suite of 12 "Dirty Dozen" malicious payloads designed to test our zero-trust system boundaries, and the test assertions validating that unauthorized actions are mathematically blocked by Firestore security rules.

## 1. Data Invariants

1. **Identity & Authorization Separation**:
   - Only the user with the email `jilalamasanja1998@gmail.com` with a verified email state (`email_verified == true`) is recognized as the system Admin.
   - Normal users are permitted to create/update their own profile documents under `/users/{userId}` but cannot elevate their role or mutate `role` fields.
   - Any external user (including unauthenticated visitors) can read Category match information (`/categories/{categoryId}`).

2. **Input Type Integrity**:
   - All uploaded match metrics (odds, score tip, home, away) must be strictly validated string forms under size constraints (e.g., maximum size of 100 characters per text element) to prevent resource fatigue or page injection.
   - Standard and VIP match timestamps/times are bounded to prevent denial-of-wallet payload scaling.

3. **Temporal Integrity**:
   - Ticket dates and start times must be formatted correctly to prevent corrupting UI groupings.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following 12 payloads represent threat scenarios designed to bypass standard authorization, execute unauthorized state transitions, or corrupt match information:

### Payload 1: Admin Email Impersonation during User Creation
* **Target Path**: `/users/attacker_uid`
* **Threat Model**: Attacker tries to register their own user profile document but assigns themselves the admin email address in an attempt to spoof role checks.
* **Payload**:
```json
{
  "email": "jilalamasanja1998@gmail.com",
  "role": "user",
  "name": "Attacker"
}
```
* **Expectation**: `PERMISSION_DENIED` - The rule mandates that the `email` field must strictly match the authenticated user's token email (`request.auth.token.email`).

### Payload 2: Admin Role Escalation
* **Target Path**: `/users/attacker_uid`
* **Threat Model**: Standard user registers with their own email but sets the `"role"` field to `"admin"`.
* **Payload**:
```json
{
  "email": "attacker@gmail.com",
  "role": "admin",
  "name": "Attacker"
}
```
* **Expectation**: `PERMISSION_DENIED` - Only the genuine admin (`jilalamasanja1998@gmail.com`) can create or update profiles with `"admin"` status.

### Payload 3: Self-Elevation Update
* **Target Path**: `/users/attacker_uid`
* **Threat Model**: An existing standard user tries to update their profile to change their role from `"user"` to `"admin"`.
* **Payload**:
```json
{
  "email": "attacker@gmail.com",
  "role": "admin",
  "name": "Attacker"
}
```
* **Expectation**: `PERMISSION_DENIED` - The rule prevents modifying the `role` field after creation unless done by the system administrator.

### Payload 4: Overwriting Another User's Profile
* **Target Path**: `/users/jilalamasanja_uid`
* **Threat Model**: Attacker attempts to modify the profile document of the legitimate administrator.
* **Payload**:
```json
{
  "email": "jilalamasanja1998@gmail.com",
  "role": "user",
  "name": "Defaced Name"
}
```
* **Expectation**: `PERMISSION_DENIED` - Users can only write to their own matching `{userId}` document.

### Payload 5: Anonymous Category Manipulation (Create)
* **Target Path**: `/categories/new-vip-cat`
* **Threat Model**: Unauthenticated visitor tries to inject a custom category.
* **Payload**:
```json
{
  "id": "new-vip-cat",
  "title": "Hacked Odds",
  "isVip": true,
  "tickets": []
}
```
* **Expectation**: `PERMISSION_DENIED` - Writes are restricted exclusively to the admin.

### Payload 6: Malicious Ticket Injection by Non-Admin
* **Target Path**: `/categories/free-academy`
* **Threat Model**: An authenticated standard user attempts to append or change tickets under a match category.
* **Payload**:
```json
{
  "id": "free-academy",
  "title": "Free Academy Tips",
  "isVip": false,
  "tickets": [
    {
      "date": "2026-06-26",
      "matches": [
        {
          "num": "1",
          "home": "Hacker FC",
          "away": "Admin Fail",
          "score": "HACKED 9-0",
          "odds": "99.00"
        }
      ]
    }
  ]
}
```
* **Expectation**: `PERMISSION_DENIED` - Only the authorized admin email with verified token is permitted to modify the category lists.

### Payload 7: Path Poisoning/Junk ID Injection
* **Target Path**: `/categories/$$%20_Hacked_ID_With_Massive_Length_And_Special_Characters_$$`
* **Threat Model**: Threat actor attempts to pollute Firestore index sizes by registering non-standard document paths.
* **Payload**:
```json
{
  "id": "invalid",
  "title": "Invalid Path Category",
  "isVip": false
}
```
* **Expectation**: `PERMISSION_DENIED` - Path variables and document IDs must conform to standard regex constraints (`^[a-zA-Z0-9_\-]+$`) and strict size checks.

### Payload 8: PII Snooping on Admin Profile
* **Target Path**: `/users/jilalamasanja_uid`
* **Threat Model**: Random standard user attempts to read the personal details/profile of the admin.
* **Expectation**: `PERMISSION_DENIED` - User document reads are strictly gated to the matching document owner (`request.auth.uid == userId`) or the admin.

### Payload 9: Spoof Admin via Unverified Email Token
* **Target Path**: `/categories/vip-super`
* **Threat Model**: An attacker signs up using the admin's email on an unverified account (e.g., via standard password auth or custom provider where email confirmation is skipped) and tries to edit matches.
* **Payload**: (Update tickets array)
* **Auth State**: `request.auth.token.email == "jilalamasanja1998@gmail.com"`, but `request.auth.token.email_verified == false`.
* **Expectation**: `PERMISSION_DENIED` - Real admin checks enforce `request.auth.token.email_verified == true`.

### Payload 10: Value Poisoning (Giant Text Attack)
* **Target Path**: `/categories/free-academy`
* **Threat Model**: Malicious write attempt containing extremely long strings (e.g., a 1MB odds or team name string) designed to trigger high data-transfer bills.
* **Payload**: Category update where team names or scores contain 1,000,000 characters.
* **Expectation**: `PERMISSION_DENIED` - Schema enforcements restrict all text-based fields to strict maximum lengths.

### Payload 11: Broken Ticket Format Mutation
* **Target Path**: `/categories/vip-correct`
* **Threat Model**: Attempt to overwrite ticket listings with missing matches or corrupt array elements.
* **Payload**:
```json
{
  "id": "vip-correct",
  "title": "VIP Correct Score",
  "isVip": true,
  "tickets": "this-should-be-an-array-but-is-a-string-corruption"
}
```
* **Expectation**: `PERMISSION_DENIED` - Type enforcements verify fields conform to schema definitions.

### Payload 12: Denial of Wallet Read Attack
* **Target Path**: Bulk query list on `/users` collection.
* **Threat Model**: Non-admin attacker requests access to list all user profiles in the database.
* **Expectation**: `PERMISSION_DENIED` - List queries on private profiles are prohibited unless requesting the user's own profile.
