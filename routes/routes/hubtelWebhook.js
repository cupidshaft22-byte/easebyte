const express = require('express');
const router = express.Router();
const store = require('../store');
const reloadly = require('../services/reloadly');

router.post('/', async (req, res) => {
  const { Data } = req.body;
  const orderId = Data?.ClientReference?.replace('order-', '');
  const success = Data?.Status === 'Success';

  const order = store.updateOrder(orderId, {
    paymentStatus: success ? 'paid' : 'failed',
  });

  if (!order) return res.sendStatus(200);

  if (success) {
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
    } catch (err) {
      store.updateOrder(order.id, { fulfillmentStatus: 'failed' });
    }
  }

  res.sendStatus(200);
});

module.exports = router;
