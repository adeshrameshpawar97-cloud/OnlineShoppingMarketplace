import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PackageCheck, Package, TrendingUp } from "lucide-react";

function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      alert("Please enter username and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(data.message || "Invalid username or password.");
        return;
      }

      localStorage.setItem("adminLoggedIn", "true");
      localStorage.setItem("adminUsername", data.username);
      navigate("/");
    } catch (error) {
      console.error(error);
      alert("Unable to connect to backend.");
    } finally {
      setLoading(false);
    }
  };

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
          <h2>Admin Login</h2>
          <p className="login-subtitle">Enter your marketplace credentials</p>

          <form onSubmit={handleLogin}>
            <div className="login-field">
              <label>Username</label>
              <input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="login-field">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Logging in..." : "Login to dashboard"}
            </button>
          </form>

          <div className="demo-login">
            <strong>Demo Credentials</strong>
            <div>Username: admin</div>
            <div>Password: admin123</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;