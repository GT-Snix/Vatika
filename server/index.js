require('dotenv').config();
const express = require('express');
const cors = require('cors');

const plantsRouter = require('./routes/plants');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN }));
app.use(express.json());

app.use('/plants', plantsRouter);

// Express 5 forwards rejected promises from async handlers here,
// so routes don't need their own try/catch.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Vatika API on http://localhost:${port}`));
