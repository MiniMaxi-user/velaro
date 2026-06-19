#!/usr/bin/env python3
"""Exporteert borditems naar markdown-bestanden in de repo, als archief.

Bedoeld om te draaien vóórdat je een kolom op het GitHub Project Board
archiveert, zodat de story-informatie in de repo bewaard blijft.

Gebruik:
    python scripts/export-stories.py            # exporteert de Done-kolom
    python scripts/export-stories.py "In review" # andere statuskolom

Schrijft per story een .md-bestand (frontmatter + body) naar
docs/stories/<status-slug>/ plus een INDEX.md. Alleen de body wordt
opgenomen; comments worden bewust niet opgehaald (één board-call totaal).

Vereist: gh CLI met project-scope. Geen externe Python-dependencies.
"""

import json
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
PROJECT_NUMBER = "2"
PROJECT_OWNER = "MiniMaxi-user"


def slugify(text, maxlen=60):
    text = (text or "").lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return (text[:maxlen].rstrip("-")) or "zonder-titel"


def fetch_items():
    # -L 300: het bord heeft >100 items; met -L 100 vallen items voorbij
    # positie 100 buiten beeld (geleerd tijdens refinen).
    proc = subprocess.run(
        ["gh", "project", "item-list", PROJECT_NUMBER,
         "--owner", PROJECT_OWNER, "--format", "json", "-L", "300"],
        capture_output=True, text=True, timeout=90,
    )
    if proc.returncode != 0:
        sys.exit(f"gh-fout: {(proc.stderr or '').strip()}")
    return json.loads(proc.stdout).get("items", [])


def main():
    status = sys.argv[1] if len(sys.argv) > 1 else "Done"
    items = fetch_items()
    selected = [i for i in items if i.get("status") == status]

    out_dir = REPO_ROOT / "docs" / "stories" / slugify(status)
    out_dir.mkdir(parents=True, exist_ok=True)
    today = date.today().isoformat()

    index_lines = [
        f"# Gearchiveerde stories — kolom \"{status}\"",
        "",
        f"Snapshot van {today}. {len(selected)} item(s). Bron: GitHub Project "
        f"{PROJECT_OWNER}/{PROJECT_NUMBER}.",
        "",
    ]

    written = 0
    for i in sorted(selected, key=lambda x: x.get("content", {}).get("number") or 0):
        content = i.get("content") or {}
        number = content.get("number")
        title = content.get("title") or i.get("title") or "(zonder titel)"
        body = content.get("body") or "_(geen beschrijving)_"
        labels = i.get("labels") or []
        url = content.get("url", "")

        if number is None:
            # Draft-item zonder issue: bewaar met een veilige bestandsnaam.
            fname = f"draft-{slugify(title)}.md"
            ref = title
        else:
            fname = f"{number:03d}-{slugify(title)}.md"
            ref = f"#{number}"

        labels_yaml = "[" + ", ".join(json.dumps(l) for l in labels) + "]"
        front = (
            "---\n"
            f"issue: {number if number is not None else 'null'}\n"
            f"title: {json.dumps(title, ensure_ascii=False)}\n"
            f"status: {json.dumps(status)}\n"
            f"labels: {labels_yaml}\n"
            f"url: {json.dumps(url)}\n"
            f"archivedAt: {today}\n"
            "---\n\n"
            f"# {ref} — {title}\n\n"
        )
        (out_dir / fname).write_text(front + body.rstrip() + "\n", encoding="utf-8")
        index_lines.append(f"- [{ref} — {title}]({fname})")
        written += 1

    (out_dir / "INDEX.md").write_text("\n".join(index_lines) + "\n", encoding="utf-8")
    print(f"{written} story(s) uit kolom \"{status}\" geëxporteerd naar {out_dir}")


if __name__ == "__main__":
    main()
