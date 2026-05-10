export default function DropZone({ index, dragOverIndex, setDragOverIndex, onDrop }) {
  const isOver = dragOverIndex === index;
  return (
    <div
      className={`transition-all overflow-hidden ${isOver ? 'h-10 opacity-100' : 'h-2 opacity-0 hover:opacity-100 hover:h-6'}`}
      onDragOver={(e) => { e.preventDefault(); setDragOverIndex(index); }}
      onDragLeave={() => setDragOverIndex(null)}
      onDrop={(e) => onDrop(e, index)}
    >
      <div className={`mx-4 h-full rounded-xl border-2 border-dashed flex items-center justify-center transition-all ${isOver ? 'border-violet-300 bg-violet-50/60' : 'border-slate-300 bg-slate-50'}`}>
        {isOver && <span className="text-violet-600 text-xs font-semibold uppercase tracking-[0.2em]">Plasează aici</span>}
      </div>
    </div>
  );
}
