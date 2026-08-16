# HR employee onboarding

The HR module owns employee profiles and onboarding while the existing `users` table remains the authentication identity.

## Production workflow

1. Create and verify branches at `/branches`.
2. Create departments and shifts at `/hr` under **Departments & shifts**.
3. Create attendance workplaces at `/attendance`.
4. Select **Add employee** at `/hr` and provide the login identity, employee profile, at least one branch, an optional shift, and allowed workplaces.
5. The API validates that every selected entity belongs to the authenticated company, hashes the temporary password, and commits the user, profile, branch, shift and workplace assignments in one PostgreSQL transaction.
6. The employee signs in at `/attendance-portal` and receives the `employee` role's self-attendance permissions.

Onboarding and employee changes are recorded in the immutable audit log. Branch deletion is a soft archive so historical attendance, warehouse and financial records remain valid.

## API

- `GET /api/hr/bootstrap`
- `GET|POST|PATCH /api/hr/employees`
- `GET|POST|PATCH|DELETE /api/hr/branches`
- `GET|POST /api/hr/departments`
- Existing attendance shift and workplace APIs remain the systems of record for scheduling and geofencing.

Apply `024_hr_employee_onboarding.sql` before deploying the new API and web image. Use a unique temporary password and require an operational password-change process before distributing accounts.
