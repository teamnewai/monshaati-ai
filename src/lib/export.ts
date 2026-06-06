import type { ExportData } from '@/types/database';

// ----------------------------------------------------------------
// PDF Export — dynamic import (client-side only)
// ----------------------------------------------------------------
export async function exportToPDF(data: ExportData): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  let y = 20;

  const newPage = () => { doc.addPage(); y = 20; };
  const check = (h: number) => { if (y + h > 275) newPage(); };

  // ── Header ───────────────────────────────────────────────────
  doc.setFillColor(26, 26, 46);
  doc.rect(0, 0, W, 42, 'F');
  doc.setTextColor(200, 168, 75);
  doc.setFontSize(18);
  doc.text('Monshaati AI', W / 2, 16, { align: 'center' });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text('نظام التشغيل الذكي للمنشآت', W / 2, 26, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 200);
  doc.text(
    `${data.orgName} | ${data.city}, ${data.country} | ${new Date().toLocaleDateString('ar-SA')}`,
    W / 2, 36, { align: 'center' }
  );
  y = 52;

  const section = (title: string, rgb: [number, number, number] = [26, 26, 46]) => {
    check(16);
    doc.setFillColor(...rgb);
    doc.rect(15, y - 5, W - 30, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 20, y + 1.5);
    y += 12;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
  };

  // ── Org info ─────────────────────────────────────────────────
  section('معلومات المنشأة', [30, 80, 150]);
  ([
    ['الاسم', data.orgName],
    ['النشاط', data.primaryActivity],
    ['الموظفون', data.employeeCount],
    ['الموقع', `${data.city}, ${data.country}`],
  ] as [string, string][]).forEach(([k, v]) => {
    doc.text(`${k}: ${v}`, 20, y);
    y += 6;
  });
  y += 4;

  // ── Org chart ─────────────────────────────────────────────────
  section('الهيكل التنظيمي', [26, 26, 46]);
  const byLevel: Record<number, typeof data.nodes> = {};
  data.nodes.forEach(n => {
    if (!byLevel[n.level]) byLevel[n.level] = [];
    byLevel[n.level].push(n);
  });
  Object.entries(byLevel).forEach(([lvl, nodes]) => {
    check(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`المستوى ${lvl}:`, 20, y);
    doc.setFont('helvetica', 'normal');
    y += 5;
    nodes.forEach(n => {
      check(8);
      doc.text(
        `   • ${n.title_ar}  ${n.title_en ? '| ' + n.title_en : ''}  ${n.department_ar ? '| ' + n.department_ar : ''} (${n.head_count})`,
        20, y
      );
      y += 5;
    });
    y += 2;
  });

  // ── Job descriptions ──────────────────────────────────────────
  section('الأوصاف الوظيفية', [26, 80, 46]);
  data.jds.slice(0, 8).forEach(jd => {
    check(30);
    doc.setFillColor(245, 247, 250);
    doc.rect(17, y - 3, W - 34, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`${jd.title_ar} | ${jd.title_en ?? ''}`, 20, y + 2.5);
    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    if (jd.department_ar) { doc.text(`القسم: ${jd.department_ar}`, 22, y); y += 5; }
    if (jd.salary_min) {
      doc.text(`الراتب: ${jd.salary_min.toLocaleString()}–${jd.salary_max?.toLocaleString() ?? ''} ${jd.currency}`, 22, y);
      y += 5;
    }
    if (jd.responsibilities?.length) {
      doc.setFont('helvetica', 'bold');
      doc.text('المسؤوليات:', 22, y);
      doc.setFont('helvetica', 'normal');
      y += 4;
      jd.responsibilities.slice(0, 4).forEach(r => {
        check(6);
        const lines = doc.splitTextToSize(`• ${r}`, W - 50) as string[];
        doc.text(lines, 26, y);
        y += lines.length * 4.5;
      });
    }
    y += 5;
  });

  // ── KPIs ──────────────────────────────────────────────────────
  newPage();
  section('مؤشرات الأداء الرئيسية (KPIs)', [80, 26, 120]);
  data.kpis.forEach(k => {
    check(8);
    doc.text(
      `• ${k.name_ar} ${k.name_en ? '| ' + k.name_en : ''} — الهدف: ${k.target_value ?? '—'} ${k.unit ?? ''} (${k.frequency})`,
      20, y
    );
    y += 6;
  });

  // ── Hiring plan ───────────────────────────────────────────────
  check(16);
  section('خطة التوظيف', [26, 100, 130]);
  data.hiring.forEach(h => {
    check(10);
    const badge = h.priority === 'high' ? '[عاجل]' : h.priority === 'low' ? '[منخفض]' : '[متوسط]';
    doc.text(`${badge} ${h.role_ar} | ${h.department_ar ?? ''} | ${h.timeline ?? ''}`, 20, y);
    y += 5;
    if (h.salary_min) {
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`   الراتب: ${h.salary_min.toLocaleString()}–${h.salary_max?.toLocaleString() ?? ''} ${h.currency}`, 22, y);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      y += 4;
    }
    y += 2;
  });

  // ── Policies ──────────────────────────────────────────────────
  newPage();
  section('السياسات والإجراءات', [120, 26, 60]);
  data.policies.forEach(p => {
    check(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`${p.title_ar}  [${p.category}]`, 20, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const lines = doc.splitTextToSize(p.content_ar, W - 40) as string[];
    const shown = lines.slice(0, 8);
    doc.text(shown, 22, y);
    y += shown.length * 4.5 + 4;
  });

  // ── Footer on all pages ───────────────────────────────────────
  // Use getNumberOfPages() — supported in jsPDF 2.x
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text(
      `Monshaati AI | منشأتي AI | ${data.orgName} | صفحة ${i}/${totalPages}`,
      W / 2, 290, { align: 'center' }
    );
  }

  doc.save(`monshaati-${data.orgName}-${Date.now()}.pdf`);
}

// ----------------------------------------------------------------
// Word / Text Export
// ----------------------------------------------------------------
export function exportToWord(data: ExportData): void {
  const hr = '='.repeat(60);
  const div = '-'.repeat(40);
  const exportId = `EXP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  const exportDate = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });

  const content = [
    hr,
    '© منشأتي AI — جميع الحقوق محفوظة',
    `معرّف التصدير: ${exportId} | تاريخ: ${exportDate}`,
    'هذه الوثيقة مُنشأة بواسطة منشأتي AI وتخضع لقوانين الملكية الفكرية.',
    'يُحظر نسخها أو توزيعها أو استخدامها تجارياً بدون إذن خطي.',
    hr,
    '',
    'MONSHAATI AI — نظام التشغيل الذكي للمنشآت',
    hr,
    '',
    `المنشأة: ${data.orgName}`,
    `النشاط: ${data.primaryActivity}`,
    `الموظفون: ${data.employeeCount}`,
    `الموقع: ${data.city}، ${data.country}`,
    `التاريخ: ${new Date().toLocaleDateString('ar-SA')}`,
    '',
    hr,
    'الهيكل التنظيمي',
    hr,
    ...data.nodes.map(n =>
      `${'  '.repeat(n.level)}• ${n.title_ar} | ${n.title_en ?? ''} | ${n.department_ar ?? ''} (${n.head_count})`
    ),
    '',
    hr,
    'الأوصاف الوظيفية',
    hr,
    ...data.jds.flatMap(jd => [
      '',
      `${jd.title_ar} | ${jd.title_en ?? ''}`,
      div,
      jd.department_ar  ? `القسم: ${jd.department_ar}` : '',
      jd.salary_min     ? `الراتب: ${jd.salary_min.toLocaleString()}–${jd.salary_max?.toLocaleString() ?? ''} ${jd.currency}` : '',
      jd.reports_to_ar  ? `يرفع لـ: ${jd.reports_to_ar}` : '',
      jd.summary_ar     ? `\nالملخص:\n${jd.summary_ar}` : '',
      jd.responsibilities.length ? `\nالمسؤوليات:\n${jd.responsibilities.map(r => `  - ${r}`).join('\n')}` : '',
      jd.requirements.length    ? `\nالمتطلبات:\n${jd.requirements.map(r => `  - ${r}`).join('\n')}` : '',
      jd.competencies.length    ? `\nالكفاءات:\n${jd.competencies.map(c => `  - ${c}`).join('\n')}` : '',
      jd.authorities.length     ? `\nالصلاحيات:\n${jd.authorities.map(a => `  - ${a}`).join('\n')}` : '',
    ]).filter(Boolean),
    '',
    hr,
    'السياسات والإجراءات',
    hr,
    ...data.policies.flatMap(p => ['', `${p.title_ar}  [${p.category}]`, div, p.content_ar]),
    '',
    hr,
    'مؤشرات الأداء الرئيسية (KPIs)',
    hr,
    ...data.kpis.map(k =>
      `• ${k.name_ar} | الهدف: ${k.target_value ?? '—'} ${k.unit ?? ''} | ${k.frequency} | ${k.category ?? ''}`
    ),
    '',
    hr,
    'خطة التوظيف',
    hr,
    ...data.hiring.map(h =>
      `[${h.priority}] ${h.role_ar} | ${h.department_ar ?? ''} | ${h.timeline ?? ''}\n   المتطلبات: ${h.requirements.join('، ')}`
    ),
    '',
    hr,
    'Generated by Monshaati AI | منشأتي AI',
    hr,
  ].join('\n');

  const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `monshaati-${data.orgName}-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
