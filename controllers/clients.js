const models = require('../models');
const helper = require('./helper');

/*
	New Client
	Adds a new client to database.
	If successfully created, sends a JSON back as response.
	@params req -> The http request model
	@params res -> The http response model
	@returns void
*/
module.exports.new = (req, res) => {
	let client = {
		email: req.body.email,
		name: req.body.name,
		lastname: req.body.lastname,
		phone: req.body.phone
	};

	// Validate data
	if(!client.email || client.email.trim().length === 0 ||
	   !client.name || client.name.trim().length === 0 ||
	   !client.lastname || client.lastname.trim().length === 0 ||
	   !client.phone || client.phone.trim().length === 0) {
		// if any data is missing
		let msg = "The following fields are required:";
		if(!client.email || client.email.trim().length === 0)
			msg += " email,";
		
		if(!client.name || client.name.trim().length === 0)
			msg += " name,";

		if(!client.lastname || client.lastname.trim().length === 0)
			msg += " lastname,";

		if(!client.phone || client.phone.trim().length === 0)
			msg += " phone number.";

		msg = msg.substr(0, msg.length - 1);

		res.status(400).send(msg);

		return;
	}

	client.email = client.email.trim().toLowerCase();
	client.name = client.name.trim().toLowerCase();
	client.lastname = client.lastname.trim().toLowerCase();
	client.phone = client.phone.trim().toLowerCase();

	// Validate email's uniqueness
	models.Client.findOne({
		where: { email: client.email }
	}).then((exists)=>{
		if(exists) {
			// User was found so email already exists
			res.status(409).send("Email already in use");
		} else {
			// The email isn't registered
			// Create the client
			models.Client.create(client).then((row)=>{
				// User successfully added to database
				let obj = {
					id: row.id,
					email: row.email,
					name: row.name,
					lastname: row.lastname,
					phone: row.phone,
					address: [],
					order: []
				}

				if(req.body.address) {
					// If an address was specified
					models.Address.create({
						clientId: row.id,
						address: req.body.address
					}).then((addressRow)=>{
						// If the address was successfully added
						let addresses = [];
						
						addresses.push({
							id: addressRow.id,
							address: addressRow.address
						});

						obj.address = addresses;

						res.send(obj);
					}).catch((err)=>{
						console.error(err);
						res.status(500).send("The user was created but we couldn't add the address");
					});
				} else {
					// If none address was specified
					res.send(obj);					
				}
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
	Add Address
	Adds a new address to a existing client in database.
	If successfully created, sends a client JSON back as response.
	@params req -> The http request model
	@params res -> The http response model
	@returns void
*/
module.exports.addAddress = (req, res)=>{
	let address = {
		clientId: req.params.id,
		address: req.body.address
	};

	console.log(address);

	// Validate data 
	if(!helper.isValidId(address.clientId) ||
	   !address.address || address.address.length === 0){
		// If data is wrong
		let msg = "";
		if(!address.clientId || address.clientId.length === 0)
			msg += "clientId is required. ";
		else if(isNaN(address.clientId) || parseInt(address.clientId) < 0)
			msg += "clientId must be a positive integer. ";

		if(!address.address || address.address.trim().length === 0)
			msg += "address is required.";

		res.status(400).send(msg);
		return;
	}

	address.address = address.address.trim();

	// if the data is fine
	models.Client.findOne({
		where: {id: address.clientId}
	}).then((client)=>{
		if(!client){
			// if the client wasn't found
			res.status(404).send("clientId not found");
			return;
		} else {
			// if client exists
			let promises = [];

			// Get all addresses of the client
			promises.push(
				models.Address.findAll({
					where: {clientId: client.id}
				})
			);
			
			// Create a new address
			promises.push(
				models.Address.create(address)
			);
			
			// Wait until both queries are done
			Promise.all(promises).then((results)=>{
				let addresses = [];
				
				// Add existing addresses to the JSON
				for(let i = 0; i < results[0].length; i++){
					addresses.push({
						id: results[0][i].id,
						address: results[0][i].address
					});
				}
				
				// Add new address to the JSON
				addresses.push({
					id: results[1].id,
					address: results[1].address
				});

				let obj = {
					id: client.id,
					email: client.email,
					name: client.name,
					lastname: client.lastname,
					phone: client.phone,
					address: addresses
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

/*
	Get all clients.
	Gets all the clients from database and send them back as an array.
	@params req -> The http request model
	@params res -> The http response model
	@returns void
*/
module.exports.getAll = (req, res) => {
	models.Client.findAll().then((rows)=>{
		let result = [];
		let length = rows.length;
		for(let i = 0; i < length; i++){
			let client = rows.shift();

			result.push({
				id: client.id,
				name: client.name,
				lastname: client.lastname,
				phone: client.phone
			});
		}

		res.send(result);
	}).catch((err)=>{
		console.error(err);
		res.status(500);
	});
};

/*
	Get a client.
	Get a client with the given Id from database and send it back as a JSON.
	@params req -> The http request model
	@params res -> The http response model
	@returns void
 */
module.exports.getOne = (req, res) =>{
	let clientId = req.params.id;

	if(!helper.isValidId(clientId)){
		res.status(400).send("The id must be a positive integer.");
		return;
	}

	// Fetch the client, it's addresses and it's orders
	let queries = [];

	queries.push(
		models.Client.findOne({
			where: { id: clientId }
		})
	);

	queries.push(
		models.Address.findAll({
			where: { clientId: clientId }
		})
	);

	queries.push(
		models.Order.findAll({
			where: { clientId: clientId }
		})
	);

	// Wait until the queries are done
	Promise.all(queries).then((data)=>{
		if(data[0]){
			// If the client exists
			let client = {
				id: data[0].id,
				name: data[0].name,
				lastname: data[0].lastname,
				phone: data[0].phone,
				address: [],
				order: []
			};
	
			let addressData = data[1];
			let orderData = data[2];
	
			for(let i = 0; i < addressData.length; i++){
				client.address.push({
					id: addressData[i].id,
					address: addressData[i].address
				})
			}
	
			for(let i = 0; i < orderData.length; i++){
				client.order.push({
					id: orderData[i].id,
					deliveryTime: orderData[i].deliveryTime,
					addressId: orderData[i].addressId,
					driverId: orderData[i].driverId
				})
			}
	
			res.send(client);
		} else {
			res.status(404).send("Client not found.");
		}
	}).catch((err)=>{
		console.error(err);
		res.status(500);
	});
};