import { invoke } from '@tauri-apps/api/core';
import type { AgentProfile, AgentRun } from '../../models/Agent';
import type { PlannedTask } from '../../models/PlannedTask';
import type { WorkSession } from '../../models/WorkSession';
import type { TimelineEvent } from '../../models/EventTimeline';

type AgentCommandResult = {
  exitCode?: number;
  stdout: string;
  stderr: string;
};

const clip = (value = '', max = 12_000) => value.length > max ? `${value.slice(0, max)}\n\n[truncated]` : value;
const handoffClip = (value = '', max = 6_000) => value.length > max ? `${value.slice(0, max)}\n\n[handoff truncated]` : value;

export function buildAgentHandoff(run: AgentRun) {
  const output = run.stdout.trim() || run.stderr.trim() || run.error || 'No output was returned.';
  return [
    `# Agent handoff: ${run.eventTitle}`,
    '',
    `Agent: ${run.agentName}`,
    `Status: ${run.status}`,
    `Completed at: ${run.endedAt}`,
    run.exitCode !== undefined ? `Exit code: ${run.exitCode}` : '',
    '',
    '## Result',
    handoffClip(output),
    run.error ? ['', '## Error', run.error].join('\n') : '',
  ].filter(Boolean).join('\n');
}

export function buildScheduleAgentPrompt(task: PlannedTask, event: TimelineEvent) {
  return [
    'You are an AI agent triggered by a ChronoFlow schedule event.',
    '',
    `Project: ${task.project || 'Unassigned'}`,
    `Schedule: ${task.title}`,
    task.description ? `Schedule description:\n${task.description}` : '',
    '',
    `Event: ${event.title}`,
    event.description ? `Event prompt:\n${event.description}` : 'Event prompt: No description provided.',
    event.agent?.descriptionAppend ? `Additional agent instructions:\n${event.agent.descriptionAppend}` : '',
    '',
    'Constraints:',
    '- Stay within the project and task scope.',
    '- Do not perform destructive operations unless explicitly requested.',
    '- Treat this event as the communication packet for your agent work.',
    '- Return a concise handoff for the next event/agent: summary, files changed, commands/tests run, blockers, and recommended next step.',
  ].filter(Boolean).join('\n');
}

export function buildSessionAgentPrompt(session: WorkSession, event: TimelineEvent) {
  return [
    'You are an AI agent triggered by a ChronoFlow session event.',
    '',
    `Project: ${session.project || 'Unassigned'}`,
    `Session: ${session.title}`,
    session.description ? `Session description:\n${session.description}` : '',
    session.notes ? `Session notes:\n${session.notes}` : '',
    '',
    `Event: ${event.title}`,
    event.description ? `Event prompt:\n${event.description}` : 'Event prompt: No description provided.',
    event.agent?.descriptionAppend ? `Additional agent instructions:\n${event.agent.descriptionAppend}` : '',
    '',
    'Constraints:',
    '- Stay within the project and session scope.',
    '- Do not perform destructive operations unless explicitly requested.',
    '- Treat this event as the communication packet for your agent work.',
    '- Return a concise handoff for the next event/agent: summary, files changed, commands/tests run, blockers, and recommended next step.',
  ].filter(Boolean).join('\n');
}

export const AgentService = {
  async run(profile: AgentProfile, prompt: string, timeoutSeconds?: number): Promise<AgentCommandResult> {
    if ((profile.mode || 'cli') === 'app') {
      return invoke<AgentCommandResult>('run_agent_app', {
        request: {
          command: profile.command,
          args: profile.args,
          workingDirectory: profile.workingDirectory,
          prompt: clip(prompt),
        },
      });
    }
    return invoke<AgentCommandResult>('run_agent_command', {
      request: {
        command: profile.command,
        args: profile.args,
        workingDirectory: profile.workingDirectory,
        prompt: clip(prompt),
        timeoutSeconds: timeoutSeconds || profile.timeoutSeconds || 900,
      },
    });
  },
  createRun(base: Omit<AgentRun, 'id' | 'startedAt' | 'endedAt' | 'status' | 'stdout' | 'stderr'>, result: AgentCommandResult, startedAt: string): AgentRun {
    const failed = typeof result.exitCode === 'number' && result.exitCode !== 0;
    return {
      ...base,
      id: crypto.randomUUID(),
      startedAt,
      endedAt: new Date().toISOString(),
      status: failed ? 'failed' : 'completed',
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      error: failed ? result.stderr || `Agent exited with code ${result.exitCode}` : undefined,
    };
  },
};
