import React, { useState } from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  subtitle?: string;
}

const SIZE_CLASSES: Record<NonNullable<BrandLogoProps['size']>, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
  xl: 'h-20 w-20',
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  subtitle,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="flex items-center gap-3 min-w-0">
      <div
        className={`${SIZE_CLASSES[size]} relative rounded-full overflow-hidden border border-cyan-500/40 bg-slate-950 shrink-0 shadow-sm`}
      >
        {!imgFailed ? (
          <img
            src="/assets/aistudio/WhatsApp_Image_2026-10-21_at_22.00.18_b22cc649.jpeg"
            alt="NeuroFactory AI"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover scale-[1.82]"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-slate-950 text-cyan-400 font-bold font-mono">
            N
          </div>
        )}
      </div>

      {showText && (
        <div className="min-w-0">
          <div className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-1.5 font-display whitespace-nowrap truncate">
            <span>NeuroFactory</span>
            <span className="text-cyan-400 font-mono text-xs tracking-wide">AI</span>
          </div>
          {subtitle && (
            <div className="text-[11px] text-slate-400 truncate font-medium">
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
