#!/usr/bin/env python3
"""
============================================================
GÉNÉRATEUR DE FICHE DE PAIE PDF — TalosPrimes
Format officiel français conforme aux obligations légales
============================================================
"""

from reportlab.lib.pagesizes import A4
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
RED = HexColor('#ef4444')
BLUE = HexColor('#3b82f6')
ORANGE = HexColor('#fb923c')

# ============================================================
# CONSTANTES PAIE 2025
# ============================================================
PMSS = 3925
SMIC = 1802.00


def get_cotisations(brut, statut='non_cadre', taux_at=1.13):
    """Calcule toutes les cotisations sociales françaises 2025"""
    t1 = min(brut, PMSS)
    t2_agirc = max(0, min(brut, PMSS * 8) - PMSS)
    base_csg = brut * 0.9825
    taux_af = 3.45 if brut <= SMIC * 3.5 else 5.25

    lignes = [
        # (libelle, base, taux_sal, taux_pat, categorie)
        ('Assurance maladie', brut, 0, 13.00, 'Santé'),
        ('Contribution solidarité autonomie', brut, 0, 0.30, 'Santé'),
        ('Accidents du travail / Mal. prof.', brut, 0, taux_at, 'AT/MP'),
        ('Vieillesse plafonnée', t1, 6.90, 8.55, 'Retraite'),
        ('Vieillesse déplafonnée', brut, 0.40, 2.00, 'Retraite'),
        ('Agirc-Arrco Tranche 1', t1, 3.86, 6.01, 'Retraite'),
        ('CEG Tranche 1', t1, 0.86, 1.29, 'Retraite'),
        ('Allocations familiales', brut, 0, taux_af, 'Famille'),
        ('Assurance chômage', min(brut, PMSS * 4), 0, 4.05, 'Chômage'),
        ('AGS', min(brut, PMSS * 4), 0, 0.15, 'Chômage'),
        ('CSG déductible', base_csg, 6.80, 0, 'CSG/CRDS'),
        ('CSG non déductible + CRDS', base_csg, 2.90, 0, 'CSG/CRDS'),
        ('FNAL', brut, 0, 0.50, 'Autres'),
        ('Contribution dialogue social', brut, 0, 0.016, 'Autres'),
        ('Formation professionnelle', brut, 0, 1.00, 'Autres'),
        ("Taxe d'apprentissage", brut, 0, 0.68, 'Autres'),
    ]

    if statut == 'cadre':
        # Insérer après CEG T1
        idx = 7
        if t2_agirc > 0:
            lignes.insert(idx, ('Agirc-Arrco Tranche 2', t2_agirc, 10.57, 14.71, 'Retraite'))
            idx += 1
            lignes.insert(idx, ('CEG Tranche 2', t2_agirc, 1.08, 1.62, 'Retraite'))
            idx += 1
        if brut > PMSS:
            lignes.insert(idx, ('CET (cadres)', brut, 0.14, 0.21, 'Retraite'))
        lignes.append(('Prévoyance cadres (décès)', t1, 0, 1.50, 'Retraite'))
        lignes.append(('APEC', min(brut, PMSS * 4), 0.024, 0.036, 'Autres'))

    result = []
    for libelle, base, ts, tp, cat in lignes:
        mt_s = round(base * ts / 100, 2)
        mt_p = round(base * tp / 100, 2)
        if mt_s == 0 and mt_p == 0:
            continue
        result.append({
            'libelle': libelle, 'base': round(base, 2),
            'taux_sal': ts, 'taux_pat': tp,
            'montant_sal': mt_s, 'montant_pat': mt_p,
            'categorie': cat,
        })
    return result


def fmt_eur(val):
    if val == 0: return '-'
    s = f"{val:,.2f}".replace(',', ' ').replace('.', ',')
    return f"{s} €"


def fmt_pct(val):
    if val == 0: return '-'
    if val == int(val): return f"{int(val)}%"
    s = f"{val:.3f}".rstrip('0').rstrip('.')
    return f"{s}%"


def generate_fiche_paie(
    output_path,
    employeur_nom='TalosPrimes SaaS',
    employeur_adresse='123 Avenue de la Tech, 75001 Paris',
    employeur_siret='XXX XXX XXX XXXXX',
    employeur_code_ape='6201Z',
    employeur_convention='SYNTEC',
    employeur_urssaf='750000000',
    employe_nom='Jean DUPONT',
    employe_adresse='45 Rue de la République, 75011 Paris',
    employe_num_secu='1 85 01 75 001 001 01',
    employe_poste='Développeur Full-Stack',
    employe_qualification='Cadre',
    employe_echelon='3.1',
    employe_date_embauche='01/03/2024',
    employe_anciennete='1 an',
    mois='Mars', annee=2026,
    salaire_base=3500, heures_travaillees=151.67,
    heures_supp=0, primes=0, avantages_nature=0,
    statut='cadre', taux_at=1.13,
    mutuelle_employeur=30, mutuelle_salarie=20,
    transport_employeur=43.75, tickets_restaurant=0,
):
    w, h = A4
    c = canvas.Canvas(output_path, pagesize=A4)
    c.setTitle(f"Bulletin de paie - {employe_nom} - {mois} {annee}")
    c.setAuthor("TalosPrimes SaaS")

    # Fond
    c.setFillColor(DARK_BG)
    c.rect(0, 0, w, h, fill=1, stroke=0)

    y = h - 25*mm
    ml = 15*mm
    mr = w - 15*mm
    cw = mr - ml

    # ── EN-TÊTE ──
    c.setFillColor(HEADER_BG)
    c.roundRect(ml, y - 55*mm, cw, 55*mm, 4, fill=1, stroke=0)

    c.setFillColor(ACCENT)
    c.setFont('Helvetica-Bold', 18)
    c.drawString(ml + 8*mm, y - 12*mm, employeur_nom)

    c.setFillColor(TEXT_GRAY)
    c.setFont('Helvetica', 8)
    c.drawString(ml + 8*mm, y - 18*mm, employeur_adresse)
    c.drawString(ml + 8*mm, y - 23*mm, f"SIRET : {employeur_siret}  |  APE : {employeur_code_ape}  |  URSSAF : {employeur_urssaf}")
    c.drawString(ml + 8*mm, y - 28*mm, f"Convention collective : {employeur_convention}")

    c.setFillColor(ACCENT_LIGHT)
    c.setFont('Helvetica-Bold', 14)
    c.drawRightString(mr - 8*mm, y - 12*mm, 'BULLETIN DE PAIE')
    c.setFillColor(TEXT_WHITE)
    c.setFont('Helvetica-Bold', 11)
    c.drawRightString(mr - 8*mm, y - 20*mm, f'{mois} {annee}')

    ey = y - 34*mm
    c.setFillColor(TEXT_WHITE)
    c.setFont('Helvetica-Bold', 10)
    c.drawString(ml + 8*mm, ey, employe_nom)
    c.setFillColor(TEXT_LIGHT)
    c.setFont('Helvetica', 7.5)
    c.drawString(ml + 8*mm, ey - 5*mm, employe_adresse)
    c.drawString(ml + 8*mm, ey - 10*mm, f"N° Sécu : {employe_num_secu}")
    c.drawString(ml + 8*mm, ey - 15*mm, f"Emploi : {employe_poste}  |  Qualif. : {employe_qualification}  |  Éch. : {employe_echelon}")
    c.drawRightString(mr - 8*mm, ey, f"Embauche : {employe_date_embauche}")
    c.drawRightString(mr - 8*mm, ey - 5*mm, f"Ancienneté : {employe_anciennete}")
    c.drawRightString(mr - 8*mm, ey - 10*mm, f"Heures : {heures_travaillees:.2f}h")

    y -= 60*mm

    # ── BRUT ──
    brut_total = salaire_base + primes + heures_supp + avantages_nature

    c.setFillColor(HEADER_BG)
    c.roundRect(ml, y - 22*mm, cw, 22*mm, 4, fill=1, stroke=0)

    c.setFillColor(ACCENT)
    c.setFont('Helvetica-Bold', 9)
    c.drawString(ml + 5*mm, y - 5*mm, 'RÉMUNÉRATION BRUTE')

    items_brut = [('Salaire de base', f"{heures_travaillees:.2f}h", fmt_eur(salaire_base))]
    if heures_supp > 0: items_brut.append(('Heures supplémentaires', '', fmt_eur(heures_supp)))
    if primes > 0: items_brut.append(('Primes', '', fmt_eur(primes)))
    if avantages_nature > 0: items_brut.append(('Avantages en nature', '', fmt_eur(avantages_nature)))

    by = y - 10*mm
    c.setFont('Helvetica', 7.5)
    for label, detail, montant in items_brut:
        c.setFillColor(TEXT_LIGHT)
        c.drawString(ml + 8*mm, by, label)
        if detail:
            c.setFillColor(TEXT_GRAY)
            c.drawString(ml + 80*mm, by, detail)
        c.setFillColor(TEXT_WHITE)
        c.drawRightString(mr - 8*mm, by, montant)
        by -= 4*mm

    c.setFillColor(ACCENT_LIGHT)
    c.setFont('Helvetica-Bold', 9)
    c.drawRightString(mr - 8*mm, y - 19*mm, f"BRUT : {fmt_eur(brut_total)}")
    y -= 26*mm

    # ── COTISATIONS ──
    cotisations = get_cotisations(brut_total, statut, taux_at)

    # Ajouter mutuelle après CSA
    if mutuelle_salarie > 0 or mutuelle_employeur > 0:
        cotisations.insert(2, {
            'libelle': 'Complémentaire santé (mutuelle)',
            'base': 0, 'taux_sal': 0, 'taux_pat': 0,
            'montant_sal': mutuelle_salarie, 'montant_pat': mutuelle_employeur,
            'categorie': 'Santé',
        })

    total_sal = sum(x['montant_sal'] for x in cotisations)
    total_pat = sum(x['montant_pat'] for x in cotisations)

    c.setFillColor(ACCENT)
    c.setFont('Helvetica-Bold', 9)
    c.drawString(ml + 5*mm, y, 'COTISATIONS ET CONTRIBUTIONS SOCIALES')
    y -= 4*mm

    # Header row
    c.setFillColor(HEADER_BG)
    c.rect(ml, y - 6*mm, cw, 6*mm, fill=1, stroke=0)
    c.setFillColor(ACCENT_LIGHT)
    c.setFont('Helvetica-Bold', 6)
    c.drawString(ml + 3*mm, y - 4.5*mm, 'Cotisation')
    c.drawRightString(ml + 90*mm, y - 4.5*mm, 'Base')
    c.drawRightString(ml + 110*mm, y - 4.5*mm, 'Taux sal.')
    c.drawRightString(ml + 130*mm, y - 4.5*mm, 'Part salarié')
    c.drawRightString(ml + 150*mm, y - 4.5*mm, 'Taux pat.')
    c.drawRightString(mr - 5*mm, y - 4.5*mm, 'Part employeur')
    y -= 7*mm

    current_cat = ''
    row_idx = 0
    c.setFont('Helvetica', 6.5)

    for cot in cotisations:
        if y < 65*mm:
            c.showPage()
            c.setFillColor(DARK_BG)
            c.rect(0, 0, w, h, fill=1, stroke=0)
            y = h - 20*mm

        if cot['categorie'] != current_cat:
            current_cat = cot['categorie']
            c.setFillColor(HexColor('#1e293b'))
            c.rect(ml, y - 4.5*mm, cw, 4.5*mm, fill=1, stroke=0)
            c.setFillColor(BLUE)
            c.setFont('Helvetica-Bold', 6)
            c.drawString(ml + 3*mm, y - 3.5*mm, current_cat.upper())
            y -= 5*mm
            c.setFont('Helvetica', 6.5)

        if row_idx % 2 == 0:
            c.setFillColor(ROW_ALT)
            c.rect(ml, y - 4.5*mm, cw, 4.5*mm, fill=1, stroke=0)

        c.setFillColor(TEXT_LIGHT)
        c.drawString(ml + 3*mm, y - 3.5*mm, cot['libelle'])

        if cot['base'] > 0:
            c.setFillColor(TEXT_GRAY)
            c.drawRightString(ml + 90*mm, y - 3.5*mm, fmt_eur(cot['base']))

        if cot['taux_sal'] > 0:
            c.setFillColor(TEXT_GRAY)
            c.drawRightString(ml + 110*mm, y - 3.5*mm, fmt_pct(cot['taux_sal']))

        if cot['montant_sal'] > 0:
            c.setFillColor(ORANGE)
            c.drawRightString(ml + 130*mm, y - 3.5*mm, fmt_eur(cot['montant_sal']))

        if cot['taux_pat'] > 0:
            c.setFillColor(TEXT_GRAY)
            c.drawRightString(ml + 150*mm, y - 3.5*mm, fmt_pct(cot['taux_pat']))

        if cot['montant_pat'] > 0:
            c.setFillColor(RED)
            c.drawRightString(mr - 5*mm, y - 3.5*mm, fmt_eur(cot['montant_pat']))

        y -= 5*mm
        row_idx += 1

    # Total
    y -= 2*mm
    c.setFillColor(HEADER_BG)
    c.rect(ml, y - 7*mm, cw, 7*mm, fill=1, stroke=0)
    c.setFillColor(ACCENT_LIGHT)
    c.setFont('Helvetica-Bold', 7)
    c.drawString(ml + 3*mm, y - 5*mm, 'TOTAL COTISATIONS')
    c.setFillColor(ORANGE)
    c.setFont('Helvetica-Bold', 8)
    c.drawRightString(ml + 130*mm, y - 5*mm, fmt_eur(total_sal))
    c.setFillColor(RED)
    c.drawRightString(mr - 5*mm, y - 5*mm, fmt_eur(total_pat))
    y -= 12*mm

    # ── NET ──
    net_avant_impot = brut_total - total_sal
    csg_non_ded = next((x['montant_sal'] for x in cotisations if 'non déductible' in x['libelle'].lower()), 0)
    cotis_ded = sum(x['montant_sal'] for x in cotisations) - csg_non_ded
    net_imposable = brut_total - cotis_ded
    net_a_payer = net_avant_impot + transport_employeur + tickets_restaurant - avantages_nature
    cout_total = brut_total + total_pat

    c.setFillColor(HexColor('#0f3d0f'))
    c.roundRect(ml, y - 35*mm, cw, 35*mm, 6, fill=1, stroke=0)
    c.setStrokeColor(GREEN)
    c.setLineWidth(1.5)
    c.roundRect(ml, y - 35*mm, cw, 35*mm, 6, fill=0, stroke=1)

    ny = y - 5*mm
    c.setFillColor(TEXT_LIGHT)
    c.setFont('Helvetica', 7.5)
    c.drawString(ml + 8*mm, ny, 'Net avant impôt sur le revenu')
    c.setFillColor(TEXT_WHITE)
    c.setFont('Helvetica-Bold', 9)
    c.drawRightString(mr - 8*mm, ny, fmt_eur(net_avant_impot))
    ny -= 5*mm

    c.setFont('Helvetica', 7.5)
    c.setFillColor(TEXT_GRAY)
    c.drawString(ml + 8*mm, ny, 'Net imposable (base PAS)')
    c.drawRightString(mr - 8*mm, ny, fmt_eur(net_imposable))
    ny -= 5*mm

    if transport_employeur > 0:
        c.drawString(ml + 8*mm, ny, 'Remboursement transport (50% Navigo)')
        c.setFillColor(GREEN)
        c.drawRightString(mr - 8*mm, ny, f'+{fmt_eur(transport_employeur)}')
        ny -= 5*mm

    if tickets_restaurant > 0:
        c.setFillColor(TEXT_GRAY)
        c.drawString(ml + 8*mm, ny, 'Tickets restaurant (part employeur)')
        c.setFillColor(GREEN)
        c.drawRightString(mr - 8*mm, ny, f'+{fmt_eur(tickets_restaurant)}')
        ny -= 5*mm

    ny -= 2*mm
    c.setStrokeColor(GREEN)
    c.setLineWidth(0.5)
    c.line(ml + 8*mm, ny + 1*mm, mr - 8*mm, ny + 1*mm)
    ny -= 3*mm

    c.setFillColor(GREEN)
    c.setFont('Helvetica-Bold', 12)
    c.drawString(ml + 8*mm, ny, 'NET À PAYER')
    c.setFont('Helvetica-Bold', 14)
    c.drawRightString(mr - 8*mm, ny, fmt_eur(net_a_payer))
    y -= 40*mm

    # ── COÛT EMPLOYEUR ──
    c.setFillColor(HexColor('#1e293b'))
    c.roundRect(ml, y - 10*mm, cw, 10*mm, 4, fill=1, stroke=0)
    c.setFillColor(TEXT_GRAY)
    c.setFont('Helvetica', 7)
    c.drawString(ml + 5*mm, y - 4*mm, f'Charges patronales : {fmt_eur(total_pat)} ({total_pat/brut_total*100:.1f}% du brut)')
    c.setFillColor(RED)
    c.setFont('Helvetica-Bold', 9)
    c.drawRightString(mr - 5*mm, y - 4*mm, f'Coût total : {fmt_eur(cout_total)}')
    c.setFillColor(TEXT_GRAY)
    c.setFont('Helvetica', 7)
    c.drawString(ml + 5*mm, y - 8*mm, f'Coût total employeur (brut + charges patronales)')
    y -= 14*mm

    # ── MENTIONS LÉGALES ──
    c.setFillColor(TEXT_GRAY)
    c.setFont('Helvetica', 5.5)
    for line in [
        "Dans votre intérêt, conservez ce bulletin de paie sans limitation de durée (article L.3243-4 du Code du travail).",
        f"PMSS {annee}: {fmt_eur(PMSS)} | SMIC mensuel: {fmt_eur(SMIC)} | Taux AT/MP: {taux_at}%",
        f"Ce document est généré automatiquement par TalosPrimes SaaS — Période : {mois} {annee}",
    ]:
        c.drawString(ml + 3*mm, y, line)
        y -= 3.5*mm

    c.save()
    return output_path


if __name__ == '__main__':
    output = '/sessions/relaxed-optimistic-ride/mnt/talosprimes/exemple_fiche_paie.pdf'
    generate_fiche_paie(
        output_path=output,
        employe_nom='Cyril MEDDE',
        employe_adresse='Paris, France',
        employe_num_secu='1 90 01 75 001 001 01',
        employe_poste='Dirigeant / CEO',
        employe_qualification='Cadre dirigeant',
        employe_echelon='Hors classification',
        employe_date_embauche='01/01/2025',
        employe_anciennete='1 an 3 mois',
        mois='Mars', annee=2026,
        salaire_base=3500, primes=200,
        statut='cadre', taux_at=1.13,
        mutuelle_employeur=35, mutuelle_salarie=25,
        transport_employeur=43.75,
    )
    print(f"OK: {output} ({os.path.getsize(output)} bytes)")
