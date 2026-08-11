import { usePaginatedNotes } from './usePaginatedNotes';

/**
 * Fetches the notes of a project with pagination (infinite scroll). The query
 * key is shared between the sidebar and the dashboard so note data (and note
 * counts) are fetched/cached once per project instead of once per UI location.
 */
export const useProjectNotes = (projectId, enabled = true) => {
  return usePaginatedNotes({
    queryKey: ['notes', 'project', projectId],
    url: `/projects/${projectId}/notes`,
    enabled: Boolean(projectId) && enabled,
  });
};
