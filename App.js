// Test para Imaginemos - Author: Daniel Marcano - Github: N00BEST

const express = require('express');
const bodyParser = require("body-parser");
const Clients = require('./controllers/clients');
const Orders = require('./controllers/orders');
const Drivers = require('./controllers/drivers');

const App = express();

// Choose a port to run 
const __PORT = process.env.PORT || 8000;

// --------------- DECLARATION OF MIDDLEWARE -------------

App.use(bodyParser.json());
App.use(bodyParser.urlencoded({extended: false}));

// ------------------ START OF API ROUTES ----------------

// Client Endpoints
App.post('/client/new', Clients.new);
App.post('/client/:id/addAddress', Clients.addAddress);
App.get('/clients', Clients.getAll);
App.get('/client/:id', Clients.getOne);

// Order Endpoints
App.post('/order/new', Orders.new);
App.put('/order/:id/finish', Orders.finish);
App.put('/order/:id/assign', Orders.assign);
App.get('/orders', Orders.getAll);
App.get('/order/:id', Orders.getOne);

// Driver Endpoints
App.post('/driver/new', Drivers.new);
App.get('/driver', Drivers.available);
App.get('/driver/:id/tasks', Drivers.tasks);
App.post('/driver/:id/addTask', Drivers.addTask);
App.get('/drivers', Drivers.getAll);
App.get('/driver/:id', Drivers.getOne);

// ------------------- Not Found Routes -------------------

App.get('*', (req, res)=>{
	res.status(404);
});

App.post('*', (req, res)=>{
	res.status(404);
});

// ------------------- Start Application -------------------

App.listen(__PORT, ()=>{
	console.log(`Server running on port ${__PORT}`);
});	