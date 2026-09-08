/**
 * One JSON-LD block. `dangerouslySetInnerHTML` is the only way to put a raw
 * script body in the document, so the payload is escaped by hand: `<` is the
 * one character that could close the tag early, and the object we serialise
 * never legitimately contains it.
 */
export default function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
