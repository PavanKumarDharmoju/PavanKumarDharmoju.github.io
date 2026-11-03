#!/usr/bin/env python3
"""Write the latest Substack posts into blogs.html and photography.html.

The pages used to fetch the feed in the browser through third-party proxies,
which failed for visitors and was invisible to Google. This renders the posts
into the HTML instead, between these markers:

    <!-- substack:start --> ... <!-- substack:end -->

Photo posts are the ones whose title starts with "📷" or "[photo]"; they go
to Photography with the marker removed. Everything else goes to Blogs.
Photo Notes also go to Photography, in sets of justified rows that keep each
photo's shape. A photo Note is one with images whose text is empty or written
like this, one caption per image in the order Substack lists them:

    📷 Coorg · Karnataka, India · October 2025
    The stream below Kote Abbi Falls
    Kote Abbi Falls
    ...

The first line names the set, then the place and the month (or a range such
as "October–November 2025"); Notes with the same set name are shown together.

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
    """Photos from photo Notes (see the module docstring), newest Note first."""
    photos, cursor = [], None
    for _ in range(NOTE_PAGES):
        url = NOTES + ("&cursor=" + urllib.parse.quote(cursor) if cursor else "")
        req = urllib.request.Request(url, headers={"User-Agent": "pixelsbypavan-site-sync/1.0"})
        with urllib.request.urlopen(req, timeout=30) as res:
            page = json.load(res)
        for item in page.get("items", []):
            note = item.get("comment") or {}
            images = [a for a in note.get("attachments") or [] if a.get("type") == "image" and a.get("imageUrl")]
            body = (note.get("body") or "").strip()
            if note.get("user_id") != AUTHOR_ID or not images or (body and not PHOTO_MARKER.match(body)):
                continue
            date = datetime.fromisoformat(note["date"].replace("Z", "+00:00"))
            link = f"https://substack.com/@{note.get('handle') or 'pixelsbypavan'}/note/c-{note['id']}"
            title, place, when, captions = read_note(body)
            posted = date.replace(tzinfo=None)
            start, end = when or (posted, posted)
            for i, a in enumerate(images):
                photos.append({"link": link, "date": date, "order": (note["id"], i), "url": a["imageUrl"],
                               "w": a.get("imageWidth") or 4, "h": a.get("imageHeight") or 3,
                               "title": title, "place": place, "start": start, "end": end,
                               "caption": captions[i] if i < len(captions) else ""})
        cursor = page.get("nextCursor")
        if not cursor or len(photos) >= PHOTO_LIMIT:
            break
    return photos[:PHOTO_LIMIT]


def read_note(body):
    """(set title, place, (first, last month) or None, captions) from a photo Note's text."""
    lines = [l.strip() for l in body.splitlines() if l.strip()]
    if not lines:
        return "", "", None, []
    parts = [x.strip() for x in PHOTO_MARKER.sub("", lines[0]).split(" · ")]
    when = months(parts[-1]) if len(parts) > 1 else None
    place = " · ".join(parts[1:-1] if when else parts[1:])
    return parts[0], place, when, [l.partition(" — ")[0].strip() for l in lines[1:]]


def months(label):
    """"October 2025", "October–November 2025" or "December 2025–January 2026" as (first, last) month."""
    try:
        first, _, last = label.partition("–")
        last = datetime.strptime((last or first).strip(), "%B %Y")
        first = first.strip()
        first = datetime.strptime(first if first[-4:].isdigit() else f"{first} {last.year}", "%B %Y")
        return first, last
    except ValueError:
        return None


def month_range(first, last):
    if (first.year, first.month) == (last.year, last.month):
        return f"{first:%B %Y}"
    return f"{first:%B}–{last:%B %Y}" if first.year == last.year else f"{first:%B %Y}–{last:%B %Y}"


def cdn(url, width):
    # q_90 rather than q_auto:good, which compresses photos visibly
    return f"https://substackcdn.com/image/fetch/w_{width},c_limit,f_auto,q_90,fl_progressive:steep/{urllib.parse.quote(url, safe='')}"


def describe(photos):
    """Group photos into sets by their Note's title (or by month), latest set first."""
    sets = {}
    for p in photos:
        key = p["title"] or f"{p['start']:%B %Y}"
        s = sets.setdefault(key, {"title": key, "place": p["place"], "photos": []})
        s["place"] = s["place"] or p["place"]
        s["photos"].append(p)
    for s in sets.values():
        s["photos"].sort(key=lambda p: (p["start"], p["order"]))
        s["start"] = min(p["start"] for p in s["photos"])
        s["when"] = month_range(s["start"], max(p["end"] for p in s["photos"]))
    return sorted(sets.values(), key=lambda s: s["start"], reverse=True)  # by when each set starts


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
    when = month_range(p["start"], p["end"])
    alt = p["caption"] or f"Photo, {when}"
    meta = " · ".join(x for x in [p["title"], p["place"], when] if x)
    caption = (f'\n{ind}        <p class="text-sm text-gray-800 leading-snug" title="{html.escape(p["caption"])}">'
               f'{html.escape(p["caption"])}</p>') if p["caption"] else ""
    ratio = f'{p["w"] / p["h"]:.3f}'
    # Justified rows. The script in photography.html picks the row breaks and sets exact widths so every
    # row fills the column edge to edge; this flex style is only the fallback when that script doesn't run.
    width = min(672, round(p["w"] / p["h"] * 220))
    return f'''
{ind}<figure class="min-w-0" data-ratio="{ratio}" style="flex: {ratio} 1 calc({ratio} * var(--row))">
{ind}    <a href="{html.escape(p["url"])}" data-photo data-caption="{html.escape(p["caption"])}" data-meta="{html.escape(meta)}" data-note="{html.escape(p["link"])}" class="block overflow-hidden rounded-md bg-gray-100">
{ind}        <img src="{cdn(p["url"], 600)}" srcset="{cdn(p["url"], 400)} 400w, {cdn(p["url"], 800)} 800w, {cdn(p["url"], 1200)} 1200w" sizes="(min-width: 640px) {width}px, 100vw" width="{p["w"]}" height="{p["h"]}" alt="{html.escape(alt)}" loading="lazy" decoding="async" class="w-full h-auto hover:opacity-90 transition-opacity">
{ind}    </a>
{ind}    <figcaption class="mt-2">{caption}
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
{ind}    <div class="pgrid flex flex-wrap items-start gap-x-3 gap-y-5 [--row:160px] sm:[--row:180px]">{figures}
{ind}        <div aria-hidden="true" data-fill style="flex-grow: 1000"></div>
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
