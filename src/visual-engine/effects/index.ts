import type { EffectModule } from '../core/VisualEngine';
import { AuroraEffect } from './aurora/AuroraEffect';
import { CrimsonBlossomEffect } from './crimson-blossom/CrimsonBlossomEffect';
import { ElectricityEffect } from './electricity/ElectricityEffect';
import { FogEffect } from './fog/FogEffect';
import { LaylaStarEffect } from './layla-star/LaylaStarEffect';
import { MapleLeafEffect } from './maple/MapleLeafEffect';
import { MatrixEffect } from './matrix/MatrixEffect';
import { RainEffect } from './rain/RainEffect';
import { SakuraEffect } from './sakura/SakuraEffect';
import { SnowEffect } from './snow/SnowEffect';
import { StarsEffect } from './stars/StarsEffect';
import { WaterSurfaceEffect } from './water/WaterSurfaceEffect';

export const createCanvasEffects = (): EffectModule[] => [
  new AuroraEffect(),
  new RainEffect(),
  new SakuraEffect(),
  new MapleLeafEffect(),
  new SnowEffect(),
  new ElectricityEffect(),
  new StarsEffect(),
  new MatrixEffect(),
  new FogEffect(),
  new LaylaStarEffect(),
  new WaterSurfaceEffect(),
  new CrimsonBlossomEffect(),
];
