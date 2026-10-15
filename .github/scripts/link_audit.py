"""Weekly link audit for the live recaptured.io site. Standard library only.

Fetches the 16 public pages, collects every href and src, and checks them:
internal URLs must return 200, external URLs 2xx or 3xx, and fragment links
must point at an id that exists on the target page. The two Google Fonts
preconnect hosts are skipped (they are connection hints, not resources), and
LinkedIn's HTTP 999 bot response counts as a pass.

Writes a Markdown report to the path in REPORT_PATH (default link-report.md)
and exits 1 if anything failed.
"""
import os
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from urllib.parse import urldefrag, urljoin, urlparse

BASE = "https://recaptured.io"
PAGES = ["/", "/assistant/", "/pricing/", "/pilot/", "/book/", "/trust/", "/about/",
         "/contact/", "/legal/", "/legal/terms/", "/legal/privacy/",
         "/legal/acceptable-use/", "/legal/sms-terms/", "/legal/founding-100/",
         "/legal/pilot-terms/", "/legal/dmca/"]
SKIP = {"https://fonts.googleapis.com", "https://fonts.gstatic.com"}
INTERNAL_HOSTS = {"recaptured.io", "www.recaptured.io"}
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")


class Collector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get("id"):
            self.ids.add(a["id"])
        if tag == "a" and a.get("name"):
            self.ids.add(a["name"])
        for attr in ("href", "src"):
            if a.get(attr):
                self.refs.append(a[attr].strip())


def fetch(url, method="GET"):
    req = urllib.request.Request(url, method=method, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, (r.read() if method == "GET" else b"")
    except urllib.error.HTTPError as e:
        return e.code, b""
    except Exception as e:  # network errors are reported as failures
        return f"error: {type(e).__name__}", b""


def check(url):
    """HEAD first, then GET if HEAD is refused or errors; one retry on errors."""
    for _ in range(2):
        status, _ = fetch(url, "HEAD")
        if isinstance(status, str) or status in (403, 405, 501, 999):
            status, _ = fetch(url, "GET")
        if not isinstance(status, str):
            return status
    return status


def main():
    page_ids, links, failures = {}, {}, []
    for path in PAGES:
        status, body = fetch(BASE + path)
        if status != 200:
            failures.append((BASE + path, "page", status, path))
            continue
        c = Collector()
        c.feed(body.decode("utf-8", "replace"))
        page_ids[path] = c.ids
        for ref in c.refs:
            if ref.startswith(("mailto:", "tel:", "javascript:", "data:")):
                continue
            if ref.startswith("#"):
                key = (path + ref, "fragment")
            else:
                url = urljoin(BASE + path, ref)
                kind = "internal" if urlparse(url).hostname in INTERNAL_HOSTS else "external"
                key = (url, kind)
            links.setdefault(key, set()).add(path)

    targets = sorted({urldefrag(u)[0] for (u, kind) in links
                      if kind != "fragment" and urldefrag(u)[0].rstrip("/") not in SKIP})
    with ThreadPoolExecutor(8) as pool:
        results = dict(zip(targets, pool.map(check, targets)))

    for (url, kind), pages in sorted(links.items()):
        where = ", ".join(sorted(pages))
        if kind == "fragment":
            page, frag = url.split("#", 1)
            if frag and frag not in page_ids.get(page, set()):
                failures.append(("#" + frag, kind, "id not found", where))
            continue
        base, frag = urldefrag(url)
        if base.rstrip("/") in SKIP:
            continue
        status = results[base]
        ok = status == 200 if kind == "internal" else isinstance(status, int) and 200 <= status < 400
        # LinkedIn answers automated requests (including from GitHub's runners) with
        # its non-standard HTTP 999 even when the page exists, so 999 counts as a pass there.
        host = urlparse(base).hostname or ""
        if status == 999 and (host == "linkedin.com" or host.endswith(".linkedin.com")):
            ok = True
        if not ok:
            failures.append((url, kind, status, where))
        elif kind == "internal" and frag:
            target = urlparse(base).path or "/"
            if target in page_ids and frag not in page_ids[target]:
                failures.append((url, "fragment", f"id not found on {target}", where))

    checked = len(targets) + sum(1 for (_, k) in links if k == "fragment")
    lines = [f"Checked {len(PAGES)} pages and {checked} unique links on {BASE}.", ""]
    if failures:
        lines += ["| URL | Type | Result | Linked from |", "|---|---|---|---|"]
        lines += [f"| {u} | {k} | {s} | {w} |" for (u, k, s, w) in failures]
    else:
        lines.append("No failures.")
    report = "\n".join(lines) + "\n"
    with open(os.environ.get("REPORT_PATH", "link-report.md"), "w", encoding="utf-8") as f:
        f.write(report)
    print(report)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
