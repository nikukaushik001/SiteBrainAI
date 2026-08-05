import React from 'react';

interface LogoProps {
  onClick?: () => void;
  style?: React.CSSProperties;
  size?: 'large' | 'small';
}

export default function Logo({ onClick, style, size = 'large' }: LogoProps) {
  const isSmall = size === 'small';
  const iconSize = isSmall ? 40 : 56;
  const titleSize = isSmall ? '1.6rem' : '2.2rem';
  const subSize = isSmall ? '0.65rem' : '0.85rem';
  const gap = isSmall ? '12px' : '14px';

  return (
    <div
      className="logo-container"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap, ...style }}
    >
      <div className="logo-svg-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '22%', width: iconSize, height: iconSize, padding: isSmall ? '6px' : '10px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)' }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Brain Left Side */}
          <path d="M 50 15 C 30 15 15 30 15 50 C 15 65 25 78 40 83 C 45 85 50 85 50 85 L 50 15 Z" stroke="url(#paint0_linear)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          {/* Brain Folds (Techy lines) */}
          <path d="M 50 30 L 35 30 L 35 45 M 50 55 L 40 55 L 40 70 M 35 45 A 3 3 0 1 1 34.99 45 M 40 70 A 3 3 0 1 1 39.99 70" stroke="url(#paint0_linear)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

          {/* Robot Head Right Side */}
          <path d="M 50 15 C 70 15 85 30 85 50 C 85 65 75 78 60 83 C 55 85 50 85 50 85 L 50 15 Z" stroke="url(#paint1_linear)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          {/* Robot Eye */}
          <rect x="60" y="40" width="12" height="8" rx="4" fill="url(#paint1_linear)" />
          {/* Headset Mic */}
          <path d="M 85 50 C 92 50 95 55 95 60 C 95 65 92 70 85 70" stroke="url(#paint1_linear)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 85 70 L 70 80" stroke="url(#paint1_linear)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="68" cy="81" r="4" fill="url(#paint1_linear)" />

          <defs>
            <linearGradient id="paint0_linear" x1="15" y1="15" x2="50" y2="85" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ef4444" />
              <stop offset="1" stopColor="#a855f7" />
            </linearGradient>
            <linearGradient id="paint1_linear" x1="50" y1="15" x2="85" y2="85" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0ea5e9" />
              <stop offset="1" stopColor="#f43f5e" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="logo-text" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: titleSize, fontWeight: '800', lineHeight: '1', letterSpacing: '-0.5px' }}>
          <span style={{ color: '#ffffff' }}>Brain</span>
          <span style={{ background: 'linear-gradient(to right, #0ea5e9, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Desk</span>
        </div>
        <div style={{ fontSize: subSize, fontWeight: '700', color: '#10b981', letterSpacing: isSmall ? '1px' : '1.5px', marginTop: isSmall ? '2px' : '4px' }}>
          AI SUPPORT AGENT
        </div>
      </div>
    </div>
  );
}
