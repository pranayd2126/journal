import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Use your provided connection string
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://dandapranayreddy2118_db_user:Danda2118@cluster0.jjrpebo.mongodb.net/";

let client: MongoClient | null = null;
let db: any = null;

async function getDb() {
  if (db) return db;
  
  if (!client) {
    let uri = process.env.MONGODB_URI;
    
    // Ensure we have a valid-looking URI, fallback to user provided one if empty or invalid
    if (!uri || (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://"))) {
      console.log("Using fallback MongoDB URI");
      uri = "mongodb+srv://dandapranayreddy2118_db_user:Danda2118@cluster0.jjrpebo.mongodb.net/";
    } else {
      console.log("Using environment MONGODB_URI (starts with:", uri.split(':')[0], ")");
    }

    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });
  }

  try {
    await client.connect();
    db = client.db("trading_journal");
    console.log("Connected to MongoDB Atlas!");
    return db;
  } catch (err: any) {
    console.error("CRITICAL: MongoDB Connection Error:", err.message);
    throw new Error(`Database connection failed: ${err.message}`);
  }
}

app.use(cors());
app.use(express.json());

// API Routes
app.get('/api/:userId/trades', async (req, res) => {
  try {
    const database = await getDb();
    const trades = await database.collection('trades').find({ userId: req.params.userId }).toArray();
    // Convert _id to id for frontend compatibility
    const formattedTrades = trades.map((t: any) => ({ ...t, id: t._id.toString() }));
    res.json(formattedTrades);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/:userId/trades', async (req, res) => {
  try {
    const database = await getDb();
    const trade = { ...req.body, userId: req.params.userId, createdAt: new Date() };
    const result = await database.collection('trades').insertOne(trade);
    res.json({ id: result.insertedId.toString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/:userId/trades/:tradeId', async (req, res) => {
  try {
    const database = await getDb();
    const { tradeId } = req.params;
    const update = { ...req.body, updatedAt: new Date() };
    delete update.id; // Don't try to update the ID
    await database.collection('trades').updateOne(
      { _id: new ObjectId(tradeId), userId: req.params.userId },
      { $set: update }
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/:userId/trades/:tradeId', async (req, res) => {
  try {
    const database = await getDb();
    const { tradeId } = req.params;
    await database.collection('trades').deleteOne({ 
      _id: new ObjectId(tradeId), 
      userId: req.params.userId 
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/:userId/trades/:tradeId', async (req, res) => {
  try {
    const database = await getDb();
    const { tradeId } = req.params;
    const trade = await database.collection('trades').findOne({ 
      _id: new ObjectId(tradeId), 
      userId: req.params.userId 
    });
    if (trade) {
      res.json({ ...trade, id: trade._id.toString() });
    } else {
      res.status(404).json({ error: 'Trade not found' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Settings Management
app.get('/api/:userId/settings', async (req, res) => {
  try {
    const database = await getDb();
    const settings = await database.collection('settings').findOne({ userId: req.params.userId });
    res.json(settings || {});
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/:userId/settings', async (req, res) => {
  try {
    const database = await getDb();
    await database.collection('settings').updateOne(
      { userId: req.params.userId },
      { $set: { ...req.body, userId: req.params.userId, updatedAt: new Date() } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Insights Management
app.get('/api/:userId/insights', async (req, res) => {
  try {
    const database = await getDb();
    const insights = await database.collection('insights').find({ userId: req.params.userId }).toArray();
    const formatted = insights.map((i: any) => ({ ...i, id: i._id.toString() }));
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/:userId/insights', async (req, res) => {
  try {
    const database = await getDb();
    const insight = { ...req.body, userId: req.params.userId, createdAt: new Date() };
    const result = await database.collection('insights').insertOne(insight);
    res.json({ id: result.insertedId.toString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Checklists Management
app.get('/api/:userId/checklists', async (req, res) => {
  try {
    const database = await getDb();
    const checklists = await database.collection('checklists').find({ userId: req.params.userId }).toArray();
    const formatted = checklists.map((c: any) => ({ ...c, id: c._id.toString() }));
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/:userId/checklists', async (req, res) => {
  try {
    const database = await getDb();
    const checklist = { ...req.body, userId: req.params.userId, createdAt: new Date() };
    const result = await database.collection('checklists').insertOne(checklist);
    res.json({ id: result.insertedId.toString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/:userId/checklists/:checklistId', async (req, res) => {
  try {
    const database = await getDb();
    const { checklistId } = req.params;
    const update = { ...req.body };
    delete update.id;
    await database.collection('checklists').updateOne(
      { _id: new ObjectId(checklistId), userId: req.params.userId },
      { $set: update }
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Vite Middleware for Development
if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
