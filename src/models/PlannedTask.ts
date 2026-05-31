export type PlannedTask = {
  id: string;
  title: string;
  description?: string;
  date: string; // ISO string (YYYY-MM-DD)
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  category?: string;
  tags?: string[];
  completed?: boolean;
  color?: string;
};
