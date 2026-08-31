import { redirect } from "next/navigation";
import { DEFAULT_LOCALE } from "@/i18n";

/** es-ES is the default locale; the URL always carries one. */
export default function Root() {
  redirect(`/${DEFAULT_LOCALE}`);
}
