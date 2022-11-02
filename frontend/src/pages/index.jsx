import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth0 } from "@auth0/auth0-react"
import { io } from 'socket.io-client'
import { useRef } from "react"
import { v4 as uuid } from 'uuid'
import Contact from "../components/contact"
import Message from "../components/message"
import '../styles/index.css'


const socket = import.meta.env.PROD
    // "autoConnect: false" won't automatically connect the client to the server socket
    // so the client will be able to prepare the data to be sent to the server socket
    // before connecting

    // in PROD mode, I serve the frontend in the same domain as my server.
    // if the frontend is served on the same domain as the server, 
    // the URL of the server can be omitted because
    // the URL can be deduced from the "window.location object".  
    ? io({ autoConnect: false })

    // if in DEV mode, specify the URL of the local dev server 
    : io('http://localhost:5000', { autoConnect: false })

// console.log(socket)

export default function Index() {
    const navigate = useNavigate()
    const { isAuthenticated, isLoading, user, logout } = useAuth0()
    const [users, setUsers] = useState([])
    const [selectedUser, setSelectedUser] = useState('') // stores the id
    const [messages, setMessages] = useState([])
    const [messagesToShow, setMessagesToShow] = useState([])
    const messagesRef = useRef(null)
    const chatInputRef = useRef(null)


    useEffect(() => {
        if (!isLoading && !isAuthenticated) navigate('/login')
        if (!isLoading && isAuthenticated) {
            // data sent when connecting to the server
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

            // connect to the server
            socket.connect()

            // list of users sent by the server
            socket.on('users', (users) => setUsers(users))

            // list of IDs of online users sent by the server
            socket.on('online users', (ids) => setUsers((users) => users.map((user) => {
                if (ids.includes(user.id)) return { ...user, isOnline: true }
                else return user
            })))

            // list of messages sent and received by the user sent by the server
            socket.on('messages', (retrievedMessages) => {
                setMessages(retrievedMessages)
            })

            // id of the user who just went online
            socket.on('user connected', (id) => setUsers((users) => users.map((user) => {
                if (user.id === id) return { ...user, isOnline: true }
                else return user
            })))

            // show the new user the other users' contact list
            socket.on('new user', (newUser) => {
                setUsers((users) => [...users, { ...newUser, isOnline: true }])
            })

            // update the "messages" state when this event happens
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

    
    // trigerred when messages are received from the server for the first time or 
    // when a "chat message" event happens or
    // when a "message has been read" even happens.
    // it updates the messages shown in the messages window
    useEffect(() => {
        setMessagesToShow(messages.filter((message) => {
            return selectedUser === message.senderId || selectedUser === message.receiverId
        }))
    }, [messages])


    // change the messages shown on the messages window if the selected user in the contacts list
    // window changed
    useEffect(() => {
        setMessagesToShow(messages.filter((message) => {
            return selectedUser === message.senderId || selectedUser === message.receiverId
        }))
    }, [selectedUser])


    useEffect(() => {
        if (messagesRef.current) {
            // scroll to the bottom of the messages list
            messagesRef.current.scrollTop = messagesRef.current.scrollHeight

            const observer = new IntersectionObserver((entries) => {
                for (const entry of entries) {
                    // if a message is visible in the messages list,
                    // check if the message has not been read yet and
                    // if the one reading it is the receiver so its
                    // "hasBeenRead" property can be updated
                    if (entry.isIntersecting) {
                        const messageId = entry.target.dataset.messageId
                        const message = messages.find((message) => message.id === messageId)
                        if (!(message.hasBeenRead) && (user.sub === message.receiverId)) {
                            socket.emit('message has been read', messageId)
                        }
                        observer.unobserve(entry.target)
                    }
                }
            }, {
                root: messagesRef.current,
                threshold: .6
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
            chatInputRef.current.value = ''
        }
        else alert('select a recipient first!')
    }


    if (!isLoading && isAuthenticated) return (
        <div id="index-body">
            <header>
                <p>Hi {user.given_name ? user.given_name : user.name}!</p>
                <a id="logout-link" onClick={() => logout({ returnTo: location.origin })}>Logout</a>
            </header>
            <main>
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
            </main>
        </div>
    )
}