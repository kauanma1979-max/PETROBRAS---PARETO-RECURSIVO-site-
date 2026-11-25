import React from 'react';

interface PetrobrasLogoProps {
  className?: string;
  showWordmark?: boolean;
}

export const PetrobrasLogo: React.FC<PetrobrasLogoProps> = ({
  className = 'w-11 h-11',
  showWordmark = false,
}) => {
  return (
    <div className="inline-flex items-center gap-3 shrink-0 select-none">
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        role="img"
        aria-label="Símbolo da Petrobras"
      >
        {/* Outer Petrobras Green Emblem */}
        <rect
          x="2"
          y="2"
          width="60"
          height="60"
          rx="14"
          fill="#008542"
          stroke="#FDB913"
          strokeWidth="2.5"
        />
        {/* Subtle inner bevel highlight */}
        <rect
          x="5.5"
          y="5.5"
          width="53"
          height="53"
          rx="11"
          stroke="#FFFFFF"
          strokeOpacity="0.16"
          strokeWidth="1"
        />
        {/* Top Golden Yellow Diagonal Ribbon */}
        <path
          d="M12 20L32 11L52 20V25.5L32 16.5L12 25.5V20Z"
          fill="#FDB913"
        />
        {/* Stylized Geometric BR Monogram in Petrobras Gold & Crisp White */}
        <path
          d="M15 28.5H26.5C30.3 28.5 32.5 30.3 32.5 33.2C32.5 35.1 31.3 36.4 29.6 37.1C31.8 37.8 33.1 39.4 33.1 41.7C33.1 44.9 30.6 47 26.5 47H15V28.5ZM20.2 35.4H25.2C26.7 35.4 27.5 34.7 27.5 33.6C27.5 32.5 26.7 31.9 25.2 31.9H20.2V35.4ZM20.2 43.5H25.6C27.3 43.5 28.1 42.8 28.1 41.5C28.1 40.3 27.2 39.5 25.6 39.5H20.2V43.5Z"
          fill="#FDB913"
        />
        <path
          d="M35.5 28.5H45.8C49.7 28.5 52 30.6 52 34C52 36.6 50.6 38.4 48.2 39.1L52.5 47H46.7L43 39.7H40.7V47H35.5V28.5ZM40.7 36.1H44.9C46.3 36.1 47.1 35.3 47.1 34C47.1 32.7 46.3 32 44.9 32H40.7V36.1Z"
          fill="#FFFFFF"
        />
        {/* Bottom Orange Energy Detail Bar */}
        <rect x="14" y="51" width="36" height="3.5" rx="1.75" fill="#F97316" />
      </svg>

      {showWordmark && (
        <div className="hidden sm:flex flex-col leading-none">
          <span className="font-display font-extrabold text-xs tracking-[0.16em] text-[#FDB913] uppercase">
            PETROBRAS
          </span>
          <span className="font-sans font-semibold text-[10px] tracking-[0.12em] text-orange-400 uppercase mt-0.5">
            TRANSPETRO
          </span>
        </div>
      )}
    </div>
  );
};
