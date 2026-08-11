import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import api from '../services/api';

export const NOTES_PAGE_SIZE = 40;

/**
 * Hook paginado para listas de notas. El backend devuelve páginas Spring
 * (`{ content, number, last, totalElements, ... }`) en todos los endpoints
 * de notas (proyecto, favoritos, papelera, búsqueda). Este hook acumula las
 * páginas cargadas con `useInfiniteQuery` y expone la lista plana de notas,
 * el total real de elementos (útil para contadores) y los controles de
 * paginación (`fetchNextPage` / `hasNextPage`) para scroll infinito.
 *
 * IMPORTANTE: las claves de caché se comparten entre vistas (sidebar,
 * dashboard, editor...) — todos los consumidores de una misma clave DEBEN
 * usar este hook para que la forma de los datos en caché sea consistente.
 */
export const usePaginatedNotes = ({
  queryKey,
  url,
  params = {},
  enabled = true,
  staleTime = 0,
  pageSize = NOTES_PAGE_SIZE,
}) => {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 0 }) => {
      const res = await api.get(url, { params: { ...params, page: pageParam, size: pageSize } });
      return res.data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.last || !Array.isArray(lastPage.content) || lastPage.content.length === 0) {
        return undefined;
      }
      return (lastPage.number ?? 0) + 1;
    },
    enabled,
    staleTime,
  });

  // Plana las páginas en una sola lista, deduplicando por id (seguridad
  // contra cambios de orden entre páginas durante invalidaciones).
  const notes = useMemo(() => {
    const seen = new Set();
    const all = [];
    for (const page of query.data?.pages ?? []) {
      for (const note of page.content ?? []) {
        if (!seen.has(note.id)) {
          seen.add(note.id);
          all.push(note);
        }
      }
    }
    return all;
  }, [query.data]);

  return {
    notes,
    totalCount: query.data?.pages?.[0]?.totalElements ?? notes.length,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
  };
};
