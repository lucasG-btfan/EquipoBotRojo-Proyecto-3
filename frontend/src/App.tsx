import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { DashboardPage } from './pages/DashboardPage'
import { GestionIpsPage } from './pages/GestionIpsPage'
import { InicioPage } from './pages/InicioPage'
import { LoginPage } from './pages/LoginPage'
import { LogsDeteccionPage } from './pages/LogsDeteccionPage'
import { Fail2banPage } from './pages/Fail2banPage'
import { PrometheusPage } from './pages/PrometheusPage'
import { TicketsPage } from './pages/TicketsPage'
import { WazuhPage } from './pages/WazuhPage'

/**
 * Árbol de rutas (ver design.md D7). La sección "Dashboard" vive en
 * `/dashboard/panel` para no colisionar con `/dashboard`, el prefijo del
 * área protegida. Las 8 rutas hijas existen desde este change con
 * placeholders para que el sidebar sea verificable de punta a punta;
 * CH13–CH20 las reemplazan una por una sin tocar el router más que el
 * `import` de cada página.
 */
export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="inicio" element={<InicioPage />} />
        <Route path="panel" element={<DashboardPage />} />
        <Route path="logs" element={<LogsDeteccionPage />} />
        <Route path="ips" element={<GestionIpsPage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="fail2ban" element={<Fail2banPage />} />
        <Route path="prometheus" element={<PrometheusPage />} />
        <Route path="wazuh" element={<WazuhPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard/inicio" replace />} />
      <Route path="*" element={<Navigate to="/dashboard/inicio" replace />} />
    </Routes>
  )
}
