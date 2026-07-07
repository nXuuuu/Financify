import { Routes, Route, Navigate } from 'react-router-dom'
import { FinanceProvider } from '@/context/FinanceContext'
import ProtectedRoute from '@/router/ProtectedRoute'
import AuthLayout from '@/layouts/AuthLayout'
import AppLayout from '@/layouts/AppLayout'
import LoginPage from '@/pages/auth/LoginPage'
import SignupPage from '@/pages/auth/SignupPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import TransactionsPage from '@/pages/transactions/TransactionsPage'
import WalletPage from '@/pages/wallet/WalletPage'
import GoalsPage from '@/pages/goals/GoalsPage'
import AnalyticsPage from '@/pages/analytics/AnalyticsPage'
import SettingsPage from '@/pages/settings/SettingsPage'

function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <FinanceProvider>
              <AppLayout />
            </FinanceProvider>
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
