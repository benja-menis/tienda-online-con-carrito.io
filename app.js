/* ═══════════════════════════════════════════════════════════════════
   Anime Queens Store — app.js
   ═══════════════════════════════════════════════════════════════════
   Single-file architecture organized in logical sections:

     1. PRODUCT DATA          — Catalog (single source of truth)
     2. CART STATE MANAGEMENT  — CartManager class (state + persistence + events)
     3. DOM REFERENCES         — Cached element lookups
     4. RENDERING FUNCTIONS    — Products, cart sidebar, checkout modal
     5. EVENT LISTENERS        — User interactions
     6. INITIALIZATION         — Bootstrap the app

   Encapsulated in an IIFE to prevent global namespace pollution.
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ═══════════════════════════════════════════════════════════════
     1. PRODUCT DATA
     ═══════════════════════════════════════════════════════════════ */

  const PRODUCTS = Object.freeze([
    { id: 1,  name: "Mai Sakurajima",   series: "Rascal Does Not Dream of Bunny Girl Senpai",               price: 250, image: "images/mai-sakurajima.png",              category: "figure" },
    { id: 2,  name: "Suou Yuki",        series: "Tokidoki Bosotto Russia-go de Dereru Tonari no Alya-san",   price: 260, image: "images/marin-my-dress-up-darling.png",   category: "figure" },
    { id: 3,  name: "Asuna Yuuki",      series: "Sword Art Online",                                         price: 270, image: "images/asuna-sword-art-online.png",       category: "figure" },
    { id: 4,  name: "Zero Two",         series: "Darling in the FranXX",                                     price: 290, image: "images/zero-two-darling-in-the-franxx.png",category: "figure" },
    { id: 5,  name: "Alisa Mikhailovna",series: "Tokidoki Bosotto Russia-go de Dereru Tonari no Alya-san",   price: 300, image: "images/saber-fate.png",                  category: "figure" },
    { id: 6,  name: "Nezuko Kamado",    series: "Demon Slayer",                                              price: 280, image: "images/nezuko-demon-slayer.png",          category: "figure" },
    { id: 7,  name: "Kaguya Shinomiya", series: "Kaguya-sama: Love is War",                                  price: 250, image: "images/kaguya-love-is-war.png",          category: "figure" },
    { id: 8,  name: "Nino Nakano",      series: "The Quintessential Quintuplets",                            price: 265, image: "images/nino-nakano.png",                 category: "figure" },
    { id: 9,  name: "Miku Nakano",      series: "The Quintessential Quintuplets",                            price: 270, image: "images/miku-nakano.png",                 category: "figure" },
    { id: 10, name: "Yotsuba Nakano",   series: "The Quintessential Quintuplets",                            price: 275, image: "images/yotsuba-nakano.png",              category: "figure" },
    { id: 11, name: "Itsuki Nakano",    series: "The Quintessential Quintuplets",                            price: 280, image: "images/itsuki-nakano.png",               category: "figure" },
    { id: 12, name: "Ichika Nakano",    series: "The Quintessential Quintuplets",                            price: 260, image: "images/ichika-nakano.png",               category: "figure" },
    { id: 13, name: "Suma",             series: "Demon Slayer",                                              price: 250, image: "images/suma.png",                        category: "figure" },
    { id: 14, name: "Rio Futaba",       series: "Rascal Does Not Dream of Bunny Girl Senpai",               price: 245, image: "images/rio-futaba.png",                  category: "figure" },
    { id: 15, name: "Kaede Azusagawa",  series: "Rascal Does Not Dream of Bunny Girl Senpai",               price: 245, image: "images/kaede-azusagawa.png",             category: "figure" },
    { id: 16, name: "Alya Kujou",       series: "Tokidoki Bosotto Russia-go de Dereru Tonari no Alya-san",   price: 260, image: "images/alya-kujou.png",                  category: "figure" },
    { id: 17, name: "Yuki Suou",        series: "Tokidoki Bosotto Russia-go de Dereru Tonari no Alya-san",   price: 260, image: "images/makio.png",                       category: "figure" },
    { id: 18, name: "Shinobu Kocho",    series: "Demon Slayer",                                              price: 280, image: "images/shinobu-kocho.png",               category: "figure" },
    { id: 19, name: "Mitsuri Kanroji",  series: "Demon Slayer",                                              price: 290, image: "images/mitsuri-kanroji.png",             category: "figure" },
    { id: 20, name: "Tamayo",           series: "Demon Slayer",                                              price: 275, image: "images/tamayo.png",                      category: "figure" },
  ]);

  /* ═══════════════════════════════════════════════════════════════
     2. CART STATE MANAGEMENT
     ═══════════════════════════════════════════════════════════════
     CartManager is the single source of truth for cart state.
     - Prevents duplicate entries (merges quantity instead)
     - Persists to localStorage with validation on load
     - Emits "change" events so the UI auto-updates
     - getSummary() is ready for coupons, taxes, and shipping
     ═══════════════════════════════════════════════════════════════ */

  const STORAGE_KEY = "anime_queens_cart";
  const MAX_QUANTITY = 99;

  class CartManager {
    #items;
    #listeners;

    constructor() {
      this.#items = [];
      this.#listeners = {};
      this.#load();
    }

    // ─── Public API ─────────────────────────────────────────

    addItem(product, quantity = 1) {
      if (!product?.id || !product?.price) {
        throw new Error("CartManager.addItem: invalid product");
      }

      const qty = Math.max(1, Math.min(quantity, MAX_QUANTITY));
      const existing = this.#items.find((i) => i.id === product.id);

      if (existing) {
        existing.quantity = Math.min(existing.quantity + qty, MAX_QUANTITY);
      } else {
        this.#items.push({
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          quantity: qty,
        });
      }

      this.#save();
      this.#emit("change", { action: "add", productId: product.id });
    }

    removeItem(productId) {
      const idx = this.#items.findIndex((i) => i.id === productId);
      if (idx === -1) return false;

      this.#items.splice(idx, 1);
      this.#save();
      this.#emit("change", { action: "remove", productId });
      return true;
    }

    updateQuantity(productId, quantity) {
      const item = this.#items.find((i) => i.id === productId);
      if (!item) return false;

      if (quantity <= 0) return this.removeItem(productId);

      item.quantity = Math.min(quantity, MAX_QUANTITY);
      this.#save();
      this.#emit("change", { action: "update", productId });
      return true;
    }

    getItems() {
      return this.#items.map((i) => ({ ...i }));
    }

    getItemCount() {
      return this.#items.reduce((sum, i) => sum + i.quantity, 0);
    }

    getSubtotal() {
      return this.#items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    }

    /**
     * Scalable price summary — pass options to add coupons, tax, shipping.
     *   cart.getSummary({ taxRate: 0.16, shippingCost: 50, couponDiscount: 20 });
     */
    getSummary(options = {}) {
      const { couponDiscount = 0, taxRate = 0, shippingCost = 0 } = options;

      const subtotal = this.getSubtotal();
      const discount = Math.min(couponDiscount, subtotal);
      const taxableAmount = subtotal - discount;
      const tax = Math.round(taxableAmount * taxRate * 100) / 100;
      const shipping = this.isEmpty() ? 0 : shippingCost;
      const total = Math.max(0, taxableAmount + tax + shipping);

      return { subtotal, discount, tax, shipping, total, itemCount: this.getItemCount() };
    }

    clear() {
      this.#items = [];
      this.#save();
      this.#emit("change", { action: "clear" });
    }

    isEmpty() {
      return this.#items.length === 0;
    }

    // ─── Event system ───────────────────────────────────────

    on(event, callback) {
      if (!this.#listeners[event]) this.#listeners[event] = [];
      this.#listeners[event].push(callback);
      return () => {
        this.#listeners[event] = this.#listeners[event].filter((cb) => cb !== callback);
      };
    }

    #emit(event, data) {
      (this.#listeners[event] || []).forEach((cb) => {
        try { cb(data); } catch (err) { console.error("Cart event error:", err); }
      });
    }

    // ─── Persistence ────────────────────────────────────────

    #save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.#items));
      } catch (err) {
        console.error("CartManager: failed to persist cart", err);
      }
    }

    #load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return;

        this.#items = parsed.filter(
          (item) =>
            item &&
            typeof item.id === "number" &&
            typeof item.price === "number" &&
            typeof item.quantity === "number" &&
            item.quantity > 0,
        );
      } catch {
        this.#items = [];
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     3. DOM REFERENCES
     ═══════════════════════════════════════════════════════════════ */

  const $ = (id) => document.getElementById(id);

  const DOM = {
    productsContainer: $("products-container"),
    cartIcon:          $("cart-icon"),
    cartSidebar:       $("cart-sidebar"),
    cartItems:         $("cart-items"),
    cartTotal:         $("cart-total"),
    cartCount:         $("cart-count"),
    cartOverlay:       $("cart-overlay"),
    checkoutBtn:       $("checkout-btn"),
    clearCartBtn:      $("clear-cart-btn"),
    checkoutModal:     $("checkout-modal"),
    checkoutSummary:   $("checkout-summary"),
    checkoutTotal:     $("checkout-total"),
    confirmOrderBtn:   $("confirm-order-btn"),
    contactForm:       $("contact-form"),
    heroExploreBtn:    $("hero-explore-btn"),
  };

  /* ═══════════════════════════════════════════════════════════════
     4. RENDERING FUNCTIONS
     ═══════════════════════════════════════════════════════════════ */

  // ─── Product grid ─────────────────────────────────────────

  function renderProducts() {
    const fragment = document.createDocumentFragment();

    PRODUCTS.forEach((product) => {
      const card = document.createElement("article");
      card.className = "product-card";
      card.innerHTML = `
        <img src="${product.image}" alt="${product.name}" loading="lazy">
        <h3>${product.name}</h3>
        <span class="product-series">${product.series}</span>
        <p class="product-price">$${product.price}</p>
        <button class="btn btn-add-cart" data-product-id="${product.id}">
          Agregar al carrito
        </button>
      `;
      fragment.appendChild(card);
    });

    DOM.productsContainer.innerHTML = "";
    DOM.productsContainer.appendChild(fragment);
  }

  function showAddFeedback(btn) {
    const original = btn.textContent;
    btn.textContent = "Agregado \u2713";
    btn.classList.add("btn-added");
    btn.disabled = true;

    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove("btn-added");
      btn.disabled = false;
    }, 800);
  }

  // ─── Cart sidebar ─────────────────────────────────────────

  function renderCart() {
    const items = cart.getItems();
    const summary = cart.getSummary();

    DOM.cartItems.innerHTML = "";

    if (items.length === 0) {
      DOM.cartItems.innerHTML = '<p class="cart-empty">El carrito esta vacio</p>';
    } else {
      const fragment = document.createDocumentFragment();
      items.forEach((item) => {
        const subtotal = item.price * item.quantity;
        const row = document.createElement("div");
        row.className = "cart-item";
        row.innerHTML = `
          <img src="${item.image}" alt="${item.name}">
          <div class="cart-item-details">
            <h4>${item.name}</h4>
            <p class="cart-item-price">$${item.price} \u00d7 ${item.quantity} = $${subtotal}</p>
          </div>
          <div class="cart-item-actions">
            <button class="btn-qty" data-action="decrease" data-id="${item.id}" aria-label="Disminuir cantidad">\u2212</button>
            <span class="qty-display">${item.quantity}</span>
            <button class="btn-qty" data-action="increase" data-id="${item.id}" aria-label="Aumentar cantidad">+</button>
            <button class="btn-remove" data-action="remove" data-id="${item.id}" aria-label="Eliminar">\u00d7</button>
          </div>
        `;
        fragment.appendChild(row);
      });
      DOM.cartItems.appendChild(fragment);
    }

    DOM.cartTotal.textContent = summary.total;
    DOM.cartCount.textContent = summary.itemCount;
    DOM.cartCount.style.display = summary.itemCount > 0 ? "" : "none";
  }

  function openCart() {
    DOM.cartSidebar.classList.add("active");
    DOM.cartOverlay.classList.add("active");
  }

  function closeCart() {
    DOM.cartSidebar.classList.remove("active");
    DOM.cartOverlay.classList.remove("active");
  }

  function toggleCart() {
    DOM.cartSidebar.classList.contains("active") ? closeCart() : openCart();
  }

  // ─── Checkout modal ───────────────────────────────────────

  function openCheckout() {
    if (cart.isEmpty()) return;

    const items = cart.getItems();
    const summary = cart.getSummary();

    DOM.checkoutSummary.innerHTML = "";
    const fragment = document.createDocumentFragment();

    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "checkout-item";
      row.innerHTML = `
        <span>${item.name} \u00d7 ${item.quantity}</span>
        <span>$${item.price * item.quantity}</span>
      `;
      fragment.appendChild(row);
    });

    DOM.checkoutSummary.appendChild(fragment);
    DOM.checkoutTotal.textContent = summary.total;
    DOM.checkoutModal.style.display = "block";
  }

  function closeCheckout() {
    DOM.checkoutModal.style.display = "none";
  }

  function confirmOrder() {
    if (cart.isEmpty()) return;

    // WhatsApp-ready message (uncomment window.open to activate)
    // const items = cart.getItems();
    // const summary = cart.getSummary();
    // let msg = "Nuevo pedido!%0A%0A";
    // items.forEach(i => { msg += `${i.name} x${i.quantity} - $${i.price * i.quantity}%0A`; });
    // msg += `%0ATotal: $${summary.total}`;
    // window.open(`https://wa.me/PHONE?text=${msg}`);

    alert("\u00a1Pedido confirmado! Gracias por tu compra.");
    cart.clear();
    closeCheckout();
  }

  /* ═══════════════════════════════════════════════════════════════
     5. EVENT LISTENERS
     ═══════════════════════════════════════════════════════════════ */

  function bindEvents() {
    // ─── Product grid (delegated) ───────────────────────────
    DOM.productsContainer.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-add-cart");
      if (!btn) return;

      const id = Number(btn.dataset.productId);
      const product = PRODUCTS.find((p) => p.id === id);
      if (!product) return;

      cart.addItem(product);
      openCart();
      showAddFeedback(btn);
    });

    // ─── Cart sidebar (delegated) ───────────────────────────
    DOM.cartItems.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;

      const id = Number(btn.dataset.id);
      const action = btn.dataset.action;

      if (action === "increase") {
        const item = cart.getItems().find((i) => i.id === id);
        if (item) cart.updateQuantity(id, item.quantity + 1);
      } else if (action === "decrease") {
        const item = cart.getItems().find((i) => i.id === id);
        if (item) cart.updateQuantity(id, item.quantity - 1);
      } else if (action === "remove") {
        cart.removeItem(id);
      }
    });

    // ─── Cart open / close ──────────────────────────────────
    DOM.cartIcon.addEventListener("click", toggleCart);
    DOM.cartSidebar.querySelector(".cart-close").addEventListener("click", closeCart);
    DOM.cartOverlay.addEventListener("click", closeCart);

    // ─── Checkout flow ──────────────────────────────────────
    DOM.checkoutBtn.addEventListener("click", openCheckout);
    DOM.checkoutModal.querySelector(".close").addEventListener("click", closeCheckout);
    DOM.confirmOrderBtn.addEventListener("click", confirmOrder);
    DOM.clearCartBtn.addEventListener("click", () => cart.clear());

    window.addEventListener("click", (e) => {
      if (e.target === DOM.checkoutModal) closeCheckout();
    });

    // ─── Cart auto-render on state change ───────────────────
    cart.on("change", renderCart);

    // ─── Hero scroll button ────────────────────────────────
    DOM.heroExploreBtn.addEventListener("click", () => {
      DOM.productsContainer.scrollIntoView({ behavior: "smooth" });
    });

    // ─── FAQ accordion ──────────────────────────────────────
    document.querySelectorAll(".faq-item button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const isActive = btn.classList.contains("active");

        document.querySelectorAll(".faq-item button.active").forEach((other) => {
          if (other !== btn) {
            other.classList.remove("active");
            other.nextElementSibling.style.display = "none";
          }
        });

        btn.classList.toggle("active", !isActive);
        btn.nextElementSibling.style.display = isActive ? "none" : "block";
      });
    });

    // ─── Contact form ───────────────────────────────────────
    DOM.contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(e.target);
      alert(
        `\u00a1Mensaje enviado!\nNombre: ${data.get("name")}\nEmail: ${data.get("email")}`,
      );
      e.target.reset();
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     6. INITIALIZATION
     ═══════════════════════════════════════════════════════════════ */

  const cart = new CartManager();

  renderProducts();
  renderCart();
  bindEvents();
})();
