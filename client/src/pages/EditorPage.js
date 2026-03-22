import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import axios from 'axios';
import { Controlled as CodeMirror } from 'react-codemirror2';

import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/dracula.css';
import 'codemirror/mode/clike/clike';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/display/placeholder';
import 'codemirror/addon/fold/foldcode';
import 'codemirror/addon/fold/foldgutter.css';
import 'codemirror/addon/fold/foldgutter';

const ACTIONS = {
    JOIN: 'join',
    JOINED: 'joined',
    DISCONNECTED: 'disconnected',
    CODE_CHANGE: 'code-change',
    SYNC_CODE: 'sync-code',
    LEAVE: 'leave',
};

const EditorPage = () => {
    const socketRef = useRef(null);
    const codeRef = useRef(null);
    const editorRef = useRef(null); // ✅ Track CodeMirror instance
    const location = useLocation();
    const { roomId } = useParams();
    const navigate = useNavigate();

    const [clients, setClients] = useState([]);
    const [code, setCode] = useState('// Welcome to the collaborative editor!\n\n');
    const [aiInput, setAiInput] = useState('');

    useEffect(() => {
        const init = async () => {
            socketRef.current = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:4000');
            
            socketRef.current.on('connect_error', (err) => handleErrors(err));
            
            socketRef.current.emit(ACTIONS.JOIN, {
                roomId,
                username: location.state?.username,
            });

            socketRef.current.on(ACTIONS.JOINED, ({ clients, username, socketId }) => {
                if (username !== location.state?.username) {
                    toast.success(`${username} joined the room.`);
                }
                setClients(clients);
                socketRef.current.emit(ACTIONS.SYNC_CODE, {
                    code: codeRef.current,
                    socketId,
                });
            });

            socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
                toast.success(`${username} left the room.`);
                setClients((prev) => prev.filter(client => client.socketId !== socketId));
            });

            socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
                if (code !== null) {
                    setCode(code);
                    codeRef.current = code;
                }
            });
        };

        init();

        return () => {
            socketRef.current.disconnect();
            socketRef.current.off(ACTIONS.JOINED);
            socketRef.current.off(ACTIONS.DISCONNECTED);
            socketRef.current.off(ACTIONS.CODE_CHANGE);
        };
    }, [roomId, location.state?.username]);

    const handleErrors = (e) => {
        console.log('Socket error:', e);
        toast.error('Socket connection failed, try again later.');
        navigate('/');
    };

    const handleCodeChange = (newCode) => {
        setCode(newCode);
        codeRef.current = newCode;
        socketRef.current.emit(ACTIONS.CODE_CHANGE, {
            roomId,
            code: newCode,
        });
    };

    const copyRoomId = async () => {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID has been copied to your clipboard');
        } catch (err) {
            toast.error('Could not copy the Room ID');
        }
    };

    const downloadCode = () => {
        const element = document.createElement('a');
        const file = new Blob([codeRef.current], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `code-${roomId}-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        toast.success('Code downloaded successfully!');
    };

    const handleAISuggestion = async () => {
        try {
            const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';
            const fullPrompt = `${codeRef.current}\n\n// Instruction:\n${aiInput}`;
            const res = await axios.post(
                `${backendUrl}/api/v1/ai/suggest`,
                { prompt: fullPrompt },
                { headers: { 'Content-Type': 'application/json' } }
            );
            const data = res.data;
            if (data.success) {
                const newCode = codeRef.current + '\n' + data.suggestion;
                setCode(newCode);
                codeRef.current = newCode;
                socketRef.current.emit(ACTIONS.CODE_CHANGE, { roomId, code: newCode });
                toast.success('AI suggestion added');
                setAiInput('');
            } else {
                toast.error('AI failed: ' + data.message);
            }
        } catch (err) {
            console.error(err);
            toast.error('AI error occurred');
        }
    };

    const leaveRoom = () => navigate('/home');

    if (!location.state) {
        navigate('/');
        return null;
    }

    return (
        <div className="editorPageContainer">
            {/* Sidebar */}
            <div className="editorSidebar">
                <div className="sidebarContent">
                    <div className="logoSection">
                        <img className="logoImage" src="/code-sync.png" alt="logo" />
                    </div>
                    <h3 className="connectedUsersTitle">Connected Users</h3>
                    <div className="clientsList">
                        {clients.map((client) => (
                            <div key={client.socketId} className="clientItem">
                                <span>{client.username}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="sidebarButtons">
                    <button className="sidebarBtn copyBtn" onClick={copyRoomId}>
                        Copy Room ID
                    </button>
                    <button className="sidebarBtn downloadBtn" onClick={downloadCode}>
                        📥 Download Code
                    </button>
                    <button className="sidebarBtn leaveBtn" onClick={leaveRoom}>
                        Leave Room
                    </button>
                </div>
            </div>

            {/* Main Editor Area */}
            <div className="editorMainArea">
                {/* ✅ Fixed editor container with explicit height */}
                <div style={{
                    flex: 1,
                    minHeight: 0,
                    height: 'calc(100vh - 91px)',
                    overflow: 'hidden'
                }}>
                    <CodeMirror
                        value={code}
                        options={{
                            mode: 'text/x-c++src',
                            theme: 'dracula',
                            lineNumbers: true,
                            autoCloseBrackets: true,
                            matchBrackets: true,
                            lineWrapping: false,  // ✅ false = horizontal scroll enabled
                            indentUnit: 4,
                            tabSize: 4,
                            indentWithTabs: false,
                            foldGutter: true,
                            gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
                            extraKeys: {
                                'Ctrl-Space': 'autocomplete',
                                'Tab': 'indentMore',
                                'Shift-Tab': 'indentLess'
                            }
                        }}
                        editorDidMount={(editor) => {
                            editorRef.current = editor;
                            editor.setSize(null, 'calc(100vh - 91px)'); // ✅ Explicit height
                            editor.refresh();
                             // ✅ Fix mouse scroll
                            editor.on('mousedown', () => editor.focus());
                            editor.getScrollerElement().style.overflowY = 'scroll';
                        }}
                        onBeforeChange={(editor, data, value) => handleCodeChange(value)}
                    />
                </div>

                {/* AI Input Section */}
                <div className="aiInputSection">
                    <textarea
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        placeholder="Describe what you want the AI to help with..."
                        className="aiTextarea"
                    />
                    <button
                        onClick={handleAISuggestion}
                        disabled={!aiInput.trim()}
                        className="aiSuggestionBtn"
                    >
                        💡 Get AI Suggestion
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditorPage;
