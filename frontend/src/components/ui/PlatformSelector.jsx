import { Globe, Instagram, Linkedin, Twitter } from 'lucide-react';
import { ALL_PLATFORMS, PLATFORM_COLORS } from '@/data/constants';

export const PLATFORM_ICONS = {
  Facebook: Globe,
  Instagram: Instagram,
  LinkedIn: Linkedin,
  Twitter: Twitter,
};

export default function PlatformSelector({ selected, onChange }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {ALL_PLATFORMS.map((p) => {
        const Icon = PLATFORM_ICONS[p];
        const isOn = selected.includes(p);
        return (
          <button
            key={p}
            onClick={() => onChange(isOn ? selected.filter((x) => x !== p) : [...selected, p])}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-semibold transition-all ${
              isOn
                ? PLATFORM_COLORS[p]
                : 'border-slate-200 text-slate-600 hover:border-violet-200 bg-white'
            }`}
          >
            <Icon className="w-3 h-3" />
            {p}
          </button>
        );
      })}
    </div>
  );
}
