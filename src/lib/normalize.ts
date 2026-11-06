import { db } from "./db";

/**
 * Computes Levenshtein edit distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  const m = s1.length;
  const n = s2.length;
  const d: number[][] = [];

  for (let i = 0; i <= m; i++) d[i] = [i];
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return d[m][n];
}

export interface DrugMatchResult {
  drugId: string;
  canonicalName: string;
  matchedName: string;
  matchType: "EXACT_CANONICAL" | "EXACT_ALIAS" | "FUZZY_CANONICAL" | "FUZZY_ALIAS";
  distance: number;
  confidence: number;
  needsConfirmation: boolean;
}

/**
 * Resolves a written drug name against canonical drugs and aliases in the database.
 * Never substitutes medicine - this is indexing and group mapping only.
 */
export async function normalizeDrugName(rawName: string): Promise<DrugMatchResult | null> {
  const query = rawName.trim().toLowerCase();
  if (!query) return null;

  const drugs = await db.drug.findMany({
    include: { aliases: true },
  });

  // 1. Exact match on canonical name
  for (const drug of drugs) {
    if (drug.canonicalName.toLowerCase() === query) {
      return {
        drugId: drug.id,
        canonicalName: drug.canonicalName,
        matchedName: drug.canonicalName,
        matchType: "EXACT_CANONICAL",
        distance: 0,
        confidence: 1.0,
        needsConfirmation: false,
      };
    }
  }

  // 2. Exact match on aliases
  for (const drug of drugs) {
    for (const alias of drug.aliases) {
      if (alias.alias.toLowerCase() === query) {
        return {
          drugId: drug.id,
          canonicalName: drug.canonicalName,
          matchedName: alias.alias,
          matchType: "EXACT_ALIAS",
          distance: 0,
          confidence: 0.95,
          needsConfirmation: false,
        };
      }
    }
  }

  // 3. Fuzzy match (distance <= 2)
  let bestMatch: DrugMatchResult | null = null;
  let minDistance = 3;

  for (const drug of drugs) {
    const distCanonical = levenshteinDistance(query, drug.canonicalName);
    if (distCanonical <= 2 && distCanonical < minDistance) {
      minDistance = distCanonical;
      bestMatch = {
        drugId: drug.id,
        canonicalName: drug.canonicalName,
        matchedName: drug.canonicalName,
        matchType: "FUZZY_CANONICAL",
        distance: distCanonical,
        confidence: distCanonical === 1 ? 0.78 : 0.70, // Below 0.80 -> triggers NEEDS_REVIEW
        needsConfirmation: true,
      };
    }

    for (const alias of drug.aliases) {
      const distAlias = levenshteinDistance(query, alias.alias);
      if (distAlias <= 2 && distAlias < minDistance) {
        minDistance = distAlias;
        bestMatch = {
          drugId: drug.id,
          canonicalName: drug.canonicalName,
          matchedName: alias.alias,
          matchType: "FUZZY_ALIAS",
          distance: distAlias,
          confidence: distAlias === 1 ? 0.75 : 0.68,
          needsConfirmation: true,
        };
      }
    }
  }

  return bestMatch;
}

/**
 * Parses numeric strength and units from raw strings like "500 mg", "1000mg", "40 mg", "5mg".
 */
export function parseStrength(rawText: string | null | undefined): {
  strengthValue: number | null;
  strengthUnit: string | null;
} {
  if (!rawText) return { strengthValue: null, strengthUnit: null };

  const match = rawText.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|iu|units?)/i);
  if (!match) return { strengthValue: null, strengthUnit: null };

  const val = parseFloat(match[1]);
  const unit = match[2].toLowerCase();

  return {
    strengthValue: isNaN(val) ? null : val,
    strengthUnit: unit,
  };
}
