import type { ThemeEffects, VisualEffectConfig, VisualEffectType } from '../../../themes/theme.types';
import type { EffectModule } from '../../core/VisualEngine';

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  rotation: number;
  spin: number;
  phase: number;
};

export const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
export const countFor = (maximum: number, intensity: number, reduced: boolean) =>
  Math.max(1, Math.round(maximum * clamp01(intensity) * (reduced ? .42 : 1)));

const makeParticle = (width: number, height: number): Particle => ({
  x: Math.random() * width,
  y: Math.random() * height,
  vx: Math.random() * 2 - 1,
  vy: 1 + Math.random() * 2,
  size: 2 + Math.random() * 7,
  alpha: .35 + Math.random() * .6,
  rotation: Math.random() * Math.PI * 2,
  spin: (Math.random() - .5) * 2,
  phase: Math.random() * Math.PI * 2,
});

export abstract class ParticleEffect implements EffectModule {
  abstract readonly id: VisualEffectType;
  protected particles: Particle[] = [];
  protected width = 1;
  protected height = 1;
  protected abstract readonly maximum: number;

  initialize(ctx: CanvasRenderingContext2D) {
    this.width = ctx.canvas.width;
    this.height = ctx.canvas.height;
    this.particles = Array.from({ length: this.maximum }, () => makeParticle(this.width, this.height));
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.particles.forEach((particle) => {
      particle.x = Math.random() * width;
      particle.y = Math.random() * height;
    });
  }

  destroy() { this.particles = []; }

  abstract update(deltaSeconds: number, config: VisualEffectConfig, performanceMode: boolean): void;
  abstract render(ctx: CanvasRenderingContext2D, theme: ThemeEffects, config: VisualEffectConfig, performanceMode: boolean): void;

  protected resetTop(particle: Particle) {
    particle.x = Math.random() * this.width;
    particle.y = -particle.size * 2;
  }
}

