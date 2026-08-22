"""Normalize portal-wrapped dialog files: fix double useEffect, collapse blank lines."""
from pathlib import Path
import re

files = [
    Path(r"c:\Users\lobar\OneDrive\Desktop\SMM Site\client\src\features\debts\components\CollectDebtPaymentDialog.tsx"),
    Path(r"c:\Users\lobar\OneDrive\Desktop\SMM Site\client\src\features\inventory\components\StockActionDialog.tsx"),
    Path(r"c:\Users\lobar\OneDrive\Desktop\SMM Site\client\src\features\products\components\ProductFormDialog.tsx"),
    Path(r"c:\Users\lobar\OneDrive\Desktop\SMM Site\client\src\features\purchasing\components\PaySupplierDialog.tsx"),
    Path(r"c:\Users\lobar\OneDrive\Desktop\SMM Site\client\src\features\purchasing\components\SupplierFormDialog.tsx"),
]

DOUBLE = re.compile(
    r"useEffect\(\(\) => \{\s*\n\s*useEffect\(\(\) => \{\s*\n"
    r"(\s*if \(!open\) return;\s*\n\s*return lockBodyScroll\(\);\s*\n"
    r"\s*\}, \[open\]\);\s*\n)"
    r"(\s*if \(!open\) return;[\s\S]*?\}, \[open[^\]]*\]\);)",
    re.M,
)


def fix_double_effect(text: str) -> str:
    def repl(m: re.Match[str]) -> str:
        lock_block = m.group(1)
        reset_block = m.group(2)
        # reset first, then lock
        return (
            "useEffect(() => {\n"
            + reset_block
            + "\n\n  useEffect(() => {\n"
            + lock_block
        )

    new, n = DOUBLE.subn(repl, text, count=1)
    if n:
        return new
    # simpler broken pattern from dump
    broken = """  useEffect(() => {

  useEffect(() => {
    if (!open) return;
    return lockBodyScroll();
  }, [open]);
"""
    if broken in text:
        # Find following reset body until `}, [open`
        idx = text.find(broken)
        rest = text[idx + len(broken) :]
        # expects reset body that was left inside outer effect
        m2 = re.match(
            r"(\s*if \(!open\) return;[\s\S]*?\}, \[open[^\]]*\]\);)",
            rest,
        )
        if m2:
            reset = m2.group(1)
            after = rest[m2.end() :]
            rebuilt = (
                "  useEffect(() => {\n"
                + reset
                + "\n\n  useEffect(() => {\n    if (!open) return;\n    return lockBodyScroll();\n  }, [open]);\n"
            )
            return text[:idx] + rebuilt + after
    return text


def collapse_blank_runs(text: str) -> str:
    # Collapse 2+ blank lines to 1 outside of strings is hard; just collapse lines that are only whitespace between JSX tags
    text = re.sub(r"\n[ \t]*\n[ \t]*\n+", "\n\n", text)
    # Remove blank line after opening tags like <ModalPortal>\n\n
    text = re.sub(r"(<ModalPortal>)\n\n+", r"\1\n", text)
    text = re.sub(r"\n\n+(</ModalPortal>)", r"\n\1", text)
    return text


for path in files:
    text = path.read_text(encoding="utf-8")
    before = text
    text = fix_double_effect(text)
    text = collapse_blank_runs(text)
    path.write_text(text, encoding="utf-8")
    print(path.name, "changed=" + str(text != before), "double_left=" + str("useEffect(() => {\n\n  useEffect" in text or "useEffect(() => {\r\n\r\n  useEffect" in text))
