import { useState, useEffect } from 'react';
import { useCompanionStore } from '../../store/useCompanionStore';
import { Bot, X } from 'lucide-react';
import { clsx } from 'clsx';

export function CompanionPopup() {
  const [message, setMessage] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const { profile, config } = useCompanionStore();

  useEffect(() => {
    let hideTimer: number | undefined;

    const handlePopup = (event: Event) => {
      try {
        const detail = (event as CustomEvent).detail;
        setMessage(typeof detail === 'string' ? detail : detail?.message);
        setAvatarFailed(false);
        if (hideTimer) clearTimeout(hideTimer);

      setIsVisible(true);
      
        hideTimer = setTimeout(() => {
        setIsVisible(false);
        }, Math.max(3000, config.popupDismissMs || 8000));
      } catch (error) {
        console.error('CompanionPopup: failed to show popup', error);
      }
    };

    window.addEventListener('companion-popup', handlePopup);
    return () => {
      window.removeEventListener('companion-popup', handlePopup);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [config.popupDismissMs]);

  if (!message || config.popupEnabled === false) return null;

  const positionClasses = {
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
  };

  return (
    <div className={clsx(
      "fixed z-[100] max-w-[calc(100vw-2rem)] transition-all duration-500 ease-in-out transform pointer-events-none",
      positionClasses[config.popupPosition],
      isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95 pointer-events-none"
    )}
      style={{ opacity: isVisible ? Math.min(1, Math.max(0.35, config.popupTransparency ?? 0.9)) : 0 }}
    >
      <div className={clsx(
        "max-w-xs md:max-w-sm rounded-2xl shadow-2xl border flex items-start gap-4 pointer-events-auto",
        config.backgroundStyle === 'glass' ? "bg-bg-secondary/85 backdrop-blur-xl border-white/10" : "bg-bg-secondary border-white/10",
        config.popupSize === 'small' ? "p-3 text-xs" : config.popupSize === 'large' ? "p-5 text-base" : "p-4 text-sm"
      )}>
        <div className={clsx(
          "rounded-full overflow-hidden border-2 border-primary/30 flex-shrink-0 bg-primary/10 flex items-center justify-center",
          config.popupSize === 'small' ? "w-9 h-9" : config.popupSize === 'large' ? "w-14 h-14" : "w-12 h-12"
        )}>
          {avatarFailed ? (
            <Bot className="w-5 h-5 text-primary" />
          ) : (
            <img
              src={profile.avatar}
              alt={profile.name}
              className="w-full h-full object-cover"
              onError={() => setAvatarFailed(true)}
            />
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-primary">{profile.name}</span>
            <button onClick={() => setIsVisible(false)} className="opacity-50 hover:opacity-100 transition-opacity" title="Dismiss companion popup">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-text leading-relaxed">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
