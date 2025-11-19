import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FileText, Plus, Save, Image as ImageIcon, Bot, Edit, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Note {
  id: string;
  content: string;
  note_type: string;
  created_at: string;
  created_by?: string;
  source_call_id?: string;
}

interface NotesEditorProps {
  dealId: string;
  dealNotes?: string; // Deal notes from the deals table
  onDealNotesUpdate?: (notes: string) => void; // Callback to update deal notes
}

export function NotesEditor({ dealId, dealNotes, onDealNotesUpdate }: NotesEditorProps) {
  const [newNote, setNewNote] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [isEditingDealNotes, setIsEditingDealNotes] = useState(false);
  const [editedDealNotes, setEditedDealNotes] = useState(dealNotes || "");
  const { toast } = useToast();

  // Fetch notes from database
  useEffect(() => {
    fetchNotes();
  }, [dealId]);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast({
        title: "Error",
        description: "Failed to load notes",
        variant: "destructive",
      });
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('notes')
        .insert({
          deal_id: dealId,
          content: newNote,
          note_type: 'manual',
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      setNotes([data, ...notes]);
      setNewNote("");
      setIsAdding(false);

      toast({
        title: "Note Added",
        description: "Your note has been saved successfully.",
      });
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: "Error",
        description: "Failed to add note",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `deal-${dealId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('deal-attachments')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('deal-attachments')
        .getPublicUrl(filePath);

      // Insert the image markdown into the note content
      const imageMarkdown = `\n![${file.name}](${publicUrl})\n`;
      setNewNote(prev => prev + imageMarkdown);

      toast({
        title: "Image uploaded",
        description: "Image has been added to your note",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload failed", 
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditNote = (note: Note) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
  };

  const handleSaveEdit = async () => {
    if (!editingNoteId || !editingContent.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('notes')
        .update({ content: editingContent })
        .eq('id', editingNoteId);

      if (error) throw error;

      setNotes(notes.map(note => 
        note.id === editingNoteId ? { ...note, content: editingContent } : note
      ));
      setEditingNoteId(null);
      setEditingContent("");

      toast({
        title: "Note Updated",
        description: "Your note has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating note:', error);
      toast({
        title: "Error",
        description: "Failed to update note",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!deleteNoteId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', deleteNoteId);

      if (error) throw error;

      setNotes(notes.filter(note => note.id !== deleteNoteId));
      setDeleteNoteId(null);

      toast({
        title: "Note Deleted",
        description: "Your note has been deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDealNotes = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('deals')
        .update({ notes: editedDealNotes } as any)
        .eq('id', dealId);

      if (error) throw error;

      setIsEditingDealNotes(false);
      if (onDealNotesUpdate) {
        onDealNotesUpdate(editedDealNotes);
      }

      toast({
        title: "Deal Notes Updated",
        description: "Your deal notes have been saved successfully.",
      });
    } catch (error) {
      console.error('Error updating deal notes:', error);
      toast({
        title: "Error",
        description: "Failed to update deal notes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Deal Notes (from deals table) */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Deal Notes
            </CardTitle>
            {!isEditingDealNotes && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingDealNotes(true)}
                className="h-8"
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            These notes are synced with the Deal Information section
          </p>
        </CardHeader>
        <CardContent>
          {isEditingDealNotes ? (
            <div className="space-y-3">
              <Textarea
                value={editedDealNotes}
                onChange={(e) => setEditedDealNotes(e.target.value)}
                placeholder="Add notes about this deal..."
                className="min-h-32"
              />
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditingDealNotes(false);
                    setEditedDealNotes(dealNotes || "");
                  }}
                  disabled={loading}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveDealNotes}
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm prose prose-sm max-w-none">
              {dealNotes ? (
                dealNotes.split('\n').map((line, index) => (
                  line ? (
                    <p key={index} className="mb-2 leading-relaxed">
                      {line}
                    </p>
                  ) : (
                    <br key={index} />
                  )
                ))
              ) : (
                <p className="text-muted-foreground italic">No deal notes yet. Click Edit to add notes.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add New Note */}
      {isAdding ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add New Note</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Write your note here... You can paste screenshots and add detailed information."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-32"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById(`image-upload-${dealId}`)?.click()}
                  disabled={loading}
                >
                  <ImageIcon className="h-4 w-4 mr-1" />
                  Add Image
                </Button>
                <input
                  id={`image-upload-${dealId}`}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAdding(false);
                    setNewNote("");
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddNote} disabled={loading || !newNote.trim()}>
                  <Save className="h-4 w-4 mr-1" />
                  Save Note
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setIsAdding(true)} className="w-full">
          <Plus className="h-4 w-4 mr-1" />
          Add Note
        </Button>
      )}

      {/* Notes List */}
      <div className="space-y-4">
        {isLoadingNotes ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">Loading notes...</p>
          </div>
        ) : notes.length > 0 ? (
          notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="p-4">
                {editingNoteId === note.id ? (
                  // Edit Mode
                  <div className="space-y-3">
                    <Textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      className="min-h-32"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingNoteId(null);
                          setEditingContent("");
                        }}
                        disabled={loading}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={loading || !editingContent.trim()}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {note.note_type === 'ai_summary' ? <Bot className="h-4 w-4" /> : 'CU'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {note.note_type === 'ai_summary' && (
                            <Badge variant="secondary" className="gap-1">
                              <Bot className="h-3 w-3" />
                              AI Summary
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(note.created_at).toLocaleString()}
                          </span>
                        </div>
                        {note.note_type !== 'ai_summary' && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditNote(note)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteNoteId(note.id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="text-sm prose prose-sm max-w-none">
                      {note.content.split('\n').map((line, index) => {
                        // Check if line is an image markdown
                        const imageMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
                        if (imageMatch) {
                          const [, alt, src] = imageMatch;
                          return (
                            <div key={index} className="my-3">
                              <img
                                src={src}
                                alt={alt}
                                className="max-w-full h-auto rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow"
                                style={{ maxHeight: '400px' }}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                                loading="lazy"
                              />
                            </div>
                          );
                        }
                        // Regular text line  
                        return line ? (
                          <p key={index} className="mb-2 leading-relaxed">
                            {line}
                          </p>
                        ) : (
                          <br key={index} />
                        );
                      })}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold">No notes yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Start by adding your first note about this deal.
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteNoteId} onOpenChange={(open) => !open && setDeleteNoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this note. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNote} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
