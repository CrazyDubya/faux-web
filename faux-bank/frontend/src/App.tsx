import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import {
  Dashboard,
  Accounts,
  AccountDetail,
  Transactions,
  Merchant,
  Agents,
  Compliance,
  Testing,
  Settings,
} from '@/pages'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/accounts/:accountId" element={<AccountDetail />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/merchant" element={<Merchant />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/compliance" element={<Compliance />} />
          <Route path="/testing" element={<Testing />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
