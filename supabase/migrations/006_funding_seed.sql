-- ================================================================
-- FUNDING PROGRAMS SEED — Saudi & UAE Market
-- ================================================================
INSERT INTO funding_programs (name_ar, name_en, provider_ar, type, country, sectors, org_sizes, max_funding_sar, equity_required, description_ar, requirements_ar, benefits_ar, website_url, is_vision2030) VALUES

-- Government Programs
('برنامج كفالة','Kafalah Program','صندوق المئوية',
 'government','SA',ARRAY['all'],ARRAY['1-10','11-50'],
 5000000,FALSE,
 'برنامج كفالة القروض للمنشآت الصغيرة والمتوسطة من خلال ضمان 80% من قيمة التمويل',
 ARRAY['منشأة سعودية مسجلة','سجل تجاري ساري','لا يقل عن سنة من التشغيل'],
 ARRAY['ضمان 80% من قيمة القرض','معدلات فائدة تنافسية','فترة سماح تصل إلى سنة'],
 'https://kafalah.sa',TRUE),

('منح صندوق ريادة الأعمال','Entrepreneurship Fund Grant','وزارة الموارد البشرية',
 'grant','SA',ARRAY['technology','consulting','manufacturing'],ARRAY['1-10','11-50'],
 500000,FALSE,
 'منح مالية لدعم رواد الأعمال السعوديين في مراحل التأسيس والانطلاق',
 ARRAY['مؤسس سعودي الجنسية','عمر لا يتجاوز 40 سنة','فكرة أعمال مبتكرة'],
 ARRAY['منحة بدون سداد تصل إلى 500,000 ريال','دعم توجيهي وتدريب','شبكة علاقات'],
 'https://hrsd.gov.sa',TRUE),

('برنامج نمو للمنشآت المتوسطة','Numou Program','البنك الأهلي السعودي',
 'loan','SA',ARRAY['retail','manufacturing','services'],ARRAY['51-200','201+'],
 30000000,FALSE,
 'تمويل لدعم توسع المنشآت المتوسطة وتطوير عملياتها',
 ARRAY['إيرادات سنوية تتجاوز 5 مليون ريال','سنتان من التشغيل','ملف ائتماني جيد'],
 ARRAY['تمويل يصل إلى 30 مليون ريال','سداد مريح حتى 7 سنوات','بدون ضمانات عقارية'],
 'https://alahli.com',FALSE),

-- Accelerators
('مسرع Flat6Labs الرياض','Flat6Labs Riyadh','Flat6Labs',
 'accelerator','SA',ARRAY['technology','fintech','healthtech'],ARRAY['1-10'],
 375000,TRUE,8,
 'برنامج مسرع للشركات الناشئة في المراحل المبكرة مع تمويل واستثمار',
 ARRAY['منتج أو نموذج عمل واضح','فريق مؤسس قوي','حل لمشكلة حقيقية'],
 ARRAY['تمويل أولي 100,000 دولار','برنامج تدريبي مكثف 4 أشهر','وصول لشبكة مستثمرين'],
 'https://flat6labs.com/riyadh',TRUE),

('مسرع STV','STV Accelerator','Saudi Technology Ventures',
 'vc','SA',ARRAY['technology','saas','fintech'],ARRAY['1-10','11-50'],
 3750000,TRUE,15,
 'صندوق رأس مال مخاطر متخصص في الشركات التقنية السعودية',
 ARRAY['منتج رقمي أو تقني','فريق مؤسس متكامل','نموذج عمل قابل للتوسع'],
 ARRAY['استثمار يصل إلى 1 مليون دولار','خبرة في السوق السعودي','شبكة توزيع واسعة'],
 'https://stv.vc',TRUE),

-- Incubators
('حاضنة جامعة الملك عبدالله KAUST','KAUST Innovation','جامعة الملك عبدالله للعلوم',
 'incubator','SA',ARRAY['technology','energy','healthcare','manufacturing'],ARRAY['1-10'],
 750000,FALSE,
 'حاضنة متخصصة في نقل التقنية وتطوير الشركات المبنية على البحث والتطوير',
 ARRAY['ارتباط بالبحث التقني','مؤسس أكاديمي أو شريك أكاديمي','تقنية ابتكارية'],
 ARRAY['مكاتب مجهزة في كاوست','دعم براءات الاختراع','وصول لمختبرات متطورة'],
 'https://innovation.kaust.edu.sa',TRUE),

('حاضنة Badir للتقنية','Badir Incubator','مدينة الملك عبدالعزيز للعلوم والتقنية',
 'incubator','SA',ARRAY['technology','software','ict'],ARRAY['1-10','11-50'],
 375000,FALSE,
 'حاضنة تقنية تدعم الشركات الناشئة في مجال تقنية المعلومات والاتصالات',
 ARRAY['شركة تقنية سعودية','فريق مؤسسين سعودي','نموذج أعمال تقني'],
 ARRAY['مكاتب مجهزة','برنامج تدريبي متخصص','تمويل أولي حتى 100,000 ريال'],
 'https://badir.com.sa',TRUE),

-- UAE Programs (for cross-market)
('مبادرة المليون مبرمج','Million Programmer Initiative','مكتب دبي للمستقبل',
 'government','AE',ARRAY['technology','software'],ARRAY['1-10','11-50'],
 NULL,FALSE,
 'مبادرة حكومية إماراتية لدعم شركات التقنية وتطوير الكفاءات الرقمية',
 ARRAY['شركة مسجلة في الإمارات','تركيز على البرمجة والتقنية'],
 ARRAY['برامج تدريبية مجانية','شبكة شراكات','دعم تسويقي'],
 'https://dubaifuture.ae',FALSE),

('صندوق الابتكار في DIFC','DIFC Innovation Fund','مركز دبي المالي العالمي',
 'grant','AE',ARRAY['fintech','regtech','insurtech'],ARRAY['1-10','11-50'],
 750000,FALSE,
 'منح للشركات المالية التقنية المسجلة في مركز دبي المالي',
 ARRAY['مسجلة في DIFC','حل في مجال التمويل التقني','تجاوز التحقق من النموذج'],
 ARRAY['منحة تصل إلى 200,000 دولار','ترخيص تنظيمي مسرّع','وصول لبنوك المركز'],
 'https://difc.ae',FALSE),

-- Banks & Financial
('التمويل الأخضر سامبا','Green Finance','سامبا المالية',
 'bank','SA',ARRAY['energy','construction','manufacturing'],ARRAY['11-50','51-200','201+'],
 75000000,FALSE,
 'تمويل مخصص للمشاريع الصديقة للبيئة وتحقيق أهداف الاستدامة',
 ARRAY['مشروع له تأثير بيئي إيجابي','دراسة جدوى معتمدة','ضمانات كافية'],
 ARRAY['معدل ربح تفضيلي','مدة تمويل تصل إلى 15 سنة','تقرير أثر بيئي'],
 'https://samba.com',TRUE)
ON CONFLICT DO NOTHING;