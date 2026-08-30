import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/app-shell';
import { PatientsPage } from './pages/Patients';
import { SettingsPage } from './pages/SettingsPage';
import { Dashboard } from './pages/Dashboard';
import { QueuePage } from './pages/QueuePage';
import { InventoryPage } from './pages/InventoryPage';
import { BillingPage } from './pages/BillingPage';
import { ReportsPage } from './pages/ReportsPage';
import { DoctorWorkspacePage } from './pages/DoctorWorkspacePage';
import { ReceptionDispensingPage } from './pages/ReceptionDispensingPage';
import { PaymentPage } from './pages/PaymentPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { StaffPage } from './pages/StaffPage';
import { ClinicProvider } from './context/ClinicContext';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import Showcase from './pages/showcase/Showcase';
import { PremiumReferencePage } from './pages/PremiumReferencePage';

import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <ClinicProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            
            {/* Main Application Routes inside AppShell (Protected) */}
            <Route path="/" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="patients" element={<PatientsPage />} />
            <Route path="appointments" element={<AppointmentsPage />} />
            <Route path="queue" element={<QueuePage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="premium-reference" element={<PremiumReferencePage />} />
            
            {/* Action Routes */}
            <Route path="doctor/patient/:id" element={<DoctorWorkspacePage />} />
            <Route path="reception/dispensing/:visitId" element={<ReceptionDispensingPage />} />
            <Route path="reception/payment/:visitId" element={<PaymentPage />} />
          </Route>
          
          {/* Standalone Showcase */}
          <Route path="/showcase" element={<Showcase />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" toastOptions={{ className: 'font-medium' }} />
    </ClinicProvider>
    </AuthProvider>
  );
}

export default App;
