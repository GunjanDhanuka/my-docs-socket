const mongoose = require('mongoose')
const Document = require('./Document')

mongoose.connect('mongodb://localhost/my-docs');


const io = require('socket.io')(3001, {
    // allows connection between different ports
    cors: {
        //client URL on the server side
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST']
    },
})

io.on('connection', socket => {
    socket.on('get-document', async documentId =>{
        const document = await findOrCreateDocument(documentId)

        //create a room based on the documentId, so that all events related to a document are reflected in the users in that room
        //console.log(documentId)
        socket.join(documentId)
        //console.log(documentId)
        socket.emit('load-document', document.data)
        socket.on('send-changes', delta =>{
            //on our server, send the message to everyone but us that there are some changes they should receive
            socket.broadcast.to(documentId).emit('receive-changes', delta)
        })

        socket.on('save-document', async data =>{
            await Document.findByIdAndUpdate(documentId, {data})
        })
    })
    
})

const defaultValue = ""

async function findOrCreateDocument(id) {
    if(id == null) return

    const document = await Document.findById(id)
    if(document) return document
    return await Document.create({_id: id, data: defaultValue})
}