// Adds a download button to every video on x.com / twitter.com.
// The button resolves the post's video and downloads it. Nothing else.

// Find the tweet id that owns a given video element.
function tweetIdFor(video) {
  const article = video.closest("article");
  const fromUrl = () => {
    const m = location.pathname.match(/\/status\/(\d+)/);
    return m ? m[1] : null;
  };
  if (!article) return fromUrl();

  const links = article.querySelectorAll('a[href*="/status/"]');
  // The timestamp link (the one wrapping a <time>) points at the canonical tweet.
  for (const a of links) {
    const m = a.getAttribute("href").match(/\/status\/(\d+)/);
    if (m && a.querySelector("time")) return m[1];
  }
  for (const a of links) {
    const m = a.getAttribute("href").match(/\/status\/(\d+)/);
    if (m) return m[1];
  }
  return fromUrl();
}

// Index of this video among the videos in its tweet (handles multi-video posts).
function videoIndex(video) {
  const article = video.closest("article");
  if (!article) return 0;
  const all = Array.from(article.querySelectorAll("video"));
  const i = all.indexOf(video);
  return i < 0 ? 0 : i;
}

function setState(btn, state) {
  btn.dataset.state = state; // idle | busy | done | error
  btn.disabled = state === "busy";
  btn.title =
    state === "busy" ? "Downloading…" :
    state === "done" ? "Saved" :
    state === "error" ? "Download failed — try again" :
    "Download video";
}

async function onClick(event, video) {
  event.preventDefault();
  event.stopPropagation();
  const btn = event.currentTarget;
  if (btn.dataset.state === "busy") return;

  const id = tweetIdFor(video);
  if (!id) {
    setState(btn, "error");
    return;
  }

  setState(btn, "busy");
  try {
    const res = await chrome.runtime.sendMessage({
      type: "download",
      id,
      index: videoIndex(video),
    });
    setState(btn, res && res.ok ? "done" : "error");
    if (!res || !res.ok) console.warn("[X Video Downloader]", res && res.error);
  } catch (err) {
    setState(btn, "error");
    console.warn("[X Video Downloader]", err);
  }
  setTimeout(() => setState(btn, "idle"), 2500);
}

function makeButton(video) {
  const btn = document.createElement("button");
  btn.className = "xvd-button";
  // Stop X from reacting to the press before the click fires.
  btn.addEventListener("mousedown", (e) => e.stopPropagation());
  btn.addEventListener("pointerdown", (e) => e.stopPropagation());
  btn.addEventListener("click", (e) => onClick(e, video));
  setState(btn, "idle");
  return btn;
}

function attachTo(video) {
  // Anchor the button to the player container so it tracks the video on scroll.
  const container =
    video.closest('[data-testid="videoPlayer"]') ||
    video.closest('[data-testid="videoComponent"]') ||
    video.parentElement;
  if (!container) return;

  // Re-add if X stripped our button during a re-render; never duplicate.
  if (container.querySelector(":scope > .xvd-button")) return;

  if (getComputedStyle(container).position === "static") {
    container.style.position = "relative";
  }
  container.appendChild(makeButton(video));
}

function scan() {
  document.querySelectorAll("video").forEach(attachTo);
}

const observer = new MutationObserver(() => {
  // X mutates the DOM constantly; debounce scans into the next frame.
  if (observer._queued) return;
  observer._queued = true;
  requestAnimationFrame(() => {
    observer._queued = false;
    scan();
  });
});

observer.observe(document.documentElement, { childList: true, subtree: true });
scan();
