export type LinkedActionType = "url" | "application" | "folder";

export type LinkedAction = {
  id: string;
  type: LinkedActionType;
  label: string;
  value: string;
  enabled: boolean;
};
