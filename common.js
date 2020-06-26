const pipe = (...fns) => input => fns.reduce((chain, f) => chain.then(f), Promise.resolve(input));
const createArrayIfNotArray = (maybeArray) => Array.isArray(maybeArray) ? maybeArray : maybeArray.map((x) => x);
const capitalizeFirstLetter = (s) => s.charAt(0).toUpperCase() + s.substr(1);
const createStatefulSetter = (obj, prop, getterName) => (value) => {
  getterName = getterName || `get${capitalizeFirstLetter(prop)}`;
  const getter = () => value;
  obj[getterName] = getter;
  return obj;
}

function shuffle(array) {
	var currentIndex = array.length,
		temporaryValue, randomIndex;

	// While there remain elements to shuffle...
	while (0 !== currentIndex) {

		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;

		// And swap it with the current element.
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}

	return array;
}

module.exports = {
  pipe, createStatefulSetter, shuffle
}