"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 w-full",
        month_caption: "flex justify-center pt-1 relative items-center h-10 mb-4",
        caption_label: "hidden", // Hide default label when dropdowns are enabled
        nav: "flex items-center",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 z-30 absolute left-1 top-1"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 z-30 absolute right-1 top-1"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex w-full mb-2",
        weekday: "text-muted-foreground rounded-md font-bold text-[10px] uppercase tracking-widest text-center flex-1 h-9 flex items-center justify-center",
        week: "flex w-full mt-2",
        day: cn(
          "relative h-9 p-0 text-center text-sm focus-within:relative focus-within:z-20 flex-1 flex justify-center items-center"
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-medium aria-selected:opacity-100 hover:bg-primary/10 transition-colors rounded-lg w-full"
        ),
        range_end: "day-range-end",
        selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground font-bold shadow-lg shadow-primary/20 rounded-lg",
        today: "bg-accent/10 text-accent font-bold ring-1 ring-accent/20 rounded-lg",
        outside: "day-outside text-muted-foreground/40 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        disabled: "text-muted-foreground opacity-50",
        range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        caption_dropdowns: "flex justify-center gap-3 items-center absolute inset-0 pointer-events-none",
        dropdown: "bg-transparent font-bold text-sm text-primary cursor-pointer hover:bg-primary/5 px-2 py-1 rounded transition-colors focus:outline-none appearance-none border-none outline-none pointer-events-auto",
        dropdown_month: "relative inline-flex items-center",
        dropdown_year: "relative inline-flex items-center",
        ...classNames,
      }}
      components={{
        Chevron: (props) => {
          if (props.orientation === 'left') return <ChevronLeft className="h-4 w-4" />
          return <ChevronRight className="h-4 w-4" />
        }
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
