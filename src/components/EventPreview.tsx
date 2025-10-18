import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Users } from "lucide-react";

// Event type matching backend schema (server/src/types/index.ts)
interface Event {
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

interface EventPreviewProps {
  events: Event[];
}

export const EventPreview = ({ events }: EventPreviewProps) => {
  const getTypeColor = (type: Event["type"]) => {
    switch (type) {
      case "meeting": 
        return "bg-primary/10 text-primary border-primary/20";
      case "appointment": 
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "deadline": 
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "reminder": 
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "other": 
        return "bg-secondary/10 text-secondary-foreground border-secondary/20";
    }
  };

  const getStatusColor = (status: Event["status"]) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "in_progress":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "cancelled":
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const formatTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  };

  const formatDateRange = (startDate: Date | string, endDate: Date | string) => {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
    
    const isSameDay = start.toDateString() === end.toDateString();
    
    if (isSameDay) {
      return `${formatDate(start)} • ${formatTime(start)} - ${formatTime(end)}`;
    } else {
      return `${formatDate(start)} ${formatTime(start)} - ${formatDate(end)} ${formatTime(end)}`;
    }
  };

  return (
    <div className="my-4 space-y-2 max-w-2xl">
      {events.map((event) => (
        <Card
          key={event.id}
          className={`p-4 transition-all hover:shadow-md border ${
            event.status === 'cancelled' ? 'opacity-60' : ''
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              {/* Type and Status Badges */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border ${getTypeColor(event.type)}`}>
                  {event.type}
                </div>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getStatusColor(event.status)}`}
                >
                  {event.status.replace('_', ' ')}
                </Badge>
              </div>

              {/* Title */}
              <p className="text-sm font-medium leading-relaxed mb-1">
                {event.title}
              </p>

              {/* Description */}
              {event.description && (
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {event.description}
                </p>
              )}

              {/* Date and Time */}
              <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs">
                  {formatDateRange(event.startDate, event.endDate)}
                </span>
              </div>

              {/* Location */}
              {event.location && (
                <div className="flex items-center gap-2 mt-1.5 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="text-xs">{event.location}</span>
                </div>
              )}

              {/* Attendees */}
              {event.attendees && event.attendees.length > 0 && (
                <div className="flex items-center gap-2 mt-1.5 text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span className="text-xs">
                    {event.attendees.length} {event.attendees.length === 1 ? 'attendee' : 'attendees'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
