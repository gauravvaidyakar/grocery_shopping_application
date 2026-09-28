import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";

const chromeCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);
const chromePath = chromeCandidates.find(existsSync);
if (!chromePath) throw new Error("Chrome or Edge was not found. Set CHROME_PATH.");

const argumentsMap = Object.fromEntries(
  process.argv.slice(2).map((entry) => {
    const [key, ...value] = entry.split("=");
    return [key, value.join("=")];
  }),
);
const localServers = [];
async function localBase(name, port) {
  if (argumentsMap[name]) return argumentsMap[name];
  const server = await createServer({
    root: join(process.cwd(), "apps", `${name}-panel`),
    logLevel: "silent",
    server: { host: "127.0.0.1", port, strictPort: true },
  });
  await server.listen();
  localServers.push(server);
  return `http://127.0.0.1:${port}`;
}
const adminBase = await localBase("admin", 4175);
const vendorBase = await localBase("vendor", 4174);
const panels = [
  {
    name: "admin",
    base: adminBase,
    sessionKey: "vishwaneed.admin.session",
    role: "ADMIN",
    routes: [
      "/login",
      "/",
      "/dashboard",
      "/vendors",
      "/customers",
      "/products",
      "/categories",
      "/orders",
      "/payments",
      "/shipments",
      "/commission",
      "/ledger",
      "/settlements",
      "/refunds",
      "/returns",
      "/replacements",
      "/reviews",
      "/complaints",
      "/notifications",
      "/reports",
      "/audit",
      "/settings",
    ],
  },
  {
    name: "vendor",
    base: vendorBase,
    sessionKey: "vishwaneed.vendor.session",
    role: "VENDOR",
    routes: [
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password?token=responsive-reset-token",
      "/",
      "/dashboard",
      "/profile",
      "/products",
      "/inventory",
      "/orders",
      "/operations",
      "/returns",
      "/replacements",
      "/support",
      "/finance",
      "/settlements",
      "/notifications",
      "/settings",
    ],
  },
];
const widths = [320, 375, 390, 430, 768, 820, 1024, 1280, 1440, 1920];
const viewports = [
  ...widths.map((width) => ({ width, height: width < 768 ? 844 : 900 })),
  { width: 844, height: 390 },
  { width: 1024, height: 768 },
];
const profile = {
  id: "responsive-vendor",
  businessName: "Responsive Test Vendor",
  ownerName: "Test Owner",
  businessEmail: "vendor@example.com",
  businessMobile: "9999999999",
  businessAddress: { line1: "Market Road", city: "Pune", state: "Maharashtra", pincode: "411001" },
  status: "APPROVED",
  documents: [
    { id: "doc-1", type: "PAN", originalName: "pan.pdf", status: "APPROVED" },
    { id: "doc-2", type: "GST_CERTIFICATE", originalName: "gst.pdf", status: "PENDING" },
  ],
  bankAccounts: [],
  inspections: [
    {
      id: "inspection-1",
      status: "SCHEDULED",
      scheduledAt: "2026-09-25T10:00:00.000Z",
      location: "Vendor premises",
      documentsVerified: true,
      premisesVerified: false,
      qualityVerified: false,
    },
  ],
};

function mockResponse(url) {
  if (url.includes("/admin/dashboard"))
    return { data: { customers: 0, vendors: 0, pendingVendors: 0, products: 0, pendingProducts: 0, orders: 0 } };
  if (url.includes("/admin/reports"))
    return { data: {
      sales: { _sum: { payableTotal: null }, _count: 0 },
      commission: { _sum: { amount: null }, _count: 0 },
      refunds: { _sum: { amount: null }, _count: 0 },
      settlements: { _sum: { amount: null }, _count: 0 },
    } };
  if (url.includes("/vendor/dashboard"))
    return { data: {
      totalProducts: 128,
      activeProducts: 94,
      pendingProducts: 12,
      lowStockProducts: 8,
      todayOrders: 17,
      pendingOrders: 24,
      deliveredOrders: 376,
      returnRequests: 6,
      totalSales: 1234567.89,
      totalCommission: 187654.32,
      pendingSettlement: 234567.89,
      settledAmount: 812345.67,
      recentOrders: [
        {
          id: "order-1",
          vendorOrderNumber: "VWN-RESPONSIVE-ORDER-001",
          createdAt: "2026-09-21T10:00:00.000Z",
          items: [{ id: "item-1" }, { id: "item-2" }],
          orderTotal: 12890.5,
          status: "PROCESSING",
        },
        {
          id: "order-2",
          vendorOrderNumber: "VWN-RESPONSIVE-ORDER-002",
          createdAt: "2026-09-20T10:00:00.000Z",
          items: [{ id: "item-3" }],
          orderTotal: 2499,
          status: "DELIVERED",
        },
      ],
    } };
  if (url.includes("/vendor/profile")) return { data: profile };
  const paginated = /\/admin\/(customers|vendors|products|orders|payments|shipments|ledger|replacements|notifications|audit-logs)(\?|$)/.test(url);
  return paginated
    ? { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } }
    : { data: [] };
}

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
  }
  async open() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        clearTimeout(pending.timeout);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      if (message.method === "Fetch.requestPaused") void this.fulfill(message.params);
    });
  }
  send(method, params = {}) {
    const id = this.nextId++;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Chrome DevTools timed out while running ${method}.`));
      }, 15_000);
      this.pending.set(id, { resolve, reject, timeout });
    });
  }
  async fulfill({ requestId, request }) {
    const response = mockResponse(request.url);
    const body = JSON.stringify({
      success: true,
      ...response,
      message: "Responsive audit mock",
    });
    await this.send("Fetch.fulfillRequest", {
      requestId,
      responseCode: 200,
      responseHeaders: [{ name: "Content-Type", value: "application/json" }],
      body: Buffer.from(body).toString("base64"),
    });
  }
  close() {
    this.socket.close();
  }
}

const port = 9324;
const userDataDir = await mkdtemp(join(tmpdir(), "vishwaneed-responsive-"));
const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

try {
  let version;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      version = await fetch(`http://127.0.0.1:${port}/json/version`).then((response) => response.json());
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  if (!version) throw new Error("Chrome DevTools did not start.");
  const failures = [];
  for (const panel of panels) {
    const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" }).then((response) => response.json());
    const cdp = new Cdp(target.webSocketDebuggerUrl);
    await cdp.open();
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Fetch.enable", { patterns: [{ urlPattern: "*api/v1/*", requestStage: "Request" }] });
    const session = JSON.stringify({
      accessToken: "responsive-access",
      refreshToken: "responsive-refresh",
      user: { id: "responsive-user", email: `${panel.name}@example.com`, role: panel.role },
    });
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `if (location.origin === ${JSON.stringify(new URL(panel.base).origin)}) {
        if (['/login', '/register'].includes(location.pathname)) localStorage.removeItem(${JSON.stringify(panel.sessionKey)});
        else localStorage.setItem(${JSON.stringify(panel.sessionKey)}, ${JSON.stringify(session)});
      }`,
    });
    for (const { width, height } of viewports) {
      for (const route of panel.routes) {
        // Reapply an exact CSS viewport before every navigation. Reusing a CDP
        // target while toggling mobile emulation can otherwise retain Chrome's
        // scaled layout viewport for the next route.
        await cdp.send("Emulation.setDeviceMetricsOverride", {
          width,
          height,
          deviceScaleFactor: 1,
          mobile: false,
        });
        const expectedUrl = new URL(`${panel.base.replace(/\/$/, "")}${route}`).href;
        await cdp.send("Page.navigate", { url: expectedUrl });
        let audit;
        for (let attempt = 0; attempt < 10; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          const result = await cdp.send("Runtime.evaluate", {
            expression: `(() => {
            const menu = document.querySelector('.menu');
            const sidebar = document.querySelector('.shell > aside, .sidebar');
            const authRoute = ['/login', '/register'].includes(location.pathname);
            const navigationOkay = authRoute || !menu || !sidebar || (innerWidth <= 900
              ? getComputedStyle(menu).display !== 'none' && sidebar.getBoundingClientRect().right <= 1
              : getComputedStyle(menu).display === 'none' && sidebar.getBoundingClientRect().left >= 0);
            return {
              href: location.href,
              viewport: innerWidth,
              documentWidth: document.documentElement.scrollWidth,
              overflow: document.documentElement.scrollWidth > innerWidth + 1,
              heading: document.querySelector('h1,h2')?.textContent?.trim() ?? '',
              viewportMetaOkay: document.querySelector('meta[name="viewport"]')?.content.includes('width=device-width') ?? false,
              runtimeError: document.body.textContent?.includes('This page could not be displayed') ?? false,
              navigationOkay
            };
          })()`,
            returnByValue: true,
          });
          const candidate = result.result?.value;
          if (candidate && candidate.href === expectedUrl && candidate.heading && candidate.viewport === width) {
            audit = candidate;
            // Vite can paint the routed markup just before the linked stylesheet
            // finishes applying. Keep sampling until the layout is stable so a
            // transient unstyled table is not reported as horizontal overflow.
            if (
              !candidate.overflow &&
              !candidate.runtimeError &&
              candidate.navigationOkay &&
              candidate.viewportMetaOkay
            ) {
              break;
            }
          }
        }
        if (!audit) {
          failures.push({ panel: panel.name, route, width, renderTimeout: true });
          continue;
        }
        if (audit.overflow || audit.runtimeError || !audit.navigationOkay || !audit.viewportMetaOkay) {
          failures.push({ panel: panel.name, route, width, ...audit });
        }
      }
    }
    cdp.close();
    await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`);
  }
  if (failures.length) {
    console.error(JSON.stringify(failures, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`Responsive audit passed: ${panels.reduce((sum, panel) => sum + panel.routes.length, 0)} routes × ${viewports.length} viewports.`);
  }
} finally {
  chrome.kill();
  await new Promise((resolve) => {
    chrome.once("exit", resolve);
    setTimeout(resolve, 2000);
  });
  await rm(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  await Promise.all(localServers.map((server) => server.close()));
}
