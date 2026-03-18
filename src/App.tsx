import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { AdminRoot } from './pages/AdminRoot';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { Vehicles } from './pages/Vehicles';
import { Technicians } from './pages/Technicians';
import { OsPage } from './pages/OsPage';
import { Catalog } from './pages/Catalog';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.isRoot) return <AdminRoot />;
  return <>{children}</>;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/budgets" element={<OsPage type="BUDGET" />} />
                <Route path="/os" element={<OsPage type="OS" />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/vehicles" element={<Vehicles />} />
                <Route path="/technicians" element={<Technicians />} />
                <Route path="/catalog" element={<Catalog />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

export default App;
