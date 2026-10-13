export type CertificateStatus = 'active' | 'expiring_soon' | 'expired';

export interface User {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  date_joined: string;
}

export interface Branch {
  id: number;
  name: string;
  location: string;
  certificate_count: number;
}

export interface CertificateCategory {
  id: number;
  name: string;
  description: string;
  certificate_count: number;
}

export interface Certificate {
  id: number;
  name: string;
  reference_number: string;
  category: CertificateCategory;
  branch: Branch;
  description: string;
  issue_date: string;
  expiry_date: string;
  alert_days_before: number;
  status: CertificateStatus;
  status_display: string;
  days_until_expiry: number;
  attached_file: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailRecipient {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface NotificationCertificate {
  id: number;
  name: string;
  reference_number: string;
  expiry_date: string;
  status: CertificateStatus;
  days_until_expiry: number;
  branch_name: string;
  category_name: string;
}

export interface Notification {
  id: number;
  certificate: NotificationCertificate;
  message: string;
  created_at: string;
  is_read: boolean;
}

export interface NotificationSummary {
  unread: number;
  expiring_soon: number;
  expired: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface RenewalRecord {
  id: number;
  certificate: number;
  previous_expiry_date: string;
  new_expiry_date: string;
  previous_attached_file: string | null;
  renewed_by: User | null;
  renewed_at: string;
}

export interface DashboardTotals {
  total: number;
  active: number;
  expiring_soon: number;
  expired: number;
}

export interface DashboardStats {
  totals: DashboardTotals;
  status_breakdown: { status: CertificateStatus; label: string; count: number }[];
  expiry_buckets: { label: string; count: number }[];
}

export interface ReportsSummary {
  total: number;
  active: number;
  expiring_soon: number;
  expired: number;
}

export interface ExpiredListResponse {
  period: string;
  count: number;
  certificates: Certificate[];
}

export interface ExpiringByMonthResponse {
  year: number;
  months: { month: number; month_name: string; count: number }[];
}

export interface BranchOrCategoryBreakdown {
  id: number;
  name: string;
  total: number;
  active: number;
  expiring_soon: number;
  expired: number;
}

export interface SearchResults {
  certificates: { id: number; name: string; reference_number: string; status: CertificateStatus }[];
  branches: { id: number; name: string }[];
  categories: { id: number; name: string }[];
}
