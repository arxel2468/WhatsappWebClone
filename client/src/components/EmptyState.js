// EmptyState.js
import React from 'react';
import { FaLock } from 'react-icons/fa';

function EmptyState() {
  return (
    <div className="empty-state">
      {/* <img 
        src="https://web.whatsapp.com/img/intro-connection-light_c98cc75f2aa905314d74375a975d2cf2.jpg" 
        alt="WhatsApp Web" 
      /> */}
      <h2>WhatsApp Web Clone</h2>
      <p>
        Send and receive messages without keeping your phone online.
        Use WhatsApp on up to 4 linked devices and 1 phone at the same time.
      </p>
      <div className="empty-state-encryption">
        <FaLock size={12} />
        <span>End-to-end encrypted</span>
      </div>
    </div>
  );
}

export default EmptyState;