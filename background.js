// Service worker: resolves a tweet's video URL and downloads it.
//
// X serves the <video> element from a blob URL, so the real file isn't on the
// page. We resolve it through the public syndication endpoint, which returns
// the tweet's media with direct .mp4 URLs from video.twimg.com.

// Token expected by cdn.syndication.twimg.com/tweet-result, derived from the id.
function syndicationToken(id) {
  return ((Number(id) / 1e15) * Math.PI)
    .toString(36)
    .replace(/(0+|\.)/g, "");
}

function sanitize(name) {
  return name.replace(/[^a-z0-9_\-]+/gi, "_").replace(/_+/g, "_").slice(0, 80);
}

// Pick the highest-bitrate mp4 from a video_info.variants array.
function bestMp4(variants) {
  if (!Array.isArray(variants)) return null;
  return variants
    .filter((v) => v && v.content_type === "video/mp4" && v.url)
    .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0] || null;
}

// All playable media (video + animated gif) in DOM order.
function videoMedia(tweet) {
  const details = Array.isArray(tweet && tweet.mediaDetails) ? tweet.mediaDetails : [];
  return details.filter((m) => m && (m.type === "video" || m.type === "animated_gif"));
}

async function resolveVideo(id, index) {
  const token = syndicationToken(id);
  const url =
    `https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=${token}&lang=en`;

  const res = await fetch(url, { credentials: "omit" });
  if (!res.ok) throw new Error(`syndication request failed (${res.status})`);
  const tweet = await res.json();
  if (!tweet || tweet.__typename === "TweetTombstone") {
    throw new Error("tweet unavailable (protected, deleted, or age-restricted)");
  }

  const media = videoMedia(tweet);
  if (media.length === 0) throw new Error("no downloadable video found for this post");

  const item = media[index] || media[0];
  const variant = bestMp4(item.video_info && item.video_info.variants);
  if (!variant) throw new Error("no mp4 source found for this video");

  const screenName = (tweet.user && tweet.user.screen_name) || "x";
  return { url: variant.url, filename: `${sanitize(screenName)}-${id}.mp4` };
}

async function handleDownload(id, index) {
  const { url, filename } = await resolveVideo(id, index || 0);
  await chrome.downloads.download({ url, filename, saveAs: false });
  return { ok: true };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "download" && msg.id) {
    handleDownload(msg.id, msg.index)
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true; // keep the channel open for the async response
  }
});
