/**
 * Pass-through root layout. `<html>` and `<body>` are rendered by
 * `src/app/[locale]/layout.tsx`, which is the only layout that knows the
 * language to stamp on them. `/` never renders — it redirects to `/es`.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
