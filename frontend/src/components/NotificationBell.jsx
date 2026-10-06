import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { getMarketplaceSession, marketplaceFetch } from "../auth";

const API = "http://localhost:5000/api";
const POLL_INTERVAL = 20_000;
const MAX_NOTIFICATIONS = 8;

function getStorageKey(role) {
  if (role === "seller") {
    const sellerId = getMarketplaceSession("seller")?.user?.id;
    return `gridmart:seller:${sellerId}:read-order-notifications`;
  }
  return "gridmart:admin:read-order-notifications";
}

function formatAmount(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

function formatDate(date) {
  if (!date) return "Date unavailable";
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "Date unavailable";
  return parsedDate.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function NotificationBell({ role }) {
  const [orders, setOrders] = useState([]);
  const [readOrderIds, setReadOrderIds] = useState(() => new Set());
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const menuRef = useRef(null);
  const storageKey = getStorageKey(role);

  useEffect(() => {
    let active = true;
    let initialized = false;

    const loadOrders = async () => {
      try {
        const response = role === "seller"
          ? await marketplaceFetch("seller", `${API}/seller/orders`)
          : await fetch(`${API}/orders`);
        const data = await response.json();
        if (!response.ok || !Array.isArray(data)) {
          throw new Error(data.message || data.error || "Could not load order notifications");
        }

        if (!active) return;
        const latestOrders = data.slice(0, MAX_NOTIFICATIONS);
        if (!initialized) {
          const storedIds = localStorage.getItem(storageKey);
          const initialReadIds = storedIds === null
            ? latestOrders.map((order) => String(order.Order_ID))
            : JSON.parse(storedIds);
          if (!Array.isArray(initialReadIds)) {
            throw new Error("Saved notification state is invalid. Clear this site's stored data and try again.");
          }
          setReadOrderIds(new Set(initialReadIds.map(String)));
          if (storedIds === null) {
            localStorage.setItem(storageKey, JSON.stringify(initialReadIds));
          }
          initialized = true;
        } else {
          const storedIds = localStorage.getItem(storageKey);
          const currentReadIds = storedIds ? JSON.parse(storedIds) : [];
          if (!Array.isArray(currentReadIds)) {
            throw new Error("Saved notification state is invalid. Clear this site's stored data and try again.");
          }
          setReadOrderIds(new Set(currentReadIds.map(String)));
        }
        setOrders(latestOrders);
        setError("");
      } catch (loadError) {
        if (active) setError(loadError.message || "Could not load order notifications");
      }
    };

    loadOrders();
    const intervalId = window.setInterval(loadOrders, POLL_INTERVAL);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [role, storageKey]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const markRead = (orderId) => {
    const updatedReadIds = new Set(readOrderIds);
    updatedReadIds.add(String(orderId));
    setReadOrderIds(updatedReadIds);
    localStorage.setItem(storageKey, JSON.stringify([...updatedReadIds]));
  };

  const markAllRead = () => {
    const updatedReadIds = new Set(readOrderIds);
    orders.forEach((order) => updatedReadIds.add(String(order.Order_ID)));
    setReadOrderIds(updatedReadIds);
    localStorage.setItem(storageKey, JSON.stringify([...updatedReadIds]));
  };

  const unreadCount = orders.reduce(
    (count, order) => count + (readOrderIds.has(String(order.Order_ID)) ? 0 : 1),
    0,
  );
  const ordersPath = role === "seller" ? "/seller" : "/orders";

  return (
    <div className="notification-menu" ref={menuRef}>
      <button
        className="notification"
        type="button"
        aria-label={unreadCount ? `${unreadCount} unread order notifications` : "Order notifications"}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <Bell size={17} strokeWidth={1.8} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="notification-count" aria-hidden="true">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section className="notification-popover" role="dialog" aria-label="Order notifications">
          <header className="notification-popover-header">
            <div>
              <strong>Order notifications</strong>
              <span>{unreadCount ? `${unreadCount} unread` : "You're all caught up"}</span>
            </div>
            {unreadCount > 0 && (
              <button type="button" className="notification-mark-read" onClick={markAllRead}>
                <CheckCheck size={15} aria-hidden="true" />
                Mark all read
              </button>
            )}
          </header>

          {error ? (
            <p className="notification-message" role="alert">{error}</p>
          ) : orders.length ? (
            <ul className="notification-list">
              {orders.map((order) => {
                const isUnread = !readOrderIds.has(String(order.Order_ID));
                const description = role === "seller"
                  ? `${order.Customer_Name || "A customer"} ordered ${order.Products || "your product"}`
                  : `${order.Customer_Name || "A customer"} placed an order`;
                return (
                  <li key={order.Order_ID}>
                    <Link
                      className={`notification-item${isUnread ? " is-unread" : ""}`}
                      to={ordersPath}
                      onClick={() => {
                        markRead(order.Order_ID);
                        setOpen(false);
                      }}
                    >
                      <span className="notification-item-indicator" aria-hidden="true" />
                      <span className="notification-item-content">
                        <strong>{description}</strong>
                        <span>Order #{order.Order_ID} · {formatDate(order.Order_Date)}</span>
                        <span>{formatAmount(order.Order_Amount)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="notification-message">No orders yet. New orders will appear here.</p>
          )}
        </section>
      )}
    </div>
  );
}

export default NotificationBell;
