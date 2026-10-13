/* global __ENV, __VU, __ITER */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const VUS = Number(__ENV.VUS || 100);
const DURATION = __ENV.DURATION || '5m';

const USER_PREFIX = __ENV.USER_PREFIX || 'k6-requester';
const CUSTOMER_UNIT = __ENV.CUSTOMER_UNIT || 'LOAD_TEST';

const BUDGET_OFFICER_EMAIL = __ENV.BUDGET_OFFICER_EMAIL || 'eitantestemail@idf.il';

const PRODUCT_ID = __ENV.PRODUCT_ID || '';

/**
 * Relative weights for the different simulated user behaviors.
 *
 * Default mix:
 * - 30% browse only
 * - 30% browse + pricing/configuration
 * - 20% browse + pricing + cart
 * - 20% complete checkout
 *
 * These are relative weights and do not technically need to total 100.
 */
const BROWSE_WEIGHT = Number(__ENV.BROWSE_WEIGHT || 30);
const PRICING_WEIGHT = Number(__ENV.PRICING_WEIGHT || 30);
const CART_WEIGHT = Number(__ENV.CART_WEIGHT || 20);
const CHECKOUT_WEIGHT = Number(__ENV.CHECKOUT_WEIGHT || 20);

/**
 * Custom duration metrics.
 */
const catalogDuration = new Trend('catalog_duration', true);

const productDetailsDuration = new Trend('product_details_duration', true);

const pricingDuration = new Trend('pricing_duration', true);

const addToCartDuration = new Trend('add_to_cart_duration', true);

const checkoutDuration = new Trend('checkout_duration', true);

/**
 * Flow-level metrics.
 */
const flowFailures = new Rate('flow_failures');

const submittedOrders = new Counter('submitted_orders');

export const options = {
  scenarios: {
    mixed_user_load: {
      executor: 'constant-vus',

      vus: VUS,

      duration: DURATION,

      gracefulStop: '30s',
    },
  },

  thresholds: {
    /**
     * Main performance requirement.
     */
    http_req_duration: ['p(95)<500'],

    /**
     * Less than 1% of HTTP requests may fail.
     */
    http_req_failed: ['rate<0.01'],

    /**
     * Less than 1% of simulated user journeys may fail.
     */
    flow_failures: ['rate<0.01'],

    /**
     * Endpoint-specific requirements.
     */
    catalog_duration: ['p(95)<500'],

    product_details_duration: ['p(95)<500'],

    pricing_duration: ['p(95)<500'],

    add_to_cart_duration: ['p(95)<500'],

    checkout_duration: ['p(95)<500'],
  },

  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

/**
 * Creates request headers for the current virtual user.
 *
 * Each VU gets its own mock identity so users do not share carts.
 */
function headers() {
  return {
    'Content-Type': 'application/json',

    'X-Mock-User': `${USER_PREFIX}-${__VU}`,
  };
}

/**
 * Safely parses JSON.
 */
function parseJson(response) {
  try {
    return response.json();
  } catch {
    return null;
  }
}

/**
 * Handles several API response shapes.
 */
function unwrap(payload) {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  return payload.data ?? payload.product ?? payload.item ?? payload;
}

/**
 * Extracts products from the catalog response.
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
 * Extracts dynamic attribute definitions.
 */
function extractAttributes(product) {
  return product?.attributes ?? product?.attributeDefinitions ?? product?.definitions ?? [];
}

/**
 * Extracts SELECT options.
 */
function extractOptions(attribute) {
  return attribute?.options ?? attribute?.attributeOptionEntries ?? [];
}

/**
 * Builds a valid dynamic configuration for a product.
 *
 * Every attribute returned by the product is considered.
 *
 * Products with required FILE_UPLOAD attributes are skipped because
 * this test is measuring catalog/pricing/cart/order performance,
 * not file upload performance.
 */
function buildSelectedAttributes(product) {
  const attributes = extractAttributes(product);

  const selectedAttributes = [];

  for (const attribute of attributes) {
    const type = attribute.attributeType;

    /**
     * FILE_UPLOAD
     */
    if (type === 'FILE_UPLOAD') {
      if (attribute.isRequired) {
        return null;
      }

      continue;
    }

    /**
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

      /**
       * Pick a random valid option so every user does not always
       * choose the first option.
       */
      const selectedOption = options[Math.floor(Math.random() * options.length)];

      selectedAttributes.push({
        attributeDefinitionId: attribute.id,

        selectedOptionIds: [selectedOption.id],
      });

      continue;
    }

    /**
     * NUMBER
     */
    if (type === 'NUMBER') {
      const parsedMin = Number(attribute.minValue);

      const parsedMax = Number(attribute.maxValue);

      const minValue = Number.isFinite(parsedMin) ? parsedMin : 1;

      let value = Math.max(minValue, 1);

      /**
       * Add a little variation when a usable range exists.
       */
      if (Number.isFinite(parsedMax) && parsedMax > value) {
        const range = Math.min(parsedMax - value, 10);

        value += Math.floor(Math.random() * (range + 1));
      }

      if (Number.isFinite(parsedMax)) {
        value = Math.min(value, parsedMax);
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

    /**
     * BOOLEAN
     */
    if (type === 'BOOLEAN') {
      selectedAttributes.push({
        attributeDefinitionId: attribute.id,

        value: Math.random() >= 0.5,
      });

      continue;
    }

    /**
     * TEXT
     */
    if (type === 'TEXT') {
      selectedAttributes.push({
        attributeDefinitionId: attribute.id,

        value: 'k6 load test',
      });

      continue;
    }

    /**
     * Unknown required attribute.
     */
    if (attribute.isRequired) {
      return null;
    }
  }

  return selectedAttributes;
}

/**
 * Chooses a valid product quantity.
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
 * Checks whether the HTTP response uses one of the expected statuses.
 */
function statusIs(response, acceptedStatuses) {
  return acceptedStatuses.includes(response.status);
}

/**
 * Logs useful information about a failed HTTP request.
 *
 * The response body is truncated so hundreds of failures do not flood
 * the terminal with very large responses.
 */
function logFailedResponse(label, response) {
  const rawBody =
    response.body === null || response.body === undefined ? 'null' : String(response.body);

  const body = rawBody.length > 500 ? `${rawBody.slice(0, 500)}...` : rawBody;

  console.error(
    `${label} failed: ` +
      `VU=${__VU}, ` +
      `ITER=${__ITER}, ` +
      `status=${response.status}, ` +
      `error_code=${response.error_code}, ` +
      `error=${response.error}, ` +
      `duration=${response.timings.duration}ms, ` +
      `body=${body}`
  );
}

/**
 * Sleeps for a random duration.
 *
 * This keeps the VUs from becoming synchronized.
 */
function randomSleep(minSeconds, maxSeconds) {
  sleep(minSeconds + Math.random() * (maxSeconds - minSeconds));
}

/**
 * Marks a simulated journey as failed.
 */
function markFailure() {
  flowFailures.add(1);
}

/**
 * Marks a simulated journey as successful.
 */
function markSuccess() {
  flowFailures.add(0);
}

/**
 * Chooses what kind of activity the current VU performs.
 *
 * This happens independently for every iteration.
 */
function chooseJourney() {
  const journeys = [
    {
      name: 'browse',
      weight: Math.max(0, BROWSE_WEIGHT),
    },

    {
      name: 'pricing',
      weight: Math.max(0, PRICING_WEIGHT),
    },

    {
      name: 'cart',
      weight: Math.max(0, CART_WEIGHT),
    },

    {
      name: 'checkout',
      weight: Math.max(0, CHECKOUT_WEIGHT),
    },
  ];

  const totalWeight = journeys.reduce((sum, journey) => sum + journey.weight, 0);

  if (totalWeight <= 0) {
    return 'checkout';
  }

  let value = Math.random() * totalWeight;

  for (const journey of journeys) {
    value -= journey.weight;

    if (value < 0) {
      return journey.name;
    }
  }

  return 'checkout';
}

/**
 * Loads the product catalog.
 */
/**
 * Loads the product catalog.
 */
function getCatalog() {
  const response = http.get(`${BASE_URL}/api/products`, {
    headers: headers(),

    tags: {
      endpoint: 'catalog',
      name: 'GET /api/products',
    },
  });

  catalogDuration.add(response.timings.duration);

  const catalogSucceeded = check(response, {
    'catalog returns 200': (res) => res.status === 200,
  });

  if (!catalogSucceeded) {
    logFailedResponse('Catalog', response);

    return null;
  }

  const payload = parseJson(response);

  const products = extractProducts(payload);

  const containsProducts = check(products, {
    'catalog contains at least one product': (items) => Array.isArray(items) && items.length > 0,
  });

  if (!containsProducts) {
    console.error(
      `Catalog contained no products: ` +
        `VU=${__VU}, ` +
        `ITER=${__ITER}, ` +
        `status=${response.status}, ` +
        `body=${response.body}`
    );

    return null;
  }

  return products;
}

/**
 * Loads one product's details.
 */
function getProductDetails(productId) {
  const response = http.get(`${BASE_URL}/api/products/${productId}`, {
    headers: headers(),

    tags: {
      endpoint: 'product_details',
      name: 'GET /api/products/:id',
    },
  });

  productDetailsDuration.add(response.timings.duration);

  const detailsSucceeded = check(response, {
    'product details returns 200': (res) => res.status === 200,
  });

  if (!detailsSucceeded) {
    logFailedResponse('Product details', response);

    return null;
  }

  const payload = parseJson(response);

  if (!payload) {
    console.error(
      `Product details JSON parse failed: ` +
        `VU=${__VU}, ` +
        `ITER=${__ITER}, ` +
        `productId=${productId}`
    );

    return null;
  }

  return unwrap(payload);
}

/**
 * Finds a product that can be used by the pricing/cart/checkout flow.
 */
function findUsableProduct(products) {
  const preferredProduct = PRODUCT_ID
    ? products.find((product) => product.id === PRODUCT_ID)
    : null;

  const startIndex = preferredProduct
    ? products.indexOf(preferredProduct)
    : Math.floor(Math.random() * products.length);

  const attempts = Math.min(products.length, 5);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const catalogProduct =
      preferredProduct && attempt === 0
        ? preferredProduct
        : products[(startIndex + attempt) % products.length];

    const product = getProductDetails(catalogProduct.id);

    if (!product) {
      continue;
    }

    const selectedAttributes = buildSelectedAttributes(product);

    if (selectedAttributes !== null) {
      check(product, {
        'found a product usable by the load test': () => true,
      });

      return {
        product,
        selectedAttributes,
      };
    }
  }

  check(null, {
    'found a product usable by the load test': () => false,
  });

  return null;
}

/**
 * Performs one pricing request.
 */
function calculatePrice(product, selectedAttributes, quantity) {
  const payload = {
    productId: product.id,
    quantity,
    selectedAttributes,
  };

  const response = http.post(`${BASE_URL}/api/pricing/calculate`, JSON.stringify(payload), {
    headers: headers(),

    tags: {
      endpoint: 'pricing',
      name: 'POST /api/pricing/calculate',
    },
  });

  pricingDuration.add(response.timings.duration);

  const ok = check(response, {
    'pricing returns 200': (res) => res.status === 200,
  });

  if (!ok) {
    logFailedResponse('Pricing', response);
  }

  return ok;
}

/**
 * Simulates a user configuring a product.
 *
 * Each configuration session performs between 3 and 10 pricing
 * recalculations.
 *
 * Different iterations may change:
 * - quantity
 * - SELECT options
 * - NUMBER attribute values
 * - BOOLEAN values
 *
 * The final configuration is returned so cart/checkout uses the same
 * configuration that the user ended with.
 */
function simulatePricing(product, initialSelectedAttributes) {
  /**
   * Generates an integer between 3 and 10 inclusive.
   */
  const numberOfChanges = 3 + Math.floor(Math.random() * 8);

  let finalQuantity = quantityFor(product, 0);

  let finalSelectedAttributes = initialSelectedAttributes;

  for (let change = 0; change < numberOfChanges; change += 1) {
    finalQuantity = quantityFor(product, change);

    /**
     * After the first price calculation, rebuild the dynamic
     * configuration so options can genuinely change.
     */
    if (change > 0) {
      const changedAttributes = buildSelectedAttributes(product);

      if (changedAttributes !== null) {
        finalSelectedAttributes = changedAttributes;
      }
    }

    const pricingOk = calculatePrice(product, finalSelectedAttributes, finalQuantity);

    if (!pricingOk) {
      return null;
    }

    if (change < numberOfChanges - 1) {
      randomSleep(0.2, 0.8);
    }
  }

  return {
    quantity: finalQuantity,

    selectedAttributes: finalSelectedAttributes,
  };
}

/**
 * Adds one configured product to the current user's cart.
 */
function addItemToCart(product, selectedAttributes, quantity) {
  const payload = {
    productId: product.id,
    quantity,
    selectedAttributes,
  };

  const response = http.post(`${BASE_URL}/api/cart/items`, JSON.stringify(payload), {
    headers: headers(),

    tags: {
      endpoint: 'add_to_cart',
      name: 'POST /api/cart/items',
    },
  });

  addToCartDuration.add(response.timings.duration);

  const ok = check(response, {
    'add to cart returns 200/201': (res) => statusIs(res, [200, 201]),
  });

  if (!ok) {
    logFailedResponse('Add to cart', response);

    return null;
  }

  return unwrap(parseJson(response));
}

/**
 * Removes a cart item again.
 *
 * Cart-only users do this so their cart does not accumulate hundreds
 * of items over repeated iterations.
 */
function removeCartItem(cartItemId) {
  if (!cartItemId) {
    return true;
  }

  const response = http.del(`${BASE_URL}/api/cart/items/${cartItemId}`, null, {
    headers: headers(),

    tags: {
      endpoint: 'remove_from_cart',
      name: 'DELETE /api/cart/items/:id',
    },
  });

  const ok = check(response, {
    'remove from cart returns 200': (res) => res.status === 200,
  });

  if (!ok) {
    logFailedResponse('Remove from cart', response);
  }

  return ok;
}

/**
 * Submits the current user's active cart as an order.
 */
function checkout() {
  const mockUsername = `${USER_PREFIX}-${__VU}`;

  const deliveryDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const payload = {
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

  const response = http.post(
    `${BASE_URL}/api/orders/checkout`,

    JSON.stringify(payload),

    {
      headers: headers(),

      tags: {
        endpoint: 'checkout',

        name: 'POST /api/orders/checkout',
      },
    }
  );

  /**
   * Record checkout timing exactly once.
   */
  checkoutDuration.add(response.timings.duration);

  if (!statusIs(response, [200, 201])) {
    console.error(`Checkout failed: status=${response.status}, body=${response.body}`);
  }

  const ok = check(response, {
    'checkout returns 200/201': (res) => statusIs(res, [200, 201]),
  });

  if (!ok) {
    logFailedResponse('Checkout', response);
  }

  if (ok) {
    submittedOrders.add(1);
  }

  return ok;
}

/**
 * ------------------------------------------------------------
 * JOURNEY 1
 * Browse only.
 * ------------------------------------------------------------
 *
 * User opens the catalog and examines one to three products.
 */
function runBrowseJourney() {
  const products = getCatalog();

  if (!products) {
    return false;
  }

  randomSleep(0.3, 1.5);

  const numberOfViews = Math.min(
    products.length,

    1 + Math.floor(Math.random() * 3)
  );

  const startIndex = Math.floor(Math.random() * products.length);

  for (let index = 0; index < numberOfViews; index += 1) {
    const product = products[(startIndex + index) % products.length];

    const details = getProductDetails(product.id);

    if (!details) {
      return false;
    }

    if (index < numberOfViews - 1) {
      randomSleep(0.3, 1.2);
    }
  }

  return true;
}

/**
 * ------------------------------------------------------------
 * JOURNEY 2
 * Browse + configure/price.
 * ------------------------------------------------------------
 */
function runPricingJourney() {
  const products = getCatalog();

  if (!products) {
    return false;
  }

  randomSleep(0.3, 1.5);

  const selection = findUsableProduct(products);

  if (!selection) {
    return false;
  }

  randomSleep(0.3, 1.2);

  const pricingResult = simulatePricing(selection.product, selection.selectedAttributes);

  return pricingResult !== null;
}

/**
 * ------------------------------------------------------------
 * JOURNEY 3
 * Browse + pricing + cart.
 * ------------------------------------------------------------
 *
 * The item is removed afterward so a cart-only VU does not accumulate
 * an ever-growing active cart.
 */
function runCartJourney() {
  const products = getCatalog();

  if (!products) {
    return false;
  }

  randomSleep(0.3, 1.5);

  const selection = findUsableProduct(products);

  if (!selection) {
    return false;
  }

  randomSleep(0.3, 1.2);

  const pricingResult = simulatePricing(selection.product, selection.selectedAttributes);

  if (pricingResult === null) {
    return false;
  }

  randomSleep(0.2, 0.8);

  const cartItem = addItemToCart(
    selection.product,
    pricingResult.selectedAttributes,
    pricingResult.quantity
  );

  if (!cartItem) {
    return false;
  }

  randomSleep(0.5, 1.5);

  return removeCartItem(cartItem.id);
}

/**
 * ------------------------------------------------------------
 * JOURNEY 4
 * Full order flow.
 * ------------------------------------------------------------
 */
function runCheckoutJourney() {
  const products = getCatalog();

  if (!products) {
    return false;
  }

  randomSleep(0.3, 1.5);

  const selection = findUsableProduct(products);

  if (!selection) {
    return false;
  }

  randomSleep(0.3, 1.2);

  const pricingResult = simulatePricing(selection.product, selection.selectedAttributes);

  if (pricingResult === null) {
    return false;
  }

  randomSleep(0.2, 0.8);

  const cartItem = addItemToCart(
    selection.product,
    pricingResult.selectedAttributes,
    pricingResult.quantity
  );

  if (!cartItem) {
    return false;
  }

  /**
   * Simulate reviewing the cart before submission.
   */
  randomSleep(0.5, 1.5);

  return checkout();
}

/**
 * One iteration represents one user activity session.
 *
 * The initial random pause means all 100 VUs do not issue their first
 * request at exactly the same instant.
 */
export default function () {
  randomSleep(0, 2);

  const journey = chooseJourney();

  let succeeded;

  switch (journey) {
    case 'browse':
      succeeded = runBrowseJourney();

      break;

    case 'pricing':
      succeeded = runPricingJourney();

      break;

    case 'cart':
      succeeded = runCartJourney();

      break;

    case 'checkout':
      succeeded = runCheckoutJourney();

      break;

    default:
      succeeded = false;
  }

  if (succeeded) {
    markSuccess();
  } else {
    markFailure();
  }

  /**
   * Different users wait for different amounts of time before starting
   * their next activity session.
   */
  randomSleep(0.5, 2);
}
