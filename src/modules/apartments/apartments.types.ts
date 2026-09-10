import type { Apartment } from '../../generated/prisma/client.js';

export interface ApartmentFilters {
  block?: string;
  floor?: number;
  search?: string;
  page: number;
  limit: number;
}

export interface PaginatedApartments {
  data: Apartment[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}
