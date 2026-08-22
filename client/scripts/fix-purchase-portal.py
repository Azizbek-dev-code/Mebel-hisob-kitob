from pathlib import Path

p = Path(r"c:\Users\lobar\OneDrive\Desktop\SMM Site\client\src\features\purchasing\pages\PurchaseDetailPage.tsx")
t = p.read_text(encoding="utf-8")
print("import", "ModalPortal" in t)
print("open", t.count("<ModalPortal>"))
print("close", t.count("</ModalPortal>"))
i = t.find("purchase-cancel-submit")
print(t[i : i + 450])

# Ensure closing tag exists before cancel ternary end
if "<ModalPortal>" in t and "</ModalPortal>" not in t[t.find("cancelOpen") :]:
    old = "          </form>\n        </div>\n      ) : null}"
    new = "          </form>\n        </div>\n        </ModalPortal>\n      ) : null}"
    if old in t:
        t = t.replace(old, new, 1)
        p.write_text(t, encoding="utf-8")
        print("added closing portal")
    else:
        print("pattern missing for close")
else:
    print("portal close ok or no open")
