import AppLayout from "@/components/layout/AppLayout";
import AllInitiatives from "@/components/pages/AllInitiatives";
import DashboardOverview from "@/components/pages/DashboardOverview";
import EditReport from "@/components/pages/EditReport";
import LoginPage from "@/components/pages/LoginPage";
import OwnerDashboard from "@/components/pages/OwnerDashboard";
import ReportDetails from "@/components/pages/ReportDetails";
import ReportHistory from "@/components/pages/ReportHistory";
import ReportsMonitor from "@/components/pages/ReportsMonitor";
import StrategicPlanning from "@/components/pages/StrategicPlanning";
import SubmitReport from "@/components/pages/SubmitReport";
import UserManagement from "@/components/pages/UserManagement";
import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("authToken");
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setUser(null);
  };

  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }

  // Jika belum login → tunjuk login page
  if (!user) {
    return (
      <Routes>
        <Route
          path="/login"
          element={<LoginPage onLoginSuccess={handleLoginSuccess} />}
        />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  // Jika user dah login
  return (
    <AppLayout onLogout={handleLogout} userRole={user.role}>
      {user.role === "admin" ? (
        // --- ROUTES UNTUK ADMIN ---
        <Routes>
          <Route path="/" element={<DashboardOverview />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/planning" element={<StrategicPlanning />} />
          <Route path="/initiatives" element={<AllInitiatives />} />
          <Route path="/reports" element={<ReportsMonitor />} />
          <Route path="/report/:id" element={<ReportDetails />} /> {/* ✅ DITAMBAH */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      ) : (
        // --- ROUTES UNTUK OWNER ---
        <Routes>
          <Route path="/" element={<OwnerDashboard />} />
          <Route path="/submit-report" element={<SubmitReport />} />
          <Route path="/report-history" element={<ReportHistory />} />
          <Route path="/report/:id" element={<ReportDetails />} />
          <Route path="/edit-report/:id" element={<EditReport />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      )}
    </AppLayout>
  );
}

export default App;
