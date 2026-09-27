const express = require('express');
const router = express.Router();
const store = require('../store');
const hubtel = require('../services/hubtel');
const reloadly = require('../services/reloadly');

router.post('/', async (req, res) => {
  const { network, bundle, phone, amount } = req.body;
  if (!network || !bundle || !phone || !amount) {
    return res.status(400).json({ error: 'network, bundle, phone and amount are required' });
  }

  const order = store.createOrder({ network, bundle, phone, amount });

  try {
    const payment = await hubtel.requestPayment({
      amount,
      phone,
      orderId: order.id,
      description: `${network} ${bundle}`,
    });
    store.updateOrder(order.id, { hubtelReference: payment.data?.checkoutId });

    if (process.env.HUBTEL_MOCK_MODE === 'true') {
      store.updateOrder(order.id, { paymentStatus: 'paid' });
    }

    res.status(201).json({ order: store.getOrder(order.id), payment });
  } catch (err) {
    store.updateOrder(order.id, { paymentStatus: 'failed' });
    res.status(502).json({ error: err.message, order });
  }
});

router.get('/', (req, res) => {
  res.json(store.listOrders());
});

router.post('/:id/fulfill', async (req, res) => {
  const order = store.getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.paymentStatus !== 'paid') {
    return res.status(400).json({ error: 'Cannot fulfill an unpaid order' });
  }

  try {
    const operator = await reloadly.detectOperator(order.phone);
    const result = await reloadly.sendDataBundle({
      phone: order.phone,
      operatorId: operator.operatorId,
      amount: order.amount,
    });
    store.updateOrder(order.id, {
      fulfillmentStatus: 'fulfilled',
      reloadlyTransactionId: result.transactionId,
    });
    res.json(store.getOrder(order.id));
  } catch (err) {
    store.updateOrder(order.id, { fulfillmentStatus: 'failed' });
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
