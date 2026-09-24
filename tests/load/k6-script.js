/* global __ENV, __VU, __ITER */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const VUS = Number(__ENV.VUS || 100);
const DURATION = __ENV.DURATION || '5m';

const USER_PREFIX = __ENV.USER_PREFIX || 'k6-requester';
const CUSTOMER_UNIT = __ENV.CUSTOMER_UNIT || 'LOAD_TEST';

const BUDGET_OFFICER_EMAIL = __ENV.BUDGET_OFFICER_EMAIL || 'eitantestemail@email.com';

const PRODUCT_ID = __ENV.PRODUCT_ID || '';

const catalogDuration = new Trend('catalog_duration', true);
const productDetailsDuration = new Trend('product_details_duration', true);
const pricingDuration = new Trend('pricing_duration', true);
const addToCartDuration = new Trend('add_to_cart_duration', true);
const checkoutDuration = new Trend('checkout_duration', true);

const flowFailures = new Rate('flow_failures');
const submittedOrders = new Counter('submitted_orders');

export const options = {
  scenarios: {
    catalog_price_checkout: {
      executor: 'constant-vus',
      vus: VUS,
      duration: DURATION,
      gracefulStop: '30s',
    },
  },

  thresholds: {
    // Main requirement:
    // 95% of all HTTP requests must finish in under 500 ms.
    http_req_duration: ['p(95)<500'],

    // Less than 1% of HTTP requests may fail.
    http_req_failed: ['rate<0.01'],

    // Less than 1% of complete simulated user flows may fail.
    flow_failures: ['rate<0.01'],

    // Endpoint-specific p95 measurements.
    catalog_duration: ['p(95)<500'],
    product_details_duration: ['p(95)<500'],
    pricing_duration: ['p(95)<500'],
    add_to_cart_duration: ['p(95)<500'],
    checkout_duration: ['p(95)<500'],
  },

  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

/**
 * Creates the HTTP headers for the current virtual user.
 *
 * Every k6 virtual user gets a different X-Mock-User value.
 * This prevents all 100 users from sharing the same Hotzla cart.
 */
function headers() {
  return {
    'Content-Type': 'application/json',
    'X-Mock-User': `${USER_PREFIX}-${__VU}`,
  };
}

/**
 * Safely parses a JSON response.
 */
function parseJson(response) {
  try {
    return response.json();
  } catch {
    return null;
  }
}

/**
 * Handles a few possible API response shapes.
 *
 * For example:
 *
 * {
 *   data: {...}
 * }
 *
 * or:
 *
 * {
 *   product: {...}
 * }
 *
 * or just:
 *
 * {...}
 */
function unwrap(payload) {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  return payload.data ?? payload.product ?? payload;
}

/**
 * Extracts the product array from the catalog response.
 */
function extractProducts(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.products)) {
    return payload.products;
  }

  return [];
}

/**
 * Extracts dynamic attribute definitions from a product.
 */
function extractAttributes(product) {
  return product?.attributes ?? product?.attributeDefinitions ?? product?.definitions ?? [];
}

/**
 * Extracts SELECT options from an attribute.
 */
function extractOptions(attribute) {
  return attribute?.options ?? attribute?.attributeOptionEntries ?? [];
}

/**
 * Builds values for the product's dynamic attributes.
 *
 * The goal is to construct a valid configuration automatically
 * so k6 can calculate a price and add the product to the cart.
 *
 * Products with a REQUIRED FILE_UPLOAD attribute are skipped,
 * because this test is measuring catalog/pricing/order load,
 * not file-upload performance.
 */
function buildSelectedAttributes(product) {
  const attributes = extractAttributes(product);
  const selectedAttributes = [];

  for (const attribute of attributes) {
    const type = attribute.attributeType;

    /*
     * FILE_UPLOAD
     */
    if (type === 'FILE_UPLOAD') {
      if (attribute.isRequired) {
        return null;
      }

      continue;
    }

    /*
     * SELECT
     */
    if (type === 'SELECT') {
      const options = extractOptions(attribute);

      if (options.length === 0) {
        if (attribute.isRequired) {
          return null;
        }

        continue;
      }

      selectedAttributes.push({
        attributeDefinitionId: attribute.id,
        selectedOptionIds: [options[0].id],
      });

      continue;
    }

    /*
     * NUMBER
     */
    if (type === 'NUMBER') {
      const minValue = Number(attribute.minValue);
      const maxValue = Number(attribute.maxValue);

      let value = Number.isFinite(minValue) ? Math.max(minValue, 1) : 1;

      if (Number.isFinite(maxValue)) {
        value = Math.min(value, maxValue);
      }

      if (!Number.isFinite(value)) {
        if (attribute.isRequired) {
          return null;
        }

        continue;
      }

      selectedAttributes.push({
        attributeDefinitionId: attribute.id,
        value,
      });

      continue;
    }

    /*
     * BOOLEAN
     */
    if (type === 'BOOLEAN') {
      selectedAttributes.push({
        attributeDefinitionId: attribute.id,
        value: true,
      });

      continue;
    }

    /*
     * TEXT
     */
    if (type === 'TEXT') {
      selectedAttributes.push({
        attributeDefinitionId: attribute.id,
        value: 'k6 load test',
      });

      continue;
    }

    /*
     * Unknown required attribute type.
     */
    if (attribute.isRequired) {
      return null;
    }
  }

  return selectedAttributes;
}

/**
 * Chooses a valid quantity for the product.
 *
 * offset lets us change the quantity slightly when simulating
 * real-time price recalculation.
 */
function quantityFor(product, offset = 0) {
  const parsedMin = Number(product?.minQuantity);
  const parsedMax = Number(product?.maxQuantity);

  const minQuantity = Number.isInteger(parsedMin) && parsedMin > 0 ? parsedMin : 1;

  let quantity = minQuantity + offset;

  if (Number.isInteger(parsedMax) && parsedMax > 0) {
    quantity = Math.min(quantity, parsedMax);
  }

  return Math.max(1, quantity);
}

/**
 * Checks whether an HTTP response has one of the expected statuses.
 */
function statusIs(response, acceptedStatuses) {
  return acceptedStatuses.includes(response.status);
}

/**
 * Records a failed complete user flow.
 */
function markFailure() {
  flowFailures.add(1);
}

/**
 * This function represents ONE simulated user.
 *
 * Each k6 Virtual User repeatedly runs this entire function.
 */
export default function () {
  /*
   * ----------------------------------------------------------
   * STEP 1
   * Browse the product catalog.
   * ----------------------------------------------------------
   */

  const catalogResponse = http.get(`${BASE_URL}/api/products`, {
    headers: headers(),

    tags: {
      endpoint: 'catalog',
      name: 'GET /api/products',
    },
  });

  catalogDuration.add(catalogResponse.timings.duration);

  const catalogStatusOk = check(catalogResponse, {
    'catalog returns 200': (response) => response.status === 200,
  });

  if (!catalogStatusOk) {
    markFailure();
    return;
  }

  const products = extractProducts(parseJson(catalogResponse));

  const catalogHasProducts = check(products, {
    'catalog contains at least one product': (items) => items.length > 0,
  });

  if (!catalogHasProducts) {
    markFailure();
    return;
  }

  /*
   * Simulate the user looking through the catalog.
   */
  sleep(0.5 + Math.random());

  /*
   * ----------------------------------------------------------
   * STEP 2
   * Open a product.
   * ----------------------------------------------------------
   */

  const preferredProduct = PRODUCT_ID
    ? products.find((product) => product.id === PRODUCT_ID)
    : null;

  const startIndex = preferredProduct
    ? products.indexOf(preferredProduct)
    : Math.floor(Math.random() * products.length);

  let selectedProduct = null;
  let selectedAttributes = null;

  /*
   * Try up to five products.
   *
   * We do this because a product may require a file upload,
   * which this particular load test does not simulate.
   */
  const attempts = Math.min(products.length, 5);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const catalogProduct =
      preferredProduct && attempt === 0
        ? preferredProduct
        : products[(startIndex + attempt) % products.length];

    const detailsResponse = http.get(`${BASE_URL}/api/products/${catalogProduct.id}`, {
      headers: headers(),

      tags: {
        endpoint: 'product_details',
        name: 'GET /api/products/:id',
      },
    });

    productDetailsDuration.add(detailsResponse.timings.duration);

    const detailsOk = check(detailsResponse, {
      'product details returns 200': (response) => response.status === 200,
    });

    if (!detailsOk) {
      continue;
    }

    const product = unwrap(parseJson(detailsResponse));

    const attributes = buildSelectedAttributes(product);

    if (attributes !== null) {
      selectedProduct = product;
      selectedAttributes = attributes;

      break;
    }
  }

  const productIsUsable = check(selectedProduct, {
    'found a product usable by the load test': (product) => Boolean(product?.id),
  });

  if (!productIsUsable) {
    markFailure();
    return;
  }

  /*
   * Simulate the user examining the product.
   */
  sleep(0.25 + Math.random() * 0.5);

  /*
   * ----------------------------------------------------------
   * STEP 3
   * Calculate the price in real time.
   * ----------------------------------------------------------
   *
   * We perform three price calculations.
   *
   * This represents a real user changing quantity/settings
   * several times before ordering.
   */

  let finalQuantity = quantityFor(selectedProduct, 0);

  for (let change = 0; change < 3; change += 1) {
    finalQuantity = quantityFor(selectedProduct, change);

    const pricingPayload = {
      productId: selectedProduct.id,
      quantity: finalQuantity,
      selectedAttributes,
    };

    const pricingResponse = http.post(
      `${BASE_URL}/api/pricing/calculate`,
      JSON.stringify(pricingPayload),
      {
        headers: headers(),

        tags: {
          endpoint: 'pricing',
          name: 'POST /api/pricing/calculate',
        },
      }
    );

    pricingDuration.add(pricingResponse.timings.duration);

    const pricingOk = check(pricingResponse, {
      'pricing returns 200': (response) => response.status === 200,
    });

    if (!pricingOk) {
      markFailure();
      return;
    }

    /*
     * Small delay between configuration changes.
     */
    sleep(0.15 + Math.random() * 0.35);
  }

  /*
   * ----------------------------------------------------------
   * STEP 4
   * Add the product to the cart.
   * ----------------------------------------------------------
   */

  const cartPayload = {
    productId: selectedProduct.id,
    quantity: finalQuantity,
    selectedAttributes,
  };

  const addToCartResponse = http.post(`${BASE_URL}/api/cart/items`, JSON.stringify(cartPayload), {
    headers: headers(),

    tags: {
      endpoint: 'add_to_cart',
      name: 'POST /api/cart/items',
    },
  });

  addToCartDuration.add(addToCartResponse.timings.duration);

  const cartOk = check(addToCartResponse, {
    'add to cart returns 200/201': (response) => statusIs(response, [200, 201]),
  });

  if (!cartOk) {
    markFailure();
    return;
  }

  /*
   * Simulate the user reviewing their cart.
   */
  sleep(0.25 + Math.random() * 0.75);

  /*
   * ----------------------------------------------------------
   * STEP 5
   * Submit the order.
   * ----------------------------------------------------------
   */

  const mockUsername = `${USER_PREFIX}-${__VU}`;

  const deliveryDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const checkoutPayload = {
    customer: {
      name: `Load Test User ${__VU}`,
      phone: '0500000000',
      orgEmail: `${mockUsername}@example.test`,
      unit: CUSTOMER_UNIT,
    },

    budgetOfficer: {
      fullName: 'Load Test Budget Officer',
      militaryEmail: BUDGET_OFFICER_EMAIL,
    },

    deliveryDueDate,

    notes: `k6 load test - VU ${__VU}, iteration ${__ITER}`,
  };

  const checkoutResponse = http.post(
    `${BASE_URL}/api/orders/checkout`,
    JSON.stringify(checkoutPayload),
    {
      headers: headers(),
      tags: {
        endpoint: 'checkout',
        name: 'POST /api/orders/checkout',
      },
    }
  );

  checkoutDuration.add(checkoutResponse.timings.duration);

  if (checkoutResponse.status !== 200 && checkoutResponse.status !== 201) {
    console.error(
      `Checkout failed: status=${checkoutResponse.status}, body=${checkoutResponse.body}`
    );
  }

  checkoutDuration.add(checkoutResponse.timings.duration);

  const checkoutOk = check(checkoutResponse, {
    'checkout returns 200/201': (response) => statusIs(response, [200, 201]),
  });

  if (!checkoutOk) {
    markFailure();
    return;
  }

  /*
   * The complete user flow succeeded.
   */
  submittedOrders.add(1);

  flowFailures.add(0);

  /*
   * Wait briefly before the same VU starts
   * another ordering flow.
   */
  sleep(0.5 + Math.random());
}
