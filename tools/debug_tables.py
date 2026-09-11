"""Diagnostic : ce que pdfplumber voit sur les pages de roles Finance."""
import sys
import pdfplumber

SRC = "tools/ref/d365-licensing-guide.pdf"

sys.stdout.reconfigure(encoding="utf-8")
with pdfplumber.open(SRC) as pdf:
    for page_number in (34, 35):
        page = pdf.pages[page_number - 1]
        tables = page.extract_tables()
        print(f"\n===== p{page_number} : {len(tables)} table(s)")
        for index, table in enumerate(tables):
            print(f"  table {index}: {len(table)} lignes x {len(table[0]) if table else 0} colonnes")
            for row in table[:6]:
                print("   ", [(c or "").replace("\n", "\\n")[:38] for c in row])
