import { api } from "./client";

export interface ArtifactFile {
  path: string;
  content: string;
  size: number;
}

export const artifactsApi = {
  list: (projectId: string): Promise<{ artifacts: ArtifactFile[]; cwd: string | null }> =>
    api.get(`/projects/${encodeURIComponent(projectId)}/artifacts`),

  save: (projectId: string, filePath: string, content: string): Promise<{ path: string; size: number }> =>
    api.put(`/projects/${encodeURIComponent(projectId)}/artifacts`, { path: filePath, content }),
};
