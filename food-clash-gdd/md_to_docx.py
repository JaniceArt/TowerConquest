# -*- coding: utf-8 -*-
"""Chuyển GDD Food.md -> GDD Food.docx (tiêu đề, bảng, danh sách, code, mermaid -> danh sách luồng).
Chạy:  python md_to_docx.py  [input.md] [output.docx]
"""
import re
import sys
from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls, qn

SRC = sys.argv[1] if len(sys.argv) > 1 else 'GDD Food.md'
DST = sys.argv[2] if len(sys.argv) > 2 else 'GDD Food.docx'

ACCENT = RGBColor(0x2E, 0x8B, 0x3E)   # xanh tươi (phe đồ ăn)
ACCENT2 = RGBColor(0x6A, 0x3D, 0x9A)  # tím mốc
TEXT = RGBColor(0x26, 0x26, 0x26)

doc = Document()
for s in doc.sections:
    s.top_margin = s.bottom_margin = Inches(0.8)
    s.left_margin = s.right_margin = Inches(0.8)

base = doc.styles['Normal']
base.font.name = 'Calibri'
base.font.size = Pt(10.5)
base.element.rPr.rFonts.set(qn('w:eastAsia'), 'Calibri')
for name, size, color in [('Heading 1', 17, ACCENT), ('Heading 2', 14, ACCENT2), ('Heading 3', 12, ACCENT), ('Heading 4', 11, TEXT)]:
    st = doc.styles[name]
    st.font.size = Pt(size)
    st.font.color.rgb = color
    st.font.bold = True
    st.font.name = 'Calibri'

INLINE = re.compile(r'(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)')


def add_inline(p, text, size=None, color=None, bold=False, italic=False):
    for part in INLINE.split(text):
        if not part:
            continue
        b, i, code = bold, italic, False
        if part.startswith('**') and part.endswith('**'):
            part, b = part[2:-2], True
        elif part.startswith('`') and part.endswith('`'):
            part, code = part[1:-1], True
        elif part.startswith('*') and part.endswith('*') and len(part) > 2:
            part, i = part[1:-1], True
        r = p.add_run(part)
        r.bold, r.italic = b, i
        if code:
            r.font.name = 'Consolas'
            r.font.color.rgb = ACCENT2
        if size:
            r.font.size = Pt(size)
        if color is not None and not code:
            r.font.color.rgb = color
    return p


def shade(cell, hex_fill):
    cell._tc.get_or_add_tcPr().append(parse_xml(f'<w:shd {nsdecls("w")} w:val="clear" w:fill="{hex_fill}"/>'))


def add_table(rows):
    rows = [[c.strip() for c in r.strip().strip('|').split('|')] for r in rows]
    rows = [r for r in rows if not all(re.fullmatch(r':?-{2,}:?', c) for c in r)]
    ncol = max(len(r) for r in rows)
    fsize = 10 if ncol <= 4 else 9 if ncol <= 6 else 7.5
    t = doc.add_table(rows=len(rows), cols=ncol)
    t.style = 'Table Grid'
    for ri, r in enumerate(rows):
        for ci in range(ncol):
            cell = t.cell(ri, ci)
            cell.text = ''
            p = cell.paragraphs[0]
            add_inline(p, r[ci] if ci < len(r) else '', size=fsize,
                       color=RGBColor(255, 255, 255) if ri == 0 else TEXT, bold=(ri == 0))
            if ri == 0:
                shade(cell, '2E8B3E')
            elif ri % 2 == 0:
                shade(cell, 'F1F7EE')
    doc.add_paragraph()


def add_code(lines):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(0.2)
    pPr = p._p.get_or_add_pPr()
    pPr.append(parse_xml(f'<w:shd {nsdecls("w")} w:val="clear" w:fill="F4F1EA"/>'))
    for k, ln in enumerate(lines):
        r = p.add_run(ln)
        r.font.name = 'Consolas'
        r.font.size = Pt(7.5)
        if k < len(lines) - 1:
            r.add_break()


NODE = re.compile(r'(\w+)\s*(\[[^\]]*\]|\{[^}]*\}|\([^)]*\))')


def add_mermaid(lines):
    labels = {}
    for ln in lines:
        for nid, lab in NODE.findall(ln):
            labels[nid] = lab[1:-1]
    p = doc.add_paragraph()
    add_inline(p, 'Sơ đồ luồng:', bold=True, color=ACCENT2)
    for ln in lines:
        if '-->' not in ln:
            continue
        left, right = ln.split('-->', 1)
        edge = ''
        if '--' in left:
            left, edge = left.split('--', 1)
            edge = edge.strip()
        a = re.match(r'\s*(\w+)', left).group(1)
        b = re.match(r'\s*(\w+)', right).group(1)
        q = doc.add_paragraph(style='List Bullet')
        txt = f'{labels.get(a, a)}  →  ' + (f'[{edge}]  ' if edge else '') + labels.get(b, b)
        add_inline(q, txt, size=9.5)


lines = open(SRC, encoding='utf-8').read().splitlines()
i, title_count = 0, 0
while i < len(lines):
    ln = lines[i]
    s = ln.strip()
    if s.startswith('```'):
        lang = s[3:].strip()
        block = []
        i += 1
        while i < len(lines) and not lines[i].strip().startswith('```'):
            block.append(lines[i])
            i += 1
        (add_mermaid if lang == 'mermaid' else add_code)(block)
    elif s.startswith('|'):
        rows = []
        while i < len(lines) and lines[i].strip().startswith('|'):
            rows.append(lines[i])
            i += 1
        add_table(rows)
        continue
    elif s.startswith('# '):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(s[2:])
        r.bold = True
        r.font.size = Pt(24 if title_count == 0 else 18)
        r.font.color.rgb = ACCENT if title_count == 0 else ACCENT2
        title_count += 1
    elif s.startswith('#### '):
        doc.add_heading(s[5:], level=4)
    elif s.startswith('### '):
        doc.add_heading(s[4:], level=3)
    elif s.startswith('## '):
        doc.add_heading(s[3:], level=1)
    elif s.startswith('> '):
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.3)
        add_inline(p, s[2:], size=9.5, color=RGBColor(0x55, 0x55, 0x55), italic=True)
    elif s == '---' or not s:
        pass
    elif re.match(r'^\s*[-*] ', ln):
        indent = len(ln) - len(ln.lstrip())
        p = doc.add_paragraph(style='List Bullet 2' if indent >= 2 else 'List Bullet')
        add_inline(p, re.sub(r'^\s*[-*] ', '', ln))
    elif re.match(r'^\s*\d+\. ', ln):
        indent = len(ln) - len(ln.lstrip())
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.25 + 0.25 * (indent >= 2))
        add_inline(p, ln.strip())
    else:
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.25) if ln.startswith('   ') else None
        add_inline(p, s)
    i += 1

try:
    doc.save(DST)
    print('Saved', DST)
except PermissionError:
    fallback = DST.replace('.docx', '_v2.1.docx')
    doc.save(fallback)
    print('File đang mở trong Word, đã lưu sang:', fallback)

