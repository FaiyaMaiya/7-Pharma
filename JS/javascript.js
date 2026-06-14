/* JS: add to your script area (after DOM elements) */

  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileClose = document.getElementById('mobileClose');

  function openMobileMenu(){
    if(!mobileMenu) return;
    mobileMenu.style.display = 'flex';
    mobileMenu.setAttribute('aria-hidden','false');
    hamburgerBtn.setAttribute('aria-expanded','true');
    mobileClose && mobileClose.focus();
    document.body.style.overflow = 'hidden';
    // Ensure UI is updated when menu opens
    checkAuthUI();
  }

  function closeMobileMenu(){
    if(!mobileMenu) return;
    mobileMenu.style.display = 'none';
    mobileMenu.setAttribute('aria-hidden','true');
    hamburgerBtn.setAttribute('aria-expanded','false');
    hamburgerBtn && hamburgerBtn.focus();
    document.body.style.overflow = '';
  }

  hamburgerBtn && hamburgerBtn.addEventListener('click', openMobileMenu);
  mobileClose && mobileClose.addEventListener('click', closeMobileMenu);

  mobileMenu && mobileMenu.addEventListener('click', (e) => {
    if(e.target === mobileMenu) closeMobileMenu();
  });

    document.addEventListener('keydown', (e) => {
      if(e.key === 'Escape' && mobileMenu && mobileMenu.style.display === 'flex') closeMobileMenu();
    });
   
   // Chat functionality
   let currentChatSessionId = null;
   let chatPollingInterval = null;
   
   function openChat() {
      const chatDropdown = document.getElementById('chat-dropdown');
      if (!chatDropdown) return;
     
     const isOpen = chatDropdown.style.display === 'block';
     if (isOpen) {
       closeChatDropdown();
     } else {
       openChatDropdown();
     }
   }
   
    function closeChatDropdown() {
       const chatDropdown = document.getElementById('chat-dropdown');
       if (!chatDropdown) return;
       stopChatPolling();
       chatDropdown.style.display = 'none';
      chatDropdown.style.top = '';
      chatDropdown.style.right = '';
      chatDropdown.style.left = '';
      chatDropdown.style.bottom = '';
      chatDropdown.style.borderRadius = '';
       chatDropdown.style.position = '';
       chatDropdown.style.width = '';
       chatDropdown.style.height = '';
       chatDropdown.style.zIndex = '';
      chatDropdown.setAttribute('aria-hidden', 'true');
     const chatBtn = document.getElementById('chat-btn');
     if (chatBtn) chatBtn.setAttribute('aria-expanded', 'false');
   }
   
   function toggleChatDropdown() {
     const chatDropdown = document.getElementById('chat-dropdown');
     if (!chatDropdown) return;
     const isOpen = chatDropdown.style.display === 'block';
     if (isOpen) {
       closeChatDropdown();
     } else {
       openChatDropdown();
     }
   }
  
   function openChatDropdown() {
      const chatDropdown = document.getElementById('chat-dropdown');
      if (!chatDropdown) return;
     
     // Clear notification when opening
     const notification = document.getElementById('chat-notification');
     if (notification) notification.textContent = '0';
     
      chatDropdown.style.display = 'block';
      chatDropdown.setAttribute('aria-hidden', 'false');
      
      if (window.innerWidth <= 420) {
        chatDropdown.style.position = 'fixed';
        chatDropdown.style.top = '0';
        chatDropdown.style.left = '0';
        chatDropdown.style.right = '0';
        chatDropdown.style.bottom = '0';
        chatDropdown.style.width = '100%';
        chatDropdown.style.height = '100%';
        chatDropdown.style.borderRadius = '0';
        chatDropdown.style.zIndex = '1001';
      } else {
        chatDropdown.style.position = '';
        chatDropdown.style.top = '';
        chatDropdown.style.left = '';
        chatDropdown.style.right = '';
        chatDropdown.style.bottom = '';
        chatDropdown.style.width = '';
        chatDropdown.style.height = '';
        chatDropdown.style.borderRadius = '';
        chatDropdown.style.zIndex = '';
      }
      
      const chatBtn = document.getElementById('chat-btn');
      if (chatBtn) {
        chatBtn.setAttribute('aria-expanded', 'true');
      }
     
     // Load chat interface
     loadChatInterface();
   }
   
   function loadChatInterface() {
     const chatDropdown = document.getElementById('chat-dropdown');
     if (!chatDropdown) return;
     
     // If we have an active chat session, load it
     if (currentChatSessionId) {
       loadChatMessagesForSession(currentChatSessionId);
       startChatPolling(currentChatSessionId);
     } else {
       // Show instructions to start a chat
       chatDropdown.innerHTML = `
         <div style="padding: 16px; text-align: center; color: #666;">
           <p>Start a chat by:</p>
           <ul style="text-align: left; display: inline-block;">
             <li>Adding items to your cart</li>
             <li>Generating a proforma invoice</li>
             <li>Uploading payment proof</li>
           </ul>
           <p style="margin-top: 12px; font-size: 0.9em;">Once you have a payment pending approval, you can chat with admin support.</p>
         </div>
       `;
     }
   }
   
   function loadChatMessagesForSession(paymentId) {
     if (!useBackend) {
       // Demo mode - show simulated messages
       const chatDropdown = document.getElementById('chat-dropdown');
       if (!chatDropdown) return;
       
       chatDropdown.innerHTML = `
         <div style="height: 200px; overflow-y: auto; margin-bottom: 12px; border: 1px solid #eee; border-radius: 4px; padding: 8px;">
           <div id="chat-messages-demo" style="display: flex; flex-direction: column;">
             <div style="margin: 8px 0; padding: 8px 12px; background: #f8f9fa; border-radius: 12px; max-width: 80%; margin-left: auto; text-align: center; font-style: italic; color: #6c757d;">
               <div>Welcome to 7 Pharmaceuticals support!</div>
               <div style="font-size: 0.75rem; opacity: 0.7; margin-top: 4px;">${new Date().toLocaleTimeString()}</div>
             </div>
             <div style="margin: 8px 0; padding: 8px 12px; background: #007bff; color: white; border-radius: 12px; max-width: 80%; margin-left: auto; border-bottom-right-radius: 4px;">
               <div>I've uploaded my payment proof. Please verify when you can.</div>
               <div style="font-size: 0.75rem; opacity: 0.7; margin-top: 4px;">${new Date().toLocaleTimeString()}</div>
             </div>
           </div>
         </div>
         <div style="display: flex; gap: 8px;">
           <input type="text" id="chat-input-demo" placeholder="Type a message..." style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
           <button id="chat-send-demo" class="confirm-btn confirm" onclick="sendDemoChatMessage()">Send</button>
         </div>
       `;
       
       // Add event listener for Enter key
       document.addEventListener('keydown', function handleDemoChatEnter(e) {
         if (e.key === 'Enter' && 
             document.activeElement && 
             document.activeElement.id === 'chat-input-demo') {
           e.preventDefault();
           sendDemoChatMessage();
         }
       });
} else {
        // Real backend mode
        fetch(`/api/user/chat/${paymentId}`, {
          headers: { 'X-Session-Id': getSessionId() }
        })
       .then(response => response.json())
       .then(data => {
         displayChatMessages(data.messages || [], paymentId);
       })
       .catch(error => {
         console.error('Failed to load chat messages:', error);
         const chatDropdown = document.getElementById('chat-dropdown');
         if (chatDropdown) {
           chatDropdown.innerHTML = `<p style="padding: 16px; color: #e74c3c;">Error loading chat. Please try again.</p>`;
         }
       });
     }
   }
   
   function startChatPolling(paymentId) {
     // Clear any existing polling
     if (chatPollingInterval) {
       clearInterval(chatPollingInterval);
     }
     
     // Poll for new messages every 5 seconds
     chatPollingInterval = setInterval(() => {
       loadChatMessagesForSession(paymentId);
     }, 5000);
   }
   
   function stopChatPolling() {
     if (chatPollingInterval) {
       clearInterval(chatPollingInterval);
       chatPollingInterval = null;
     }
   }
   
   function displayChatMessages(messages, paymentId) {
     const chatDropdown = document.getElementById('chat-dropdown');
     if (!chatDropdown) return;
     
     chatDropdown.innerHTML = `
       <div style="height: 200px; overflow-y: auto; margin-bottom: 12px; border: 1px solid #eee; border-radius: 4px; padding: 8px;">
         <div id="chat-messages-${paymentId}" style="display: flex; flex-direction: column;"></div>
       </div>
       <div style="display: flex; gap: 8px;">
         <input type="text" id="chat-input-${paymentId}" placeholder="Type a message..." style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
         <button id="chat-send-${paymentId}" class="confirm-btn confirm" onclick="sendChatMessage('${paymentId}')">Send</button>
       </div>
     `;
     
     // Add messages to the container
     const messagesContainer = document.getElementById(`chat-messages-${paymentId}`);
     if (!messagesContainer) return;
     
     messages.forEach(msg => {
       const messageDiv = document.createElement('div');
       messageDiv.style.margin = '8px 0';
       messageDiv.style.padding = '8px 12px';
       messageDiv.style.borderRadius = '12px';
       messageDiv.style.maxWidth = '80%';
       
       if (msg.from === 'user') {
         messageDiv.style.backgroundColor = '#007bff';
         messageDiv.style.color = 'white';
         messageDiv.style.marginLeft = 'auto';
         messageDiv.style.borderBottomRightRadius = '4px';
       } else if (msg.from === 'admin') {
         messageDiv.style.backgroundColor = '#28a745';
         messageDiv.style.color = 'white';
         messageDiv.style.marginRight = 'auto';
         messageDiv.style.borderBottomLeftRadius = '4px';
       } else {
         // system messages
         messageDiv.style.backgroundColor = '#f8f9fa';
         messageDiv.style.color = '#6c757d';
         messageDiv.style.margin = '0 auto';
         messageDiv.style.textAlign = 'center';
         messageDiv.style.fontStyle = 'italic';
       }
       
       messageDiv.innerHTML = `
         <div>${msg.text}</div>
         <div style="font-size:0.75rem; opacity:0.7; margin-top:4px;">
           ${new Date(msg.timestamp).toLocaleTimeString()}
         </div>
       `;
       
       messagesContainer.appendChild(messageDiv);
     });
     
     // Scroll to bottom
     if (messagesContainer) {
       messagesContainer.scrollTop = messagesContainer.scrollHeight;
     }
     
     // Add event listener for Enter key
     const chatInput = document.getElementById(`chat-input-${paymentId}`);
     if (chatInput) {
       chatInput.addEventListener('keydown', function handleChatEnter(e) {
         if (e.key === 'Enter') {
           e.preventDefault();
           sendChatMessage(paymentId);
         }
       });
     }
   }
   
   function sendChatMessage(paymentId) {
     const chatInput = document.getElementById(`chat-input-${paymentId}`);
     if (!chatInput) return;
     
     const text = chatInput.value.trim();
     if (!text) return;
     
     if (!useBackend) {
       // Demo mode
       sendDemoChatMessage();
       return;
     }
     
fetch(`/api/user/chat/${paymentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': getSessionId()
        },
        body: JSON.stringify({ text })
      })
     .then(response => response.json())
     .then(data => {
       if (data.success) {
         chatInput.value = '';
         // Re-load messages to show the sent message
         loadChatMessagesForSession(paymentId);
       }
     })
     .catch(error => {
       console.error('Failed to send chat message:', error);
     });
   }
   
   function sendDemoChatMessage() {
     const chatInput = document.getElementById('chat-input-demo');
     if (!chatInput) return;
     
     const text = chatInput.value.trim();
     if (!text) return;
     
     const chatMessagesDemo = document.getElementById('chat-messages-demo');
     if (!chatMessagesDemo) return;
     
     // Add user message
     const userMessageDiv = document.createElement('div');
     userMessageDiv.style.margin = '8px 0';
     userMessageDiv.style.padding = '8px 12px';
     userMessageDiv.style.backgroundColor = '#007bff';
     userMessageDiv.style.color = 'white';
     userMessageDiv.style.borderRadius = '12px';
     userMessageDiv.style.maxWidth = '80%';
     userMessageDiv.style.marginLeft = 'auto';
     userMessageDiv.style.borderBottomRightRadius = '4px';
     
     userMessageDiv.innerHTML = `
       <div>${text}</div>
       <div style="font-size:0.75rem; opacity:0.7; margin-top:4px;">
         ${new Date().toLocaleTimeString()}
       </div>
     `;
     
     chatMessagesDemo.appendChild(userMessageDiv);
     
     // Simulate admin response after a short delay
     setTimeout(() => {
       const adminMessageDiv = document.createElement('div');
       adminMessageDiv.style.margin = '8px 0';
       adminMessageDiv.style.padding = '8px 12px';
       adminMessageDiv.style.backgroundColor = '#28a745';
       adminMessageDiv.style.color = 'white';
       adminMessageDiv.style.borderRadius = '12px';
       adminMessageDiv.style.maxWidth = '80%';
       adminMessageDiv.style.marginRight = 'auto';
       adminMessageDiv.style.borderBottomLeftRadius = '4px';
       
       adminMessageDiv.innerHTML = `
         <div>Thank you for your payment! I'm verifying it now.</div>
         <div style="font-size:0.75rem; opacity:0.7; margin-top:4px;">
           ${new Date().toLocaleTimeString()}
         </div>
       `;
       
       chatMessagesDemo.appendChild(adminMessageDiv);
       chatMessagesDemo.scrollTop = chatMessagesDemo.scrollHeight;
     }, 1500);
     
     chatInput.value = '';
   }
   
   function setActiveChatSession(paymentId) {
     // Stop polling for previous session
     stopChatPolling();
     
     // Set new active session
     currentChatSessionId = paymentId;
     
     // Update notification if chat is open
     const chatDropdown = document.getElementById('chat-dropdown');
     if (chatDropdown && chatDropdown.style.display === 'block') {
       loadChatMessagesForSession(paymentId);
       startChatPolling(paymentId);
     } else {
      // Update notification badge
        const notification = document.getElementById('chat-notification');
        if (notification) {
          const current = parseInt(notification.textContent || '0', 10) || 0;
          notification.textContent = String(current + 1);
          notification.style.display = 'inline-block';
        }
     }
   }
   
   function clearChatSession() {
     stopChatPolling();
     currentChatSessionId = null;
     
     // Clear notification
     const notification = document.getElementById('chat-notification');
     if (notification) {
       notification.textContent = '0';
       notification.style.display = 'none';
     }
     
     // Reset chat dropdown if open
     const chatDropdown = document.getElementById('chat-dropdown');
     if (chatDropdown && chatDropdown.style.display === 'block') {
       loadChatInterface();
     }
   }
   
// Add event listener for chat button
    document.addEventListener('DOMContentLoaded', () => {
      // ... existing code ...
      
      // Chat button handler
      const chatBtn = document.getElementById('chat-btn');
      if (chatBtn) {
        chatBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openChat();
        });
      }
      
      // Close chat dropdown when clicking outside
      document.addEventListener('click', (e) => {
        const chatDropdown = document.getElementById('chat-dropdown');
        const chatBtn = document.getElementById('chat-btn');
      if (chatDropdown && 
          (!chatBtn || !chatBtn.contains(e.target)) && 
          !chatDropdown.contains(e.target)) {
          closeChatDropdown();
        }
      });
    });

// Expose functions globally for inline onclick handlers
window.openMobileMenu = openMobileMenu;
window.closeMobileMenu = closeMobileMenu;
window.toggleChatDropdown = toggleChatDropdown;
window.openChat = openChat;
window.closeChatDropdown = closeChatDropdown;
window.performMobileSearch = performMobileSearch;
window.addToCart = addToCart;
window.generateInvoice = generateInvoice;
window.checkout = checkout;
window.logout = logout;
window.showLoginPrompt = showLoginPrompt;
window.socialLogin = socialLogin;
window.socialAuth = socialAuth;
window.closeLoginPromptModal = closeLoginPromptModal;
window.checkAuthUI = checkAuthUI;

  function performMobileSearch(){
    const mobileQuery = document.getElementById('mobile-search-bar')?.value || '';
    const mainSearch = document.getElementById('search-bar');
    if (mainSearch) mainSearch.value = mobileQuery;

    const mobileCategory = document.getElementById('mobile-category-filter')?.value || '';
    const mainCategory = document.getElementById('category-filter');
    if (mainCategory) mainCategory.value = mobileCategory;

    const mobileMin = document.getElementById('mobile-min-price')?.value || '';
    const mobileMax = document.getElementById('mobile-max-price')?.value || '';
    const mainMin = document.getElementById('min-price');
    const mainMax = document.getElementById('max-price');
    if (mainMin) mainMin.value = mobileMin;
    if (mainMax) mainMax.value = mobileMax;

    const mobileSortBy = document.getElementById('mobile-sort-by')?.value || 'relevance';
    const mainSortBy = document.getElementById('sort-by');
    if (mainSortBy) mainSortBy.value = mobileSortBy;

    performSearch();
    closeMobileMenu();
  }

  const mainSearchInput = document.getElementById('search-bar');
  const mobileSearchInput = document.getElementById('mobile-search-bar');
  if(mainSearchInput && mobileSearchInput){
    const handleSearchInput = () => {
      performSearch();
    };
    mainSearchInput.addEventListener('input', () => {
      mobileSearchInput.value = mainSearchInput.value;
      handleSearchInput();
    });
    mobileSearchInput.addEventListener('input', () => {
      mainSearchInput.value = mobileSearchInput.value;
      handleSearchInput();
    });
  }
  const mainCategory = document.getElementById('category-filter');
  const mobileCategory = document.getElementById('mobile-category-filter');
  if(mainCategory && mobileCategory){
    const handleCategoryChange = () => performSearch();
    mainCategory.addEventListener('change', () => { mobileCategory.value = mainCategory.value; handleCategoryChange(); });
    mobileCategory.addEventListener('change', () => { mainCategory.value = mobileCategory.value; handleCategoryChange(); });
  }

  const mainMinPrice = document.getElementById('min-price');
  const mainMaxPrice = document.getElementById('max-price');
  const mobileMinPrice = document.getElementById('mobile-min-price');
  const mobileMaxPrice = document.getElementById('mobile-max-price');
  if (mainMinPrice && mobileMinPrice) {
    mainMinPrice.addEventListener('input', () => { mobileMinPrice.value = mainMinPrice.value; performSearch(); });
    mobileMinPrice.addEventListener('input', () => { mainMinPrice.value = mobileMinPrice.value; performSearch(); });
  }
  if (mainMaxPrice && mobileMaxPrice) {
    mainMaxPrice.addEventListener('input', () => { mobileMaxPrice.value = mainMaxPrice.value; performSearch(); });
    mobileMaxPrice.addEventListener('input', () => { mainMaxPrice.value = mobileMaxPrice.value; performSearch(); });
  }

  const mainSortBy = document.getElementById('sort-by');
  const mobileSortBy = document.getElementById('mobile-sort-by');
  if (mainSortBy && mobileSortBy) {
    mainSortBy.addEventListener('change', () => { mobileSortBy.value = mainSortBy.value; performSearch(); });
    mobileSortBy.addEventListener('change', () => { mainSortBy.value = mobileSortBy.value; performSearch(); });
  }

// Products and cart state
let allProducts = [];
let cartItems = 0;
const cart = {};
const sessionKey = '7pharma_session_id';
let proformaGenerated = false;
const proformaStorageKey = '7pharma_proforma_data';
const cartStorageKey = '7pharma_cart_data';
let useBackend = false;
let sessionId = null;
let currentUser = null;

// Authentication functions
function getCurrentUser() {
  return currentUser;
}

function isAuthenticated() {
  return !!currentUser;
}

function getSessionId() {
  sessionId = localStorage.getItem(sessionKey);
  if (!sessionId) {
    sessionId = `session_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    localStorage.setItem(sessionKey, sessionId);
  }
  return sessionId;
}

async function checkSession() {
  if (!useBackend) return false;
  
  try {
    const response = await fetch('/api/auth/session', {
      headers: { 'X-Session-Id': getSessionId() }
    });
    const data = await response.json();
    
    if (data.authenticated) {
      currentUser = data.user;
      localStorage.setItem('auth_token', data.user?.token || '');
      localStorage.setItem('user_role', data.user?.role || 'user');
      localStorage.setItem('username', data.user?.username || '');
      return true;
    } else {
      currentUser = null;
      localStorage.removeItem('auth_token');
      return false;
    }
  } catch (error) {
    currentUser = null;
    return false;
  }
}

async function loginWithBackend(username, password) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    
    if (data.success) {
      sessionId = data.sessionId;
      localStorage.setItem(sessionKey, sessionId);
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_role', data.role);
      localStorage.setItem('username', data.username);
      currentUser = data;
      useBackend = true;
      return { success: true, user: data };
    } else {
      return { success: false, message: data.message };
    }
  } catch (error) {
    return { success: false, message: 'Login failed. Please try again.' };
  }
}

async function socialLogin(provider) {
  // For demo purposes - generates mock social auth data
  const mockEmail = `${provider.toLowerCase()}user_${Math.random().toString(36).slice(2, 8)}@example.com`;
  const mockUsername = `${provider}${Math.random().toString(36).slice(2, 8)}`;
  
  try {
    const response = await fetch('/api/auth/social', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        provider, 
        email: mockEmail, 
        username: mockUsername
      })
    });
    const data = await response.json();
    
if (data.success) {
      sessionId = data.sessionId;
      localStorage.setItem(sessionKey, sessionId);
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_role', data.role);
      localStorage.setItem('username', data.username);
      currentUser = data;
      useBackend = true;
      checkAuthUI();
      showToast(`${provider} login successful. Welcome, ${data.username}!`);
      return { success: true, user: data };
    }
  } catch (error) {
    // Fallback to local only mode
  }
  
  // Fallback to local storage for demo
  sessionId = getSessionId();
  currentUser = { username: mockUsername, email: mockEmail, role: 'user' };
  localStorage.setItem('auth_token', 'demo_token');
  localStorage.setItem('user_role', 'user');
  localStorage.setItem('username', mockUsername);
  checkAuthUI();
  showToast(`${provider} login successful. Welcome, ${mockUsername}!`);
  return { success: true, user: currentUser };
}

  async function logout() {
    try {
      console.log('Logout function called'); // Debugging
      
      if (useBackend && sessionId) {
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'X-Session-Id': sessionId }
          });
        } catch (error) {
          console.error('Backend logout error:', error);
          // Continue with local cleanup even if backend logout fails
        }
      }
      
      // Clear state
      currentUser = null;
      sessionId = null;
      // Clear cart data
      localStorage.removeItem(cartStorageKey);
      localStorage.removeItem(proformaStorageKey);
      Object.keys(cart).forEach(key => delete cart[key]);
      proformaGenerated = false;
      updateCartCount();
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_role');
      localStorage.removeItem('username');
      localStorage.removeItem(sessionKey);
      // Close any open menus/dropdowns
      closeMobileMenu();
      closeChatDropdown();
      closeConfirmModal();
      closeLoginPromptModal();
      // Update UI to reflect guest state
      checkAuthUI();
      showToast('Logged out successfully.', 2000);
    } catch (error) {
      console.error('Unexpected error in logout function:', error);
      // Even if there's an error, try to update UI to logged out state
      try {
        currentUser = null;
        sessionId = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_role');
        localStorage.removeItem('username');
        localStorage.removeItem(sessionKey);
        checkAuthUI();
        showToast('Logged out (with errors). Please check console for details.', 3000);
      } catch (e) {
        console.error('Failed to update UI after logout error:', e);
        // Last resort - just reload the page to get to a clean state
        window.location.reload();
      }
    }
  }

function showLoginPrompt(action) {
  const actions = {
    cart: 'add items to your cart',
    invoice: 'generate a proforma invoice',
    checkout: 'checkout your order',
    payment: 'upload payment proof'
  };
  
  const actionText = actions[action] || 'perform this action';
  
  const modal = document.getElementById('login-prompt-modal');
  const actionSpan = document.getElementById('login-prompt-action');
  
  if (modal && actionSpan) {
    actionSpan.textContent = actionText;
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  } else {
    // Fallback to confirm if modal not found
    if (confirm(`You need to login to ${actionText}. Go to login page?`)) {
      window.location.href = 'login.html';
    }
  }
}

function getApiHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-Session-Id': getSessionId(),
    };
  }

  function saveCartToStorage() {
    try {
      const storedProducts = allProducts.map(product => ({ id: product.id, inventory: product.inventory }));
      localStorage.setItem(cartStorageKey, JSON.stringify({ cart, products: storedProducts }));
      localStorage.setItem(proformaStorageKey, JSON.stringify(proformaGenerated));
    } catch (error) {
      console.warn('Unable to save cart locally:', error);
    }
  }

  function loadCartFromStorage() {
    try {
      const storedJson = localStorage.getItem(cartStorageKey);
      if (storedJson) {
        const stored = JSON.parse(storedJson);
        if (stored?.cart && typeof stored.cart === 'object') {
          Object.keys(cart).forEach(key => delete cart[key]);
          Object.entries(stored.cart).forEach(([id, quantity]) => {
            cart[id] = quantity;
          });
        }
        if (stored?.products && Array.isArray(stored.products)) {
          stored.products.forEach(saved => {
            const product = allProducts.find(item => item.id === saved.id);
            if (product && typeof saved.inventory === 'number') {
              product.inventory = saved.inventory;
            }
          });
        }
        updateCartCount();
      }
      const proformaJson = localStorage.getItem(proformaStorageKey);
      if (proformaJson) {
        proformaGenerated = JSON.parse(proformaJson);
      }
    } catch (error) {
      console.warn('Unable to load local cart data:', error);
    }
  }

function socialAuth(provider) {
     socialLogin(provider);
   }

  async function fetchCartState() {
    try {
      const response = await fetch('/api/cart', { headers: getApiHeaders() });
      if (!response.ok) throw new Error('Failed to load cart state');
      const data = await response.json();
      Object.keys(cart).forEach(key => delete cart[key]);
      Object.entries(data.cart || {}).forEach(([productId, quantity]) => {
        cart[productId] = quantity;
      });
      updateCartCount();
    } catch (error) {
      console.error('Failed to fetch cart state:', error);
      loadCartFromStorage();
    }
  }

  function updateProductsFromBackend(products) {
    allProducts = products || [];
  }

  function getCartTotalItems() {
    return Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  }

  function getCartTotalAmount() {
    return Object.entries(cart).reduce((sum, [productId, quantity]) => {
      const product = allProducts.find(item => item.id === productId);
      return product ? sum + product.price * quantity : sum;
    }, 0);
  }

  function updateCartCount() {
    cartItems = getCartTotalItems();
    const desktopCount = document.getElementById('cart-count');
    const mobileCount = document.getElementById('cart-count-mobile');
    if (desktopCount) desktopCount.textContent = cartItems;
    if (mobileCount) mobileCount.textContent = cartItems;
  }

  function renderCartPanel() {
    const cartPanel = document.getElementById('cart-panel');
    const cartItemsList = document.getElementById('cart-items-list');
    const cartSummary = document.getElementById('cart-summary');
    const checkoutButton = document.getElementById('checkout-button');
    const invoiceButton = document.getElementById('invoice-button');
    if (!cartItemsList || !cartSummary || !checkoutButton || !invoiceButton) return;

    const itemCount = getCartTotalItems();
    const totalAmount = getCartTotalAmount();

    if (cartPanel) {
      const heading = cartPanel.querySelector('h2');
      if (heading) heading.textContent = itemCount ? `Shopping Cart (${itemCount} items)` : 'Shopping Cart';
    }

    if (itemCount === 0) {
      cartItemsList.innerHTML = '<p class="empty-cart">Your cart is empty. Add products to see them here.</p>';
      cartSummary.innerHTML = `
        <div class="cart-summary-row"><span>Total items:</span><strong>0</strong></div>
        <div class="cart-summary-row"><span>Total amount:</span><strong>PGK 0.00</strong></div>
      `;
      checkoutButton.disabled = true;
      invoiceButton.disabled = true;
      checkoutButton.textContent = 'Checkout';
      return;
    }

    cartItemsList.innerHTML = Object.entries(cart).map(([productId, quantity]) => {
      const product = allProducts.find(item => item.id === productId);
      if (!product) return '';
      const subtotal = product.price * quantity;
      return `
        <div class="cart-item">
          <img src="${product.image}" alt="${product.name}" class="cart-item-image" loading="lazy">
          <div class="cart-item-info">
            <div class="cart-item-title">${product.name}</div>
            <div class="cart-item-meta">${quantity} × PGK ${product.price.toFixed(2)}</div>
          </div>
          <div class="cart-item-subtotal">PGK ${subtotal.toFixed(2)}</div>
          <button class="cart-item-remove" onclick="removeFromCart('${productId}')" aria-label="Remove ${product.name} from cart">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;
    }).join('');

    cartSummary.innerHTML = `
      <div class="cart-summary-row"><span>Total items:</span><strong>${itemCount}</strong></div>
      <div class="cart-summary-row"><span>Total amount:</span><strong>PGK ${totalAmount.toFixed(2)}</strong></div>
    `;
    checkoutButton.disabled = !proformaGenerated;
    invoiceButton.disabled = false;
    checkoutButton.textContent = 'Checkout';
  }

  function removeFromCart(productId) {
    if (!cart[productId]) return;

    const product = allProducts.find(item => item.id === productId);
    if (!product) return;

      const removeLocalItem = () => {
        if (cart[productId] > 1) {
          cart[productId] -= 1;
        } else {
          delete cart[productId];
        }
        product.inventory += 1;
        updateCartCount();
        proformaGenerated = false;
        renderCartPanel();
        performSearch();
        saveCartToStorage();
        showToast(`${product.name} removed from cart.`);
      };

      const processRemoveRequest = async () => {
        if (!useBackend) {
          removeLocalItem();
          return;
        }
        try {
          const response = await fetch('/api/cart/remove', {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({ productId }),
          });
          const data = await response.json();
          if (!response.ok) {
            showToast(data.message || 'Unable to remove product from cart.');
            return;
          }
          updateProductsFromBackend(data.products);
          Object.keys(cart).forEach(key => delete cart[key]);
          Object.entries(data.cart || {}).forEach(([id, quantity]) => {
            cart[id] = quantity;
          });
          updateCartCount();
          renderCartPanel();
          performSearch();
          proformaGenerated = false;
          showToast(`${product.name} removed from cart.`);
        } catch (error) {
          console.error('Remove from cart failed:', error);
          useBackend = false;
          removeLocalItem();
        }
      };

    const confirmedHandler = async () => {
      await processRemoveRequest();
    };
    const modal = document.getElementById('confirm-modal');
    if (modal) {
      openConfirmModal(`Are you sure you want to remove "${product.name}" from your cart?`, confirmedHandler, () => {
        // cancelled - do nothing
      });
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to remove "${product.name}" from your cart?`);
    if (!confirmed) return;
    confirmedHandler();
  }

  // Confirmation modal helpers
  function openConfirmModal(message, onConfirm, onCancel) {
    const modal = document.getElementById('confirm-modal');
    const msg = document.getElementById('confirm-modal-message');
    const yesBtn = document.getElementById('confirm-yes');
    const noBtn = document.getElementById('confirm-no');
    if (!modal || !msg || !yesBtn || !noBtn) {
      // fallback
      const confirmed = window.confirm(message);
      if (confirmed) onConfirm && onConfirm(); else onCancel && onCancel();
      return;
    }

    msg.textContent = message;
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    function cleanup() {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      yesBtn.removeEventListener('click', handleYes);
      noBtn.removeEventListener('click', handleNo);
      backdrop && backdrop.removeEventListener('click', handleNo);
    }

    function handleYes() { cleanup(); onConfirm && onConfirm(); }
    function handleNo() { cleanup(); onCancel && onCancel(); }

    const backdrop = modal.querySelector('.confirm-modal-backdrop');
    yesBtn.addEventListener('click', handleYes);
    noBtn.addEventListener('click', handleNo);
    backdrop && backdrop.addEventListener('click', handleNo, { once: true });
  }

function closeConfirmModal() {
   const modal = document.getElementById('confirm-modal');
   if (!modal) return;
   modal.style.display = 'none';
   modal.setAttribute('aria-hidden', 'true');
   document.body.style.overflow = '';
 }

  function closeLoginPromptModal() {
    const modal = document.getElementById('login-prompt-modal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

function checkAuthUI() {
  const authToken = localStorage.getItem('auth_token');
  const username = localStorage.getItem('username');
  const profilePic = localStorage.getItem('profile_pic');
  const userInfo = document.getElementById('user-info');
  const loginLink = document.getElementById('login-link');
  const logoutLink = document.getElementById('logout-link');
  const mobileUserName = document.getElementById('mobile-user-name');
  const mobileUserStatus = document.getElementById('mobile-user-status');
  const mobileAccountBtn = document.getElementById('mobile-account-btn');
  const mobileAccountContent = document.getElementById('mobile-account-content');
  const googleBtn = document.querySelector('.mobile-actions .google');
  const facebookBtn = document.querySelector('.mobile-actions .facebook');

  if (authToken && username) {
    // Update desktop UI
    if (userInfo) userInfo.textContent = username;
    if (loginLink) loginLink.style.display = 'none';
    if (logoutLink) logoutLink.style.display = 'block';
    // Update mobile user info at top
    if (mobileUserName) mobileUserName.textContent = username;
    if (mobileUserStatus) mobileUserStatus.textContent = 'Logged in';
    // Update mobile account button with profile picture or default
    if (mobileAccountBtn) {
      if (profilePic) {
        mobileAccountBtn.innerHTML = `<img src="${profilePic}" alt="Profile" style="width:24px;height:24px;border-radius:50%;object-fit:cover;">`;
      } else {
        mobileAccountBtn.innerHTML = '<i class="fas fa-user-circle"></i>';
      }
    }
    // Show mobile account content (Payment History, etc.) and show logout button
    if (mobileAccountContent) {
      mobileAccountContent.innerHTML = `
        <a href="#" class="mobile-account-item" onclick="showPaymentHistory(); return false;">Payment History</a>
        <a href="#" class="mobile-account-item" onclick="showPendingPayments(); return false;">Pending Payments</a>
        <a href="#" class="mobile-account-item" onclick="showContactUs(); return false;">Contact Us</a>
        <a href="#" class="mobile-account-item" onclick="showAboutUs(); return false;">About Us</a>
        <a href="#" class="mobile-account-item logout-item" id="mobile-logout-link" onclick="logout(); return false;">Logout</a>
      `;
      mobileAccountContent.style.display = 'block';
    }
    // Hide social login buttons in mobile menu
    if (googleBtn) googleBtn.style.display = 'none';
    if (facebookBtn) facebookBtn.style.display = 'none';
  } else {
    // Update desktop UI
    if (userInfo) userInfo.textContent = 'Not logged in (Guest)';
    if (loginLink) loginLink.style.display = 'block';
    if (logoutLink) logoutLink.style.display = 'none';
    // Update mobile user info at top
    if (mobileUserName) mobileUserName.textContent = 'Guest';
    if (mobileUserStatus) mobileUserStatus.textContent = 'Not logged in';
    // Update mobile account button to default icon
    if (mobileAccountBtn) {
      mobileAccountBtn.innerHTML = '<i class="fas fa-user-circle"></i>';
    }
    // Show mobile login link
    if (mobileAccountContent) {
      mobileAccountContent.innerHTML = `
        <a href="login.html" class="mobile-account-item" onclick="closeMobileMenu()">Login</a>
      `;
      mobileAccountContent.style.display = 'block';
    }
    // Show social login buttons in mobile menu
    if (googleBtn) googleBtn.style.display = 'block';
    if (facebookBtn) facebookBtn.style.display = 'block';
  }
}

  // Toast helper: brief non-blocking message
  function showToast(message, duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) {
      // fallback to console if container missing
      console.info('Toast:', message);
      return;
    }
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = message;
    container.appendChild(t);
    // trigger show
    requestAnimationFrame(() => t.classList.add('show'));
    // remove after duration
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 220);
    }, duration);
  }

function getUserInfo() {
    const name = localStorage.getItem('username') || 'Customer';
    const address = localStorage.getItem('user_address') || 'Address not provided';
    return { name, address };
}

function generateInvoice() {
    // Check authentication for backend mode
    if (useBackend && !isAuthenticated()) {
      showLoginPrompt('invoice');
      return;
    }
    
    const itemCount = getCartTotalItems();
    if (itemCount === 0) return;

    const items = Object.entries(cart).map(([productId, quantity]) => {
        const product = allProducts.find(item => item.id === productId);
        return product ? { product, quantity, subtotal: product.price * quantity } : null;
    }).filter(Boolean);

    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const gst = subtotal * 0.10;
    const total = subtotal + gst;
    const now = new Date();
    const proformaId = `PRO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

    // Get user information from localStorage
    const { name, address } = getUserInfo();

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const margin = 10;
    const pageWidth = 210;
    const contentWidth = pageWidth - 2 * margin;
    let y = margin;

    // Company information
    doc.setFontSize(18);
    doc.text('7 Pharmaceuticals Ltd', margin, y);
    y += 7;
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text('P.O Box 3923, Lae 411, Morobe Province', margin, y);
    y += 5;
    doc.text('Papua New Guinea', margin, y);
    y += 5;
    doc.text('Phone: +675 71365772; 71017197', margin, y);
    y += 5;
    doc.text('Email: 7pharmawholesale@gmail.com', margin, y);
    y += 10;
    
    // Invoice details
    doc.setFontSize(10);
    doc.text(`Proforma Invoice: ${proformaId}`, margin, y);
    doc.text(`Date: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, margin, y + 5);
    doc.text(`Items: ${itemCount}`, margin, y + 10);
    y += 20;
    
     // Add "Bill To" section right under "Items:"
     doc.setFontSize(12);
     doc.setFont(undefined, 'bold');
     doc.text('Bill To:', margin, y);
     y += 8;
     
     doc.setFontSize(10);
     doc.setFont(undefined, 'normal');
     // Add user name
     doc.text(name, margin, y);
     y += 5;
     
     const addressLines = address.split('\n');
     addressLines.forEach((line, index) => {
         doc.text(line, margin, y + (index * 5));
     });
     
     y += (addressLines.length * 5) + 15;

    const colItem = margin;
    const colQty = margin + 60;
    const colPrice = margin + 90;
    const colSubtotal = margin + contentWidth - 30;

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Item', colItem, y);
    doc.text('Qty', colQty, y);
    doc.text('Unit Price', colPrice, y);
    doc.text('Subtotal', colSubtotal, y, { align: 'right' });
    y += 10; // Increased from 7 to 10 for more space after headers
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentWidth, y);
    y += 10; // Increased from 7 to 10 for more space after separator line

    doc.setFont(undefined, 'normal');
    items.forEach(({ product, quantity, subtotal }) => {
        doc.setFontSize(9);
        // Handle long product names by wrapping to multiple lines
        const maxCharWidth = 95; // Approximate max width in mm for item column
        const charWidth = 2.5; // Rough estimate of character width in mm at font size 9
        const maxCharsPerLine = Math.floor(maxCharWidth / charWidth);
        
        let productName = product.name;
        let lines = [];
        
        // Split product name into lines that fit within column width
        while (productName.length > 0) {
            if (productName.length <= maxCharsPerLine) {
                lines.push(productName);
                break;
            }
            // Find the last space within the limit to avoid breaking words
            let splitIndex = productName.lastIndexOf(' ', maxCharsPerLine);
            if (splitIndex === -1 || splitIndex < maxCharsPerLine * 0.5) { // No good split point or split too early
                splitIndex = maxCharsPerLine;
            }
            lines.push(productName.substring(0, splitIndex));
            productName = productName.substring(splitIndex).trimStart();
        }
        
        // Print each line
        lines.forEach((line, lineIndex) => {
            const currentY = y + (lineIndex * 7); // 7 units per line
            
            // Only show qty/price/subtotal on the first line
            if (lineIndex === 0) {
                doc.text(line, colItem, currentY, { maxWidth: maxCharWidth });
                doc.text(String(quantity), colQty, currentY, { align: 'center' });
                doc.text(`PGK ${product.price.toFixed(2)}`, colPrice, currentY);
                doc.text(`PGK ${subtotal.toFixed(2)}`, colSubtotal, currentY, { align: 'right' });
            } else {
                // For continuation lines, only show the item text
                doc.text(line, colItem, currentY, { maxWidth: maxCharWidth });
                // Leave other columns empty for alignment
                doc.text('', colQty, currentY, { align: 'center' });
                doc.text('', colPrice, currentY);
                doc.text('', colSubtotal, currentY, { align: 'right' });
            }
        });
        
        // Move y past all lines for this item
        y += (lines.length * 7);
    });

    y += 5;
    doc.line(margin, y, margin + contentWidth, y);
    y += 8;
    doc.setFontSize(10);
    doc.text('Subtotal:', colPrice, y);
    doc.text(`PGK ${subtotal.toFixed(2)}`, colSubtotal, y, { align: 'right' });
    y += 6;
    doc.text('GST (10%):', colPrice, y);
    doc.text(`PGK ${gst.toFixed(2)}`, colSubtotal, y, { align: 'right' });
    y += 8;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
doc.text('Total (incl. GST):', colPrice, y);
     doc.text(`PGK ${total.toFixed(2)}`, colSubtotal, y, { align: 'right' });

     doc.save(`${proformaId}.pdf`);
     
     // Enable checkout button after generating proforma invoice
    proformaGenerated = true;
    saveCartToStorage();
    renderCartPanel();
    showToast('Proforma invoice generated. You can now proceed to checkout.');
}

// Function to set user address (could be called after login or profile update)
function setUserAddress(address) {
    localStorage.setItem('user_address', address);
}

function openCart() {
    const cartPanel = document.getElementById('cart-panel');
    if (!cartPanel) return;
    closeMobileMenu();
    renderCartPanel();
    cartPanel.style.display = 'flex';
    cartPanel.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

function closeCartPanel() {
    const cartPanel = document.getElementById('cart-panel');
    if (!cartPanel) return;
    cartPanel.style.display = 'none';
    cartPanel.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

// Load products from JSON file
    async function loadProducts() {
      try {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error('Failed to load products');
        const products = await response.json();
        updateProductsFromBackend(products);
        useBackend = true;
        // Check if user is logged in (for backend mode)
        await checkSession();
        await fetchCartState();
        renderAllProducts();
      } catch (error) {
       console.warn('API product load failed, falling back to local data:', error);
       useBackend = false;
       try {
         const response = await fetch('ProductsDB/products.json');
         if (!response.ok) throw new Error('Failed to load local products');
         const products = await response.json();
         updateProductsFromBackend(products);
         loadCartFromStorage();
         renderAllProducts();
       } catch (fallbackError) {
         console.error('Error loading products from local JSON:', fallbackError);
         const noResults = document.getElementById('no-results');
         if (noResults) {
           noResults.style.display = 'block';
           noResults.innerHTML = '<strong>⚠ Unable to load products</strong><br>Please refresh the page or try again later.';
         }
       }
     }
   }

  // Render all products initially
  const lowStockThreshold = 10;

  function renderAllProducts() {
    const productsSection = document.getElementById('products');
    productsSection.innerHTML = '';

    allProducts.forEach(product => {
      const stockText = product.inventory > 0 ? `${product.inventory} in stock` : 'Out of stock';
      const stockClass = product.inventory > 0 ? 'stock-label' : 'stock-label out-of-stock';
      const lowStockBadge = product.inventory > 0 && product.inventory <= lowStockThreshold ? '<div class="low-stock">Low stock</div>' : '';
      const actionButton = product.inventory > 0
        ? `<button class="add-to-cart" onclick="addToCart('${product.id}')">Add to Cart</button>`
        : `<button class="add-to-cart out-of-stock" disabled>Out of stock</button>`;

      const productDiv = document.createElement('div');
      productDiv.className = 'product';
      productDiv.innerHTML = `
        <div class="product-image-wrap" data-image="${product.image}" data-title="${product.name.replace(/"/g, '&quot;')}">
          <img src="${product.image}" alt="${product.name}" class="product-image" style="width:100%; height:140px; object-fit:cover; border-radius:8px; background:#ddd; margin-bottom:8px;">
          <span class="image-zoom-icon" aria-hidden="true">🔍</span>
        </div>
        <div style="font-weight:700; font-size:0.95rem; margin-bottom:4px;">${product.name}</div>
        <small style="color:#0a4d92; display:block; margin-bottom:6px;">${product.category}</small>
        <div style="font-weight:700; font-size:1.1rem; color:#111; margin-bottom:8px;">PGK ${product.price.toFixed(2)}</div>
        <div class="${stockClass}" style="margin-bottom:6px;">${stockText}</div>
        ${lowStockBadge}
        ${actionButton}
      `;
      productsSection.appendChild(productDiv);
    });

    document.getElementById('results-count').textContent = `Showing all ${allProducts.length} products`;
    document.getElementById('no-results').style.display = 'none';
  }

  // Search and filter products with highlighting
  function performSearch() {
    const query = document.getElementById('search-bar')?.value.toLowerCase().trim() || '';
    const category = document.getElementById('category-filter')?.value || '';
    const minPrice = parseFloat(document.getElementById('min-price')?.value || 0);
    const maxPrice = parseFloat(document.getElementById('max-price')?.value || Infinity);
    const sortBy = document.getElementById('sort-by')?.value || 'relevance';

    let filtered = allProducts.filter(product => {
      const matchesQuery = !query || 
        product.name.toLowerCase().includes(query) || 
        (product.description && product.description.toLowerCase().includes(query)) ||
        (product.category && product.category.toLowerCase().includes(query));
      
      const matchesCategory = !category || product.category === category;
      const matchesPrice = product.price >= minPrice && product.price <= maxPrice;
      
      return matchesQuery && matchesCategory && matchesPrice;
    });

    // Sort results
    if (sortBy === 'price-asc') filtered.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-desc') filtered.sort((a, b) => b.price - a.price);
    else if (sortBy === 'name-asc') filtered.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'name-desc') filtered.sort((a, b) => b.name.localeCompare(a.name));

    // Render filtered results with highlighting
    const productsSection = document.getElementById('products');
    productsSection.innerHTML = '';

    if (filtered.length === 0) {
      document.getElementById('no-results').style.display = 'block';
      document.getElementById('no-results').innerHTML = '<strong>No products found</strong><br>Try adjusting your search or filters.';
      document.getElementById('results-count').textContent = 'No results';
      return;
    }

    document.getElementById('no-results').style.display = 'none';
    filtered.forEach(product => {
      const productDiv = document.createElement('div');
      productDiv.className = 'product';
      
      let name = product.name;
      
      // Highlight matching query in name
      if (query !== '') {
        const regex = new RegExp(`(${query})`, 'gi');
        name = name.replace(regex, '<span class="highlight">$1</span>');
      }

      const stockText = product.inventory > 0 ? `${product.inventory} in stock` : 'Out of stock';
      const stockClass = product.inventory > 0 ? 'stock-label' : 'stock-label out-of-stock';
      const lowStockBadge = product.inventory > 0 && product.inventory <= lowStockThreshold ? '<div class="low-stock">Low stock</div>' : '';
      const actionButton = product.inventory > 0
        ? `<button class="add-to-cart" onclick="addToCart('${product.id}')">Add to Cart</button>`
        : `<button class="add-to-cart out-of-stock" disabled>Out of stock</button>`;
      
      productDiv.innerHTML = `
        <div class="product-image-wrap" data-image="${product.image}" data-title="${product.name.replace(/"/g, '&quot;')}">
          <img src="${product.image}" alt="${product.name}" class="product-image" style="width:100%; height:140px; object-fit:cover; border-radius:8px; background:#ddd; margin-bottom:8px;">
          <span class="image-zoom-icon" aria-hidden="true">🔍</span>
        </div>
        <div style="font-weight:700; font-size:0.95rem; margin-bottom:4px;">${name}</div>
        <small style="color:#0a4d92; display:block; margin-bottom:6px;">${product.category}</small>
        <div style="font-weight:700; font-size:1.1rem; color:#111; margin-bottom:8px;">PGK ${product.price.toFixed(2)}</div>
        <div class="${stockClass}" style="margin-bottom:6px;">${stockText}</div>
        ${lowStockBadge}
        ${actionButton}
      `;
      productsSection.appendChild(productDiv);
    });

    const resultText = filtered.length === 1 ? 'result' : 'results';
    document.getElementById('results-count').textContent = `Showing ${filtered.length} ${resultText}`;
  }

async function addToCart(productId) {
    // Check if user is authenticated - if backend is available
    if (useBackend && !isAuthenticated()) {
      showLoginPrompt('cart');
      return;
    }
    
    const product = allProducts.find(item => item.id === productId);
    if (!product) return;

    if (product.inventory <= 0) {
        showToast(`Sorry, ${product.name} is currently out of stock.`);
        return;
    }

    const addLocalItem = () => {
        cart[productId] = (cart[productId] || 0) + 1;
        product.inventory -= 1;
        updateCartCount();
        proformaGenerated = false;
        renderCartPanel();
        performSearch();
        saveCartToStorage();
        showToast(`${product.name} has been added to your cart.`);
    };

    const processAddRequest = async () => {
      if (!useBackend) {
        addLocalItem();
        return;
      }
      try {
        const response = await fetch('/api/cart/add', {
          method: 'POST',
          headers: getApiHeaders(),
          body: JSON.stringify({ productId }),
        });
        const data = await response.json();
        if (!response.ok) {
          if (data.action === 'login') {
            showLoginPrompt('cart');
          } else {
            showToast(data.message || 'Unable to add product to cart.');
          }
          return;
        }
        updateProductsFromBackend(data.products);
        Object.keys(cart).forEach(key => delete cart[key]);
        Object.entries(data.cart || {}).forEach(([id, quantity]) => {
          cart[id] = quantity;
        });
        updateCartCount();
        performSearch();
        proformaGenerated = false;
        showToast(`${product.name} has been added to your cart.`);
      } catch (error) {
        console.error('Add to cart failed:', error);
        useBackend = false;
        addLocalItem();
      }
    };

    const confirmedHandler = async () => {
        await processAddRequest();
    };

    // For adding items, we don't need confirmation, so we can call directly
    await processAddRequest();
}

  function openImageViewer(src, title) {
    const modal = document.getElementById('image-modal');
    const viewerImg = document.getElementById('image-viewer-img');
    const caption = document.getElementById('image-viewer-caption');
    if (!modal || !viewerImg || !caption) return;

    viewerImg.src = src;
    viewerImg.alt = title || 'Product image';
    caption.textContent = title || '';
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeImageViewer() {
    const modal = document.getElementById('image-modal');
    const viewerImg = document.getElementById('image-viewer-img');
    if (!modal || !viewerImg) return;

    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    viewerImg.src = '';
    document.body.style.overflow = '';
  }

  document.addEventListener('click', (e) => {
    const target = e.target.closest('.product-image-wrap');
    if (!target) return;
    openImageViewer(target.dataset.image, target.dataset.title);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeImageViewer();
      closeCartPanel();
      closePaymentModal();
      closeChatDropdown();
    }
  });

  // Payment verification functions
  let currentPaymentId = null;

function openPaymentModal() {
  const modal = document.getElementById('payment-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  document.getElementById('payment-status').textContent = '';
  document.getElementById('payment-preview').style.display = 'none';
  document.getElementById('payment-file-input').value = '';
  document.getElementById('proforma-file-input').value = '';
  document.getElementById('proforma-preview').style.display = 'none';
  currentPaymentId = null;
}

  function closePaymentModal() {
    const modal = document.getElementById('payment-modal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

function previewPaymentImage(event) {
  const file = event.target.files[0];
  const previewDiv = document.getElementById('payment-preview');
  const previewImg = document.getElementById('payment-preview-img');
  
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      previewDiv.style.display = 'block';
    };
    reader.readAsDataURL(file);
  } else {
    previewDiv.style.display = 'none';
  }
}

function previewProformaInvoice(event) {
  const file = event.target.files[0];
  const previewDiv = document.getElementById('proforma-preview');
  
  if (file && file.type === 'application/pdf') {
    previewDiv.style.display = 'block';
    // For PDFs, we could show a preview but for now just show confirmation
  } else {
    previewDiv.style.display = 'none';
  }
}

async function uploadPaymentProof() {
    // Check authentication for backend mode
    if (useBackend && !isAuthenticated()) {
      showLoginPrompt('payment');
      return;
    }
    
    const paymentFileInput = document.getElementById('payment-file-input');
    const proformaFileInput = document.getElementById('proforma-file-input');
    const statusEl = document.getElementById('payment-status');
    
    // Safety check for status element
    if (!statusEl) {
        console.error('Payment status element not found');
        return;
    }
    
    if (!paymentFileInput || !proformaFileInput) {
        statusEl.textContent = 'File input elements not found.';
        statusEl.style.color = '#e74c3c';
        return;
    }
    
    const paymentFile = paymentFileInput.files[0];
    const proformaFile = proformaFileInput.files[0];

    if (!proformaFile) {
        statusEl.textContent = 'Please select your proforma invoice (PDF).';
        statusEl.style.color = '#e74c3c';
        return;
    }

    if (!paymentFile) {
        statusEl.textContent = 'Please select a payment receipt image.';
        statusEl.style.color = '#e74c3c';
        return;
    }

    statusEl.textContent = 'Uploading...';
    statusEl.style.color = '#ffd700';

const formData = new FormData();
    formData.append('paymentProof', paymentFile);
    formData.append('proformaInvoice', proformaFile);

    try {
        if (!useBackend) {
            // Simulate successful upload for frontend-only operation
            const mockData = {
                message: 'Payment uploaded successfully (simulated)',
                paymentId: `pay_${Math.random().toString(36).slice(2, 9)}`
            };
            
         currentPaymentId = mockData.paymentId;
         setActiveChatSession(currentPaymentId);
          
         statusEl.innerHTML = `
             <div style="color:#0b7a3a; margin-bottom:8px;">✓ ${mockData.message}</div>
             <div style="color:#888; font-size:0.8rem;">Payment ID: ${mockData.paymentId}</div>
             <div style="margin-top:8px; padding:8px; background:rgba(11,122,58,0.1); border-radius:6px;">
               Your order is being processed. You will receive confirmation once payment is verified.
             </div>
         `;
  
         Object.keys(cart).forEach(key => delete cart[key]);
         proformaGenerated = false;
         updateCartCount();
         renderCartPanel();
         saveCartToStorage();
  
         setTimeout(() => {
             closePaymentModal();
         }, 5000);
         return;
        }

        const response = await fetch('/api/payment/upload', {
            method: 'POST',
            headers: { 'X-Session-Id': getSessionId() },
            body: formData
        });

        const data = await response.json();
        
        if (!response.ok) {
            if (data.action === 'login') {
              showLoginPrompt('payment');
            } else {
              statusEl.textContent = data.message || 'Upload failed.';
              statusEl.style.color = '#e74c3c';
            }
            return;
        }

         currentPaymentId = data.paymentId;
         setActiveChatSession(currentPaymentId);
         
         statusEl.innerHTML = `
             <div style="color:#0b7a3a; margin-bottom:8px;">✓ ${data.message}</div>
             <div style="color:#888; font-size:0.8rem;">Payment ID: ${data.paymentId}</div>
             <div style="margin-top:8px; padding:8px; background:rgba(11,122,58,0.1); border-radius:6px;">
               Your order is being processed. You will receive confirmation once payment is verified.
             </div>
         `;

         Object.keys(cart).forEach(key => delete cart[key]);
         proformaGenerated = false;
         updateCartCount();
         renderCartPanel();
         saveCartToStorage();

         setTimeout(() => {
             closePaymentModal();
         }, 5000);

    } catch (error) {
        console.error('Payment upload failed:', error);
        if (statusEl) {
            statusEl.textContent = error.message || 'Upload failed. Please try again.';
            statusEl.style.color = '#e74c3c';
        }
    }
}

// Payment approval timer functions
function startPaymentApprovalTimer() {
    // Clear any existing timer
    if (paymentApprovalTimer) {
        clearInterval(paymentApprovalTimer);
    }
    
    // Update timer display immediately
    updateTimerDisplay();
    
    // Start the timer
    paymentApprovalTimer = setInterval(() => {
        const elapsedTime = Date.now() - paymentApprovalStartTime;
        const remainingTime = PAYMENT_APPROVAL_TIMEOUT - elapsedTime;
        
        if (remainingTime <= 0) {
            // Time's up
            clearInterval(paymentApprovalTimer);
            paymentApprovalTimer = null;
            handlePaymentTimeout();
        } else {
            updateTimerDisplay();
        }
    }, 1000); // Update every second
}

function updateTimerDisplay() {
    const elapsedTime = Date.now() - paymentApprovalStartTime;
    const remainingTime = PAYMENT_APPROVAL_TIMEOUT - elapsedTime;
    
    if (remainingTime <= 0) {
        document.getElementById('timer-display').textContent = '00:00';
        return;
    }
    
    const minutes = Math.floor(remainingTime / 60000);
    const seconds = Math.floor((remainingTime % 60000) / 1000);
    
    const displayMinutes = String(minutes).padStart(2, '0');
    const displaySeconds = String(seconds).padStart(2, '0');
    
    document.getElementById('timer-display').textContent = `${displayMinutes}:${displaySeconds}`;
}

function handlePaymentTimeout() {
    // Update status to show timeout
    const statusEl = document.getElementById('payment-status');
    if (statusEl) {
        statusEl.innerHTML = `
            <div style="color:#e74c3c; margin-bottom:8px;">✗ Payment approval timed out (10 minutes exceeded)</div>
            <div style="color:#888; font-size:0.8rem;">
                Please upload new payment proof to continue.
            </div>
        `;
        
        // Remove timer display
        const timerDiv = document.getElementById('payment-timer');
        if (timerDiv) {
            timerDiv.remove();
        }
    }
    
    // Add system message to chat
    addChatMessage('system', 'Your payment has been automatically rejected due to timeout (10 minutes exceeded).');
}

// Chat functionality
function initializeChat(paymentId) {
    currentPaymentIdForChat = paymentId;
    
    // Clear any existing polling
    if (chatPollingInterval) {
        clearInterval(chatPollingInterval);
    }
    
    // Load existing messages
    loadChatMessages();
    
    // Start polling for new messages
    chatPollingInterval = setInterval(() => {
        loadChatMessages();
    }, 5000); // Poll every 5 seconds
}

function loadChatMessages() {
    if (!currentPaymentIdForChat || !useBackend) {
        // In demo mode, just return
        return;
    }
    
    fetch(`/api/chat/${currentPaymentIdForChat}`, {
        headers: { 'X-Session-Id': getSessionId() }
    })
    .then(response => response.json())
    .then(data => {
        displayChatMessages(data.messages || []);
    })
    .catch(error => {
        console.error('Failed to load chat messages:', error);
    });
}

function displayChatMessages(messages) {
    const chatContainer = document.getElementById('chat-messages');
    if (!chatContainer) return;
    
    // Clear and re-render all messages (simple approach)
    chatContainer.innerHTML = '';
    
    messages.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.style.margin = '8px 0';
        messageDiv.style.padding = '8px 12px';
        messageDiv.style.borderRadius = '12px';
        messageDiv.style.maxWidth = '80%';
        
        if (msg.from === 'user') {
            messageDiv.style.backgroundColor = '#007bff';
            messageDiv.style.color = 'white';
            messageDiv.style.marginLeft = 'auto';
            messageDiv.style.borderBottomRightRadius = '4px';
        } else if (msg.from === 'admin') {
            messageDiv.style.backgroundColor = '#28a745';
            messageDiv.style.color = 'white';
            messageDiv.style.marginRight = 'auto';
            messageDiv.style.borderBottomLeftRadius = '4px';
        } else {
            // system messages
            messageDiv.style.backgroundColor = '#f8f9fa';
            messageDiv.style.color = '#6c757d';
            messageDiv.style.margin = '0 auto';
            messageDiv.style.textAlign = 'center';
            messageDiv.style.fontStyle = 'italic';
        }
        
        messageDiv.innerHTML = `
            <div>${msg.text}</div>
            <div style="font-size:0.75rem; opacity:0.7; margin-top:4px;">
                ${new Date(msg.timestamp).toLocaleTimeString()}
            </div>
        `;
        
        chatContainer.appendChild(messageDiv);
    });
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function sendChatMessage() {
    const messageInput = document.getElementById('chat-message-input');
    if (!messageInput || !currentPaymentIdForChat) return;
    
    const text = messageInput.value.trim();
    if (!text) return;
    
    if (!useBackend) {
        // Demo mode - just add to local chat
        addChatMessage('user', text);
        messageInput.value = '';
        return;
    }
    
    fetch(`/api/chat/${currentPaymentIdForChat}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Session-Id': getSessionId()
        },
        body: JSON.stringify({ text })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            addChatMessage('user', text);
            messageInput.value = '';
        }
    })
    .catch(error => {
        console.error('Failed to send chat message:', error);
    });
}

function addChatMessage(from, text) {
    if (!currentPaymentIdForChat) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.style.margin = '8px 0';
    messageDiv.style.padding = '8px 12px';
    messageDiv.style.borderRadius = '12px';
    messageDiv.style.maxWidth = '80%';
    
    if (from === 'user') {
        messageDiv.style.backgroundColor = '#007bff';
        messageDiv.style.color = 'white';
        messageDiv.style.marginLeft = 'auto';
        messageDiv.style.borderBottomRightRadius = '4px';
    } else if (from === 'admin') {
        messageDiv.style.backgroundColor = '#28a745';
        messageDiv.style.color = 'white';
        messageDiv.style.marginRight = 'auto';
        messageDiv.style.borderBottomLeftRadius = '4px';
    } else {
        // system messages
        messageDiv.style.backgroundColor = '#f8f9fa';
        messageDiv.style.color = '#6c757d';
        messageDiv.style.margin = '0 auto';
        messageDiv.style.textAlign = 'center';
        messageDiv.style.fontStyle = 'italic';
    }
    
    messageDiv.innerHTML = `
        <div>${text}</div>
        <div style="font-size:0.75rem; opacity:0.7; margin-top:4px;">
            ${new Date().toLocaleTimeString()}
        </div>
    `;
    
    const chatContainer = document.getElementById('chat-messages');
    if (chatContainer) {
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

// Add event listener for Enter key in chat input
document.addEventListener('DOMContentLoaded', () => {
    // ... existing code ...
    
    // Chat enter key handling
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && 
            document.activeElement && 
            document.activeElement.id === 'chat-message-input') {
            e.preventDefault();
            sendChatMessage();
        }
    });
});

// Update checkout to use payment modal
async function checkout() {
  const itemCount = getCartTotalItems();
  if (itemCount === 0) return;
  
  // Check authentication for backend mode
  if (useBackend && !isAuthenticated()) {
    showLoginPrompt('checkout');
    return;
  }
  
  openPaymentModal();
}

// Payment timer and status checking
let paymentApprovalTimer = null;
const PAYMENT_APPROVAL_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds
let paymentApprovalStartTime = null;

// Payment approval timer functions

// Admin functions
  async function fetchPendingPayments() {
    try {
      const response = await fetch('/api/admin/payments');
      const data = await response.json();
      return data.payments;
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      return [];
    }
  }

async function verifyPayment(paymentId) {
    try {
      const response = await fetch(`/api/admin/payments/${paymentId}/verify`, {
        method: 'POST'
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to verify payment:', error);
      return { success: false, message: error.message };
    }
  }

// Load products when page loads
   document.addEventListener('DOMContentLoaded', () => {
     updateCartCount();
     loadProducts();

      // File input change listeners
      document.addEventListener('change', (e) => {
        if (e.target && e.target.id === 'payment-file-input') {
          previewPaymentImage(e);
        }
        if (e.target && e.target.id === 'proforma-file-input') {
          previewProformaInvoice(e);
        }
      });

      // Account dropdown functionality
    const accountBtn = document.getElementById('account-btn');
    const accountDropdown = document.getElementById('account-dropdown');

    function toggleAccountDropdown() {
      if (!accountDropdown) return;
      const isOpen = accountDropdown.style.display === 'block';
      if (isOpen) {
        accountDropdown.style.display = 'none';
        accountDropdown.setAttribute('aria-hidden', 'true');
        accountBtn && accountBtn.setAttribute('aria-expanded', 'false');
      } else {
        accountDropdown.style.top = '100%';
        accountDropdown.style.left = 'auto';
        accountDropdown.style.right = '0';
        accountDropdown.style.display = 'block';
        accountDropdown.setAttribute('aria-hidden', 'false');
        accountBtn && accountBtn.setAttribute('aria-expanded', 'true');
      }
    }

    accountBtn && accountBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleAccountDropdown();
    });

    document.addEventListener('click', (e) => {
      if (accountDropdown && accountBtn) {
        if (!accountDropdown.contains(e.target) && !accountBtn.contains(e.target)) {
          accountDropdown.style.display = 'none';
          accountDropdown.setAttribute('aria-hidden', 'true');
          accountBtn.setAttribute('aria-expanded', 'false');
        }
      }
    });

      window.showPaymentHistory = function() {
        if (accountDropdown) { accountDropdown.style.display = 'none'; accountDropdown.setAttribute('aria-hidden', 'true'); }
        showToast('Payment history feature coming soon!', 2000);
      };

      window.showPendingPayments = function() {
        if (accountDropdown) { accountDropdown.style.display = 'none'; accountDropdown.setAttribute('aria-hidden', 'true'); }
        showToast('Pending payments feature coming soon!', 2000);
      };

      window.showContactUs = function() {
        if (accountDropdown) { accountDropdown.style.display = 'none'; accountDropdown.setAttribute('aria-hidden', 'true'); }
        showToast('Contact Us: support@7pharmaltd.com | +675 123 4567', 4000);
      };

window.showAboutUs = function() {
   if (accountDropdown) { accountDropdown.style.display = 'none'; accountDropdown.setAttribute('aria-hidden', 'true'); }
   showToast('7 Pharmaceuticals Ltd - Providing quality healthcare products since 2010', 3000);
};
      });

// Initial auth check when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkAuthUI);
} else {
  checkAuthUI();
}
   
   

