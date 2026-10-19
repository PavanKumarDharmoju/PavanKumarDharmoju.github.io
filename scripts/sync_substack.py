#!/usr/bin/env python3
"""Write the latest Substack posts into blogs.html and photography.html.

The pages used to fetch the feed in the browser through third-party proxies,
which failed for visitors and was invisible to Google. This renders the posts
into the HTML instead, between these markers:

    <!-- substack:start --> ... <!-- substack:end -->

Photo posts are the ones whose title starts with "📷" or "[photo]"; they go
to Photography with the marker removed. Everything else goes to Blogs.

    python3 scripts/sync_substack.py

Runs daily in .github/workflows/sync-substack.yml. Standard library only.
"""
import email.utils
import html
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLICATION = "https://pixelsbypavan.substack.com"
FEED = PUBLICATION + "/feed"
LIMIT = 30
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
    write("photography.html", render(photos, "gallery", "No photo posts yet.", indent_of("photography.html")))


if __name__ == "__main__":
    main()
