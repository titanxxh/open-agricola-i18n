#!/usr/bin/env python3
"""Download every Agricola locale declared by BGA's published AMD bundle."""

import concurrent.futures
import datetime
import hashlib
import json
from pathlib import Path
import re
import time
import urllib.request


DESTINATION = Path(__file__).resolve().parent
PLATFORM_RELEASE = "261021-0945"
GAME_RELEASE = "261024-1403"
QUERY_VERSION = "20261025"
BASE_URL = (
    f"https://x.boardgamearena.net/data/themereleases/{PLATFORM_RELEASE}"
    "/js/modules/nls"
)
TABLE_URL = "https://boardgamearena.com/tableview?table=932517202"


def write_json(path, value):
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
    temporary.replace(path)


def fetch(url):
    for attempt in range(3):
        try:
            request = urllib.request.Request(
                url, headers={"User-Agent": "Agricola-i18n-local-export/1.0"}
            )
            with urllib.request.urlopen(request, timeout=45) as response:
                data = response.read()
                return data, {
                    "http_status": response.status,
                    "last_modified": response.headers.get("Last-Modified"),
                    "etag": response.headers.get("ETag"),
                }
        except (OSError, TimeoutError):
            if attempt == 2:
                raise
            time.sleep(attempt + 1)


def parse_dictionary(source):
    match = re.fullmatch(r"\s*define\((.*)\);?\s*", source, re.S)
    if not match:
        raise ValueError("Expected an AMD define(JSON) locale bundle")
    body = match.group(1)
    pieces = []
    index = 0
    while index < len(body):
        if body[index] == "\\" and index + 1 < len(body):
            pair = body[index:index + 2]
            pieces.append(" " if pair == "\\ " else pair)
            index += 2
        else:
            pieces.append(body[index])
            index += 1
    result = json.loads("".join(pieces))
    if not isinstance(result, dict) or not all(
        isinstance(key, str) and isinstance(value, str)
        for key, value in result.items()
    ):
        raise ValueError("Locale bundle must be a dictionary of strings")
    return result


def main():
    for directory in ["raw", "json"]:
        (DESTINATION / directory).mkdir(parents=True, exist_ok=True)
    root_url = f"{BASE_URL}/lang_agricola.js?{QUERY_VERSION}"
    root_data, root_headers = fetch(root_url)
    source = root_data.decode("utf-8-sig")
    prefix = re.match(r"\s*define\(\{\s*root\s*:\s*", source)
    if not prefix:
        raise ValueError("Expected a root bundle with locale declarations")
    root, offset = json.JSONDecoder().raw_decode(source, prefix.end())
    if not isinstance(root, dict) or not all(isinstance(v, str) for v in root.values()):
        raise ValueError("Invalid root dictionary")
    declaration = source[offset:]
    if not re.fullmatch(r'\s*(?:,\s*(?:"[a-z][a-z-]*"|[a-z][a-z-]*)\s*:\s*true\s*)+\}\);?\s*', declaration):
        raise ValueError("Unexpected locale declaration format")
    locales = sorted(
        a or b
        for a, b in re.findall(
            r'(?:"([a-z][a-z-]*)"|\b([a-z][a-z-]*))\s*:\s*true', declaration
        )
    )
    if not locales or len(locales) != len(set(locales)):
        raise ValueError("Missing or duplicate locales in root bundle")
    (DESTINATION / "raw/lang_agricola.js").write_bytes(root_data)
    write_json(DESTINATION / "json/agricola.root.json", root)

    def download_locale(locale):
        url = f"{BASE_URL}/{locale}/lang_agricola.js?{QUERY_VERSION}"
        data, headers = fetch(url)
        raw_path = f"raw/lang_agricola.{locale}.js"
        json_path = f"json/agricola.{locale}.json"
        (DESTINATION / raw_path).write_bytes(data)
        dictionary = parse_dictionary(data.decode("utf-8-sig"))
        write_json(DESTINATION / json_path, dictionary)
        return {
            "locale": locale,
            "url": url,
            "raw_file": raw_path,
            "json_file": json_path,
            "bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest(),
            "entry_count": len(dictionary),
            "missing_root_keys": sorted(root.keys() - dictionary.keys()),
            "extra_keys": sorted(dictionary.keys() - root.keys()),
            "values_different_from_english": sum(
                key in root and value != root[key]
                for key, value in dictionary.items()
            ),
            **headers,
        }

    records, failures = [], []
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        jobs = {pool.submit(download_locale, locale): locale for locale in locales}
        for future in concurrent.futures.as_completed(jobs):
            locale = jobs[future]
            try:
                record = future.result()
                records.append(record)
                print(f"OK {locale}: {record['entry_count']} strings", flush=True)
            except Exception as error:
                failures.append({"locale": locale, "error": str(error)})
                print(f"FAIL {locale}: {error}", flush=True)

    records.sort(key=lambda record: record["locale"])
    manifest = {
        "downloaded_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "source_table": TABLE_URL,
        "platform_release": PLATFORM_RELEASE,
        "observed_game_release": GAME_RELEASE,
        "root": {
            "url": root_url,
            "raw_file": "raw/lang_agricola.js",
            "json_file": "json/agricola.root.json",
            "sha256": hashlib.sha256(root_data).hexdigest(),
            "bytes": len(root_data),
            "entry_count": len(root),
            **root_headers,
        },
        "declared_locales": locales,
        "downloaded_locale_count": len(records),
        "locales": records,
        "failures": failures,
    }
    write_json(DESTINATION / "manifest.json", manifest)
    print(
        f"Downloaded {len(records)}/{len(locales)} locales plus root; "
        f"failures: {len(failures)}"
    )
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
