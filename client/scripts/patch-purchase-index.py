from pathlib import Path

purchase = Path(r"c:\Users\lobar\OneDrive\Desktop\SMM Site\client\src\features\purchasing\pages\PurchaseDetailPage.tsx")
text = purchase.read_text(encoding="utf-8")
if "ModalPortal" not in text:
    text = text.replace(
        "import { SectionCard } from '@/components/ui/SectionCard';\n",
        "import { ModalPortal } from '@/components/ui/ModalPortal';\nimport { SectionCard } from '@/components/ui/SectionCard';\n",
    )
if "{cancelOpen && purchase ? (\n        <ModalPortal>" not in text:
    text = text.replace(
        "{cancelOpen && purchase ? (\n        <div\n          className=\"fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center\"",
        "{cancelOpen && purchase ? (\n        <ModalPortal>\n        <div\n          className=\"fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center\"",
        1,
    )
    # Insert closing portal before the cancel ternary's null branch close.
    # Look for purchase-cancel-submit then the following </div>\n      ) : null}
    marker = 'data-testid="purchase-cancel-submit"'
    idx = text.find(marker)
    if idx == -1:
        raise SystemExit("cancel submit marker missing")
    end = text.find("      ) : null}", idx)
    close = text.rfind("</div>", idx, end)
    if "</ModalPortal>" not in text[idx:end]:
        text = text[: close + 6] + "\n        </ModalPortal>" + text[close + 6 :]
purchase.write_text(text, encoding="utf-8")
print("purchase ok", "<ModalPortal>" in text)

index = Path(r"c:\Users\lobar\OneDrive\Desktop\SMM Site\client\index.html")
html = index.read_text(encoding="utf-8")
if 'translate="no"' not in html:
    html = html.replace('<html lang="en">', '<html lang="en" translate="no" class="notranslate">')
    index.write_text(html, encoding="utf-8")
    print("index updated")
else:
    print("index already")
