# X Video Downloader

A minimal Chromium (Manifest V3) extension that adds a **download button** to every video on [x.com](https://x.com). Click the button and the post's video is saved to your downloads. That's all it does.

## How it works

X plays videos from a blob URL, so the real file isn't present on the page. The extension:

1. Adds a small download button over each `<video>` (visible on hover).
2. On click, finds the tweet id that owns the video.
3. Asks the service worker to resolve the file via the public
   `cdn.syndication.twimg.com/tweet-result` endpoint, which returns the post's
   media with direct `.mp4` URLs.
4. Downloads the highest-bitrate `.mp4` via the `chrome.downloads` API.

No tracking, no accounts, no other behavior.

## Install (unpacked)

1. Open `chrome://extensions` in Chromium.
2. Toggle **Developer mode** on (top right).
3. Click **Load unpacked** and select this folder.

The extension stays installed across restarts. Visit x.com, hover a video, and
click the download button in the top-left corner.

## Limitations

- Only works for videos resolvable through the public syndication endpoint.
  Protected, deleted, or age-restricted posts won't resolve.
- Videos inside a *quoted* tweet aren't currently handled.

## Files

| File | Purpose |
| --- | --- |
| `manifest.json` | MV3 manifest, permissions, scripts |
| `content.js` | Injects the button, finds the tweet id |
| `content.css` | Button styling and states |
| `background.js` | Resolves the mp4 URL and downloads it |

## License

MIT
