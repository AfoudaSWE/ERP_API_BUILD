-- Keep schema migrations data-neutral: authentication users/roles are seeded separately.
DELETE FROM ledger_accounts WHERE system_role IN ('inventory', 'grni');
DELETE FROM tax_rules WHERE code = 'STANDARD';
DELETE FROM units WHERE code = 'piece';
