export type AsyncStatus = "idle" | "loading" | "success" | "error";

export type AsyncState = {
  status: AsyncStatus;
  error?: string;
};
