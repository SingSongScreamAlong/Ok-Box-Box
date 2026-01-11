import './Header.css';

export function Header() {
  return (
    <header className="header">
      <div className="header-brand">
        <span className="brand-ok">Ok,</span>
        <span className="brand-box">Box Box</span>
      </div>
      
      <div className="header-title">
        <span className="title-product">RaceBox</span>
      </div>
      
      <div className="header-actions">
        <span className="version">v0.1.0</span>
      </div>
    </header>
  );
}
