import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ckjsrurruaxcveoxpzws.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  (process.env.SUPABASE_SECRET_KEY && !process.env.SUPABASE_SECRET_KEY.includes('•') && process.env.SUPABASE_SECRET_KEY.length > 20 ? process.env.SUPABASE_SECRET_KEY : null) ||
  process.env.SUPABASE_ANON_KEY || 
  process.env.SUPABASE_PUBLISHABLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNranNydXJydWF4Y3Zlb3hwendzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1OTM2NzcsImV4cCI6MjEwNDE2OTY3N30.uUcbTmFTVJusweOVyUtjjwZo5KMoqvBQtqqOGZzmx6M';

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff'
};

// Initialize Supabase Server Client
const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// HTTP server for BeatWave (serves static files + backend APIs)
const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const host = req.headers.host || `localhost:${PORT}`;
  const url = new URL(req.url, `http://${host}`);
  const pathname = decodeURIComponent(url.pathname);

  // 1. Health check API endpoint
  if (pathname === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      app: 'BeatWave Kitaab API Server',
      supabaseUrl: SUPABASE_URL,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // 2. Orders summary statistics API endpoint
  if (pathname === '/api/stats' && req.method === 'GET') {
    try {
      const { data: orders, error } = await supabaseAdmin
        .from('book_orders')
        .select('*');

      if (error) throw error;

      const uniqueCustomers = new Set();
      let revenue = 0;
      let pending = 0;
      let paid = 0;
      let shipped = 0;

      (orders || []).forEach(o => {
        const key = (o.email || o.phone || o.customer_name || '').toLowerCase().trim();
        if (key) uniqueCustomers.add(key);

        const s = (o.status || 'PENDING_VERIFICATION').toUpperCase();
        const amt = parseFloat(o.amount) || 0;
        if (['PAID', 'SHIPPED', 'DELIVERED'].includes(s)) revenue += amt;
        if (s === 'PAID') paid++;
        else if (['SHIPPED', 'DELIVERED'].includes(s)) shipped++;
        else if (!['CANCELLED', 'REJECTED'].includes(s)) pending++;
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        totalOrders: (orders || []).length,
        uniqueCustomers: uniqueCustomers.size,
        totalRevenue: revenue,
        pendingOrders: pending,
        paidOrders: paid,
        shippedOrders: shipped
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // 3. Static File Server (serves index.html, login.html, cart.html, admin.html, styles.css, etc.)
  let relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  let filePath = path.join(__dirname, relativePath);

  // Security: prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
    } else {
      // If HTML file without .html extension requested
      const htmlFilePath = filePath + '.html';
      fs.stat(htmlFilePath, (htmlErr, htmlStats) => {
        if (!htmlErr && htmlStats.isFile()) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          fs.createReadStream(htmlFilePath).pipe(res);
        } else {
          // Serve 404.html if available or json 404
          const notFoundPath = path.join(__dirname, '404.html');
          fs.readFile(notFoundPath, (err404, content404) => {
            if (!err404) {
              res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(content404);
            } else {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'File not found', path: pathname }));
            }
          });
        }
      });
    }
  });
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`[BeatWave Server] Running on http://localhost:${PORT}`);
    console.log(`[BeatWave Server] Connected to Supabase at ${SUPABASE_URL}`);
  });
}

export default server;
