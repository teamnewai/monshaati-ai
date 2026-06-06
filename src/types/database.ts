// ================================================================
// MONSHAATI AI — Complete TypeScript Database Types v1.1
// Single source of truth — all imports use @/types/database
// ================================================================

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type EntityType   = 'sole_proprietorship' | 'llc' | 'joint_stock' | 'branch' | 'ngo' | 'government' | 'cooperative' | 'partnership';
export type OrgSize      = '1-10' | '11-50' | '51-200' | '201-500' | '500+';
export type GenStatus    = 'pending' | 'generating' | 'completed' | 'failed';
export type SubPlan      = 'free_trial' | 'starter' | 'business' | 'professional';
export type UserRole     = 'super_admin' | 'owner' | 'admin' | 'member' | 'viewer';
export type ExportFmt    = 'pdf' | 'docx' | 'json' | 'xlsx';
export type WfStatus     = 'draft' | 'review' | 'approved' | 'published' | 'archived';

// ----------------------------------------------------------------
// Profile
// ----------------------------------------------------------------
export interface Profile {
  id:             string;
  email:          string;
  full_name:      string | null;
  full_name_ar:   string | null;
  avatar_url:     string | null;
  phone:          string | null;
  role:           UserRole;
  preferred_lang: string;
  timezone:       string;
  is_active:      boolean;
  last_seen_at:   string | null;
  created_at:     string;
  updated_at:     string;
}

// ----------------------------------------------------------------
// Sector
// ----------------------------------------------------------------
export interface Sector {
  id:         string;
  isic_code:  string | null;
  name_ar:    string;
  name_en:    string;
  parent_id:  string | null;
  level:      number;
  is_active:  boolean;
  sort_order: number;
}

// ----------------------------------------------------------------
// Organization
// ----------------------------------------------------------------
export interface Organization {
  id:                   string;
  owner_id:             string;
  name:                 string;
  name_ar:              string | null;
  slug:                 string | null;
  entity_type:          EntityType;
  sector_id:            string | null;
  primary_activity:     string;
  secondary_activity:   string | null;
  isic_code:            string | null;
  employee_count:       OrgSize;
  country:              string;
  city:                 string;
  address:              string | null;
  commercial_reg:       string | null;
  tax_number:           string | null;
  website:              string | null;
  phone:                string | null;
  logo_url:             string | null;
  subscription_plan:    SubPlan;
  trial_ends_at:        string | null;
  subscription_ends_at: string | null;
  is_active:            boolean;
  metadata:             Json;
  created_at:           string;
  updated_at:           string;
  // joined
  ai_generations?:      Pick<AIGeneration, 'id' | 'status' | 'created_at' | 'completed_at' | 'total_tokens'>[];
  sectors?:             Sector;
}

// ----------------------------------------------------------------
// OrgMember
// ----------------------------------------------------------------
export interface OrgMember {
  id:           string;
  org_id:       string;
  user_id:      string;
  role:         UserRole;
  invited_by:   string | null;
  invite_token: string | null;
  joined_at:    string;
  profiles?:    Profile;
}

// ----------------------------------------------------------------
// Generation Input / Output
// ----------------------------------------------------------------
export interface GenerationInput {
  org_name:            string;
  entity_type:         EntityType;
  primary_activity:    string;
  secondary_activity?: string;
  employee_count:      OrgSize;
  country:             string;
  city:                string;
  language?:           string;
}

export interface OrgChartRaw {
  temp_id:         string;
  parent_temp_id:  string | null;
  title_ar:        string;
  title_en?:       string;
  department_ar?:  string;
  level:           number;
  position_order:  number;
  head_count:      number;
  is_key_role:     boolean;
}

export interface JDRaw {
  title_ar:          string;
  title_en?:         string;
  department_ar?:    string;
  reports_to_ar?:    string;
  summary_ar?:       string;
  responsibilities:  string[];
  requirements:      string[];
  competencies:      string[];
  authorities?:      string[];
  salary_min?:       number;
  salary_max?:       number;
  currency?:         string;
  experience_years?: string;
  education_level?:  string;
}

export interface PolicyRaw {
  category:   string;
  title_ar:   string;
  title_en?:  string;
  content_ar: string;
}

export interface KPIRaw {
  department_ar?:  string;
  name_ar:         string;
  name_en?:        string;
  description_ar?: string;
  category?:       string;
  target_value?:   number;
  unit?:           string;
  frequency?:      string;
  direction?:      string;
}

export interface HiringRaw {
  phase?:           string;
  phase_order?:     number;
  role_ar:          string;
  role_en?:         string;
  department_ar?:   string;
  priority?:        string;
  timeline?:        string;
  timeline_months?: number;
  salary_min?:      number;
  salary_max?:      number;
  currency?:        string;
  requirements?:    string[];
}

export interface GenerationResult {
  org_chart:        OrgChartRaw[];
  job_descriptions: JDRaw[];
  policies:         PolicyRaw[];
  kpis:             KPIRaw[];
  hiring_plan:      HiringRaw[];
}

// ----------------------------------------------------------------
// AI Generation
// ----------------------------------------------------------------
export interface AIGeneration {
  id:                 string;
  org_id:             string;
  created_by:         string;
  status:             GenStatus;
  input_data:         GenerationInput;
  result_data:        GenerationResult | null;
  error_message:      string | null;
  model_used:         string;
  prompt_tokens:      number | null;
  completion_tokens:  number | null;
  total_tokens:       number | null;
  generation_time_ms: number | null;
  version:            number;
  is_current:         boolean;
  language:           string;
  created_at:         string;
  completed_at:       string | null;
}

// ----------------------------------------------------------------
// Org Chart Node
// ----------------------------------------------------------------
export interface OrgChartNode {
  id:             string;
  generation_id:  string;
  org_id:         string;
  parent_id:      string | null;
  title_ar:       string;
  title_en:       string | null;
  department_ar:  string | null;
  department_en:  string | null;
  level:          number;
  position_order: number;
  head_count:     number;
  isco_code:      string | null;
  onet_code:      string | null;
  is_key_role:    boolean;
  reports_to_ar:  string | null;
  node_type:      string;
  color_hex:      string | null;
  created_at:     string;
}

// OrgChartNode with children for tree rendering
export type OrgChartNodeWithChildren = OrgChartNode & {
  children: OrgChartNodeWithChildren[];
};

// ----------------------------------------------------------------
// Job Description
// ----------------------------------------------------------------
export interface JobDescription {
  id:               string;
  generation_id:    string;
  org_id:           string;
  node_id:          string | null;
  title_ar:         string;
  title_en:         string | null;
  department_ar:    string | null;
  grade:            string | null;
  reports_to_ar:    string | null;
  summary_ar:       string | null;
  summary_en:       string | null;
  responsibilities: string[];
  requirements:     string[];
  competencies:     string[];
  authorities:      string[];
  salary_min:       number | null;
  salary_max:       number | null;
  currency:         string;
  work_type:        string;
  experience_years: string | null;
  education_level:  string | null;
  workflow_status:  WfStatus;
  is_approved:      boolean;
  approved_by:      string | null;
  approved_at:      string | null;
  created_at:       string;
  updated_at:       string;
}

// ----------------------------------------------------------------
// Policy
// ----------------------------------------------------------------
export interface Policy {
  id:              string;
  generation_id:   string;
  org_id:          string;
  category:        string;
  category_en:     string | null;
  title_ar:        string;
  title_en:        string | null;
  content_ar:      string;
  content_en:      string | null;
  version:         number;
  workflow_status: WfStatus;
  is_approved:     boolean;
  approved_by:     string | null;
  effective_date:  string | null;
  review_date:     string | null;
  tags:            string[];
  created_at:      string;
  updated_at:      string;
}

// ----------------------------------------------------------------
// KPI
// ----------------------------------------------------------------
export interface KPI {
  id:                  string;
  generation_id:       string;
  org_id:              string;
  department_ar:       string | null;
  name_ar:             string;
  name_en:             string | null;
  description_ar:      string | null;
  category:            string | null;
  formula:             string | null;
  target_value:        number | null;
  current_value:       number | null;
  unit:                string | null;
  frequency:           string;
  direction:           string;
  weight:              number;
  owner_role_ar:       string | null;
  data_source:         string | null;
  calculation_method:  string | null;
  created_at:          string;
  updated_at:          string;
}

// ----------------------------------------------------------------
// Hiring Plan Item
// ----------------------------------------------------------------
export interface HiringItem {
  id:              string;
  generation_id:   string;
  org_id:          string;
  phase:           string | null;
  phase_order:     number;
  role_ar:         string;
  role_en:         string | null;
  department_ar:   string | null;
  priority:        string;
  timeline:        string | null;
  timeline_months: number | null;
  salary_min:      number | null;
  salary_max:      number | null;
  currency:        string;
  requirements:    string[];
  notes:           string | null;
  is_filled:       boolean;
  created_at:      string;
}

// ----------------------------------------------------------------
// Export
// ----------------------------------------------------------------
export interface Export {
  id:             string;
  org_id:         string;
  generation_id:  string;
  created_by:     string;
  format:         ExportFmt;
  sections:       string[];
  file_url:       string | null;
  file_size:      number | null;
  download_count: number;
  expires_at:     string | null;
  created_at:     string;
}

// ----------------------------------------------------------------
// Dashboard Stats
// ----------------------------------------------------------------
export interface DashboardStats {
  total_orgs:        number;
  total_users:       number;
  total_generations: number;
  generations_today: number;
  avg_gen_time_ms:   number | null;
}

// ----------------------------------------------------------------
// Export data shape for PDF/Word export
// ----------------------------------------------------------------
export interface ExportData {
  orgName:         string;
  primaryActivity: string;
  employeeCount:   string;
  country:         string;
  city:            string;
  nodes:           OrgChartNode[];
  jds:             JobDescription[];
  policies:        Policy[];
  kpis:            KPI[];
  hiring:          HiringItem[];
}

// ----------------------------------------------------------------
// Payment Types
// ----------------------------------------------------------------

export type SubscriptionStatus =
  | 'active' | 'canceled' | 'past_due' | 'unpaid'
  | 'trialing' | 'incomplete' | 'incomplete_expired';

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';

export interface Subscription {
  id:                     string;
  org_id:                 string;
  user_id:                string;
  stripe_customer_id:     string | null;
  stripe_subscription_id: string | null;
  stripe_price_id:        string | null;
  plan:                   SubPlan;
  status:                 SubscriptionStatus;
  current_period_start:   string | null;
  current_period_end:     string | null;
  cancel_at_period_end:   boolean;
  canceled_at:            string | null;
  trial_end:              string | null;
  created_at:             string;
  updated_at:             string;
}

export interface Invoice {
  id:                    string;
  org_id:                string;
  subscription_id:       string | null;
  stripe_invoice_id:     string | null;
  stripe_payment_intent: string | null;
  amount_paid:           number;
  amount_due:            number;
  currency:              string;
  status:                InvoiceStatus;
  invoice_pdf:           string | null;
  hosted_invoice_url:    string | null;
  period_start:          string | null;
  period_end:            string | null;
  paid_at:               string | null;
  created_at:            string;
}

export interface UsageTracking {
  id:               string;
  org_id:           string;
  period_start:     string;
  period_end:       string;
  generations_used: number;
  limit_reached:    boolean;
  created_at:       string;
  updated_at:       string;
}

// Plan limits
export const PLAN_LIMITS: Record<SubPlan, {
  generations_per_month: number;
  orgs: number;
  members: number;
  label: string;
  price_monthly: number;
  currency: string;
}> = {
  free_trial:   { generations_per_month: 3,   orgs: 1,  members: 1,  label: 'تجريبي مجاني',  price_monthly: 0,   currency: 'SAR' },
  starter:      { generations_per_month: 15,  orgs: 3,  members: 5,  label: 'ستارتر',        price_monthly: 99,  currency: 'SAR' },
  business:     { generations_per_month: 50,  orgs: 10, members: 20, label: 'بيزنس',         price_monthly: 299, currency: 'SAR' },
  professional: { generations_per_month: 999, orgs: 99, members: 99, label: 'احترافي (غير محدود)', price_monthly: 799, currency: 'SAR' },
};

// ----------------------------------------------------------------
// Phase 2 Types
// ----------------------------------------------------------------

// Free Trial
export interface TrialStatus {
  is_active:      boolean;
  days_remaining: number;
  expires_at:     string;
  is_expired:     boolean;
  generations_used: number;
}

// PAYG
export type PaygService = 'org_chart' | 'job_descriptions' | 'policies' | 'procedures' | 'kpi_package' | 'hiring_plan' | 'full_package';

export interface PaygPrice {
  id:             string;
  service:        PaygService;
  price_usd:      number;
  price_sar:      number;
  stripe_price_id: string | null;
  is_active:      boolean;
}

export interface PaygPurchase {
  id:                   string;
  org_id:               string;
  user_id:              string;
  generation_id:        string | null;
  service:              PaygService;
  price_paid_usd:       number;
  price_paid_sar:       number | null;
  currency:             string;
  stripe_session_id:    string | null;
  status:               string;
  purchased_at:         string;
}

// Coupon
export type DiscountType = 'percentage' | 'fixed_usd' | 'fixed_sar';

export interface Coupon {
  id:             string;
  code:           string;
  description:    string | null;
  discount_type:  DiscountType;
  discount_value: number;
  min_order_usd:  number;
  max_uses:       number | null;
  uses_count:     number;
  valid_from:     string;
  valid_until:    string | null;
  is_active:      boolean;
  applies_to:     string;
}

// Referral
export interface Referral {
  id:             string;
  referrer_id:    string;
  referral_code:  string;
  status:         string;
  reward_type:    string | null;
  reward_value:   number | null;
  reward_applied: boolean;
  converted_at:   string | null;
  created_at:     string;
}

// Consultant
export type ConsultantStatus = 'pending' | 'active' | 'suspended' | 'inactive';
export type BookingStatus    = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface ConsultantProfile {
  id:               string;
  user_id:          string;
  display_name:     string;
  display_name_ar:  string | null;
  bio_ar:           string | null;
  bio_en:           string | null;
  avatar_url:       string | null;
  specializations:  string[];
  industries:       string[];
  languages:        string[];
  years_experience: number;
  country:          string;
  price_30min_usd:  number;
  price_60min_usd:  number;
  price_30min_sar:  number;
  price_60min_sar:  number;
  currency:         string;
  status:           ConsultantStatus;
  is_featured:      boolean;
  avg_rating:       number;
  total_reviews:    number;
  total_sessions:   number;
  verified_at:      string | null;
  stripe_onboarded: boolean;
  payout_enabled:   boolean;
  stripe_account_id: string | null;
  total_earnings_usd: number;
  pending_payout_usd: number;
  created_at:       string;
}

export interface ConsultantBooking {
  id:                   string;
  consultant_id:        string;
  client_org_id:        string;
  client_user_id:       string;
  duration:             '30min' | '60min';
  scheduled_at:         string;
  timezone:             string;
  status:               BookingStatus;
  price_usd:            number;
  price_sar:            number | null;
  currency:             string;
  stripe_session_id:    string | null;
  meeting_type:         string;
  meeting_url:          string | null;
  zoom_join_url:        string | null;
  notes:                string | null;
  created_at:           string;
}

export interface ConsultantReview {
  id:            string;
  booking_id:    string;
  consultant_id: string;
  reviewer_id:   string;
  rating:        number;
  title:         string | null;
  body:          string | null;
  is_verified:   boolean;
  created_at:    string;
}

// Marketplace
export type ProductCategory = 'org_chart' | 'job_descriptions' | 'policies' | 'procedures' | 'kpi_templates' | 'hr_templates' | 'strategic_plans' | 'sops' | 'saudi_compliance' | 'onboarding_kits' | 'training_materials';

export interface MarketplaceProduct {
  id:               string;
  seller_id:        string;
  title_ar:         string;
  title_en:         string | null;
  description_ar:   string;
  category:         ProductCategory;
  tags:             string[];
  price_usd:        number;
  price_sar:        number;
  is_free:          boolean;
  preview_url:      string | null;
  file_url:         string | null;
  file_format:      string;
  cover_image_url:  string | null;
  status:           string;
  downloads_count:  number;
  avg_rating:       number;
  total_reviews:    number;
  language:         string;
  created_at:       string;
}

export interface ProductPurchase {
  id:             string;
  product_id:     string;
  buyer_id:       string;
  price_paid_usd: number;
  price_paid_sar: number | null;
  status:         string;
  download_count: number;
  download_limit: number;
  purchased_at:   string;
}

// Saudi Library
export type LibraryType = 'org_chart' | 'policy' | 'procedure' | 'kpi' | 'job_description' | 'form' | 'sop' | 'strategic_plan' | 'hr_template' | 'onboarding';
export type SaudiSector = 'healthcare' | 'education' | 'finance' | 'retail' | 'construction' | 'technology' | 'hospitality' | 'logistics' | 'manufacturing' | 'government' | 'nonprofit' | 'real_estate' | 'energy' | 'consulting';

export interface SaudiLibraryItem {
  id:             string;
  type:           LibraryType;
  sector:         SaudiSector | null;
  title_ar:       string;
  title_en:       string | null;
  description_ar: string | null;
  content_ar:     string | null;
  tags:           string[];
  is_vision2030:  boolean;
  is_nitaqat:     boolean;
  is_free:        boolean;
  is_featured:    boolean;
  downloads_count: number;
  created_at:     string;
}

// Tenant / White Label
export interface Tenant {
  id:             string;
  slug:           string;
  name:           string;
  owner_id:       string;
  custom_domain:  string | null;
  logo_url:       string | null;
  primary_color:  string;
  secondary_color: string;
  is_active:      boolean;
  monthly_fee_usd: number;
  created_at:     string;
}

// Revenue Analytics
export interface RevenueEvent {
  id:          string;
  event_type:  string;
  org_id:      string | null;
  user_id:     string | null;
  amount_usd:  number;
  amount_sar:  number | null;
  currency:    string;
  stripe_id:   string | null;
  metadata:    Record<string, unknown>;
  created_at:  string;
}

// ----------------------------------------------------------------
// Business Intelligence Types
// ----------------------------------------------------------------

export interface FundingProgram {
  id:              string;
  name_ar:         string;
  provider_ar:     string;
  type:            string;
  country:         string;
  sectors:         string[];
  org_sizes:       string[];
  max_funding_sar: number | null;
  equity_required: boolean;
  equity_pct_max:  number | null;
  description_ar:  string | null;
  requirements_ar: string[];
  benefits_ar:     string[];
  website_url:     string | null;
  apply_url:       string | null;
  deadline:        string | null;
  is_vision2030:   boolean;
  created_at:      string;
}

export interface CostModel {
  id:              string;
  org_id:          string;
  name:            string;
  period:          string;
  rent_sar:        number;
  salaries_sar:    number;
  utilities_sar:   number;
  insurance_sar:   number;
  other_fixed_sar: number;
  cogs_pct:        number;
  marketing_sar:   number;
  shipping_sar:    number;
  other_var_sar:   number;
  unit_price_sar:  number;
  units_per_month: number;
  ai_suggestions:  Record<string, unknown>;
  created_at:      string;
  updated_at:      string;
}

// Computed from CostModel
export interface CostAnalysis {
  total_fixed:    number;
  total_variable: number;
  total_cost:     number;
  revenue:        number;
  gross_profit:   number;
  net_profit:     number;
  profit_margin:  number;
  breakeven_units: number;
  breakeven_sar:  number;
  unit_cost:      number;
  suggested_price: number;
  cogs_amount:    number;
}

export interface FinancialRecord {
  id:               string;
  org_id:           string;
  period_year:      number;
  period_month:     number;
  revenue_sales:    number;
  revenue_services: number;
  revenue_other:    number;
  exp_salaries:     number;
  exp_rent:         number;
  exp_marketing:    number;
  exp_operations:   number;
  exp_technology:   number;
  exp_other:        number;
  cash_opening:     number;
  cash_closing:     number;
  receivables:      number;
  payables:         number;
  ai_analysis:      Record<string, unknown>;
  notes:            string | null;
  created_at:       string;
}

export interface LossAnalysis {
  id:                string;
  org_id:            string;
  analysis_date:     string;
  total_loss_sar:    number;
  loss_period_months: number;
  health_score:      number | null;
  health_label:      string | null;
  loss_causes:       LossCause[];
  recovery_plan_30:  RecoveryAction[];
  recovery_plan_90:  RecoveryAction[];
  recovery_plan_180: RecoveryAction[];
  risk_factors:      string[];
  recommendations:   string[];
  created_at:        string;
}

export interface LossCause {
  cause:       string;
  impact_pct:  number;
  description: string;
  rank:        number;
}

export interface RecoveryAction {
  action:      string;
  owner:       string;
  priority:    'high' | 'medium' | 'low';
  expected_impact: string;
}

export interface BusinessState {
  id:               string;
  org_id:           string;
  snapshot_date:    string;
  score_revenue:    number;
  score_operations: number;
  score_team:       number;
  score_technology: number;
  score_marketing:  number;
  score_finance:    number;
  score_compliance: number;
  target_revenue:   number;
  target_operations: number;
  target_team:      number;
  target_technology: number;
  target_marketing: number;
  target_finance:   number;
  target_compliance: number;
  current_desc_ar:  string | null;
  target_desc_ar:   string | null;
  gap_analysis:     GapItem[];
  development_plan: DevelopmentStep[];
  created_at:       string;
}

export interface GapItem {
  dimension:     string;
  dimension_ar?: string;
  current:       number;
  target:        number;
  gap:           number;
  priority:      number;
  root_causes?:  string[];
  actions:       string[];
}

export interface DevelopmentStep {
  phase:       string;
  duration:    string;
  focus?:      string;
  actions:     string[];
  kpis:        string[];
  investment?: string;
}

export interface HelpDefinition {
  id:         string;
  field_key:  string;
  label_ar:   string;
  tooltip_ar: string;
  example_ar: string | null;
  formula_ar: string | null;
}

export interface AIRecommendation {
  id:           string;
  org_id:       string;
  generation_id: string | null;
  category:     string;
  title_ar:     string;
  body_ar:      string;
  reason_ar:    string;
  evidence:     Record<string, unknown>[];
  priority:     number;
  impact_label: string;
  effort_label: string;
  action_steps: string[];
  is_dismissed: boolean;
  created_at:   string;
}

// ----------------------------------------------------------------
// White Label Types
// ----------------------------------------------------------------

export interface Tenant {
  id:               string;
  slug:             string;
  name:             string;
  name_ar:          string | null;
  owner_id:         string;
  plan:             string;
  custom_domain:    string | null;
  logo_url:         string | null;
  favicon_url:      string | null;
  primary_color:    string;
  secondary_color:  string;
  accent_color:     string;
  text_color:       string;
  background_color: string;
  font_family:      string;
  custom_css:       string | null;
  app_name_ar:      string | null;
  app_name_en:      string | null;
  description_ar:   string | null;
  tagline_ar:       string | null;
  support_email:    string | null;
  support_phone:    string | null;
  domain_verified:  boolean;
  domain_verify_token: string | null;
  max_orgs:         number;
  max_users:        number;
  max_gens_per_month: number;
  features_enabled: string[];
  stripe_customer_id: string | null;
  billing_email:    string | null;
  billing_cycle:    string;
  is_active:        boolean;
  suspended_at:     string | null;
  orgs_count:       number;
  users_count:      number;
  gens_this_month:  number;
  revenue_this_month: number;
  total_revenue:    number;
  monthly_fee_usd:  number;
  notes:            string | null;
  created_at:       string;
  updated_at:       string;
}

export type TenantMemberRole = 'owner' | 'admin' | 'member';

export interface TenantMember {
  id:          string;
  tenant_id:   string;
  user_id:     string;
  role:        TenantMemberRole;
  invited_by:  string | null;
  invited_at:  string | null;
  accepted_at: string | null;
  is_active:   boolean;
  created_at:  string;
  profiles?:   { full_name: string | null; email: string };
}

export interface TenantActivity {
  id:          string;
  tenant_id:   string;
  actor_id:    string | null;
  action:      string;
  entity_type: string | null;
  metadata:    Record<string, unknown>;
  created_at:  string;
}

export interface TenantStats {
  id:           string;
  tenant_id:    string;
  period_year:  number;
  period_month: number;
  orgs_count:   number;
  users_count:  number;
  gens_count:   number;
  revenue_usd:  number;
  active_orgs:  number;
  new_signups:  number;
  churn_count:  number;
}

export interface TenantBranding {
  primary_color:    string;
  secondary_color:  string;
  accent_color:     string;
  text_color:       string;
  background_color: string;
  font_family:      string;
  logo_url:         string | null;
  favicon_url:      string | null;
  app_name_ar:      string | null;
  app_name_en:      string | null;
  tagline_ar:       string | null;
  custom_css:       string | null;
}

// ----------------------------------------------------------------
// AI Consultant Types
// ----------------------------------------------------------------

export type ConsultantTopicType =
  | 'administrative' | 'operational' | 'hr' | 'financial'
  | 'growth' | 'funding' | 'restructuring' | 'strategic';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ConsultantConversation {
  id:                     string;
  org_id:                 string;
  user_id:                string;
  title:                  string | null;
  topic:                  ConsultantTopicType | null;
  status:                 'active' | 'closed' | 'escalated';
  disclaimer_accepted:    boolean;
  disclaimer_accepted_at: string | null;
  escalated_to:           string | null;
  escalated_at:           string | null;
  escalation_reason:      string | null;
  messages_count:         number;
  total_tokens:           number;
  satisfaction_score:     number | null;
  created_at:             string;
  updated_at:             string;
}

export interface ConsultantMessage {
  id:                    string;
  conversation_id:       string;
  role:                  'user' | 'assistant' | 'system';
  content:               string;
  topic:                 ConsultantTopicType | null;
  confidence_score:      number | null;
  risk_level:            RiskLevel | null;
  impact_level:          'low' | 'medium' | 'high' | 'critical' | null;
  recommendations:       AIRecommendationItem[];
  data_sources:          string[];
  escalation_suggested:  boolean;
  suggested_consultants: SuggestedConsultant[];
  disclaimer_shown:      boolean;
  input_tokens:          number | null;
  output_tokens:         number | null;
  created_at:            string;
}

export interface AIRecommendationItem {
  title:     string;
  body:      string;
  priority:  number;
  action:    string;
}

export interface SuggestedConsultant {
  id:               string;
  name:             string;
  specialization:   string;
  reason:           string;
  price_60min_sar:  number;
  rating:           number;
}

export interface OrgContext {
  org:         Record<string, unknown>;
  generation:  Record<string, unknown> | null;
  orgChart:    Record<string, unknown>[];
  jds:         Record<string, unknown>[];
  policies:    Record<string, unknown>[];
  kpis:        Record<string, unknown>[];
  hiring:      Record<string, unknown>[];
  financials:  Record<string, unknown>[];
  costModel:   Record<string, unknown> | null;
  lossAnalysis: Record<string, unknown> | null;
  funding:     Record<string, unknown>[];
}

// ----------------------------------------------------------------
// Customer Support Types
// ----------------------------------------------------------------
export type TicketStatus   = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketChannel  = 'chat' | 'email' | 'voice' | 'callback' | 'web';
export type CallStatus     = 'requested' | 'queued' | 'in_progress' | 'completed' | 'missed' | 'failed';
export type AgentStatus    = 'available' | 'busy' | 'offline' | 'break';

export interface SupportTicket {
  id:                 string;
  ticket_number:      string;
  user_id:            string;
  org_id:             string | null;
  agent_id:           string | null;
  channel:            TicketChannel;
  status:             TicketStatus;
  priority:           TicketPriority;
  subject:            string;
  description:        string;
  category:           string | null;
  tags:               string[];
  resolved_at:        string | null;
  satisfaction_score: number | null;
  created_at:         string;
  updated_at:         string;
}

export interface TicketMessage {
  id:          string;
  ticket_id:   string;
  sender_id:   string | null;
  sender_type: 'user' | 'agent' | 'system' | 'ai';
  content:     string;
  is_internal: boolean;
  created_at:  string;
}

export interface SupportCall {
  id:                string;
  ticket_id:         string | null;
  user_id:           string;
  agent_id:          string | null;
  status:            CallStatus;
  direction:         'inbound' | 'outbound' | 'callback';
  caller_phone:      string | null;
  provider:          'twilio' | 'vonage';
  provider_call_id:  string | null;
  duration_secs:     number | null;
  recording_url:     string | null;
  notes:             string | null;
  scheduled_at:      string | null;
  started_at:        string | null;
  ended_at:          string | null;
  created_at:        string;
}

export interface SupportAgent {
  id:              string;
  user_id:         string | null;
  name_ar:         string;
  name_en:         string | null;
  email:           string;
  phone:           string | null;
  status:          AgentStatus;
  is_active:       boolean;
  specializations: string[];
  current_load:    number;
  avg_rating:      number;
  created_at:      string;
}
