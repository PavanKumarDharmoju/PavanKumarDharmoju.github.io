#!/usr/bin/env python3
"""Write the latest Substack posts into blogs.html and photography.html.

The pages used to fetch the feed in the browser through third-party proxies,
which failed for visitors and was invisible to Google. This renders the posts
into the HTML instead, between these markers:

    <!-- substack:start --> ... <!-- substack:end -->

Photo posts are the ones whose title starts with "📷" or "[photo]"; they go
to Photography with the marker removed. Everything else goes to Blogs.
Notes that are only photos (no text) also go to Photography, grouped into
sets with a caption and camera details for each photo from
assets/data/photos.json (keyed by the image's file name on Substack).

    python3 scripts/sync_substack.py

Runs daily in .github/workflows/sync-substack.yml. Standard library only.
"""
import email.utils
import html
import json
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLICATION = "https://pixelsbypavan.substack.com"
FEED = PUBLICATION + "/feed"
LIMIT = 30
AUTHOR_ID = 378084778  # the publication author's Substack user id; Notes are per person, not per publication
NOTES = f"https://substack.com/api/v1/reader/feed/profile/{AUTHOR_ID}?types%5B%5D=note"
NOTE_PAGES = 10
PHOTO_LIMIT = 120
PHOTO_DATA = ROOT / "assets" / "data" / "photos.json"
PHOTO_MARKER = re.compile(r"^\s*(?:📷|\[photos?\]|\[photography\])\s*", re.I)
CONTENT_NS = "{http://purl.org/rss/1.0/modules/content/}encoded"
BLOCK = re.compile(r"(<!-- substack:start -->)(.*?)(\n[ \t]*<!-- substack:end -->)", re.S)


def fetch_items():
    req = urllib.request.Request(FEED, headers={"User-Agent": "pixelsbypavan-site-sync/1.0"})
    with urllib.request.urlopen(req, timeout=30) as res:
        root = ET.fromstring(res.read())
    items = []
    for it in root.iter("item"):
        get = lambda tag: (it.findtext(tag) or "").strip()
        content = it.findtext(CONTENT_NS) or get("description")
        enclosure = it.find("enclosure")
        image = enclosure.get("url") if enclosure is not None else first_image(content)
        items.append({
            "title": get("title"),
            "link": get("link"),
            "date": email.utils.parsedate_to_datetime(get("pubDate")) if get("pubDate") else None,
            "image": image or "",
            "excerpt": text_of(get("description") or content),
        })
    return items


def fetch_photo_notes():
    """Photos from Notes that have images and no text, newest first."""
    photos, cursor = [], None
    for _ in range(NOTE_PAGES):
        url = NOTES + ("&cursor=" + urllib.parse.quote(cursor) if cursor else "")
        req = urllib.request.Request(url, headers={"User-Agent": "pixelsbypavan-site-sync/1.0"})
        with urllib.request.urlopen(req, timeout=30) as res:
            page = json.load(res)
        for item in page.get("items", []):
            note = item.get("comment") or {}
            images = [a for a in note.get("attachments") or [] if a.get("type") == "image" and a.get("imageUrl")]
            if note.get("user_id") != AUTHOR_ID or (note.get("body") or "").strip() or not images:
                continue
            date = datetime.fromisoformat(note["date"].replace("Z", "+00:00"))
            link = f"https://substack.com/@{note.get('handle') or 'pixelsbypavan'}/note/c-{note['id']}"
            photos += [{"link": link, "date": date, "url": a["imageUrl"],
                        "w": a.get("imageWidth") or 4, "h": a.get("imageHeight") or 3} for a in images]
        cursor = page.get("nextCursor")
        if not cursor or len(photos) >= PHOTO_LIMIT:
            break
    return photos[:PHOTO_LIMIT]


def cdn(url, width):
    # q_90 rather than q_auto:good, which compresses photos visibly
    return f"https://substackcdn.com/image/fetch/w_{width},c_limit,f_auto,q_90,fl_progressive:steep/{urllib.parse.quote(url, safe='')}"


def describe(photos):
    """Attach caption, date and camera details from PHOTO_DATA; group into sets, latest set first."""
    data = json.loads(PHOTO_DATA.read_text(encoding="utf-8")) if PHOTO_DATA.exists() else {}
    trips, known = data.get("trips", {}), data.get("photos", {})
    sets = {}
    for p in photos:
        info = known.get(p["url"].rsplit("/", 1)[-1], {})
        taken = datetime.fromisoformat(info["date"]) if info.get("date") else p["date"]  # local time the photo was taken
        key = info.get("trip") if info.get("trip") in trips else f"{p['date']:%Y-%m}"
        trip = trips.get(key, {"title": f"{p['date']:%B %Y}", "place": "", "when": ""})
        settings = [info.get(k) for k in ("focal", "aperture", "shutter")] + ([f"ISO {info['iso']}"] if info.get("iso") else [])
        sets.setdefault(key, {**trip, "photos": []})["photos"].append(dict(
            p, taken=taken, caption=info.get("caption", ""),
            short=" · ".join(x for x in settings[1:] if x),
            full=" · ".join(x for x in [info.get("camera"), info.get("lens")] + settings if x)))
    for s in sets.values():
        s["photos"].sort(key=lambda p: p["taken"].replace(tzinfo=None))
    return sorted(sets.values(), key=lambda s: s["photos"][0]["taken"].replace(tzinfo=None), reverse=True)  # by when each set starts


def first_image(markup):
    m = re.search(r'<img[^>]+src="([^"]+)"', markup or "", re.I)
    return html.unescape(m.group(1)) if m else ""


def text_of(markup):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", markup or ""))).strip()


def clamp(text, n):
    return html.escape(text[:n]) + "…" if len(text) > n else html.escape(text)


def fmt_date(d):
    return f"{d:%B} {d.day}, {d.year}" if d else ""


def list_card(p, ind):
    img = (f'\n{ind}        <img src="{html.escape(p["image"])}" alt="" loading="lazy" '
           f'class="w-28 h-20 object-cover rounded-md flex-shrink-0 hidden sm:block">') if p["image"] else ""
    return f'''
{ind}<a href="{html.escape(p["link"])}" target="_blank" rel="noopener" class="block border-l-2 border-gray-200 hover:border-blue-400 pl-6 pb-6 transition-colors group">
{ind}    <div class="flex items-center gap-3 mb-3">
{ind}        <div class="w-2 h-2 bg-blue-500 rounded-full -ml-7 border-2 border-white"></div>
{ind}        <span class="text-sm text-gray-500">{fmt_date(p["date"])}</span>
{ind}        <span class="text-sm text-gray-400">•</span>
{ind}        <span class="text-sm text-gray-400">Substack</span>
{ind}    </div>
{ind}    <div class="flex gap-4">{img}
{ind}        <div>
{ind}            <h2 class="font-medium text-gray-900 mb-1 group-hover:text-blue-600">{html.escape(p["title"])}</h2>
{ind}            <p class="text-gray-600 text-sm leading-relaxed">{clamp(p["excerpt"], 200)}</p>
{ind}        </div>
{ind}    </div>
{ind}</a>'''


def gallery_card(p, ind):
    img = (f'<img src="{html.escape(p["image"])}" alt="{html.escape(p["title"])}" loading="lazy" '
           f'class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">') if p["image"] else ""
    return f'''
{ind}<a href="{html.escape(p["link"])}" target="_blank" rel="noopener" class="group block">
{ind}    <div class="overflow-hidden rounded-lg bg-gray-100 aspect-[4/3]">{img}</div>
{ind}    <h2 class="mt-3 font-medium text-gray-900 text-sm group-hover:text-blue-600">{html.escape(p["title"])}</h2>
{ind}    <p class="text-gray-500 text-xs mt-1">{fmt_date(p["date"])}</p>
{ind}</a>'''


def photo_figure(p, ind):
    day = f"{p['taken']:%-d %b %Y}"
    alt = p["caption"] or f"Photo, {p['taken']:%B %Y}"
    sub = " · ".join(x for x in [day, p["short"]] if x)
    caption = f'\n{ind}        <p class="text-sm text-gray-800 leading-snug">{html.escape(p["caption"])}</p>' if p["caption"] else ""
    return f'''
{ind}<figure>
{ind}    <a href="{html.escape(p["url"])}" data-photo data-caption="{html.escape(p["caption"])}" data-meta="{html.escape(" · ".join(x for x in [day, p["full"]] if x))}" data-note="{html.escape(p["link"])}" class="block overflow-hidden rounded-md bg-gray-100">
{ind}        <img src="{cdn(p["url"], 600)}" srcset="{cdn(p["url"], 400)} 400w, {cdn(p["url"], 800)} 800w" sizes="(min-width: 640px) 210px, 45vw" width="600" height="600" alt="{html.escape(alt)}" loading="lazy" decoding="async" class="w-full aspect-square object-cover hover:opacity-90 transition-opacity">
{ind}    </a>
{ind}    <figcaption class="mt-2">{caption}
{ind}        <p class="text-xs text-gray-500 mt-0.5">{html.escape(sub)}</p>
{ind}    </figcaption>
{ind}</figure>'''


def photo_set(s, ind):
    n = len(s["photos"])
    sub = " · ".join(x for x in [s["place"], s["when"], f"{n} photo{'s' if n != 1 else ''}"] if x)
    figures = "".join(photo_figure(p, ind + "        ") for p in s["photos"])
    return f'''
{ind}<section>
{ind}    <h2 class="text-lg font-medium text-gray-900">{html.escape(s["title"])}</h2>
{ind}    <p class="text-sm text-gray-500 mb-4">{html.escape(sub)}</p>
{ind}    <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-6">{figures}
{ind}    </div>
{ind}</section>'''


def empty(message, ind):
    return (f'\n{ind}<p class="text-gray-500 text-sm">{html.escape(message)} '
            f'<a class="text-blue-600 hover:underline" href="{PUBLICATION}" target="_blank" rel="noopener">Visit on Substack →</a></p>')


def render(items, layout, message, ind):
    if not items:
        return empty(message, ind)
    if layout == "gallery":
        cards = "".join(gallery_card(p, ind + "    ") for p in items)
        return f'\n{ind}<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{cards}\n{ind}</div>'
    cards = "".join(list_card(p, ind + "    ") for p in items)
    return f'\n{ind}<div class="space-y-6">{cards}\n{ind}</div>'


def render_photography(posts, photos, ind):
    if not posts and not photos:
        return empty("No photos yet.", ind)
    body = render(posts, "gallery", "", ind) if posts else ""
    if photos:
        sets = "".join(photo_set(s, ind + "    ") for s in describe(photos))
        gap = " mt-12" if posts else ""
        body += f'\n{ind}<div class="space-y-12{gap}">{sets}\n{ind}</div>'
    return body


def write(page, body):
    path = ROOT / page
    text = path.read_text(encoding="utf-8")
    m = BLOCK.search(text)
    if not m:
        sys.exit(f"{page}: substack markers not found")
    new = text[:m.start(2)] + body + text[m.end(2):]
    if new != text:
        path.write_text(new, encoding="utf-8")
        print(f"updated {page}")
    else:
        print(f"unchanged {page}")


def indent_of(page):
    m = re.search(r"\n([ \t]*)<!-- substack:start -->", (ROOT / page).read_text(encoding="utf-8"))
    return m.group(1) if m else ""


def main():
    items = fetch_items()
    photos = [dict(p, title=PHOTO_MARKER.sub("", p["title"]).strip()) for p in items if PHOTO_MARKER.match(p["title"])][:LIMIT]
    writing = [p for p in items if not PHOTO_MARKER.match(p["title"])][:LIMIT]
    write("blogs.html", render(writing, "list", "No articles yet.", indent_of("blogs.html")))
    write("photography.html", render_photography(photos, fetch_photo_notes(), indent_of("photography.html")))


if __name__ == "__main__":
    main()
