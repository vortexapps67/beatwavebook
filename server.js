import http from 'node:http';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ckjsrurruaxcveoxpzws.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_OTbvoTeNX5sC71AT7mqfNg_hoac-5uY';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const PORT = process.env.PORT || 3000;

// Initialize Supabase Server Client
const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SECRET_KEY || SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// Simple lightweight HTTP server for BeatWave backend APIs
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

  // 1. Health check endpoint
  if (url.pathname === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      app: 'BeatWave Kitaab API Server',
      supabaseUrl: SUPABASE_URL,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // 2. Orders summary statistics
  if (url.pathname === '/api/stats' && req.method === 'GET') {
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

  // Default 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`[BeatWave Server] Running on http://localhost:${PORT}`);
    console.log(`[BeatWave Server] Connected to Supabase at ${SUPABASE_URL}`);
  });
}

export default server;
