import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("wallpapers.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS gifs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    data TEXT,
    sort_order INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Default settings
const defaultSettings = [
  { key: "interval", value: "10000" }, // 10 seconds
  { key: "mode", value: "order" }, // order, random, custom
  { key: "switch_on_lock", value: "false" }
];

const insertSetting = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
defaultSettings.forEach(s => insertSetting.run(s.key, s.value));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API Routes
  app.get("/api/gifs", (req, res) => {
    const gifs = db.prepare("SELECT * FROM gifs ORDER BY sort_order ASC, created_at DESC").all();
    res.json(gifs);
  });

  app.post("/api/gifs", (req, res) => {
    const { name, data } = req.body;
    const count = db.prepare("SELECT COUNT(*) as count FROM gifs").get() as { count: number };
    const result = db.prepare("INSERT INTO gifs (name, data, sort_order) VALUES (?, ?, ?)").run(name, data, count.count);
    res.json({ id: result.lastInsertRowid });
  });

  app.delete("/api/gifs/:id", (req, res) => {
    db.prepare("DELETE FROM gifs WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.put("/api/gifs/order", (req, res) => {
    const { orders } = req.body; // Array of { id, sort_order }
    const update = db.prepare("UPDATE gifs SET sort_order = ? WHERE id = ?");
    const transaction = db.transaction((items) => {
      for (const item of items) update.run(item.sort_order, item.id);
    });
    transaction(orders);
    res.json({ success: true });
  });

  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    const settingsMap = settings.reduce((acc: any, s: any) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
    res.json(settingsMap);
  });

  app.put("/api/settings", (req, res) => {
    const { key, value } = req.body;
    db.prepare("UPDATE settings SET value = ? WHERE key = ?").run(String(value), key);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
