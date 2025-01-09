const Utils = (() => {


  const isUndefined = (item) => typeof item === typeof undefined
  const isNull = (item) => item === null
  const isNU = (item) => isNull(item) || isUndefined(item)
  const isObject = (item) => typeof item === 'object'
  const isFunction = (item) => typeof item === 'function'
  const isArray = (item) => Array.isArray (item)
  const isPromise = (item) => !isNU (item) && (isObject(item) || isFunction(item)) && isFunction (item.then)
  const percent = (value, base, places = 1) => {
    return base ? (100 * value / base).toFixed(places) : base.toFixed(places)
  }

  const trunk = (str, maxLength= 100) => {
    if (typeof str === 'string') {
      return (str.length > maxLength) ? str.slice(0, maxLength) + '...' : str;
    }
    return str
  };

  return {
    trunk,
    isUndefined,
    isNull,
    isNU,
    percent,
    isPromise,
    isObject,
    isFunction,
    isArray
  }

})()

