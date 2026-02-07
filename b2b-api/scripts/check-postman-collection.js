const c = require('../docs/postman/b2b-api.postman_collection.json');

let issues = [];

function checkRequest(item, path) {
  if (!item.request) return;

  const req = item.request;
  const name = path + ' > ' + item.name;

  // Check for auth blocks
  if (req.auth) {
    issues.push('AUTH BLOCK: ' + name + ' has auth type: ' + req.auth.type);
  }

  // Check for duplicate headers
  const headers = req.header || [];
  const headerCounts = {};
  headers.forEach(h => {
    const key = h.key?.toLowerCase();
    if (key) {
      headerCounts[key] = (headerCounts[key] || 0) + 1;
    }
  });

  Object.entries(headerCounts).forEach(([key, count]) => {
    if (count > 1) {
      issues.push('DUPLICATE HEADER: ' + name + ' has ' + count + 'x ' + key);
    }
  });

  // Check for {{apiKey}} values
  headers.forEach(h => {
    if (h.value === '{{apiKey}}') {
      issues.push('APIKEY VAR: ' + name + ' has {{apiKey}} in ' + h.key);
    }
  });

  // Check for missing {{baseUrl}}
  if (req.url && req.url.host) {
    const host = Array.isArray(req.url.host) ? req.url.host[0] : req.url.host;
    if (host !== '{{baseUrl}}') {
      issues.push('MISSING BASEURL: ' + name + ' has host: ' + host);
    }
  }

  // Check for missing /api/v1 prefix
  if (req.url && req.url.path && Array.isArray(req.url.path)) {
    if (req.url.path[0] !== 'api' || req.url.path[1] !== 'v1') {
      issues.push('MISSING PREFIX: ' + name + ' path: /' + req.url.path.join('/'));
    }
  }
}

function processItems(items, path = '') {
  items.forEach(item => {
    if (item.item) {
      processItems(item.item, path + ' > ' + item.name);
    } else {
      checkRequest(item, path);
    }
  });
}

processItems(c.item);

console.log('=== Postman Collection Health Check ===\n');

if (issues.length === 0) {
  console.log('✅ No issues found! Collection is clean.\n');
} else {
  console.log('❌ Found ' + issues.length + ' issues:\n');
  issues.forEach(i => console.log('  - ' + i));
  console.log('');
}

// Summary stats
let totalRequests = 0;
function countRequests(items) {
  items.forEach(item => {
    if (item.item) {
      countRequests(item.item);
    } else if (item.request) {
      totalRequests++;
    }
  });
}
countRequests(c.item);

console.log('Summary:');
console.log('  Total requests:', totalRequests);
console.log('  Total folders:', c.item.length);
console.log('  Issues found:', issues.length);

// Exit with error if issues found (for CI/automation)
if (issues.length > 0) {
  process.exit(1);
}
