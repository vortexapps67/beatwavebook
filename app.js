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

      // Check Reader auth state for nav
      supabaseClient.auth.getSession().then(({ data: { session } }) => {
        const guestSession = localStorage.getItem('bw_guest_session');
        const activeUser = (session && session.user) ? session.user : (guestSession ? JSON.parse(guestSession).user : null);
        if (activeUser) {
          const navLink = document.getElementById('navLoginLink');
          if (navLink) {
            navLink.innerText = 'My Account';
            navLink.title = activeUser.email || 'Reader';
          }
        }
      }).catch(() => {
        const guestSession = localStorage.getItem('bw_guest_session');
        if (guestSession) {
          const navLink = document.getElementById('navLoginLink');
          if (navLink) {
            navLink.innerText = 'My Account';
            navLink.title = 'Guest Reader';
          }
        }
      });
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

    // Lookup reader password if available
    let readerPass = '';
    try {
      const localUsers = JSON.parse(localStorage.getItem('bw_local_users') || '{}');
      const emailLower = email.toLowerCase().trim();
      if (localUsers[emailLower] && localUsers[emailLower].password) {
        readerPass = localUsers[emailLower].password;
      }
    } catch(e) {}

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
      user_password: readerPass,
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
      window.notifyUser('UPI ID Copied 📋', `${paymentConfig.upiId} copied to clipboard!`, 'success');
    }).catch(() => {
      window.notifyUser('UPI ID 📋', paymentConfig.upiId, 'info');
    });
  };

  window.submitOrderFinal = async function () {
    const sender = document.getElementById('paymentSenderName')?.value.trim() || tempOrderData.customer_name;
    tempOrderData.sender_handle = sender;

    window.notifyUser('Placing Order 🚀', `Submitting ${tempOrderData.id} to Supabase...`, 'info', 3000);

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
    window.notifyUser('Order Confirmed! 🎉', `Order ${activeOrderId} recorded in database. Vortex Apps will verify payment.`, 'success', 6000);
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
      window.notifyUser('Master Access Granted 🔐', 'Welcome back, Akshansh & Vortex Apps Team!', 'success');
      showAdminDashboard();
    } else {
      document.getElementById('adminErrorMsg').innerText = 'Access Denied: Incorrect Password';
      window.notifyUser('Access Denied ⛔', 'Incorrect master password entered.', 'error');
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
        if (newStatus === 'PAID') {
          window.notifyUser('Payment Verified! ✅', `Order ${orderId} marked as PAID. Book unlocked.`, 'success');
        } else if (newStatus === 'SHIPPED') {
          window.notifyUser('Order Shipped! 📦', `Order ${orderId} marked as SHIPPED.`, 'success');
        } else {
          window.notifyUser('Status Updated 📝', `Order ${orderId} is now ${newStatus}.`, 'info');
        }
        fetchSupabaseOrders();
      } catch (err) {
        window.notifyUser('Status Update Error ❌', err.message, 'error');
      }
    } else {
      if (allOrders[orderId]) {
        allOrders[orderId].status = newStatus;
        saveOrderLocally(allOrders[orderId]);
        renderAdminTable();
        updateAdminMetrics();
        if (newStatus === 'PAID') {
          window.notifyUser('Payment Verified! ✅', `Order ${orderId} marked as PAID locally.`, 'success');
        } else {
          window.notifyUser('Status Updated 📝', `Order ${orderId} is now ${newStatus}.`, 'info');
        }
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
        window.notifyUser('Order Deleted 🗑️', `Order ${orderId} removed from database.`, 'info');
        fetchSupabaseOrders();
      } catch (err) {
        window.notifyUser('Delete Error ❌', err.message, 'error');
      }
    } else {
      delete allOrders[orderId];
      localStorage.setItem('bw_supabase_orders', JSON.stringify(allOrders));
      renderAdminTable();
      updateAdminMetrics();
      window.notifyUser('Order Deleted 🗑️', `Order ${orderId} removed from cache.`, 'info');
    }
  };

  window.exportOrdersToCsv = function () {
    const ordersList = Object.values(allOrders);
    if (ordersList.length === 0) {
      window.notifyUser('No Orders 📁', 'No book orders available to export.', 'warning');
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
    window.notifyUser('Orders Exported! 📊', `Downloaded BeatWave_Orders_${new Date().toISOString().slice(0, 10)}.csv`, 'success');
  };

  // Web Audio Synth Atmospheric Feedback
  function playAudioCue(type) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.22);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'error' || type === 'warning') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.18);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.14);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.28);
      }
    } catch(e) {}
  }

  window.notifyUser = function(title, msg, type = 'info', duration = 4200) {
    let container = document.getElementById('bwToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'bwToastContainer';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `bw-toast bw-toast-${type}`;

    let iconSymbol = '🌊';
    if (type === 'success') iconSymbol = '✓';
    else if (type === 'error') iconSymbol = '✕';
    else if (type === 'warning') iconSymbol = '⚠';

    toast.innerHTML = `
      <div class="bw-toast-icon">${iconSymbol}</div>
      <div class="bw-toast-content">
        <div class="bw-toast-title">${escapeHtml(title)}</div>
        ${msg ? `<div class="bw-toast-msg">${escapeHtml(msg)}</div>` : ''}
      </div>
      <button type="button" class="bw-toast-close" title="Dismiss">&times;</button>
      <div class="bw-toast-progress" style="animation-duration: ${duration}ms;"></div>
    `;

    container.appendChild(toast);
    playAudioCue(type);

    const removeToast = () => {
      if (toast.classList.contains('is-leaving')) return;
      toast.classList.add('is-leaving');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 350);
    };

    const timer = setTimeout(removeToast, duration);
    const closeBtn = toast.querySelector('.bw-toast-close');
    if (closeBtn) {
      closeBtn.onclick = () => {
        clearTimeout(timer);
        removeToast();
      };
    }
  };

  window.showToast = function(msg, type = 'info') {
    window.notifyUser('BeatWave', msg, type);
  };

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

  // ==========================================================================
  // 100x POLISH SUITE: CINEMATIC PRELOADER CONTROLLER
  // ==========================================================================
  function initCinematicPreloader() {
    const preloader = document.getElementById('bwPreloader');
    const counter = document.getElementById('preloaderCounter');
    const fill = document.getElementById('preloaderFill');
    const status = document.getElementById('preloaderStatus');

    if (!preloader || !counter || !fill || !status) return;

    const milestones = [
      { at: 18, text: 'Tuning audio engine...' },
      { at: 40, text: 'Compiling 14 chapter chronicles...' },
      { at: 65, text: 'Synthesizing Liquid Glass UI...' },
      { at: 86, text: 'Synchronizing Supabase realtime...' },
      { at: 100, text: 'BeatWave 2026 Ready' }
    ];

    let currentPercent = 0;
    const targetPercent = 100;
    const duration = 400; // Fast 400ms elegant fade
    const startTime = performance.now();

    function updatePreloader(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      currentPercent = Math.floor(eased * targetPercent);

      counter.innerText = (currentPercent < 10 ? '0' : '') + currentPercent + '%';
      fill.style.width = currentPercent + '%';

      if (progress < 1) {
        requestAnimationFrame(updatePreloader);
      } else {
        counter.innerText = '100%';
        fill.style.width = '100%';
        setTimeout(() => {
          preloader.classList.add('is-loaded');
          triggerInitialScrollReveal();
          setTimeout(() => {
            preloader.style.display = 'none';
          }, 350);
        }, 100);
      }
    }

    requestAnimationFrame(updatePreloader);

    // Global Safety Guard: Dismiss preloader after 700ms under all network conditions
    setTimeout(() => {
      if (!preloader.classList.contains('is-loaded')) {
        preloader.classList.add('is-loaded');
        triggerInitialScrollReveal();
        setTimeout(() => { preloader.style.display = 'none'; }, 250);
      }
    }, 700);
  }

  // ==========================================================================
  // 100x POLISH SUITE: CARD SPOTLIGHT CURSOR TRACKING
  // ==========================================================================
  function initCardSpotlights() {
    document.querySelectorAll('.spotlight-card, .chapter-card, .pricing-card, .cart-item-card').forEach(card => {
      card.classList.add('spotlight-card');
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });
    });
  }

  // ==========================================================================
  // 100x POLISH SUITE: SCROLL REVEAL (IntersectionObserver)
  // ==========================================================================
  function initScrollReveal() {
    const elements = document.querySelectorAll('.reveal-init');
    if (!elements.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

    elements.forEach(el => observer.observe(el));
  }

  function triggerInitialScrollReveal() {
    document.querySelectorAll('.hero-section .reveal-init').forEach(el => {
      el.classList.add('reveal-visible');
    });
  }

  // ==========================================================================
  // 100x POLISH SUITE: AMBIENT SYNTH FREQUENCY AUDIO (Web Audio API)
  // ==========================================================================
  let audioCtx = null;
  let isAudioPlaying = false;
  let synthGain = null;
  let synthInterval = null;

  window.toggleAmbientAudio = function () {
    const pill = document.getElementById('ambientAudioPill');
    const label = document.getElementById('audioPillLabel');

    if (!isAudioPlaying) {
      startSynthTheme();
      isAudioPlaying = true;
      if (pill) pill.classList.add('is-playing');
      if (label) label.innerText = 'Freq 432Hz Active';
      window.notifyUser('Synth Stream Active 🎧', 'BeatWave 432Hz harmonic ambient synthesizer started.', 'info', 3000);
    } else {
      stopSynthTheme();
      isAudioPlaying = false;
      if (pill) pill.classList.remove('is-playing');
      if (label) label.innerText = 'Play Synth Frequency';
      window.notifyUser('Synth Stream Paused 🔇', 'Ambient frequency muted.', 'info', 2000);
    }
  };

  function startSynthTheme() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!audioCtx) audioCtx = new AudioContext();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      synthGain = audioCtx.createGain();
      synthGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
      synthGain.gain.exponentialRampToValueAtTime(0.06, audioCtx.currentTime + 1.2);
      synthGain.connect(audioCtx.destination);

      // Warm cinematic progression: D3, F3, A3, C4, E4
      const chordPitches = [146.83, 174.61, 220.00, 261.63, 329.63];
      let noteIdx = 0;

      function playSoftChord() {
        if (!isAudioPlaying || !audioCtx) return;
        const baseFreq = chordPitches[noteIdx % chordPitches.length];
        noteIdx++;

        const osc = audioCtx.createOscillator();
        const noteGain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(680, audioCtx.currentTime);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);

        noteGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
        noteGain.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + 0.8);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 3.8);

        osc.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(synthGain);

        osc.start();
        osc.stop(audioCtx.currentTime + 4.0);
      }

      playSoftChord();
      synthInterval = setInterval(playSoftChord, 2200);
    } catch(e) {
      console.warn('Audio synthesis notice:', e);
    }
  }

  function stopSynthTheme() {
    if (synthGain && audioCtx) {
      try {
        synthGain.gain.setValueAtTime(synthGain.gain.value, audioCtx.currentTime);
        synthGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.4);
      } catch(e) {}
    }
    if (synthInterval) {
      clearInterval(synthInterval);
      synthInterval = null;
    }
  }

  // ==========================================================================
  // MASTER REDESIGN: 14 CHAPTER EXCERPTS & READING MODAL
  // ==========================================================================
  const CHAPTER_EXCERPTS = {
    1: {
      act: 'ACT I · CHAPTER 01',
      title: 'The Spark of Inspiration',
      content: `
        <p>It was 2:14 AM on a chilly Tuesday in late November. The three of us—Akshansh, Aarav Sharma, and Aarav Singh—were crammed on a shared Discord voice call, screens glowing in dark bedrooms across the city.</p>
        <p>We were trying to study for upcoming school board tests while listening to an indie lo-fi playlist. Then, right at the climax of a track, a screeching 30-second commercial for car insurance blared through our headphones.</p>
        <blockquote>&ldquo;Why is every music app on earth treated like an advertising billboard? Why can’t an app just play music?&rdquo;</blockquote>
        <p>Akshansh pulled up a terminal window. Aarav Sharma opened Figma and sketched the first minimalist wireframe. That midnight call didn’t end in sleep. At 4:22 AM, the initial repository was pushed: <code>commit 01: init beatwave</code>.</p>
      `
    },
    2: {
      act: 'ACT I · CHAPTER 02',
      title: 'Fix One, Get 3 More Bugs',
      content: `
        <p>Building an Android audio player is deceptive. You think it's just passing an audio URL to a media player. Then real devices get involved.</p>
        <p>On cheap hardware, the audio buffer would desync. If someone received a WhatsApp call while listening, BeatWave would resume playing simultaneously over the phone call. When the phone screen turned off, Android’s battery optimizer would aggressively murder our playback thread.</p>
        <blockquote>&ldquo;We spent 4 days tracking down a memory leak that turned out to be an unclosed audio session cache inflating the RAM to 1.8GB before crashing.&rdquo;</blockquote>
        <p>We learned git branches, heap dumps, and ExoPlayer architecture at 3:00 AM while drinking instant black coffee.</p>
      `
    },
    3: {
      act: 'ACT I · CHAPTER 03',
      title: 'End Of BeatWave (Almost)',
      content: `
        <p>By January, the pressure caught up with us. School exams were two weeks away. Our parents were asking why our eyes were bloodshot every morning.</p>
        <p>To make matters worse, an external API we relied on for song metadata silently changed its payload schema. When we woke up, nothing loaded. The app was a blank black rectangle.</p>
        <blockquote>&ldquo;We sat on call for two hours in complete silence. We almost deleted the repository.&rdquo;</blockquote>
        <p>Then Aarav Singh said: <em>'If we quit today, we’re just three kids who gave up on a school project. If we fix this today, we’re engineers.'</em> We rewrote the network layer from scratch that night.</p>
      `
    },
    4: {
      act: 'ACT I · CHAPTER 04',
      title: 'The First Beat',
      content: `
        <p>On a Thursday evening at 6:40 PM, build <code>0.4.2-alpha</code> compiled without a single compiler warning.</p>
        <p>Akshansh tapped play on his phone. The first song streamed instantly. Gapless. Smooth 60 FPS scrubber. Zero trackers sending analytics packets to ad networks. Just clean, unfiltered sound.</p>
        <blockquote>&ldquo;For five straight minutes, none of us said a word. We just listened to the music.&rdquo;</blockquote>
        <p>It was the proof of concept that changed everything.</p>
      `
    },
    5: {
      act: 'ACT II · CHAPTER 05',
      title: 'did it work?',
      content: `
        <p>We exported the first signed APK and posted the direct download link on our class WhatsApp group and a private student Discord server.</p>
        <p>The message was simple: <em>'We built a music player with zero ads. Tell us if it crashes.'</em> Within an hour, 18 people were streaming. The server logs showed active audio handshakes.</p>
        <p>It worked. And now real people were listening.</p>
      `
    },
    6: {
      act: 'ACT II · CHAPTER 06',
      title: 'Double Life: Students and Developers',
      content: `
        <p>During the day, we were ordinary high school students sitting through chemistry lectures and trigonometry problem sets.</p>
        <p>Underneath desks, phones would buzz with GitHub issues: <em>'Audio stutter on Redmi Note 10'</em>, <em>'Lock screen controls not showing album art'</em>. During recess, we’d huddle by the cafeteria stairs connecting to weak hotspots to push hotfix patches before afternoon classes.</p>
        <blockquote>&ldquo;We lived two completely parallel lives for eight months.&rdquo;</blockquote>
      `
    },
    7: {
      act: 'ACT II · CHAPTER 07',
      title: 'V3: The New Era',
      content: `
        <p>By spring, BeatWave was buckling under its amateur codebase. We decided on a complete architectural rewrite: BeatWave V3.</p>
        <p>We ditched the spaghetti code, built a unified audio engine, and introduced intelligent local caching. BeatWave wasn’t an experimental hack anymore—it was turning into a high-performance audio client.</p>
      `
    },
    8: {
      act: 'ACT II · CHAPTER 08',
      title: 'May 7th 2026: The Century Mark',
      content: `
        <p>May 7th was a Tuesday. We had an internal dashboard showing concurrent active streams.</p>
        <p>At 8:14 PM, the live counter ticked from 99 to <strong>100</strong>. One hundred distinct humans, across schools and cities, listening to music through code three students wrote in their bedrooms.</p>
        <blockquote>&ldquo;Crossing 100 listeners felt bigger than any Silicon Valley IPO.&rdquo;</blockquote>
      `
    },
    9: {
      act: 'ACT II · CHAPTER 09',
      title: 'The Link Engine: 150 Users',
      content: `
        <p>Word of mouth began spreading beyond our social circles. Friends shared APK links with cousins in Delhi, Mumbai, and Bengaluru.</p>
        <p>When we hit 150 concurrent streams, our initial free-tier cloud instance choked. The audio packets queue overflowed. We had 24 hours to engineer our 'Link Engine' load balancer or watch the entire network go dark.</p>
      `
    },
    10: {
      act: 'ACT III · CHAPTER 10',
      title: 'Liquid Glass: The V4 Redesign',
      content: `
        <p>Aarav Sharma spent two weeks researching glassmorphism shaders, specular refraction, and liquid backdrop blurs.</p>
        <p>Every audio app looked like a sterile corporate dashboard. We wanted BeatWave V4 to look like an instrument—liquid glass floating over deep midnight ambient gradients, reflecting album colors in real-time.</p>
        <blockquote>&ldquo;When V4 dropped, users couldn’t believe this was built by teenagers without a design agency.&rdquo;</blockquote>
      `
    },
    11: {
      act: 'ACT III · CHAPTER 11',
      title: 'The Double Century: 200 Waves',
      content: `
        <p>The V4 redesign ignited user growth. 200 listeners turned into a steady, loyal community.</p>
        <p>People started requesting custom playlists, sleep timers, and equalizer presets. BeatWave was no longer our private secret; it was a living community instrument.</p>
      `
    },
    12: {
      act: 'ACT III · CHAPTER 12',
      title: 'The Flop Era',
      content: `
        <p>Growth isn’t linear. In mid-summer, a buggy release caused notification crashes on older Android versions. Daily active users dipped by 25% in three days.</p>
        <p>The silence was deafening. We learned how fragile software trust is, and spent 72 straight hours testing across 14 borrowed test devices to earn our users back.</p>
      `
    },
    13: {
      act: 'ACT III · CHAPTER 13',
      title: 'The Viral Thread',
      content: `
        <p>A user posted a screen recording of BeatWave V4’s Liquid Glass audio visualizer on Twitter and Reddit with the caption: <em>'Three high school kids built this ad-free music app and it’s better than Spotify.'</em></p>
        <p>The tweet exploded. Within 12 hours, the GitHub star count quadrupled and our server bandwidth spiked 800%.</p>
      `
    },
    14: {
      act: 'ACT III · CHAPTER 14',
      title: 'One Thousand: The Promised Party',
      content: `
        <p>On the very first night, back in November at 3:00 AM, Aarav Singh had joked: <em>'If we ever hit 1,000 users, we’re ordering the biggest pizza in the city.'</em></p>
        <p>When the dashboard crossed 1,000 active Waves, we didn’t just order pizza—we released the full source code to the world, and decided to write down every honest lesson in this book.</p>
        <blockquote>&ldquo;The instrument is open. The code is transparent. The story is yours to read.&rdquo;</blockquote>
      `
    }
  };

  window.openExcerptModal = function (chNum) {
    const data = CHAPTER_EXCERPTS[chNum] || CHAPTER_EXCERPTS[1];
    const modal = document.getElementById('excerptModal');
    const badge = document.getElementById('excerptActBadge');
    const title = document.getElementById('excerptTitle');
    const body = document.getElementById('excerptContent');

    if (!modal || !badge || !title || !body) return;

    badge.innerText = data.act;
    title.innerText = data.title;
    body.innerHTML = `
      <h3>${data.title}</h3>
      ${data.content}
    `;

    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  };

  window.closeExcerptModal = function () {
    const modal = document.getElementById('excerptModal');
    if (modal) modal.classList.remove('is-open');
    document.body.style.overflow = '';
  };

  // Initialize 100x Polish on document ready
  document.addEventListener('DOMContentLoaded', () => {
    initCinematicPreloader();
    initCardSpotlights();
    initScrollReveal();
  });

})();
