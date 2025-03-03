//import {Exports} from './Exports.mjs';

const Utils = (() => {


  const isUndefined = (item) => typeof item === typeof undefined
  const isNull = (item) => item === null
  const isNU = (item) => isNull(item) || isUndefined(item)
  const isObject = (item) => typeof item === 'object'
  const isFunction = (item) => typeof item === 'function'
  const isArray = (item) => Array.isArray (item)
  const isPromise = (item) => !isNU (item) && (isObject(item) || isFunction(item)) && isFunction (item.then)
  const isString = (item) => typeof item === "string"
  const isRx = (item) => item instanceof RegExp
  const percent = (value, base, places = 1) => {
    return base ? (100 * value / base).toFixed(places) : base.toFixed(places)
  }

  const trunk = (str, maxLength= 100) => {
    if (typeof str === 'string') {
      return (str.length > maxLength) ? str.slice(0, maxLength) + '...' : str;
    }
    return str
  };

  /** handle wildcards */
  const hasWildCards = (text) => Boolean(text.match(/\*|\?/))
  const wMatch = (target) => Exports.wcMatch(target)
  const isMatch = (a, b) => wMatch(a)(b)

  return {
    trunk,
    isUndefined,
    isNull,
    isNU,
    percent,
    isPromise,
    isObject,
    isFunction,
    isArray,
    isString,
    hasWildCards,
    isMatch,
    wMatch,
    isRx
  }

})()
