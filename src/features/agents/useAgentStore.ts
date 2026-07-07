import { create } from 'zustand';
import type { AgentProfile, AgentRun } from '../../models/Agent';

const PROFILES_KEY = 'chronoflow_agent_profiles_v1';
const RUNS_KEY = 'chronoflow_agent_runs_v1';

const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || 'null');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const defaultProfiles = (): AgentProfile[] => {
  const stamp = now();
  return [
    {
      id: id(),
      name: 'Codex CLI',
      mode: 'cli',
      command: 'codex',
      args: ['exec', '-'],
      enabled: false,
      timeoutSeconds: 900,
      createdAt: stamp,
      updatedAt: stamp,
    },
  ];
};

interface AgentState {
  profiles: AgentProfile[];
  runs: AgentRun[];
  hydrate: () => void;
  saveProfile: (profile: AgentProfile) => void;
  removeProfile: (id: string) => void;
  recordRun: (run: AgentRun) => void;
  clearRuns: () => void;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  profiles: [],
  runs: [],
  hydrate: () => {
    const storedProfiles = readJson<AgentProfile[]>(PROFILES_KEY, []);
    const profiles = storedProfiles.length ? storedProfiles : defaultProfiles();
    if (!storedProfiles.length) localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    set({ profiles, runs: readJson<AgentRun[]>(RUNS_KEY, []) });
  },
  saveProfile: (profile) => {
    const stamp = now();
    const normalized = { ...profile, mode: profile.mode || 'cli', name: profile.name.trim() || 'Unnamed agent', command: profile.command.trim(), updatedAt: stamp, createdAt: profile.createdAt || stamp };
    const profiles = get().profiles.some((item) => item.id === normalized.id)
      ? get().profiles.map((item) => item.id === normalized.id ? normalized : item)
      : [normalized, ...get().profiles];
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    set({ profiles });
  },
  removeProfile: (profileId) => {
    const profiles = get().profiles.filter((profile) => profile.id !== profileId);
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    set({ profiles });
  },
  recordRun: (run) => {
    const runs = [run, ...get().runs].slice(0, 300);
    localStorage.setItem(RUNS_KEY, JSON.stringify(runs));
    set({ runs });
  },
  clearRuns: () => {
    localStorage.setItem(RUNS_KEY, '[]');
    set({ runs: [] });
  },
}));
