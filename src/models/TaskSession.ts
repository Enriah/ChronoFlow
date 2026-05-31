export type TaskSession = {
  id: string;
  taskId: string;
  taskName: string;
  startTime: number; // epoch ms
  endTime: number; // epoch ms
  duration: number; // ms
  category?: string;
};
