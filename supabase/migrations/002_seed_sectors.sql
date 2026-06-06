-- ================================================================
-- SEED DATA: Saudi & UAE Sectors (ISIC Rev.4 aligned)
-- ================================================================

INSERT INTO sectors (isic_code, name_ar, name_en, level, sort_order) VALUES
-- Level 1: Main sectors
('A', 'الزراعة والصيد وتربية الحيوانات', 'Agriculture, Forestry & Fishing', 1, 1),
('B', 'التعدين واستخراج المعادن', 'Mining & Quarrying', 1, 2),
('C', 'التصنيع والإنتاج', 'Manufacturing', 1, 3),
('D', 'إمدادات الكهرباء والغاز والبخار', 'Electricity, Gas & Steam Supply', 1, 4),
('E', 'إمدادات المياه وإدارة النفايات', 'Water Supply & Waste Management', 1, 5),
('F', 'البناء والإنشاء والمقاولات', 'Construction', 1, 6),
('G', 'تجارة الجملة والتجزئة', 'Wholesale & Retail Trade', 1, 7),
('H', 'النقل والتخزين واللوجستيات', 'Transportation & Storage', 1, 8),
('I', 'الضيافة والفنادق والمطاعم', 'Accommodation & Food Services', 1, 9),
('J', 'المعلومات والاتصالات والتقنية', 'Information & Communication Technology', 1, 10),
('K', 'الخدمات المالية والمصرفية والتأمين', 'Financial & Insurance Activities', 1, 11),
('L', 'العقارات والإيجارات', 'Real Estate Activities', 1, 12),
('M', 'الأنشطة المهنية والعلمية والتقنية', 'Professional, Scientific & Technical', 1, 13),
('N', 'الأنشطة الإدارية وخدمات الأعمال', 'Administrative & Business Support', 1, 14),
('O', 'الإدارة الحكومية والدفاع', 'Public Administration & Defence', 1, 15),
('P', 'التعليم والتدريب والتطوير', 'Education & Training', 1, 16),
('Q', 'الرعاية الصحية والخدمات الاجتماعية', 'Health & Social Work', 1, 17),
('R', 'الفنون والترفيه والترويح', 'Arts, Entertainment & Recreation', 1, 18),
('S', 'أنشطة الخدمات الأخرى', 'Other Service Activities', 1, 19),
('T', 'أنشطة الأسر المعيشية كأصحاب عمل', 'Household Activities as Employers', 1, 20),
('U', 'أنشطة الهيئات الدولية والأجنبية', 'International & Foreign Bodies', 1, 21)
ON CONFLICT (isic_code) DO NOTHING;

-- Level 2: Sub-sectors for Saudi market (most common)
WITH parent_j AS (SELECT id FROM sectors WHERE isic_code = 'J')
INSERT INTO sectors (isic_code, name_ar, name_en, parent_id, level, sort_order)
SELECT code, name_ar, name_en, parent_j.id, 2, ord FROM parent_j, (VALUES
  ('J61', 'خدمات الاتصالات والانترنت', 'Telecommunications', 1),
  ('J62', 'برمجة الحاسوب والاستشارات التقنية', 'Computer Programming & IT Consulting', 2),
  ('J63', 'خدمات المعلومات والمنصات الرقمية', 'Information Services & Digital Platforms', 3),
  ('J64', 'الأمن السيبراني وحماية البيانات', 'Cybersecurity & Data Protection', 4),
  ('J65', 'الذكاء الاصطناعي والتعلم الآلي', 'AI & Machine Learning', 5),
  ('J66', 'تطوير تطبيقات الجوال', 'Mobile App Development', 6),
  ('J67', 'الحلول السحابية والبنية التحتية', 'Cloud Solutions & Infrastructure', 7)
) AS t(code, name_ar, name_en, ord)
ON CONFLICT (isic_code) DO NOTHING;

WITH parent_k AS (SELECT id FROM sectors WHERE isic_code = 'K')
INSERT INTO sectors (isic_code, name_ar, name_en, parent_id, level, sort_order)
SELECT code, name_ar, name_en, parent_k.id, 2, ord FROM parent_k, (VALUES
  ('K64', 'البنوك والخدمات المصرفية', 'Banking & Financial Services', 1),
  ('K65', 'التأمين وإعادة التأمين', 'Insurance & Reinsurance', 2),
  ('K66', 'صناديق الاستثمار وإدارة الأصول', 'Investment Funds & Asset Management', 3),
  ('K67', 'التكنولوجيا المالية (فينتك)', 'Financial Technology (FinTech)', 4),
  ('K68', 'الصرافة وتحويل الأموال', 'Currency Exchange & Money Transfer', 5)
) AS t(code, name_ar, name_en, ord)
ON CONFLICT (isic_code) DO NOTHING;

WITH parent_m AS (SELECT id FROM sectors WHERE isic_code = 'M')
INSERT INTO sectors (isic_code, name_ar, name_en, parent_id, level, sort_order)
SELECT code, name_ar, name_en, parent_m.id, 2, ord FROM parent_m, (VALUES
  ('M69', 'الأنشطة القانونية والمحاماة', 'Legal Activities', 1),
  ('M70', 'الاستشارات الإدارية والتنظيمية', 'Management Consulting', 2),
  ('M71', 'الهندسة المعمارية والتقنية', 'Architecture & Engineering', 3),
  ('M72', 'البحث والتطوير والابتكار', 'Research & Development', 4),
  ('M73', 'الإعلان والتسويق والعلاقات العامة', 'Advertising & Marketing', 5),
  ('M74', 'الاستشارات المالية والمحاسبة', 'Financial Consulting & Accounting', 6),
  ('M75', 'الاستشارات الموارد البشرية', 'HR Consulting', 7)
) AS t(code, name_ar, name_en, ord)
ON CONFLICT (isic_code) DO NOTHING;

WITH parent_p AS (SELECT id FROM sectors WHERE isic_code = 'P')
INSERT INTO sectors (isic_code, name_ar, name_en, parent_id, level, sort_order)
SELECT code, name_ar, name_en, parent_p.id, 2, ord FROM parent_p, (VALUES
  ('P85', 'التعليم قبل الجامعي والمدارس', 'Pre-university & School Education', 1),
  ('P851', 'التعليم الجامعي والأكاديمي', 'University & Higher Education', 2),
  ('P852', 'التدريب والتطوير المهني', 'Professional Training & Development', 3),
  ('P853', 'التعليم الإلكتروني والمنصات التعليمية', 'E-learning & EdTech Platforms', 4),
  ('P854', 'تعليم اللغات والترجمة', 'Language Education & Translation', 5)
) AS t(code, name_ar, name_en, ord)
ON CONFLICT (isic_code) DO NOTHING;

WITH parent_q AS (SELECT id FROM sectors WHERE isic_code = 'Q')
INSERT INTO sectors (isic_code, name_ar, name_en, parent_id, level, sort_order)
SELECT code, name_ar, name_en, parent_q.id, 2, ord FROM parent_q, (VALUES
  ('Q86', 'المستشفيات والعيادات الطبية', 'Hospitals & Medical Clinics', 1),
  ('Q87', 'الرعاية التمريضية والرعاية المنزلية', 'Nursing & Home Care', 2),
  ('Q88', 'الصيدليات والأدوية', 'Pharmacies & Pharmaceuticals', 3),
  ('Q89', 'الصحة النفسية والعلاج النفسي', 'Mental Health & Therapy', 4),
  ('Q90', 'الأجهزة والمعدات الطبية', 'Medical Devices & Equipment', 5),
  ('Q91', 'تقنية الصحة الرقمية (هيلث تك)', 'Health Technology (HealthTech)', 6)
) AS t(code, name_ar, name_en, ord)
ON CONFLICT (isic_code) DO NOTHING;

WITH parent_g AS (SELECT id FROM sectors WHERE isic_code = 'G')
INSERT INTO sectors (isic_code, name_ar, name_en, parent_id, level, sort_order)
SELECT code, name_ar, name_en, parent_g.id, 2, ord FROM parent_g, (VALUES
  ('G45', 'بيع السيارات وقطع الغيار', 'Motor Vehicle Trade', 1),
  ('G46', 'تجارة الجملة غير المتخصصة', 'Non-specialized Wholesale', 2),
  ('G47', 'تجارة التجزئة والمتاجر', 'Retail Trade & Stores', 3),
  ('G471', 'التجارة الإلكترونية والتسوق الرقمي', 'E-commerce & Digital Shopping', 4),
  ('G472', 'توزيع المواد الغذائية والبقالة', 'Food & Grocery Distribution', 5),
  ('G473', 'تجارة الأزياء والملابس', 'Fashion & Apparel Trade', 6)
) AS t(code, name_ar, name_en, ord)
ON CONFLICT (isic_code) DO NOTHING;

WITH parent_f AS (SELECT id FROM sectors WHERE isic_code = 'F')
INSERT INTO sectors (isic_code, name_ar, name_en, parent_id, level, sort_order)
SELECT code, name_ar, name_en, parent_f.id, 2, ord FROM parent_f, (VALUES
  ('F41', 'إنشاء المباني والمجمعات السكنية', 'Building Construction & Residential', 1),
  ('F42', 'إنشاء الطرق والبنية التحتية', 'Roads & Infrastructure', 2),
  ('F43', 'أعمال التشطيب والديكور الداخلي', 'Finishing & Interior Design', 3),
  ('F44', 'المقاولات الميكانيكية والكهربائية', 'Mechanical & Electrical Contracting', 4),
  ('F45', 'إدارة المرافق والتشغيل والصيانة', 'Facilities Management & Maintenance', 5)
) AS t(code, name_ar, name_en, ord)
ON CONFLICT (isic_code) DO NOTHING;

WITH parent_i AS (SELECT id FROM sectors WHERE isic_code = 'I')
INSERT INTO sectors (isic_code, name_ar, name_en, parent_id, level, sort_order)
SELECT code, name_ar, name_en, parent_i.id, 2, ord FROM parent_i, (VALUES
  ('I55', 'الفنادق والمنتجعات والشقق', 'Hotels, Resorts & Serviced Apartments', 1),
  ('I56', 'المطاعم والمقاهي وخدمات الطعام', 'Restaurants, Cafes & Food Services', 2),
  ('I57', 'السياحة والرحلات والسفر', 'Tourism, Tours & Travel', 3),
  ('I58', 'تنظيم الفعاليات والمؤتمرات', 'Events & Conference Management', 4)
) AS t(code, name_ar, name_en, ord)
ON CONFLICT (isic_code) DO NOTHING;

