require('dotenv').config();
const express = require('express');
const cors = require('cors');
const ordersRouter = require('./routes/orders');
const hubtelWebhook = require('./routes/hubtelWebhook');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/orders', ordersRouter);
app.use('/api/webhooks/hubtel', hubtelWebhook);

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
