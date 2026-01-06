
import { useState } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CalendarViewProps {
    posts: any[];
    onSchedulePost: (date: Date) => void;
}

export default function CalendarView({ posts, onSchedulePost }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const today = () => setCurrentDate(new Date());

    const getPostsForDay = (day: Date) => {
        return posts.filter(post =>
            post.scheduledAt && isSameDay(new Date(post.scheduledAt), day)
        );
    };

    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
        <Card className="bg-card border border-border p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="headline-md text-foreground">Content Calendar</h3>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={prevMonth}>
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-base font-medium min-w-[120px] text-center">
                        {format(currentDate, "MMMM yyyy")}
                    </span>
                    <Button variant="outline" size="sm" onClick={nextMonth}>
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={today} className="ml-2">
                        Today
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border">
                {/* Weekday headers */}
                {weekDays.map((day) => (
                    <div key={day} className="bg-muted/50 p-2 text-center text-sm font-medium text-muted-foreground">
                        {day}
                    </div>
                ))}

                {/* Days */}
                {days.map((day, dayIdx) => {
                    const dayPosts = getPostsForDay(day);
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isToday = isSameDay(day, new Date());

                    return (
                        <div
                            key={day.toString()}
                            className={cn(
                                "min-h-[120px] bg-card p-2 transition-colors hover:bg-accent/5 cursor-pointer relative group",
                                !isCurrentMonth && "bg-muted/10 text-muted-foreground"
                            )}
                            onClick={() => onSchedulePost(day)}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span
                                    className={cn(
                                        "text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full",
                                        isToday && "bg-accent text-accent-foreground"
                                    )}
                                >
                                    {format(day, "d")}
                                </span>
                                {dayPosts.length > 0 && (
                                    <Badge variant="secondary" className="text-[10px] h-4 px-1">
                                        {dayPosts.length}
                                    </Badge>
                                )}
                            </div>

                            <div className="space-y-1 mt-1">
                                {dayPosts.slice(0, 3).map((post) => (
                                    <div
                                        key={post.id}
                                        className="text-[10px] truncate bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20"
                                        title={post.title}
                                    >
                                        {post.platform === "linkedin" && "in "}
                                        {post.platform === "facebook" && "fb "}
                                        {post.platform === "instagram" && "ig "}
                                        {post.platform === "twitter" && "tw "}
                                        {post.title}
                                    </div>
                                ))}
                                {dayPosts.length > 3 && (
                                    <div className="text-[10px] text-muted-foreground pl-1">
                                        +{dayPosts.length - 3} more
                                    </div>
                                )}
                            </div>

                            <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                <span className="text-xs font-medium text-accent">+ Schedule</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}
