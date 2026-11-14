"use client";

import { useState } from "react";
import { Plus, Code2, Layers, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MiniProject {
  id: string;
  title: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  completed: boolean;
  createdAt: string;
}

export function MiniProjects() {
  const [projects, setProjects] = useState<MiniProject[]>([
    {
      id: "1",
      title: "Implement Hash Table",
      description: "Build a hash table with separate chaining collision resolution",
      difficulty: "Medium",
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: "2",
      title: "Binary Search Visualizer",
      description: "Create an interactive visualizer for binary search algorithm",
      difficulty: "Easy",
      completed: false,
      createdAt: new Date().toISOString(),
    },
  ]);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDifficulty, setNewDifficulty] = useState("Easy");

  const addProject = () => {
    if (!newTitle.trim()) return;
    setProjects([
      {
        id: Date.now().toString(),
        title: newTitle,
        description: newDesc,
        difficulty: newDifficulty as "Easy" | "Medium" | "Hard",
        completed: false,
        createdAt: new Date().toISOString(),
      },
      ...projects,
    ]);
    setNewTitle("");
    setNewDesc("");
  };

  const toggleProject = (id: string) => {
    setProjects(projects.map((p) =>
      p.id === id ? { ...p, completed: !p.completed } : p
    ));
  };

  const deleteProject = (id: string) => {
    setProjects(projects.filter((p) => p.id !== id));
  };

  const completedCount = projects.filter((p) => p.completed).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Mini Projects</h2>
          <p className="text-sm text-muted-foreground">
            {completedCount}/{projects.length} completed
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="project-title">Project Title</Label>
            <Input
              id="project-title"
              placeholder="e.g. Build a LRU Cache"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label htmlFor="project-desc">Description</Label>
            <Input
              id="project-desc"
              placeholder="What will you build?"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label htmlFor="project-difficulty">Difficulty</Label>
            <Select
              defaultValue="Easy"
              onValueChange={(value) => setNewDifficulty(value as string)}
            >
              <SelectTrigger id="project-difficulty">
                <SelectValue placeholder="Easy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={addProject} className="w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Project
          </Button>
        </div>

        <div className="space-y-2">
          {projects.map((project) => (
            <Card key={project.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleProject(project.id)}
                  className={`flex h-5 w-5 items-center justify-center rounded-full border transition-all ${
                    project.completed
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border"
                  }`}
                >
                  {project.completed && (
                    <Play className="h-3 w-3" />
                  )}
                </button>
                <div className="flex-1">
                  <h3 className={`font-medium ${project.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {project.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">{project.description}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium border border-border/50">
                      {project.difficulty}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => deleteProject(project.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Card>
          ))}
          {projects.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Code2 className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>No projects yet. Add your first mini project!</p>
            </div>
          )}
        </div>
      </div>

      <CardFooter className="border-t flex items-center justify-between gap-4 px-0 pt-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            Create curated DSA projects or track your own coding challenges
          </span>
        </div>
      </CardFooter>
    </div>
  );
}