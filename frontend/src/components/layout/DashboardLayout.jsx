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
  const navigate = useNavigate();
  const location = useLocation();

  const activeModule = ROUTE_TO_MODULE[location.pathname] || 'dashboard';

  const handleModuleChange = (moduleId) => {
    const path = moduleId === 'dashboard' ? '/' : `/${moduleId}`;
    navigate(path);
  };

  return (
    <div className="flex h-screen bg-transparent overflow-hidden font-sans">
      <Sidebar
        active={activeModule}
        onChange={handleModuleChange}
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar activeModule={activeModule} onModuleChange={handleModuleChange} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      <FloatingChat />
    </div>
  );
}
