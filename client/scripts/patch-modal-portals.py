from pathlib import Path
import re

ROOT = Path(r"c:\Users\lobar\OneDrive\Desktop\SMM Site\client\src")

FILES = {
    ROOT / "features/customers/components/CustomerFormDialog.tsx": "open",
    ROOT / "features/debts/components/CollectDebtPaymentDialog.tsx": "escape",
    ROOT / "features/inventory/components/StockActionDialog.tsx": "escape",
    ROOT / "features/products/components/ProductFormDialog.tsx": "open",
    ROOT / "features/purchasing/components/PaySupplierDialog.tsx": "escape",
    ROOT / "features/purchasing/components/SupplierFormDialog.tsx": "open",
    ROOT / "components/layout/MobileSidebar.tsx": "mobile",
}


def add_imports(text: str) -> str:
    lines = []
    if "from '@/components/ui/ModalPortal'" not in text:
        lines.append("import { ModalPortal } from '@/components/ui/ModalPortal';")
    if "from '@/lib/body-scroll-lock'" not in text:
        lines.append("import { lockBodyScroll } from '@/lib/body-scroll-lock';")
    if not lines:
        return text
    block = "\n".join(lines) + "\n"
    m = re.search(r"from 'react';\r?\n", text)
    if m:
        return text[: m.end()] + block + text[m.end() :]
    return block + text


def inject_open_lock(text: str) -> str:
    if "lockBodyScroll()" in text:
        return text
    # After any `if (!open) return null;` add lock effect before it once.
    marker = "if (!open) return null;"
    if marker not in text:
        # alternate
        marker = "if (!open) {\n    return null;\n  }"
    if "if (!open)" not in text:
        return text
    effect = """
  useEffect(() => {
    if (!open) return;
    return lockBodyScroll();
  }, [open]);

"""
    # Insert before first if (!open)
    idx = text.find("if (!open)")
    # Walk back to start of statement line
    line_start = text.rfind("\n", 0, idx) + 1
    return text[:line_start] + effect + text[line_start:]


def inject_escape_lock(text: str) -> str:
    if "lockBodyScroll()" in text:
        return text
    old = """  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);"""
    new = """  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const unlock = lockBodyScroll();
    return () => {
      window.removeEventListener('keydown', onKey);
      unlock();
    };
  }, [onClose]);"""
    if old in text:
        return text.replace(old, new)
    # looser match already using Escape
    return text


def inject_mobile_lock(text: str) -> str:
    if "lockBodyScroll()" in text:
        return text
    old = """    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };"""
    new = """    document.addEventListener('keydown', onKeyDown);
    const unlock = lockBodyScroll();

    return () => {
      unlock();
      document.removeEventListener('keydown', onKeyDown);
    };"""
    return text.replace(old, new) if old in text else text


def wrap_return_with_portal(text: str) -> str:
    if "<ModalPortal>" in text:
        return text

    # Find last (or first major) `return (` that contains fixed inset-0
    matches = list(re.finditer(r"\n(\s*)return \(", text))
    for m in reversed(matches):
        indent = m.group(1)
        open_paren = m.end() - 1  # position of '('
        depth = 0
        end = None
        for j in range(open_paren, len(text)):
            if text[j] == "(":
                depth += 1
            elif text[j] == ")":
                depth -= 1
                if depth == 0:
                    end = j
                    break
        if end is None:
            continue
        inner = text[open_paren + 1 : end]
        if "fixed inset-0" not in inner and "fixed inset-0" not in inner:
            if "fixed inset-0" not in inner:
                # MobileSidebar uses fixed inset-0
                if "fixed inset-0" not in inner and 'className="fixed inset-0' not in inner:
                    if "fixed inset-0" not in inner:
                        pass
        if "fixed inset-0" not in inner and "fixed inset-0" not in text[open_paren:end]:
            if "inset-0" not in inner:
                continue
        # wrap
        inner_stripped = inner.strip("\n")
        wrapped_lines = [("  " + line if line else line) for line in inner_stripped.splitlines()]
        wrapped = (
            f"\n{indent}return (\n"
            f"{indent}  <ModalPortal>\n"
            + "\n".join(f"{indent}{line}" for line in wrapped_lines)
            + f"\n{indent}  </ModalPortal>\n"
            f"{indent})"
        )
        return text[: m.start()] + wrapped + text[end + 1 :]

    return text + "\n/* PORTAL_WRAP_FAILED */\n"


def main() -> None:
    for path, kind in FILES.items():
        if not path.exists():
            print("MISSING", path)
            continue
        text = path.read_text(encoding="utf-8")
        text = add_imports(text)
        if kind == "open":
            text = inject_open_lock(text)
        elif kind == "escape":
            text = inject_escape_lock(text)
        elif kind == "mobile":
            text = inject_mobile_lock(text)
        text = wrap_return_with_portal(text)
        path.write_text(text, encoding="utf-8")
        print(
            path.name,
            "portal=",
            "<ModalPortal>" in text,
            "lock=",
            "lockBodyScroll" in text,
            "fail=",
            "PORTAL_WRAP_FAILED" in text,
        )


if __name__ == "__main__":
    main()
