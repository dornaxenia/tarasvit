# -*- coding: utf-8 -*-
# Builds ../index.html from data.py + page.html + style.css + app.js.
# Run: python3 src/build.py
import html, re, sys
import os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from data import CONTACT, TARA, CAPS, DOSATORS, TRIGGERS, OTHER, KITS

E = html.escape

ICONS = {
    "factory": '<path d="M3 20.5V10l5.5 3.2V10l5.5 3.2V6.5l7 3.5v10.5z"/><path d="M7 17h2M12 17h2M17 17h1"/>',
    "layers": '<path d="M12 3.5l8.5 4.5-8.5 4.5L3.5 8z"/><path d="M3.5 12.5l8.5 4.5 8.5-4.5"/><path d="M3.5 16.5l8.5 4.5 8.5-4.5"/>',
    "kit": '<rect x="3.5" y="9" width="7" height="11.5" rx="2"/><path d="M5.5 9V6.5h3V9"/><rect x="13.5" y="12.5" width="7" height="8" rx="2"/><path d="M15.5 12.5v-2h3v2"/>',
    "label": '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M7 10h10M7 14h6"/>',
    "lock": '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/><path d="M12 14.5v2.5"/>',
    "pin": '<path d="M12 21s-6.5-5.8-6.5-11a6.5 6.5 0 0 1 13 0c0 5.2-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
    "phone": '<path d="M5 4.5h3.2l1.6 4-2 1.3a10.5 10.5 0 0 0 6.4 6.4l1.3-2 4 1.6V19a1.5 1.5 0 0 1-1.6 1.5C10.3 20 4 13.7 3.5 6.1A1.5 1.5 0 0 1 5 4.5z"/>',
    "mail": '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
    "copy": '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
    "check": '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    "arrow": '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "menu": '<path d="M4 7.5h16M4 12h16M4 16.5h16"/>',
    "close": '<path d="M6 6l12 12M18 6L6 18"/>',
    "info": '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.4"/>',
    "alert": '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V13M12 16v.4"/>',
    "car": '<path d="M4.5 15.5l1.6-5a2 2 0 0 1 1.9-1.4h8a2 2 0 0 1 1.9 1.4l1.6 5"/><rect x="3.5" y="15.5" width="17" height="3.5" rx="1.2"/><path d="M6.5 19v1.5M17.5 19v1.5"/>',
    "home": '<path d="M4 11.2L12 4.5l8 6.7"/><path d="M6 9.8v10h12v-10"/><path d="M10 19.8v-5h4v5"/>',
    "brief": '<rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M9 7.5V5.5h6v2M3.5 12.5h17"/>',
    "line": '<path d="M3 18h18"/><rect x="5" y="9" width="4" height="9" rx="1"/><rect x="11" y="7" width="4" height="11" rx="1"/><path d="M17 18v-5h3.5"/><path d="M6 5.5h2M12 3.5h2"/>',
    "truck": '<path d="M3.5 6.5h10v9h-10z"/><path d="M13.5 9.5h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.7"/><circle cx="17" cy="17.5" r="1.7"/>',
    "spark": '<path d="M12 3.5l1.8 5 5 1.8-5 1.8-1.8 5-1.8-5-5-1.8 5-1.8z"/><path d="M18.5 15.5l.7 1.9 1.8.6-1.8.7-.7 1.8-.6-1.8-1.9-.7 1.9-.6z"/>',
    "photo": '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><circle cx="9" cy="10.5" r="1.8"/><path d="M4 17l5-4.5 3.5 3 3-2.5 4.5 4"/>',
    "plus": '<path d="M12 5v14M5 12h14"/>',
}
def icon(name, cls="ic"):
    return f'<svg class="{cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">{ICONS[name]}</svg>'

def uk_plural(n, one, few, many):
    if n % 10 == 1 and n % 100 != 11: return one
    if 2 <= n % 10 <= 4 and not 12 <= n % 100 <= 14: return few
    return many

def lead_attrs(interest, item=""):
    a = f' data-lead="{E(interest)}"'
    if item:
        a += f' data-item="{E(item)}"'
    return a

# ---------- Fragments ----------
def product_card(p):
    key = "".join(f'<div><dt>{E(k)}</dt><dd>{E(v)}</dd></div>' for k, v in p["key"])
    more = "".join(f'<tr><th scope="row">{E(k)}</th><td>{E(v)}</td></tr>' for k, v in p["more"])
    feats = "".join(f'<li>{icon("check")}<span>{E(f)}</span></li>' for f in p["feats"])
    sw = "".join(f'<li><span class="sw" style="--sw:{c}"></span>{E(n)}</li>' for n, c in p["colors"])
    item = f'{p["title"]} {p["subtitle"]} ({p["sku"]})'
    return f'''
<article class="product filterable" data-neck="{p["neck"]}" id="p-{p["id"]}">
  <div class="product-media">
    <img src="{p["img"]}" alt="{E(p["title"])} {E(p["subtitle"])}, артикул {E(p["sku"])}" width="1600" height="2000" loading="lazy" decoding="async">
    <span class="badge-photo">Ø {p["neck"]} мм</span>
    <span class="dim dim-h" aria-hidden="true"><b>{E(p["dim_h"])}</b></span>
    <span class="dim dim-w" aria-hidden="true"><b>{E(p["dim_w"])}</b></span>
  </div>
  <div class="product-body">
    <p class="sku">{E(p["sku"])}</p>
    <h4 class="product-title">{E(p["title"])} <span>{E(p["subtitle"])}</span></h4>
    <p class="product-text">{E(p["text"])}</p>
    <dl class="keyspecs">{key}</dl>
    <div class="colors">
      <p class="mini-label">{E(p["colors_label"])}</p>
      <ul class="swatches">{sw}</ul>
      {f'<p class="colors-note">{E(p["colors_note"])}</p>' if p["colors_note"] else ""}
    </div>
    <details class="more">
      <summary>Усі характеристики <span class="chev" aria-hidden="true"></span></summary>
      <table class="spec-table"><tbody>{more}</tbody></table>
      <ul class="feats">{feats}</ul>
    </details>
    <div class="product-actions">
      <a class="btn btn-primary btn-block" href="#kontakty"{lead_attrs("tara", item)}>{E(p["cta"])}</a>
      <a class="btn btn-text" href="#kontakty"{lead_attrs("samples", item)}>Запросити зразок {icon("arrow","ic ic-sm")}</a>
    </div>
  </div>
</article>'''

def model_tile(img, sku, lines, neck, extra="", alt=None):
    media = (f'<img src="{img}" alt="{E(alt or sku)}" width="800" height="600" loading="lazy" decoding="async">'
             if img else f'<span class="nophoto">{icon("photo")}<span>Фото на запит</span></span>')
    li = "".join(f'<li>{E(l)}</li>' for l in lines)
    return f'''<li class="model filterable" data-neck="{neck}">
  <div class="model-media">{media}</div>
  <p class="model-sku">{E(sku)}</p>
  <ul class="model-lines">{li}</ul>{extra}
</li>'''

def dosator_tiles():
    out = []
    for d in DOSATORS:
        lines = [f'{d["dose"]} · {d["neckt"]}', d["tube"].capitalize(), f'Кришка {d["surf"]}']
        if d["sku"].startswith("LP40-FS"): lines.append("Дозатор синій або чорний")
        out.append(model_tile(d["img"], d["sku"], lines, d["neck"], alt=f'Дозатор {d["sku"]}'))
    return "".join(out)

def trigger_tiles():
    out = []
    for t in TRIGGERS:
        noz = "".join(f'<li>{E(n)}</li>' for n in t["nozzles"])
        trg = "".join(f'<li>{E(n)}</li>' for n in t["triggers"])
        n_noz = 7 if t["nozzles"][0].startswith("7 ") else len(t["nozzles"])
        extra = f'''
  <details class="opts"><summary>Насадки: {n_noz} · курок: {len(t["triggers"]) if "2 варіанти" not in t["triggers"][0] else 2}</summary>
    <p class="opts-h">Насадки</p><ul>{noz}</ul>
    <p class="opts-h">Форма курка</p><ul>{trg}</ul>
  </details>'''
        out.append(model_tile(t["img"], t["sku"], [], "28", extra, alt=f'Тригер-розпилювач {t["sku"]}'))
    return "".join(out)

def simple_tiles(items):
    return "".join(model_tile(i["img"], i["sku"], i["lines"], i["neck"], alt=i["sku"]) for i in items)

def kit_card(k):
    parts = []
    for n, (img, cap) in enumerate(k["parts"]):
        if n:
            parts.append(f'<li class="kit-plus" aria-hidden="true">{icon("plus")}</li>')
        parts.append(f'<li class="kit-part"><span class="kit-plate"><img src="{img}" alt="" loading="lazy" decoding="async"></span><span class="kit-cap">{E(cap)}</span></li>')
    return f'''
<article class="kit filterable" data-neck="{k["neck"]}" id="{k["id"]}">
  <ul class="kit-parts">{"".join(parts)}</ul>
  <h4 class="kit-title">{E(k["title"])}</h4>
  <p class="kit-text">{E(k["text"])}</p>
  <a class="btn btn-outline" href="#kontakty"{lead_attrs("komplekty", "Комплект: " + k["title"])}>Підібрати комплект {icon("arrow","ic ic-sm")}</a>
</article>'''

products_html = "".join(product_card(p) for p in TARA)
kits_html = "".join(kit_card(k) for k in KITS)

css = open(os.path.join(HERE, 'style.css'), encoding='utf-8').read()
js = open(os.path.join(HERE, 'app.js'), encoding='utf-8').read()
tpl = open(os.path.join(HERE, 'page.html'), encoding='utf-8').read()

repl = {
    "{{CSS}}": css, "{{JS}}": js,
    "{{PRODUCTS}}": products_html,
    "{{DOSATORS}}": dosator_tiles(),
    "{{TRIGGERS}}": trigger_tiles(),
    "{{CAPS}}": simple_tiles(CAPS),
    "{{OTHER}}": simple_tiles(OTHER),
    "{{KITS}}": kits_html,
    "{{N_DOS}}": str(len(DOSATORS)), "{{N_TRG}}": str(len(TRIGGERS)),
    "{{N_CL}}": str(len(DOSATORS) + len(TRIGGERS) + len(CAPS)),
    "{{N_KITS}}": str(len(KITS)),
    "{{W_CL}}": uk_plural(len(DOSATORS) + len(TRIGGERS) + len(CAPS), "артикул", "артикули", "артикулів"),
    "{{W_DOS}}": uk_plural(len(DOSATORS), "модель", "моделі", "моделей"),
    "{{W_TRG}}": uk_plural(len(TRIGGERS), "модель", "моделі", "моделей"),
    "{{PHONE}}": CONTACT["phone"], "{{PHONE_HREF}}": CONTACT["phone_href"],
    "{{EMAIL}}": CONTACT["email"], "{{PERSON}}": CONTACT["person"], "{{ROLE}}": CONTACT["role"],
    "{{CITY}}": CONTACT["city"], "{{TOPICS}}": CONTACT["topics"],
    "{{LEAD_ENDPOINT}}": E(CONTACT.get("lead_endpoint", "").strip()),
    "{{SUBMIT_LABEL}}": "Надіслати заявку" if CONTACT.get("lead_endpoint", "").strip() else "Сформувати заявку",
}
out = tpl
for k, v in repl.items():
    out = out.replace(k, v)
# icons in template: {{i:name}} / {{i:name:cls}}
out = re.sub(r'\{\{i:([a-z]+)(?::([a-z\- ]+))?\}\}', lambda m: icon(m.group(1), "ic " + m.group(2) if m.group(2) else "ic"), out)
out = re.sub(r'(\d) (мм|мл|л|г)(?=[\s<.,;)/·]|$)', '\\1\u00a0\\2', out)
left = re.findall(r'\{\{[^}]+\}\}', out)
assert not left, left
# Wrap the page fragment into a full document: head items before the header, the rest into <body>.
cut = out.index('<header class="site-header"')
head, body = out[:cut].strip(), out[cut:].strip()
doc = ('<!doctype html>\n<html lang="uk">\n<head>\n<meta charset="utf-8">\n'
       '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
       + head + '\n</head>\n<body>\n' + body + '\n</body>\n</html>\n')
open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8').write(doc)
print("built index.html", len(doc)//1024, "KB")
