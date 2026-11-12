'use client';

import React from 'react';
import { Lock, Check } from 'lucide-react';
import type { MatchedComboPackageOption } from '@mos-lab/shared';

export interface ComboCardDecorativeFrameProps {
  pkg: MatchedComboPackageOption;
  selected: boolean;
  onSelect?: () => void;
}

export function ComboCardDecorativeFrame({ pkg, selected, onSelect }: ComboCardDecorativeFrameProps) {
  return (
    <>
      {/* Subtle Luxury Inner Gold Frame Line */}
      <div
        style={{
          position: 'absolute',
          inset: 5,
          borderRadius: 12,
          border: '1px solid rgba(243, 206, 104, 0.18)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* RPG Gaming Corner Brackets */}
      <div
        style={{
          position: 'absolute',
          top: 5,
          left: 5,
          width: 8,
          height: 8,
          borderTop: '2px solid rgba(243, 206, 104, 0.65)',
          borderLeft: '2px solid rgba(243, 206, 104, 0.65)',
          borderTopLeftRadius: 3,
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 5,
          right: 5,
          width: 8,
          height: 8,
          borderTop: '2px solid rgba(243, 206, 104, 0.65)',
          borderRight: '2px solid rgba(243, 206, 104, 0.65)',
          borderTopRightRadius: 3,
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 5,
          left: 5,
          width: 8,
          height: 8,
          borderBottom: '2px solid rgba(243, 206, 104, 0.65)',
          borderLeft: '2px solid rgba(243, 206, 104, 0.65)',
          borderBottomLeftRadius: 3,
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 5,
          right: 5,
          width: 8,
          height: 8,
          borderBottom: '2px solid rgba(243, 206, 104, 0.65)',
          borderRight: '2px solid rgba(243, 206, 104, 0.65)',
          borderBottomRightRadius: 3,
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />

      {/* Top-Right Diagonal Red Corner Ribbon for WELCOME (2 tặng 1) */}
      {pkg.isWelcomePackage && (
        <div
          style={{
            position: 'absolute',
            top: 14,
            right: -34,
            width: 132,
            transform: 'rotate(42deg)',
            background: pkg.isLocked
              ? 'linear-gradient(135deg, #64748b 0%, #334155 100%)'
              : 'linear-gradient(135deg, #ff2a2a 0%, #b91010 100%)',
            color: '#FFFFFF',
            textAlign: 'center',
            fontSize: 9.5,
            fontWeight: 900,
            letterSpacing: '0.1em',
            padding: '3px 0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.45)',
            zIndex: 4,
            textTransform: 'uppercase',
          }}
        >
          {pkg.isLocked ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Lock style={{ width: 9, height: 9 }} /> NGÀY ĐẦU
            </span>
          ) : (
            'WELCOME'
          )}
        </div>
      )}

      {/* Selected Top-Right Checkmark Badge */}
      {selected && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.();
          }}
          style={{
            position: 'absolute',
            top: 7,
            right: 8,
            zIndex: 10,
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FFE27A 0%, #D49B27 100%)',
            color: '#1F1402',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.55), 0 0 10px rgba(245, 196, 81, 0.4)',
            border: '1.5px solid rgba(255, 255, 255, 0.6)',
            cursor: 'pointer',
          }}
          title="Đang chọn gói (Chạm để bỏ chọn)"
        >
          <Check style={{ width: 13, height: 13, strokeWidth: 3.2 }} />
        </div>
      )}
    </>
  );
}
