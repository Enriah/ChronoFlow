import type { ThemeEffects } from '../../themes/theme.types';

export interface EffectModule {
  id: string;
  initialize(ctx: CanvasRenderingContext2D): void;
  update(deltaTime: number, intensity: number, speed: number, performanceMode: boolean): void;
  render(ctx: CanvasRenderingContext2D, theme: ThemeEffects, performanceMode: boolean): void;
  destroy(): void;
  resize(width: number, height: number): void;
}

export class VisualEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private effects: Map<string, EffectModule> = new Map();
  private lastTime: number = 0;
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;
  private currentTheme: ThemeEffects | null = null;
  
  // Optimization Properties
  private renderScale: number = 0.75; // Render at 75% resolution and upscale
  private targetFPS: number = 30; // Cap at 30 FPS for efficiency
  private lastRenderTime: number = 0;
  private isHidden: boolean = false;
  private isFocused: boolean = true;
  private dpr: number = 1;
  private performanceMode: boolean = false;

  constructor() {
    this.dpr = Math.min(window.devicePixelRatio, 1.5); // Clamp DPR to 1.5 max
    this.setupVisibilityListeners();
  }

  private setupVisibilityListeners() {
    document.addEventListener('visibilitychange', () => {
      this.isHidden = document.hidden;
    });
    window.addEventListener('focus', () => { this.isFocused = true; });
    window.addEventListener('blur', () => { this.isFocused = false; });
  }

  setCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    this.handleResize();
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  setRenderScale(scale: number) {
    this.renderScale = Math.max(0.2, Math.min(1, scale));
    this.handleResize();
  }

  setTargetFPS(fps: number) {
    this.targetFPS = Math.max(1, fps);
  }

  setPerformanceMode(enabled: boolean) {
    this.performanceMode = enabled;
  }

  private handleResize = () => {
    if (!this.canvas) return;
    
    // Scale canvas resolution down for efficiency
    const width = window.innerWidth * this.dpr * this.renderScale;
    const height = window.innerHeight * this.dpr * this.renderScale;
    
    this.canvas.width = width;
    this.canvas.height = height;
    
    // Use CSS to upscale the canvas
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    
    this.effects.forEach(effect => {
      effect.resize(width, height);
    });
  };

  registerEffect(effect: EffectModule) {
    if (this.ctx && this.canvas) {
      effect.initialize(this.ctx);
      effect.resize(this.canvas.width, this.canvas.height);
    }
    this.effects.set(effect.id, effect);
  }

  unregisterEffect(id: string) {
    const effect = this.effects.get(id);
    if (effect) {
      effect.destroy();
      this.effects.delete(id);
    }
  }

  private currentConfigs: Record<string, { intensity: number, speed: number, enabled: boolean }> = {};

  start(effectConfigs: Record<string, { intensity: number, speed: number, enabled: boolean }>, theme: ThemeEffects) {
    this.currentConfigs = effectConfigs;
    this.currentTheme = theme;
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.lastRenderTime = this.lastTime;
    this.tick(this.lastTime);
  }

  updateConfigs(configs: Record<string, { intensity: number, speed: number, enabled: boolean }>, theme: ThemeEffects) {
    this.currentConfigs = configs;
    this.currentTheme = theme;
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private tick = (currentTime: number) => {
    if (!this.isRunning) return;

    this.animationFrameId = requestAnimationFrame((time) => this.tick(time));

    // Throttle rendering based on visibility and target FPS
    if (this.isHidden) return; // Don't render if hidden
    
    const effectiveFPS = this.isFocused ? this.targetFPS : 10; // Drop to 10 FPS when out of focus
    const frameInterval = 1000 / effectiveFPS;
    const elapsedSinceLastRender = currentTime - this.lastRenderTime;

    if (elapsedSinceLastRender < frameInterval) return;

    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    this.lastRenderTime = currentTime;

    this.update(deltaTime, this.currentConfigs, this.performanceMode);
    this.render(this.currentConfigs, this.performanceMode);
  };

  private update(deltaTime: number, effectConfigs: Record<string, { intensity: number, speed: number, enabled: boolean }>, performanceMode: boolean) {
    this.effects.forEach(effect => {
      const config = effectConfigs[effect.id];
      if (config?.enabled) {
        // Adaptive intensity based on focus/performance
        const intensityMult = this.isFocused ? 1 : 0.5;
        effect.update(deltaTime, config.intensity * intensityMult, config.speed, performanceMode); 
      }
    });
  }

  private render(effectConfigs: Record<string, { enabled: boolean }>, performanceMode: boolean) {
    if (!this.ctx || !this.canvas || !this.currentTheme) return;

    // Only clear if there are active effects to render
    const hasActiveEffects = Object.values(effectConfigs).some(c => c.enabled);
    if (!hasActiveEffects) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.effects.forEach(effect => {
      if (effectConfigs[effect.id]?.enabled) {
        effect.render(this.ctx!, this.currentTheme!, performanceMode);
      }
    });
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    this.effects.forEach(effect => effect.destroy());
    this.effects.clear();
  }
}

export const visualEngine = new VisualEngine();
