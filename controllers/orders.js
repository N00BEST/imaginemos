const models = require('../models');
const helper = require('./helper');
const Drivers = require('./drivers');

/*
	Create new order.
	Create a new order, save it to database and set it status to unassigned.
	The new order needs an address id, deliveryTime and driverId.
	The delivery time must be a positive number between 1 and 8 hours from now.
	@params req -> The http request model
	@params res -> The http response model
	@returns void
*/
module.exports.new = (req, res) => {
	let order = {
		addressId: req.body.addressId,
		deliveryTime: req.body.deliveryTime,
		status: '0' // Set status to unassigned
	};

	// Validate address id
	if(!helper.isValidId(order.addressId)){
		res.status(400).send("The address id must be a positive integer.");
		return;
	}

	// validate deliveryTime is a positive number
	if(!helper.isValidId(order.deliveryTime)){
		res.status(400).send("The deliveryTime must be a positive number.");
		return;
	}

	order.deliveryTime = parseInt(order.deliveryTime);

	// validate deliveryTime between 1 and 8 hours
	if(!(1 <= parseInt(order.deliveryTime) && parseInt(order.deliveryTime) <= 8)){
		res.status(400).send("The deliveryTime must be between 1 and 8");
		return;
	}

	// Verify if the address exists
	models.Address.findOne({
		where: { id: order.addressId }
	}).then((address) => {
		if(!address){
			// If the address does not exists
			res.status(404).send(`No address with the id ${order.addressId} was found.`);
		} else {
			// address was found, so order can now be created
			let deliveryTime = new Date();
			// To now add the many hours as given in the request body and set that as the 
			// order deliveryTime (deadline)
			deliveryTime = helper.addHoursToDate(deliveryTime, order.deliveryTime);
			order.deliveryTime = deliveryTime;
			order.clientId = address.clientId;

			models.Order.create(order).then((createdOrder) => {

				let obj = {
					id: createdOrder.id,
					status: "unassigned",
					address: address.address,
					deliveryTime: createdOrder.deliveryTime,
					clientId: order.clientId
				}

				res.send(obj);
			}).catch((err)=>{
				console.error(err);
				res.status(500);
			});
		}
	}).catch((err)=>{
		console.error(err);
		res.status(500);
	});
}

/*
	Finish Order
	Set an order as delivered and delete it from task database.
	@params req -> The http request model
	@params res -> The http response model
	@returns void
*/
module.exports.finish = (req, res)=>{
	let orderId = req.params.id;

	if(!helper.isValidId(orderId)){
		res.status(400).send('The order id must be a positive integer.');
		return;
	}

	// If the id is valid, verify if it exists on database
	models.Order.findOne({
		where: { id: orderId }
	}).then((order)=>{
		if(!order) {
			// order not found
			res.status(404).send("Order not found.");
		} else {
			let queries = [];

			// Delete the task from the tasks table
			queries.push(
				models.Task.destroy({
					where: { 
						orderId: order.id,
						driverId: order.driverId
					}
				})
			);

			// Update order status to delivered
			queries.push(
				order.update({
					status: '2'
				})
			);

			Promise.all(queries).then((results)=>{
				let obj = {
					id: order.id,
					status: "delivered",
					addressId: order.addressId,
					deliveryTime: order.deliveryTime,
					clientId: order.clientId,
					driverId: order.driverId
				}

				res.send(obj);
			}).catch((err)=>{
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
	Assign driver to Order.
	Take a given order and assign it to a random driver.
	@params req -> The http request model
	@params res -> The http response model
	@returns void
*/
module.exports.assign = (req, res)=>{
	if(!helper.isValidId(req.params.id)){
		res.status(400).send("The order id must be a positive integer.");
		return;
	}

	let queries = [];

	// Find a random driver for this order
	queries.push(
		Drivers.getRandomDriver()
	);

	// Verify if the order exists
	queries.push(
		models.Order.findOne({
			where: { id: req.params.id }
		})
	);

	// When both queries are resolved
	Promise.all(queries).then((results)=>{
		if(!results[0] || !results[1]){
			// If the order does not exists or there are not
			// drivers available
			if(!results[0]){
				res.status(404).send("There is no order with id " + req.params.id);
			} else {
				res.status(501).send("There are no drivers available yet.");
			}
			return;
		} else {
			// if both the driver and the order were found
			let driver = results[0];
			let order = results[1];

			if(module.exports.isOrderAvailable(order)){
				// if the order isn't assign to a driver
				queries = [];

				queries.push(
					Drivers.addTaskToDriver(driver, order)
				);

				queries.push(
					order.update({
						status: '1',
						driverId: driver.id
					})
				);

				Promise.all(queries).then((rows)=>{
					let obj = {
						id:  rows[1].id,
						status: "assigned",
						addressId: rows[1].addressId,
						deliveryTime: rows[1].deliveryTime,
						clientId: rows[1].clientId,
						driverId: rows[1].driverId,
					}

					res.send(obj);
				}).catch((err)=>{
					console.error(err);
					res.status(500);
				})
				
			} else {
				//If the order isn't available anymore
				res.status(409).send("The order is already taken by one driver.");
			}
		}
	}).catch((err)=>{
		console.error(err);
		res.status(500);
	})
}

/*
	Is Order Available.
	If the order status is 0, then the order is available 
	for any driver to take it.
	@params order -> A sequelize model for order
	@returns bool -> True if the order is available to be taken, false otherwise
 */
module.exports.isOrderAvailable = (order)=>{
	return (order.status === '0');
}

/*
	Get all orders.
	Gets all the orders from database and send them back as an array.
	@params req -> The http request model
	@params res -> The http response model
	@returns void
*/
module.exports.getAll = (req, res) => {
	models.Order.findAll().then((rows)=>{
		let result = [];
		let length = rows.length;
		for(let i = 0; i < length; i++){
			let order = rows.shift();

			let status;

			switch(order.status){
				case '-1':
					status = 'cancelled';
					break;

				case '0':
					status = 'unassigned';
					break;

				case '1':
					status = 'assigned';
					break;

				default: 
					status = 'delivered';
					break;
			}

			result.push({
				id: order.id,
				status: status,
				deliveryTime: order.deliveryTime,
				clientId: order.clientId,
				addressId: order.addressId,
				driverId: order.driverId
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
	let orderId = req.params.id;

	if(!helper.isValidId(orderId)){
		res.status(400).send("The order id must be a positive integer.");
		return;
	}

	models.Order.findOne({
		where: { id: orderId }
	}).then((order)=>{
		if(!order){
			// if the order does not exists
			res.status(404).send("Order not found.");
		} else {
			// if the order was found, fetch the address
			models.Address.findOne({
				where: { id: order.addressId }
			}).then((address)=>{
				let status;

				switch(order.status){
					case '-1':
						status = 'cancelled';
						break;

					case '0':
						status = 'unassigned';
						break;

					case '1':
						status = 'assigned';
						break;

					default: 
						status = 'delivered';
						break;
				}

				let obj = {
					id: order.id,
					status: status,
					deliveryTime: order.deliveryTime,
					address: address.address,
					clientId: order.clientId,
					driverId: order.driverId
				}

				res.send(obj);
			}).catch((err)=>{
				console.error(err);
				res.status(500);
			});
		}
	}).catch((err)=>{	
		console.error(err);
		res.status(500);
	});
};