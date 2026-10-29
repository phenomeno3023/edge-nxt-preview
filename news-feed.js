const PUBLIC_NEWS_URL = "https://phenomeno3023.github.io/edge-news/data/news.json";
const PUBLIC_STATUS_URL = "https://phenomeno3023.github.io/edge-news/data/status.json";

async function readJson(fetchImpl, url) {
  const response = await fetchImpl(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  return response.json();
}

async function firstAvailable(fetchImpl, urls) {
  let lastError = new Error("SOURCE_UNAVAILABLE");
  for (const url of urls) {
    try { return { value: await readJson(fetchImpl, url), url }; }
    catch (error) { lastError = error; }
  }
  throw lastError;
}

export async function readNewsSnapshot({
  fetchImpl = fetch,
  baseUrl = globalThis.location?.href || "https://phenomeno3023.github.io/edge-nxt-preview/",
  now = Date.now(),
  staleAfterMs = 65 * 60_000
} = {}) {
  const localNewsUrl = new URL("./data/news.json", baseUrl).href;
  const localStatusUrl = new URL("./data/status.json", baseUrl).href;
  let feedResult;
  try {
    feedResult = await firstAvailable(fetchImpl, [localNewsUrl, PUBLIC_NEWS_URL]);
  } catch (error) {
    return {
      status: "UNAVAILABLE", feedStatus: "UNAVAILABLE", feed: null, collectionHealth: null,
      statusFileState: "UNAVAILABLE", statusFile: null, sourceUrl: null,
      error: String(error?.message || "NEWS_FEED_UNAVAILABLE")
    };
  }

  const feed = feedResult.value;
  if (!feed || !Array.isArray(feed.items)) {
    return {
      status: "UNAVAILABLE", feedStatus: "UNAVAILABLE", feed: null, collectionHealth: null,
      statusFileState: "UNAVAILABLE", statusFile: null, sourceUrl: feedResult.url,
      error: "NEWS_JSON_ITEMS_INVALID"
    };
  }

  let statusFile = null;
  let statusFileState = "UNAVAILABLE";
  try {
    const result = await firstAvailable(fetchImpl, [localStatusUrl, PUBLIC_STATUS_URL]);
    if (result.value?.version === 1 && Object.hasOwn(result.value, "latestRun")) {
      statusFile = result.value;
      statusFileState = "OK";
    } else {
      statusFileState = "UNVERIFIED";
    }
  } catch { /* The feed remains usable when the separate state file is unavailable. */ }

  const collectionHealth = statusFile?.collectionHealth ?? feed.collectionHealth ?? null;
  const serverTime = statusFile?.serverTime ?? feed.serverTime;
  const serverTimeMs = Date.parse(serverTime || "");
  const ageMs = Number.isFinite(serverTimeMs) ? now - serverTimeMs : null;
  const feedStatus = ageMs === null ? "UNVERIFIED"
    : ageMs > staleAfterMs ? "STALE"
      : (statusFile?.latestRun ?? feed.latestRun)?.status === "ok" ? "OK" : "UNVERIFIED";

  return {
    status: "OK", feedStatus, feed, collectionHealth, statusFileState, statusFile,
    sourceUrl: feedResult.url, serverTime: serverTime || null,
    lastCollectionAt: (statusFile?.latestRun ?? feed.latestRun)?.finished_at || null,
    ageMs, collectionHealthState: collectionHealth?.state || "UNVERIFIED_FIELD_NOT_PUBLISHED"
  };
}
