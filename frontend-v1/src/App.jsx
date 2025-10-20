import { Route, Routes } from 'react-router-dom';
import AdminDashboard from './components/AdminDashboard';
import AppLayout from "./components/AppLayout";
import UserManagement from './components/UserManagement';

function App() {
  return (
    <AppLayout>
      <Routes>
        {/* The main dashboard page */}
        <Route path="/" element={<AdminDashboard />} />

        {/* The user management page */}
        <Route path="/users" element={<UserManagement />} />
      </Routes>
    </AppLayout>
  );
}

export default App;