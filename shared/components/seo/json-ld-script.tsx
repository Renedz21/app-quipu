type JsonLdScriptProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

/** Escapa `<` en JSON-LD para evitar rotura de `</script>` (Next.js / schema.org). */
export function JsonLdScript({ data }: JsonLdScriptProps) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
