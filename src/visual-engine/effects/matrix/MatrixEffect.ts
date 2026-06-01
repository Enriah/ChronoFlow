import type { ThemeEffects } from '../../../themes/theme.types';
import type { EffectModule } from '../../core/VisualEngine';

export class MatrixEffect implements EffectModule {
  id = 'matrix';
  private width: number = 0;
  private height: number = 0;
  private fontSize: number = 20; // Increased font size for fewer columns
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
    // Increase font size in high resolution to keep column count low
    const actualFontSize = this.width > 1200 ? 24 : 18;
    this.fontSize = actualFontSize;
    const columnCount = Math.floor(this.width / this.fontSize);
    this.columns = Array.from({ length: columnCount }, () => Math.random() * -100);
  }

  update(deltaTime: number, intensity: number, speed: number, _performanceMode: boolean): void {
    this.intensity = intensity;
    this.speed = speed;
    this.timer += deltaTime;
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeEffects, performanceMode: boolean): void {
    const dropSpeed = this.speed * (performanceMode ? 1.5 : 2);
    
    ctx.fillStyle = theme.matrixColor;
    ctx.font = `${this.fontSize}px monospace`;

    // Skip every other column in performance mode for massive savings
    const step = performanceMode ? 2 : 1;

    for (let i = 0; i < this.columns.length; i += step) {
      if (Math.random() > this.intensity + 0.1) continue;

      const char = this.chars[Math.floor(Math.random() * this.chars.length)];
      const x = i * this.fontSize;
      const y = this.columns[i] * this.fontSize;

      ctx.fillText(char, x, y);

      if (y > this.height && Math.random() > 0.98) {
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
