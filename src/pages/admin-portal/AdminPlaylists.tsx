import { useState } from "react";
import { motion } from "framer-motion";
import {
  Music,
  Check,
  X,
  ExternalLink,
  Edit,
  Trash2,
  Plus,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useAllSubmissions,
  usePlaylistLibrary,
  useApproveSubmission,
  useRejectSubmission,
  useUpdateLibraryPlaylist,
  useDeleteLibraryPlaylist,
  useAddToLibrary,
  PLAYLIST_GENRES,
  PLATFORM_LABELS,
  PLATFORM_COLORS,
  type PlaylistSubmission,
  type PlaylistLibraryItem,
  type PlaylistPlatform,
} from "@/hooks/usePlaylistLibrary";
import { format } from "date-fns";

export default function AdminPlaylists() {
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | undefined>('pending');
  const [genreFilter, setGenreFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<PlaylistPlatform | undefined>();

  // Approval dialog
  const [approvalDialog, setApprovalDialog] = useState<PlaylistSubmission | null>(null);
  const [approvalGenre, setApprovalGenre] = useState('general');

  // Rejection dialog
  const [rejectionDialog, setRejectionDialog] = useState<PlaylistSubmission | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Edit dialog
  const [editDialog, setEditDialog] = useState<PlaylistLibraryItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editGenre, setEditGenre] = useState('');
  const [editCoverUrl, setEditCoverUrl] = useState('');

  // Add dialog
  const [addDialog, setAddDialog] = useState(false);
  const [addPlatform, setAddPlatform] = useState<PlaylistPlatform>('spotify');
  const [addUrl, setAddUrl] = useState('');
  const [addName, setAddName] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [addGenre, setAddGenre] = useState('general');
  const [addCoverUrl, setAddCoverUrl] = useState('');

  const { data: submissions = [], isLoading: loadingSubmissions } = useAllSubmissions(statusFilter);
  const { data: library = [], isLoading: loadingLibrary } = usePlaylistLibrary(platformFilter, genreFilter);

  const { mutate: approve, isPending: approving } = useApproveSubmission();
  const { mutate: reject, isPending: rejecting } = useRejectSubmission();
  const { mutate: updatePlaylist, isPending: updating } = useUpdateLibraryPlaylist();
  const { mutate: deletePlaylist, isPending: deleting } = useDeleteLibraryPlaylist();
  const { mutate: addToLibrary, isPending: adding } = useAddToLibrary();

  const handleApprove = () => {
    if (!approvalDialog) return;
    approve(
      { submission: approvalDialog, genre: approvalGenre },
      { onSuccess: () => setApprovalDialog(null) }
    );
  };

  const handleReject = () => {
    if (!rejectionDialog) return;
    reject(
      { submissionId: rejectionDialog.id, reason: rejectionReason },
      {
        onSuccess: () => {
          setRejectionDialog(null);
          setRejectionReason('');
        },
      }
    );
  };

  const handleEdit = () => {
    if (!editDialog) return;
    updatePlaylist(
      {
        id: editDialog.id,
        updates: {
          name: editName,
          description: editDescription || null,
          genre: editGenre,
          cover_art_url: editCoverUrl || null,
        },
      },
      { onSuccess: () => setEditDialog(null) }
    );
  };

  const handleAdd = () => {
    addToLibrary(
      {
        platform: addPlatform,
        playlist_url: addUrl,
        name: addName,
        description: addDescription || undefined,
        cover_art_url: addCoverUrl || undefined,
        genre: addGenre,
      },
      {
        onSuccess: () => {
          setAddDialog(false);
          setAddPlatform('spotify');
          setAddUrl('');
          setAddName('');
          setAddDescription('');
          setAddGenre('general');
          setAddCoverUrl('');
        },
      }
    );
  };

  const openEditDialog = (playlist: PlaylistLibraryItem) => {
    setEditDialog(playlist);
    setEditName(playlist.name);
    setEditDescription(playlist.description || '');
    setEditGenre(playlist.genre);
    setEditCoverUrl(playlist.cover_art_url || '');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-500 border-yellow-500"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-500 border-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-500 border-red-500"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Playlist Management</h1>
          <p className="text-muted-foreground">Moderate submissions and manage the playlist library</p>
        </div>
      </div>

      <Tabs defaultValue="submissions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="library">Library</TabsTrigger>
        </TabsList>

        {/* Submissions Tab */}
        <TabsContent value="submissions" className="space-y-4">
          <div className="flex gap-2">
            <Select
              value={statusFilter || 'all'}
              onValueChange={(v) => setStatusFilter(v === 'all' ? undefined : v as 'pending' | 'approved' | 'rejected')}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loadingSubmissions ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No submissions found
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Playlist</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Suggested Genre</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {submission.cover_art_url ? (
                            <img
                              src={submission.cover_art_url}
                              alt=""
                              className="h-10 w-10 rounded object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                              <Music className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{submission.name}</p>
                            <a
                              href={submission.playlist_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              View <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          style={{
                            backgroundColor: `${PLATFORM_COLORS[submission.platform as PlaylistPlatform]}20`,
                            color: PLATFORM_COLORS[submission.platform as PlaylistPlatform],
                          }}
                        >
                          {PLATFORM_LABELS[submission.platform as PlaylistPlatform]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {submission.suggested_genre ? (
                          <Badge variant="outline">{submission.suggested_genre}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(submission.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(submission.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        {submission.status === 'pending' && (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-500 hover:text-green-600"
                              onClick={() => {
                                setApprovalDialog(submission);
                                setApprovalGenre(submission.suggested_genre || 'general');
                              }}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-500 hover:text-red-600"
                              onClick={() => setRejectionDialog(submission)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Library Tab */}
        <TabsContent value="library" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Select
              value={platformFilter || 'all'}
              onValueChange={(v) => setPlatformFilter(v === 'all' ? undefined : v as PlaylistPlatform)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                {(Object.entries(PLATFORM_LABELS) as [PlaylistPlatform, string][]).map(
                  ([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>

            <Select value={genreFilter} onValueChange={setGenreFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                {PLAYLIST_GENRES.map((genre) => (
                  <SelectItem key={genre} value={genre}>
                    {genre.charAt(0).toUpperCase() + genre.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={() => setAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Playlist
            </Button>
          </div>

          {loadingLibrary ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : library.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No playlists in library
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Playlist</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Genre</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {library.map((playlist) => (
                    <TableRow key={playlist.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {playlist.cover_art_url ? (
                            <img
                              src={playlist.cover_art_url}
                              alt=""
                              className="h-10 w-10 rounded object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                              <Music className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{playlist.name}</p>
                            <a
                              href={playlist.playlist_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              View <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          style={{
                            backgroundColor: `${PLATFORM_COLORS[playlist.platform as PlaylistPlatform]}20`,
                            color: PLATFORM_COLORS[playlist.platform as PlaylistPlatform],
                          }}
                        >
                          {PLATFORM_LABELS[playlist.platform as PlaylistPlatform]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{playlist.genre}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(playlist.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(playlist)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => deletePlaylist(playlist.id)}
                            disabled={deleting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Approval Dialog */}
      <Dialog open={!!approvalDialog} onOpenChange={() => setApprovalDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Approve <strong>{approvalDialog?.name}</strong> and add it to the library?
            </p>
            <div className="space-y-2">
              <Label>Genre</Label>
              <Select value={approvalGenre} onValueChange={setApprovalGenre}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAYLIST_GENRES.map((genre) => (
                    <SelectItem key={genre} value={genre}>
                      {genre.charAt(0).toUpperCase() + genre.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={approving}>
              {approving ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={!!rejectionDialog} onOpenChange={() => setRejectionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Reject <strong>{rejectionDialog?.name}</strong>?
            </p>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this submission was rejected..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectionDialog(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejecting}>
              {rejecting ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Genre</Label>
              <Select value={editGenre} onValueChange={setEditGenre}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAYLIST_GENRES.map((genre) => (
                    <SelectItem key={genre} value={genre}>
                      {genre.charAt(0).toUpperCase() + genre.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cover Image URL</Label>
              <Input value={editCoverUrl} onChange={(e) => setEditCoverUrl(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={updating}>
              {updating ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Playlist to Library</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={addPlatform} onValueChange={(v) => setAddPlatform(v as PlaylistPlatform)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(PLATFORM_LABELS) as [PlaylistPlatform, string][]).map(
                    ([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Playlist URL</Label>
              <Input
                value={addUrl}
                onChange={(e) => setAddUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={addName} onChange={(e) => setAddName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Genre</Label>
              <Select value={addGenre} onValueChange={setAddGenre}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAYLIST_GENRES.map((genre) => (
                    <SelectItem key={genre} value={genre}>
                      {genre.charAt(0).toUpperCase() + genre.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cover Image URL</Label>
              <Input value={addCoverUrl} onChange={(e) => setAddCoverUrl(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={adding || !addUrl || !addName}>
              {adding ? 'Adding...' : 'Add to Library'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
