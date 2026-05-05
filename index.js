const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

let db;

async function connect() {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db('mioorto');
    console.log('✅ Connesso a MongoDB');
  } catch (err) {
    console.error('❌ Errore MongoDB:', err.message);
    setTimeout(connect, 5000);
  }
}

function checkDB(req, res, next) {
  if (!db) return res.status(503).json({ error: 'Database non ancora connesso, riprova tra pochi secondi' });
  next();
}

app.get('/', (req, res) => res.json({ status: 'ok', db: db ? 'connesso' : 'non connesso' }));

app.post('/documents', checkDB, async (req, res) => {
  try {
    const { title, content, type, tags } = req.body;
    const result = await db.collection('documenti').insertOne({
      title, content, type, tags: tags || [], createdAt: new Date()
    });
    res.json({ success: true, id: result.insertedId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/documents', checkDB, async (req, res) => {
  try {
    const docs = await db.collection('documenti').find({}).sort({ createdAt: -1 }).toArray();
    res.json(docs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/documents/:id', checkDB, async (req, res) => {
  try {
    await db.collection('documenti').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/documents/search', checkDB, async (req, res) => {
  try {
    const q = req.query.q || '';
    const docs = await db.collection('documenti').find({
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ]
    }).limit(5).toArray();
    res.json(docs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server attivo sulla porta ${PORT}`));
connect();
