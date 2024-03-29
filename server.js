const express = require('express');
const app = express();
const userRoutes = require('./routes/userRoutes');

const rooms = ['general', 'tech', 'finanace','crypto'];
const cors = require('cors');
const Message = require('./models/Message');
const User = require('./models/User');


app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use(cors());

app.use('/users',userRoutes)
require('./connection');

const server = require('http').createServer(app);
const PORT = process.env.PORT || 5001;

const io = require('socket.io')(server, {
    cors: {
        origin : 'https://my-mern-chatapp.netlify.app' || 'http://localhost:3000',
        methods: ['GET', 'POST']
    }
});

app.get('/', (req,res)=> {
    try{
        res.status(200).json("Welcome to home route");
    }catch(e){
        console.log(e)
        res.status(400).json(e)
    }
})

app.get('/rooms', (req, res) => {
    res.json(rooms)
});

async function getLastMessageFromRoom(room) {
    let roomMessages = await Message.aggregate([
        {$match: {to: room}},
        {$group: {_id: '$date', messageByDate: {$push: '$$ROOT'}}}
    ]);

    return roomMessages;
}

function sortRoomMessagesByDate(messages) {
    return messages.sort(function(a, b){
        let date1 = a._id.split('/');
        let date2 = b._id.split('/');

        date1 = date1[2] + date1[0] + date1[1];
        date2 = date2[2] + date2[0] + date2[1];

        return date1 - date2 ? -1 : 1
    })
}

//socket connection
io.on('connection', (socket) => {

    socket.on('new-user', async () => {
        const members = await User.find();
        // console.log(members)
        io.emit('new-user', members);
    })

    socket.on('join-room', async(newRoom, previousRoom) => {

        // socket.on('new-user', async () => {
        //     const members = await User.find();
        //     // console.log(members)
        //     io.emit('new-user', members);
        // })


        socket.join(newRoom);
        socket.leave(previousRoom)
        let roomMessages = await getLastMessageFromRoom(newRoom);
        roomMessages = sortRoomMessagesByDate(roomMessages);
        socket.emit('room-messages', roomMessages)
    })

    socket.on('message-room', async (room, content, time, date, sender) => {
        console.log('New message', content)
        const newMessages = await Message.create({content, from: sender, time, date, to: room});
        let roomMessages = await getLastMessageFromRoom(room);
        roomMessages = sortRoomMessagesByDate(roomMessages);
        //sending message to room.
        io.to(room).emit('room-messages', roomMessages);
        socket.broadcast.emit('notifications', room)
    })

    app.delete('/logout', async (req, res) => {
        try {
            const {_id, newMessages} = req.body;
            const user = await User.findById(_id);
            user.status = "offline";
            user.newMessages = newMessages;
            await user.save();
            const members = await User.find();
            socket.broadcast.emit('new-user', members)
            res.status(200).send();
        } catch (e) {
            console.log(e);
            res.status(400).send()
        }
    })
})

server.listen(PORT, () =>{
    console.log('listening to port' , PORT)
})