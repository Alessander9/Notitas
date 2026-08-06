import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

/**
 * Fetches the notes of a project. The query key is shared between the sidebar
 * and the dashboard so note data (and note counts) are fetched/cached once per
 * project instead of once per UI location.
 */
export const useProjectNotes = (projectId, enabled = true) => {
  return useQuery({
    queryKey: ['notes', 'project', projectId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/notes`);
      return Array.isArray(res.data) ? res.data : (res.data?.content || []);
    },
    enabled: Boolean(projectId) && enabled,
  });
};
