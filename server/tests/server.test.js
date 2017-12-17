const expect = require('expect');
const request = require('supertest');
const { ObjectID } = require('mongodb');

const { app } = require('../server');
var { User } = require('../models/user');
var { Todo } = require('../models/todo');

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

beforeEach((done) => {
    Todo.remove({}).then(() => {
        return Todo.insertMany(todos);
    }).then(() => done());
});

describe('TODOS', () => {

    describe('POST /todos', () => {

        it('should create a new todo', (done) => {
            var text = 'Test todo text';
            request(app)
                .post('/todos')
                .send({ text })
                .expect(200)
                .expect((res) => {
                    expect(res.body.text).toBe(text);
                })
                .end((err, res) => {
                    if (err) {
                        return done(err);
                    }
                    Todo.find({text}).then((todos) => {
                            expect(todos.length).toBe(1);
                            expect(todos[0].text).toBe(text);
                            done();
                        }).catch(e => done(e));
                });
        });

        it('should not create todo with empty body', (done) => {
            request(app)
                .post('/todos')
                .send({})
                .expect(400)
                .end((err, res) => {
                    if (err) {
                        return done(err);
                    }
                    Todo.find().then((todos) => {
                        expect(todos.length).toBe(3);
                        done();
                    }).catch(e => done(e));
                })
        })
        
    });

    describe('GET /todos', () => {
        
        it('should read all todos', (done) => {
            request(app)
                .get('/todos')
                .expect(200)
                .expect((res) => {
                    expect(res.body.todos.length).toBe(3);
                })
                .end(done);
        });
        
    });

    describe('GET /todos/:id', () => {

        it('should read one todo by id', (done) => {
            request(app)
                .get(`/todos/${todos[0]._id.toHexString()}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body.todo.text).toBe(todos[0].text);
                })
                .end(done);
        });
        
        it('should return 404 if todo not found', (done) => {
            request(app)
                .get(`/todos/${new ObjectID().toHexString()}`)
                .expect(404)
                .expect((res) => {
                    expect(res.body.todo).toBe();
                })
                .end(done);
        });

        it('should return 404 if id is not valid', (done) => {
            request(app)
                .get('/todos/123asdf4')
                .expect(404)
                .end(done);
        });
    });


    describe('DELETE /todos/:id', () => {
        
        it('should delete one todo by id', (done) => {
            let hexId = todos[1]._id.toHexString();
            request(app)
                .delete(`/todos/${hexId}/delete`)
                .expect(200)
                .expect((res) => {
                    expect(res.body.todo._id).toBe(hexId);
                })
                .end((err) => {
                    if (err) {
                        return done(err);
                    }

                    Todo
                        .findById({ _id: hexId })
                        .then((todo) => {
                            expect(todo).toNotExist();
                            done();
                        }).catch(e => done(e));
                });
        });

        it('should return 404 if todo not found', (done) => {
            request(app)
                .delete(`/todos/${new ObjectID().toHexString()}/delete`)
                .expect(404)
                .end(done);
        });

        it('should return 404 if id not valid', (done) => {
            request(app)
                .delete(`/todos/abc123}`)
                .expect(404)
                .end(done);
        });
    });

    describe('PATCH /todos/:id/edit', () => {

        it('should update todo', (done) => {
            let hexId = todos[0]._id.toHexString();
            let text = 'test it good';

            request(app)
                .patch(`/todos/${hexId}/edit`)
                .send({
                    completed: true,
                    text
                })
                .expect(200)
                .expect((res) => {
                    expect(res.body.todo.text).toBe(text);
                    expect(res.body.todo.completed).toBe(true);
                    expect(res.body.todo.completedAt).toBeA('number');
                })
                .end(done);
        });

        it('should clear completedAt when todo is not completed', (done) => {
            let hexId = todos[1]._id.toHexString();
            let text = 'test it gooder!';

            request(app)
                .patch(`/todos/${hexId}/edit`)
                .send({
                    text: text,
                    completed: false
                })
                .expect(200)
                .expect((res) => {
                    expect(res.body.todo.text).toBe(text);
                    expect(res.body.todo.completed).toBe(false);
                    expect(res.body.todo.completedAt).toNotExist();
                })
                .end(done);
        });
    });
});

describe('USERS', () => {

    var users = [{
        email: 'test1@test.com',
        password: 'bacons'
    },{
        email: 'test2@test.com',
        password: 'turtle'
    }];

    beforeEach((done) => {
        User.remove({}).then(() => {
            return User.insertMany(users);
        }).then(() => done());
    });

    describe('POST /user', () => {
        it('should create a new user', (done) => {
            let user = {
                email: 'test@test.com',
                password: 'abc123'
            }
            request(app)
                .post('/users')
                .send({ user })
                .expect(200)
                .expect((res) => {
                    expect(res.body.email).toBe(user.email);
                })
                .end((err) => {
                    User.find().then((users) => {
                        expect(users.length).toBe(1);
                    });
                    done();
                });
        });

        it('should return 400 if empty request', (done) => {
            request(app)
                .post('/users')
                .send({})
                .expect(400)
                .expect((res) => {
                    expect(res.body.email).toBe();
                })
                .end(done);
        });
    });

    describe('GET /user/:id', () => {
        // it('should fetch all users', (done) => {
        //     request(app)
        //         .get('/users')
        //         .expect(200)
        //         .expect((res) => {
        //             expect(res.body.users.length).toBe(2);
        //         })
        //         .end(done);
        // });
    });
});