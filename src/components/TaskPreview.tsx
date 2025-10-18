import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Calendar, Clock, Tag } from "lucide-react";

// Task type matching backend schema (server/src/types/index.ts)
interface Task {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  tags?: string[];
  metadata?: Record<string, any>;
}

interface TaskPreviewProps {
  tasks: Task[];
}

export const TaskPreview = ({ tasks }: TaskPreviewProps) => {
  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "urgent": 
        return "text-red-600";
      case "high": 
        return "text-destructive";
      case "medium": 
        return "text-primary";
      case "low": 
        return "text-muted-foreground";
    }
  };

  const getPriorityBg = (priority: Task["priority"]) => {
    switch (priority) {
      case "urgent": 
        return "bg-red-600/10 border-red-600/30";
      case "high": 
        return "bg-destructive/10 border-destructive/20";
      case "medium": 
        return "bg-primary/10 border-primary/20";
      case "low": 
        return "bg-muted border-border";
    }
  };

  const getStatusColor = (status: Task["status"]) => {
    switch (status) {
      case "pending":
        return "bg-gray-100 text-gray-700 border-gray-200";
      case "in_progress":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "completed":
        return "bg-green-100 text-green-700 border-green-200";
      case "cancelled":
        return "bg-red-100 text-red-700 border-red-200";
    }
  };

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "in_progress":
        return <Clock className="h-5 w-5 text-blue-600" />;
      case "cancelled":
        return <Circle className="h-5 w-5 text-red-400" />;
      case "pending":
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
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

  const isOverdue = (dueDate?: Date | string, status?: Task["status"]) => {
    if (!dueDate || status === "completed" || status === "cancelled") return false;
    const dueDateObj = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    return dueDateObj < new Date();
  };

  return (
    <div className="my-4 space-y-2 max-w-2xl">
      {tasks.map((task) => (
        <Card
          key={task.id}
          className={`p-4 transition-all hover:shadow-md ${
            task.status === "completed" || task.status === "cancelled" ? "opacity-70" : ""
          } ${getPriorityBg(task.priority)}`}
        >
          <div className="flex items-start gap-3">
            <div className="mt-1">
              {getStatusIcon(task.status)}
            </div>
            <div className="flex-1">
              {/* Priority and Status Badges */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border ${getPriorityColor(task.priority)} ${getPriorityBg(task.priority)}`}>
                  {task.priority}
                </span>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getStatusColor(task.status)}`}
                >
                  {task.status.replace('_', ' ')}
                </Badge>
              </div>

              {/* Title */}
              <p
                className={`text-sm font-medium leading-relaxed mb-1 ${
                  task.status === "completed" ? "line-through text-muted-foreground" : ""
                }`}
              >
                {task.title}
              </p>

              {/* Description */}
              {task.description && (
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {task.description}
                </p>
              )}

              {/* Due Date */}
              {task.dueDate && (
                <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className={`text-xs ${
                    isOverdue(task.dueDate, task.status) ? "text-red-600 font-semibold" : ""
                  }`}>
                    Due: {formatDate(task.dueDate)}
                    {isOverdue(task.dueDate, task.status) && " (Overdue)"}
                  </span>
                </div>
              )}

              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  <div className="flex gap-1.5 flex-wrap">
                    {task.tags.map((tag, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className="text-xs px-2 py-0.5"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
