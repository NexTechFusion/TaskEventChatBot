import { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, RefreshCw, Trash2, X } from "lucide-react";
import { EventPreview } from "@/components/EventPreview";
import { useEvents } from "@/hooks/useEvents";
import { useToast } from "@/hooks/use-toast";
import { getUserId } from "@/lib/storage";

// Extended Event interface matching backend schema
interface ExtendedEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date | string;
  endDate: Date | string;
  location?: string;
  type: "meeting" | "appointment" | "deadline" | "reminder" | "other";
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  attendees?: string[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
  metadata?: Record<string, any>;
}

export const CalendarView = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [newEvent, setNewEvent] = useState("");
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ExtendedEvent | null>(null);
  const [attendeeInput, setAttendeeInput] = useState("");
  const { toast } = useToast();

  const {
    events,
    isLoading,
    createEvent,
    updateEvent,
    deleteEvent,
    refreshEvents,
    getEventsForDate,
  } = useEvents({
    userId: getUserId(),
    onError: (error) => {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    },
    onSuccess: (message) => {
      toast({
        title: "Success",
        description: message,
      });
    },
  });

  const selectedDateEvents = getEventsForDate(date || new Date());

  // Convert LocalEvent to ExtendedEvent format for display
  const displayEvents: ExtendedEvent[] = selectedDateEvents.map(event => ({
    id: event.id,
    title: event.title,
    description: event.description,
    startDate: event.date,
    endDate: new Date(event.date.getTime() + 3600000), // 1 hour later
    location: event.location,
    type: event.type as ExtendedEvent["type"],
    status: 'scheduled' as const,
    attendees: event.attendees,
    createdAt: undefined,
    updatedAt: undefined,
  }));

  // Get dates that have events for showing indicators
  const datesWithEvents = useMemo(() => {
    const dates = new Set<string>();
    events.forEach(event => {
      const dateStr = event.date.toDateString();
      dates.add(dateStr);
    });
    return dates;
  }, [events]);

  // Check if a date has events
  const hasEvents = (date: Date) => {
    return datesWithEvents.has(date.toDateString());
  };

  const handleAddEvent = async () => {
    if (!newEvent.trim()) return;

    // Pass the selected date to createEvent
    await createEvent(newEvent, date);
    setNewEvent("");
    setShowAddEvent(false);
  };

  const handleEdit = (event: ExtendedEvent) => {
    setEditingEvent({ ...event });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingEvent) return;

    const localEvent = events.find(e => e.id === editingEvent.id);
    if (!localEvent) return;

    await updateEvent(editingEvent.id, {
      title: editingEvent.title,
      description: editingEvent.description,
      date: new Date(editingEvent.startDate),
      type: editingEvent.type as any,
      location: editingEvent.location,
      attendees: editingEvent.attendees,
    });

    setIsEditModalOpen(false);
    setEditingEvent(null);
  };

  const handleAddAttendee = () => {
    if (!editingEvent || !attendeeInput.trim()) return;

    const currentAttendees = editingEvent.attendees || [];
    if (!currentAttendees.includes(attendeeInput.trim())) {
      setEditingEvent({
        ...editingEvent,
        attendees: [...currentAttendees, attendeeInput.trim()]
      });
    }
    setAttendeeInput("");
  };

  const handleRemoveAttendee = (attendeeToRemove: string) => {
    if (!editingEvent) return;
    setEditingEvent({
      ...editingEvent,
      attendees: (editingEvent.attendees || []).filter(attendee => attendee !== attendeeToRemove)
    });
  };

  const handleDeleteFromModal = async () => {
    if (!editingEvent) return;

    if (confirm('Are you sure you want to delete this event?')) {
      await deleteEvent(editingEvent.id);
      setIsEditModalOpen(false);
      setEditingEvent(null);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 h-full overflow-auto">
      <Card className="p-6 flex-shrink-0">
        <style>{`
          .has-events {
            position: relative;
          }
          .has-events::after {
            content: '';
            position: absolute;
            bottom: 2px;
            left: 50%;
            transform: translateX(-50%);
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background-color: hsl(var(--primary));
          }
        `}</style>
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="rounded-md"
          modifiers={{
            hasEvents: (date) => hasEvents(date)
          }}
          modifiersClassNames={{
            hasEvents: "has-events"
          }}
        />
      </Card>

      <Card className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold">
              {date?.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric"
              })}
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              {selectedDateEvents.length} events scheduled
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={refreshEvents}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <Button 
              size="sm" 
              className="rounded-full"
              onClick={() => setShowAddEvent(!showAddEvent)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </div>
        </div>

        {showAddEvent && (
          <Card className="p-4 mb-6">
            <div className="flex gap-2">
              <Input
                value={newEvent}
                onChange={(e) => setNewEvent(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddEvent()}
                placeholder={`Add event for ${date?.toLocaleDateString() || 'today'}...`}
                className="flex-1"
                disabled={isLoading}
              />
              <Button 
                onClick={handleAddEvent} 
                disabled={isLoading || !newEvent.trim()}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </Card>
        )}

        <div className="space-y-3">
          {displayEvents.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No events scheduled for this date
            </p>
          ) : (
            <div className="space-y-3">
              {displayEvents.map((event) => (
                <div
                  key={event.id}
                  className="cursor-pointer transition-transform hover:scale-[1.01]"
                  onClick={() => handleEdit(event)}
                >
                  <EventPreview events={[event]} />
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Edit Event Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>

          {editingEvent && (
            <div className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={editingEvent.title}
                  onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  placeholder="Event title"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editingEvent.description || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                  placeholder="Event description (optional)"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Type */}
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={editingEvent.type}
                    onValueChange={(value: ExtendedEvent["type"]) =>
                      setEditingEvent({ ...editingEvent, type: value })
                    }
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="appointment">Appointment</SelectItem>
                      <SelectItem value="deadline">Deadline</SelectItem>
                      <SelectItem value="reminder">Reminder</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={editingEvent.status}
                    onValueChange={(value: ExtendedEvent["status"]) =>
                      setEditingEvent({ ...editingEvent, status: value })
                    }
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Start Date */}
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date & Time</Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={editingEvent.startDate ?
                      new Date(editingEvent.startDate).toISOString().slice(0, 16) :
                      ''
                    }
                    onChange={(e) => setEditingEvent({
                      ...editingEvent,
                      startDate: e.target.value ? new Date(e.target.value) : new Date()
                    })}
                  />
                </div>

                {/* End Date */}
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date & Time</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={editingEvent.endDate ?
                      new Date(editingEvent.endDate).toISOString().slice(0, 16) :
                      ''
                    }
                    onChange={(e) => setEditingEvent({
                      ...editingEvent,
                      endDate: e.target.value ? new Date(e.target.value) : new Date()
                    })}
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={editingEvent.location || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })}
                  placeholder="Event location (optional)"
                />
              </div>

              {/* Attendees */}
              <div className="space-y-2">
                <Label htmlFor="attendees">Attendees</Label>
                <div className="flex gap-2">
                  <Input
                    id="attendees"
                    value={attendeeInput}
                    onChange={(e) => setAttendeeInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAddAttendee()}
                    placeholder="Add attendee email or name..."
                  />
                  <Button type="button" onClick={handleAddAttendee} size="sm">
                    Add
                  </Button>
                </div>
                {editingEvent.attendees && editingEvent.attendees.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editingEvent.attendees.map((attendee, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {attendee}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => handleRemoveAttendee(attendee)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
            <Button
              variant="destructive"
              onClick={handleDeleteFromModal}
              disabled={isLoading}
              className="sm:mr-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Event
            </Button>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={isLoading || !editingEvent?.title.trim()}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
