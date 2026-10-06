export type ReminderType =
  | "manual"
  | "smart"
  | "research"
  | "learning"
  | "shopping";

export type Reminder = {
  id: string;
  userId: string;
  bookmarkId: string;
  type: ReminderType;
  scheduledFor: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};
