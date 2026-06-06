-- ================================================================
-- SAUDI LIBRARY SEED DATA
-- ================================================================

INSERT INTO saudi_library (type, sector, title_ar, title_en, description_ar, tags, org_size, is_vision2030, is_nitaqat, is_featured) VALUES

-- HR Policies
('policy','healthcare','سياسة الحضور والانصراف - القطاع الصحي','Attendance Policy - Healthcare',
 'سياسة شاملة للحضور والانصراف متوافقة مع نظام العمل السعودي للمنشآت الصحية',
 ARRAY['موارد بشرية','حضور','صحة','نظام العمل'],'11-50',false,true,true),

('policy','finance','سياسة السرية وحماية المعلومات','Confidentiality Policy',
 'سياسة حماية المعلومات السرية والبيانات المالية وفق لوائح هيئة السوق المالية',
 ARRAY['سرية','بيانات','مالية','هيئة السوق'],'51-200',false,false,true),

('policy','retail','سياسة خدمة العملاء','Customer Service Policy',
 'إطار شامل لخدمة العملاء في قطاع التجزئة مع معايير الأداء',
 ARRAY['خدمة عملاء','تجزئة','جودة'],'1-10',false,false,false),

('policy','technology','سياسة أمن المعلومات والسيبراني','Information Security Policy',
 'سياسة أمن المعلومات متوافقة مع SAMA وNCA السعودية',
 ARRAY['أمن معلومات','سيبراني','SAMA','NCA'],'51-200',false,false,true),

('policy','construction','سياسة الصحة والسلامة المهنية','OHS Policy',
 'سياسة شاملة للصحة والسلامة المهنية متوافقة مع نظام العمل السعودي',
 ARRAY['سلامة','صحة مهنية','إنشاءات','نظام العمل'],'201+',false,true,false),

-- KPIs
('kpi','healthcare','مؤشرات أداء المستشفيات والعيادات','Hospital KPIs',
 'مجموعة شاملة من مؤشرات الأداء للمنشآت الصحية السعودية',
 ARRAY['مؤشرات','صحة','مستشفى','أداء'],'51-200',true,false,true),

('kpi','retail','مؤشرات أداء قطاع التجزئة','Retail KPIs',
 'مؤشرات الأداء الرئيسية لقطاع التجزئة والبيع بالتجزئة',
 ARRAY['مؤشرات','تجزئة','مبيعات'],'11-50',false,false,false),

('kpi','finance','مؤشرات الأداء المالي والمصرفي','Financial KPIs',
 'مؤشرات أداء المؤسسات المالية والمصرفية',
 ARRAY['مؤشرات','مالية','بنوك','SAMA'],'201+',false,false,true),

('kpi','technology','مؤشرات أداء شركات التقنية','Tech Company KPIs',
 'مؤشرات الأداء لشركات البرمجيات والتقنية في السوق السعودي',
 ARRAY['مؤشرات','تقنية','برمجيات','SaaS'],'11-50',true,false,false),

('kpi','construction','مؤشرات أداء قطاع الإنشاءات','Construction KPIs',
 'مؤشرات الأداء لمقاولي البناء والإنشاءات في المملكة',
 ARRAY['مؤشرات','إنشاءات','مشاريع','مقاولات'],'201+',true,false,false),

-- Job Descriptions
('job_description','healthcare','مدير الموارد البشرية - القطاع الصحي','HR Manager - Healthcare',
 'وصف وظيفي متكامل لمدير الموارد البشرية في المنشآت الصحية السعودية',
 ARRAY['موارد بشرية','صحة','إدارة'],'51-200',false,true,true),

('job_description','technology','مدير تقنية المعلومات CTO','Chief Technology Officer',
 'وصف وظيفي للمسؤول التقني الأول في شركات التقنية',
 ARRAY['CTO','تقنية','قيادة'],'51-200',false,false,false),

('job_description','finance','محلل مالي أول','Senior Financial Analyst',
 'وصف وظيفي للمحلل المالي الأول في المؤسسات المالية السعودية',
 ARRAY['تحليل مالي','بنوك','استثمار'],'51-200',false,false,false),

-- Org Charts
('org_chart','healthcare','هيكل تنظيمي مستشفى 100-200 سرير','Hospital Org Chart 100-200 beds',
 'هيكل تنظيمي معتمد للمستشفيات متوسطة الحجم وفق معايير هيئة الصحة السعودية',
 ARRAY['هيكل تنظيمي','مستشفى','صحة'],'51-200',false,false,true),

('org_chart','retail','هيكل تنظيمي شركة تجزئة متوسطة','Retail Company Org Chart',
 'هيكل تنظيمي لشركات التجزئة 50-200 موظف',
 ARRAY['هيكل تنظيمي','تجزئة','إدارة'],'51-200',false,false,false),

('org_chart','technology','هيكل تنظيمي شركة تقنية ناشئة','Tech Startup Org Chart',
 'هيكل تنظيمي مرن لشركات التقنية الناشئة في رؤية 2030',
 ARRAY['هيكل تنظيمي','تقنية','ناشئة'],'11-50',true,false,true),

-- SOPs
('sop','healthcare','إجراء استقبال المرضى','Patient Admission SOP',
 'إجراء تشغيلي موحد لاستقبال وتسجيل المرضى في المنشآت الصحية',
 ARRAY['إجراءات','استقبال','مرضى','صحة'],'51-200',false,false,false),

('sop','retail','إجراء تعامل شكاوى العملاء','Customer Complaints SOP',
 'إجراء موحد للتعامل مع شكاوى العملاء وحل المشكلات',
 ARRAY['إجراءات','شكاوى','عملاء'],'11-50',false,false,false),

-- HR Templates
('hr_template','consulting','عقد عمل سعودي مبسط','Saudi Employment Contract',
 'نموذج عقد عمل محدث وفق آخر تعديلات نظام العمل 1445هـ',
 ARRAY['عقد عمل','موارد بشرية','نظام العمل'],'1-10',false,true,true),

('hr_template','consulting','نموذج تقييم الأداء السنوي','Annual Performance Review',
 'نموذج شامل لتقييم أداء الموظفين وفق أفضل الممارسات',
 ARRAY['تقييم أداء','موارد بشرية'],'11-50',false,false,false),

('hr_template','consulting','دليل الموظف الشامل','Employee Handbook Template',
 'دليل موظف متكامل مخصص للسوق السعودي يشمل جميع السياسات',
 ARRAY['دليل موظف','سياسات','موارد بشرية'],'11-50',false,true,true)
ON CONFLICT DO NOTHING;