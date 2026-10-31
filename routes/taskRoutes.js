const express = require('express');
const router = express.Router();
const storage = require('../storage/taskStorage');

// GET /api/tasks - fetch all tasks
router.get('/', async (req, res) => {
  try {
    const tasks = await storage.getAllTasks();
    res.json({
      success: true,
      data: tasks,
      storage: storage.isMongoConnected() ? 'mongodb' : 'persistent_file',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/tasks - create a new task
router.post('/', async (req, res) => {
  try {
    const { title, description, priority, dueDate, status } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }
    const task = await storage.createTask({
      title,
      description,
      priority,
      dueDate,
      status,
    });
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/tasks/:id - update a task
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const task = await storage.updateTask(id, req.body);
    res.json({ success: true, data: task });
  } catch (err) {
    const status = err.message === 'Task not found' ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
});

// PATCH /api/tasks/:id/status - update status and order
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, order } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }
    const task = await storage.updateStatus(id, status, order);
    res.json({ success: true, data: task });
  } catch (err) {
    const code = err.message === 'Task not found' ? 404 : 400;
    res.status(code).json({ success: false, message: err.message });
  }
});

// DELETE /api/tasks/:id - delete a task
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await storage.deleteTask(id);
    res.json({ success: true, message: 'Task deleted successfully', ...result });
  } catch (err) {
    const code = err.message === 'Task not found' ? 404 : 400;
    res.status(code).json({ success: false, message: err.message });
  }
});

module.exports = router;
