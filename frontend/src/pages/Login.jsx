import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PackageCheck, Package, TrendingUp } from "lucide-react";
import { saveMarketplaceSession } from "../auth";

const API = "http://localhost:5000/api";

function Login() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedRole = searchParams.get("role");
  const role = ["customer", "seller"].includes(requestedRole) ? requestedRole : "admin";
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(role === "admin" ? "admin123" : "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectRole = (nextRole) => {
    setSearchParams(nextRole === "admin" ? {} : { role: nextRole });
    setIsRegistering(false);
    setPassword(nextRole === "admin" ? "admin123" : "");
    setError("");
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    if (role === "admin" && (!username || !password)) {
      setError("Please enter username and password.");
      return;
    }
    if (role !== "admin" && (!email || !password || (isRegistering && (!name || !address)))) {
      setError("Complete all required fields.");
      return;
    }

    try {
      setLoading(true);
      const endpoint = role === "admin"
        ? `${API}/login`
        : isRegistering ? `${API}/auth/register/${role}` : `${API}/auth/login/${role}`;
      const body = role === "admin"
        ? { username, password }
        : {
          [role === "customer" ? "Customer_Name" : "Seller_Name"]: name,
          [role === "customer" ? "Customer_Email" : "Seller_Email"]: email,
          [role === "customer" ? "Customer_Phone" : "Seller_Phone"]: phone,
          [role === "customer" ? "Customer_Address" : "Seller_Address"]: address,
          email,
          password,
        };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to sign in.");
      }

      if (role === "admin") {
        localStorage.setItem("adminLoggedIn", "true");
        localStorage.setItem("adminUsername", data.username);
        navigate("/");
      } else {
        saveMarketplaceSession(role, data);
        navigate(role === "customer" ? "/shop" : "/seller");
      }
    } catch (loginError) {
      console.error(loginError);
      setError(loginError.message || "Unable to connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = role === "admin" ? "Admin" : role === "customer" ? "Customer" : "Seller";

  return (
    <div className="login-page">
      <div className="login-glow login-glow-one" />
      <div className="login-glow login-glow-two" />

      <div className="login-card">
        <div className="login-panel login-panel-brand">
          <div className="brand-mark large">G</div>
          <h1>GridMart</h1>
          <p>Built for modern commerce teams.</p>

          <div className="login-feature-list">
            <span><PackageCheck size={17} strokeWidth={1.8} aria-hidden="true" /> Real-time inventory</span>
            <span><Package size={17} strokeWidth={1.8} aria-hidden="true" /> Seller operations</span>
            <span><TrendingUp size={17} strokeWidth={1.8} aria-hidden="true" /> Growth insights</span>
          </div>
        </div>

        <div className="login-panel login-panel-form">
          <div className="login-logo">Shop<span>Sphere</span></div>
          <div className="login-role-tabs" aria-label="Choose account type">
            {["admin", "customer", "seller"].map((option) => (
              <button
                key={option}
                type="button"
                className={role === option ? "selected" : ""}
                onClick={() => selectRole(option)}
              >{option[0].toUpperCase() + option.slice(1)}</button>
            ))}
          </div>
          <h2>{isRegistering ? `Create ${roleLabel.toLowerCase()} account` : `${roleLabel} Login`}</h2>
          <p className="login-subtitle">
            {role === "admin" ? "Enter your marketplace credentials" : "Sign in to your own marketplace workspace"}
          </p>

          <form onSubmit={handleLogin}>
            {role === "admin" ? (
              <div className="login-field">
                <label>Username</label>
                <input
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </div>
            ) : isRegistering ? (
              <>
                <div className="login-field">
                  <label>Full name</label>
                  <input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
                </div>
                <div className="login-field">
                  <label>Email</label>
                  <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                </div>
                <div className="login-field">
                  <label>Phone <span>(optional)</span></label>
                  <input type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
                </div>
                <div className="login-field">
                  <label>Address</label>
                  <input required autoComplete="street-address" value={address} onChange={(event) => setAddress(event.target.value)} />
                </div>
              </>
            ) : (
              <div className="login-field">
                <label>Email</label>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            )}

            <div className="login-field">
              <label>Password {isRegistering && <span>(at least 8 characters)</span>}</label>
              <input
                required
                minLength={isRegistering ? 8 : undefined}
                type="password"
                autoComplete={isRegistering ? "new-password" : "current-password"}
                placeholder="Enter password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {error && <p className="login-error" role="alert">{error}</p>}
            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Please wait..." : isRegistering ? "Create account" : `Login as ${roleLabel.toLowerCase()}`}
            </button>
          </form>

          {role === "admin" ? (
            <div className="demo-login">
              <strong>Demo Credentials</strong>
              <div>Username: admin</div>
              <div>Password: admin123</div>
            </div>
          ) : (
            <p className="login-account-switch">
              {isRegistering ? "Already have an account?" : "New to GridMart?"}{" "}
              <button type="button" onClick={() => { setIsRegistering(!isRegistering); setError(""); }}>
                {isRegistering ? "Sign in" : "Create an account"}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
