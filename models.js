const Sequelize = require('sequelize');

// Database configuration
const database = new Sequelize('imaginemos', 'root', '', {
	host: 'localhost',
	dialect: 'mysql',
	operatorAliases: false,
	pool: {
		max: 1000,
		min: 0,
		acquire: 30000,
		idle: 10000
	},
	logging: false
});

// ----------------- Declaration of models -----------------

// Clients Model
module.exports.Client = database.define('client', {
	email: {
		type: Sequelize.STRING(100),
		allowNull: false,
		unique: true
	},
	name: {
		type: Sequelize.STRING(100)
	},
	lastname: {
		type: Sequelize.STRING(100)
	},	
	phone: {
		type: Sequelize.STRING(20)
	}
});

// Addresses Model
module.exports.Address = database.define('address', {
	address: {
		type: Sequelize.TEXT(),
		allowNull: false
	}
});

// Drivers Model
module.exports.Driver = database.define('driver', {
	email: {
		type: Sequelize.STRING(100),
		allowNull: false,
		unique: true
	},
	name: {
		type: Sequelize.STRING(100)
	},
	lastname: {
		type: Sequelize.STRING(100)
	},	
	phone: {
		type: Sequelize.STRING(20)
	}
});

// Orders Model
module.exports.Order = database.define('order', {
	deliveryTime: {
		type: Sequelize.DATE(),
		allowNull: false
	},
	status: {
		type: Sequelize.ENUM('-1', '0', '1', '2'),
		defaultValue: '0'
	}
});

// Tasks Model
module.exports.Task = database.define('tasks', {});

// ----------------- Declaration of relations -----------------

module.exports.Client.hasMany(module.exports.Address);

module.exports.Client.hasMany(module.exports.Order);

module.exports.Driver.hasMany(module.exports.Order);

module.exports.Address.hasMany(module.exports.Order);

module.exports.Order.belongsToMany(module.exports.Driver, { through: module.exports.Task});

// ------------------ Sync Models with Database -----------------

module.exports.Client.sync({force: false}).then(()=>{
	console.log('Table Client syncronized');
}).catch(()=>{
	console.error("Oops... Couldn't sync Client's table");
});

module.exports.Driver.sync({force: false}).then(()=>{
	console.log('Table Driver syncronized');
}).catch(()=>{
	console.error("Oops... Couldn't sync Driver's table");
});

module.exports.Address.sync({force: false}).then(()=>{
	console.log('Table Address syncronized');
}).catch(()=>{
	console.error("Oops... Couldn't sync Address' table");
});

module.exports.Order.sync({force: false}).then(()=>{
	console.log('Table Order syncronized');
}).catch(()=>{
	console.error("Oops... Couldn't sync Order's table");
});

module.exports.Task.sync({force: false}).then(()=>{
	console.log('Table task syncronized');
}).catch(()=>{
	console.error("Oops... Couldn't sync Task's table");
});