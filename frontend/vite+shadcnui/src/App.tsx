import { X, Plus } from "lucide-react";
import { Button } from "./components/ui/button";
import { Checkbox } from "./components/ui/checkbox";
import { Input } from "./components/ui/input";
import { Card, CardDescription } from "./components/ui/card";
import { Separator } from "./components/ui/separator";
import { Task } from "./types/task";
import { useEffect, useState } from "react";

const Header = () => (
  <div>
    <h1 className="m-3 text-2xl">ToDo</h1>
  </div>
);

type TaskFormProps = {
  text: string;
  onTextChange: (text: string) => void;
  onSubmit: () => void;
};

const TaskForm = ({ text, onTextChange, onSubmit }: TaskFormProps) => {
  return (
    <div className="flex m-3 gap-3 w-auto items-center">
      <Input value={text} onChange={(e) => onTextChange(e.target.value)} />
      <Button onClick={onSubmit}>
        <Plus />
      </Button>
    </div>
  );
};

type TaskCardProps = {
  task: Task;
  onDelete: (id: string) => void;
  onToggleCompleted: (id: string, completed: boolean) => void;
};

const TaskCard = ({ task, onDelete, onToggleCompleted }: TaskCardProps) => {
  return (
    <Card className="flex m-3 p-3 gap-3 w-auto items-center">
      <Checkbox
        checked={task.completed}
        onCheckedChange={(checked) =>
          checked !== "indeterminate" && onToggleCompleted(task.id, checked)
        }
      />
      <CardDescription className="flex-auto">{task.text}</CardDescription>
      <Button variant="ghost" size="icon" onClick={() => onDelete(task.id)}>
        <X className="h-4 w-4" />
      </Button>
    </Card>
  );
};

type TaskListProps = {
  tasks: Task[];
  onDelete: (id: string) => void;
  onToggleCompleted: (id: string, completed: boolean) => void;
};

const TaskList = ({ tasks, ...handler }: TaskListProps) => {
  return (
    <div>
      {tasks.map((task) => (
        <TaskCard task={task} {...handler} />
      ))}
    </div>
  );
};

const ToDoBoard = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [text, setText] = useState("");

  const fetchTasks = async (signal?: AbortSignal) => {
    fetch("http://localhost:3000/tasks", { signal })
      .then((res) => res.json())
      .then((data) => setTasks(data));
  };

  const handleFormChange = (text: string) => {
    setText(text);
  };

  const handleSubmit = () => {
    fetch("http://localhost:3000/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    })
      .then(() => setText(""))
      .then(() => fetchTasks());
  };

  const handleDeleteTask = (id: string) => {
    fetch(`http://localhost:3000/tasks/${id}`, {
      method: "DELETE",
    }).then(() => fetchTasks());
  };

  const handleToggleTaskCompleted = (id: string, completed: boolean) => {
    fetch(`http://localhost:3000/tasks/${id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        completed,
      }),
    }).then(() => fetchTasks());
  };

  useEffect(() => {
    const abortController = new AbortController();
    fetchTasks(abortController.signal);
    return () => {
      abortController.abort();
    };
  }, []);

  return (
    <div>
      <TaskForm
        text={text}
        onTextChange={handleFormChange}
        onSubmit={handleSubmit}
      />
      <Separator />
      <TaskList
        tasks={tasks}
        onDelete={handleDeleteTask}
        onToggleCompleted={handleToggleTaskCompleted}
      />
    </div>
  );
};

function App() {
  return (
    <div className="flex h-full">
      <div className="flex-none w-1/6 "></div>
      <div className="glow w-4/6">
        <Header />
        <ToDoBoard />
      </div>
      <div className="flex-none w-1/6 "></div>
    </div>
  );
}

export default App;
