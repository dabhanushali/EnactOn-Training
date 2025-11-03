import { useState, useEffect } from 'react';
import { Bell, X, CheckCircle, AlertCircle, Info, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth-utils';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  type: 'course' | 'project' | 'session' | 'evaluation' | 'general';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  priority: 'high' | 'medium' | 'low';
}

export const NotificationCenter = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

<<<<<<< HEAD
=======
  // Get read notifications from localStorage
  const getReadNotifications = (userId: string): Set<string> => {
    try {
      const stored = localStorage.getItem(`notifications_read_${userId}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  };

  // Save read notifications to localStorage
  const saveReadNotifications = (userId: string, readIds: Set<string>) => {
    try {
      localStorage.setItem(`notifications_read_${userId}`, JSON.stringify([...readIds]));
    } catch (error) {
      console.error('Error saving read notifications:', error);
    }
  };

>>>>>>> acecbb8 (changes)
  useEffect(() => {
    if (profile?.id) {
      fetchNotifications();
    }
  }, [profile?.id]);

  const fetchNotifications = async () => {
    if (!profile?.id) return;

    const notifs: Notification[] = [];
    const userRole = profile.role?.role_name;
<<<<<<< HEAD
=======
    const readNotifications = getReadNotifications(profile.id);
>>>>>>> acecbb8 (changes)

    try {
      // Course-related notifications for trainees
      if (userRole === 'Trainee') {
        const { data: enrollments } = await supabase
          .from('course_enrollments')
          .select('*, courses(*)')
          .eq('employee_id', profile.id)
          .eq('status', 'enrolled');

        enrollments?.forEach((enrollment) => {
<<<<<<< HEAD
          notifs.push({
            id: `course-${enrollment.id}`,
=======
          const notificationId = `course-${enrollment.id}`;
          notifs.push({
            id: notificationId,
>>>>>>> acecbb8 (changes)
            type: 'course',
            title: 'Continue Learning',
            message: `You have an active course: ${enrollment.courses.course_name}`,
            timestamp: new Date(enrollment.enrolled_date),
<<<<<<< HEAD
            read: false,
=======
            read: readNotifications.has(notificationId),
>>>>>>> acecbb8 (changes)
            actionUrl: `/courses/${enrollment.course_id}`,
            priority: 'medium',
          });
        });

        // Project notifications
        const { data: assignments } = await supabase
          .from('project_assignments')
          .select('*, projects(*)')
          .eq('assignee_id', profile.id)
          .eq('status', 'Started');

        assignments?.forEach((assignment) => {
<<<<<<< HEAD
          notifs.push({
            id: `project-${assignment.id}`,
=======
          const notificationId = `project-${assignment.id}`;
          notifs.push({
            id: notificationId,
>>>>>>> acecbb8 (changes)
            type: 'project',
            title: 'Project In Progress',
            message: `Complete your project: ${assignment.projects.project_name}`,
            timestamp: new Date(assignment.created_at),
<<<<<<< HEAD
            read: false,
=======
            read: readNotifications.has(notificationId),
>>>>>>> acecbb8 (changes)
            actionUrl: `/assignments/${assignment.id}`,
            priority: 'high',
          });
        });
      }

      // Team Lead notifications
      if (userRole === 'Team Lead') {
        const { data: pendingEvals } = await supabase
          .from('project_assignments')
          .select('*, projects(*), profiles!project_assignments_assignee_id_fkey(*)')
          .eq('assigned_by', profile.id)
          .eq('status', 'Submitted');

        pendingEvals?.forEach((assignment) => {
<<<<<<< HEAD
          notifs.push({
            id: `eval-${assignment.id}`,
=======
          const notificationId = `eval-${assignment.id}`;
          notifs.push({
            id: notificationId,
>>>>>>> acecbb8 (changes)
            type: 'evaluation',
            title: 'Pending Evaluation',
            message: `${assignment.profiles.first_name} ${assignment.profiles.last_name} submitted ${assignment.projects.project_name}`,
            timestamp: new Date(assignment.updated_at),
<<<<<<< HEAD
            read: false,
=======
            read: readNotifications.has(notificationId),
>>>>>>> acecbb8 (changes)
            actionUrl: `/projects/${assignment.project_id}`,
            priority: 'high',
          });
        });
      }

      // Training session notifications
      const { data: upcomingSessions } = await supabase
        .from('training_sessions')
        .select('*')
        .gte('start_datetime', new Date().toISOString())
        .lte('start_datetime', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
        .filter('attendees', 'cs', `{${profile.id}}`);

      upcomingSessions?.forEach((session) => {
        const startTime = new Date(session.start_datetime);
        const hoursUntil = Math.round((startTime.getTime() - Date.now()) / (1000 * 60 * 60));
<<<<<<< HEAD
        
        notifs.push({
          id: `session-${session.id}`,
=======
        const notificationId = `session-${session.id}`;

        notifs.push({
          id: notificationId,
>>>>>>> acecbb8 (changes)
          type: 'session',
          title: 'Upcoming Training Session',
          message: `${session.session_name} starts in ${hoursUntil} hour(s)`,
          timestamp: startTime,
<<<<<<< HEAD
          read: false,
=======
          read: readNotifications.has(notificationId),
>>>>>>> acecbb8 (changes)
          actionUrl: '/training-sessions',
          priority: hoursUntil <= 2 ? 'high' : 'medium',
        });
      });

      // Sort by priority and timestamp
      notifs.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return b.timestamp.getTime() - a.timestamp.getTime();
      });

      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = (id: string) => {
<<<<<<< HEAD
=======
    if (!profile?.id) return;

>>>>>>> acecbb8 (changes)
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
<<<<<<< HEAD
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
=======

    // Persist to localStorage
    const readNotifications = getReadNotifications(profile.id);
    readNotifications.add(id);
    saveReadNotifications(profile.id, readNotifications);
  };

  const markAllAsRead = () => {
    if (!profile?.id) return;

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);

    // Persist all notifications as read to localStorage
    const readNotifications = getReadNotifications(profile.id);
    notifications.forEach(notification => {
      readNotifications.add(notification.id);
    });
    saveReadNotifications(profile.id, readNotifications);
>>>>>>> acecbb8 (changes)
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      setOpen(false);
    }
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'course':
        return <Info className="h-4 w-4" />;
      case 'project':
        return <AlertCircle className="h-4 w-4" />;
      case 'session':
        return <Clock className="h-4 w-4" />;
      case 'evaluation':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-error/10 text-error border-error/20';
      case 'medium':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'low':
        return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </CardTitle>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  Mark all read
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              {notifications.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    No notifications yet
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                        !notification.read ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-full ${getPriorityColor(
                            notification.priority
                          )}`}
                        >
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium truncate">
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 ml-2" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {notification.timestamp.toLocaleDateString()} at{' '}
                            {notification.timestamp.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};
