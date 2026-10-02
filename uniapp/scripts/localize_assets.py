#!/usr/bin/env python3
import hashlib
import json
import mimetypes
import re
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "static" / "local_assets"
MANIFEST = ROOT / "scripts" / "local_assets_manifest.json"
HOSTS = ("beijingcct.oss-cn-beijing.aliyuncs.com", "oss.cqtxj.org.cn")
PATTERN = re.compile(r"https://(?:" + "|".join(re.escape(host) for host in HOSTS) + r")/[^\"'\s)]+")
EXTENSIONS = {".vue", ".js", ".json", ".html", ".css", ".scss"}
EXCLUDED = {"node_modules", "unpackage", "20260711修改文件", ".git"}


def source_files():
    for path in ROOT.rglob("*"):
        if path.is_file() and path.suffix.lower() in EXTENSIONS and not EXCLUDED.intersection(path.parts):
            yield path


def extension(url, content_type):
    suffix = Path(urllib.parse.urlparse(url).path).suffix.lower()
    if re.fullmatch(r"\.[a-z0-9]{1,8}", suffix):
        return suffix
    return mimetypes.guess_extension(content_type.split(";", 1)[0]) or ".bin"


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    files = list(source_files())
    urls = sorted({url for path in files for url in PATTERN.findall(path.read_text(encoding="utf-8", errors="ignore"))})
    manifest = {}
    failures = {}
    for url in urls:
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "cqtxj-localizer/1.0"})
            with urllib.request.urlopen(request, timeout=30) as response:
                data = response.read()
                if not data:
                    raise ValueError("empty response")
                suffix = extension(url, response.headers.get("Content-Type", ""))
            name = hashlib.sha256(url.encode()).hexdigest()[:24] + suffix
            (OUTPUT / name).write_bytes(data)
            manifest[url] = f"/static/local_assets/{name}"
        except Exception as exc:
            failures[url] = str(exc)
    for path in files:
        content = path.read_text(encoding="utf-8", errors="ignore")
        replaced = content
        for url, local in manifest.items():
            replaced = replaced.replace(url, local)
        if replaced != content:
            path.write_text(replaced, encoding="utf-8")
    MANIFEST.write_text(json.dumps({"assets": manifest, "failures": failures}, ensure_ascii=False, indent=2), encoding="utf-8")
    print({"localized": len(manifest), "failed": len(failures), "manifest": str(MANIFEST)})
    raise SystemExit(1 if failures else 0)


if __name__ == "__main__":
    main()
