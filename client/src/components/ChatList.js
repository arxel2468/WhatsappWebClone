// ChatList.js
import React from 'react';
import moment from 'moment';
import { FaCheckDouble, FaVolumeMute } from 'react-icons/fa';
import LoadingSpinner from './LoadingSpinner';

function ChatList({ contacts, selectedContact, setSelectedContact, loading }) {
  if (loading && contacts.length === 0) {
    return (
      <div className="chat-list">
        <div className="loading">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return '';
    
    // Remove any non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Format based on length
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length > 10) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 10)} ${cleaned.slice(10)}`;
    }
    
    return phoneNumber;
  };

  // Get random unread count for UI demonstration
  const getRandomUnreadCount = (waId) => {
    // Use the last digit of the phone number to determine if there are unread messages
    const lastDigit = parseInt(waId.slice(-1));
    return lastDigit > 7 ? lastDigit : 0;
  };

  // Get random online status for UI demonstration
  const isOnline = (waId) => {
    // Use the second-to-last digit to determine online status
    const digit = parseInt(waId.slice(-2, -1));
    return digit > 5;
  };

  return (
    <div className="chat-list">
      {contacts.length === 0 && !loading ? (
        <div className="no-contacts">
          <p>No conversations yet</p>
        </div>
      ) : (
        contacts.map(contact => {
          const unreadCount = getRandomUnreadCount(contact.wa_id);
          const online = isOnline(contact.wa_id);
          
          return (
            <div 
              key={contact.wa_id}
              className={`chat-item ${selectedContact && selectedContact.wa_id === contact.wa_id ? 'active' : ''}`}
              onClick={() => setSelectedContact(contact)}
            >
              <div className="chat-item-img">
                <img 
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name || contact.wa_id)}&background=random&color=fff`} 
                  alt={contact.name || contact.wa_id} 
                />
                {online && <div className="chat-item-status"></div>}
              </div>
              <div className="chat-item-info">
                <div className="chat-item-top">
                  <h4>{contact.name || formatPhoneNumber(contact.wa_id)}</h4>
                  <span className="chat-item-date">
                    {moment.unix(contact.timestamp).calendar(null, {
                      sameDay: 'h:mm A',
                      lastDay: '[Yesterday]',
                      lastWeek: 'dddd',
                      sameElse: 'MM/DD/YYYY'
                    })}
                  </span>
                </div>
                <div className="chat-item-bottom">
                  <div className="chat-item-message-container">
                    {contact.wa_id !== '918329446654' && (
                      <FaCheckDouble 
                        className="chat-item-message-status" 
                        size={16} 
                      />
                    )}
                    <p className="chat-item-message">{contact.last_message || 'No messages yet'}</p>
                  </div>
                  <div className="chat-item-badges">
                    {Math.random() > 0.7 && (
                      <span className="chat-item-muted">
                        <FaVolumeMute size={16} />
                      </span>
                    )}
                    {unreadCount > 0 && (
                      <span className="chat-item-badge">{unreadCount}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default ChatList;