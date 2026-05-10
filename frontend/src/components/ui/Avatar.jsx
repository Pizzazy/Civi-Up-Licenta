import { AVATAR_COLORS } from '@/data/constants';

const SIZES = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-11 h-11 text-sm',
};

export default function Avatar({ initials = '?', size = 'md', colorIdx }) {
  const cidx = colorIdx !== undefined ? colorIdx : initials.charCodeAt(0) % AVATAR_COLORS.length;
  return (
    <div
      className={`${SIZES[size]} ${AVATAR_COLORS[cidx]} text-white rounded-full flex items-center justify-center font-bold flex-shrink-0`}
    >
      {initials}
    </div>
  );
}
