Design of the Database Model

Clients ( 
	id (primary key),
	email (unique),
	name,
	lastname,
	phone
)

Drivers ( 
	id (primary key),
	email (unique),
	name,
	lastname,
	phone
)

Addresses (
	id (primary key),
	clientId (foreign key),
	address
)

Orders ( 
	id (primary key),
	clientId (foreign key),
	addressId (foreign key),
	deliveryTime,
	status (-1, 0, 1, 2) -- -1 = cancelled, 0 = unasigned, 1 = taken by one driver, 2 = delivered,
	driverId (foreign key)
)

Tasks (
	driverId (foreign key),
	orderId (unique, foreing key),
	Primary Key (driverId, orderId)
)

////////////////////////////////////////////////////////////////////////////////////////

Desing of the API REST model

Client Endpoints
	New (Post) {
		Receives: 'name, lastname, email, phone[, address]',
		Returns:  'Client JSON',
		url: '/client/new'
	}

	Add Address (Post) {
		Receives: 'clientId, address',
		Returns: 'Client JSON',
		url: '/client/:id/addAddress'
	}

Order Endpoints 
	New (Post) {
		Receives: 'addressId, deliveryTime',
		Returns: 'Order JSON',
		url: '/order/new'
	}

	Finish (Put) {
		Receives: 'orderId',
		Returns: '200 http status',
		url: '/order/:id/finish'
	}

	Assign Driver (Put) {
		Receives: 'orderId',
		Returns: 'Order JSON',
		Url: '/order/:id/assign'
	}

Driver Endpoint
	New (Post) {
		Receives: 'name, lastname, email, phone',
		Returns: 'Driver JSON',
		url: '/driver/new'
	}

	Available (Get) {
		Receives: '',
		Returns: 'Driver JSON',
		url: '/driver'
	}
	
	Tasks (Get) {
		Receives: 'driverId, date',
		Returns: 'Tasks Array',
		url: '/driver/:id/tasks'
	}

	Add Task (Post) {
		Receives: 'orderId, driverId',
		Returns: 'Task JSON',
		url: '/driver/:id/addTask'
	}