const { ObjectID } = require('mongodb');
const jwt = require('jsonwebtoken');

var { User } = require('../../models/user');
var { Todo } = require('../../models/todo');


var todos = [
    {
        _id: new ObjectID(), 
        text: 'Test this c',
        completed: false
    },
    {
        _id: new ObjectID(), 
        text: 'Test this b',
        completed: true,
        completedAt: 333
    },
    {
        _id: new ObjectID(), 
        text: 'Test this a',
        completed: false
    }
]


const populateTodos = (done) => {
    Todo.remove({}).then(() => {
        return Todo.insertMany(todos);
    }).then(() => done());
}

var objectIdOne = new ObjectID();
var objectIdTwo = new ObjectID();

var users = [{
    _id: objectIdOne,
    email: 'test1@test.com',
    password: 'user1pass',
    tokens: [{
        access: 'auth',
        token: jwt.sign({ _id: objectIdOne.toHexString(), access: 'auth' }, 'abc123').toString()
    }]
},{
    _id: objectIdTwo,
    email: 'test2@test.com',
    password: 'user2pass',
    tokens: [{
        access: 'auth',
        token: jwt.sign({ _id: objectIdTwo.toHexString(), access: 'auth' }, 'abc123').toString()
    }]
}];

const populateUsers = (done) => {
    User.remove({})
        .then(() => {
           let userOne = new User(users[0]).save();
           let userTwo = new User(users[1]).save();

           return Promise.all([userOne, userTwo]);
        })
        .then(() => done());
};

module.exports = { todos, populateTodos, users, populateUsers };