// Root is handled by next.config.js redirects → /login (sign in → upload → dashboard).
// Keep a soft fallback for environments that skip config redirects.
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/login");
}
