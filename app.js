// The Story of BeatWave - Application Core & Supabase Realtime Synchronization
// Powered by Supabase Backend, Liquid Glass Architecture & Animated Ambient Canvas

(function () {
  'use strict';

  let currentTier = 'ebook';
  let activeOrderId = null;
  let tempOrderData = null;
  let allOrders = {};
  let currentFilter = 'all';
  let searchQuery = '';
  let supabaseClient = null;
  let isSupabaseConfigured = false;

  // 1. Initialize Supabase Client
  try {
    if (
      typeof window.supabase !== 'undefined' &&
      typeof supabaseConfig !== 'undefined' &&
      supabaseConfig.supabaseUrl &&
      !supabaseConfig.supabaseUrl.includes('your-project-id')
    ) {
      supabaseClient = window.supabase.createClient(
        supabaseConfig.supabaseUrl,
        supabaseConfig.supabaseAnonKey
      );
      isSupabaseConfigured = true;
      console.log('[BeatWave] Connected to Supabase backend successfully.');
      initSupabaseRealtime();
    } else {
      console.log('[BeatWave] Supabase credentials not set in config.js — running local sync mode.');
    }
  } catch (err) {
    console.warn('[BeatWave] Supabase initialization notice:', err.message);
  }

  // 2. Animated Particle Dust Canvas
  function initParticleCanvas() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const particleCount = Math.min(50, Math.floor(width / 25));

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.6 + 0.4,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: (Math.random() - 0.5) * 0.4,
        alpha: Math.random() * 0.5 + 0.2
      });
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);

      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 160, 255, ${p.alpha})`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(138, 43, 226, 0.4)';
        ctx.fill();
      });

      requestAnimationFrame(animate);
    }
    animate();
  }
  initParticleCanvas();

  // 3. 3D Book Flip
  window.flipBookCard = function () {
    const bookCard = document.getElementById('bookCard');
    const label = document.getElementById('flipButtonLabel');
    if (!bookCard) return;

    bookCard.classList.toggle('is-flipped');
    const isFlipped = bookCard.classList.contains('is-flipped');
    if (label) {
      label.innerText = isFlipped ? 'Show Front Cover' : 'Show Back Cover';
    }
  };

  // 4. Smooth Scroll to Pricing
  window.scrollToPricing = function () {
    const pricingEl = document.getElementById('pricing');
    if (pricingEl) {
      pricingEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 5. Expandable Full 14 Chapters Drawer
  window.toggleFullToc = function () {
    const drawer = document.getElementById('allChaptersDrawer');
    const toggleText = document.getElementById('tocToggleText');
    const chevron = document.getElementById('tocChevron');
    if (!drawer) return;

    drawer.classList.toggle('is-open');
    const isOpen = drawer.classList.contains('is-open');
    if (toggleText) {
      toggleText.innerText = isOpen ? 'Hide Full Chapter List' : 'Explore All 14 Chapters';
    }
    if (chevron) {
      chevron.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
    }
  };

  // 6. Checkout Flow
  window.openCheckoutModal = function (tierId) {
    const tier = paymentConfig.tiers[tierId] || paymentConfig.tiers.ebook;
    currentTier = tier.id;

    document.getElementById('checkoutForm').style.display = 'block';
    document.getElementById('paymentStage').style.display = 'none';
    document.getElementById('successStage').style.display = 'none';

    document.getElementById('summaryTierName').innerText = tier.name;
    document.getElementById('summaryTierNote').innerText = tier.description;

    let priceText = tier.formattedPrice;
    if (tier.id === 'print') {
      priceText = `₹${tier.price + tier.deliveryCharge} (incl. ₹${tier.deliveryCharge} delivery)`;
    }
    document.getElementById('summaryTierPrice').innerText = priceText;

    const addressGroup = document.getElementById('addressGroup');
    const custAddress = document.getElementById('custAddress');
    if (tier.id === 'print') {
      addressGroup.style.display = 'flex';
      custAddress.required = true;
    } else {
      addressGroup.style.display = 'none';
      custAddress.required = false;
    }

    document.getElementById('checkoutModal').classList.add('is-active');
  };

  window.closeCheckoutModal = function () {
    document.getElementById('checkoutModal').classList.remove('is-active');
  };

  window.handleProceedToPayment = function (e) {
    e.preventDefault();

    const name = document.getElementById('custName').value.trim();
    const email = document.getElementById('custEmail').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    const address = document.getElementById('custAddress').value.trim();

    if (!name || !email || !phone) {
      showToast('Please fill all required fields');
      return;
    }

    const tier = paymentConfig.tiers[currentTier];
    const totalAmount = tier.id === 'print' ? tier.price + tier.deliveryCharge : tier.price;
    const orderId = 'BW-' + Math.floor(100000 + Math.random() * 900000);
    activeOrderId = orderId;

    tempOrderData = {
      id: orderId,
      customer_name: name,
      email: email,
      phone: phone,
      tier_id: tier.id,
      tier_name: tier.name,
      amount: totalAmount,
      delivery_address: address || 'N/A (Digital)',
      payment_method: 'UPI',
      sender_handle: '',
      status: 'PENDING',
      created_at: new Date().toISOString()
    };

    // Configure UPI Intent
    const upiLink = `upi://pay?pa=${encodeURIComponent(paymentConfig.upiId)}&pn=${encodeURIComponent(paymentConfig.merchantName)}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent('BeatWaveBook_' + orderId)}`;
    const upiBtn = document.getElementById('upiIntentBtn');
    if (upiBtn) upiBtn.href = upiLink;

    document.getElementById('checkoutForm').style.display = 'none';
    document.getElementById('paymentStage').style.display = 'flex';
    const senderInput = document.getElementById('paymentSenderName');
    if (senderInput) senderInput.value = '';
  };

  window.backToCustomerDetails = function () {
    document.getElementById('checkoutForm').style.display = 'block';
    document.getElementById('paymentStage').style.display = 'none';
  };

  window.copyUpiId = function () {
    navigator.clipboard.writeText(paymentConfig.upiId).then(() => {
      showToast('UPI ID copied: ' + paymentConfig.upiId);
    }).catch(() => {
      showToast('UPI ID: ' + paymentConfig.upiId);
    });
  };

  window.submitOrderFinal = async function () {
    const sender = document.getElementById('paymentSenderName')?.value.trim() || tempOrderData.customer_name;
    tempOrderData.sender_handle = sender;

    // Save to Supabase (or fallback locally)
    if (isSupabaseConfigured && supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from('book_orders')
          .insert([tempOrderData]);

        if (error) throw error;
        console.log('[BeatWave] Order stored in Supabase:', tempOrderData.id);
      } catch (err) {
        console.warn('Supabase insert warning, saved to local cache:', err.message);
        saveOrderLocally(tempOrderData);
      }
    } else {
      saveOrderLocally(tempOrderData);
    }

    showOrderSuccess();
  };

  function showOrderSuccess() {
    document.getElementById('paymentStage').style.display = 'none';
    document.getElementById('successStage').style.display = 'block';
    document.getElementById('confirmedOrderId').innerText = activeOrderId;
    showToast('Order recorded successfully!');
  }

  function saveOrderLocally(order) {
    try {
      const local = JSON.parse(localStorage.getItem('bw_supabase_orders') || '{}');
      local[order.id] = order;
      localStorage.setItem('bw_supabase_orders', JSON.stringify(local));
    } catch (e) {
      console.warn('LocalStorage unavailable');
    }
  }

  // 7. Supabase Realtime Subscription
  function initSupabaseRealtime() {
    if (!supabaseClient) return;

    // Subscribe to all changes on the book_orders table
    supabaseClient
      .channel('book_orders_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'book_orders' }, () => {
        fetchSupabaseOrders();
      })
      .subscribe();
  }

  async function fetchSupabaseOrders() {
    if (!isSupabaseConfigured || !supabaseClient) {
      fallbackLocalAdminRead();
      return;
    }

    try {
      const { data, error } = await supabaseClient
        .from('book_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      allOrders = {};
      if (data) {
        data.forEach(item => {
          allOrders[item.id] = item;
        });
      }
      renderAdminTable();
      updateAdminMetrics();
    } catch (err) {
      console.warn('Supabase fetch failed, falling back to local:', err.message);
      fallbackLocalAdminRead();
    }
  }

  // 8. Admin Panel & Realtime Synchronizer
  window.openAdminModal = function () {
    document.getElementById('adminModal').classList.add('is-active');
    document.getElementById('adminPasswordInput').value = '';
    document.getElementById('adminErrorMsg').innerText = '';

    if (sessionStorage.getItem('bw_admin_auth') === 'true') {
      showAdminDashboard();
    } else {
      document.getElementById('adminLoginStep').style.display = 'flex';
      document.getElementById('adminDashboard').classList.remove('is-open');
      document.getElementById('adminPasswordInput').focus();
    }
  };

  window.closeAdminModal = function () {
    document.getElementById('adminModal').classList.remove('is-active');
  };

  // Secure password verification (Password is kept in .env; frontend only uses one-way hash & Supabase RPC)
  async function verifyPassHash(input) {
    if (isSupabaseConfigured && supabaseClient) {
      try {
        const { data, error } = await supabaseClient.rpc('verify_admin_access', { pass_attempt: input });
        if (!error && typeof data === 'boolean') return data;
      } catch(e) {}
    }
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
    const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    return hash === '006657998771eb1ef75d0a26f8824af99da8bf4f7261d3a4d896708286a618eb';
  }

  window.verifyAdminPassword = async function () {
    const entered = document.getElementById('adminPasswordInput').value.trim();
    const isValid = await verifyPassHash(entered);
    if (isValid) {
      sessionStorage.setItem('bw_admin_auth', 'true');
      showAdminDashboard();
    } else {
      document.getElementById('adminErrorMsg').innerText = 'Access Denied: Incorrect Password';
    }
  };

  document.getElementById('adminPasswordInput')?.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') verifyAdminPassword();
  });

  function showAdminDashboard() {
    document.getElementById('adminLoginStep').style.display = 'none';
    document.getElementById('adminDashboard').classList.add('is-open');
    fetchSupabaseOrders();
  }

  function fallbackLocalAdminRead() {
    try {
      allOrders = JSON.parse(localStorage.getItem('bw_supabase_orders') || '{}');
    } catch (e) {
      allOrders = {};
    }
    renderAdminTable();
    updateAdminMetrics();
  }

  function updateAdminMetrics() {
    const ordersList = Object.values(allOrders);
    const totalOrders = ordersList.length;
    let totalRevenue = 0;
    let pendingCount = 0;
    let printCount = 0;

    ordersList.forEach(o => {
      totalRevenue += Number(o.amount) || 0;
      if (o.status === 'PENDING') pendingCount++;
      if (o.tier_id === 'print') printCount++;
    });

    document.getElementById('metricTotalOrders').innerText = totalOrders;
    document.getElementById('metricTotalRevenue').innerText = `₹${totalRevenue}`;
    document.getElementById('metricPendingOrders').innerText = pendingCount;
    document.getElementById('metricPrintOrders').innerText = printCount;
  }

  function renderAdminTable() {
    const tbody = document.getElementById('adminOrdersTbody');
    if (!tbody) return;

    const ordersList = Object.values(allOrders).sort((a, b) => {
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    const filtered = ordersList.filter(o => {
      const matchesFilter = currentFilter === 'all' || o.status === currentFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        (o.id && o.id.toLowerCase().includes(q)) ||
        (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
        (o.email && o.email.toLowerCase().includes(q)) ||
        (o.phone && o.phone.toLowerCase().includes(q)) ||
        (o.sender_handle && o.sender_handle.toLowerCase().includes(q));
      return matchesFilter && matchesSearch;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: var(--space-xl); color: var(--color-ink-faint);">
            No matching book orders found.
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    filtered.forEach(o => {
      const dateStr = o.created_at ? new Date(o.created_at).toLocaleString('en-IN', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      }) : '—';

      const statusClass = 'status-' + (o.status ? o.status.toLowerCase() : 'pending');

      html += `
        <tr>
          <td style="font-family: var(--font-mono); font-weight: 700; color: var(--color-accent-cyan);">${escapeHtml(o.id)}</td>
          <td style="font-size: 0.78rem; font-family: var(--font-mono);">${dateStr}</td>
          <td>
            <strong style="color: var(--color-ink);">${escapeHtml(o.customer_name || 'Anonymous')}</strong>
            <div style="font-size: 0.75rem; color: var(--color-ink-faint);">${escapeHtml(o.email || '')} &middot; ${escapeHtml(o.phone || '')}</div>
            ${o.delivery_address && o.delivery_address !== 'N/A (Digital)' ? `<div style="font-size: 0.72rem; color: var(--color-ink-muted); margin-top: 2px;">📍 ${escapeHtml(o.delivery_address)}</div>` : ''}
          </td>
          <td><span style="font-size: 0.8rem; font-weight: 600;">${escapeHtml(o.tier_name || o.tier_id)}</span></td>
          <td style="font-family: var(--font-mono); font-weight: 700; color: var(--color-ink);">₹${o.amount}</td>
          <td style="font-family: var(--font-mono); font-size: 0.78rem;">
            <span style="background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);">${escapeHtml(o.sender_handle || '—')}</span>
          </td>
          <td><span class="status-badge ${statusClass}">${escapeHtml(o.status || 'PENDING')}</span></td>
          <td>
            <div class="table-actions">
              ${o.status !== 'PAID' ? `<button class="table-action-btn" onclick="updateOrderStatus('${o.id}', 'PAID')">Verify</button>` : ''}
              ${o.tier_id === 'print' && o.status !== 'SHIPPED' ? `<button class="table-action-btn" onclick="updateOrderStatus('${o.id}', 'SHIPPED')">Ship</button>` : ''}
              <button class="table-action-btn" style="color: var(--color-accent-red);" onclick="deleteOrder('${o.id}')">&times;</button>
            </div>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  window.filterAdminOrders = function (status, btn) {
    currentFilter = status;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('is-active'));
    if (btn) btn.classList.add('is-active');
    renderAdminTable();
  };

  window.searchAdminOrders = function (val) {
    searchQuery = val.trim();
    renderAdminTable();
  };

  window.updateOrderStatus = async function (orderId, newStatus) {
    if (isSupabaseConfigured && supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from('book_orders')
          .update({ status: newStatus })
          .eq('id', orderId);

        if (error) throw error;
        showToast(`Order ${orderId} marked as ${newStatus}`);
        fetchSupabaseOrders();
      } catch (err) {
        showToast('Error updating status: ' + err.message);
      }
    } else {
      if (allOrders[orderId]) {
        allOrders[orderId].status = newStatus;
        saveOrderLocally(allOrders[orderId]);
        renderAdminTable();
        updateAdminMetrics();
        showToast(`Order ${orderId} marked as ${newStatus}`);
      }
    }
  };

  window.deleteOrder = async function (orderId) {
    if (!confirm(`Are you sure you want to remove order ${orderId}?`)) return;

    if (isSupabaseConfigured && supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from('book_orders')
          .delete()
          .eq('id', orderId);

        if (error) throw error;
        showToast(`Order ${orderId} deleted`);
        fetchSupabaseOrders();
      } catch (err) {
        showToast('Error deleting order: ' + err.message);
      }
    } else {
      delete allOrders[orderId];
      localStorage.setItem('bw_supabase_orders', JSON.stringify(allOrders));
      renderAdminTable();
      updateAdminMetrics();
      showToast(`Order ${orderId} deleted`);
    }
  };

  window.exportOrdersToCsv = function () {
    const ordersList = Object.values(allOrders);
    if (ordersList.length === 0) {
      showToast('No orders to export');
      return;
    }

    const headers = ['Order ID', 'Timestamp', 'Customer Name', 'Email', 'Phone', 'Address', 'Tier', 'Amount (INR)', 'Sender Handle', 'Status'];
    const rows = ordersList.map(o => [
      `"${o.id || ''}"`,
      `"${o.created_at || ''}"`,
      `"${(o.customer_name || '').replace(/"/g, '""')}"`,
      `"${(o.email || '').replace(/"/g, '""')}"`,
      `"${(o.phone || '').replace(/"/g, '""')}"`,
      `"${(o.delivery_address || '').replace(/"/g, '""')}"`,
      `"${(o.tier_name || o.tier_id || '').replace(/"/g, '""')}"`,
      o.amount || 0,
      `"${(o.sender_handle || '').replace(/"/g, '""')}"`,
      `"${o.status || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BeatWave_Orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Orders exported to CSV!');
  };

  function showToast(msg) {
    const toast = document.getElementById('toastBox');
    if (!toast) return;
    toast.innerText = msg;
    toast.classList.add('is-visible');
    setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 3200);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        overlay.classList.remove('is-active');
      }
    });
  });

  // Open Admin modal if URL hash is #admin
  window.addEventListener('DOMContentLoaded', () => {
    if (window.location.hash === '#admin') {
      openAdminModal();
    }
  });

})();
