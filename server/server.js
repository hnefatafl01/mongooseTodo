const _ = require('lodash');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const { ObjectID } = require('mongodb');
const bcrypt = require('bcryptjs');
const port = process.env.PORT || 3000;

var { authenticate } = require('./middleware/authenticate');
var { mongoose } = require('./db/mongoose');
var { User } = require('./models/user');
var { Todo } = require('./models/todo');

app.use(bodyParser.json());

/* Todos */

app.post('/todos', authenticate, async (req, res) => {
    var todo = new Todo({
        text: req.body.text,
        completed: req.body.completed,
        _creator: req.user._id
    });

    try {
       await todo.save()
       res.send(todo);
    } catch (e) {
        res.status(400).send(e);
    }
        
});

app.get('/todos', authenticate, async (req, res) => {
    try {
        let todos = await Todo.find({ _creator:req.user._id })
        res.send({ todos });
    } catch (e) {
        res.status(400).send(e);
    }
});

app.get('/todos/:id', authenticate, async (req, res) => {
    let id = req.params.id;
    if (!ObjectID.isValid(id)) {
        res.status(404).send();
    }
    try {
        const todo = await Todo.findOne({
            _id: id,
            _creator: req.user._id
        })
        if (!todo) {
            res.status(404).send();
        }
        res.send({ todo });
    } catch(e) {
        res.status(400).send();
    }
});

app.patch('/todos/:id/edit', async (req, res) => {
    let id = req.params.id;
    let body = _.pick(req.body, ['text', 'completed']);
    if (!ObjectID.isValid(id)) {
        res.status(404).send();
    }

    if (_.isBoolean(body.completed) && body.completed) {
        body.completedAt = new Date().getTime();
    } else {
        body.completed = false;
        body.completedAt = null;
    }

    try {
        const todo = await Todo.findByIdAndUpdate(id, { $set: body }, { new: true });
        if (!todo) {
            res.status(404).send();
        }
        res.send({ todo });
    } catch (e) {
        res.status(400).send()
    }
});

app.delete('/todos/:id/delete', authenticate, async (req, res) => {
    let id = req.params.id;
    if (!ObjectID.isValid(id)) {
        return res.status(404).send();
    }
    try {
        const todo = await Todo.findOneAndRemove({
            _id: req.params.id,
            _creator: req.user._id
        })

        if (!todo) {
            return res.status(404).send();
        }
        res.send({ todo });
    } catch(e) {
        res.status(400).send()
    }
});

/* Users */
app.post('/users', async (req, res) => {
    var body = _.pick(req.body, ['email', 'password']);
    var user = new User(body);
    try {
        user = await user.save();
        const token = user.generateAuthToken();
        res.header('x-auth', token).send({ user });
    } catch(e) {
        res.status(400).send({});
    }
});

app.post('/users/login', async (req, res) => {
    let body = _.pick(req.body, ['email','password']);

    try {
      const user = await User.findByCredentials(body.email, body.password);
      const token = await user.generateAuthToken()
      res.header('x-auth', token).send({ user });   
    } catch(e) {
        res.status(400).send();
    }
});

app.delete('/users/me/token', authenticate, async (req, res) => {
    try {
        await req.user.removeToken(req.token)
        res.status(200).send();
    } catch(e) {
        res.status(400).send();

    }
});

app.get('/users/me', authenticate, (req, res) => {    
    res.send(req.user);
});

app.listen(port, () => console.log(`listening on ${port}`));

module.exports = { app };