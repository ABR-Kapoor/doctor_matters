'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/app/hooks/useTranslation';

const panels = [0, 1, 2, 3, 4];

const panelTransition = {
  duration: 0.9,
  ease: [0.65, 0, 0.35, 1] as [number, number, number, number],
};

export default function Preloader() {
  const [visible, setVisible] = useState(true);
  const { text: portalLabel } = useTranslation('Doctor Portal');

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          id="preloader-container"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            display: 'flex',
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        >
          {/* Vertical Sliding Panels */}
          {panels.map((i) => (
            <motion.div
              key={i}
              initial={{ y: 0 }}
              exit={{ y: i % 2 === 0 ? '-100%' : '100%' }}
              transition={{ ...panelTransition, delay: 0.2 + i * 0.1 }}
              style={{
                flex: 1,
                background: i % 2 === 0 ? '#EFF6FF' : '#DBEAFE',
                height: '100vh',
                borderRight: '1px solid rgba(59,130,246,0.06)',
                pointerEvents: 'auto',
              }}
            />
          ))}

          {/* Central Logo & Brand Reveal */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
              transition={{ duration: 0.8 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '32px',
                zIndex: 1,
              }}
            >
              {/* Spinning Logo Ring */}
              <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: '2px solid rgba(59,130,246,0.2)',
                    borderTopColor: '#3B82F6',
                    borderRadius: '50%',
                  }}
                />
                <motion.img
                  src="/AuraSutra-LogoOnly-Transparent.png"
                  alt="AuraSutra Logo"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '64px',
                    height: '64px',
                    objectFit: 'contain',
                  }}
                />
              </div>

              {/* Branding Text */}
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <motion.img
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  src="/AuraSutra-BlackTextOnly-Transparent.png"
                  alt="AuraSutra Branding"
                  style={{
                    height: '32px',
                    width: 'auto',
                    objectFit: 'contain',
                    marginBottom: '8px',
                    display: 'block'
                  }}
                />
                <div
                  style={{
                    fontSize: '12px',
                    color: '#2563eb', // blue-600
                    letterSpacing: '5px',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    textAlign: 'center'
                  }}
                >
                  {portalLabel}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
