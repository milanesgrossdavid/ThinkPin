export type LearningPathStatus = "active" | "completed" | "archived";
export type LearningProgressStatus = "not_started" | "studied" | "mastered";

export type LearningBookmark = {
  id: string;
  title: string;
  description: string | null;
  url: string;
  domain: string;
  contentStatus: string;
  tags: string[];
};

export type LearningStageResource = {
  id: string;
  resourceId: string;
  resourceType: "bookmark" | "external";
  bookmarkId: string | null;
  externalSourceId: string | null;
  position: number;
  status: LearningProgressStatus;
  completedAt: string | null;
  bookmark: LearningBookmark;
};

export type LearningStage = {
  id: string;
  title: string;
  description: string;
  position: number;
  resources: LearningStageResource[];
};

export type LearningPath = {
  id: string;
  title: string;
  description: string;
  topic: string;
  status: LearningPathStatus;
  createdAt: string;
  updatedAt: string;
  stages: LearningStage[];
};
