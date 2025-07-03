import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { FaSync, FaTimes, FaTerminal, FaSearch, FaFilter, FaTrash } from 'react-icons/fa';
import './UserTerminal.css';

// Highlight log messages based on content
function highlight(log) {
  if (!log || typeof log !== 'string') return log;
  
  // Extract timestamp if present
  const timestampMatch = log.match(/^\[(.*?)\]\s*(.*)/);
  const timestamp = timestampMatch ? timestampMatch[1] : '';
  const message = timestampMatch ? timestampMatch[2] : log;
  
  let className = 'terminal-log';
  let content = message;
  
  // Apply different styles based on message content
  if (/error|fail|denied|failed|exception|timeout|rejected/i.test(message)) {
    className += ' error';
  } else if (/success|complete|done|connected|ready|started/i.test(message)) {
    className += ' success';
  } else if (/warn|warning|notice|info|debug|trace/i.test(message)) {
    className += ' info';
  } else if (/command|order|ai|admin|user|login|register|auth/i.test(message)) {
    className += ' command';
  }
  
  return (
    <div className={className}>
      {timestamp && <span className="terminal-timestamp">[{timestamp}]</span>}
      <span className="terminal-message">{content}</span>
    </div>
  );
}

export default function UserTerminal() {
  const { 
    logs, 
    isConnected, 
    reconnect, 
    clearLogs: clearAllLogs,
    sendMessage 
  } = useWebSocket();
  
  const [isOpen, setIsOpen] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter logs based on selected filter and search term
  const filteredLogs = useCallback(() => {
    return logs.filter(log => {
      // Apply filter
      if (filter !== 'all') {
        const logStr = String(log).toLowerCase();
        if (filter === 'error' && !/error|fail|exception|timeout|rejected/i.test(logStr)) {
          return false;
        } else if (filter === 'success' && !/success|complete|done|connected/i.test(logStr)) {
          return false;
        } else if (filter === 'command' && !/command|order|ai|admin|user|login|register|auth/i.test(logStr)) {
          return false;
        }
      }
      
      // Apply search
      if (searchTerm) {
        return String(log).toLowerCase().includes(searchTerm.toLowerCase());
      }
      
      return true;
    });
  }, [logs, filter, searchTerm]);
  
  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);
  
  // Handle manual scroll to detect if user wants to disable auto-scroll
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop <= clientHeight + 10;
    
    if (autoScroll && !isAtBottom) {
      setAutoScroll(false);
    } else if (!autoScroll && isAtBottom) {
      setAutoScroll(true);
    }
  }, [autoScroll]);
  
  // Toggle auto-scroll
  const toggleAutoScroll = useCallback(() => {
    setAutoScroll(prev => !prev);
    if (!autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [autoScroll]);
  
  // Clear logs
  const clearLogs = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all logs?')) {
      clearAllLogs();
    }
  }, [clearAllLogs]);
  
  // Send test message
  const sendTestMessage = useCallback(() => {
    sendMessage({
      type: 'TEST',
      message: 'This is a test message from the client',
      timestamp: new Date().toISOString()
    });
  }, [sendMessage]);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  // Shooting star animation on major events
  useEffect(() => {
    if (logs.length > 0 && /order|success|ai|admin/i.test(logs[logs.length-1])) {
      const el = document.createElement('div');
      el.className = 'shooting-star';
      document.body.appendChild(el);
      setTimeout(() => {
        if (document.body.contains(el)) {
          document.body.removeChild(el);
        }
      }, 1200);
    }
  }, [logs]);
  
  // Add connection status logs
  useEffect(() => {
    if (isConnected) {
      // addLog('🔌 WebSocket connected');
    } else {
      // addLog('⚠️ WebSocket disconnected. Reconnecting...');
    }
  }, [isConnected]);

  return (
    <div className={`user-terminal ${isOpen ? 'open' : 'closed'}`}>
      {/* Header */}
      <div 
        className="terminal-header" 
        onClick={() => !isOpen && setIsOpen(true)}
      >
        <div className="terminal-header-left">
          <FaTerminal className="terminal-icon" />
          <span className="terminal-title">Terminal</span>
          <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        <div className="terminal-actions">
          {isOpen && (
            <>
              <button 
                className="terminal-button" 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFilters(!showFilters);
                }}
                title="Filters"
              >
                <FaFilter />
              </button>
              
              <button 
                className="terminal-button" 
                onClick={(e) => {
                  e.stopPropagation();
                  clearLogs();
                }}
                title="Clear logs"
              >
                <FaTrash />
              </button>
              
              {!isConnected && (
                <button 
                  className="terminal-button reconnect" 
                  onClick={(e) => {
                    e.stopPropagation();
                    reconnect();
                  }}
                  title="Reconnect"
                >
                  <FaSync />
                </button>
              )}
              
              <button 
                className="terminal-button toggle" 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                title="Minimize"
              >
                <FaTimes />
              </button>
            </>
          )}
          
          {!isOpen && (
            <div className="terminal-badge">
              {logs.length}
            </div>
          )}
        </div>
      </div>
      
      {/* Filters */}
      {isOpen && showFilters && (
        <div className="terminal-filters" onClick={(e) => e.stopPropagation()}>
          <div className="filter-group">
            <label>Filter by type:</label>
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Messages</option>
              <option value="error">Errors</option>
              <option value="success">Success</option>
              <option value="command">Commands</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </label>
          </div>
          
          <div className="filter-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={toggleAutoScroll}
                className="checkbox"
              />
              Auto-scroll
            </label>
            
            <button 
              className="test-button"
              onClick={sendTestMessage}
              disabled={!isConnected}
              title="Send test message"
            >
              Test Connection
            </button>
          </div>
        </div>
      )}
      
      {/* Logs */}
      {isOpen && (
        <div 
          className="terminal-logs" 
          ref={scrollRef}
          onScroll={handleScroll}
        >
          <div className="logs-container">
            {filteredLogs().length > 0 ? (
              filteredLogs().map((log, index) => (
                <div key={index} className="log-entry">
                  {highlight(log)}
                </div>
              ))
            ) : (
              <div className="no-logs">
                {searchTerm || filter !== 'all' 
                  ? 'No matching logs found' 
                  : 'No logs to display'}
              </div>
            )}
          </div>
          
          {!autoScroll && (
            <button 
              className="scroll-to-bottom"
              onClick={() => {
                setAutoScroll(true);
                if (scrollRef.current) {
                  scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
              }}
            >
              Scroll to bottom
            </button>
          )}
        </div>
      )}
    </div>
  );
}
