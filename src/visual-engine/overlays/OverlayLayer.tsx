import React from 'react';
import { useThemeStore } from '../../store/useThemeStore';

export const OverlayLayer: React.FC = () => {
  const isEditing = useThemeStore(state => state.isEditing);
  const activeEnv = useThemeStore(state => state.activeEnvironment);
  const draftEnv = useThemeStore(state => state.draftEnvironment);
  
  const overlays = isEditing ? draftEnv.overlays : activeEnv.overlays;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {overlays.map(overlay => {
        if (!overlay.enabled) return null;

        switch (overlay.type) {
          case 'scanlines':
            return (
              <div 
                key="scanlines"
                className="absolute inset-0 opacity-[0.03]"
                style={{ 
                  backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
                  backgroundSize: '100% 2px, 3px 100%'
                }}
              />
            );
          case 'vignette':
            return (
              <div 
                key="vignette"
                className="absolute inset-0"
                style={{ 
                  background: `radial-gradient(circle, transparent 40%, rgba(0,0,0,${overlay.intensity}) 100%)`
                }}
              />
            );
          case 'crt':
            return (
              <div 
                key="crt"
                className="absolute inset-0 pointer-events-none overflow-hidden"
              >
                <div className="absolute inset-0 bg-[#121010] opacity-[0.02]" />
                <div className="absolute inset-0 animate-scanline pointer-events-none" />
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
};
