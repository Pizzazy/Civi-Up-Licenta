import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function ProtectedRoute({ children, module }) {
  const { user, hasPermission } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (module && !hasPermission(module)) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="text-center">
          <p className="text-6xl mb-4">🔒</p>
          <h2 className="text-xl font-black text-slate-800 mb-2">Acces Restricționat</h2>
          <p className="text-sm text-slate-500">Nu aveți permisiunea de a accesa acest modul.</p>
        </div>
      </div>
    );
  }

  return children;
}
