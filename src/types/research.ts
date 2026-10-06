export type ResearchProjectStatus = "active" | "completed" | "archived";

export type ResearchProject = {
  id: string;
  title: string;
  description?: string;
  status: ResearchProjectStatus;
  createdAt: string;
  updatedAt: string;
};

export type ResearchSource = {
  id: string;
  projectId: string;
  bookmarkId: string;
  note?: string;
  createdAt: string;
};

export type ResearchNote = {
  id: string;
  projectId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};
