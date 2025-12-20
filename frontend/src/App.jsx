import api from "@/api";
import AppLayout from "@/components/layout/AppLayout";
import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

// --- Import Security Guard ---
import ProtectedRoute from "@/components/ProtectedRoute";

// --- Import Halaman ---
import AllInitiatives from "@/components/pages/AllInitiatives";
import ChangePasswordPage from "@/components/pages/ChangePasswordPage";
import DashboardOverview from "@/components/pages/DashboardOverview";
import EditReport from "@/components/pages/EditReport";
import LoginPage from "@/components/pages/LoginPage";
import OwnerDashboard from "@/components/pages/OwnerDashboard"; // Ini Halaman Inisiatif
import ReportDetails from "@/components/pages/ReportDetails";
import ReportHistory from "@/components/pages/ReportHistory";
import ReportsMonitor from "@/components/pages/ReportsMonitor";
import StrategicPlanning from "@/components/pages/StrategicPlanning";
import SubmitReport from "@/components/pages/SubmitReport";
import UserManagement from "@/components/pages/UserManagement";

// --- Import Modul Enrolmen ---
import AdminAnnouncementPage from "@/components/pages/AdminAnnouncementPage";
import AdminEnrollmentImport from "@/components/pages/AdminEnrollmentImport";
import EnrollmentExportPage from "@/components/pages/EnrollmentExportPage"; // ✅ GUNA INI
import EnrollmentSettingsPage from "@/components/pages/EnrollmentSettingsPage";
import EnrollmentVerificationPage from "@/components/pages/EnrollmentVerificationPage";
import JPNEnrollmentDashboard from "@/components/pages/JPNEnrollmentDashboard";
import KPMEnrollmentDashboard from "@/components/pages/KPMEnrollmentDashboard";

// --- Import Modul Program ---
import ProgramReportsPage from "@/components/pages/ProgramReportsPage";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Semakan Sesi
  useEffect(() => {
    const verifyUser = async () => {
      const token = localStorage.getItem("authToken");
      if (token) {
        try {
          const res = await api.get("/users/me");
          setUser(res.data);
          localStorage.setItem("user", JSON.stringify(res.data));
          localStorage.setItem("mustChangePassword", res.data.mustChangePassword);
        } catch (error) {
          console.error("Sesi tidak sah:", error.message);
          setUser(null);
          localStorage.clear();
        }
      }
      setLoading(false);
    };
    verifyUser();
  }, []);

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // --- Public Routes ---
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  // --- Logik Role ---
  const role = (user.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const isPPD = role === "ppd";
  const isUser = role === "user";
  const isNegeri = role === "negeri"; // JPN
  const isBahagian = role === "bahagian";

  // Kumpulan Akses
  const isMonitorLegacy = isAdmin || isNegeri || isBahagian;
  const isReporter = isPPD || isUser || isNegeri || isBahagian;

  return (
    <AppLayout onLogout={handleLogout} userRole={user.role} user={user}>
      <Routes>

        {/* --- 1. ROUTE KHAS --- */}
        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePasswordPage />
            </ProtectedRoute>
          }
        />

        {/* --- 2. ROUTE UTAMA (DASHBOARD / INISIATIF) --- */}

        {/* Jika Admin: Pergi /dashboard. Jika Lain: Papar Inisiatif (OwnerDashboard) di root */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              {isAdmin ? <Navigate to="/dashboard" replace /> : <OwnerDashboard />}
            </ProtectedRoute>
          }
        />

        {/* Dashboard Khas Admin */}
        {isAdmin && (
          <Route path="/dashboard" element={<ProtectedRoute><DashboardOverview /></ProtectedRoute>} />
        )}

        {/* --- 3. MODUL PELAPORAN INISIATIF (Semua Reporter) --- */}
        {(isReporter || isMonitorLegacy) && (
          <>
            {/* OwnerDashboard sudah dilayan di route "/" di atas */}
            <Route path="/submit-report" element={<ProtectedRoute><SubmitReport /></ProtectedRoute>} />
            <Route path="/report-history" element={<ProtectedRoute><ReportHistory /></ProtectedRoute>} />
            <Route path="/edit-report/:id" element={<ProtectedRoute><EditReport /></ProtectedRoute>} />
            <Route path="/report/:id" element={<ProtectedRoute><ReportDetails /></ProtectedRoute>} />
          </>
        )}

        {/* Pemantauan (Admin/JPN/Bahagian) */}
        {isMonitorLegacy && (
          <>
            <Route path="/initiatives" element={<ProtectedRoute><AllInitiatives /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><ReportsMonitor /></ProtectedRoute>} />
          </>
        )}

        {/* --- 4. MODUL ADMIN (User Mgmt) --- */}
        {isAdmin && (
          <>
            <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
            <Route path="/planning" element={<ProtectedRoute><StrategicPlanning /></ProtectedRoute>} />
            <Route path="/admin/announcements" element={<ProtectedRoute><AdminAnnouncementPage /></ProtectedRoute>} />
          </>
        )}

        {/* --- 5. MODUL ENROLMEN (STEM) --- */}

        {/* Dashboard Enrolmen */}
        {isAdmin && (
          <Route path="/enrollment/kpm-dashboard" element={<ProtectedRoute><KPMEnrollmentDashboard /></ProtectedRoute>} />
        )}
        {(isNegeri || isAdmin) && (
          <Route path="/enrollment/jpn-dashboard" element={<ProtectedRoute><JPNEnrollmentDashboard /></ProtectedRoute>} />
        )}

        {/* Semakan PPD (PPD, JPN, Admin) */}
        {(isPPD || isAdmin || isNegeri) && (
          <Route path="/enrollment/verify" element={<ProtectedRoute><EnrollmentVerificationPage /></ProtectedRoute>} />
        )}

        {/* Import & Settings (Admin Sahaja) */}
        {isAdmin && (
          <>
            <Route path="/enrollment/import" element={<ProtectedRoute><AdminEnrollmentImport /></ProtectedRoute>} />
            <Route path="/enrollment/settings" element={<ProtectedRoute><EnrollmentSettingsPage /></ProtectedRoute>} />
          </>
        )}

        {/* Eksport Data (Admin & JPN) ✅ */}
        {(isAdmin || isNegeri) && (
          <Route path="/enrollment/export" element={<ProtectedRoute><EnrollmentExportPage /></ProtectedRoute>} />
        )}

        {/* --- 6. MODUL PROGRAM (Laporan Aktiviti) --- */}
        <Route path="/programs" element={<ProtectedRoute><ProgramReportsPage /></ProtectedRoute>} />

        {/* --- 7. CATCH-ALL --- */}
        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </AppLayout>
  );
}

export default App;