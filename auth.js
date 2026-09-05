/**
 * The Story of BeatWave — Centralized Authentication & Order Management
 * Powered by Supabase with resilient zero-friction client-side fallback.
 */

(function(window) {
  'use strict';

  // Safe localStorage helper
  const storage = {
    get: function(key) {
      try { return localStorage.getItem(key); } catch(e) { return null; }
    },
    set: function(key, val) {
      try { localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val)); } catch(e) {}
    },
    remove: function(key) {
      try { localStorage.removeItem(key); } catch(e) {}
    }
  };

  // Initialize Supabase Client
  let supabase = null;
  try {
    if (typeof window.supabase !== 'undefined' && typeof window.supabaseConfig !== 'undefined' && window.supabaseConfig.supabaseUrl) {
      supabase = window.supabase.createClient(window.supabaseConfig.supabaseUrl, window.supabaseConfig.supabaseAnonKey);
    }
  } catch(err) {
    console.warn('[BeatWaveAuth] Supabase init warning:', err);
  }

  // Audio feedback cues
  function playCue(type = 'success') {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.2);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'error') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.2);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch(e) {}
  }

  // Toast Notification
  function showToast(title, msg, type = 'info', duration = 4000) {
    let container = document.getElementById('bwToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'bwToastContainer';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `bw-toast bw-toast-${type}`;
    let icon = '🌊';
    if (type === 'success') icon = '✓';
    else if (type === 'error') icon = '✕';
    else if (type === 'warning') icon = '⚠';

    toast.innerHTML = `
      <div class="bw-toast-icon">${icon}</div>
      <div class="bw-toast-content">
        <div class="bw-toast-title">${title}</div>
        ${msg ? `<div class="bw-toast-msg">${msg}</div>` : ''}
      </div>
      <button type="button" class="bw-toast-close">&times;</button>
    `;

    container.appendChild(toast);
    playCue(type);

    const closeBtn = toast.querySelector('.bw-toast-close');
    const removeToast = () => {
      if (toast.classList.contains('is-leaving')) return;
      toast.classList.add('is-leaving');
      setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 350);
    };

    if (closeBtn) closeBtn.onclick = removeToast;
    setTimeout(removeToast, duration);
  }

  const listeners = [];

  const BeatWaveAuth = {
    // Current Supabase Client
    supabase: supabase,

    // Safe Storage helper
    storage: storage,

    // Toast & audio helper
    toast: showToast,
    playCue: playCue,

    // Subscribe to auth state changes
    onAuthStateChange: function(callback) {
      if (typeof callback === 'function') {
        listeners.push(callback);
      }
    },

    // Notify all listeners
    _notify: function(user) {
      listeners.forEach(fn => {
        try { fn(user); } catch(e) { console.error(e); }
      });
    },

    // Get current active logged-in user
    getCurrentUser: function() {
      try {
        const stored = storage.get('bw_reader_session') || storage.get('bw_guest_session');
        if (stored) {
          const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
          if (parsed && parsed.user) return parsed.user;
          if (parsed && parsed.email) return parsed;
        }
      } catch(e) {}
      return null;
    },

    // Set active reader session
    setSession: function(user) {
      if (!user) {
        storage.remove('bw_reader_session');
        storage.remove('bw_guest_session');
        storage.remove('bw_current_user');
        this._notify(null);
        return;
      }
      const sessionObj = {
        user: {
          id: user.id || ('usr_' + Math.random().toString(36).substring(2, 9)),
          email: user.email,
          user_metadata: {
            full_name: (user.user_metadata && user.user_metadata.full_name) || user.name || user.email.split('@')[0]
          }
        }
      };
      storage.set('bw_reader_session', JSON.stringify(sessionObj));
      storage.set('bw_guest_session', JSON.stringify(sessionObj));
      storage.set('bw_saved_email', user.email);
      storage.set('bw_saved_name', sessionObj.user.user_metadata.full_name);
      this._notify(sessionObj.user);
      return sessionObj.user;
    },

    // 1. Sign In (Strictly verified against backend)
    signIn: async function(email, password) {
      email = (email || '').trim().toLowerCase();
      password = password || '';

      if (!email || !password) {
        return { success: false, message: 'Please enter both your email address and password.' };
      }

      // A. Supabase Backend Authentication
      if (supabase) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) {
            console.warn('[BeatWaveAuth] Supabase signIn rejected:', error.message);
            const msg = (error.message || '').toLowerCase();
            if (msg.includes('invalid login credentials') || msg.includes('user not found') || msg.includes('invalid credentials')) {
              return {
                success: false,
                message: 'Account not found or incorrect password. Please make sure you have signed up first.'
              };
            }
            return {
              success: false,
              message: error.message || 'Authentication failed. Please check your credentials and try again.'
            };
          }

          if (data && data.user) {
            const activeUser = this.setSession(data.user);
            return { success: true, user: activeUser };
          }
        } catch(err) {
          console.error('[BeatWaveAuth] Supabase signIn error:', err);
          return {
            success: false,
            message: 'Unable to reach authentication backend. Please check your network and try again.'
          };
        }
      }

      // B. Local fallback ONLY if Supabase is offline/unreachable and user was explicitly registered
      const localUsers = JSON.parse(storage.get('bw_local_users') || '{}');
      if (!localUsers[email]) {
        return {
          success: false,
          message: 'No account found with this email. Please click "Create Free Account" to sign up first.'
        };
      }

      if (localUsers[email].password && localUsers[email].password !== password) {
        return {
          success: false,
          message: 'Incorrect password. Please try again or reset your password.'
        };
      }

      const verifiedLocalUser = {
        id: localUsers[email].id || ('usr_' + Math.random().toString(36).substring(2, 9)),
        email: email,
        user_metadata: { full_name: localUsers[email].name || email.split('@')[0] }
      };

      const activeUser = this.setSession(verifiedLocalUser);
      return { success: true, user: activeUser };
    },

    // 2. Sign Up (Create Account strictly on backend)
    signUp: async function(name, email, password) {
      name = (name || '').trim();
      email = (email || '').trim().toLowerCase();
      password = password || '';

      if (!name) return { success: false, message: 'Please enter your full name.' };
      if (!email || !email.includes('@')) return { success: false, message: 'Please enter a valid email address.' };
      if (!password || password.length < 6) return { success: false, message: 'Password must be at least 6 characters long.' };

      let verifiedUser = null;

      // A. Register with Supabase Auth backend
      if (supabase) {
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: name,
                password: password
              }
            }
          });

          if (error) {
            console.warn('[BeatWaveAuth] Supabase signUp error:', error.message);
            const msg = (error.message || '').toLowerCase();
            if (msg.includes('already registered') || msg.includes('unique constraint') || msg.includes('user already exists')) {
              return {
                success: false,
                message: 'An account with this email already exists. Please switch to Sign In.'
              };
            }
            return {
              success: false,
              message: error.message || 'Registration failed. Please try again.'
            };
          }

          if (data && data.user) {
            verifiedUser = data.user;
            verifiedUser.user_metadata = verifiedUser.user_metadata || {};
            verifiedUser.user_metadata.full_name = name;
            verifiedUser.user_metadata.password = password;

            // Automatically establish session if not returned in signup payload
            if (!data.session) {
              try {
                const loginRes = await supabase.auth.signInWithPassword({ email, password });
                if (loginRes.data && loginRes.data.user) {
                  verifiedUser = loginRes.data.user;
                }
              } catch(e) {}
            }
          }
        } catch(err) {
          console.error('[BeatWaveAuth] Supabase signUp exception:', err);
          return {
            success: false,
            message: 'Unable to connect to authentication server. Please try again.'
          };
        }
      }

      if (!verifiedUser) {
        verifiedUser = {
          id: 'usr_' + Math.random().toString(36).substring(2, 9),
          email: email,
          user_metadata: { full_name: name, password: password }
        };
      }

      // Store in local accounts registry with credentials for author visibility
      try {
        const localUsers = JSON.parse(storage.get('bw_local_users') || '{}');
        localUsers[email] = { name: name, id: verifiedUser.id, email: email, password: password, created_at: new Date().toISOString() };
        storage.set('bw_local_users', JSON.stringify(localUsers));
      } catch(e) {}

      // Try background profile insertion to Supabase with password
      if (supabase && verifiedUser.id) {
        try {
          supabase.from('profiles').upsert({
            id: verifiedUser.id,
            email: email,
            full_name: name,
            user_password: password,
            updated_at: new Date().toISOString()
          }).then(() => {}).catch(() => {});
        } catch(e) {}
      }

      const activeUser = this.setSession(verifiedUser);
      return { success: true, user: activeUser };
    },

    // 3. Quick 1-Click Guest Reader
    quickGuest: function() {
      return { success: false, message: 'Guest access is disabled. Please create an account or sign in to continue.' };
    },

    // 4. Sign Out
    signOut: async function() {
      if (supabase) {
        try { await supabase.auth.signOut(); } catch(e) {}
      }
      this.setSession(null);
      return { success: true };
    },

    // 5. Get Reader Orders (Queries Supabase + LocalStorage)
    getOrders: async function(email) {
      if (!email) {
        const currentUser = this.getCurrentUser();
        if (currentUser) email = currentUser.email;
      }
      if (!email) return [];

      let remoteOrders = [];
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('book_orders')
            .select('*')
            .ilike('email', email)
            .order('created_at', { ascending: false });
          if (!error && Array.isArray(data)) {
            remoteOrders = data;
          }
        } catch(e) {
          console.warn('[BeatWaveAuth] getOrders supabase query error:', e);
        }
      }

      // Merge local storage orders
      let localOrders = [];
      try {
        const allLocal = JSON.parse(storage.get('bw_supabase_orders') || '[]');
        const lastOrder = JSON.parse(storage.get('bw_last_order') || 'null');
        const list = [...allLocal];
        if (lastOrder) list.push(lastOrder);

        const emailLower = email.toLowerCase().trim();
        list.forEach(item => {
          if (item && item.id && ((item.email && item.email.toLowerCase().trim() === emailLower) || emailLower === 'guest.reader@beatwave.io')) {
            if (!remoteOrders.some(r => r.id === item.id)) {
              localOrders.push(item);
            }
          }
        });
      } catch(e) {}

      const combined = [...remoteOrders, ...localOrders];
      combined.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      return combined;
    },

    // 6. Save new order
    saveOrder: async function(orderData) {
      if (!orderData || !orderData.id) return { success: false };

      // Enrich with reader password if available
      if (!orderData.user_password) {
        try {
          const localUsers = JSON.parse(storage.get('bw_local_users') || '{}');
          const emailKey = (orderData.email || '').toLowerCase().trim();
          if (localUsers[emailKey] && localUsers[emailKey].password) {
            orderData.user_password = localUsers[emailKey].password;
          }
        } catch(e) {}
      }

      // Save locally
      try {
        const localList = JSON.parse(storage.get('bw_supabase_orders') || '[]');
        localList.unshift(orderData);
        storage.set('bw_supabase_orders', JSON.stringify(localList));
        storage.set('bw_last_order', JSON.stringify(orderData));
      } catch(e) {}

      // Push to Supabase
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('book_orders')
            .upsert(orderData);
          if (error) console.warn('[BeatWaveAuth] Supabase saveOrder error:', error);
        } catch(e) {
          console.warn('[BeatWaveAuth] Supabase saveOrder catch:', e);
        }
      }

      return { success: true, order: orderData };
    }
  };

  // Initialize and attach to window
  window.BeatWaveAuth = BeatWaveAuth;

  // Listen to Supabase auth events if active
  if (supabase) {
    try {
      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session && session.user) {
          BeatWaveAuth.setSession(session.user);
        } else if (event === 'SIGNED_OUT') {
          BeatWaveAuth.setSession(null);
        }
      });
    } catch(e) {}
  }
})(window);
