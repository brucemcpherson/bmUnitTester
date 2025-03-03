//import {Unit} from './Unit.mjs'
//import {Utils} from './Utils.mjs'
//import {wildcardMatch} from './wildcardMatch.mjs'
//import {newUnknownPropertyError, newUnexpectedTypeError ,newUnexpectedValueError} from './errors.mjs'
//import {deepEquals} from './deepeql.mjs';
//import {CodeLocator} from './codelocator.mjs'

var Exports = {

  get CodeLocator () {
    // code locator is now inline in this library
    // as apps script cannot trace code more than 1 library deep
    return CodeLocator
  },

  /**
   * Unit Class 
   * @implements {bmUnitTester.Unit} 
   */
  get Unit() {
    return Unit
  },

  /**
   * @returns {object} 
   */
  get Utils() {
    return this.guard(Utils)
  },

  newUnknownPropertyError(...args) {
    return this.guard(newUnknownPropertyError(...args))
  },


  newUnexpectedTypeError(...args) {
    return this.guard(newUnexpectedTypeError(...args))
  },

  newUnexpectedValueError(...args) {
    return this.guard(newUnexpectedValueError(...args))
  },


  newUnit(...args) {
    return this.guard(new this.Unit(...args))
  },

  get deepEquals () {
    return deepEquals
  },

  get wcMatch() {
    return this.guard(wildcardMatch)
  },



  // used to trap access to unknown properties
  guard(target) {
    return new Proxy(target, this.validateProperties);
  },



  /**
   * for validating attempts to access non existent properties
   */
  get validateProperties() {
    return {
      get(target, prop, receiver) {
        // typeof and console use the inspect prop
        if (
          typeof prop !== 'symbol' &&
          prop !== 'inspect' &&
          prop !== '__GS_INTERNAL_isProxy' &&
          !Reflect.has(target, prop)
        )
          throw new Error(`guard detected attempt to get non-existent property ${prop}`)

        return Reflect.get(target, prop, receiver);
      },

      set(target, prop, value, receiver) {
        if (!Reflect.has(target, prop))
          throw `guard attempt to set non-existent property ${prop}`;
        return Reflect.set(target, prop, value, receiver);
      },
    };
  },
}


