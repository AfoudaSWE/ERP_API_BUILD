-- Cashiers enter through POS only. POS backend operations authorize pos.use directly.
DELETE FROM role_permissions WHERE role IN ('cashier','pos_cashier') AND permission_code <> 'pos.use';
