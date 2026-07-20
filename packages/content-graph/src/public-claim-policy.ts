export interface ForbiddenPublicClaim {
  id: string;
  pattern: RegExp;
}

export const FORBIDDEN_PUBLIC_CLAIMS: readonly ForbiddenPublicClaim[] = [
  { id: "derived-percentage", pattern: /\b80\s*%/i },
  { id: "open-to-work", pattern: /\bopen[-\s]?to[-\s]?work\b/i },
  { id: "public-availability", pattern: /\b(?:available for|availability for|disponible para|disponibilidad para)\b/i },
  { id: "compensation", pattern: /\b(?:compensation|salary|compensaci[oó]n|salario)\b/i },
  { id: "published-rates", pattern: /\b(?:(?:hourly|daily|project|consulting)\s+rates?|tarifas?\s+(?:por hora|diarias?|de proyecto|de consultor[ií]a))\b/i },
  { id: "leaving-tala", pattern: /\b(?:leaving Tala|salir de Tala)\b/i },
  { id: "explicit-job-search", pattern: /\b(?:looking for (?:a )?(?:job|role|work)|busco (?:empleo|trabajo|un rol))\b/i },
  { id: "ai-ml-title", pattern: /\bAI[\/-]ML Engineer\b/i },
  { id: "rag", pattern: /\bRAG\b/i },
  { id: "fine-tuning", pattern: /\bfine[- ]tuning\b/i },
  { id: "model-evaluation", pattern: /\bmodel (?:evals|evaluations)\b/i },
  { id: "semantic-search", pattern: /\b(?:semantic search|b[uú]squeda sem[aá]ntica)\b/i },
  { id: "model-training", pattern: /\b(?:model training|entrenamiento de modelos?)\b/i },
  { id: "ai-data-pipelines", pattern: /\b(?:AI data pipelines?|pipelines? de datos (?:de|para) IA)\b/i },
  { id: "confidential-city", pattern: /\bNew York\b/i },
  { id: "app-store", pattern: /\bApp Store\b/i },
  { id: "staff-scope", pattern: /\bStaff Product Engineer\b/i },
  { id: "private-system-internals", pattern: /\bDevelopment System (?:repository|manifest|adapter|instructions?)\b/i },
] as const;

export function findForbiddenPublicClaims(value: unknown): string[] {
  const publicText = typeof value === "string" ? value : JSON.stringify(value);
  return FORBIDDEN_PUBLIC_CLAIMS
    .filter(({ pattern }) => pattern.test(publicText))
    .map(({ id }) => id);
}

export function assertPublicClaimsSafe(value: unknown, context: string): void {
  const findings = findForbiddenPublicClaims(value);
  if (findings.length > 0) {
    throw new Error(`Unsafe public claims in ${context}: ${findings.join(", ")}.`);
  }
}
