export type AgentRunStatus = 'completed' | 'failed';
export type AgentLaunchMode = 'cli' | 'app';

export type AgentProfile = {
  id: string;
  name: string;
  mode?: AgentLaunchMode;
  command: string;
  args: string[];
  workingDirectory?: string;
  timeoutSeconds?: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AgentRun = {
  id: string;
  agentId: string;
  agentName: string;
  source: 'schedule' | 'session';
  sourceId: string;
  sourceTitle: string;
  eventId: string;
  eventTitle: string;
  prompt: string;
  startedAt: string;
  endedAt: string;
  status: AgentRunStatus;
  exitCode?: number;
  stdout: string;
  stderr: string;
  error?: string;
  handoff?: string;
  nextEventId?: string;
  nextEventTitle?: string;
};
