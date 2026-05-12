import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import FloatingChat from '@/components/chat/FloatingChat';

const ROUTE_TO_MODULE = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/financiar': 'financiar',
  '/proiecte': 'proiecte',
  '/crm': 'crm',
  '/social': 'social',
  '/profil': 'profil',
  '/ai-analize': 'ai-analize',
  '/management-conturi': 'management-conturi',
  '/email-crm': 'email-crm',
};

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const activeModule = ROUTE_TO_MODULE[location.pathname] || 'dashboard';

  const handleModuleChange = (moduleId) => {
    const path = moduleId === 'dashboard' ? '/' : `/${moduleId}`;
    navigate(path);
    setMobileSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-transparent overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:flex-col">
        <Sidebar
          active={activeModule}
          onChange={handleModuleChange}
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
          isMobile={false}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-30"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 w-60 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-out md:hidden z-40 flex flex-col ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar
          active={activeModule}
          onChange={handleModuleChange}
          collapsed={false}
          onToggle={() => setMobileSidebarOpen(false)}
          isMobile={true}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          activeModule={activeModule}
          onModuleChange={handleModuleChange}
          onMobileMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          mobileSidebarOpen={mobileSidebarOpen}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      <FloatingChat />
    </div>
  );
}
