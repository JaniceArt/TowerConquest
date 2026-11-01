# -*- coding: utf-8 -*-
"""
Tạo file Excel chuẩn OpenXML (.xlsx) quản lý chỉ số thẻ bài Food Clash: Mold Invasion (Project 20261)
Bao gồm đầy đủ các Level từ 1 đến 16 theo Độ hiếm (Rarity) dựa trên thẻ tham chiếu từ https://www.noff.gg/clash-royale/cards:
  - Common (Thường): Level 1 -> Level 16
  - Rare (Hiếm):     Level 3 -> Level 16
  - Epic (Sử thi):   Level 6 -> Level 16
Công thức tăng trưởng chuẩn Clash Royale: Mỗi cấp tăng +10% HP, Sát thương, Sát thương nổ/trụ (neo chuẩn tại Level 11).
"""
import zipfile
from xml.sax.saxutils import escape

OUT_FILE = "Card_Stats_Food_Clash.xlsx"

RARITY_MIN_LV = {
    "Common": 1,
    "Rare": 3,
    "Epic": 6,
    "Legendary": 9,
    "Champion": 11,
}


def col_letter(n):
    s = ""
    while n > 0:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


def scale_stat(base_lv11, lv):
    if not base_lv11:
        return 0
    return int(round(base_lv11 * (1.1 ** (lv - 11))))


def build_sheet_xml(rows, col_widths, freeze_row=1):
    cols_xml = ["<cols>"]
    for idx, w in enumerate(col_widths, start=1):
        cols_xml.append(f'<col min="{idx}" max="{idx}" width="{w}" customWidth="1"/>')
    cols_xml.append("</cols>")

    sheet_data = ["<sheetData>"]
    for r_idx, row in enumerate(rows, start=1):
        ht = ' ht="26" customHeight="1"' if r_idx == 1 else ' ht="20" customHeight="1"'
        sheet_data.append(f'<row r="{r_idx}"{ht}>')
        for c_idx, cell in enumerate(row, start=1):
            ref = f"{col_letter(c_idx)}{r_idx}"
            st = cell.get("s", 0)
            ctype = cell.get("t", "s")
            val = cell.get("v", "")
            if ctype == "n" and val != "" and val is not None:
                sheet_data.append(f'<c r="{ref}" s="{st}"><v>{val}</v></c>')
            elif ctype == "f":
                cached = cell.get("cached", 0)
                sheet_data.append(f'<c r="{ref}" s="{st}"><f>{escape(str(val))}</f><v>{cached}</v></c>')
            else:
                sheet_data.append(f'<c r="{ref}" s="{st}" t="inlineStr"><is><t>{escape(str(val))}</t></is></c>')
        sheet_data.append("</row>")
    sheet_data.append("</sheetData>")

    pane = (
        f'<sheetViews><sheetView tabSelected="1" workbookViewId="0">'
        f'<pane ySplit="{freeze_row}" topLeftCell="A{freeze_row+1}" activePane="bottomLeft" state="frozen"/>'
        f'</sheetView></sheetViews>'
    )
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        + pane
        + "".join(cols_xml)
        + "".join(sheet_data)
        + "</worksheet>"
    )


# Styles:
# 0 = Normal left
# 1 = Header Green (Food)
# 2 = Header Purple (Mold)
# 3 = Header Blue (Matrix / Towers)
# 4 = Integer centered
# 5 = Decimal 0.0 centered
# 6 = Bold left
# 7 = Centered text
# 8 = Formula / Highlight Lv11 (light yellow, integer/decimal)
# 9 = Locked / N/A cell (grayed out for levels below min rarity level)
STYLES_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2">
    <numFmt numFmtId="164" formatCode="#,##0"/>
    <numFmt numFmtId="165" formatCode="#,##0.0"/>
  </numFmts>
  <fonts count="6">
    <font><sz val="10.5"/><color rgb="FF1F2937"/><name val="Calibri"/></font>
    <font><b/><sz val="10.5"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="10.5"/><color rgb="FF111827"/><name val="Calibri"/></font>
    <font><b/><sz val="10.5"/><color rgb="FF0F5132"/><name val="Calibri"/></font>
    <font><i/><sz val="9.5"/><color rgb="FF9CA3AF"/><name val="Calibri"/></font>
    <font><b/><sz val="10.5"/><color rgb="FF92400E"/><name val="Calibri"/></font>
  </fonts>
  <fills count="7">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1F7A3E"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF5B3285"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1D4ED8"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFFBEB"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF3F4F6"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFD1D5DB"/></left>
      <right style="thin"><color rgb="FFD1D5DB"/></right>
      <top style="thin"><color rgb="FFD1D5DB"/></top>
      <bottom style="thin"><color rgb="FFD1D5DB"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="10">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" applyFont="1" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="3" borderId="1" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="4" borderId="1" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="1" applyFont="1" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="164" fontId="5" fillId="5" borderId="1" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="4" fillId="6" borderId="1" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>
  </cellXfs>
</styleSheet>"""


# Dữ liệu gốc chuẩn Tournament Standard (Level 11) từ noff.gg/clash-royale/cards
FOOD_CARDS = [
    # id, name, ref, ctype, rarity, min_lv, cost, count, hp11, dmg11, rate, special_dmg11, cr_range, map_range, aoe_r, cr_spd, map_spd, targets, note
    ("chips", "Chips 🥔", "Skeletons", "Troop (Swarm)", "Common", 1, 1, 3, 81, 81, 1.1, 0, 0.5, 80, 0, "Fast (90)", 135, "Mặt Đất", "Common (Lv1→16) · 1💧 gọi 3 miếng bim bim xoay bài & câu kéo."),
    ("donuts", "Dough Donuts 🍩", "Minions (x2)", "Troop (Flying)", "Common", 1, 3, 2, 280, 135, 1.1, 0, 2.0, 200, 0, "Fast (90)", 135, "Đất & Không", "Common (Lv1→16) · Gọi 2 bánh Donut bay tầm ngắn 200 đv."),
    ("salt", "Muối Hột 🧂", "Arrows", "Spell (Wide AoE)", "Common", 1, 3, 1, 0, 366, 0.55, 111, 3.5, 350, 350, "Spell (0.55s)", 0, "Đất & Không", "Common (Lv1→16) · Phép diện rộng R=350 đv, ST công trình = 30% ST lính."),
    ("valentino", "El Valentino 🍫", "Giant", "Troop (Tank)", "Rare", 3, 5, 1, 3968, 253, 1.5, 0, 1.2, 120, 0, "Slow (45)", 70, "Chỉ Công Trình", "Rare (Lv3→16) · Đô vật socola máu cực lớn, chỉ đánh công trình."),
    ("lemonade", "Lemo-nade 🍋", "Wizard", "Troop (AoE Ranged)", "Rare", 3, 5, 1, 755, 281, 1.4, 0, 5.5, 550, 150, "Medium (60)", 95, "Đất & Không", "Rare (Lv3→16) · Ném chanh tầm 550 đv, nổ lan AoE bán kính 150 đv."),
    ("milky", "Milky Cartoneey 🥛", "Musketeer", "Troop (Sniper)", "Rare", 3, 4, 1, 721, 217, 1.0, 0, 6.0, 600, 0, "Medium (60)", 95, "Đất & Không", "Rare (Lv3→16) · Xạ thủ hộp sữa tầm 600 đv, bắn đơn ổn định."),
    ("avocador", "Avocador 🥑", "Mini P.E.K.K.A", "Troop (Tank Killer)", "Rare", 3, 4, 1, 1390, 755, 1.6, 0, 0.8, 80, 0, "Fast (90)", 135, "Mặt Đất", "Rare (Lv3→16) · Võ sĩ quả bơ sát thương đơn cực lớn, khắc chế Tank."),
    ("boba", "Boba Bob 🧋", "Dart Goblin", "Troop (Rapid Sniper)", "Rare", 3, 3, 1, 261, 151, 0.8, 0, 6.5, 650, 0, "Very Fast (120)", 175, "Đất & Không", "Rare (Lv3→16) · Tầm bắn xa nhất 650 đv, tốc bắn 0.8s, chạy rất nhanh."),
    ("vinegar", "Bom Giấm 🍾", "Fireball", "Spell (Heavy AoE)", "Rare", 3, 4, 1, 0, 689, 0.60, 207, 2.5, 250, 250, "Spell (0.60s)", 0, "Đất & Không", "Rare (Lv3→16) · Phép nổ giấm R=250 đv, sát thương lớn lên lính & trụ."),
    ("tom", "Sir Tom 🍅", "Wall Breakers / Giant Skeleton Bomb", "Troop (Kamikaze)", "Epic", 6, 2, 1, 560, 84, 1.5, 530, 0.8, 80, 250, "Medium (60)", 95, "Mặt Đất (Nổ: Đất & Không)", "Epic (Lv6→16) · Cà chua cảm tử, khi chết nổ AoE R=250 (ST trụ = 50% ST nổ)."),
]

MOLD_CARDS = [
    ("spores", "Bào Tử Lúc Nhúc 🦠", "Goblins / Skeletons", "Troop (Swarm)", "Common", 1, 2, 3, 160, 105, 1.1, 0, 0.8, 80, 0, "Very Fast (120)", 175, "Mặt Đất", "Common (Lv1→16) · Bầy 3 bào tử chạy rất nhanh."),
    ("flies", "Ruồi Giấm 🪰", "Minions", "Troop (Flying)", "Common", 1, 3, 3, 230, 107, 1.2, 0, 2.0, 200, 0, "Fast (90)", 135, "Đất & Không", "Common (Lv1→16) · Bầy 3 ruồi giấm bay trên không."),
    ("slime", "Nhớt Mốc", "Knight", "Troop (Melee)", "Common", 1, 3, 1, 1766, 202, 1.2, 0, 1.0, 100, 0, "Medium (60)", 95, "Mặt Đất", "Common (Lv1→16) · Khối nhớt tím xám cận chiến lì đòn."),
    ("cloud", "Mây Bào Tử ☁️", "Arrows", "Spell (Wide AoE)", "Common", 1, 3, 1, 0, 366, 0.55, 111, 3.5, 350, 350, "Spell (0.55s)", 0, "Đất & Không", "Common (Lv1→16) · Phép mưa bào tử độc bán kính 350 đv."),
    ("brute", "Mốc Khổng Lồ", "Giant", "Troop (Tank)", "Rare", 3, 5, 1, 3968, 253, 1.5, 0, 1.2, 120, 0, "Slow (45)", 70, "Chỉ Công Trình", "Rare (Lv3→16) · Khối mốc xanh rêu khổng lồ, chỉ đánh công trình."),
    ("spitter", "Nấm Phun Bào Tử 🍄", "Musketeer", "Troop (Ranged)", "Rare", 3, 4, 1, 721, 217, 1.0, 0, 6.0, 600, 0, "Medium (60)", 95, "Đất & Không", "Rare (Lv3→16) · Nấm bắn xa 600 đv, khắc chế lính bay."),
]

TOWERS = [
    ("main_tower", "Nhà Chính (Tủ Lạnh Tổng / Ổ Mốc)", "King Tower", "Tower (Main)", "Common", 1, 0, 1, 4824, 109, 1.0, 0, 11.0, 1100, 400, "Immobile", 0, "Đất & Không", "Lv1→16 · Ngủ đầu trận; thức tỉnh khi nhận sát thương hoặc mất Trụ bậc thềm."),
    ("spice_tower", "Trụ Bậc Thềm (Ấm Siêu Tốc / Nấm Bào Tử)", "Princess Tower", "Tower (Step)", "Common", 1, 0, 1, 3052, 109, 0.8, 0, 12.0, 1200, 200, "Immobile", 0, "Đất & Không", "Lv1→16 · Luôn chủ động bắn mục tiêu trong tầm 1200 đv."),
]


# ==================== SHEET 1: TỔNG QUAN & THÔNG SỐ CHUẨN LV11 ====================
s1_headers = [
    "Mã ID", "Tên Thẻ", "Phe", "Thẻ Tham Chiếu (noff.gg)", "Độ Hiếm (Rarity)", "Level Khởi Điểm → Tối Đa",
    "Năng Lượng (💧)", "Số Lượng (SL)", "HP Lv11 / 1 ĐV", "Tổng HP Lv11", "ST Lv11 / 1 ĐV", "Tốc Đánh (s)",
    "DPS Lv11 / 1 ĐV", "Tổng DPS Lv11", "ST Trụ / Nổ Chết Lv11", "Tầm / Bán Kính (CR Tiles)",
    "Tầm / Bán Kính (ĐV Map)", "Bán Kính AoE (ĐV Map)", "Tốc Chạy (CR)", "Tốc Chạy (ĐV/s)", "Mục Tiêu", "Ghi Chú"
]
s1_rows = [[{"v": h, "t": "s", "s": 1} for h in s1_headers]]

all_overview = [("Đồ Ăn", c) for c in FOOD_CARDS] + [("Nấm Mốc", c) for c in MOLD_CARDS] + [("Công Trình", c) for c in TOWERS]
for idx, (faction, c) in enumerate(all_overview, start=2):
    cid, name, ref, ctype, rarity, min_lv, cost, count, hp11, dmg11, rate, spec11, cr_r, map_r, aoe_r, cr_spd, map_spd, targets, note = c
    is_spell = "Spell" in ctype
    dps1 = round(dmg11 / rate, 1) if not is_spell else 0.0
    s1_rows.append([
        {"v": cid, "t": "s", "s": 7},
        {"v": name, "t": "s", "s": 6},
        {"v": faction, "t": "s", "s": 7},
        {"v": ref, "t": "s", "s": 0},
        {"v": rarity, "t": "s", "s": 7},
        {"v": f"Lv{min_lv} → Lv16", "t": "s", "s": 7},
        {"v": cost, "t": "n", "s": 4},
        {"v": count, "t": "n", "s": 4},
        {"v": hp11, "t": "n", "s": 8},
        {"v": f"H{idx}*I{idx}", "t": "f", "cached": count * hp11, "s": 4},
        {"v": dmg11, "t": "n", "s": 8},
        {"v": rate, "t": "n", "s": 5},
        {"v": f"IF(I{idx}=0,0,K{idx}/L{idx})", "t": "f", "cached": dps1, "s": 5},
        {"v": f"M{idx}*H{idx}", "t": "f", "cached": round(dps1 * count, 1), "s": 5},
        {"v": spec11, "t": "n", "s": 4},
        {"v": cr_r, "t": "n", "s": 5},
        {"v": f"P{idx}*100", "t": "f", "cached": map_r, "s": 4},
        {"v": aoe_r, "t": "n", "s": 4},
        {"v": cr_spd, "t": "s", "s": 7},
        {"v": map_spd, "t": "n", "s": 4},
        {"v": targets, "t": "s", "s": 7},
        {"v": note, "t": "s", "s": 0},
    ])
s1_widths = [12, 26, 12, 24, 14, 16, 12, 11, 14, 14, 14, 12, 14, 14, 16, 15, 15, 15, 15, 13, 18, 46]


# ==================== SHEET 2: BẢNG LEVEL TỪ KHỞI ĐIỂM ĐẾN 16 (PHE ĐỒ ĂN) ====================
# Mỗi dòng là (Thẻ, Level) từ min_lv..16, dùng công thức Excel nhân 1.1^(Lv-11)
s2_headers = [
    "Mã ID", "Tên Thẻ (Đồ Ăn)", "Thẻ Tham Chiếu (noff.gg)", "Độ Hiếm", "Level",
    "Năng Lượng (💧)", "Số Lượng", "HP Chuẩn Lv11 (Gốc)", "Sát Thương Chuẩn Lv11 (Gốc)",
    "Máu / 1 ĐV (HP ở Level)", "Tổng Máu (Total HP)", "Sát Thương / 1 ĐV (Damage ở Level)",
    "Tốc Đánh (s)", "DPS / 1 ĐV", "Tổng DPS", "ST Công Trình / Nổ Chết (ở Level)",
    "Tầm Bắn / Bán Kính (ĐV Map)", "Bán Kính AoE (ĐV Map)", "Tốc Chạy (ĐV/s)"
]
s2_rows = [[{"v": h, "t": "s", "s": 1} for h in s2_headers]]

r_cursor = 2
for c in FOOD_CARDS:
    cid, name, ref, ctype, rarity, min_lv, cost, count, hp11, dmg11, rate, spec11, cr_r, map_r, aoe_r, cr_spd, map_spd, targets, note = c
    is_spell = "Spell" in ctype
    for lv in range(min_lv, 17):
        hp_lv = scale_stat(hp11, lv)
        dmg_lv = scale_stat(dmg11, lv)
        spec_lv = scale_stat(spec11, lv)
        dps_lv = round(dmg_lv / rate, 1) if not is_spell else 0.0
        st_num = 8 if lv == 11 else 4
        s2_rows.append([
            {"v": cid, "t": "s", "s": 7},
            {"v": name, "t": "s", "s": 6},
            {"v": ref, "t": "s", "s": 0},
            {"v": rarity, "t": "s", "s": 7},
            {"v": lv, "t": "n", "s": st_num},
            {"v": cost, "t": "n", "s": 4},
            {"v": count, "t": "n", "s": 4},
            {"v": hp11, "t": "n", "s": 4},
            {"v": dmg11, "t": "n", "s": 4},
            {"v": f"IF(H{r_cursor}=0,0,ROUND(H{r_cursor}*POWER(1.1,E{r_cursor}-11),0))", "t": "f", "cached": hp_lv, "s": st_num},
            {"v": f"J{r_cursor}*G{r_cursor}", "t": "f", "cached": hp_lv * count, "s": st_num},
            {"v": f"ROUND(I{r_cursor}*POWER(1.1,E{r_cursor}-11),0)", "t": "f", "cached": dmg_lv, "s": st_num},
            {"v": rate, "t": "n", "s": 5},
            {"v": f"IF(H{r_cursor}=0,0,ROUND(L{r_cursor}/M{r_cursor},1))", "t": "f", "cached": dps_lv, "s": 5},
            {"v": f"N{r_cursor}*G{r_cursor}", "t": "f", "cached": round(dps_lv * count, 1), "s": 5},
            {"v": f"ROUND({spec11}*POWER(1.1,E{r_cursor}-11),0)", "t": "f", "cached": spec_lv, "s": st_num},
            {"v": map_r, "t": "n", "s": 4},
            {"v": aoe_r, "t": "n", "s": 4},
            {"v": map_spd, "t": "n", "s": 4},
        ])
        r_cursor += 1
s2_widths = [12, 22, 24, 12, 9, 13, 11, 16, 18, 18, 16, 20, 12, 13, 13, 20, 18, 16, 14]


# ==================== SHEET 3: BẢNG LEVEL TỪ KHỞI ĐIỂM ĐẾN 16 (NẤM MỐC & CÔNG TRÌNH) ====================
s3_rows = [[{"v": h, "t": "s", "s": 2} for h in s2_headers]]
r_cursor = 2
for c in MOLD_CARDS + TOWERS:
    cid, name, ref, ctype, rarity, min_lv, cost, count, hp11, dmg11, rate, spec11, cr_r, map_r, aoe_r, cr_spd, map_spd, targets, note = c
    is_spell = "Spell" in ctype
    for lv in range(min_lv, 17):
        hp_lv = scale_stat(hp11, lv)
        dmg_lv = scale_stat(dmg11, lv)
        spec_lv = scale_stat(spec11, lv)
        dps_lv = round(dmg_lv / rate, 1) if not is_spell else 0.0
        st_num = 8 if lv == 11 else 4
        s3_rows.append([
            {"v": cid, "t": "s", "s": 7},
            {"v": name, "t": "s", "s": 6},
            {"v": ref, "t": "s", "s": 0},
            {"v": rarity, "t": "s", "s": 7},
            {"v": lv, "t": "n", "s": st_num},
            {"v": cost, "t": "n", "s": 4},
            {"v": count, "t": "n", "s": 4},
            {"v": hp11, "t": "n", "s": 4},
            {"v": dmg11, "t": "n", "s": 4},
            {"v": f"IF(H{r_cursor}=0,0,ROUND(H{r_cursor}*POWER(1.1,E{r_cursor}-11),0))", "t": "f", "cached": hp_lv, "s": st_num},
            {"v": f"J{r_cursor}*G{r_cursor}", "t": "f", "cached": hp_lv * count, "s": st_num},
            {"v": f"ROUND(I{r_cursor}*POWER(1.1,E{r_cursor}-11),0)", "t": "f", "cached": dmg_lv, "s": st_num},
            {"v": rate, "t": "n", "s": 5},
            {"v": f"IF(H{r_cursor}=0,0,ROUND(L{r_cursor}/M{r_cursor},1))", "t": "f", "cached": dps_lv, "s": 5},
            {"v": f"N{r_cursor}*G{r_cursor}", "t": "f", "cached": round(dps_lv * count, 1), "s": 5},
            {"v": f"ROUND({spec11}*POWER(1.1,E{r_cursor}-11),0)", "t": "f", "cached": spec_lv, "s": st_num},
            {"v": map_r, "t": "n", "s": 4},
            {"v": aoe_r, "t": "n", "s": 4},
            {"v": map_spd, "t": "n", "s": 4},
        ])
        r_cursor += 1


# ==================== SHEET 4: MA TRẬN NGANG LEVEL 1 -> 16 (TRA CỨU NHANH) ====================
s4_headers = ["Tên Thẻ / Công Trình", "Tham Chiếu", "Độ Hiếm", "Chỉ Số", "Lv Chuẩn (11)"] + [f"Lv {lv}" for lv in range(1, 17)]
s4_rows = [[{"v": h, "t": "s", "s": 3} for h in s4_headers]]

r_cursor = 2
for c in FOOD_CARDS + MOLD_CARDS + TOWERS:
    cid, name, ref, ctype, rarity, min_lv, cost, count, hp11, dmg11, rate, spec11, *_ = c
    metrics = []
    if hp11 > 0:
        metrics.append(("Máu (HP / 1 đv)", hp11))
    metrics.append(("Sát thương (Damage)", dmg11))
    if spec11 > 0:
        lbl = "ST Nổ khi chết" if cid == "tom" else "ST lên Công trình"
        metrics.append((lbl, spec11))

    for m_label, base_val in metrics:
        row = [
            {"v": name, "t": "s", "s": 6},
            {"v": ref, "t": "s", "s": 7},
            {"v": f"{rarity} (Lv{min_lv}–16)", "t": "s", "s": 7},
            {"v": m_label, "t": "s", "s": 7},
            {"v": base_val, "t": "n", "s": 8},
        ]
        for lv in range(1, 17):
            if lv < min_lv:
                row.append({"v": "—", "t": "s", "s": 9})
            else:
                st = 8 if lv == 11 else 4
                val = scale_stat(base_val, lv)
                row.append({"v": f"ROUND($E{r_cursor}*POWER(1.1,{lv}-11),0)", "t": "f", "cached": val, "s": st})
        s4_rows.append(row)
        r_cursor += 1

s4_widths = [26, 20, 16, 18, 14] + [10] * 16


def write_workbook(filename):
    with zipfile.ZipFile(filename, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet4.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>""")
        z.writestr("_rels/.rels", """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>""")
        z.writestr("xl/_rels/workbook.xml.rels", """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet4.xml"/>
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>""")
        z.writestr("xl/workbook.xml", """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="1_Tong_Quan_Lv11" sheetId="1" r:id="rId1"/>
    <sheet name="2_The_Do_An_Lv1_16" sheetId="2" r:id="rId2"/>
    <sheet name="3_Nam_Moc_Cong_Trinh_Lv1_16" sheetId="3" r:id="rId3"/>
    <sheet name="4_Ma_Tran_Ngang_Lv1_16" sheetId="4" r:id="rId4"/>
  </sheets>
</workbook>""")
        z.writestr("xl/styles.xml", STYLES_XML)
        z.writestr("xl/worksheets/sheet1.xml", build_sheet_xml(s1_rows, s1_widths))
        z.writestr("xl/worksheets/sheet2.xml", build_sheet_xml(s2_rows, s2_widths))
        z.writestr("xl/worksheets/sheet3.xml", build_sheet_xml(s3_rows, s2_widths))
        z.writestr("xl/worksheets/sheet4.xml", build_sheet_xml(s4_rows, s4_widths))


try:
    write_workbook(OUT_FILE)
    print("Successfully generated 4-sheet workbook:", OUT_FILE)
except PermissionError:
    alt = "Card_Stats_Food_Clash_Lv1_16.xlsx"
    write_workbook(alt)
    print("File gốc đang mở trong Excel, đã xuất bản đầy đủ Lv1-16 ra:", alt)
