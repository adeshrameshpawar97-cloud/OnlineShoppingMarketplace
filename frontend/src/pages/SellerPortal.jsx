import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearMarketplaceSession, getMarketplaceSession, marketplaceFetch } from "../auth";
import NotificationBell from "../components/NotificationBell";

const API = "http://localhost:5000/api";
const money = (amount) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
}).format(Number(amount) || 0);

const emptyForm = {
  Product_Name: "",
  Product_Description: "",
  Product_Price: "",
  Product_Stock: "",
  Category_ID: "",
  Product_Image_URL: "",
};

async function fetchPortalData() {
  const [productResponse, orderResponse, categoryResponse] = await Promise.all([
    marketplaceFetch("seller", `${API}/seller/products`),
    marketplaceFetch("seller", `${API}/seller/orders`),
    fetch(`${API}/categories`),
  ]);
  const [productData, orderData, categoryData] = await Promise.all([
    productResponse.json(),
    orderResponse.json(),
    categoryResponse.json(),
  ]);
  if (!productResponse.ok) throw new Error(productData.message || "Could not load your products");
  if (!orderResponse.ok) throw new Error(orderData.message || "Could not load your orders");
  if (!categoryResponse.ok) throw new Error(categoryData.message || "Could not load product categories");
  return { products: productData, orders: orderData, categories: categoryData };
}

function SellerPortal() {
  const navigate = useNavigate();
  const session = getMarketplaceSession("seller");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadPortal = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchPortalData();
      setProducts(data.products);
      setOrders(data.orders);
      setCategories(data.categories);
    } catch (loadError) {
      setError(loadError.message || "Unable to load the seller workspace");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchPortalData()
      .then((data) => {
        if (!active) return;
        setProducts(data.products);
        setOrders(data.orders);
        setCategories(data.categories);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Unable to load the seller workspace");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const signOut = () => {
    clearMarketplaceSession("seller");
    navigate("/login?role=seller", { replace: true });
  };

  const addProduct = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await marketplaceFetch("seller", `${API}/seller/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not add product");
      setForm(emptyForm);
      setShowForm(false);
      await loadPortal();
    } catch (saveError) {
      setError(saveError.message || "Could not add product");
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async (productId) => {
    if (!window.confirm("Remove this product from your catalog?")) return;
    setError("");
    try {
      const response = await marketplaceFetch("seller", `${API}/seller/products/${productId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not remove product");
      await loadPortal();
    } catch (removeError) {
      setError(removeError.message || "Could not remove product");
    }
  };

  const totalUnits = products.reduce((total, product) => total + Number(product.Product_Stock || 0), 0);

  return (
    <main className="portal-page">
      <header className="portal-header">
        <div>
          <span className="portal-eyebrow">SELLER WORKSPACE</span>
          <h1>Welcome, {session.user.name}</h1>
          <p>Manage your own inventory and orders.</p>
        </div>
        <div className="seller-header-actions">
          <NotificationBell role="seller" />
          <button className="delete-btn" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <section className="portal-summary" aria-label="Seller summary">
        <div><span>Your products</span><strong>{products.length}</strong></div>
        <div><span>Units in stock</span><strong>{totalUnits}</strong></div>
        <div><span>Orders containing your products</span><strong>{orders.length}</strong></div>
      </section>

      {error && <p className="portal-error" role="alert">{error}</p>}

      <section className="portal-section">
        <div className="portal-section-heading">
          <div><h2>Your inventory</h2><p>Only products owned by your seller account are shown.</p></div>
          <button className="primary-btn" onClick={() => setShowForm((value) => !value)}>
            {showForm ? "Cancel" : "+ Add product"}
          </button>
        </div>

        {showForm && (
          <form className="portal-product-form" onSubmit={addProduct}>
            <label>Product name<input required value={form.Product_Name} onChange={(event) => setForm({ ...form, Product_Name: event.target.value })} /></label>
            <label>Category
              <select required value={form.Category_ID} onChange={(event) => setForm({ ...form, Category_ID: event.target.value })}>
                <option value="">Choose category</option>
                {categories.map((category) => <option key={category.Category_ID} value={category.Category_ID}>{category.Category_Name}</option>)}
              </select>
            </label>
            <label>Price (INR)<input required type="number" min="0.01" step="0.01" value={form.Product_Price} onChange={(event) => setForm({ ...form, Product_Price: event.target.value })} /></label>
            <label>Stock<input required type="number" min="0" step="1" value={form.Product_Stock} onChange={(event) => setForm({ ...form, Product_Stock: event.target.value })} /></label>
            <label className="portal-wide-field">Description<textarea rows="2" value={form.Product_Description} onChange={(event) => setForm({ ...form, Product_Description: event.target.value })} /></label>
            <label className="portal-wide-field">Image URL (optional)<input type="url" placeholder="https://..." value={form.Product_Image_URL} onChange={(event) => setForm({ ...form, Product_Image_URL: event.target.value })} /></label>
            <button className="primary-btn" type="submit" disabled={saving}>{saving ? "Adding..." : "Publish product"}</button>
          </form>
        )}

        {loading ? <p className="loading-text">Loading your inventory...</p> : products.length ? (
          <div className="table-container">
            <table>
              <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Action</th></tr></thead>
              <tbody>{products.map((product) => (
                <tr key={product.Product_ID}>
                  <td><strong>{product.Product_Name}</strong></td>
                  <td>{product.Category_Name || "—"}</td>
                  <td>{money(product.Product_Price)}</td>
                  <td>{product.Product_Stock}</td>
                  <td><button className="delete-btn" onClick={() => removeProduct(product.Product_ID)}>Remove</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <div className="portal-empty"><strong>Your catalog is empty</strong><p>Add your first product to start selling.</p></div>}
      </section>

      <section className="portal-section">
        <div className="portal-section-heading">
          <div><h2>Your orders</h2><p>Orders are limited to line items containing your products.</p></div>
        </div>
        {orders.length ? (
          <div className="table-container">
            <table>
              <thead><tr><th>Order</th><th>Customer</th><th>Products</th><th>Date</th><th>Status</th><th>Subtotal</th></tr></thead>
              <tbody>{orders.map((order) => (
                <tr key={order.Order_ID}>
                  <td>#{order.Order_ID}</td>
                  <td>{order.Customer_Name || "Customer"}</td>
                  <td>{order.Products || "—"}</td>
                  <td>{String(order.Order_Date || "").slice(0, 10)}</td>
                  <td><span className="portal-status">{order.Order_Status}</span></td>
                  <td>{money(order.Order_Amount)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : !loading && <div className="portal-empty"><strong>No orders yet</strong><p>Orders containing your products will appear here.</p></div>}
      </section>
    </main>
  );
}

export default SellerPortal;
