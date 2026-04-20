import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type SupplierInfo = {
  title: string;
  name?: string | null;
  address?: string | null;
  zip?: string | null;
  city?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
};

export type PdfLine = {
  ingredient_name: string;
  uvc_label: string | null;
  uvc_quantity: number;
  quantity_uvc: number;
  unit: string;
  cost_per_unit: number;
};

export type PdfOrder = {
  id: string;
  date: Date;
  supplier: SupplierInfo;
  items: PdfLine[];
  total: number;
  notes?: string | null;
};

export function generatePurchaseOrderPdf(order: PdfOrder): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  // ---- En-tête JDC ----
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('JDC Distribution', margin, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Bon de commande fournisseur', margin, y);
  doc.setTextColor(0);

  // ---- Numéro / date ----
  const shortId = order.id.slice(0, 8).toUpperCase();
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`N° BC-${shortId}`, pageW - margin, margin, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Date : ${order.date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
    pageW - margin,
    margin + 5,
    { align: 'right' }
  );

  y += 12;

  // ---- Bloc fournisseur ----
  doc.setDrawColor(220);
  doc.setFillColor(245, 245, 240);
  doc.roundedRect(margin, y, pageW - margin * 2, 32, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text('FOURNISSEUR', margin + 4, y + 5);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(order.supplier.title, margin + 4, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  let supY = y + 16;
  if (order.supplier.name) {
    doc.text(order.supplier.name, margin + 4, supY);
    supY += 4;
  }
  if (order.supplier.address) {
    doc.text(order.supplier.address, margin + 4, supY);
    supY += 4;
  }
  const cityLine = [order.supplier.zip, order.supplier.city].filter(Boolean).join(' ');
  if (cityLine) {
    doc.text(cityLine, margin + 4, supY);
    supY += 4;
  }
  const contactParts = [
    order.supplier.phone && `Tél : ${order.supplier.phone}`,
    order.supplier.mobile && `Mob : ${order.supplier.mobile}`,
    order.supplier.email && `Email : ${order.supplier.email}`,
  ].filter(Boolean) as string[];
  if (contactParts.length > 0) {
    doc.text(contactParts.join('  ·  '), margin + 4, supY);
  }

  y += 38;

  // ---- Tableau des lignes ----
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Ingrédient', 'UVC', 'Qté UVC', 'Qté totale', 'PU (€)', 'Total (€)']],
    body: order.items.map((it) => {
      const baseQty = it.quantity_uvc * it.uvc_quantity;
      const lineTotal = baseQty * it.cost_per_unit;
      return [
        it.ingredient_name,
        it.uvc_label || '—',
        String(it.quantity_uvc),
        `${baseQty.toFixed(2)} ${it.unit}`,
        it.cost_per_unit.toFixed(4),
        lineTotal.toFixed(2),
      ];
    }),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [60, 80, 60], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' },
    },
  });

  // ---- Total ----
  const finalY = (doc as any).lastAutoTable?.finalY || y + 50;
  const totalY = finalY + 8;
  doc.setDrawColor(60, 80, 60);
  doc.setLineWidth(0.5);
  doc.line(pageW - margin - 70, totalY, pageW - margin, totalY);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Total commande :', pageW - margin - 70, totalY + 6);
  doc.text(`${order.total.toFixed(2)} €`, pageW - margin, totalY + 6, { align: 'right' });

  // ---- Notes ----
  if (order.notes) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text('Notes :', margin, totalY + 18);
    const wrapped = doc.splitTextToSize(order.notes, pageW - margin * 2);
    doc.text(wrapped, margin, totalY + 23);
    doc.setTextColor(0);
  }

  // ---- Footer ----
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    `Bon de commande généré le ${new Date().toLocaleString('fr-FR')} — JDC Distribution`,
    pageW / 2,
    pageH - 8,
    { align: 'center' }
  );

  return doc;
}

export function downloadPurchaseOrderPdf(order: PdfOrder) {
  const doc = generatePurchaseOrderPdf(order);
  const shortId = order.id.slice(0, 8).toUpperCase();
  const dateStr = order.date.toISOString().slice(0, 10);
  doc.save(`BC-${shortId}-${order.supplier.title.replace(/[^a-z0-9]/gi, '_')}-${dateStr}.pdf`);
}
