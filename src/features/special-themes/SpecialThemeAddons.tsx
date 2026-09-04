import { useEffect, useState } from 'react';
import { Check, Download, RefreshCw, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '../../components/ui/Button';
import { PersistentAssetService } from '../../services/PersistentAssetService';
import { useThemeStore } from '../../store/useThemeStore';

export function SpecialThemeAddons() {
  const {
    downloadedSpecialThemes, draftEnvironment, specialThemeRegistryUrl,
    isFetchingSpecialThemes, specialThemeError, setSpecialThemeRegistryUrl,
    fetchSpecialThemes, loadPreset, removeDownloadedSpecialTheme,
  } = useThemeStore();
  const [registryUrl, setRegistryUrl] = useState(specialThemeRegistryUrl);

  useEffect(() => setRegistryUrl(specialThemeRegistryUrl), [specialThemeRegistryUrl]);

  const refreshCatalog = async () => {
    setSpecialThemeRegistryUrl(registryUrl);
    await fetchSpecialThemes();
  };

  return <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
      <div>
        <h3 className="font-black">Special theme add-ons</h3>
        <p className="mt-1 max-w-2xl text-xs text-text-secondary">Special themes are installed as local packages. Their theme data and preview assets are loaded from the app-data add-ons directory at startup.</p>
      </div>
      <Button variant="secondary" onClick={refreshCatalog} disabled={isFetchingSpecialThemes}>
        {isFetchingSpecialThemes ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {isFetchingSpecialThemes ? 'Installing' : 'Install / refresh'}
      </Button>
    </div>

    <label className="mt-4 block">
      <span className="text-xs font-bold text-text-secondary">Add-on catalog URL</span>
      <input
        className="mt-2 w-full rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm outline-none transition focus:border-primary"
        value={registryUrl}
        onChange={(event) => setRegistryUrl(event.target.value)}
        onBlur={() => setSpecialThemeRegistryUrl(registryUrl)}
        spellCheck={false}
      />
    </label>

    {specialThemeError && <p className="mt-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">{specialThemeError}</p>}

    {downloadedSpecialThemes.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {downloadedSpecialThemes.map((theme) => {
        const selected = draftEnvironment.themeId === theme.theme.id;
        const preview = PersistentAssetService.getAssetUrl(theme.previewImageUrl || theme.definition.assets?.sidebarChibiUrl || '');
        return <article key={theme.id} className={clsx('rounded-xl border bg-surface-muted p-4', selected ? 'border-primary ring-1 ring-primary' : 'border-border')}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {preview
                ? <span className="flex h-12 w-12 shrink-0 items-end justify-center overflow-hidden rounded-lg border border-border bg-surface"><img className="h-full w-full object-contain object-bottom" src={preview} alt="" /></span>
                : <span className="h-12 w-12 shrink-0 rounded-lg border border-border" style={{ background: theme.theme.colors.primary }} />}
              <div className="min-w-0"><h4 className="truncate text-sm font-black">{theme.name}</h4><p className="mt-1 text-xs text-text-secondary">Installed add-on</p></div>
            </div>
            {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => void removeDownloadedSpecialTheme(theme.id)} aria-label={`Remove ${theme.name}`}><Trash2 className="h-4 w-4" /></Button>
            <Button size="sm" onClick={() => loadPreset(theme.id)}>Use add-on</Button>
          </div>
        </article>;
      })}
    </div> : <div className="mt-4 flex min-h-28 items-center justify-center rounded-xl border border-dashed border-border bg-surface-muted p-5 text-center text-sm text-text-secondary">No special theme add-ons are installed.</div>}
  </section>;
}
