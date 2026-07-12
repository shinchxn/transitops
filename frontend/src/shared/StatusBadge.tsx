// File: frontend/src/shared/StatusBadge.tsx
// Agents B/C/D import this rather than rebuilding badge markup on each page.
import { getStatusColor } from "./colors";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
        status
      )}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
