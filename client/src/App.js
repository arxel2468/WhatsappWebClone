// App.js
import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import './App.css';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';
import EmptyState from './components/EmptyState';
import SampleLoader from './components/SampleLoader';
import LoadingSpinner from './components/LoadingSpinner';
import { 
  FaCircleNotch, 
  FaCommentAlt, 
  FaEllipsisV, 
  FaSearch, 
  FaArrowLeft,
  FaMoon,
  FaSun
} from 'react-icons/fa';

// Get the current hostname
const currentHost = window.location.hostname;

// Determine if we're running locally or on a deployed server
const isLocalhost = currentHost === 'localhost' || currentHost === '127.0.0.1';

// Set the API and Socket.IO URLs based on the environment
const API_URL = isLocalhost 
  ? 'http://localhost:5000/api' 
  : `${window.location.origin}/api`;

const SOCKET_URL = isLocalhost 
  ? 'http://localhost:5000' 
  : window.location.origin;

console.log('API URL:', API_URL);
console.log('Socket URL:', SOCKET_URL);

function App() {
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSampleLoader, setShowSampleLoader] = useState(true);
  const [searchActive, setSearchActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const socketRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    // Connect to Socket.IO
    try {
      socketRef.current = io(SOCKET_URL, {
        reconnectionAttempts: 5,
        timeout: 10000,
        transports: ['websocket', 'polling']
      });
      
      // Listen for connection events
      socketRef.current.on('connect', () => {
        console.log('Socket.IO connected');
        setConnectionError(false);
      });
      
      socketRef.current.on('connect_error', (err) => {
        console.error('Socket.IO connection error:', err);
        setConnectionError(true);
      });
      
      // Listen for new messages
      socketRef.current.on('new-message', (newMessage) => {
        console.log('New message received:', newMessage);
        
        if (selectedContact && newMessage.wa_id === selectedContact.wa_id) {
          setMessages(prevMessages => [...prevMessages, newMessage]);
        }
        
        // Update contact list with new message
        setContacts(prevContacts => {
          const updatedContacts = [...prevContacts];
          const contactIndex = updatedContacts.findIndex(c => c.wa_id === newMessage.wa_id);
          
          if (contactIndex !== -1) {
            updatedContacts[contactIndex] = {
              ...updatedContacts[contactIndex],
              last_message: newMessage.text.body,
              timestamp: newMessage.timestamp
            };
            
            // Sort contacts by timestamp
            updatedContacts.sort((a, b) => b.timestamp - a.timestamp);
          } else {
            // Add new contact
            updatedContacts.push({
              wa_id: newMessage.wa_id,
              name: newMessage.contact_name || newMessage.wa_id,
              last_message: newMessage.text.body,
              timestamp: newMessage.timestamp
            });
            
            // Sort contacts by timestamp
            updatedContacts.sort((a, b) => b.timestamp - a.timestamp);
          }
          
          return updatedContacts;
        });
      });
      
      // Listen for status updates
      socketRef.current.on('status-update', (update) => {
        console.log('Status update received:', update);
        
        if (selectedContact) {
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.id === update.id ? { ...msg, status: update.status } : msg
            )
          );
        }
      });
    } catch (error) {
      console.error('Error initializing Socket.IO:', error);
      setConnectionError(true);
    }
    
    // Fetch contacts
    fetchContacts();
    
    // Check for dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.body.classList.add('dark-mode');
    }
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (selectedContact) {
      fetchMessages(selectedContact.wa_id);
    }
  }, [selectedContact]);

  useEffect(() => {
    if (searchActive && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchActive]);

  useEffect(() => {
    // Save dark mode preference
    localStorage.setItem('darkMode', darkMode);
    
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/contacts`);
      setContacts(response.data);
      
      // Hide sample loader if we have contacts
      if (response.data.length > 0) {
        setShowSampleLoader(false);
      }
      
      setLoading(false);
      setConnectionError(false);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setLoading(false);
      setConnectionError(true);
    }
  };

  const fetchMessages = async (wa_id) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/messages/${wa_id}`);
      setMessages(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setLoading(false);
    }
  };

  const sendMessage = async (text) => {
    if (!selectedContact || !text.trim()) return;
    
    try {
      // Create a temporary message to show immediately
      const tempMessage = {
        _id: `temp-${Date.now()}`,
        id: `local-${Date.now()}`,
        meta_msg_id: `local-${Date.now()}`,
        wa_id: selectedContact.wa_id,
        from: '918329446654', // Your business number
        timestamp: Math.floor(Date.now() / 1000),
        type: 'text',
        text: { body: text },
        status: 'sent',
        direction: 'outbound',
        contact_name: selectedContact.name
      };
      
      // Add the message to the UI immediately
      setMessages(prevMessages => [...prevMessages, tempMessage]);
      
      // Send the message to the server
      await axios.post(`${API_URL}/messages`, {
        wa_id: selectedContact.wa_id,
        text,
        contact_name: selectedContact.name
      });
      
      // The actual message with server-generated ID will be added via socket.io
    } catch (error) {
      console.error('Error sending message:', error);
      // Optionally show an error to the user
    }
  };

  const handleSampleLoad = () => {
    fetchContacts();
    setShowSampleLoader(false);
  };

  const toggleSearch = () => {
    setSearchActive(!searchActive);
    if (!searchActive) {
      setSearchTerm('');
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const filteredContacts = contacts.filter(contact => {
    if (!searchTerm) return true;
    
    const name = contact.name || '';
    const phone = contact.wa_id || '';
    const message = contact.last_message || '';
    
    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phone.includes(searchTerm) ||
      message.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Show connection error message
  if (connectionError && contacts.length === 0) {
    return (
      <div className="connection-error">
        <div className="error-container">
          <h2>Connection Error</h2>
          <p>Unable to connect to the server. Please try again later.</p>
          <button onClick={fetchContacts}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`app ${darkMode ? 'dark-mode' : ''}`}>
      <div className="app-container">
        <div className="sidebar">
          <div className="header">
            <div className="user-img">
              <img src="https://ui-avatars.com/api/?name=Me&background=128c7e&color=fff" alt="User" />
            </div>
            <div className="header-icons">
              <div className="tooltip" onClick={toggleDarkMode}>
                {darkMode ? (
                  <FaSun size={20} />
                ) : (
                  <FaMoon size={20} />
                )}
                <span className="tooltip-text">
                  {darkMode ? "Light mode" : "Dark mode"}
                </span>
              </div>
              <div className="tooltip">
                <FaCircleNotch size={20} />
                <span className="tooltip-text">Status</span>
              </div>
              <div className="tooltip">
                <FaCommentAlt size={20} />
                <span className="tooltip-text">New chat</span>
              </div>
              <div className="tooltip">
                <FaEllipsisV size={20} />
                <span className="tooltip-text">Menu</span>
              </div>
            </div>
          </div>
          
          <div className="search-container">
            <div className={`search ${searchActive ? 'active' : ''}`}>
              {searchActive ? (
                <FaArrowLeft 
                  className="search-back" 
                  size={16} 
                  onClick={toggleSearch} 
                />
              ) : (
                <FaSearch 
                  className="search-icon" 
                  size={16} 
                />
              )}
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Search or start new chat" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setSearchActive(true)}
              />
            </div>
          </div>
          
          <ChatList 
            contacts={filteredContacts} 
            selectedContact={selectedContact}
            setSelectedContact={setSelectedContact}
            loading={loading}
          />
        </div>
        
        {selectedContact ? (
          <ChatWindow 
            contact={selectedContact}
            messages={messages}
            sendMessage={sendMessage}
            loading={loading}
          />
        ) : (
          <EmptyState />
        )}
      </div>
      
      {showSampleLoader && (
        <SampleLoader onLoad={handleSampleLoad} apiUrl={API_URL} />
      )}
    </div>
  );
}

export default App;