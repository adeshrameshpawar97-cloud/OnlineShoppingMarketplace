function Topbar() {
  return (
    <header className="topbar">

      <div>
        <h1>Online Shopping Marketplace</h1>

        <p>
          Database Management System Project
        </p>
      </div>

      <div className="profile">

        <span className="notification">
          🔔
        </span>

        <div className="avatar">
          A
        </div>

        <div className="profile-info">
          <strong>Admin</strong>
          <small>Administrator</small>
        </div>

      </div>

    </header>
  );
}

export default Topbar;