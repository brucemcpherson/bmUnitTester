

/**
 * UnitResult
 * @typedef {Object} UnitResult
 * @property {TestOptions} options - the test options
 * @property {UnitSection} section - The section this result belongs to
 * @property {number} testNumber - Serial number within the section
 * @property {boolean} eql - whether actual equals expected using the compare function (default deep equality)
 * @property {boolean} failed - whether the test failed
 * @property {boolean} jsEqual whether expected === actual (vanilla javascript equality)
 * @property {*} expect - the expected value
 * @property {*} actual - the actual value
 */


/**
 * @typedef {Object} UnitSection
 * @property {function} test - The section test collection
 * @property {UnitResult[]} results - The results for this section
 * @property {number} number - the section serial number
 * @property {number} startTime when section started
 * @property {number} endTime when section ended
 * @property {TestOptions} options - the section options
 */

/**
 * @typedef {Object} TestOptions
 * @property {function} [compare = this.defaultCompare] - function to compare expected to actual
 * @property {boolean} [invert = false] - whether success is that expected !== actual
 * @property {string} [description = ''] - The test description
 * @property {boolean} [neverUndefined = true]  - if actual is ever undefined it's a failure
 * @property {boolean} [neverNull = false]  - if actual is ever null it's a failure
 * @property {boolean} [showErrorsOnly = false]  - only verbose if there's an error
 * @property {number} [maxLog = Infinity]  - max number of chars to log in report
 * @property {boolean} [showValues = true] - show values in reports
 */

const _defaultOptions = {
  compare: (expect, actual) => {
    return Exports.deepEquals(expect, actual)
  },
  invert: false,
  description: '',
  neverUndefined: true,
  neverNull: false,
  showErrorsOnly: false,
  skip: false,
  maxLog: Infinity,
  showValues: true,
  expectThenActual: true,
  _t: false

}


class _Unit {

  /**
   * @param {object} params 
   * @param {TestOptions} [params.options] default options to apply to all sections
   * @return {Unit}
   */
  constructor(options = {}) {
    this.sections = []
    this.startTime = new Date().getTime()
    this.options = {
      ..._defaultOptions,
      ...options
    }
    // this one skips all tests from the points its turned on
    this.skipFromHere = false
  }

  get deepEquals() {
    return Exports.deepEquals
  }

  get defaultCompare() {
    return _defaultOptions.compare
  }


  /**
   * start a section of tests
   * @param {function| string} a a function with all the tests or a description (ava style)
   * @param {function|TestOptions} b a function with all the tests or options (ava style)
   * @param {TestOptions} [options] default options for this section
   * @return {UnitResult[]} tests that have failed so far in this section
   */
  section(a, b, c) {

    // the first arg could be the test or the description to transition to ava style
    let desc = a, test = b, options = c || {}

    if (Exports.Utils.isFunction(a)) {
      desc = ""
      test = a
      options = b || {}
    }

    options = {
      ...this.options,
      ...options,
      description: options.description || desc,
      sectionIndex: this.sections.length
    }

    const currentSection = {
      test,
      results: [],
      number: this.sections.length,
      options,
      startTime: new Date().getTime(),
      isAsync: false
    }

    this.sections.push(currentSection)

    let { skip, description } = options
    description = description || desc
    skip = skip || this.skipFromHere
    const rp = (passes, failures) => {
      console.info(
        'Finished section',
        description,
        'passes:',
        passes,
        'failures:',
        failures,
        'elapsed ms',
        new Date().getTime() - currentSection.startTime)
      return failures
    }
    console.info(`${skip ? 'Skipping' : 'Starting'} section`, description)
    if (!skip) {

      // no async in apps script, but promises are supported, so we need to convert to a promise and wait
      // the test should return a resolved promise when complete
      // this runs all the tests in the section


      /**
       * this is the ava emulation object that gets passed as an alternative to using UNIT
       * so unit.section (t=> {
       *  // first version
       *  unit.is (expected, actual)
       *  // new version
       *  t.is (actual, expected)
       * })
       * there are some behavioral changes between the 2 also
       */
      const t = new _Unit({
        ...options,
        expectThenActual: false,
        compare: (expect, actual) => {
          return expect === actual
        },
        _t: true
      })
      t.sections = [currentSection]
      //----- 

      let tested = test(t)

      if (Exports.Utils.isPromise(tested)) {
        currentSection.isAsync = true
        return Promise.resolve(tested).then(() => {
          const failures = this.sectionErrors(currentSection)
          const passes = this.sectionPasses(currentSection)
          return rp(passes, failures)
        })

      } else {
        const failures = this.sectionErrors(currentSection)
        const passes = this.sectionPasses(currentSection)
        return rp(passes, failures)
      }
    }
    else {
      return []
    }
  }



  /**
   * get the section currently being processed
   * @return {UnitSection}
   */
  get currentSection() {
    return this.sections.slice(-1)[0]
  }

  /** 
   * @param {*} a the expected value (or actual if expectThenActual is true)
   * @param {*} b the actual value (or expected if expectThenActual is false)
   * @param {TestOptions| string} testOptions 
   * @return UnitResult
   */
  test(a, b, options) {
    const toptions = this.options._t ? this.options : {}
    const currentSection = this.currentSection


    const testNumber = currentSection.results.length
    options = {
      ...currentSection.options,
      ...toptions,
      ...options,
      description: options.description || `test: ${testNumber}`
    }

    const expect = options.expectThenActual ? a : b
    const actual = options.expectThenActual ? b : a

    if (currentSection.number !== options.sectionIndex) {
      throw `unexpected section index ${options.sectionIndex} - expected ${currentSection.number}`
    }
    if (!options.skip || this.skipFromHere) {
      const eql = options.compare(expect, actual)
      const failed = (Boolean(eql) === Boolean(options.invert)) ||
        (options.neverUndefined && Exports.Utils.isUndefined(actual)) ||
        (options.neverNull && Exports.Utils.isNull(actual))

      const result = {
        options,
        section: currentSection,
        testNumber,
        eql,
        failed,
        expect,
        actual,
        jsEqual: expect === actual
      }
      currentSection.results.push(result)
      this.reportTest(result)
      return result
    } else {
      return {
        options
      }
    }

  }

  /**
   * so we can support supplying description as a text field
   * @param {string|object} [options] the options or a description
   * return {TestOptions}
   */
  _fixOptions(options) {
    if (Exports.Utils.isString(options)) {
      return {
        description: options
      }
    }
    return options || {}
  }
  /** 
   * do a test - succes is when compare is true
   * @param {*} expect the expected value
   * @param {*} actual the actual value
   * @param {TestOptions} options 
   * @return UnitResult
   */
  deepEqual(expect, actual, options) {
    return this.test(expect, actual, {
      compare: (expect, actual) => {
        return Exports.deepEquals(expect, actual)
      }, ...this._fixOptions(options), invert: false
    })
  }

  /** 
   * do a test - succes is when compare is false
   * @param {*} expect the expected value
   * @param {*} actual the actual value
   * @param {TestOptions} options 
   * @return UnitResult
   */
  notDeepEqual(expect, actual, options) {
    return this.test(expect, actual, {
      compare: (expect, actual) => {
        return Exports.deepEquals(expect, actual)
      }, ...this._fixOptions(options), invert: true
    })
  }


  /** 
   * do a test - succes is when compare is true
   * @param {*} expect the expected value
   * @param {*} actual the actual value
   * @param {TestOptions} options 
   * @return UnitResult
   */
  rxMatch(expect, actual, options) {
    return this.test(expect, actual, { ...this._fixOptions(options), invert: false, compare: (expect, actual) => this.rxCompare(expect, actual) })
  }

  /** 
   * do a test - succes is when compare is false
   * @param {*} expect the expected value
   * @param {*} actual the actual value
   * @param {TestOptions} options 
   * @return UnitResult
   */
  notRxMatch(expect, actual, options) {
    return this.test(expect, actual, { ...this._fixOptions(options), invert: true, compare: (expect, actual) => this.rxCompare(expect, actual) })
  }

  /** 
   * do a test - succes is when compare is true
   * @param {*} expect the expected value
   * @param {*} actual the actual value
   * @param {TestOptions} options 
   * @return UnitResult
   */
  wildCardMatch(expect, actual, options) {
    return this.test(expect, actual, { ...this._fixOptions(options), invert: false, compare: (expect, actual) => this.wcCompare(expect, actual) })
  }

  /** 
   * do a test - succes is when compare is false
   * @param {*} expect the expected value
   * @param {*} actual the actual value
   * @param {TestOptions} options 
   * @return UnitResult
   */
  notWildCardMatch(expect, actual, options) {
    return this.test(expect, actual, { ...this._fixOptions(options), invert: true, compare: (expect, actual) => this.wcCompare(expect, actual) })
  }

  /** 
   * do a test - succes is when compare is true
   * @param {*} expect the expected value
   * @param {*} actual the actual value
   * @param {TestOptions} options 
   * @return UnitResult
   */
  is(expect, actual, options) {
    return this.test(expect, actual, { ...this._fixOptions(options), invert: false })
  }


  /** 
   * do a test - succes is when compare is false
   * @param {*} expect the expected value
   * @param {*} actual the actual value
   * @param {TestOptions} options 
   * @return UnitResult
   */
  not(expect, actual, options) {
    return this.test(expect, actual, { ...this._fixOptions(options), invert: true })
  }


  /** 
   * do a test - succes is when compare is true
   * @param {*} actual the actual value
   * @param {TestOptions} options 
   * @return UnitResult
   */
  true(actual, options) {
    return this.test(actual, true, { ...this._fixOptions(options), expectThenActual: false, invert: false, })
  }

  /** 
   * do a test - succes is when compare is false
   * @param {*} actual the actual value
   * @param {TestOptions} options 
   * @return UnitResult
   */
  notHasWildCards(actual, options) {
    return this.test(Exports.Utils.hasWildCards(actual), true, { ...this._fixOptions(options), expectThenActual: false, invert: true })
  }


  /** 
   * do a test - succes is when compare is true
   * @param {*} actual the actual value
   * @param {TestOptions} options 
   * @return UnitResult
   */
  hasWildCards(actual, options) {
    return this.test(Exports.Utils.hasWildCards(actual), true, { ...this._fixOptions(options), expectThenActual: false, invert: false })
  }



  /** 
   * do a test - succes is when compare is true
   * @param {*} actual the actual value
   * @param {TestOptions} options 
   * @return UnitResult
   */
  false(actual, options) {
    return this.test(actual, false, { ...this._fixOptions(options), expectThenActual: false, invert: false })
  }

  /** 
   * do a test - succes is when compare is true
   * @param {*} actual the actual value
   * @param {TestOptions} options 
   * @return UnitResult
   */
  truthy(actual, options) {
    return this.test(actual ? true : false, true, { ...this._fixOptions(options), expectThenActual: false, invert: false })
  }

  /** 
   * do a test - succes is when compare is true
   * @param {*} actual the actual value
   * @param {TestOptions} options 
   * @return UnitResult
   */
  falsey(actual, options) {
    return this.test(actual ? true : false, false, { ...this._fixOptions(options), expectThenActual: false, invert: false })
  }

  /** 
   * @param {UnitResult} result the unit result to get the description of
   * @return {string} the decorated description
   */
  getTestDescription(result) {
    return `${result.section.number}.${result.testNumber} ${result.options.description}`
  }

  /**
   * 
   * @param {UnitResult} result the unit result to decorate
   * @return {string} the decorated result
   */
  getTestResult(result) {
    return `${this.getTestDescription(result)} - ${result.failed ? 'failed' : 'passed'} (${!result.options.invert} test)`
  }

  /** 
   * log the test
   * @param {UnitResult} result the unit result to decorate
   * @return {string} the decorated result
   */
  reportTest(result) {
    const { failed, options, expect, actual } = result
    const e = options.showValues ? this.trunk(expect, options) : '--'
    const a = options.showValues ? this.trunk(actual, options) : '--'
    if (failed) {
      console.info('  ', this.getTestResult(result), '  \n', Exports.newUnexpectedValueError(e, a))
    } else if (!options.showErrorsOnly) {
      console.info('  ', this.getTestResult(result), '  \n', a)
    }
    return result
  }
  trunk(val, options) {
    const v = typeof val === 'object' && val !== null && Reflect.has(val, "toJSON")
      ? JSON.stringify(val)
      : val
    return Exports.Utils.trunk(v, options.maxLog)
  }
  /**
   * all the tests passed
   * @return {Boolean} whether all was good
   */
  isGood() {
    return Boolean(!this.totalErrors)
  }

  /**
   * all the tests passed
   * @return {Boolean} whether all was good
   */
  isSectionGood(section) {
    return Boolean(!this.sectionErrors(section))
  }

  /**
   * get the total number of tests that were errors
   * return {number}
   */
  get totalErrors() {
    return this.sections.reduce((p, c) => p + this.sectionErrors(c), 0)
  }

  /**
   * get the total number of tests that were successes
   * return {number}
   */
  get totalPasses() {
    return this.sections.reduce((p, c) => p + this.sectionPasses(c), 0)
  }

  /**
   * get the total number of sections that contain errors
   * return {number}
   */
  sectionErrors(section) {
    return section.results.filter(f => f.failed).length
  }

  /**
   * get the total number of sections that contain no errors
   * return {number}
   */
  sectionPasses(section) {
    return section.results.filter(f => !f.failed).length
  }

  /**
   * this is a prebaked comparison of error returned by unit.threw or indeed any rx
   * can be used like this unit.is(/regex to match error/, unit.threw(()=> some function), {
   *   compare: unit.rxCompare
   * })
   */
  rxCompare(expected, actual) {
    if (!Exports.Utils.isFunction(expected?.test)) {
      throw 'expected argument to rxCompare should be a regex'
    }

    return actual && expected.test(actual)
  }

  /**
   * this is a prebaked comparison of error returned by unit.threw or indeed any rx
   * can be used like this unit.is(/regex to match error/, unit.threw(()=> some function), {
   *   compare: unit.rxCompare
   * })
   */
  wcCompare(expected, actual) {
    return Exports.Utils.isMatch(expected, actual)
  }

  /**
   * complete summay report of all the tests
   * @return {boolean} if true then there's no errors
   */
  report() {
    console.info('Section summary')
    this.sections.forEach(f => {
      console.info('',f.number+':', f.options.description, 'passes:'+ this.sectionPasses(f), 'failures:'+ this.sectionErrors(f))
    })
    console.info('Total passes', this.totalPasses,
      `(${Exports.Utils.percent(this.totalPasses, this.totalPasses + this.totalErrors)}%)`,
      'Total failures', this.totalErrors,
      `(${Exports.Utils.percent(this.totalErrors, this.totalPasses + this.totalErrors)}%)`)

    console.info(this.totalErrors ? 'SOME TESTS FAILED' : 'ALL TESTS PASSED')
    console.info('Total elapsed ms', new Date().getTime() - this.startTime)
    return this.isGood()
  }

  /**
   * just a useful timer
   * @param {function} func to run
   * @param {object} [params]
   * @param {boolean} [params.log=true] whether to log
   * @param {string} [params.description=''] description of timer
   */
  timer(func, { log = true, description = '' } = {}) {
    const startedAt = new Date().getTime()
    const result = func()
    const finishedAt = new Date().getTime()
    const timer = {
      startedAt,
      finishedAt,
      elapsed: finishedAt - startedAt
    }
    if (log) {
      console.info(`timer ${description ? 'for ' + description : ''}`, timer)
    }
    return {
      result,
      timer
    }
  }
  /**
   * just a useful throw catcher
   * @param {function} func the thing to run
   * @param {Error || null} the error if there was one
   */
  threw(func) {

    const dealWithError = (error, isAsync) => {

      // if this is an async response, the error message needs to go back as a promise too
      const promy = (value) => isAsync ? Promise.resolve (value) : value

      // if this is a packresponse, we need to sort out the error message

      if (error && error.message && typeof error.message === 'string') {
        try {
          return promy(JSON.parse(error.message))
        } catch (err) {
          return promy(error)
        }
      }
      return promy(error)
    }
    try {
      // the func might be async
      const r = func()
      if (Exports.Utils.isPromise(r)) {
        return r.catch(error=>dealWithError(error, true))
      }
    } catch (error) {
      return dealWithError (error)
    }
  }

}
// export
const Unit = _Unit
