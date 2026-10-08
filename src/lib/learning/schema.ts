export function isLearningExternalSchemaUnavailable(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    ["PGRST204", "PGRST205", "42703", "42P01"].includes(error.code)
  );
}
