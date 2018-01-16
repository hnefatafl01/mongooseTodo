const expect = require('expect');
const request = require('supertest');
const { ObjectID } = require('mongodb');

const { app } = require('../server');
var { User } = require('../models/user');
var { Todo } = require('../models/todo');
var { todos, users, populateTodos, populateUsers } = require('./seed/seed');

beforeEach(populateUsers);
beforeEach(populateTodos);

describe('TODOS', () => {

    describe('POST /todos', () => {

        it('should create a new todo', (done) => {
            var text = 'Test todo text';
            request(app)
                .post('/todos')
                .set('x-auth', users[0].tokens[0].token)
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
                .set('x-auth', users[0].tokens[0].token)
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
                .set('x-auth', users[0].tokens[0].token)
                .expect(200)
                .expect((res) => {
                    expect(res.body.todos.length).toBe(2);
                })
                .end(done);
        });
        
    });

    describe('GET /todos/:id', () => {

        it('should read one todo by id', (done) => {
            request(app)
                .get(`/todos/${todos[0]._id.toHexString()}`)
                .set('x-auth', users[0].tokens[0].token)
                .expect(200)
                .expect((res) => {
                    expect(res.body.todo.text).toBe(todos[0].text);
                })
                .end(done);
        });

        it('should not return todo doc created by other user', (done) => {
            request(app)
                .get(`/todos/${todos[1]._id.toHexString()}`)
                .set('x-auth', users[1].tokens[0].token)
                .expect(404)
                .end(done);
        });
        
        it('should return 404 if todo not found', (done) => {
            request(app)
                .get(`/todos/${new ObjectID().toHexString()}`)
                .set('x-auth', users[0].tokens[0].token)
                .expect(404)
                .expect((res) => {
                    expect(res.body.todo).toBe();
                })
                .end(done);
        });

        it('should return 404 if id is not valid', (done) => {
            request(app)
                .get('/todos/123asdf4')
                .set('x-auth', users[0].tokens[0].token)
                .expect(404)
                .end(done);
        });

        
    });


    describe('DELETE /todos/:id/delete', () => {
        
        it('should delete one todo by id', (done) => {
            let hexId = todos[2]._id.toHexString();
            request(app)
                .delete(`/todos/${hexId}/delete`)
                .set('x-auth', users[1].tokens[0].token)
                .expect(200)
                .expect((res) => {
                    expect(res.body.todo._id).toBe(hexId);
                })
                .end((err) => {
                    if (err) {
                        return done(err);
                    }

                    Todo.findById(hexId)
                        .then((todo) => {
                            expect(todo).toNotExist();
                            done();
                        }).catch(e => done(e));
                });
        });

        it('should not delete to belonging to another user', (done) => {
            let hexId = todos[0]._id.toHexString();
            request(app)
                .delete(`/todos/${hexId}/delete`)
                .set('x-auth', users[1].tokens[0].token)
                .expect(404)
                .end((err) => {
                    if (err) {
                        return done(err);
                    }

                    Todo
                        .findById({ _id: hexId })
                        .then((todo) => {
                            expect(todo).toExist();
                            done();
                        }).catch(e => done(e));
                });
        });

        it('should return 404 if todo not found', (done) => {
            request(app)
                .delete(`/todos/${new ObjectID().toHexString()}/delete`)
                .set('x-auth', users[1].tokens[0].token)
                .expect(404)
                .end(done);
        });

        it('should return 404 if id not valid', (done) => {
            request(app)
                .delete(`/todos/abc123}`)
                .set('x-auth', users[1].tokens[0].token)
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
                .set('x-auth', users[0].tokens[0].token)
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

        it('should not update todo belonging to different user', (done) => {
            let hexId = todos[0]._id.toHexString();
            let text = 'test it good';

            request(app)
                .patch(`/todos/${hexId}/edit`)
                .set('x-auth', users[1].tokens[0].token)
                .expect(404)
                .end(done);
        });

        it('should clear completedAt when todo is not completed', (done) => {
            let hexId = todos[1]._id.toHexString();
            let text = 'test it gooder!';

            request(app)
                .patch(`/todos/${hexId}/edit`)
                .set('x-auth', users[0].tokens[0].token)
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

    describe('GET /users/me', () => {

        it('should return user if authenticated', (done) => {
            request(app)
                .get('/users/me')
                .set('x-auth', users[0].tokens[0].token)
                .expect(200)
                .expect((res) => {
                    expect(res.body._id).toBe(users[0]._id.toHexString());
                    expect(res.body.email).toBe(users[0].email);
                })
                .end(done);
        });

        it('should return 401 if user not authenticated', (done) => {
            request(app)
                .get('/users/me')
                .expect(401)
                .expect((res) => {
                    expect(res.body).toEqual({});
                })
                .end(done);
        });
    });

    describe('POST /users', () => {

        it('should create a user', (done) => {
            let email = 'example@example.com';
            let password = 'password';

            request(app)
                .post('/users')
                .send({ email, password })
                .expect(200)
                .expect((res) => {
                    expect(res.headers['x-auth']).toExist();
                    expect(res.body.user._id).toExist();
                    expect(res.body.user.email).toBe(email);
                })
                .end((err,res) => {
                    if (err) {
                        return done(err);
                    }

                    User.findOne({ email })
                        .then((user) => {
                            expect(user).toExist();
                            expect(user.password).toNotBe(password);
                            done();
                        }).catch((e) => done(e));
                });
        });

        it('should return validation errors if request is invalid', (done) => {
            request(app)
                .post('/users')
                .send({ 
                    email: 'butter',
                    password: 'p123'
                })
                .expect(400)
                .end(done);
        });

        it('should not create user if email in use', (done) => {
            request(app)
                .post('/users')
                .send({
                    email: users[0].email,
                    password: 'pass'
                })
                .expect(400)
                .end(done);
        });

    });

    describe('POST /users/login', () => {
        it('should login user and return auth token', (done) => {
            request(app)
                .post('/users/login')
                .send({
                    email: users[1].email,
                    password: users[1].password
                })
                .expect(200)
                .expect((res) => {
                    expect(res.headers['x-auth']).toExist();
                })
                .end((err, result) => {
                    User.findById(users[1]._id)
                        .then((user) => {
                            if (err) {
                                return done(err);
                            }

                            expect(user.tokens[1]).toInclude({
                                access: 'auth',
                                token: result.headers['x-auth']
                            });
                            done();
                        }).catch(e => done(e));
                });
        });

        it('should reject invalid login', (done) => {
            request(app)
                .post('/users/login')
                .send({
                    email: users[1].email,
                    password: users[1].password + '1'
                })
                .expect(400)
                .expect((res) => {
                    expect(res.headers['x-auth']).toNotExist();
                })
                .end((err, result) => {
                    User.findById(users[1]._id)
                        .then((user) => {
                            if (err) {
                                return done(err);
                            }
                            expect(user.tokens.length).toBe(1);
                            done();
                        }).catch(e => done(e));
                });
        });
    });

    describe('DELETE /users/me/token', () => {
        it('should remove auth token on logout', (done) => {
            request(app)
                .delete('/users/me/token')
                .set('x-auth', users[0].tokens[0].token)
                .expect(200)
                .end((err, res) => {
                    User.findById(users[0]._id).then((user) => {
                        if (err) {
                            return done(err);
                        }
                        expect(user.tokens.length).toBe(0);
                        done();
                    }).catch(e => done(e));
                });
        });
    });

});