import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getCustomerProfile, getCustomerToken, loginCustomer, registerCustomer, setCustomerToken } from '../data-access/customerApi';

const CustomerContext = createContext(null);
export function CustomerProvider({ children }) {
  const [customer, setCustomer] = useState(null); const [loading, setLoading] = useState(Boolean(getCustomerToken()));
  const logout = useCallback(() => { setCustomerToken(null); setCustomer(null); }, []);
  useEffect(() => { if (!getCustomerToken()) return; getCustomerProfile().then(setCustomer).catch(logout).finally(() => setLoading(false)); }, [logout]);
  const authenticate = useCallback(async (operation, input) => { const result = await operation(input); setCustomerToken(result.accessToken); setCustomer(result.customer); return result.customer; }, []);
  const login = useCallback((input) => authenticate(loginCustomer, input), [authenticate]); const register = useCallback((input) => authenticate(registerCustomer, input), [authenticate]);
  const value = useMemo(() => ({ customer, loading, login, register, logout, setCustomer }), [customer, loading, login, register, logout]);
  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
}
// eslint-disable-next-line react-refresh/only-export-components
export function useCustomer() { const value = useContext(CustomerContext); if (!value) throw new Error('useCustomer must be used within CustomerProvider'); return value; }
