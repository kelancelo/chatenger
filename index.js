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

io.on('connection', async (socket) => {
    const { id, email, givenName, familyName, picture } = socket.handshake.auth.user // extract user data
    const newUser = await saveUser(id, email, givenName, familyName, picture)
    const onlineUsers = []
    for (const [id, socket] of io.of("/").sockets) {     // get current online users
        onlineUsers.push(socket.handshake.auth.user.id)
    }
    socket.join(id)
    console.log('a user has connected:', id)

    if (newUser) socket.broadcast.emit('new user', newUser) // if user is new to the system, broadcast it so the logged in users will be able to add the new user in their contacts panel.
    socket.emit('users', await getUsers(id))
    socket.emit('online users', onlineUsers)
    socket.emit('messages', await getMessages(id))
    socket.broadcast.emit('user connected', id) // same functionality as the "online users" event except this is for when a user goes online, the current online users will be able to see the status indicator change for that user.

    socket.on('get messages', async (senderId, receiverId) => {
        socket.emit('get messages', await getMessages(senderId, receiverId))
    })
    socket.on('chat message', async ({ id, content, senderId, receiverId }) => {
        const newMessage = await saveMessage(id, content, senderId, receiverId)
        io.to(senderId).to(receiverId).emit('chat message', newMessage)
    })
    socket.on('message has been read', async (messageId) => {
        const { id } = await updateMessage(messageId)
        socket.emit('message has been read', id)
    })
    socket.on('disconnect', () => {
        console.log('a user has disconnected.')
        socket.broadcast.emit('user disconnected', id) // changes the color of status indicator for the user to red.
    })
})


server.listen(port, () => console.log(`Server listening on port ${port}`))