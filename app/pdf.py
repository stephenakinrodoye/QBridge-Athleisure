from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from io import BytesIO
from typing import Dict, Any, List

def build_packing_slip(order_id: int, ship_to: Dict[str, Any], items: List[Dict[str, Any]]) -> bytes:
    """Very simple packing slip PDF."""
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    width, height = letter

    y = height - 50
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, y, f"Packing Slip - Order #{order_id}")
    y -= 30

    c.setFont("Helvetica", 10)
    c.drawString(50, y, "Ship To:")
    y -= 14
    for line in [
        ship_to.get("name",""),
        ship_to.get("line1",""),
        ship_to.get("line2",""),
        f"{ship_to.get('city','')}, {ship_to.get('province','')} {ship_to.get('postal_code','')}",
        ship_to.get("country","Canada"),
    ]:
        if line:
            c.drawString(70, y, str(line))
            y -= 12

    y -= 10
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y, "Items")
    y -= 16
    c.setFont("Helvetica", 10)
    for it in items:
        line = f"{it.get('qty',0)} x {it.get('sku_code','')}  {it.get('title','')}"
        c.drawString(50, y, line[:110])
        y -= 12
        if y < 80:
            c.showPage()
            y = height - 60

    c.showPage()
    c.save()
    return buf.getvalue()
