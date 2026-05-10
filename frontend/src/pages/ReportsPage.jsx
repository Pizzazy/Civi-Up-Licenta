import React from 'react';

export default function ReportsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Rapoarte & Generare descrieri Social</h1>

      <div className="max-w-3xl bg-white rounded-lg shadow p-4">
        <p className="text-sm text-slate-600 mb-4">
          Această pagină este un placeholder UI pentru generarea de rapoarte și
          pentru a crea descrieri pentru postări de social media. Funcționalitatea
          nu este încă implementată.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Platformă</label>
            <select className="w-full border rounded px-3 py-2">
              <option>Facebook</option>
              <option>Instagram</option>
              <option>LinkedIn</option>
              <option>Twitter</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Prompt / Instrucțiuni</label>
            <textarea className="w-full border rounded px-3 py-2 h-28" placeholder="Describe what you want the generated description to include..."></textarea>
          </div>

          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-violet-600 text-white rounded">Generează (placeholder)</button>
            <button className="px-4 py-2 border rounded text-slate-600">Descarcă raport (placeholder)</button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Exemplu rezultat</label>
            <div className="border rounded p-3 bg-slate-50 text-slate-700">Aici va apărea descrierea generată...</div>
          </div>
        </div>
      </div>
    </div>
  );
}
