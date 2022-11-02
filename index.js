const express = require('express')
const app = express()
const server = require('http').createServer(app)
const { Server } = require('socket.io')
// const io = new Server(server)
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173"]
    }
})
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
require('dotenv').config()
const port = process.env.PORT || 5000
const path = require('path')


app.use(express.static('frontend/dist'))


app.all('/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'))
})


io.on('connection', async (socket) => {
    // extract user data when a user connects to socket server
    const { id, email, givenName, familyName, picture } = socket.handshake.auth.user

    // this function saves the user in the DB if it doesn't exist 
    const newUser = await saveUser(id, email, givenName, familyName, picture)
    
    // if user is new to the system, broadcast it so other users will be able to see the new user 
    // in their contacts list.
    if (newUser) socket.broadcast.emit('new user', newUser) 

    // join user to a room identified by their id
    socket.join(id)
    console.log('a user has connected:', id)
    
    // send all users except the logged in user to the user
    socket.emit('users', await getUsers(id))

    // get online users' IDs
    const onlineUsers = []
    for (const [id, socket] of io.of("/").sockets) {
        onlineUsers.push(socket.handshake.auth.user.id)
    }

    // send online users' IDs to the user
    socket.emit('online users', onlineUsers)

    // send all messages sent and received by the logged in user
    socket.emit('messages', await getMessages(id))
    
    // same functionality as the "online users" event except this is for when an offline user goes online, 
    // the online users will be able to see the status indicator change for that user.
    socket.broadcast.emit('user connected', id)

    socket.on('get messages', async (senderId, receiverId) => {
        socket.emit('get messages', await getMessages(senderId, receiverId))
    })

    // save the message to the DB received from sender
    socket.on('chat message', async ({ id, content, senderId, receiverId }) => {
        const newMessage = await saveMessage(id, content, senderId, receiverId)
        if (newMessage)
            // send the message to sender and receiver
            io.to(senderId).to(receiverId).emit('chat message', newMessage)
    })

    // update the message's "hasBeenRead" property when a user reads a message
    socket.on('message has been read', async (messageId) => {
        const { id } = await updateMessage(messageId)
        if (id)
            // tell the user that the update is done
            socket.emit('message has been read', id)
    })


    socket.on('disconnect', () => {
        console.log('a user has disconnected.')
        // changes the color of status indicator for the user to red.
        socket.broadcast.emit('user disconnected', id)
    })
})


async function saveUser(id, email, givenName, familyName, picture) {
    const user = await prisma.user.findUnique({
        where: { id: id }
    })
    if (user) {
        return
    }
    else {
        const newUser = await prisma.user.create({
            data: {
                id,
                email,
                givenName,
                familyName,
                picture
            }
        })
        return newUser
    }
}


async function getUsers(id) {
    return await prisma.user.findMany({
        where: {
            NOT: {
                id: id
            }
        }
    })
}


async function getMessages(id) {
    return await prisma.message.findMany({
        where: {
            OR: [
                { senderId: id },
                { receiverId: id }
            ]
        },
        orderBy: {
            date_sent: 'asc',
        }
    })
}


async function saveMessage(id, content, senderId, receiverId) {
    return await prisma.message.create({
        data: {
            id,
            content,
            senderId,
            receiverId
        }
    })
}


async function updateMessage(id) {
    return await prisma.message.update({
        where: { id: id },
        data: { hasBeenRead: true }
    })
}


server.listen(port, () => console.log(`Server listening on port ${port}`))