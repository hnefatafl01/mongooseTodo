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

app.post('/todos', (req, res) => {
    var todo = new Todo({
        text: req.body.text,
        completed: req.body.completed
    });

    todo
        .save()
        .then((todo) => {
            res.send(todo);
        }, (e) => {
            res.status(400).send(e);
        });
});

app.get('/todos', (req, res) => {
    Todo
    .find()
    .then((todos) => {
        res.send({ todos });
    }, (e) => {
        res.status(400).send(e);
    });
});

app.get('/todos/:id', (req, res) => {
    if (!ObjectID.isValid(req.params.id)) {
        res.status(404).send();
    }

    Todo
        .findById({ _id: req.params.id})
        .then((todo) => {
            if (!todo) {
                res.status(404).send();
            }
            res.send({todo});
         }).catch((err) => {
            res.status(404).res.send();
        });
});

app.patch('/todos/:id/edit', (req, res) => {
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

    Todo
        .findByIdAndUpdate(id, { $set: body }, { new: true })
        .then((todo) => {
            if (!todo) {
                res.status(404).send();
            }
    
            res.send({ todo });
        }).catch(e => res.status(400).send());
});

app.delete('/todos/:id/delete', (req, res) => {
    let id = req.params.id;
    if (!ObjectID.isValid(id)) {
        res.status(404).send();
    }

    Todo
        .findByIdAndRemove(req.params.id)
        .then((todo) => {
            if (!todo) {
                res.status(404).send();
            }
            res.send({todo});
        }).catch(e => res.status(400).send({}));  
});

app.post('/users', (req, res) => {
    var body = _.pick(req.body, ['email', 'password']);
    var user = new User(body);

    user.save()
        .then(() => {
            return user.generateAuthToken();
        })
        .then((token) => {
            res.header('x-auth', token).send({ user });
        },(err) => {
            res.status(400).send({});
        });
});

app.post('/users/login', (req, res) => {
    let body = _.pick(req.body, ['email','password']);

    User.findByCredentials(body.email, body.password)
        .then((user) => {
            user.generateAuthToken().then((token) => {
                res.header('x-auth', token).send({user});
            })
        }).catch((e) => res.status(400).send()); 
});

app.get('/users/me', authenticate, (req, res) => {    
    res.send(req.user);
});

app.listen(port, () => console.log(`listening on ${port}`));

module.exports = { app };