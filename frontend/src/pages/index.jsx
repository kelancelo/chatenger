import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth0 } from "@auth0/auth0-react"
import { io } from 'socket.io-client'
import { useRef } from "react"
import { v4 as uuid } from 'uuid'
import Contact from "../components/contact"
import Message from "../components/message"
import '../styles/index.css'

// console.log(location.origin.replace(/^htt/, 'ws'))

const socket = import.meta.env.PROD
    ? io({ autoConnect: false })
    : io('http://localhost:5000', { autoConnect: false })

console.log(socket)

export default function Index() {
    const navigate = useNavigate()
    const { isAuthenticated, isLoading, user, logout } = useAuth0()
    const [users, setUsers] = useState([])
    const [selectedUser, setSelectedUser] = useState('')
    const [messages, setMessages] = useState([])
    const [messagesToShow, setMessagesToShow] = useState([])
    const messagesRef = useRef(null)
    const chatInputRef = useRef(null)
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
            socket.on('users', (users) => setUsers(users))
            socket.on('online users', (ids) => setUsers((users) => users.map((user) => {
                if (ids.includes(user.id)) return { ...user, isOnline: true }
                else return user
            })))
            socket.on('messages', (retrievedMessages) => setMessages(retrievedMessages))
            socket.on('user connected', (id) => setUsers((users) => users.map((user) => {
                if (user.id === id) return { ...user, isOnline: true }
                else return user
            })))
            socket.on('new user', (newUser) => {
                setUsers((users) => [...users, { ...newUser, isOnline: true }])
            })
            socket.on('chat message', (message) => {
                setMessages((messages) => [...messages, message])
            })
            socket.on('message has been read', (messageId) => setMessages((messages) => {
                return messages.map((message) => {
                    if (message.id === messageId) return { ...message, hasBeenRead: true }
                    else return message
                })
            }))
            socket.on('user disconnected', (id) => setUsers((users) => users.map((user) => {
                if (user.id === id) return { ...user, isOnline: false }
                else return user
            })))
        }
        return () => {
            socket.off('connect')
            socket.off('users')
            socket.off('online users')
            socket.off('messages')
            socket.off('user connected')
            socket.off('new user')
            socket.off('get messages')
            socket.off('chat message')
            socket.off('user disconnected')
            socket.off('message has been read')
            socket.off('disconnect')
        }
    }, [isLoading, isAuthenticated])

    useEffect(() => {
        setMessagesToShow(messages.filter((message) => {
            return selectedUser === message.senderId || selectedUser === message.receiverId
        }))
    }, [messages, selectedUser])

    useEffect(() => {
        if (messagesRef.current) {
            messagesRef.current.scrollTop = messagesRef.current.scrollHeight

            const observer = new IntersectionObserver((entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        // console.log(entry.target.dataset.messageId)
                        const messageId = entry.target.dataset.messageId
                        if (!messages.find((message) => message.id === messageId).hasBeenRead) {
                            socket.emit('message has been read', messageId)
                        }
                        observer.unobserve(entry.target)
                    }
                }
            }, {
                root: messagesRef.current,
                threshold: .8
            })
            for (const message of messagesRef.current.children) {
                observer.observe(message)
            }
            return () => {
                for (const message of messagesRef.current.children) {
                    observer.unobserve(message)
                }
            }
        }
    }, [messagesToShow])


    function handleSubmit(e) {
        e.preventDefault()
        if (selectedUser) {
            const message = {
                id: uuid(),
                content: chatInputRef.current.value,
                senderId: user.sub,
                receiverId: selectedUser
            }
            socket.emit('chat message', message)
            setMessages([...messages, message])
            chatInputRef.current.value = ''
        }
        else alert('select a recipient first!')
    }

    if (!isLoading && isAuthenticated) return (
        <main id="index-main">
            <div id="greeting">
                <p>Hi {user.given_name ? user.given_name : user.name}!</p>
                <a id="logout-link" onClick={() => logout({ returnTo: location.origin })}>Logout</a>
            </div>
            <div id="chat-container">
                <div id="contacts-container">
                    <span id="contacts-container-title">Contacts</span>
                    <div id="contacts">
                        {users && users.map(user => (
                            <Contact
                                key={user.id}
                                user={user}
                                messages={messages.filter((message) => user.id === message.senderId)}
                                selectedUser={selectedUser}
                                onClick={() => {
                                    setSelectedUser(user.id)
                                }}
                            />
                        ))}
                    </div>
                </div>
                <div id="chatbox">
                    <div id="messages-container">
                        <span id="messages-container-title">Messages</span>
                        <div id="messages" ref={messagesRef}>
                            {messagesToShow && messagesToShow.map(message => (
                                <Message key={message.id} message={message} user={user} />
                            ))}
                        </div>
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