import logoImg from "./img/logo.svg";
import "./Logo.css";

/* Kept as an <img> (not a ThemedIcon mask): the DRAW letters carry their own colors,
   which the theme only inverts on dark backgrounds (see --cyber-logo-filter). */
const Logo = () => (
  <div className="Logo">
    <img src={logoImg} alt="Type Draw Type Game" />
  </div>
);

export default Logo;
