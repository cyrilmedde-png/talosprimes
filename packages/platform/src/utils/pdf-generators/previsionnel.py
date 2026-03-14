#!/usr/bin/env python3
"""
============================================================
GÉNÉRATEUR DE PRÉVISIONNEL FINANCIER PDF — TalosPrimes
Business Plan complet sur 12 mois
============================================================
"""

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas
import os

# ============================================================
# COULEURS
# ============================================================
DARK_BG = HexColor('#1a1a2e')
ACCENT = HexColor('#e67e22')
ACCENT_LIGHT = HexColor('#f39c12')
HEADER_BG = HexColor('#16213e')
ROW_ALT = HexColor('#1a1a3e')
TEXT_WHITE = HexColor('#ffffff')
TEXT_GRAY = HexColor('#94a3b8')
TEXT_LIGHT = HexColor('#cbd5e1')
GREEN = HexColor('#22c55e')
GREEN_DARK = HexColor('#166534')
RED = HexColor('#ef4444')
RED_DARK = HexColor('#7f1d1d')
BLUE = HexColor('#3b82f6')
PURPLE = HexColor('#a855f7')
AMBER = HexColor('#f59e0b')

MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']


def fmt(val):
    """Format nombre en K€ ou €"""
    if abs(val) >= 1000:
        return f"{val/1000:,.1f}K€".replace(',', ' ').replace('.', ',')
    return f"{val:,.0f}€".replace(',', ' ')


def fmt_full(val):
    return f"{val:,.0f} €".replace(',', ' ')


def draw_section_header(c, x, y, w, title, color=ACCENT):
    c.setFillColor(HEADER_BG)
    c.roundRect(x, y - 7*mm, w, 7*mm, 3, fill=1, stroke=0)
    c.setFillColor(color)
    c.setFont('Helvetica-Bold', 9)
    c.drawString(x + 4*mm, y - 5.5*mm, title)
    return y - 8*mm


def draw_table_header(c, x, y, col_positions, headers, w):
    c.setFillColor(HexColor('#1e293b'))
    c.rect(x, y - 5*mm, w, 5*mm, fill=1, stroke=0)
    c.setFillColor(ACCENT_LIGHT)
    c.setFont('Helvetica-Bold', 5.5)
    for i, (pos, header) in enumerate(zip(col_positions, headers)):
        if i == 0:
            c.drawString(x + pos + 2*mm, y - 4*mm, header)
        else:
            c.drawRightString(x + pos, y - 4*mm, header)
    return y - 6*mm


def draw_data_row(c, x, y, col_positions, values, w, bold=False, colors=None, bg=None):
    if bg:
        c.setFillColor(bg)
        c.rect(x, y - 4.5*mm, w, 4.5*mm, fill=1, stroke=0)

    font = 'Helvetica-Bold' if bold else 'Helvetica'
    c.setFont(font, 6 if not bold else 6.5)

    for i, (pos, val) in enumerate(zip(col_positions, values)):
        color = TEXT_LIGHT
        if colors and i < len(colors) and colors[i]:
            color = colors[i]
        elif bold:
            color = TEXT_WHITE
        c.setFillColor(color)

        if i == 0:
            c.drawString(x + pos + 2*mm, y - 3.5*mm, str(val))
        else:
            c.drawRightString(x + pos, y - 3.5*mm, str(val))
    return y - 5*mm


def generate_previsionnel(
    output_path,
    nom_entreprise='TalosPrimes SaaS',
    nom_projet='Prévisionnel Financier',
    annee=2026,
    # CA par source : {nom: [12 mois]}
    sources_ca=None,
    # Charges : {nom: (categorie, [12 mois])}
    charges=None,
    # Investissements : [(nom, montant_ht, amort_annees)]
    investissements=None,
    # Financements : [(nom, type, montant, taux, duree_mois)]
    financements=None,
):
    # Données par défaut
    if sources_ca is None:
        sources_ca = {
            'Abonnements SaaS': [5000, 6000, 7500, 8000, 9000, 10000, 11000, 12000, 13500, 15000, 16500, 18000],
            'Prestations / Setup': [2000, 1500, 3000, 2000, 2500, 3500, 2000, 3000, 4000, 3000, 3500, 5000],
        }
    if charges is None:
        charges = {
            'Hébergement & Infra': ('fixe', [500]*12),
            'Logiciels & SaaS': ('fixe', [300]*12),
            'Assurances': ('fixe', [150]*12),
            'Expert-comptable': ('fixe', [400]*12),
            'Marketing & Publicité': ('variable', [800, 800, 1000, 1000, 1200, 1200, 1500, 1500, 1800, 1800, 2000, 2000]),
            'Frais bancaires': ('variable', [100]*12),
            'Salaires bruts': ('personnel', [4500]*12),
            'Charges sociales (~45%)': ('personnel', [2025]*12),
            'Rémunération dirigeant': ('personnel', [3000]*12),
        }
    if investissements is None:
        investissements = [
            ('Matériel informatique', 5000, 3),
            ('Développement logiciel', 15000, 5),
        ]
    if financements is None:
        financements = [
            ('Apport en capital', 'apport', 10000, 0, 0),
            ('Prêt bancaire', 'emprunt', 30000, 4.5, 60),
        ]

    # ============================================================
    # CALCULS
    # ============================================================
    # CA
    ca_mensuel = [0]*12
    for vals in sources_ca.values():
        for i in range(12):
            ca_mensuel[i] += vals[i]
    ca_annuel = sum(ca_mensuel)

    # Charges par catégorie
    charges_mensuelles = [0]*12
    charges_fixes_annuel = 0
    charges_variables_annuel = 0
    charges_personnel_annuel = 0
    for nom, (cat, vals) in charges.items():
        total = sum(vals)
        if cat == 'fixe': charges_fixes_annuel += total
        elif cat == 'variable': charges_variables_annuel += total
        elif cat == 'personnel': charges_personnel_annuel += total
        for i in range(12):
            charges_mensuelles[i] += vals[i]
    charges_annuelles = sum(charges_mensuelles)

    # Amortissements
    amort_mensuel = [0]*12
    total_invest = 0
    for nom, montant, duree in investissements:
        total_invest += montant
        mensuel = montant / (duree * 12)
        for i in range(12):
            amort_mensuel[i] += mensuel
    amort_mensuel = [round(v) for v in amort_mensuel]

    # Remboursements emprunts
    rembours_mensuel = 0
    total_financement = 0
    for nom, typ, montant, taux, duree in financements:
        total_financement += montant
        if typ == 'emprunt' and duree > 0:
            rembours_mensuel += montant / duree + (montant * taux / 100) / 12
    rembours_mensuel = round(rembours_mensuel)

    # Résultat d'exploitation
    resultat_mensuel = [ca_mensuel[i] - charges_mensuelles[i] - amort_mensuel[i] for i in range(12)]
    resultat_annuel = sum(resultat_mensuel)

    # TVA
    tva_mensuelle = [round(ca_mensuel[i] * 0.20 - charges_mensuelles[i] * 0.12) for i in range(12)]

    # Trésorerie
    tresorerie = []
    solde = total_financement - total_invest * 1.20
    for i in range(12):
        enc = ca_mensuel[i] * 1.20
        dec = charges_mensuelles[i] * 1.12
        tva = tva_mensuelle[i - 1] if i > 0 else 0
        solde += enc - dec - tva - rembours_mensuel
        tresorerie.append(round(solde))

    # Seuil de rentabilité
    charges_fixes_total = charges_fixes_annuel + charges_personnel_annuel
    taux_marge = (ca_annuel - charges_variables_annuel) / ca_annuel if ca_annuel > 0 else 0
    seuil_rentabilite = round(charges_fixes_total / taux_marge) if taux_marge > 0 else 0

    # Point mort
    point_mort = None
    cumul = 0
    for i in range(12):
        cumul += resultat_mensuel[i]
        if cumul > 0:
            point_mort = i + 1
            break

    # ============================================================
    # PDF — PAYSAGE A4
    # ============================================================
    w, h = landscape(A4)
    c = canvas.Canvas(output_path, pagesize=landscape(A4))
    c.setTitle(f"Prévisionnel Financier {annee} - {nom_entreprise}")
    c.setAuthor(nom_entreprise)

    # Fond
    c.setFillColor(DARK_BG)
    c.rect(0, 0, w, h, fill=1, stroke=0)

    ml = 12*mm
    mr = w - 12*mm
    cw = mr - ml
    y = h - 15*mm

    # ── EN-TÊTE ──
    c.setFillColor(HEADER_BG)
    c.roundRect(ml, y - 22*mm, cw, 22*mm, 5, fill=1, stroke=0)

    c.setFillColor(ACCENT)
    c.setFont('Helvetica-Bold', 16)
    c.drawString(ml + 8*mm, y - 9*mm, nom_entreprise)
    c.setFillColor(TEXT_GRAY)
    c.setFont('Helvetica', 8)
    c.drawString(ml + 8*mm, y - 15*mm, f'{nom_projet} — Exercice {annee}')
    c.drawString(ml + 8*mm, y - 20*mm, f'Document généré automatiquement par TalosPrimes SaaS')

    c.setFillColor(ACCENT_LIGHT)
    c.setFont('Helvetica-Bold', 14)
    c.drawRightString(mr - 8*mm, y - 9*mm, 'PRÉVISIONNEL FINANCIER')
    c.setFillColor(TEXT_WHITE)
    c.setFont('Helvetica-Bold', 11)
    c.drawRightString(mr - 8*mm, y - 17*mm, str(annee))

    y -= 26*mm

    # ── KPIs ──
    kpis = [
        ('CA Annuel HT', fmt_full(ca_annuel), TEXT_WHITE),
        ('Charges Totales', fmt_full(charges_annuelles), RED),
        ('Résultat Net', fmt_full(resultat_annuel), GREEN if resultat_annuel >= 0 else RED),
        ('Seuil Rentabilité', fmt_full(seuil_rentabilite), AMBER),
        ('Point Mort', f'Mois {point_mort}' if point_mort else 'Non atteint', PURPLE),
        ('Trésorerie Fin', fmt_full(tresorerie[-1]), GREEN if tresorerie[-1] >= 0 else RED),
    ]

    kpi_w = (cw - 5*5*mm) / 6
    for i, (label, value, color) in enumerate(kpis):
        kx = ml + i * (kpi_w + 5*mm)
        c.setFillColor(HEADER_BG)
        c.roundRect(kx, y - 16*mm, kpi_w, 16*mm, 4, fill=1, stroke=0)
        c.setFillColor(TEXT_GRAY)
        c.setFont('Helvetica', 5.5)
        c.drawString(kx + 3*mm, y - 5*mm, label)
        c.setFillColor(color)
        c.setFont('Helvetica-Bold', 10)
        c.drawString(kx + 3*mm, y - 13*mm, value)

    y -= 20*mm

    # ── COLONNES : Libellé + 12 mois + Total ──
    col_w_label = 55*mm
    col_w_mois = (cw - col_w_label - 25*mm) / 12
    col_positions = [0]  # Label
    for i in range(12):
        col_positions.append(col_w_label + (i + 1) * col_w_mois)
    col_positions.append(cw - 2*mm)  # Total

    headers = ['Poste'] + MOIS + ['Total']

    # ============================================================
    # PAGE 1 : COMPTE DE RÉSULTAT
    # ============================================================
    y = draw_section_header(c, ml, y, cw, "COMPTE DE RÉSULTAT PRÉVISIONNEL", GREEN)
    y = draw_table_header(c, ml, y, col_positions, headers, cw)

    # CA par source
    for nom, vals in sources_ca.items():
        values = [nom] + [fmt(v) for v in vals] + [fmt(sum(vals))]
        colors = [TEXT_LIGHT] + [GREEN]*12 + [GREEN]
        y = draw_data_row(c, ml, y, col_positions, values, cw, colors=colors, bg=ROW_ALT)

    # Total CA
    values = ['TOTAL CA HT'] + [fmt(v) for v in ca_mensuel] + [fmt(ca_annuel)]
    colors = [GREEN] + [GREEN]*12 + [GREEN]
    y = draw_data_row(c, ml, y, col_positions, values, cw, bold=True, colors=colors, bg=GREEN_DARK)
    y -= 2*mm

    # Charges par catégorie
    categories = {'fixe': 'Charges fixes', 'variable': 'Charges variables', 'personnel': 'Personnel'}
    for cat_key, cat_label in categories.items():
        # Sous-header catégorie
        c.setFillColor(HexColor('#1e293b'))
        c.rect(ml, y - 4*mm, cw, 4*mm, fill=1, stroke=0)
        c.setFillColor(BLUE)
        c.setFont('Helvetica-Bold', 5.5)
        c.drawString(ml + 3*mm, y - 3*mm, cat_label.upper())
        y -= 4.5*mm

        for nom, (cat, vals) in charges.items():
            if cat != cat_key:
                continue
            values = [nom] + [fmt(v) for v in vals] + [fmt(sum(vals))]
            colors = [TEXT_LIGHT] + [RED]*12 + [RED]
            y = draw_data_row(c, ml, y, col_positions, values, cw, colors=colors)

    # Total Charges
    values = ['TOTAL CHARGES'] + [fmt(v) for v in charges_mensuelles] + [fmt(charges_annuelles)]
    colors = [RED] + [RED]*12 + [RED]
    y = draw_data_row(c, ml, y, col_positions, values, cw, bold=True, colors=colors, bg=RED_DARK)
    y -= 1*mm

    # Amortissements
    values = ['Amortissements'] + [fmt(v) for v in amort_mensuel] + [fmt(sum(amort_mensuel))]
    colors = [TEXT_GRAY] + [TEXT_GRAY]*12 + [TEXT_GRAY]
    y = draw_data_row(c, ml, y, col_positions, values, cw, colors=colors, bg=ROW_ALT)
    y -= 2*mm

    # RÉSULTAT
    res_color = GREEN if resultat_annuel >= 0 else RED
    values = ["RÉSULTAT D'EXPLOITATION"] + [fmt(v) for v in resultat_mensuel] + [fmt(resultat_annuel)]
    res_colors = [res_color] + [GREEN if v >= 0 else RED for v in resultat_mensuel] + [res_color]
    y = draw_data_row(c, ml, y, col_positions, values, cw, bold=True, colors=res_colors, bg=HEADER_BG)

    # ============================================================
    # PAGE 2 : TRÉSORERIE + INVESTISSEMENTS
    # ============================================================
    c.showPage()
    c.setFillColor(DARK_BG)
    c.rect(0, 0, w, h, fill=1, stroke=0)
    y = h - 15*mm

    # ── PLAN DE TRÉSORERIE ──
    y = draw_section_header(c, ml, y, cw, "PLAN DE TRÉSORERIE", BLUE)
    y = draw_table_header(c, ml, y, col_positions, headers, cw)

    # Encaissements TTC
    enc = [round(ca_mensuel[i] * 1.20) for i in range(12)]
    values = ['Encaissements TTC'] + [fmt(v) for v in enc] + [fmt(sum(enc))]
    colors = [TEXT_LIGHT] + [GREEN]*12 + [GREEN]
    y = draw_data_row(c, ml, y, col_positions, values, cw, colors=colors, bg=ROW_ALT)

    # Décaissements
    dec = [round(charges_mensuelles[i] * 1.12) for i in range(12)]
    values = ['Décaissements'] + [fmt(v) for v in dec] + [fmt(sum(dec))]
    colors = [TEXT_LIGHT] + [RED]*12 + [RED]
    y = draw_data_row(c, ml, y, col_positions, values, cw, colors=colors)

    # TVA
    values = ['TVA à payer'] + [fmt(v) for v in tva_mensuelle] + [fmt(sum(tva_mensuelle))]
    colors = [TEXT_LIGHT] + [AMBER]*12 + [AMBER]
    y = draw_data_row(c, ml, y, col_positions, values, cw, colors=colors, bg=ROW_ALT)

    # Remboursements
    values = ['Remboursement emprunts'] + [fmt(rembours_mensuel)]*12 + [fmt(rembours_mensuel * 12)]
    colors = [TEXT_LIGHT] + [TEXT_GRAY]*12 + [TEXT_GRAY]
    y = draw_data_row(c, ml, y, col_positions, values, cw, colors=colors)
    y -= 2*mm

    # Solde trésorerie
    values = ['SOLDE DE TRÉSORERIE'] + [fmt(v) for v in tresorerie] + ['']
    tres_colors = [BLUE] + [GREEN if v >= 0 else RED for v in tresorerie] + [BLUE]
    y = draw_data_row(c, ml, y, col_positions, values, cw, bold=True, colors=tres_colors, bg=HEADER_BG)

    y -= 8*mm

    # ── INVESTISSEMENTS & FINANCEMENTS ──
    y = draw_section_header(c, ml, y, cw, "INVESTISSEMENTS & FINANCEMENTS", PURPLE)
    y -= 2*mm

    half = cw / 2 - 4*mm

    # Investissements (gauche)
    c.setFillColor(HEADER_BG)
    c.roundRect(ml, y - 50*mm, half, 50*mm, 4, fill=1, stroke=0)

    iy = y - 5*mm
    c.setFillColor(PURPLE)
    c.setFont('Helvetica-Bold', 8)
    c.drawString(ml + 5*mm, iy, 'INVESTISSEMENTS')
    iy -= 6*mm

    c.setFont('Helvetica-Bold', 5.5)
    c.setFillColor(ACCENT_LIGHT)
    c.drawString(ml + 5*mm, iy, 'Libellé')
    c.drawRightString(ml + half/2, iy, 'Montant HT')
    c.drawRightString(ml + half - 5*mm, iy, 'Amort.')
    iy -= 5*mm

    c.setFont('Helvetica', 7)
    for nom, montant, duree in investissements:
        c.setFillColor(TEXT_LIGHT)
        c.drawString(ml + 5*mm, iy, nom)
        c.setFillColor(TEXT_WHITE)
        c.drawRightString(ml + half/2, iy, fmt_full(montant))
        c.setFillColor(TEXT_GRAY)
        c.drawRightString(ml + half - 5*mm, iy, f"{duree} ans")
        iy -= 5*mm

    iy -= 3*mm
    c.setFillColor(PURPLE)
    c.setFont('Helvetica-Bold', 8)
    c.drawString(ml + 5*mm, iy, f'Total : {fmt_full(total_invest)}')

    # Financements (droite)
    fx = ml + half + 8*mm
    c.setFillColor(HEADER_BG)
    c.roundRect(fx, y - 50*mm, half, 50*mm, 4, fill=1, stroke=0)

    fy = y - 5*mm
    c.setFillColor(BLUE)
    c.setFont('Helvetica-Bold', 8)
    c.drawString(fx + 5*mm, fy, 'FINANCEMENTS')
    fy -= 6*mm

    c.setFont('Helvetica-Bold', 5.5)
    c.setFillColor(ACCENT_LIGHT)
    c.drawString(fx + 5*mm, fy, 'Libellé')
    c.drawRightString(fx + half/3, fy, 'Type')
    c.drawRightString(fx + half*2/3, fy, 'Montant')
    c.drawRightString(fx + half - 5*mm, fy, 'Taux / Durée')
    fy -= 5*mm

    c.setFont('Helvetica', 7)
    type_labels = {'apport': 'Apport', 'emprunt': 'Emprunt', 'subvention': 'Subvention', 'autre': 'Autre'}
    for nom, typ, montant, taux, duree in financements:
        c.setFillColor(TEXT_LIGHT)
        c.drawString(fx + 5*mm, fy, nom)
        c.setFillColor(TEXT_GRAY)
        c.drawRightString(fx + half/3, fy, type_labels.get(typ, typ))
        c.setFillColor(TEXT_WHITE)
        c.drawRightString(fx + half*2/3, fy, fmt_full(montant))
        c.setFillColor(TEXT_GRAY)
        detail = f"{taux}% / {duree}m" if taux > 0 else '-'
        c.drawRightString(fx + half - 5*mm, fy, detail)
        fy -= 5*mm

    fy -= 3*mm
    c.setFillColor(BLUE)
    c.setFont('Helvetica-Bold', 8)
    c.drawString(fx + 5*mm, fy, f'Total : {fmt_full(total_financement)}')

    y -= 55*mm

    # ── RATIOS & INDICATEURS ──
    y = draw_section_header(c, ml, y, cw, "INDICATEURS CLÉS", AMBER)
    y -= 2*mm

    ratios = [
        ('Marge brute', f"{(ca_annuel - charges_variables_annuel) / ca_annuel * 100:.1f}%" if ca_annuel > 0 else 'N/A'),
        ('Taux de charges salariales', f"{charges_personnel_annuel / ca_annuel * 100:.1f}%" if ca_annuel > 0 else 'N/A'),
        ('Seuil de rentabilité', fmt_full(seuil_rentabilite)),
        ('Point mort', f'Mois {point_mort} ({MOIS[point_mort-1]} {annee})' if point_mort else 'Non atteint sur l\'exercice'),
        ('Remboursement emprunt mensuel', fmt_full(rembours_mensuel)),
        ('Trésorerie minimale', fmt_full(min(tresorerie))),
        ('Trésorerie finale (déc.)', fmt_full(tresorerie[-1])),
        ('CA mensuel moyen', fmt_full(round(ca_annuel / 12))),
    ]

    c.setFillColor(HEADER_BG)
    c.roundRect(ml, y - 35*mm, cw, 35*mm, 4, fill=1, stroke=0)

    ry = y - 5*mm
    col1_end = ml + cw / 2
    for i, (label, value) in enumerate(ratios):
        rx = ml + 8*mm if i < 4 else col1_end + 8*mm
        if i == 4: ry = y - 5*mm

        c.setFillColor(TEXT_GRAY)
        c.setFont('Helvetica', 7)
        c.drawString(rx, ry, label)
        c.setFillColor(TEXT_WHITE)
        c.setFont('Helvetica-Bold', 7)
        c.drawString(rx + 55*mm, ry, value)
        ry -= 7*mm

    y -= 40*mm

    # ── MENTION ──
    c.setFillColor(TEXT_GRAY)
    c.setFont('Helvetica', 5.5)
    c.drawString(ml + 3*mm, y, f"Ce prévisionnel est fourni à titre indicatif. Les données peuvent varier en fonction de l'activité réelle.")
    c.drawString(ml + 3*mm, y - 4*mm, f"Généré par TalosPrimes SaaS — {nom_projet} — Exercice {annee}")

    c.save()
    return output_path


if __name__ == '__main__':
    output = '/sessions/relaxed-optimistic-ride/mnt/talosprimes/exemple_previsionnel.pdf'
    generate_previsionnel(output_path=output)
    print(f"OK: {output} ({os.path.getsize(output)} bytes)")
