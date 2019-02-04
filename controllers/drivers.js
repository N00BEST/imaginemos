const models = require('../models');
const sequelize = require('sequelize');
const helper = require('./helper');
const Orders = require('./orders');
const Op = sequelize.Op;

/*
	New Driver
	Adds a new driver to database.
	If successfully created, sends a JSON back as response.
	@params req -> The http request model
	@params res -> The http response model
	@returns void
*/
module.exports.new = (req, res) => {
	let driver = {
		email: req.body.email,
		name: req.body.name,
		lastname: req.body.lastname,
		phone: req.body.phone
	}

	// Validate data
	if(!driver.email || driver.email.trim().length === 0 ||
	   !driver.name || driver.name.trim().length === 0 ||
	   !driver.lastname || driver.lastname.trim().length === 0 ||
	   !driver.phone || driver.phone.trim().length === 0) {
		// if any data is missing
		let msg = "The following fields are required:";
		if(!driver.email || driver.email.trim().length === 0)
			msg += " email,";
		
		if(!driver.name || driver.name.trim().length === 0)
			msg += " name,";

		if(!driver.lastname || driver.lastname.trim().length === 0)
			msg += " lastname,";

		if(!driver.phone || driver.phone.trim().length === 0)
			msg += " phone number.";

		msg = msg.substr(0, msg.length - 1);

		res.status(40).send(msg);

		return;
	}

	driver.email = driver.email.trim().toLowerCase();
	driver.name = driver.name.trim().toLowerCase();
	driver.lastname = driver.lastname.trim().toLowerCase();
	driver.phone = driver.phone.trim().toLowerCase();

	// Validate email's uniqueness
	models.Driver.findAll({
		where: { email: driver.email },
		limit: 1
	}).then((rows)=>{
		if(rows.length > 0) {
			// User was found so email already exists
			res.status(409).send("Email already in use");
		} else {
			// The email isn't registered
			// Create the driver
			models.Driver.create(driver).then((row)=>{
				// User successfully added to database
				// If none address was specified
				let obj = {
					id: row.id,
					email: row.email,
					name: row.name,
					lastname: row.lastname,
					phone: row.phone,
					task: []
				}

				res.send(obj);					
			}).catch((err)=>{
				// If the user couldn't be saved
				console.error(err);
				res.status(500);
			});
		}
	}).catch((err)=>{
		console.error(err);
		res.status(500);
	})
		
};

/*
	Get available driver
	Fetches a driver randomly and send it back as a JSON.
	@params req -> The http request model
	@params res -> The http response model
	@returns void
*/
module.exports.available = (req, res) => {
	module.exports.getRandomDriver().then((driver)=>{
		if(driver) {
			let obj = {
				id: driver.id,
				email: driver.email,
				name: driver.name,
				lastname: driver.lastname,
				phone: driver.phone
			}

			res.send(obj);
		} else {
			res.status(501).send("No drivers available yet.");
		}
	}).catch((err)=>{
		console.error(err);
		res.status(500);
	});
};

/*
	Get a driver's tasks.
	Fetches all the tasks pending for a driver 
	with a given id and send it back as an array.
	@params req -> The http request model
	@params res -> The http response model
	@returns void
*/
module.exports.tasks = (req, res) => {
	let driverId = req.params.id;
	// Validate the given id
	if(!helper.isValidId(driverId)) {
		res.status(400).send("The id must be a positive integer");
		return;
	} 
	
	models.Task.findAll({
		attributes: ['orderId'],
		where: { driverId: driverId }
	}).then((ordersId)=>{
		// Once gotten all the ordersId, fetch them.
		models.Order.findAll({
			where: {
				id: { [Op.in]: ordersId },
				status: 1
			},
			order: [
				[sequelize.col('deliveryTime'), 'ASC']
			]
		}).then((orders)=>{
			// Having all the orders info make the array
			// and send it as response.
			let result = [];
			
			for(let i = 0; i < orders.length; i++) {
				result.push({
					id: orders[i].id,
					deliveryTime: orders[i].deliveryTime,
					status: orders[i].status
				});
			}
			
			res.send(result);
		}).catch((err)=>{
			console.error(err);
			res.status(500);
		});
	}).catch((err)=>{
		console.error(err);
		res.status(500);
	});
};

/*
	Add task to driver.
	Takes a given order and adds it to a 
	drivers tasks.
	@params req -> The http request model
	@params res -> The http response model
	@returns void
*/
module.exports.addTask = (req, res) => {
	let driverId = req.params.id;
	let orderId = req.body.id;

	if(!helper.isValidId(driverId)){
		res.status(400).send('The driver id must be a positive integer.');
		return;
	}

	if(!helper.isValidId(orderId)){
		res.status(400).send('The order id must be a positive integer.');
		return;
	}

	// If all data is valid, see if the order and the driver exists
	let queries = [];

	queries.push(
		models.Driver.findOne({
			where: { id: driverId }
		})
	);

	queries.push(
		models.Order.findOne({
			where: { id: orderId }
		})
	);

	Promise.all(queries).then((results)=>{
		if(!results[0] || !results[1]){
			// If the driver or the order wasn't found
			let msg = results[0] ? "" : "driver";
			if(!results[1]){
				msg += msg.length > 0 ? " and order" : "order";
			}

			msg += " not found.";

			res.status(404).send(msg);
			return;
		}

		let driver = results[0];
		let order = results[1];

		// Verify if the order is available to be taken
		if(Orders.isOrderAvailable(order)){
			queries = [];

			queries.push(
				order.update({
					status: '1',
					driverId: driver.Id
				})
			);

			queries.push(
				module.exports.addTaskToDriver(driver, order)
			);

			Promise.all(queries).then((rows)=>{
				let obj = {
					clientId: rows[1].id,
					addressId: rows[1].address,
					deliveryTime: rows[1].deliveryTime,
					driverId: rows[1].driverId,
				}

				res.send(obj);
			}).catch((err)=>{
				console.error(err);
				res.status(500);
			})
		} else {
			// If the order isn't available
			res.status(409).send("The order is already taken by a driver.");
		}
	});
};

/*
	Get Random Driver
	Selects a random driver from database.
	@returns promise -> resolve: The model of random driver - reject: error
 */
module.exports.getRandomDriver = ()=>{
	return models.Driver.findOne({
		order: [ sequelize.fn('RAND') ]
	});
};

/*
	Add task to driver.
	Creates a new record on the tasks table assigning it to 
	the given driver.
	@params driver -> a sequelize model for driver
	@params order -> a sequelize model for order
	@returns promise -> resolve: The task model - reject: error
 */
module.exports.addTaskToDriver = (driver, order) => {
	return models.Task.create({
		driverId: driver.id,
		orderId: order.id
	});
}

/*
	Get all drivers.
	Gets all the drivers from database and send them back as an array.
	@params req -> The http request model
	@params res -> The http response model
	@returns void
*/
module.exports.getAll = (req, res) => {
	models.Driver.findAll().then((rows)=>{
		let result = [];
		let length = rows.length;
		for(let i = 0; i < length; i++){
			let driver = rows.shift();

			result.push({
				id: driver.id,
				name: driver.name,
				lastname: driver.lastname,
				phone: driver.phone
			});
		}

		res.send(result);
	}).catch((err)=>{
		console.error(err);
		res.status(500);
	});
};

/*
	Get an order.
	Get an order with the given Id from database and send it back as a JSON.
	@params req -> The http request model
	@params res -> The http response model
	@returns void
 */
module.exports.getOne = (req, res) =>{
	let driverId = req.params.id;

	if(!helper.isValidId(driverId)){
		res.status(400).send("The driver id must be a positive integer.");
		return;
	}

	let queries = [];

	queries.push(
		models.Driver.findOne({
			where: { id: driverId }
		})
	);

	queries.push(
		models.Task.findAll({
			where: { driverId: driverId }
		})
	);

	// Wait until all the queries are executed
	Promise.all(queries).then((data)=>{
		if(!data[0]){
			res.status(404).send("Driver not found");
		} else {
			let driver = {
				id: data[0].id,
				name: data[0].name,
				lastname: data[0].lastname,
				phone: data[0].phone,
				task: []
			};
			let tasks = data[1];

			for(let i = 0; i < tasks.length; i++){
				driver.task.push({
					orderId: tasks[i].orderId
				});
			}

			res.send(driver);
		}
	}).catch((err)=>{
		console.error(err);
		res.status(500);
	});
};