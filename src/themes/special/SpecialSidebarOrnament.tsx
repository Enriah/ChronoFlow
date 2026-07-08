import type { ComponentType } from 'react';
import { getSpecialThemeDefinition, type SpecialSidebarOrnamentKey } from './registry';
import { SidebarBranchOrnament as HutaoSidebarBranchOrnament } from './hutao/SidebarBranchOrnament';
import { SidebarAstrolabeOrnament as LaylaSidebarAstrolabeOrnament } from './layla/SidebarAstrolabeOrnament';

const sidebarOrnaments: Record<SpecialSidebarOrnamentKey, ComponentType> = {
  'hutao-crimson-branch': HutaoSidebarBranchOrnament,
  'layla-astrolabe': LaylaSidebarAstrolabeOrnament,
};

export function SpecialSidebarOrnament({ themeId }: { themeId?: string }) {
  const ornamentKey = getSpecialThemeDefinition(themeId)?.sidebarOrnament;
  const Ornament = ornamentKey ? sidebarOrnaments[ornamentKey] : undefined;
  return Ornament ? <Ornament /> : null;
}
