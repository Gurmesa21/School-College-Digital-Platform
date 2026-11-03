import type { ResolvedTenant, PublicAnnouncementDto, PublicSitemapEntryDto } from '@school/shared';

export type { PublicSitemapEntryDto };

export interface NavItem {
  id: string;
  label: string;
  url: string;
  target?: '_self' | '_blank';
  orderIndex: number;
  children?: NavItem[];
}

export interface PublicNavResponse {
  success: boolean;
  data?: {
    location: string;
    title: string;
    items: NavItem[];
  };
}

/**
 * Formats enum institution type to clear user-facing label
 */
export function formatInstitutionType(type?: string): string {
  switch (type) {
    case 'KINDERGARTEN':
      return 'Early Childhood & Kindergarten Education';
    case 'PRIMARY_SECONDARY':
      return 'Primary & Secondary Education';
    case 'TVET_TRAINING_CENTRE':
      return 'Technical & Vocational Training Institute';
    case 'HIGHER_EDUCATION':
      return 'Higher Education & Collegiate Studies';
    case 'SPECIALIZED_INSTITUTE':
      return 'Specialized Educational Institute';
    default:
      return 'Educational Institution';
  }
}

