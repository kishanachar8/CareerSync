import { Outlet } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar.jsx';
import Navbar from '../components/common/Navbar.jsx';
import Toast from '../components/common/Toast.jsx';
import { useSelector } from 'react-redux';

const DashboardLayout = () => {
  const sidebarOpen = useSelector((s) => s.ui.sidebarOpen);

  return (
    <div className="flex h-screen bg-surface-50 overflow-hidden">
      <Sidebar />

      {/* Main content area — shifts right based on sidebar width */}
      <div
        className="flex flex-col flex-1 overflow-hidden transition-[margin] duration-300 ease-in-out"
        style={{ marginLeft: sidebarOpen ? 240 : 64 }}
      >
        <Navbar />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-5 sm:p-6 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      <Toast />
    </div>
  );
};

export default DashboardLayout;
