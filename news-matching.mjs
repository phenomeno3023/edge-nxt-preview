const VALID_TICKER = /^\d{6}$/u;
const ENTITY_PARTICLES = "에서|으로|에게|한테|까지|부터|보다|라고|라며|이며|은|는|이|가|을|를|의|와|과|도|만|랑|로";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function companyMention(text, name) {
  const normalized = String(name || "").normalize("NFKC").trim().replace(/\s+/gu, " ");
  if (!normalized) return false;
  const words = normalized.split(" ").filter(Boolean).map(escapeRegExp);
  if (!words.length) return false;
  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${words.join("\\s+")}(?=$|[^\\p{L}\\p{N}]|(?:${ENTITY_PARTICLES})(?![\\p{L}]))`, "iu");
  return pattern.test(String(text || "").normalize("NFKC"));
}

export function hasIssuerEvidence(item, ticker, companyName = "") {
  const code = String(ticker || "").trim();
  if (!VALID_TICKER.test(code) || !item || typeof item !== "object") return false;
  const text = [item.title, item.summary, item.content, item.description, item.body]
    .filter((value) => typeof value === "string").join("\n");
  const exactCode = new RegExp(`(^|[^0-9])${code}(?=$|[^0-9])`, "u").test(text);
  if (exactCode) return true;
  const candidate = companyName || item.company || item.ticker_name || item.company_name || "";
  return companyMention(text, candidate);
}
