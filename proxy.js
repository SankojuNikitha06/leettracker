// Simple proxy to forward requests to LeetCode GraphQL and legacy API.
// Usage:
//   npm install express node-fetch cors
//   node proxy.js
//
// Then in the frontend set window.LEET_PROXY = 'http://localhost:4000' before scripts load
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json({ limit:'1mb' }));

const TARGET = 'https://leetcode.com';

app.post('/graphql', async (req, res) => {
  try {
    const r = await fetch(TARGET + '/graphql', { method:'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(req.body) });
    const data = await r.text();
    res.type('application/json').send(data);
  } catch (e) { res.status(500).send({ error: e.message }); }
});

app.get('/api/submissions/*', async (req, res) => {
  try {
    const path = req.originalUrl.replace('/api/submissions/','/api/submissions/');
    const r = await fetch(TARGET + path, { method:'GET', headers:{ 'Content-Type':'application/json' } });
    const data = await r.text();
    res.type('application/json').send(data);
  } catch(e){ res.status(500).send({ error: e.message }); }
});

app.listen(4000, ()=> console.log('LeetProxy running at http://localhost:4000 (forwarding to leetcode.com)'));