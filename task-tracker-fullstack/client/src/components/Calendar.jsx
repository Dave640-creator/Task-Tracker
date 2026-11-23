import { useState } from "react";
import { dateString, todayString } from "../utils.js";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Calendar({ tasks, onOpen }) {
  // "month" is always the first day of the month being shown
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = month.getFullYear();
  const monthNumber = month.getMonth();
  const daysInMonth = new Date(year, monthNumber + 1, 0).getDate();
  const emptyCells = month.getDay(); // how many empty boxes before day 1 (Sunday = 0)
  const today = todayString();

  // Build the boxes: empty ones first, then one for each day
  const cells = [];
  for (let i = 0; i < emptyCells; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, date: dateString(new Date(year, monthNumber, day)) });
  }

  function changeMonth(amount) {
    setMonth(new Date(year, monthNumber + amount, 1));
  }

  return (
    <div>
      <h1 className="page-title">Calendar</h1>

      <div className="toolbar">
        <button className="btn" onClick={() => changeMonth(-1)}>Previous</button>
        <strong className="month-name">
          {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </strong>
        <button className="btn" onClick={() => changeMonth(1)}>Next</button>
        <button className="btn" onClick={() => { const n = new Date(); setMonth(new Date(n.getFullYear(), n.getMonth(), 1)); }}>
          Today
        </button>
      </div>

      <div className="calendar">
        {WEEKDAYS.map((name) => <div key={name} className="calendar-weekday">{name}</div>)}

        {cells.map((cell, index) => {
          if (!cell) return <div key={"empty" + index} className="calendar-cell empty" />;

          const dayTasks = tasks.filter((t) => t.due === cell.date);
          return (
            <div key={cell.date} className={cell.date === today ? "calendar-cell today" : "calendar-cell"}>
              <div className="calendar-day">{cell.day}</div>
              {dayTasks.slice(0, 3).map((task) => (
                <button key={task.id} className={"calendar-task priority-" + task.priority + (task.status === "done" ? " done-text" : "")}
                  onClick={() => onOpen(task.id)}>
                  {task.title}
                </button>
              ))}
              {dayTasks.length > 3 && <span className="muted small">+{dayTasks.length - 3} more</span>}
            </div>
          );
        })}
      </div>
      <p className="muted small">Tasks without a due date are not shown here.</p>
    </div>
  );
}
