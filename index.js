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

app.use(express.static('frontend/dist'))

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
            date_sent: 'asc'
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

io.on('connection', async (socket) => {
    const { id, email, givenName, familyName, picture } = socket.handshake.auth.user
    socket.join(id)
    console.log('a user has connected:', id)
    socket.broadcast.emit('user connected', id)
    await saveUser(id, email, givenName, familyName, picture)
    const users = await getUsers(id)
    socket.emit('users', users)
    const onlineUsers = []
    for (const [id, socket] of io.of("/").sockets) {
        onlineUsers.push(socket.handshake.auth.user.id)
    }
    // console.log('online users:', onlineUsers)
    socket.emit('online users', onlineUsers)
    const messages = await getMessages(id)
    socket.emit('messages', messages)
    socket.on('chat message', async ({ id, content, senderId, receiverId }) => {
        const newMessage = await saveMessage(id, content, senderId, receiverId)
        socket.to(receiverId).emit('chat message', newMessage)
    })
    socket.on('disconnect', () => {
        console.log('a user has disconnected.')
        socket.broadcast.emit('user disconnected', id)
    })
})


server.listen(port, () => console.log(`Server listening on port ${port}`))