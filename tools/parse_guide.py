"""Text extraction from the Dynamics 365 Licensing Guide (official PDF)."""
import re
import sys
from pypdf import PdfReader

SRC = "tools/ref/d365-licensing-guide.pdf"


def main():
    reader = PdfReader(SRC)
    pages = []
    for i, page in enumerate(reader.pages, start=1):
        pages.append(f"\n\n===== PAGE {i} =====\n" + (page.extract_text() or ""))
    text = "".join(pages)
    with open("tools/ref/guide.txt", "w", encoding="utf-8") as fh:
        fh.write(text)
    print("pages:", len(reader.pages), "chars:", len(text))

    meta = reader.metadata
    print("title:", meta.title if meta else None)

    # Locate the edition date announced on the cover page.
    head = pages[0] + pages[1] if len(pages) > 1 else pages[0]
    for m in re.finditer(r"(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}", head):
        print("edition:", m.group(0))


if __name__ == "__main__":
    sys.exit(main())
