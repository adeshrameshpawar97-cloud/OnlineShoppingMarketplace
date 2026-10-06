import { Routes, Route, Navigate } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import Offers from "./pages/Offers";
import Customers from "./pages/Customers";
import Sellers from "./pages/Sellers";
import Orders from "./pages/Orders";
import OrderItems from "./pages/OrderItems";
import Payments from "./pages/Payments";
import Delivery from "./pages/Delivery";
import Reviews from "./pages/Reviews";
import Storefront from "./pages/Storefront";
import CustomerAccount from "./pages/CustomerAccount";
import SellerPortal from "./pages/SellerPortal";
import { getMarketplaceSession } from "./auth";

function MarketplaceRoleRoute({ role, children }) {
  return getMarketplaceSession(role)
    ? children
    : <Navigate to={`/login?role=${role}`} replace />;
}

function ProtectedLayout() {

  const isLoggedIn =
    localStorage.getItem("adminLoggedIn") === "true";

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app">

      <Sidebar />

      <div className="main">

        <Topbar />

        <main className="content">

          <Routes>

            <Route
              path="/"
              element={<Dashboard />}
            />

            <Route
              path="/products"
              element={<Products />}
            />

            <Route
              path="/categories"
              element={<Categories />}
            />

            <Route
              path="/offers"
              element={<Offers />}
            />

            <Route
              path="/customers"
              element={<Customers />}
            />

            <Route
              path="/sellers"
              element={<Sellers />}
            />

            <Route
              path="/orders"
              element={<Orders />}
            />

            <Route
              path="/order-items"
              element={<OrderItems />}
            />

            <Route
              path="/payments"
              element={<Payments />}
            />

            <Route
              path="/delivery"
              element={<Delivery />}
            />

            <Route
              path="/reviews"
              element={<Reviews />}
            />

          </Routes>

        </main>

      </div>

    </div>
  );
}


function App() {

  return (

    <Routes>

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/shop"
        element={<Storefront />}
      />

      <Route
        path="/customer/account"
        element={(
          <MarketplaceRoleRoute role="customer">
            <CustomerAccount />
          </MarketplaceRoleRoute>
        )}
      />

      <Route
        path="/seller"
        element={(
          <MarketplaceRoleRoute role="seller">
            <SellerPortal />
          </MarketplaceRoleRoute>
        )}
      />

      <Route
        path="/*"
        element={<ProtectedLayout />}
      />

    </Routes>

  );
}

export default App;