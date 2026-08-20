import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Placeholder } from './components/layout/Placeholder'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { DashboardPage } from './pages/DashboardPage'
import { GestionIpsPage } from './pages/GestionIpsPage'
import { InicioPage } from './pages/InicioPage'
import { LoginPage } from './pages/LoginPage'
import { LogsDeteccionPage } from './pages/LogsDeteccionPage'

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
        <Route path="tickets" element={<Placeholder titulo="Tickets" />} />
        <Route path="fail2ban" element={<Placeholder titulo="Fail2ban" />} />
        <Route path="prometheus" element={<Placeholder titulo="Prometheus" />} />
        <Route path="wazuh" element={<Placeholder titulo="Wazuh" />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard/inicio" replace />} />
      <Route path="*" element={<Navigate to="/dashboard/inicio" replace />} />
    </Routes>
  )
}
