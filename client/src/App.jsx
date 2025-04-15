import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

// --- MUI Imports ---
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import SendIcon from '@mui/icons-material/Send';
// --- End MUI Imports ---

import './App.css'; // Keep for potential global styles

const SERVER_URL = 'http://localhost:3001';
const socket = io(SERVER_URL, { autoConnect: false });

function App() {
  // --- State Variables ---
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [username, setUsername] = useState('');
  const [isUsernameSet, setIsUsernameSet] = useState(false);
  const [userList, setUserList] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [isTyping, setIsTyping] = useState(false);

  // --- Refs ---
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // --- Helper Functions ---
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // --- Effect for Socket Connection and Event Listeners ---
  useEffect(() => {
    if (isUsernameSet) {
      socket.connect();

      // Event Handlers
      function onConnect() { console.log('CLIENT: Connected as', username); setIsConnected(true); socket.emit('user joined', username); }
      function onDisconnect() { console.log('CLIENT: Disconnected'); setIsConnected(false); setUserList([]); setTypingUsers({}); }
      function onChatMessage(msgObject) { setMessages(prev => [...prev, msgObject]); }
      function onUserListUpdate(users) { setUserList(users); }
      function onUserTyping(typingUsername) { if(typingUsername !== username) { setTypingUsers(prev => ({ ...prev, [typingUsername]: true })); }}
      function onUserStoppedTyping(typingUsername) { setTypingUsers(prev => { const updated = { ...prev }; delete updated[typingUsername]; return updated; });}

      // Register Listeners
      socket.on('connect', onConnect); socket.on('disconnect', onDisconnect); socket.on('chat message', onChatMessage);
      socket.on('user list', onUserListUpdate); socket.on('user typing', onUserTyping); socket.on('user stopped typing', onUserStoppedTyping);

      // Cleanup Function
      return () => {
        console.log('CLIENT: Cleaning up listeners and disconnecting');
        socket.off('connect', onConnect); socket.off('disconnect', onDisconnect); socket.off('chat message', onChatMessage);
        socket.off('user list', onUserListUpdate); socket.off('user typing', onUserTyping); socket.off('user stopped typing', onUserStoppedTyping);
        socket.disconnect(); setIsConnected(false); setTypingUsers({});
      };
    }
  }, [isUsernameSet, username]);

  // --- Effect to Scroll Message List ---
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- Input Handlers ---
  const handleUsernameChange = (event) => {
    setUsername(event.target.value);
  };

  const handleSetUsername = () => {
    if (username.trim()) {
      setIsUsernameSet(true);
    }
  };

  // NOTE: handleUsernameKeyPress function is intentionally removed as it's unused with the form structure

  const handleInputChange = (event) => {
    const value = event.target.value;
    setCurrentMessage(value);

    // Typing indicator logic
    if (typingTimeoutRef.current) { clearTimeout(typingTimeoutRef.current); }
    if (!isTyping && value.length > 0) { socket.emit('start typing', username); setIsTyping(true); }
    typingTimeoutRef.current = setTimeout(() => { if (isTyping) { socket.emit('stop typing', username); setIsTyping(false); }}, 1500);
  };

  const sendMessage = () => {
    if (currentMessage.trim() && username) {
      const messageObject = { username: username, text: currentMessage };
      socket.emit('chat message', messageObject);
      setCurrentMessage('');

      // Stop typing indicator
      if (typingTimeoutRef.current) { clearTimeout(typingTimeoutRef.current); }
      if (isTyping) { socket.emit('stop typing', username); setIsTyping(false); }
    }
  };

  const handleMessageSendKeyPress = (event) => {
    // Allow Enter key (without Shift) to send message in TextField
    if (event.key === 'Enter' && !event.shiftKey) {
       event.preventDefault();
       sendMessage();
    }
  };


  // --- JSX Rendering ---

  // Username Prompt Screen using MUI
  if (!isUsernameSet) {
    return (
      <>
        <CssBaseline />
        <Container component="main" maxWidth="xs">
          <Paper elevation={3} sx={{ marginTop: 8, padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography component="h1" variant="h5" gutterBottom> Enter Username </Typography>
            <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSetUsername(); }} sx={{ mt: 1, width: '100%' }}>
              <TextField margin="normal" required fullWidth id="username" label="Your name..." name="username" autoFocus value={username} onChange={handleUsernameChange} />
              <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={!username.trim()}> Join Chat </Button>
            </Box>
          </Paper>
        </Container>
      </>
    );
  }

  // Main Chat Interface Screen using MUI
  return (
    <>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh', maxWidth: '1200px', margin: '0 auto', border: '1px solid #ddd', boxShadow: 3, bgcolor: 'background.paper' }}>
        {/* User List Panel */}
        <Paper elevation={1} square sx={{ width: '240px', flexShrink: 0, borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column'}}>
          <Typography variant="h6" sx={{ p: 2, borderBottom: '1px solid #ddd' }}> Online Users ({userList.length}) </Typography>
          <List sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
            {userList.map((user, index) => ( <ListItem key={index} dense> <ListItemText primaryTypographyProps={{ style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'} }} primary={user} /> </ListItem> ))}
          </List>
        </Paper>

        {/* Main Chat Area */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Chat Header */}
           <Paper elevation={1} square sx={{p: 1, textAlign: 'center', borderBottom: '1px solid #ddd'}}>
                <Typography variant="h6" component="div"> React Chat </Typography>
                 <Typography variant="caption" display="block" gutterBottom> Welcome, {username}! ({isConnected ? 'Connected' : 'Disconnected'}) </Typography>
            </Paper>

          {/* Message List */}
          <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, bgcolor: 'grey.100' }}>
            {messages.map((msg, index) => {
              const isOwnMessage = msg.username === username;
              return ( <Box key={index} sx={{ display: 'flex', justifyContent: isOwnMessage ? 'flex-end' : 'flex-start', mb: 1 }}> <Paper elevation={1} sx={{ p: '10px 14px', bgcolor: isOwnMessage ? 'primary.light' : 'secondary.light', color: isOwnMessage ? 'primary.contrastText' : 'secondary.contrastText', borderRadius: isOwnMessage ? '20px 20px 5px 20px' : '20px 20px 20px 5px', maxWidth: '70%' }}> {!isOwnMessage && ( <Typography variant="caption" display="block" sx={{ fontWeight: 'bold', mb: 0.5 }}> {msg.username} </Typography> )} <Typography variant="body1" sx={{ wordWrap: 'break-word' }}> {msg.text} </Typography> <Typography variant="caption" display="block" sx={{ mt: 0.5, textAlign: 'right', opacity: 0.7 }}> {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''} </Typography> </Paper> </Box> );
            })}
            <div ref={messagesEndRef} /> {/* For scrolling */}
          </Box>

          {/* Typing Indicator Area */}
          <Box sx={{ height: '25px', pl: 2, pt: 0.5, flexShrink: 0 }}>
             <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
               {(() => { const usersTyping = Object.keys(typingUsers).filter(u => typingUsers[u] && u !== username); if (usersTyping.length === 0) return <span>&nbsp;</span>; if (usersTyping.length === 1) return `${usersTyping[0]} is typing...`; if (usersTyping.length === 2) return `${usersTyping[0]} and ${usersTyping[1]} are typing...`; return `${usersTyping[0]}, ${usersTyping[1]} and ${usersTyping.length - 2} others are typing...`; })()}
             </Typography>
          </Box>

          {/* Input Area */}
          <Paper elevation={2} square sx={{ p: 1.5, borderTop: '1px solid #ddd', flexShrink: 0 }}>
            <Box component="form" onSubmit={(e) => { e.preventDefault(); sendMessage(); }} sx={{ display: 'flex', alignItems: 'center' }}>
              <TextField fullWidth size="small" variant="outlined" placeholder="Type your message..." value={currentMessage} onChange={handleInputChange} onKeyDown={handleMessageSendKeyPress} disabled={!isConnected} sx={{ mr: 1 }} />
              <Button type="submit" variant="contained" color="primary" endIcon={<SendIcon />} disabled={!isConnected || !currentMessage.trim()} > Send </Button>
            </Box>
          </Paper>
        </Box> {/* End Chat Area */}

      </Box> {/* End Main Container */}
    </>
  );
}

export default App;