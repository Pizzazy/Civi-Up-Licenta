const STATUS_MAP = {
  aprobat: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'în așteptare': 'bg-amber-50 text-amber-700 border-amber-200',
  respins: 'bg-rose-50 text-rose-700 border-rose-200',
  activ: 'bg-violet-50 text-violet-700 border-violet-200',
  planificat: 'bg-blue-50 text-blue-700 border-blue-200',
  finalizat: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactiv: 'bg-slate-50 text-slate-500 border-slate-200',
  'în așteptare cont': 'bg-amber-50 text-amber-700 border-amber-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  urgent: 'bg-rose-50 text-rose-700 border-rose-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  medium: 'bg-sky-50 text-sky-700 border-sky-200',
  low: 'bg-slate-50 text-slate-500 border-slate-200',
};

const LABELS = {
  in_progress: 'în lucru',
  pending: 'în așteptare',
  done: 'finalizat',
};

export default function Badge({ status }) {
  return (
    <span
      className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_MAP[status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}
    >
      {LABELS[status] || status}
    </span>
  );
}
