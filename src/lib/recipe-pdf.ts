import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type RecipePdfIngredient = {
  name: string;
  quantity: number;
  unit: string;
  is_super?: boolean;
};

export type RecipePdfStep = {
  step_number: number;
  instruction: string;
  duration_minutes?: number | null;
};

export type RecipePdfData = {
  title: string;
  category?: string | null;
  yield_quantity: number;
  yield_unit: string;
  prep_time_minutes?: number | null;
  cook_time_minutes?: number | null;
  ingredients: RecipePdfIngredient[];
  steps: RecipePdfStep[];
  notes?: string | null;
};

export type SuperIngredientPdfData = {
  title: string;
  yield_quantity: number;
  yield_unit: string;
  components: RecipePdfIngredient[];
};

function header(doc: jsPDF, kicker: string, title: string) {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.text('JDC Distribution', margin, margin);
  doc.text(kicker, pageW - margin, margin, { align: 'right' });

  doc.setTextColor(0);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, margin + 10);

  doc.setDrawColor(60, 80, 60);
  doc.setLineWidth(0.6);
  doc.line(margin, margin + 14, pageW - margin, margin + 14);

  return margin + 20;
}

function footer(doc: jsPDF) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    `Imprimé le ${new Date().toLocaleString('fr-FR')} — JDC Distribution`,
    pageW / 2,
    pageH - 8,
    { align: 'center' },
  );
  doc.setTextColor(0);
}

export function generateRecipePdf(data: RecipePdfData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;

  let y = header(doc, 'Fiche technique cuisine', data.title);

  // Infos clés
  const infos: string[] = [];
  infos.push(`Rendement : ${data.yield_quantity} ${data.yield_unit}`);
  if (data.prep_time_minutes) infos.push(`Préparation : ${data.prep_time_minutes} min`);
  if (data.cook_time_minutes) infos.push(`Cuisson : ${data.cook_time_minutes} min`);
  if (data.category) infos.push(`Catégorie : ${data.category}`);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  doc.text(infos.join('   ·   '), margin, y);
  doc.setTextColor(0);
  y += 6;

  // Ingrédients
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Ingrédients', margin, y + 4);
  y += 6;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Ingrédient', 'Quantité']],
    body: data.ingredients.map((i) => [
      `${i.is_super ? '★ ' : ''}${i.name}`,
      `${i.quantity} ${i.unit}`,
    ]),
    styles: { fontSize: 11, cellPadding: 3 },
    headStyles: { fillColor: [60, 80, 60], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      1: { halign: 'right', cellWidth: 45, fontStyle: 'bold' },
    },
  });

  y = (doc as any).lastAutoTable?.finalY ?? y;
  y += 10;

  // Étapes
  if (data.steps.length > 0) {
    if (y > 240) { doc.addPage(); y = margin; }
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Étapes de préparation', margin, y);
    y += 6;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    data.steps.forEach((step) => {
      const text = `${step.step_number}. ${step.instruction}${
        step.duration_minutes ? `  (${step.duration_minutes} min)` : ''
      }`;
      const wrapped = doc.splitTextToSize(text, pageW - margin * 2);
      const blockH = wrapped.length * 5 + 3;
      if (y + blockH > 280) { doc.addPage(); y = margin; }
      doc.text(wrapped, margin, y);
      y += blockH;
    });
  }

  // Notes
  if (data.notes) {
    y += 4;
    if (y > 260) { doc.addPage(); y = margin; }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const wrapped = doc.splitTextToSize(data.notes, pageW - margin * 2);
    doc.text(wrapped, margin, y);
  }

  footer(doc);
  return doc;
}

export function downloadRecipePdf(data: RecipePdfData) {
  const doc = generateRecipePdf(data);
  const safe = data.title.replace(/[^a-z0-9]/gi, '_');
  doc.save(`Recette-${safe}.pdf`);
}

export function generateSuperIngredientPdf(data: SuperIngredientPdfData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 15;

  let y = header(doc, 'Fiche technique préparation', data.title);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  doc.text(`Rendement : ${data.yield_quantity} ${data.yield_unit}`, margin, y);
  doc.setTextColor(0);
  y += 8;

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Composants', margin, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Composant', 'Quantité']],
    body: data.components.map((c) => [
      `${c.is_super ? '★ ' : ''}${c.name}`,
      `${c.quantity} ${c.unit}`,
    ]),
    styles: { fontSize: 11, cellPadding: 3 },
    headStyles: { fillColor: [60, 80, 60], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      1: { halign: 'right', cellWidth: 45, fontStyle: 'bold' },
    },
  });

  footer(doc);
  return doc;
}

export function downloadSuperIngredientPdf(data: SuperIngredientPdfData) {
  const doc = generateSuperIngredientPdf(data);
  const safe = data.title.replace(/[^a-z0-9]/gi, '_');
  doc.save(`FT-${safe}.pdf`);
}
