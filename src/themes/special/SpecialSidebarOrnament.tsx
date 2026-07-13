import type { ComponentType } from 'react';
import { getSpecialThemeDefinition, type SpecialSidebarOrnamentKey, type SpecialThemeDefinition } from './registry';
import { SidebarBranchOrnament as HutaoSidebarBranchOrnament } from './hutao/SidebarBranchOrnament';
import { SidebarAstrolabeOrnament as LaylaSidebarAstrolabeOrnament } from './layla/SidebarAstrolabeOrnament';

const sidebarOrnaments: Record<SpecialSidebarOrnamentKey, ComponentType<{ definition?: SpecialThemeDefinition }>> = {
  'hutao-crimson-branch': HutaoSidebarBranchOrnament,
  'layla-astrolabe': LaylaSidebarAstrolabeOrnament,
};

export function SpecialSidebarOrnament({ themeId }: { themeId?: string }) {
  const ornamentKey = getSpecialThemeDefinition(themeId)?.sidebarOrnament;
  const definition = getSpecialThemeDefinition(themeId);
  const Ornament = ornamentKey ? sidebarOrnaments[ornamentKey] : undefined;
  return Ornament ? <Ornament definition={definition} /> : null;
}
