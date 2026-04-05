/**
 * Fuzzy name matching for subcategories/categories (case, spacing, word order, light typos).
 */

const normalizeName = (s) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');

const tokenSortKey = (s) =>
  normalizeName(s)
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');

const levenshtein = (a, b) => {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
};

const levenshteinRatio = (a, b) => {
  if (!a.length && !b.length) return 1;
  if (!a.length || !b.length) return 0;
  const d = levenshtein(a, b);
  return 1 - d / Math.max(a.length, b.length);
};

/**
 * True if parsed text likely refers to the same subcategory row as candidate DB name.
 */
const namesMatchLoosely = (parsed, candidate) => {
  const p = normalizeName(parsed);
  const c = normalizeName(candidate);
  if (!p || !c) return false;
  if (p === c) return true;
  if (p.includes(c) || c.includes(p)) return true;

  const pNoSpace = p.replace(/\s/g, '');
  const cNoSpace = c.replace(/\s/g, '');
  if (pNoSpace === cNoSpace) return true;
  if (pNoSpace.includes(cNoSpace) || cNoSpace.includes(pNoSpace)) return true;

  if (tokenSortKey(parsed) === tokenSortKey(candidate)) return true;

  const tokensP = new Set(p.split(/\s+/).filter(Boolean));
  const tokensC = new Set(c.split(/\s+/).filter(Boolean));
  if (tokensP.size && tokensC.size) {
    let inter = 0;
    for (const t of tokensP) {
      if (tokensC.has(t)) inter += 1;
    }
    const union = new Set([...tokensP, ...tokensC]).size;
    if (union && inter / union >= 0.66) return true;
    if (inter >= Math.min(tokensP.size, tokensC.size) && inter > 0) return true;
  }

  if (levenshteinRatio(p, c) >= 0.88) return true;

  return false;
};

export { normalizeName, tokenSortKey, namesMatchLoosely, levenshteinRatio };
