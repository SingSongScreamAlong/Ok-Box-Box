import React from 'react';
import { Link } from 'react-router-dom';

function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">BlackBox</Link>
        <nav>
          <ul className="nav-links">
            <li><Link to="/">Dashboard</Link></li>
            <li><Link to="/telemetry">Telemetry</Link></li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

export default Header;
