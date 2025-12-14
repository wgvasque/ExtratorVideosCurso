from urllib.parse import urlsplit, urlunsplit

def canonicalize(url: str) -> str:
    if not url:
        return url
    p = urlsplit(url)
    scheme = p.scheme.lower()
    netloc = p.netloc.lower()
    path = p.path
    query = p.query
    frag = ""
    return urlunsplit((scheme, netloc, path, query, frag))

def dedup(urls):
    seen = set()
    out = []
    for u in urls:
        c = canonicalize(u)
        if c not in seen:
            seen.add(c)
            out.append(u)
    return out
