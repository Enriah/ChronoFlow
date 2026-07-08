import type { ThemeEffects, VisualEffectConfig, VisualEffectType } from '../../themes/theme.types';

export interface EffectModule {
  readonly id: VisualEffectType;
  initialize(ctx: CanvasRenderingContext2D): void;
  resize(width: number, height: number): void;
  update(deltaSeconds: number, config: VisualEffectConfig, performanceMode: boolean): void;
  render(ctx: CanvasRenderingContext2D, theme: ThemeEffects, config: VisualEffectConfig, performanceMode: boolean): void;
  destroy(): void;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

export class VisualEngine {
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private effects = new Map<VisualEffectType, EffectModule>();
  private configs = new Map<VisualEffectType, VisualEffectConfig>();
  private theme: ThemeEffects | null = null;
  private frameId: number | null = null;
  private lastFrame = 0;
  private lastPaint = 0;
  private running = false;
  private performanceMode = false;
  private width = 0;
  private height = 0;
  private renderScale = 0.78;
  private hasPaintedContent = false;

  setCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d', { alpha: true });
    this.resize();
    this.effects.forEach((effect) => effect.initialize(this.context!));
    window.addEventListener('resize', this.resize);
  }

  register(effect: EffectModule) {
    this.effects.set(effect.id, effect);
    if (this.context) effect.initialize(this.context);
  }

  configure(configs: VisualEffectConfig[], theme: ThemeEffects) {
    this.configs = new Map(configs.map((config) => [config.id, config]));
    this.theme = theme;
    const nextScale = this.getRenderScale();
    if (Math.abs(nextScale - this.renderScale) > .01) {
      this.renderScale = nextScale;
      this.resize();
    }
  }

  setPerformanceMode(enabled: boolean) {
    if (this.performanceMode === enabled) return;
    this.performanceMode = enabled;
    this.renderScale = this.getRenderScale();
    this.resize();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastFrame = performance.now();
    this.lastPaint = 0;
    this.frameId = requestAnimationFrame(this.tick);
  }

  destroy() {
    this.running = false;
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.frameId = null;
    window.removeEventListener('resize', this.resize);
    this.effects.forEach((effect) => effect.destroy());
    this.effects.clear();
    this.context?.clearRect(0, 0, this.width, this.height);
    this.context = null;
    this.canvas = null;
  }

  private resize = () => {
    if (!this.canvas || !this.context) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25) * this.renderScale;
    this.width = Math.max(1, Math.round(window.innerWidth * pixelRatio));
    this.height = Math.max(1, Math.round(window.innerHeight * pixelRatio));
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.effects.forEach((effect) => effect.resize(this.width, this.height));
  };

  private tick = (time: number) => {
    if (!this.running) return;
    this.frameId = requestAnimationFrame(this.tick);
    if (document.hidden || !this.context || !this.theme) return;

    const active = this.getActiveConfigs();
    if (!active.length) {
      if (this.hasPaintedContent) this.context.clearRect(0, 0, this.width, this.height);
      this.hasPaintedContent = false;
      return;
    }

    const targetFps = this.getTargetFps(active);
    if (time - this.lastPaint < 1000 / targetFps) return;
    const deltaSeconds = Math.min(0.05, Math.max(0.001, (time - this.lastFrame) / 1000));
    this.lastFrame = time;
    this.lastPaint = time;

    this.context.clearRect(0, 0, this.width, this.height);
    this.hasPaintedContent = true;
    for (const config of active) {
      const effect = this.effects.get(config.id);
      if (!effect) continue;
      effect.update(deltaSeconds, config, this.performanceMode);
      this.context.save();
      this.context.globalAlpha = clamp01(config.opacity);
      effect.render(this.context, this.theme, config, this.performanceMode);
      this.context.restore();
    }
  };

  private getActiveConfigs() {
    return [...this.configs.values()].filter((config) => config.enabled && clamp01(config.opacity) > 0);
  }

  private getRenderScale() {
    if (this.performanceMode) return .5;
    const active = this.getActiveConfigs();
    const hasCrimsonBlossom = active.some((config) => config.id === 'crimson_blossom');
    if (hasCrimsonBlossom && active.length >= 3) return .46;
    if (hasCrimsonBlossom) return .54;
    const heavyCount = active.filter((config) => config.id === 'aurora' || config.id === 'fog' || config.id === 'matrix').length;
    if (active.length >= 5 || heavyCount >= 2) return .64;
    if (active.length >= 3 || heavyCount === 1) return .72;
    return .78;
  }

  private getTargetFps(active: VisualEffectConfig[]) {
    if (this.performanceMode) return 18;
    if (!document.hasFocus()) return 12;
    const hasCrimsonBlossom = active.some((config) => config.id === 'crimson_blossom');
    if (hasCrimsonBlossom) return 32;
    const onlySlowEffects = active.every((config) => config.id === 'aurora' || config.id === 'fog' || config.id === 'stars' || config.id === 'water_surface');
    if (onlySlowEffects) return 22;
    if (active.length >= 4) return 24;
    return 30;
  }
}
