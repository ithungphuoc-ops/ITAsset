## ADDED Requirements

### Requirement: All data reads and writes go through Firebase Admin SDK on the server
The system SHALL perform all Firestore reads and writes from server-side code (Server Components, Server Actions, or Route Handlers) using the Firebase Admin SDK. No page or component SHALL call Firestore directly from the browser.

#### Scenario: Client component needs device data
- **WHEN** a page needs to display device, employee, department, or assignment data
- **THEN** the data is fetched by a Server Component or Server Action, not by client-side Firestore/Supabase calls

### Requirement: Firebase Auth replaces Supabase Auth for login
The system SHALL authenticate users via Firebase Auth using email and password, preserving the existing login UX (email + password form, no SSO).

#### Scenario: Existing user logs in after migration
- **WHEN** a user who had an account before the migration submits their email and password
- **THEN** the system authenticates them via Firebase Auth and grants access according to their role

#### Scenario: Unauthenticated access blocked
- **WHEN** an unauthenticated user requests `/dashboard/*` or `/my-devices/*`
- **THEN** the system redirects them to `/login`

### Requirement: Role is read from Firestore, not Auth metadata
The system SHALL store each dashboard user's role (`admin`, `it_staff`, or `viewer`) in a Firestore `profiles` document keyed by the Firebase Auth UID, and read it server-side to enforce access control. Employees who only receive devices (no dashboard login) are unaffected by this role model and continue to use `/my-devices`.

#### Scenario: Admin accesses dashboard
- **WHEN** a signed-in user with `profiles/{uid}.role == "admin"` requests any `/dashboard/*` route
- **THEN** the system allows the request

#### Scenario: Non-dashboard employee blocked from dashboard
- **WHEN** a signed-in user with no `profiles/{uid}` document (i.e. not a dashboard account) requests a `/dashboard/*` route
- **THEN** the system redirects them to `/my-devices`

### Requirement: Three-tier role-based access control on the dashboard
The system SHALL enforce three distinct permission levels for dashboard users: `admin` (full access including user account management), `it_staff` (full device/employee/department/assignment management, no access to user account management), and `viewer` (read-only access to devices, employees, departments, assignments, and stats — no create/edit/delete/assign/return actions).

#### Scenario: it_staff manages devices
- **WHEN** a user with role `it_staff` creates, edits, assigns, or returns a device
- **THEN** the system allows the action

#### Scenario: it_staff blocked from user management
- **WHEN** a user with role `it_staff` requests the user/role management page or its underlying API routes
- **THEN** the system denies the request

#### Scenario: viewer blocked from any write action
- **WHEN** a user with role `viewer` attempts to create, edit, delete, assign, or return a device, employee, or department
- **THEN** the system denies the action

#### Scenario: viewer can browse read-only views
- **WHEN** a user with role `viewer` opens the device list, device detail, employee list, or dashboard stats page
- **THEN** the system displays the data without showing any create/edit/delete/assign/return controls

### Requirement: Device photo uploads use Firebase Storage
The system SHALL store any device photo (`Device.imageUrl`) uploaded after the migration in Firebase Storage, replacing Supabase Storage. No pre-existing device photos exist in production to migrate as of this change.

#### Scenario: Admin uploads a device photo after migration
- **WHEN** an admin or it_staff uploads a photo for a device
- **THEN** the photo is stored in Firebase Storage and its URL is saved on the device record

### Requirement: Firestore Security Rules enforce access as a defense-in-depth layer
The system SHALL define Firestore Security Rules that deny writes to `devices`, `assignments`, `employees`, `departments` for any non-admin caller, and restrict `assignments` reads to the owning employee or an admin, independent of the server-side checks.

#### Scenario: Direct client access attempted
- **WHEN** a client attempts to write to `devices` or `assignments` directly against Firestore, bypassing the app's server code
- **THEN** Firestore Security Rules reject the write unless the caller is authenticated as an admin

### Requirement: Existing device, employee, department, and assignment data is migrated without loss
The system SHALL provide a one-time migration script that copies every row from Supabase's `devices`, `device_laptop_specs`, `device_monitor_specs`, `employees`, `departments`, and `assignments` tables into the corresponding Firestore collections, and reports a record count for each source table and destination collection so the counts can be verified to match.

#### Scenario: Migration count verification
- **WHEN** the migration script finishes running
- **THEN** it prints the number of records read from each Supabase table and the number of documents written to each Firestore collection, for manual comparison

### Requirement: API route response shapes are unchanged
The system SHALL keep the JSON request/response shape of existing routes (`/api/devices*`, `/api/employees*`, `/api/assignments`, `/api/my-devices`, `/api/departments`, `/api/stats`, `/api/qr`, `/api/admin/users*`) unchanged after switching their internal implementation to Firebase Admin SDK.

#### Scenario: Existing frontend code keeps working
- **WHEN** a page or component calls one of the existing API routes after the migration
- **THEN** the response JSON has the same shape as before the migration, requiring no frontend changes to consume it

## REMOVED Requirements

### Requirement: Legacy shared-password login cookie
**Reason**: `/api/auth/login` sets a `itasset_logged_in` cookie using a hardcoded/env password, but no middleware or UI code reads this cookie — it is dead code predating the current Supabase Auth-based login. Removing it during the migration avoids carrying over unused, confusing auth code.
**Migration**: No user-facing migration needed — this path was already unused. Real login continues to go through the email/password form, now backed by Firebase Auth instead of Supabase Auth.
