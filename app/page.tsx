// Root is handled by next.config.js redirects → /past (TASK-010).
// Keep a soft fallback for environments that skip config redirects.
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/past");
}
