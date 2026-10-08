export type DecisionOption = {
  id: string;
  label: string;
  position: number;
};

export type DecisionCriterion = {
  id: string;
  label: string;
  position: number;
};

export type DecisionBoard = {
  id: string;
  title: string;
  question: string;
  createdAt: string;
  updatedAt: string;
  options: DecisionOption[];
  criteria: DecisionCriterion[];
};

export type DecisionEvidence = {
  id: string;
  optionId: string;
  criterionId: string;
  bookmarkId: string | null;
  note: string | null;
  createdAt: string;
  bookmark: {
    title: string;
    url: string;
    domain: string;
  } | null;
};
