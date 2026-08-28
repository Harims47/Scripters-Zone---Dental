import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/app-shell';
import { PatientsPage } from './pages/Patients';
import { SettingsPage } from './pages/SettingsPage';
import { Dashboard } from './pages/Dashboard';
import { QueuePage } from './pages/QueuePage';
import { InventoryPage } from './pages/InventoryPage';
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
            <Route path="patients" element={<PatientsPage />} />
            <Route path="appointments" element={<AppointmentsPage />} />
            <Route path="queue" element={<QueuePage />} />
            <Route path="doctor/patient/:patientId" element={<DoctorWorkspacePage />} />
            <Route path="reception/dispensing" element={<ReceptionDispensingPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="payments" element={<PaymentPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          
          {/* Standalone Showcase Route (Not in AppShell) */}
          <Route path="/showcase" element={<Showcase />} />
          
          {/* Premium UI Reference Route */}
          <Route path="/reference" element={<PremiumReferencePage />} />
        </Routes>
      </BrowserRouter>
    </ClinicProvider>
    </AuthProvider>
  );
}

export default App;
