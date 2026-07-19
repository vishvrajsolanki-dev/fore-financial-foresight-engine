import { redirect } from "next/navigation";

/** Home pulse removed from primary nav (faces-first). Keep route as alias. */
export default function HomePage() {
  redirect("/past");
}
