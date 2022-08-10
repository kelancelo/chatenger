import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth0 } from "@auth0/auth0-react"
import { io } from 'socket.io-client'
import { useRef } from "react"
import { v4 as uuid } from 'uuid'
import Contact from "../components/contact"
import Message from "../components/message"
import '../styles/index.css'

const prodMode = false
const socket = prodMode
    ? io({ autoConnect: false })
    : io('http://localhost:5000', { autoConnect: false })

export default function Index() {
    const navigate = useNavigate()
    const { isAuthenticated, isLoading, user, logout } = useAuth0()
    const [users, setUsers] = useState()
    const [selectedUser, setSelectedUser] = useState()
    const [messages, setMessages] = useState()
    const [messagesToDisplay, setMessagesToDisplay] = useState()
    const messagesRef = useRef()
    const chatInputRef = useRef()
    // console.log('isLoading', isLoading)
    // console.log('isAuthenticated', isAuthenticated)

    useEffect(() => {
        if (!isLoading && !isAuthenticated) navigate('/login')
        if (!isLoading && isAuthenticated) {
            socket.auth = {
                user: user.given_name ?
                    {
                        id: user.sub,
                        email: user.email,
                        givenName: user.given_name,
                        familyName: user.family_name,
                        picture: user.picture
                    } :
                    {
                        id: user.sub,
                        email: user.email,
                        givenName: user.name,
                        familyName: null,
                        picture: user.picture
                    }
            }
            socket.connect()
            socket.on('users', users => setUsers(users))
            socket.on('online users', ids => setUsers(users => users.map(user => {
                if (ids.includes(user.id)) return { ...user, isOnline: true }
                else return user
            })))
            socket.on('messages', messages => setMessages(messages))
            socket.on('user connected', id => setUsers(users => users.map(user => {
                if (user.id === id) return { ...user, isOnline: true }
                else return user
            })))
            socket.on('chat message', message => {
                setMessages((messages) => [...messages, message])
            })
            socket.on('user disconnected', id => setUsers(users => users.map(user => {
                if (user.id === id) return { ...user, isOnline: false }
                else return user
            })))
        }
        return () => {
            socket.off('connect')
            socket.off('users')
            socket.off('messages')
            socket.off('online users')
            socket.off('user connected')
            socket.off('chat message')
            socket.off('disconnect')
        }
    }, [isLoading, isAuthenticated])

    useEffect(() => {
        messages && setMessagesToDisplay(messages.filter(message => {
            return (message.senderId === selectedUser && message.receiverId === user.sub) ||
                (message.senderId === user.sub && message.receiverId === selectedUser)
        }))
    }, [selectedUser, messages])

    useEffect(() => {
        if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }, [messagesToDisplay])

    function handleSubmit(e) {
        e.preventDefault()
        if (selectedUser) {
            const message = { id: uuid(), content: chatInputRef.current.value, senderId: user.sub, receiverId: selectedUser }
            socket.emit('chat message', message)
            setMessages([...messages, message])
            setMessagesToDisplay(messages.filter(message => {
                return (message.senderId === selectedUser && message.receiverId === user.sub) ||
                    (message.senderId === user.sub && message.receiverId === selectedUser)
            }))
            chatInputRef.current.value = ''
        }
        else alert('select a recipient first!')
    }

    if (!isLoading && isAuthenticated) return (
        <main id="index-main">
            <div id="greeting">
                <p>Hi {user.given_name ? user.given_name : user.name}!</p>
                <a id="logout-link" onClick={() => logout({ returnTo: window.location.origin })}>Logout</a>
            </div>
            <div id="chat-container">
                <div id="contacts">
                    {users && users.map(user => (
                        <Contact
                            key={user.id}
                            user={user}
                            selectedUser={selectedUser}
                            onClick={() => {
                                setSelectedUser(user.id)
                            }}
                        />
                    ))}
                </div>
                <div id="chatbox">
                    <div id="messages" ref={messagesRef}>
                        {messagesToDisplay && messagesToDisplay.map(message => (
                            <Message key={message.id} message={message} user={user} />
                        ))}
                    </div>
                    <form id="chat-form" onSubmit={handleSubmit}>
                        <input type="text" placeholder="Type a message..." required ref={chatInputRef} />
                        <button id="send-btn">Send</button>
                    </form>
                </div>
            </div>
        </main>
    )
}