import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Clock, Users, Video, Edit, Eye, Save, Trash2, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/auth-utils';
import { supabase } from '@/integrations/supabase/client';
import { CreateSessionDialog } from '@/components/training/CreateSessionDialog';
import { AssignSessionDialog } from '@/components/training/AssignSessionDialog';
import { toast } from 'sonner';
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

interface Session {
  id: string;
  session_name: string;
  session_type: string;
  start_datetime: string;
  end_datetime: string;
  meeting_platform: string;
  meeting_link: string;
  status: string;
  attendees: string[];
        notes?: string;
        recording_url?: string;
}

interface SessionEditData {
  notes: string;
  recording_url: string;
}

export const EnhancedTrainingSessions = () => {
  const { user, profile } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('today');
  
  // Dialog states
  const [isAssignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState<Session | null>(null);
  const [editData, setEditData] = useState<SessionEditData>({ notes: '', recording_url: '' });

  const isAdmin = ['Team Lead', 'HR', 'Management'].includes(profile?.role?.role_name || '');

  const fetchSessions = useCallback(async () => {
    if (!user || !profile) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('*')
        .order('start_datetime', { ascending: true });

      if (error) throw error;
      setSessions(data as Session[]);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast.error("Failed to load training sessions");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const categorizeSessionsByTime = (sessions: Session[]) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    return {
      today: sessions.filter(session => {
        const start = new Date(session.start_datetime);
        const end = new Date(session.end_datetime);
        // Today's sessions: start today and haven't ended yet
        return start >= startOfToday && start < endOfToday && end > now;
      }),
      scheduled: sessions.filter(session => {
        const start = new Date(session.start_datetime);
        // Future sessions: start date is after today
        return start >= endOfToday;
      }),
      past: sessions.filter(session => {
        const end = new Date(session.end_datetime);
        // Past sessions: session has ended (end time is before now)
        return end < now;
      })
    };
  };

  const categorizedSessions = categorizeSessionsByTime(sessions);

  const handleSessionCreated = (sessionId: string) => {
    fetchSessions();
    setSelectedSessionId(sessionId);
    setAssignDialogOpen(true);
  };

  const handleAssignClick = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setAssignDialogOpen(true);
  };

  const openDeleteDialog = (session: Session) => {
    setSessionToDelete(session);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;
    
    try {
      const { error } = await supabase
        .from('training_sessions')
        .delete()
        .eq('id', sessionToDelete.id);

      if (error) throw error;
      
      toast.success(`Session "${sessionToDelete.session_name}" deleted successfully.`);
      fetchSessions();
    } catch (error) {
      toast.error(`Failed to delete session: ${(error as Error).message}`);
    } finally {
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    }
  };

  const handleMarkComplete = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('training_sessions')
        .update({ status: 'completed' })
        .eq('id', sessionId);

      if (error) throw error;
      
      toast.success('Session marked as completed');
      fetchSessions();
    } catch (error) {
      console.error('Error marking session complete:', error);
      toast.error('Failed to mark session as complete');
    }
  };

  const openEditDialog = (session: Session) => {
    setSessionToEdit(session);
    setEditData({
      notes: session.notes || '',
      recording_url: session.recording_url || ''
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!sessionToEdit) return;

    try {
      const updateData: any = {
        status: 'completed'
      };
      if (editData.recording_url.trim()) updateData.recording_url = editData.recording_url.trim();
      if (editData.notes.trim()) updateData.notes = editData.notes.trim();

      const { error } = await supabase
        .from('training_sessions')
        .update(updateData)
        .eq('id', sessionToEdit.id);

      if (error) throw error;
      toast.success('Session marked as completed.');
      fetchSessions();
      setEditDialogOpen(false);
    } catch (error) {
      toast.error(`Failed to update session: ${(error as Error).message}`);
    }
  };

  const markCompletedQuick = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('training_sessions')
        .update({ status: 'completed' })
        .eq('id', sessionId);
      if (error) throw error;
      toast.success('Session marked as completed.');
      fetchSessions();
    } catch (e) {
      toast.error('Failed to mark as completed');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-success text-success-foreground';
      case 'in progress': return 'bg-warning text-warning-foreground';
      case 'cancelled': return 'bg-error text-error-foreground';
      default: return 'bg-primary text-primary-foreground';
    }
  };

  const canJoinSession = (session: Session) => {
    const tenMinutes = 10 * 60 * 1000;
    const startTime = new Date(session.start_datetime).getTime();
    const endTime = new Date(session.end_datetime).getTime();
    const now = new Date().getTime();
    // Can join 10 minutes before start time until session ends
    return now >= (startTime - tenMinutes) && now <= endTime;
  };

  const SessionCard = ({ session, showActions = true, isPast = false }: { 
    session: Session; 
    showActions?: boolean; 
    isPast?: boolean;
  }) => (
    <Card key={session.id} className="hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Video className="h-6 w-6 text-primary" />
            <Badge className={getStatusColor(session.status)}>
              {session.status}
            </Badge>
          </div>
          {session.session_type && (
            <Badge variant="outline" className="text-xs">
              {session.session_type}
            </Badge>
          )}
        </div>
        <CardTitle className="text-lg">{session.session_name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {new Date(session.start_datetime).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {new Date(session.start_datetime).toLocaleTimeString()} - {new Date(session.end_datetime).toLocaleTimeString()}
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {session.attendees?.length || 0} registered
          </div>
          {session.meeting_platform && (
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              {session.meeting_platform}
            </div>
          )}
        </div>

        {/* Show recording and notes for past sessions */}
        {isPast && (
          <div className="pt-2 border-t border-border space-y-2">
            <div className="text-sm space-y-1">
              <div>
                <Label className="font-medium">Recording:</Label>
                {session.recording_url ? (
                  <a 
                    href={session.recording_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline block mt-1"
                  >
                    View Recording
                  </a>
                ) : (
                  <p className="text-muted-foreground mt-1">Recording not yet available</p>
                )}
              </div>
              {session.notes && (
                <div>
                  <Label className="font-medium">Notes:</Label>
                  <p className="text-muted-foreground mt-1 text-xs">{session.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {showActions && (
          <div className="pt-4 border-t border-border">
            {profile?.role?.role_name === 'Trainee' ? (
              // Trainee actions
              <div className="space-y-2">
                {isPast ? (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled className="flex-1">
                      <FileText className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                ) : canJoinSession(session) ? (
                  <Button 
                    className="w-full"
                    onClick={() => window.open(session.meeting_link, '_blank')}
                  >
                    Join Session
                  </Button>
                ) : (
                  <Button className="w-full" disabled>
                    Join Session (Available 10 min before)
                  </Button>
                )}
              </div>
            ) : (
              // Admin actions
              <div className="flex gap-2">
                {isPast ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(session)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Session
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => openDeleteDialog(session)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                ) : session.status.toLowerCase() === 'completed' ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(session)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Session
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => openDeleteDialog(session)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAssignClick(session.id)}
                      className="flex-1"
                    >
                      Assign Participants
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(session)}
                      className="flex-1"
                    >
                      Mark Complete
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => openDeleteDialog(session)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const SessionGrid = ({ sessions, isPast = false }: { sessions: Session[]; isPast?: boolean }) => (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {sessions.map((session) => (
        <SessionCard key={session.id} session={session} isPast={isPast} />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Training Sessions</h2>
          <p className="text-muted-foreground">
            {profile?.role?.role_name === 'Trainee' 
              ? "Join live sessions and access recordings"
              : "Manage and schedule training sessions"
            }
          </p>
        </div>
        {isAdmin && <CreateSessionDialog onSessionCreated={handleSessionCreated} />}
      </div>

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="today" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Today ({categorizedSessions.today.length})
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Scheduled ({categorizedSessions.scheduled.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Past ({categorizedSessions.past.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-6">
          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="h-64 animate-pulse bg-muted" />
              ))}
            </div>
          ) : categorizedSessions.today.length > 0 ? (
            <SessionGrid sessions={categorizedSessions.today} />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No sessions scheduled for today</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="scheduled" className="mt-6">
          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="h-64 animate-pulse bg-muted" />
              ))}
            </div>
          ) : categorizedSessions.scheduled.length > 0 ? (
            <SessionGrid sessions={categorizedSessions.scheduled} />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No upcoming sessions scheduled</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="h-64 animate-pulse bg-muted" />
              ))}
            </div>
          ) : categorizedSessions.past.length > 0 ? (
            <SessionGrid sessions={categorizedSessions.past} isPast={true} />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No past sessions found</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Session Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Edit Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Session: {sessionToEdit?.session_name}</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recording_url">Recording URL</Label>
              <Input
                id="recording_url"
                type="url"
                placeholder="https://..."
                value={editData.recording_url}
                onChange={(e) => setEditData({ ...editData, recording_url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Session Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add notes about the session..."
                value={editData.notes}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Session Dialog */}
      <AssignSessionDialog 
        sessionId={selectedSessionId}
        open={isAssignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        onSessionAssigned={fetchSessions}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the session
              <strong> "{sessionToDelete?.session_name}"</strong> and remove all participant data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSession}>
              Delete Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};