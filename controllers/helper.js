/*
	Gets an id and verifies if it is a 
	valid id. (Positive integer)
	@params id -> an id to test
	@returns bool -> if the id is a positive integer
 */
module.exports.isValidId = (id) => {
	if(!id) 
		return false;
	
	if(id.length === 0)
		return false;

	if(isNaN(id))
		return false;

	if(id.indexOf('.') !== -1)
		return false;

	if(parseInt(id) < 0)
		return false;

	return true;
};

/*
	Add hours to a date.
	Gets a date object, adds to its time h hours
	and returns a new date object with the calculated time.
	@params date -> a date object with the time to add some hours.
	@params h -> a number specifying how many hours add to date.
	@returns Date -> Date object with date + h hours.
 */
module.exports.addHoursToDate = (date, h) => {
	if(isNaN(h))
		throw new Error("The h hours must be a number.");

	let newDate = new Date();

	try{
		newDate.setTime(date.getTime() + ( h * 60 * 60 * 1000 ));
		return newDate;
	}catch(err){
		throw new Error("The parameter date must be a Date object.");
	}
}