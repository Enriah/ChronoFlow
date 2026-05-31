import React, { useMemo } from 'react';
import { useThemeStore } from '../../store/useThemeStore';
import { PersistentAssetService } from '../../services/PersistentAssetService';

export const BackgroundLayer: React.FC = () => {
  const isEditing = useThemeStore(state => state.isEditing);
  const activeEnv = useThemeStore(state => state.activeEnvironment);
  const draftEnv = useThemeStore(state => state.draftEnvironment);
  const performanceMode = useThemeStore(state => state.performanceMode);
  
  const background = isEditing ? draftEnv.background : activeEnv.background;
  
  const backgroundUrl = useMemo(() => {
    return PersistentAssetService.getAssetUrl(background.url || '');
  }, [background.url]);

  // Optimize: Disable blur in performance mode to save GPU
  const effectiveBlur = performanceMode ? 0 : background.blur;

  const style: React.CSSProperties = {
    opacity: background.opacity,
    filter: effectiveBlur > 0 ? `blur(${effectiveBlur}px) brightness(${background.brightness})` : `brightness(${background.brightness})`,
  };

  if (background.type === 'none') {
    return <div className="fixed inset-0 bg-background z-0" />;
  }

  if (background.type === 'gradient') {
    return (
      <div 
        className="fixed inset-0 z-0"
        style={{ 
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
          ...style 
        }}
      />
    );
  }

  if (background.type === 'video') {
    return (
      <div className="fixed inset-0 z-0 overflow-hidden">
        {backgroundUrl && (
          <video
            key={backgroundUrl} // Key forces reload when URL changes
            src={backgroundUrl}
            autoPlay
            loop
            muted
            className="w-full h-full object-cover transition-all duration-500"
            style={style}
          />
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {backgroundUrl && (
        <div
          className="w-full h-full bg-cover bg-center transition-all duration-500"
          style={{ 
            backgroundImage: `url("${backgroundUrl}")`,
            ...style
          }}
        />
      )}
    </div>
  );
};
