let orders = [];
let nextId = 1;

function createOrder({ network, bundle, phone, amount }) {
  const order = {
    id: nextId++,
    network,
    bundle,
    phone,
    amount,
    paymentStatus: 'pending',
    fulfillmentStatus: 'unfulfilled',
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  return order;
}

function getOrder(id) {
  return orders.find((o) => o.id === Number(id));
}

function listOrders() {
  return orders;
}

function updateOrder(id, patch) {
  const order = getOrder(id);
  if (!order) return null;
  Object.assign(order, patch);
  return order;
}

module.exports = { createOrder, getOrder, listOrders, updateOrder };
