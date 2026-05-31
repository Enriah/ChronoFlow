import type { ThemeEffects } from '../../../themes/theme.types';
import type { EffectModule } from '../../core/VisualEngine';

export class MatrixEffect implements EffectModule {
  id = 'matrix';
  private width: number = 0;
  private height: number = 0;
  private fontSize: number = 16;
  private columns: number[] = [];
  private chars: string = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ';
  private intensity: number = 0.5;
  private speed: number = 0.5;
  private timer: number = 0;

  initialize(ctx: CanvasRenderingContext2D): void {
    this.width = ctx.canvas.width;
    this.height = ctx.canvas.height;
    this.setupColumns();
  }

  private setupColumns() {
    const columnCount = Math.floor(this.width / this.fontSize);
    this.columns = Array.from({ length: columnCount }, () => Math.random() * -100);
  }

  update(deltaTime: number, intensity: number, speed: number, _performanceMode: boolean): void {
    this.intensity = intensity;
    this.speed = speed;
    this.timer += deltaTime;
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeEffects, _performanceMode: boolean): void {
    // We only update column positions here to keep it tied to the render loop speed for that "stuttery" matrix look
    // but controlled by the speed config.
    const dropSpeed = this.speed * 2;
    
    ctx.fillStyle = theme.matrixColor;
    ctx.font = `${this.fontSize}px monospace`;

    for (let i = 0; i < this.columns.length; i++) {
      // Randomly skip columns based on intensity
      if (Math.random() > this.intensity + 0.2) continue;

      const char = this.chars[Math.floor(Math.random() * this.chars.length)];
      const x = i * this.fontSize;
      const y = this.columns[i] * this.fontSize;

      ctx.fillText(char, x, y);

      if (y > this.height && Math.random() > 0.975) {
        this.columns[i] = 0;
      }

      this.columns[i] += dropSpeed;
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.setupColumns();
  }

  destroy(): void {
    this.columns = [];
  }
}
