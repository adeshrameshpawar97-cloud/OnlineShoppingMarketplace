import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Heart, Search, ShoppingCart } from "lucide-react";

const API = "http://localhost:5000/api";
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=900&q=85";

const productImage = (product) => {
  if (product.Product_Image_URL) return product.Product_Image_URL;
  const text = `${product.Product_Name} ${product.Category_Name}`.toLowerCase();
  if (text.includes("tea cup") || text.includes("cup") || text.includes("mug") || text.includes("teacup")) {
    return "https://images.unsplash.com/photo-1616371041303-a468ea826828?auto=format&fit=crop&w=900&q=85";
  }
  if (text.includes("headphone") || text.includes("audio")) {
    return "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85";
  }
  if (text.includes("watch")) {
    return "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85";
  }
  if (text.includes("phone") || text.includes("mobile")) {
    return "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=85";
  }
  if (text.includes("fashion") || text.includes("shirt") || text.includes("shoe") || text.includes("pant") || text.includes("trouser") || text.includes("jean")) {
    return "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=85";
  }
  return FALLBACK_IMAGE;
};

const money = (amount) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
}).format(Number(amount) || 0);

function Storefront() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All products");
  const [sort, setSort] = useState("featured");
  const [cart, setCart] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("gridmartCart") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("gridmartWishlist") || "[]");
      return Array.isArray(saved) ? saved.map(Number) : [];
    } catch {
      return [];
    }
  });
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [form, setForm] = useState({
    Customer_Name: "",
    Customer_Email: "",
    Customer_Phone: "",
    Customer_Address: "",
    Payment_Method: "UPI",
  });

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`${API}/products`).then((response) => {
        if (!response.ok) throw new Error("Products could not be loaded");
        return response.json();
      }),
      fetch(`${API}/categories`).then((response) => {
        if (!response.ok) throw new Error("Categories could not be loaded");
        return response.json();
      }),
      fetch(`${API}/offers`).then((response) => {
        if (!response.ok) throw new Error("Offers could not be loaded");
        return response.json();
      }),
    ])
      .then(([productData, categoryData, offerData]) => {
        if (!active) return;
        setProducts(productData);
        setCategories(categoryData);
        setOffers(offerData);
        setLoadError("");
      })
      .catch((error) => {
        if (active) setLoadError(error.message || "The catalog is unavailable right now.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    localStorage.setItem("gridmartCart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("gridmartWishlist", JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    if (searchParams.get("view") === "wishlist") {
      setWishlistOpen(true);
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.delete("view");
        return next;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const offerForProduct = (productId) => {
    const today = new Date().toISOString().slice(0, 10);
    const activeOffers = offers.filter((offer) => {
      const productIds = String(offer.Product_IDs || "").split(",").map(Number);
      const startsAt = offer.Offer_StartDate
        ? new Date(offer.Offer_StartDate).toISOString().slice(0, 10)
        : null;
      const endsAt = offer.Offer_EndDate
        ? new Date(offer.Offer_EndDate).toISOString().slice(0, 10)
        : null;
      return productIds.includes(Number(productId))
        && (!startsAt || startsAt <= today)
        && (!endsAt || endsAt >= today);
    });
    return activeOffers.reduce((best, offer) => (
      Number(offer.Offer_Discount) > Number(best?.Offer_Discount || 0) ? offer : best
    ), null);
  };

  const priceForProduct = (product) => {
    const discount = Number(offerForProduct(product.Product_ID)?.Offer_Discount || 0);
    return Number(product.Product_Price) * (1 - discount / 100);
  };

  const cartLines = cart
    .map((line) => ({
      ...line,
      product: products.find((product) => product.Product_ID === line.Product_ID),
    }))
    .filter((line) => line.product);
  const cartCount = cartLines.reduce((count, line) => count + line.quantity, 0);
  const cartTotal = cartLines.reduce(
    (total, line) => total + priceForProduct(line.product) * line.quantity,
    0,
  );
  const cartOriginalTotal = cartLines.reduce(
    (total, line) => total + Number(line.product.Product_Price) * line.quantity,
    0,
  );
  const cartSavings = Math.max(0, cartOriginalTotal - cartTotal);
  const wishlistProducts = products.filter((product) => wishlist.includes(Number(product.Product_ID)));

  const toggleWishlist = (productId) => {
    setWishlist((current) => current.includes(Number(productId))
      ? current.filter((id) => id !== Number(productId))
      : [...current, Number(productId)]);
  };

  const visibleProducts = products
    .filter((product) => Number(product.Product_Stock) > 0)
    .filter((product) => category === "All products" || product.Category_Name === category)
    .filter((product) => `${product.Product_Name} ${product.Product_Description || ""} ${product.Category_Name || ""}`
      .toLowerCase().includes(search.trim().toLowerCase()))
    .sort((first, second) => {
      if (sort === "price-low") return Number(first.Product_Price) - Number(second.Product_Price);
      if (sort === "price-high") return Number(second.Product_Price) - Number(first.Product_Price);
      if (sort === "name") return first.Product_Name.localeCompare(second.Product_Name);
      return second.Product_ID - first.Product_ID;
    });

  const addToCart = (product) => {
    setCart((current) => {
      const existing = current.find((line) => line.Product_ID === product.Product_ID);
      const quantity = (existing?.quantity || 0) + 1;
      if (quantity > Number(product.Product_Stock)) return current;
      return existing
        ? current.map((line) => line.Product_ID === product.Product_ID ? { ...line, quantity } : line)
        : [...current, { Product_ID: product.Product_ID, quantity: 1 }];
    });
  };

  const changeQuantity = (productId, delta) => {
    const product = products.find((item) => item.Product_ID === productId);
    setCart((current) => current
      .map((line) => line.Product_ID === productId
        ? { ...line, quantity: Math.min(Number(product?.Product_Stock) || 0, line.quantity + delta) }
        : line)
      .filter((line) => line.quantity > 0));
  };

  const submitOrder = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setCheckoutError("");
    try {
      const response = await fetch(`${API}/store/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, items: cart }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "We could not place your order.");
      setOrderNumber(data.Order_ID);
      setCart([]);
      setCheckoutOpen(false);
      setCartOpen(false);
      const refreshed = await fetch(`${API}/products`).then((result) => result.json());
      setProducts(refreshed);
    } catch (error) {
      setCheckoutError(error.message || "Unable to connect to the marketplace.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="storefront">
      <header className="store-header">
        <a className="store-brand" href="/shop" aria-label="GridMart home">
          <span className="store-brand-mark">G</span>
          <span>Grid<span>Mart</span><small>Everything, closer.</small></span>
        </a>
        <label className="store-search">
          <span aria-hidden="true"><Search size={19} strokeWidth={1.8} /></span>
          <input
            type="search"
            placeholder="Search for products, brands and more"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="store-actions">
          <a className="store-admin-link" href="/login">Admin</a>
          <button className="store-wishlist-button" onClick={() => setWishlistOpen(true)} aria-label={`Open wishlist, ${wishlist.length} saved products`}>
            <Heart size={17} strokeWidth={1.8} aria-hidden="true" /> Wishlist <b>{wishlist.length}</b>
          </button>
          <button className="store-cart-button" onClick={() => setCartOpen(true)} aria-label={`Open cart, ${cartCount} items`}>
            <ShoppingCart size={17} strokeWidth={1.8} aria-hidden="true" /> Cart <b>{cartCount}</b>
          </button>
        </div>
      </header>

      <main className="store-main">
        <section className="store-hero">
          <div className="store-hero-copy">
            <span className="store-eyebrow">THE MARKETPLACE EDIT</span>
            <h1>Good finds.<br /><span>Better everyday.</span></h1>
            <p>Discover products from trusted marketplace sellers, all in one place.</p>
            <a href="#catalog" className="store-hero-cta">Explore the catalog <span aria-hidden="true">→</span></a>
          </div>
          <div className="store-hero-art" aria-label="Featured headphones and smartwatch">
            <img
              className="store-hero-watch"
              src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=85"
              alt="Minimal wristwatch"
            />
            <img
              className="store-hero-audio"
              src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=85"
              alt="Over-ear headphones"
            />
            <span className="hero-art-stamp">THE<br />EDIT</span>
          </div>
          <div className="store-hero-index">01 / DISCOVER</div>
        </section>

        <section className="store-benefits" aria-label="Shopping benefits">
          <div><span>01</span><strong>Real marketplace stock</strong><small>Availability updates from the catalog</small></div>
          <div><span>02</span><strong>Trusted sellers</strong><small>Products listed by marketplace sellers</small></div>
          <div><span>03</span><strong>Secure order record</strong><small>Every checkout saved to your database</small></div>
        </section>

        <section className="store-catalog" id="catalog">
          <div className="store-section-heading">
            <div><span className="store-eyebrow">FIND YOUR NEXT FAVORITE</span><h2>Shop the catalog</h2></div>
            <label className="store-sort-label">
              <span>Sort by</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="featured">Featured</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
                <option value="name">Name</option>
              </select>
            </label>
          </div>
          <div className="store-category-list" aria-label="Filter by category">
            {["All products", ...categories.map((item) => item.Category_Name)].map((name) => (
              <button
                key={name}
                className={`store-category-chip ${category === name ? "selected" : ""}`}
                onClick={() => setCategory(name)}
              >{name}</button>
            ))}
          </div>

          {orderNumber && (
            <div className="store-order-success" role="status">
              <span>Order placed</span>
              <strong>Thank you. Your order #{orderNumber} is confirmed as pending payment.</strong>
              <button onClick={() => setOrderNumber("")} aria-label="Dismiss order confirmation">×</button>
            </div>
          )}
          {loadError && <div className="store-error" role="alert">{loadError} Check that the Flask backend is running, then refresh.</div>}
          {loading ? (
            <div className="store-loading">Loading the live catalog…</div>
          ) : visibleProducts.length ? (
            <div className="store-product-grid">
              {visibleProducts.map((product) => {
                const quantityInCart = cart.find((line) => line.Product_ID === product.Product_ID)?.quantity || 0;
                const offer = offerForProduct(product.Product_ID);
                const currentPrice = priceForProduct(product);
                const isWishlisted = wishlist.includes(Number(product.Product_ID));
                return (
                  <article className="store-product" key={product.Product_ID}>
                    <div className="store-product-image">
                      <img
                        src={productImage(product)}
                        alt={product.Product_Name}
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = FALLBACK_IMAGE;
                        }}
                      />
                      <span>{product.Category_Name || "Marketplace"}</span>
                      <button className={`store-wishlist-toggle ${isWishlisted ? "saved" : ""}`} onClick={() => toggleWishlist(product.Product_ID)} aria-label={isWishlisted ? `Remove ${product.Product_Name} from wishlist` : `Add ${product.Product_Name} to wishlist`}>
                        <Heart size={18} strokeWidth={1.8} fill={isWishlisted ? "currentColor" : "none"} aria-hidden="true" />
                      </button>
                    </div>
                    <div className="store-product-info">
                      <p className="store-product-seller">{product.Seller_Name || "Marketplace seller"}</p>
                      <h3>{product.Product_Name}</h3>
                      <p className="store-product-description">{product.Product_Description || "A marketplace pick, ready to order."}</p>
                      {offer && <span className="store-discount-badge">{Number(offer.Offer_Discount)}% off · {offer.Offer_Name}</span>}
                      <div className="store-product-bottom">
                        <div>
                          {offer && <del>{money(product.Product_Price)}</del>}
                          <strong>{money(currentPrice)}</strong>
                          <small>{product.Product_Stock} in stock</small>
                        </div>
                        <button
                          className={quantityInCart ? "in-cart" : ""}
                          onClick={() => addToCart(product)}
                          disabled={quantityInCart >= Number(product.Product_Stock)}
                        >{quantityInCart ? `Added · ${quantityInCart}` : "Add to cart"}</button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="store-empty"><strong>No products match that search.</strong><span>Try another search or choose a different category.</span></div>
          )}
        </section>
      </main>

      <footer className="store-footer"><a className="store-brand" href="/shop"><span className="store-brand-mark">G</span><span>Grid<span>Mart</span><small>Everything, closer.</small></span></a><span>Orders are placed against live marketplace inventory.</span><a href="/login">Marketplace administration</a></footer>

      {cartOpen && (
        <div className="store-overlay" onMouseDown={(event) => event.target === event.currentTarget && setCartOpen(false)}>
          <aside className="store-cart-panel" aria-label="Shopping cart">
            <div className="store-panel-heading"><div><span className="store-eyebrow">YOUR SELECTION</span><h2>Shopping cart <small>({cartCount})</small></h2></div><button onClick={() => setCartOpen(false)} aria-label="Close cart">×</button></div>
            {cartLines.length ? (
              <>
                <div className="store-cart-lines">
                  {cartLines.map(({ product, quantity }) => (
                    <div className="store-cart-line" key={product.Product_ID}>
                      <img src={productImage(product)} alt="" />
                      <div className="store-cart-product"><strong>{product.Product_Name}</strong><span>{money(priceForProduct(product))} each{offerForProduct(product.Product_ID) ? ` · ${Number(offerForProduct(product.Product_ID).Offer_Discount)}% off` : ""}</span><div className="store-quantity"><button onClick={() => changeQuantity(product.Product_ID, -1)} aria-label={`Remove one ${product.Product_Name}`}>−</button><span>{quantity}</span><button onClick={() => changeQuantity(product.Product_ID, 1)} disabled={quantity >= Number(product.Product_Stock)} aria-label={`Add one ${product.Product_Name}`}>+</button></div></div>
                      <strong className="store-line-total">{money(priceForProduct(product) * quantity)}</strong>
                    </div>
                  ))}
                </div>
                <div className="store-cart-summary"><div><span>Subtotal</span><strong>{money(cartTotal)}</strong></div><small>Shipping and payment are confirmed at checkout. Payment is recorded as pending.</small><button onClick={() => { setCheckoutError(""); setCheckoutOpen(true); }}>Continue to checkout <span aria-hidden="true">→</span></button></div>
              </>
            ) : <div className="store-empty"><strong>Your cart is waiting.</strong><span>Add something from the catalog to get started.</span><button onClick={() => setCartOpen(false)}>Continue shopping</button></div>}
          </aside>
        </div>
      )}

      {wishlistOpen && (
        <div className="store-overlay" onMouseDown={(event) => event.target === event.currentTarget && setWishlistOpen(false)}>
          <aside className="store-cart-panel" aria-label="Wishlist">
            <div className="store-panel-heading"><div><span className="store-eyebrow">SAVED FOR LATER</span><h2>Wishlist <small>({wishlistProducts.length})</small></h2></div><button onClick={() => setWishlistOpen(false)} aria-label="Close wishlist">×</button></div>
            {wishlistProducts.length ? (
              <div className="store-cart-lines">
                {wishlistProducts.map((product) => (
                  <div className="store-cart-line" key={product.Product_ID}>
                    <img src={productImage(product)} alt="" />
                    <div className="store-cart-product"><strong>{product.Product_Name}</strong><span>{money(priceForProduct(product))}{offerForProduct(product.Product_ID) ? ` · ${Number(offerForProduct(product.Product_ID).Offer_Discount)}% off` : ""}</span><button className="store-wishlist-remove" onClick={() => toggleWishlist(product.Product_ID)}>Remove</button></div>
                    <button className="store-wishlist-add" onClick={() => addToCart(product)} disabled={!Number(product.Product_Stock)}>Add to cart</button>
                  </div>
                ))}
              </div>
            ) : <div className="store-empty"><strong>No saved products yet.</strong><span>Tap the heart on a product to save it here.</span><button onClick={() => setWishlistOpen(false)}>Browse products</button></div>}
          </aside>
        </div>
      )}

      {checkoutOpen && (
        <div className="store-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setCheckoutOpen(false)}>
          <section className="store-checkout-modal" aria-labelledby="checkout-title">
            <div className="store-panel-heading"><div><span className="store-eyebrow">DELIVERY DETAILS</span><h2 id="checkout-title">Complete your order</h2></div><button onClick={() => setCheckoutOpen(false)} aria-label="Close checkout">×</button></div>
            <section className="store-checkout-breakdown" aria-label="Order price breakdown">
              <div className="store-checkout-breakdown-heading">
                <strong>Items and offers</strong>
                <span>{cartCount} {cartCount === 1 ? "item" : "items"}</span>
              </div>
              {cartLines.map(({ product, quantity }) => {
                const offer = offerForProduct(product.Product_ID);
                const originalLineTotal = Number(product.Product_Price) * quantity;
                const discountedLineTotal = priceForProduct(product) * quantity;
                return (
                  <div className="store-checkout-item" key={product.Product_ID}>
                    <div className="store-checkout-item-info">
                      <strong>{product.Product_Name} <span>× {quantity}</span></strong>
                      {offer ? (
                        <span className="store-checkout-offer">{Number(offer.Offer_Discount)}% off · {offer.Offer_Name}</span>
                      ) : (
                        <span className="store-checkout-no-offer">Regular price</span>
                      )}
                    </div>
                    <div className="store-checkout-item-price">
                      {offer && <del>{money(originalLineTotal)}</del>}
                      <strong>{money(discountedLineTotal)}</strong>
                    </div>
                  </div>
                );
              })}
              {cartSavings > 0 && (
                <div className="store-checkout-savings">
                  <span>Offer savings</span>
                  <strong>−{money(cartSavings)}</strong>
                </div>
              )}
            </section>
            <div className="store-checkout-total"><span>To pay</span><strong>{money(cartTotal)}</strong></div>
            <form onSubmit={submitOrder}>
              <div className="store-form-grid">
                <label>Full name<input required autoComplete="name" value={form.Customer_Name} onChange={(event) => setForm({ ...form, Customer_Name: event.target.value })} /></label>
                <label>Email address<input required type="email" autoComplete="email" value={form.Customer_Email} onChange={(event) => setForm({ ...form, Customer_Email: event.target.value })} /></label>
                <label>Phone number <span>(optional)</span><input type="tel" autoComplete="tel" value={form.Customer_Phone} onChange={(event) => setForm({ ...form, Customer_Phone: event.target.value })} /></label>
                <label className="store-address-field">Delivery address<textarea required autoComplete="street-address" rows="3" value={form.Customer_Address} onChange={(event) => setForm({ ...form, Customer_Address: event.target.value })} /></label>
                <label className="store-payment-field">Payment method<select value={form.Payment_Method} onChange={(event) => setForm({ ...form, Payment_Method: event.target.value })}><option>UPI</option><option>Credit Card</option><option>Debit Card</option><option>Net Banking</option><option>Cash on Delivery</option></select></label>
              </div>
              {checkoutError && <p className="store-checkout-error" role="alert">{checkoutError}</p>}
              <p className="store-payment-note">This demo records an order and a pending payment in your connected database. No payment is charged.</p>
              <button className="store-place-order" type="submit" disabled={submitting || !cartLines.length}>{submitting ? "Placing order…" : `Place order · ${money(cartTotal)}`}</button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default Storefront;