import { useEffect, useState } from 'react'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Employees from './pages/Employees'
import Inventory from './pages/Inventory'
import Projects from './pages/Projects'
import Finance from './pages/Finance'
import Documents from './pages/Documents'
import Quotations from './pages/Quotations'
import Users from './pages/Users'
import Settings from './pages/Settings'
import Login from './pages/Login'
import PDV from './pages/PDV'
import ServiceOrders from './pages/ServiceOrders'
import CRM from './pages/CRM'
import Plans from './pages/Plans'
import Contracts from './pages/Contracts'
import Warehouse from './pages/Warehouse'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { AppearanceProvider } from './hooks/useAppearance'

function AppContent() {
  const { user, isLoading, canAccess } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')

  useEffect(() => {
    if (!user) return
    if (user.email === 'mestre@whatchpro.com' && !canAccess(activeTab)) setActiveTab('users')
  }, [activeTab, canAccess, user])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  const renderContent = () => {
    if (!canAccess(activeTab)) {
      if (user?.email === 'mestre@whatchpro.com') return <Users />
      return <Dashboard />
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveTab} />
      case 'pdv':
        return <PDV />
      case 'clients':
        return <Clients />
      case 'employees':
        return <Employees />
      case 'inventory':
        return <Inventory />
      case 'warehouse':
        return <Warehouse />
      case 'projects':
        return <Projects />
      case 'finance':
        return <Finance />
      case 'documents':
        return <Documents />
      case 'quotations':
        return <Quotations />
      case 'service-orders':
        return <ServiceOrders />
      case 'crm':
        return <CRM />
      case 'plans':
        return <Plans />
      case 'contracts':
        return <Contracts />
      case 'users':
        return <Users />
      case 'settings':
        return <Settings />
      default:
        return <Dashboard />
    }
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  )
}

function App() {
  return (
    <AppearanceProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </AppearanceProvider>
  )
}

export default App
