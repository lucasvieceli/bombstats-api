import { SelectQueryBuilder } from 'typeorm';

export type IPaginateOrderBy = 'ASC' | 'DESC';

export interface IPaginateOptions {
  page?: number;
  limit?: number;
  orderBy?: unknown;
  order?: IPaginateOrderBy;
}

export interface IPaginate<T> {
  items: T[];
  links: IPaginationLinks;
  meta: IPaginationMeta;
}

export interface IPaginationLinks {
  first?: string;
  previous?: string;
  next?: string;
  last?: string;
}

export interface IPaginationMeta {
  itemCount: number;
  totalItems?: number;
  itemsPerPage: number;
  totalPages?: number;
  currentPage: number;
}

export interface IPaginate<T> {
  queryBuilder: SelectQueryBuilder<T>;
  limit?: number | string;
  page?: number | string;
}

export const paginate = async <T>({
  queryBuilder,
  limit: limitProps = 30,
  page: pageProps = 1,
}: IPaginate<T>) => {
  const limit = Number(Number(limitProps) > 100 ? 100 : limitProps);
  const page = Number(pageProps);

  const [items, totalItems] = await queryBuilder
    .take(limit)
    .skip(limit * (page - 1))
    .getManyAndCount();
  const totalPages = Math.ceil(totalItems / limit);

  return {
    items,
    meta: {
      currentPage: page,
      itemCount: items.length,
      itemsPerPage: limit,
      totalItems,
      totalPages: totalPages === 0 ? 1 : totalPages,
    },
  };
};
