'use client';

import React, { useState } from 'react';
import type { MosChatStickerItem } from './sticker-packs-core';

function renderCustomAnimatedSvg(kind: NonNullable<MosChatStickerItem['customSvg']>) {
  switch (kind) {
    case 'cat-bongo':
      return (
        <svg viewBox="0 0 120 100" className="w-full h-full overflow-visible">
          {/* Desk */}
          <path d="M8 74 L112 74 L116 94 L4 94 Z" fill="#fde68a" stroke="#1e293b" strokeWidth="3.5" />
          {/* Laptop / Keyboard */}
          <rect x="26" y="70" width="68" height="14" rx="4" fill="#334155" stroke="#0f172a" strokeWidth="2.5" />
          <circle cx="42" cy="77" r="2.5" fill="#38bdf8" />
          <circle cx="54" cy="77" r="2.5" fill="#f43f5e" />
          <circle cx="66" cy="77" r="2.5" fill="#22c55e" />
          <circle cx="78" cy="77" r="2.5" fill="#fbbf24" />
          {/* White Bongo Cat Body */}
          <path
            d="M28 72 C26 42, 36 22, 60 22 C84 22, 94 42, 92 72 Z"
            fill="#ffffff"
            stroke="#1e293b"
            strokeWidth="3.5"
          />
          {/* Ears */}
          <polygon
            points="33,34 28,12 46,24"
            fill="#ffffff"
            stroke="#1e293b"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <polygon points="34,30 31,17 43,25" fill="#fda4af" />
          <polygon
            points="87,34 92,12 74,24"
            fill="#ffffff"
            stroke="#1e293b"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <polygon points="86,30 89,17 77,25" fill="#fda4af" />
          {/* Intense Eyes & Sweat */}
          <circle cx="47" cy="46" r="4" fill="#0f172a" />
          <circle cx="73" cy="46" r="4" fill="#0f172a" />
          <line x1="40" y1="38" x2="52" y2="41" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
          <line x1="80" y1="38" x2="68" y2="41" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
          {/* Cute Cat Mouth */}
          <path
            d="M54 53 Q57 57 60 53 Q63 57 66 53"
            fill="none"
            stroke="#0f172a"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          {/* Sweat drop */}
          <path d="M88 38 C88 38, 93 45, 90 49 C87 52, 84 49, 85 45 Z" fill="#38bdf8">
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,-2; 0,4; 0,-2"
              dur="0.45s"
              repeatCount="indefinite"
            />
          </path>
          {/* Left Paw Slapping */}
          <g>
            <ellipse cx="38" cy="70" rx="9" ry="7" fill="#ffffff" stroke="#1e293b" strokeWidth="3" />
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,-10; 0,4; 0,-10"
              dur="0.18s"
              repeatCount="indefinite"
            />
          </g>
          {/* Right Paw Slapping Alternating */}
          <g>
            <ellipse cx="82" cy="70" rx="9" ry="7" fill="#ffffff" stroke="#1e293b" strokeWidth="3" />
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,4; 0,-10; 0,4"
              dur="0.18s"
              repeatCount="indefinite"
            />
          </g>
          {/* Speed Impact Sparks */}
          <path d="M22 62 L14 56 M98 62 L106 56" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round">
            <animate attributeName="opacity" values="1;0.2;1" dur="0.18s" repeatCount="indefinite" />
          </path>
        </svg>
      );

    case 'cat-vibing':
      return (
        <svg viewBox="0 0 120 100" className="w-full h-full overflow-visible">
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="-8 60 75; 10 60 75; -8 60 75"
              dur="0.48s"
              repeatCount="indefinite"
            />
            {/* Headphones Band */}
            <path d="M26 48 C26 14, 94 14, 94 48" fill="none" stroke="#8b5cf6" strokeWidth="6" strokeLinecap="round" />
            {/* Cat Head & Body */}
            <path
              d="M30 84 C28 46, 36 26, 60 26 C84 26, 92 46, 90 84 Z"
              fill="#ffffff"
              stroke="#1e293b"
              strokeWidth="3.5"
            />
            <polygon points="34,36 28,14 48,26" fill="#ffffff" stroke="#1e293b" strokeWidth="3.5" />
            <polygon points="86,36 92,14 72,26" fill="#ffffff" stroke="#1e293b" strokeWidth="3.5" />
            {/* Headphone Ear Cups */}
            <rect x="20" y="40" width="12" height="22" rx="6" fill="#ec4899" stroke="#1e293b" strokeWidth="2.5" />
            <rect x="88" y="40" width="12" height="22" rx="6" fill="#ec4899" stroke="#1e293b" strokeWidth="2.5" />
            {/* Closed Vibing Eyes */}
            <path d="M41 49 Q47 43 53 49" fill="none" stroke="#0f172a" strokeWidth="3.2" strokeLinecap="round" />
            <path d="M67 49 Q73 43 79 49" fill="none" stroke="#0f172a" strokeWidth="3.2" strokeLinecap="round" />
            {/* Happy Cat Mouth */}
            <path d="M54 58 Q60 64 66 58" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
            <ellipse cx="39" cy="56" rx="5" ry="3" fill="#fda4af" />
            <ellipse cx="81" cy="56" rx="5" ry="3" fill="#fda4af" />
          </g>
          {/* Floating Musical Notes */}
          <text x="14" y="28" fontSize="18" fontWeight="bold" fill="#ec4899">
            ♪
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,4; -4,-8; 0,4"
              dur="0.8s"
              repeatCount="indefinite"
            />
          </text>
          <text x="96" y="24" fontSize="18" fontWeight="bold" fill="#38bdf8">
            ♫
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,-4; 4,6; 0,-4"
              dur="0.8s"
              repeatCount="indefinite"
            />
          </text>
        </svg>
      );

    case 'cat-knife':
      return (
        <svg viewBox="0 0 120 100" className="w-full h-full overflow-visible">
          {/* Sassy Cat Body */}
          <path
            d="M28 84 C26 48, 36 26, 58 26 C80 26, 90 48, 88 84 Z"
            fill="#ffffff"
            stroke="#1e293b"
            strokeWidth="3.5"
          />
          <polygon points="32,36 26,14 46,26" fill="#ffffff" stroke="#1e293b" strokeWidth="3.5" />
          <polygon points="84,36 90,14 70,26" fill="#ffffff" stroke="#1e293b" strokeWidth="3.5" />
          {/* Angry Furrowed Brows & Side-eye */}
          <line x1="36" y1="40" x2="52" y2="46" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="80" y1="40" x2="64" y2="46" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="46" cy="49" r="4" fill="#ef4444" />
          <circle cx="70" cy="49" r="4" fill="#ef4444" />
          {/* Smug Grin */}
          <path d="M48 60 Q58 55 68 61" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
          {/* Toy Prop Blade Gleaming */}
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="-6 88 64; 8 88 64; -6 88 64"
              dur="0.45s"
              repeatCount="indefinite"
            />
            <rect x="82" y="58" width="14" height="7" rx="3" fill="#b91c1c" stroke="#0f172a" strokeWidth="2.5" />
            <path d="M94 55 L116 42 L112 65 Z" fill="#e2e8f0" stroke="#0f172a" strokeWidth="2.5" />
            <circle cx="84" cy="62" r="7" fill="#ffffff" stroke="#1e293b" strokeWidth="3" />
          </g>
        </svg>
      );

    case 'cat-ok':
      return (
        <svg viewBox="0 0 120 100" className="w-full h-full overflow-visible">
          <path
            d="M26 84 C24 46, 34 26, 56 26 C78 26, 88 46, 86 84 Z"
            fill="#fde047"
            stroke="#1e293b"
            strokeWidth="3.5"
          />
          <polygon points="30,36 24,14 44,26" fill="#fde047" stroke="#1e293b" strokeWidth="3.5" />
          <polygon points="82,36 88,14 68,26" fill="#fde047" stroke="#1e293b" strokeWidth="3.5" />
          {/* Cool Sunglasses */}
          <rect x="33" y="41" width="20" height="12" rx="3" fill="#0f172a" />
          <rect x="59" y="41" width="20" height="12" rx="3" fill="#0f172a" />
          <line x1="53" y1="45" x2="59" y2="45" stroke="#0f172a" strokeWidth="3" />
          <path d="M46 60 Q56 68 66 60" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
          {/* Bouncing Thumbs Up */}
          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,2; 0,-6; 0,2"
              dur="0.5s"
              repeatCount="indefinite"
            />
            <path
              d="M90 56 C90 44, 98 42, 98 52 L108 52 C112 52, 112 68, 106 68 L90 68 Z"
              fill="#fde047"
              stroke="#1e293b"
              strokeWidth="3"
            />
          </g>
        </svg>
      );

    case 'quby-heart-gun':
    case 'quby-tantrum':
    case 'quby-cheer':
    case 'quby-bow':
    case 'quby-bonk':
    case 'quby-coffee':
    case 'quby-overload':
    case 'quby-shy':
    case 'quby-money':
    case 'quby-yes': {
      const isTantrum = kind === 'quby-tantrum';
      const isOverload = kind === 'quby-overload';
      const isShy = kind === 'quby-shy';
      const isBonk = kind === 'quby-bonk';
      const isCoffee = kind === 'quby-coffee';
      const isMoney = kind === 'quby-money';
      return (
        <svg viewBox="0 0 120 100" className="w-full h-full overflow-visible">
          <g>
            <animateTransform
              attributeName="transform"
              type={isTantrum ? 'rotate' : 'translate'}
              values={isTantrum ? '-6 60 60; 6 60 60; -6 60 60' : '0,2; 0,-5; 0,2'}
              dur={isTantrum ? '0.22s' : '0.55s'}
              repeatCount="indefinite"
            />
            {/* Chubby Quby Round White Head & Body */}
            <path
              d="M34 86 C30 68, 38 62, 60 62 C82 62, 90 68, 86 86 Z"
              fill="#ffffff"
              stroke="#1e293b"
              strokeWidth="3.2"
            />
            <ellipse cx="60" cy="44" rx="30" ry="26" fill="#ffffff" stroke="#1e293b" strokeWidth="3.5" />
            {/* Single Little Hair Sprout on Bald Head */}
            <path d="M60 18 Q65 10 56 12" fill="none" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
            {/* Rosy Pink Cheeks */}
            <ellipse cx="39" cy="49" rx="6.5" ry="4" fill="#fb7185" opacity="0.85" />
            <ellipse cx="81" cy="49" rx="6.5" ry="4" fill="#fb7185" opacity="0.85" />
            {/* Expressions */}
            {isTantrum ? (
              <>
                <path d="M42 40 L52 44 L42 48" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
                <path d="M78 40 L68 44 L78 48" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
                {/* Waterfall Tears */}
                <path d="M44 48 L38 78" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" />
                <path d="M76 48 L82 78" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" />
                <ellipse cx="60" cy="54" rx="9" ry="6" fill="#f43f5e" stroke="#0f172a" strokeWidth="2.5" />
              </>
            ) : isOverload ? (
              <>
                <circle cx="47" cy="42" r="5" fill="none" stroke="#0f172a" strokeWidth="2.8" />
                <circle cx="73" cy="42" r="5" fill="none" stroke="#0f172a" strokeWidth="2.8" />
                <path d="M52 55 Q60 49 68 55" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
              </>
            ) : isMoney ? (
              <>
                <text x="41" y="47" fontSize="14" fontWeight="900" fill="#15803d">
                  $
                </text>
                <text x="69" y="47" fontSize="14" fontWeight="900" fill="#15803d">
                  $
                </text>
                <path d="M50 52 Q60 62 70 52 Z" fill="#f43f5e" stroke="#0f172a" strokeWidth="2.5" />
              </>
            ) : (
              <>
                <path d="M43 42 Q48 36 53 42" fill="none" stroke="#0f172a" strokeWidth="3.2" strokeLinecap="round" />
                <path d="M67 42 Q72 36 77 42" fill="none" stroke="#0f172a" strokeWidth="3.2" strokeLinecap="round" />
                <path d="M52 50 Q60 59 68 50 Z" fill="#f43f5e" stroke="#0f172a" strokeWidth="2.5" />
              </>
            )}

            {/* Props per Quby action */}
            {kind === 'quby-heart-gun' && (
              <g>
                <text x="88" y="36" fontSize="22">
                  ❤️
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    values="0,0; 12,-10; 0,0"
                    dur="0.5s"
                    repeatCount="indefinite"
                  />
                </text>
                <text x="10" y="32" fontSize="18">
                  💖
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    values="0,0; -10,-8; 0,0"
                    dur="0.5s"
                    repeatCount="indefinite"
                  />
                </text>
              </g>
            )}
            {isBonk && (
              <g>
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  values="-25 88 55; 25 88 55; -25 88 55"
                  dur="0.3s"
                  repeatCount="indefinite"
                />
                <line x1="84" y1="62" x2="104" y2="32" stroke="#92400e" strokeWidth="4" strokeLinecap="round" />
                <rect x="92" y="20" width="22" height="14" rx="4" fill="#ef4444" stroke="#0f172a" strokeWidth="2.5" />
              </g>
            )}
            {isCoffee && (
              <g>
                <rect x="78" y="48" width="18" height="24" rx="4" fill="#fde68a" stroke="#0f172a" strokeWidth="2.5" />
                <line x1="84" y1="38" x2="72" y2="48" stroke="#ec4899" strokeWidth="3.5" strokeLinecap="round" />
                <circle cx="83" cy="66" r="2" fill="#1e293b" />
                <circle cx="89" cy="67" r="2" fill="#1e293b" />
              </g>
            )}
            {isShy && (
              <g>
                <circle cx="52" cy="68" r="6" fill="#ffffff" stroke="#1e293b" strokeWidth="2.5" />
                <circle cx="68" cy="68" r="6" fill="#ffffff" stroke="#1e293b" strokeWidth="2.5" />
              </g>
            )}
          </g>
        </svg>
      );
    }

    case 'pepe-monkas':
    case 'pepe-clap':
    case 'pepe-cry':
    case 'pepe-hype':
    case 'pepe-run':
    case 'pepe-smart': {
      const isCry = kind === 'pepe-cry';
      const isMonka = kind === 'pepe-monkas';
      const isClap = kind === 'pepe-clap';
      const isRun = kind === 'pepe-run';
      const isSmart = kind === 'pepe-smart';
      return (
        <svg viewBox="0 0 120 100" className="w-full h-full overflow-visible">
          <g>
            <animateTransform
              attributeName="transform"
              type={isRun ? 'translate' : 'rotate'}
              values={isRun ? '-5,0; 6,0; -5,0' : '-4 60 65; 4 60 65; -4 60 65'}
              dur={isClap || isRun ? '0.24s' : '0.55s'}
              repeatCount="indefinite"
            />
            {/* Iconic Green Frog Head & Bulging Eyes */}
            <circle cx="45" cy="30" r="14" fill="#4ade80" stroke="#14532d" strokeWidth="3.2" />
            <circle cx="75" cy="30" r="14" fill="#4ade80" stroke="#14532d" strokeWidth="3.2" />
            <ellipse cx="60" cy="54" rx="34" ry="26" fill="#4ade80" stroke="#14532d" strokeWidth="3.5" />
            {/* White Sclera & Pupils */}
            <circle cx="45" cy="30" r="8.5" fill="#ffffff" stroke="#14532d" strokeWidth="2" />
            <circle cx="75" cy="30" r="8.5" fill="#ffffff" stroke="#14532d" strokeWidth="2" />
            <circle cx={isMonka ? 47 : 45} cy="30" r="4" fill="#0f172a" />
            <circle cx={isMonka ? 77 : 75} cy="30" r="4" fill="#0f172a" />
            {/* Iconic Pepe Red/Brown Lips */}
            {isCry || isMonka ? (
              <path d="M40 64 Q60 54 80 64" fill="none" stroke="#b91c1c" strokeWidth="5" strokeLinecap="round" />
            ) : (
              <path d="M38 58 Q60 72 82 58" fill="#f87171" stroke="#991b1b" strokeWidth="3.5" strokeLinecap="round" />
            )}
            {/* Tears or Sweat */}
            {isCry && (
              <>
                <path d="M43 38 L38 76" stroke="#38bdf8" strokeWidth="5.5" strokeLinecap="round" />
                <path d="M77 38 L82 76" stroke="#38bdf8" strokeWidth="5.5" strokeLinecap="round" />
              </>
            )}
            {isMonka && (
              <>
                <path d="M90 36 C90 36, 96 45, 92 50 C88 53, 85 49, 86 44 Z" fill="#38bdf8" />
                <path d="M26 42 C26 42, 31 50, 28 54 C25 57, 22 53, 23 48 Z" fill="#38bdf8" />
              </>
            )}
            {isClap && (
              <g>
                <ellipse cx="32" cy="68" rx="9" ry="6" fill="#4ade80" stroke="#14532d" strokeWidth="2.8">
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    values="-4,0; 8,0; -4,0"
                    dur="0.2s"
                    repeatCount="indefinite"
                  />
                </ellipse>
                <ellipse cx="88" cy="68" rx="9" ry="6" fill="#4ade80" stroke="#14532d" strokeWidth="2.8">
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    values="4,0; -8,0; 4,0"
                    dur="0.2s"
                    repeatCount="indefinite"
                  />
                </ellipse>
              </g>
            )}
            {isSmart && (
              <rect x="35" y="23" width="50" height="14" rx="3" fill="none" stroke="#fde047" strokeWidth="3" />
            )}
          </g>
        </svg>
      );
    }
  }
}

export const MosChatStickerVisual: React.FC<{
  sticker: MosChatStickerItem;
  size?: 'picker' | 'chat' | 'reaction';
}> = ({ sticker, size = 'chat' }) => {
  const [imgFailed, setImgFailed] = useState(false);

  const notoGifUrl = sticker.notoCode
    ? `https://fonts.gstatic.com/s/e/notoemoji/latest/${sticker.notoCode}/512.gif`
    : null;

  if (size === 'reaction') {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 shrink-0 select-none">
        {notoGifUrl && !imgFailed ? (
          <img
            src={notoGifUrl}
            alt={sticker.title}
            className="w-4 h-4 object-contain"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="text-[13px] leading-none">{sticker.fallbackEmoji}</span>
        )}
      </span>
    );
  }

  const isPicker = size === 'picker';

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center select-none transition-transform duration-200 ${
        isPicker ? 'w-full h-[78px] p-1 hover:scale-110' : 'w-[116px] h-[112px] p-1.5 hover:scale-105'
      }`}
      style={{
        filter: sticker.glowColor ? `drop-shadow(0 6px 14px ${sticker.glowColor})` : undefined,
      }}
      title={sticker.title}
    >
      <div className={`relative flex items-center justify-center ${isPicker ? 'w-12 h-12' : 'w-[82px] h-[82px]'}`}>
        {sticker.customSvg ? (
          renderCustomAnimatedSvg(sticker.customSvg)
        ) : notoGifUrl && !imgFailed ? (
          <img
            src={notoGifUrl}
            alt={sticker.title}
            loading="lazy"
            className="w-full h-full object-contain pointer-events-none"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className={`${isPicker ? 'text-[34px]' : 'text-[54px]'} leading-none animate-bounce`}>
            {sticker.fallbackEmoji}
          </span>
        )}
      </div>

      {sticker.caption && (
        <span
          className={`block font-black uppercase tracking-tight rounded-full shadow-md text-center truncate ${
            isPicker
              ? 'text-[7.5px] leading-tight px-1.5 py-0.5 -mt-1 max-w-[96%]'
              : 'text-[10px] leading-none px-2.5 py-1 -mt-1.5 whitespace-nowrap'
          }`}
          style={{
            background: sticker.captionBg || 'linear-gradient(135deg, #d4a84b, #b45309)',
            color: sticker.captionColor || '#ffffff',
            border: '1.5px solid rgba(255,255,255,0.85)',
          }}
        >
          {sticker.caption}
        </span>
      )}
    </div>
  );
};
