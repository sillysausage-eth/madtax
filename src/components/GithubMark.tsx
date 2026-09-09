/**
 * The GitHub mark, inlined.
 *
 * The one image on the site, and it is 15px wide — a request for it would cost
 * more than the path does. It is drawn twice, in the masthead and in the footer,
 * and in both places it is the whole of the link, so the anchor carries the name
 * the mark is not printing.
 */
export default function GithubMark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden focusable="false">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-2.92-.88-2.92-2.75 0-.79.28-1.44.75-1.95-.07-.2-.33-.98.07-2.03 0 0 .61-.19 2 .75a5.4 5.4 0 0 1 1.53-.21c.52 0 1.04.07 1.53.21 1.39-.95 2-.75 2-.75.4 1.05.14 1.83.07 2.03.47.51.75 1.16.75 1.95 0 1.88-1.15 2.55-2.93 2.75.3.26.56.76.56 1.54 0 1.09-.01 1.98-.01 2.25 0 .21.15.46.55.38A7.99 7.99 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}
