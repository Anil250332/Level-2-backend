const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Task = require('../models/Task');

const DATA_DIR = path.join(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'tasks.json');

// Initial realistic default tasks if storage is empty
const defaultTasks = [
  {
    id: 'task-1',
    title: 'Research user feedback for V2 redesign',
    description: 'Analyze session recordings and user interview notes to identify UX friction points in task filtering.',
    priority: 'Medium',
    dueDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    status: 'todo',
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'task-2',
    title: 'Implement drag-and-drop Kanban columns',
    description: 'Support native HTML5 Drag and Drop with visual drop-zone indicators and smooth card animations.',
    priority: 'Urgent',
    dueDate: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0],
    status: 'in-progress',
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'task-3',
    title: 'Design clean monochrome design system',
    description: 'Create high-contrast Black & White theme inspired by Linear and Vercel typography standards.',
    priority: 'High',
    dueDate: new Date().toISOString().split('T')[0],
    status: 'completed',
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'task-4',
    title: 'Build RESTful API with validation and MERN fallback',
    description: 'Provide endpoints for CRUD operations, status updates, and graceful in-memory file fallback.',
    priority: 'High',
    dueDate: new Date().toISOString().split('T')[0],
    status: 'completed',
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'task-5',
    title: 'Add priority filtering and search bar',
    description: 'Allow instant live search by keyword and filtering by Low, Medium, High, and Urgent badges.',
    priority: 'Medium',
    dueDate: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
    status: 'todo',
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function ensureFileStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultTasks, null, 2), 'utf-8');
  }
}

function readFromFile() {
  ensureFileStorage();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading tasks file:', err);
    return defaultTasks;
  }
}

function writeToFile(tasks) {
  ensureFileStorage();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing tasks file:', err);
  }
}

const isMongoConnected = () => mongoose.connection.readyState === 1;

const PRIORITY_WEIGHTS = {
  Urgent: 4,
  High: 3,
  Normal: 2,
  Medium: 2,
  Low: 1,
};

function sortTasksByPriority(tasks) {
  return [...tasks].sort((a, b) => {
    const weightA = PRIORITY_WEIGHTS[a.priority] || 2;
    const weightB = PRIORITY_WEIGHTS[b.priority] || 2;
    if (weightB !== weightA) {
      return weightB - weightA; // High priority before Normal/Medium
    }
    return (a.order || 0) - (b.order || 0);
  });
}

async function getAllTasks() {
  if (isMongoConnected()) {
    try {
      const tasks = await Task.find().sort({ order: 1, createdAt: -1 });
      if (tasks.length === 0) {
        // Seed default tasks into mongo
        const formatted = defaultTasks.map(({ id, ...rest }) => rest);
        const seeded = await Task.insertMany(formatted);
        return sortTasksByPriority(seeded.map((t) => t.toJSON()));
      }
      return sortTasksByPriority(tasks.map((t) => t.toJSON()));
    } catch (err) {
      console.warn('Mongo query failed, using file fallback:', err.message);
    }
  }
  return sortTasksByPriority(readFromFile());
}

async function createTask(data) {
  const { title, description, priority, dueDate, status } = data;
  if (!title || !title.trim()) {
    throw new Error('Title is required');
  }

  if (isMongoConnected()) {
    try {
      const count = await Task.countDocuments({ status: status || 'todo' });
      const newTask = new Task({
        title: title.trim(),
        description: description ? description.trim() : '',
        priority: priority || 'Medium',
        dueDate: dueDate || '',
        status: status || 'todo',
        order: count,
      });
      const saved = await newTask.save();
      return saved.toJSON();
    } catch (err) {
      console.warn('Mongo save failed, falling back to file:', err.message);
    }
  }

  const tasks = readFromFile();
  const filtered = tasks.filter((t) => t.status === (status || 'todo'));
  const newTask = {
    id: `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title: title.trim(),
    description: description ? description.trim() : '',
    priority: priority || 'Medium',
    dueDate: dueDate || '',
    status: status || 'todo',
    order: filtered.length,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  tasks.push(newTask);
  writeToFile(tasks);
  return newTask;
}

async function updateTask(id, data) {
  if (isMongoConnected() && mongoose.Types.ObjectId.isValid(id)) {
    try {
      const updated = await Task.findByIdAndUpdate(
        id,
        {
          ...(data.title !== undefined && { title: data.title.trim() }),
          ...(data.description !== undefined && { description: data.description.trim() }),
          ...(data.priority !== undefined && { priority: data.priority }),
          ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
          ...(data.status !== undefined && { status: data.status }),
          ...(data.order !== undefined && { order: data.order }),
        },
        { new: true, runValidators: true }
      );
      if (updated) return updated.toJSON();
    } catch (err) {
      console.warn('Mongo update failed, falling back to file:', err.message);
    }
  }

  const tasks = readFromFile();
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) {
    throw new Error('Task not found');
  }

  const current = tasks[index];
  tasks[index] = {
    ...current,
    ...(data.title !== undefined && { title: data.title.trim() }),
    ...(data.description !== undefined && { description: data.description.trim() }),
    ...(data.priority !== undefined && { priority: data.priority }),
    ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
    ...(data.status !== undefined && { status: data.status }),
    ...(data.order !== undefined && { order: data.order }),
    updatedAt: new Date().toISOString(),
  };

  writeToFile(tasks);
  return tasks[index];
}

async function deleteTask(id) {
  if (isMongoConnected() && mongoose.Types.ObjectId.isValid(id)) {
    try {
      const deleted = await Task.findByIdAndDelete(id);
      if (deleted) return { success: true, id };
    } catch (err) {
      console.warn('Mongo delete failed, falling back to file:', err.message);
    }
  }

  const tasks = readFromFile();
  const filtered = tasks.filter((t) => t.id !== id);
  if (filtered.length === tasks.length) {
    throw new Error('Task not found');
  }
  writeToFile(filtered);
  return { success: true, id };
}

async function updateStatus(id, newStatus, newOrder) {
  return updateTask(id, {
    status: newStatus,
    ...(newOrder !== undefined && { order: newOrder }),
  });
}

module.exports = {
  getAllTasks,
  createTask,
  updateTask,
  deleteTask,
  updateStatus,
  isMongoConnected,
};
