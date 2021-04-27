const React = require('react');

function Footer(props) {
  return (
    <footer className='nav-footer' id='footer'>
      <section className='copyright'>{props.config.copyright}</section>
    </footer>
  );
}

module.exports = Footer;
