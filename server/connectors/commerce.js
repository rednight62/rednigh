// Example commerce connectors
const { registerConnector } = require('./universalConnector');

registerConnector('amazon', {
  type: 'commerce',
  description: 'Amazon Product Advertising API',
  connect: () => {/*...*/},
  search: async (query) => {/*...*/},
});
registerConnector('ebay', {
  type: 'commerce',
  description: 'eBay Finding API',
  connect: () => {/*...*/},
  search: async (query) => {/*...*/},
});
registerConnector('shopify', {
  type: 'commerce',
  description: 'Shopify Storefront API',
  connect: () => {/*...*/},
  search: async (query) => {/*...*/},
});
registerConnector('stripe', {
  type: 'payment',
  description: 'Stripe Payments',
  connect: () => {/*...*/},
});
registerConnector('paypal', {
  type: 'payment',
  description: 'PayPal Payments',
  connect: () => {/*...*/},
});
registerConnector('walmart', {
  type: 'commerce',
  description: 'Walmart Open API',
  connect: () => {/*...*/},
});
registerConnector('aliexpress', {
  type: 'commerce',
  description: 'AliExpress Open API',
  connect: () => {/*...*/},
});
// ...add more as needed
