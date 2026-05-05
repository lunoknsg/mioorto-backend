const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

let db;

async function connect() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  db = client.db('mioorto');
  console.log('✅ Connesso a MongoDB');
}

// Salva documento
app.post('/documents', async (req, res) => {
  try {
    const { title, content, type, tags } = req.body;
    const result = await db.collection('documenti').insertOne({
      title, content, type, tags: tags || [],
      createdAt: new Date()
    });
    res.json({ success: true, id: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Recupera tutti i documenti
app.get('/documents', async (req, res) => {
  try {
    const docs = await db.collection('documenti')
      .find({}).sort({ createdAt: -1 }).toArray();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Elimina documento
app.delete('/documents/:id', async (req, res) => {
  try {
    await db.collection('documenti')
      .deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cerca documenti per parola chiave
app.get('/documents/search', async (req, res) => {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
connect().then(() =>
  app.listen(PORT, () => console.log(`🚀 Server attivo sulla porta ${PORT}`))
);
