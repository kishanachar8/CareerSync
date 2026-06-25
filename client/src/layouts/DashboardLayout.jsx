import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar.jsx';
import Navbar from '../components/common/Navbar.jsx';
import BottomNav from '../components/common/BottomNav.jsx';
import Toast from '../components/common/Toast.jsx';
import Loader from '../components/common/Loader.jsx';
import { useSelector } from 'react-redux';

const DashboardLayout = () => {
  const sidebarOpen = useSelector((s) => s.ui.sidebarOpen);

  return (
    <div className="flex h-screen bg-canvas overflow-hidden">
      <Sidebar />

      {/* Main content area — sidebar only exists at lg+ (mobile uses
          BottomNav instead), so it only pushes content right at lg+. */}
      <div
        className={`flex flex-col flex-1 overflow-hidden min-w-0 transition-[margin] duration-300 ease-in-out ${
          sidebarOpen ? 'lg:ml-60' : 'lg:ml-16'
        }`}
      >
        <Navbar />

        <main className="flex-1 overflow-y-auto">
          {/* Extra bottom padding on mobile clears the fixed BottomNav bar */}
          <div className="max-w-7xl mx-auto p-4 sm:p-5 lg:p-6 pb-24 lg:pb-6 animate-fade-in">
            <Suspense fallback={<Loader />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>

      <BottomNav />
      <Toast />
    </div>
  );
};

export default DashboardLayout;
