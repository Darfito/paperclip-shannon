import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, ChevronRight, Pencil, X, Save, RefreshCw, Folder } from "lucide-react";
import { artifactsApi, type ArtifactFile } from "../api/artifacts";
import { MarkdownBody } from "./MarkdownBody";
import { Button } from "@/components/ui/button";
import { useToastActions } from "../context/ToastContext";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function groupByFolder(artifacts: ArtifactFile[]): Map<string, ArtifactFile[]> {
  const groups = new Map<string, ArtifactFile[]>();
  for (const a of artifacts) {
    const slash = a.path.lastIndexOf("/");
    const folder = slash === -1 ? "." : a.path.slice(0, slash);
    const list = groups.get(folder) ?? [];
    list.push(a);
    groups.set(folder, list);
  }
  return groups;
}

function isMarkdown(filePath: string): boolean {
  return filePath.endsWith(".md");
}

interface FileViewerProps {
  artifact: ArtifactFile;
  projectId: string;
  onSaved: () => void;
}

function FileViewer({ artifact, projectId, onSaved }: FileViewerProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(artifact.content);
  const { pushToast } = useToastActions();

  const saveMutation = useMutation({
    mutationFn: () => artifactsApi.save(projectId, artifact.path, draft),
    onSuccess: () => {
      pushToast({ title: "File saved", tone: "success" });
      setEditing(false);
      onSaved();
    },
    onError: (err) => {
      pushToast({ title: `Save failed: ${(err as Error).message}`, tone: "error" });
    },
  });

  const handleEdit = () => {
    setDraft(artifact.content);
    setEditing(true);
  };

  const handleDiscard = () => {
    setDraft(artifact.content);
    setEditing(false);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-mono text-foreground truncate">{artifact.path}</span>
          <span className="text-xs text-muted-foreground shrink-0">{formatBytes(artifact.size)}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          {editing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDiscard}
                disabled={saveMutation.isPending}
                className="gap-1"
              >
                <X className="h-3.5 w-3.5" />
                Discard
              </Button>
              <Button
                size="sm"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="gap-1"
              >
                <Save className="h-3.5 w-3.5" />
                {saveMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={handleEdit} className="gap-1">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {editing ? (
          <textarea
            className="w-full h-full p-4 font-mono text-sm bg-background text-foreground resize-none border-0 outline-none"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
          />
        ) : isMarkdown(artifact.path) ? (
          <div className="p-4">
            <MarkdownBody>{artifact.content}</MarkdownBody>
          </div>
        ) : (
          <pre className="p-4 text-sm font-mono text-foreground whitespace-pre-wrap break-words">
            {artifact.content}
          </pre>
        )}
      </div>
    </div>
  );
}

export function ArtifactsTab({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);

  const queryKey = ["artifacts", projectId];
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey,
    queryFn: () => artifactsApi.list(projectId),
    staleTime: 30_000,
  });

  const handleSaved = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, projectId]);

  const artifacts = data?.artifacts ?? [];
  const selectedArtifact = artifacts.find((a) => a.path === selected) ?? null;
  const groups = groupByFolder(artifacts);
  const folderOrder = [...groups.keys()].sort((a, b) => {
    if (a === ".") return -1;
    if (b === ".") return 1;
    return a.localeCompare(b);
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading artifacts…</p>;
  }

  if (error) {
    return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  }

  if (artifacts.length === 0) {
    return (
      <div className="text-sm text-muted-foreground space-y-2">
        {data?.cwd ? (
          <>
            <p>No artifacts yet.</p>
            <p className="font-mono text-xs break-all text-muted-foreground/70">{data.cwd}</p>
            <p className="text-xs">Artifacts appear here once an agent writes to the workspace (e.g. <span className="font-mono">urs/main.md</span>, <span className="font-mono">specs/*.md</span>).</p>
          </>
        ) : (
          <>
            <p>No local workspace path is configured for this project.</p>
            <p className="text-xs">Add a local folder path in the project settings so agents can write artifacts here.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex border border-border rounded-lg overflow-hidden" style={{ height: "calc(100vh - 280px)", minHeight: "400px" }}>
      {/* File tree */}
      <div className="w-64 shrink-0 border-r border-border flex flex-col bg-muted/30">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Artifacts</span>
          <button
            onClick={() => refetch()}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="flex-1 overflow-auto py-1">
          {folderOrder.map((folder) => {
            const files = groups.get(folder) ?? [];
            return (
              <div key={folder}>
                {folder !== "." && (
                  <div className="flex items-center gap-1.5 px-3 py-1 text-xs text-muted-foreground font-medium">
                    <Folder className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{folder}</span>
                  </div>
                )}
                {files.map((f) => {
                  const basename = f.path.slice(f.path.lastIndexOf("/") + 1);
                  const isActive = selected === f.path;
                  return (
                    <button
                      key={f.path}
                      onClick={() => setSelected(f.path)}
                      className={`w-full text-left flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-foreground hover:bg-accent/50"
                      } ${folder !== "." ? "pl-7" : ""}`}
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate font-mono text-xs">{basename}</span>
                      {isActive && <ChevronRight className="h-3 w-3 ml-auto shrink-0 text-muted-foreground" />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Viewer / editor */}
      <div className="flex-1 min-w-0 flex flex-col">
        {selectedArtifact ? (
          <FileViewer
            key={selectedArtifact.path}
            artifact={selectedArtifact}
            projectId={projectId}
            onSaved={handleSaved}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Select a file to view
          </div>
        )}
      </div>
    </div>
  );
}
