// ChatWindow.js
import React, { useState, useRef, useEffect } from 'react';
import moment from 'moment';
import { 
  FaCheck, 
  FaCheckDouble, 
  FaPaperclip, 
  FaMicrophone, 
  FaSmile, 
  FaSearch,
  FaEllipsisV,
  FaArrowLeft
} from 'react-icons/fa';
import { IoSend } from 'react-icons/io5';
import LoadingSpinner from './LoadingSpinner';

function ChatWindow({ contact, messages, sendMessage, loading }) {
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const chatBodyRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
    
    // Simulate typing indicator randomly
    const randomTyping = () => {
      if (Math.random() > 0.7 && contact.wa_id !== '918329446654') {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 3000);
      }
    };
    
    const typingInterval = setInterval(randomTyping, 10000);
    
    return () => clearInterval(typingInterval);
  }, [contact]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMessage(newMessage);
      setNewMessage('');
      // Focus back on input after sending
      inputRef.current.focus();
    }
  };

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

  const renderMessageStatus = (status) => {
    switch (status) {
      case 'sent':
        return <FaCheck className="chat-message-status" size={12} />;
      case 'delivered':
        return <FaCheckDouble className="chat-message-status" size={12} style={{ color: '#667781' }} />;
      case 'read':
        return <FaCheckDouble className="chat-message-status status-transition" size={12} style={{ color: '#53bdeb' }} />;
      default:
        return <FaCheck className="chat-message-status" size={12} />;
    }
  };

  // Group messages by date
  const groupMessagesByDate = () => {
    const groups = {};
    
    messages.forEach(message => {
      const date = moment.unix(message.timestamp).format('MMMM D, YYYY');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return groups;
  };

  // Check if user is online based on wa_id (for demo purposes)
  const isOnline = () => {
    const digit = parseInt(contact.wa_id.slice(-2, -1));
    return digit > 5;
  };

  // Get last seen time (for demo purposes)
  const getLastSeen = () => {
    const timestamp = contact.timestamp - Math.floor(Math.random() * 3600);
    return moment.unix(timestamp).calendar(null, {
      sameDay: '[Today at] h:mm A',
      lastDay: '[Yesterday at] h:mm A',
      lastWeek: '[Last] dddd [at] h:mm A',
      sameElse: 'MM/DD/YYYY [at] h:mm A'
    });
  };

  if (loading) {
    return (
      <div className="chat-window">
        <div className="loading">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate();
  const online = isOnline();

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="chat-header-img">
          <img 
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name || contact.wa_id)}&background=random&color=fff`} 
            alt={contact.name || contact.wa_id}
          />
          {online && <div className="chat-header-status"></div>}
        </div>
        <div className="chat-header-info">
          <h3>{contact.name || formatPhoneNumber(contact.wa_id)}</h3>
          <p>{online ? 'online' : `last seen ${getLastSeen()}`}</p>
        </div>
        <div className="chat-header-right">
          <div className="tooltip">
            <FaSearch size={18} />
            <span className="tooltip-text">Search</span>
          </div>
          <div className="tooltip">
            <FaEllipsisV size={18} />
            <span className="tooltip-text">Menu</span>
          </div>
        </div>
      </div>

      <div className="chat-body" ref={chatBodyRef}>
        {Object.entries(messageGroups).map(([date, msgs]) => (
          <div key={date} className="fade-in">
            <div className="chat-date">
              <span>{date}</span>
            </div>
            {msgs.map((message) => (
              <div 
                key={message._id} 
                className={`chat-message ${message.direction === 'inbound' ? 'received' : 'sent'} fade-in`}
              >
                <p>{message.text.body}</p>
                <div className="chat-message-time">
                  {moment.unix(message.timestamp).format('h:mm A')}
                  {message.direction === 'outbound' && renderMessageStatus(message.status)}
                </div>
              </div>
            ))}
          </div>
        ))}
        
        {isTyping && (
          <div className="typing-indicator fade-in">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-footer">
        <div className="chat-footer-left">
          <div className="tooltip">
            <FaSmile size={24} color="#54656f" />
            <span className="tooltip-text">Emoji</span>
          </div>
          <div className="tooltip">
            <FaPaperclip size={24} color="#54656f" />
            <span className="tooltip-text">Attach</span>
          </div>
        </div>
        <form className="chat-footer-input" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a message"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            autoFocus
          />
        </form>
        <div className="chat-footer-right">
          <div className="tooltip">
            {newMessage.trim() ? (
              <IoSend size={24} color="#54656f" onClick={handleSubmit} />
            ) : (
              <FaMicrophone size={24} color="#54656f" />
            )}
            <span className="tooltip-text">
              {newMessage.trim() ? "Send" : "Voice message"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatWindow;