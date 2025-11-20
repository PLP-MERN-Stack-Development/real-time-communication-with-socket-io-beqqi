import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

function App() {
    const [username, setUsername] = useState('');
    const [connected, setConnected] = useState(false);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [typingUsers, setTypingUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);

    const socketRef = useRef(null);
    const typingTimeout = useRef(null);

    useEffect(() => {
        // create socket
        const socket = io(SOCKET_URL, { autoConnect: false });
        socketRef.current = socket;

        // connection handlers
        socket.on('connect', () => setConnected(true));
        socket.on('disconnect', () => setConnected(false));

        // incoming messages
        socket.on('receive_message', (msg) => {
            setMessages((prev) => [...prev, msg]);
        });

        socket.on('private_message', (msg) => {
            setMessages((prev) => [...prev, { ...msg, private: true }]);
        });

        // user list and notifications
        socket.on('user_list', (list) => setUsers(list));
        socket.on('user_joined', (u) =>
            setMessages((prev) => [
                ...prev,
                { id: `sys-${Date.now()}`, system: true, message: `${u.username} joined` },
            ])
        );
        socket.on('user_left', (u) =>
            setMessages((prev) => [
                ...prev,
                { id: `sys-${Date.now()}`, system: true, message: `${u.username} left` },
            ])
        );

        // typing
        socket.on('typing_users', (list) => setTypingUsers(list));

        return () => {
            socket.removeAllListeners();
            socket.close();
        };
    }, []);

    const join = () => {
        if (!username) return alert('Please enter a username');
        const socket = socketRef.current;
        socket.connect();
        socket.emit('user_join', username);
    };

    const sendMessage = () => {
        if (!message.trim()) return;
        const socket = socketRef.current;

        if (selectedUser) {
            // private message
            socket.emit('private_message', { to: selectedUser.id, message });
        } else {
            socket.emit('send_message', { message });
        }

        setMessage('');
        socket.emit('typing', false);
    };

    const handleTyping = (e) => {
        setMessage(e.target.value);
        const socket = socketRef.current;
        socket.emit('typing', true);

        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => {
            socket.emit('typing', false);
        }, 800);
    };

    return (
        <div style={{ padding: 20, fontFamily: 'Arial, sans-serif' }}>
            <h2>Real-Time Chat</h2>

            {!connected ? (
                <div style={{ marginBottom: 12 }}>
                    <input
                        placeholder="Enter username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <button onClick={join} style={{ marginLeft: 8 }}>
                        Join
                    </button>
                </div>
            ) : (
                <div style={{ marginBottom: 12 }}>
                    <strong>Connected as:</strong> {username}
                </div>
            )}

            <div style={{ display: 'flex', gap: 20 }}>
                <div style={{ flex: 1 }}>
                    <div
                        style={{
                            height: 300,
                            overflowY: 'auto',
                            border: '1px solid #ddd',
                            padding: 8,
                        }}
                    >
                        {messages.map((m) => (
                            <div key={m.id || Math.random()} style={{ marginBottom: 8 }}>
                                {m.system ? (
                                    <em style={{ color: '#666' }}>{m.message}</em>
                                ) : (
                                    <div>
                                        <strong>{m.sender || m.senderId}</strong>{' '}
                                        <span style={{ color: '#999', fontSize: 12 }}>
                                            {m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : ''}
                                        </span>
                                        <div>{m.message}</div>
                                        {m.private && <small style={{ color: '#b00' }}>Private</small>}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: 8 }}>
                        <input
                            style={{ width: '70%' }}
                            value={message}
                            onChange={handleTyping}
                            placeholder={selectedUser ? `Message ${selectedUser.username} (private)` : 'Type a message...'}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') sendMessage();
                            }}
                        />
                        <button onClick={sendMessage} style={{ marginLeft: 8 }}>
                            Send
                        </button>
                    </div>

                    <div style={{ marginTop: 6, color: '#666' }}>
                        {typingUsers.length > 0 && (
                            <div>{typingUsers.join(', ')} typing...</div>
                        )}
                    </div>
                </div>

                <div style={{ width: 220 }}>
                    <h4>Online Users</h4>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        <li
                            key="__all__"
                            style={{ padding: '6px 4px', cursor: 'pointer', background: selectedUser ? '' : '#eef' }}
                            onClick={() => setSelectedUser(null)}
                        >
                            <strong>Global Room</strong>
                        </li>
                        {users.map((u) => (
                            <li
                                key={u.id}
                                style={{ padding: '6px 4px', cursor: 'pointer', background: selectedUser?.id === u.id ? '#eef' : '' }}
                                onClick={() => setSelectedUser(u)}
                            >
                                {u.username}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default App;