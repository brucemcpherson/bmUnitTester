
//import { Exports } from './Exports.mjs';


/**
 * CodeReport
 * @typedef {object} CodeReport
 * @property {CodeLocation} location report was created from
 * @property {string} formatted a printable string constructed according to the CodeLocationFormatOptions
 */

/**
 * SectionData
 * @typedef {object} SectionData
 * @property {function} test the collection of tests to run on this section
 * @property {TestResult[]} results all the results for each individual test so far
 * @property {number} number the section index starting at 0
 * @property {TestOptions} options the options for thos section
 * @property {number} startTime timestamp for when this section started
 * @property {boolean} isAsync whether this is an async section
 */


/**
 * TestResult
 * @typedef {Object} TestResult
 * @property {TestOptions} options - the test options
 * @property {SectionData} section - The section this result belongs to
 * @property {number} testNumber - Serial number within the section
 * @property {boolean} eql - whether actual equals expect using the compare function (default deep equality)
 * @property {boolean} failed - whether the test failed
 * @property {boolean} jsEqual whether expect === actual (vanilla javascript equality)
 * @property {*} expect - the expect value
 * @property {*} actual - the actual value
 * @property {CodeReport} codeReport = the location of the calling test
 */


/**
 * @typedef CodeLocationFormatOptions
 * @property {number} [lineOffset=0] offset from line - to point at for example the line before use -1
 * @property {number} [surroundBefore=2] how many lines to show before the target line
 * @property {number} [surroundAfter=2] how many lines to show after the target line
 * @property {boolean} [showFileName=true] whether to show the filename
 * @property {boolean} [showLineNumber=true] whether to show line numbers
 * @property {boolean} [brief=false] brief only prints the target line and igmores sourround params and uses a concise format
 * @property {number}  [lineNumberWidth=4] width of line number space
 * @property {string} [pointer='--> '] point at target line
 */


/**
 * @typedef {Object} TestOptions
 * @property {function} [compare = this.defaultCompare] - function to compare expect to actual
 * @property {boolean} [invert = false] - whether success is that expect !== actual
 * @property {string} [description = ''] - The test description
 * @property {boolean} [neverUndefined = true]  - if actual is ever undefined it's a failure
 * @property {boolean} [neverNull = false]  - if actual is ever null it's a failure
 * @property {boolean} [showErrorsOnly = false]  - only verbose if there's an error
 * @property {number} [maxLog = Infinity]  - max number of chars to log in report
 * @property {boolean} [showValues = true] - show values in reports
 * @property {CodeLocationFormatOptions} [codeLocationFormatOptions] - how to report code content
 */

class Unit {

  /**
   * by the time we get to here, expect/actual order anomalies should be sorted out
   * @param {object} params 
   * @param {TestOptions} [params.options] default options to apply to all sections
   * @return {Unit}
   */
  constructor(options = {}) {
    this.compares = Object.freeze({
      equal: (actual, expect) => actual === expect,
      deepEqual: Exports.deepEquals,
      truthy: (actual) => !!actual,
      true: (actual) => actual === true,
      // the util expects wildcard, text
      wildCardMatch: (a, b) => Exports.Utils.isMatch(b, a),
      hasWildCards: Exports.Utils.hasWildCards,
      rxMatch: (actual, expect) => {
        if (!Exports.Utils.isRx(expect)) {
          throw 'expect argument should be a regex'
        }
        return expect.test(actual)
      }
    })
    /**
     * @type TestOptions
     */
    this.defaultOptions = Object.freeze({
      // legacy - deepequal was the default - still applies for unit.test, but not t.test
      compare: this.compares.deepEqual,
      invert: false,
      description: '',
      neverUndefined: true,
      neverNull: false,
      showErrorsOnly: false,
      skip: false,
      maxLog: Infinity,
      showValues: true,
      expectThenActual: true,
      _t: false,
      codeLocationFormatOptions: {
      }
    })

    /**
     * @param {TestOptions} options 
     * @returns {TestOptions}
     */
    this.checkOptions = (options) => {
      // private keys start with '_'
      const isPublic = (k) => k.substring(0, 1) !== '_'

      // we'll allow falsey && truthy alternatives for boolean
      const badOptions = Reflect.ownKeys(options).filter(isPublic)
        .filter(k => typeof options[k] !== typeof this.defaultOptions[k] && typeof this.defaultOptions[k] !== 'boolean')
      if (badOptions.length) {
        throw new Error(`invalid format options ${JSON.stringify(badOptions)}`)
      }
      return options
    }

    this.sections = []
    this.startTime = new Date().getTime()

    /**
     * @type TestOptions
     */
    this.options = this.checkOptions({
      ...this.defaultOptions,
      ...options
    })

    // this one skips all tests from the points its turned on
    this.skipFromHere = false
  }

  ///-- legacy support
  get deepEquals() {
    return this.compares.deepEqual
  }

  get defaultCompare() {
    return this.defaultOptions.compare
  }
  //----

  cancel() {
    this.skipFromHere = true
  }

  unCancel() {
    this.skipFromHere = false
  }


  /**
   * start a section of tests
   * @param {function| string} a a function with all the tests or a description (ava style)
   * @param {function|TestOptions} b a function with all the tests or options (ava style)
   * @param {TestOptions} [sectionOptions] default options for this section
   * @return {TestResult[]} tests that have failed so far in this section
   */
  section(a, b, c) {

    // the first arg could be the test or the description to transition to ava style
    let desc = a, test = b, sectionOptions = c || {}

    if (Exports.Utils.isFunction(a)) {
      desc = ""
      test = a
      sectionOptions = b || {}
    }

    const mergedOptions = {
      // unit options
      ...this.options,
      // section options
      ...sectionOptions,
      description: sectionOptions.description || desc,
      _sectionIndex: this.sections.length
    }

    const currentSection = {
      test,
      results: [],
      number: this.sections.length,
      options: mergedOptions,
      startTime: new Date().getTime(),
      isAsync: false
    }

    this.sections.push(currentSection)

    let { skip, description } = mergedOptions
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
       *  unit.is (expect, actual)
       *  // new version
       *  t.is (actual, expect)
       * })
       * there are some behavioral changes between the 2 also
       */
      const t = new Unit(this.checkOptions({
        ...mergedOptions,
        expectThenActual: false,
        // legacy unit.compare default is deepequal - t.compare default is equal
        // however it's possible that section options might have overridden than
        compare: sectionOptions.compare || this.compares.equal,
        _t: true
      }))
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
   * @return {SectionData}
   */
  get currentSection() {
    return this.sections.slice(-1)[0]
  }


  /** 
   * legacy problem is that unit(expect,actual) still neeeds to be supported, but t(actual,expect) is preferred
   * @param {*} actual the actual value 
   * @param {*} [expect] the expect value or undefined if test only needs 1 arg
   * @param {TestOptions| string} [options|string] testOptions or string description 
   * @return TestResult
   */
  test(actual, expect, options) {

    // the t variant is a unique to the section and is a n instance of unit
    // the legacy version is stil supported for now eg unit.is versus t.is
    const toptions = this.options._t ? this.options : {}
    const currentSection = this.currentSection



    const testNumber = currentSection.results.length
    options = this.checkOptions({
      ...currentSection.options,
      ...toptions,
      ...options,
      description: options.description || `test: ${testNumber}`
    })

    //-- we need to flip if in legacy mode
    const isFlipped = !this.options._t
    if (isFlipped) {
      const a = actual
      actual = expect
      expect = a
    }
    //----
    if (currentSection.number !== options._sectionIndex) {
      throw `unexpect section index ${options._sectionIndex} - expect ${currentSection.number}`
    }

    if (!options.skip && !this.skipFromHere) {
      if (!Exports.Utils.isFunction(options.compare)) {
        throw `compare function is not a function - its a ${typeof options.compare}`
      }

      const eql = options.compare(actual, expect)
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
        jsEqual: expect === actual,
        codeReport: Exports.CodeLocator.getCode(2, options.codeLocationFormatOptions)
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
    return this.checkOptions(options || {})
  }

  // a note on all these tests - the expect/actual args are sown as the legacy order so may have been reversed before calling here
  // if t.test (new) is being used rather than unit.test(legacy)
  /** 
   * do a test - succes is when compare is true
   * @param {*} expect the expect value
   * @param {*} actual the actual value
   * @param {TestOptions} options 
   * @return TestResult
   */
  deepEqual(actual, expect, options) {
    return this.test(actual, expect, {
      ...this._fixOptions(options),
      compare: this.compares.deepEqual,
      invert: false
    })
  }
  /** 
   * do a test - succes is when compare is true
   * @param {*} expect the expect value
   * @param {*} actual the actual value
   * @param {TestOptions} options 
   * @return TestResult
   */
  equal(actual, expect, options) {
    options = this._fixOptions(options)
    return this.test(actual, expect, {
      ...options,
      compare: this.compares.equal,
      invert: false
    })
  }

  /** 
   * do a test - succes is when compare is true
   * @param {*} expect the expect value
   * @param {*} actual the actual value
   * @param {TestOptions} options 
   * @return TestResult
   */
  notEqual(actual, expect, options) {
    options = this._fixOptions(options)
    return this.test(actual, expect, {
      ...options,
      compare: this.compares.equal,
      invert: true
    })
  }
  /** 
   * do a test - succes is when compare is false
   * @param {*} expect the expect value
   * @param {*} actual the actual value
   * @param {TestOptions} options 
   * @return TestResult
   */
  notDeepEqual(actual, expect, options) {
    return this.test(actual, expect, {
      ...this._fixOptions(options),
      compare: this.compares.deepEqual,
      invert: true
    })
  }


  /** 
   * do a test - succes is when compare is true
   * @param {*} expect the expect value
   * @param {*} actual the actual value
   * @param {TestOptions} options 
   * @return TestResult
   */
  rxMatch(actual, expect, options) {
    return this.test(actual, expect, { ...this._fixOptions(options), invert: false, compare: this.compares.rxMatch })
  }

  /** 
   * do a test - succes is when compare is false
   * @param {*} expect the expect value
   * @param {*} actual the actual value
   * @param {TestOptions} options 
   * @return TestResult
   */
  notRxMatch(actual, expect, options) {
    return this.test(actual, expect, { ...this._fixOptions(options), invert: true, compare: this.compares.rxMatch })
  }

  /** 
   * do a test - succes is when compare is true
   * @param {*} text the value to check
   * @param {*} wildcard the wildcard to check it against
   * @param {TestOptions} options 
   * @return TestResult
   */
  wildCardMatch(text, wildcard, options) {
    return this.test(text, wildcard, { ...this._fixOptions(options), invert: false, compare: this.compares.wildCardMatch })
  }

  /** 
 * do a test - succes is when compare is true
 * @param {*} text the value to check
 * @param {*} wildcard the wildcard to check it against
 * @param {TestOptions} options 
 * @return TestResult
 */
  notWildCardMatch(text, wildcard, options) {
    return this.test(text, wildcard, { ...this._fixOptions(options), invert: true, compare: this.compares.wildCardMatch })
  }

  /** 
   * do a test - succes is when compare is true
   * @param {*} expect the expect value
   * @param {*} actual the actual value
   * @param {TestOptions} options 
   * @return TestResult
   */
  is(actual, expect, options) {
    return this.test(actual, expect, { ...this._fixOptions(options), invert: false })
  }


  /** 
   * do a test - succes is when compare is false
   * @param {*} expect the expect value
   * @param {*} actual the actual value
   * @param {TestOptions} options 
   * @return TestResult
   */
  not(actual, expect, options) {
    return this.test(actual, expect, { ...this._fixOptions(options), invert: true })
  }


  /** 
   * do a test - succes is when compare is true
   * @param {*} actual the actual value
   * @param {TestOptions} options 
   * @return TestResult
   */
  true(actual, options) {
    return this.test(actual, true, {
      ...this._fixOptions(options),
      compare: this.compares.equal,
      invert: false
    })
  }

  /** 
 * do a test - succes is when compare is false
 * @param {*} actual the actual value
 * @param {TestOptions} options 
 * @return TestResult
 */
  false(actual, options) {
    return this.test(actual, true, {
      ...this._fixOptions(options),
      compare: this.compares.equal,
      invert: true
    })
  }
  /** 
   * do a test - succes is when compare is false
   * @param {*} actual the actual value
   * @param {TestOptions} options 
   * @return TestResult
   */
  notHasWildCards(actual, options) {
    return this.test(actual, actual, {
      ...this._fixOptions(options),
      compare: this.compares.hasWildCards,
      invert: true
    })
  }


  /** 
   * do a test - succes is when compare is true
   * @param {*} expect the expect value
   * @param {*} actual the actual value
   * @param {TestOptions} options 
   * @return TestResult
   */
  hasWildCards(actual, options) {
    return this.test(actual, actual, {
      ...this._fixOptions(options),
      compare: this.compares.hasWildCards,
      invert: false
    })
  }




  /** 
   * do a test - succes is when compare is true
   * @param {*} actual the actual value
   * @param {TestOptions} options 
   * @return TestResult
   */
  truthy(actual, options) {
    return this.test(!!actual, true, { ...this._fixOptions(options), expectThenActual: false, compare: this.compares.equal, invert: false })
  }

  /** 
   * do a test - succes is when compare is true
   * @param {*} actual the actual value
   * @param {TestOptions} options 
   * @return TestResult
   */
  falsey(actual, options) {
    return this.test(!!actual, true, { ...this._fixOptions(options), compare: this.compares.equal, expectThenActual: false, invert: true })
  }

  /** 
   * @param {TestResult} result the unit result to get the description of
   * @return {string} the decorated description
   */
  getTestDescription(result) {
    const fop = result.options.codeLocationFormatOptions.brief ? result.codeReport.formatted : ""
    return `${result.section.number}.${result.testNumber} ${fop} ${result.options.description}`
  }

  /**
   * 
   * @param {TestResult} result the unit result to decorate
   * @return {string} the decorated result
   */
  getTestResult(result) {
    return `${this.getTestDescription(result)} - ${result.failed ? 'failed' : 'passed'}`
  }

  /** 
   * log the test
   * @param {TestResult} result the unit result to decorate
   * @return {string} the decorated result
   */
  reportTest(result) {
    const { failed, options, expect, actual } = result
    const e = options.showValues ? this.trunk(expect, options) : '--'
    const a = options.showValues ? this.trunk(actual, options) : '--'
    if (failed) {
      console.info('', this.getTestResult(result), ' \n', Exports.newUnexpectedValueError(e, a).toString())
    } else if (!options.showErrorsOnly) {
      console.info('', this.getTestResult(result), ' \n', "  Actual:", a)
    }
    if (!options.codeLocationFormatOptions.brief && (failed || !options.showErrorsOnly)) {
      console.info(result.codeReport.formatted)
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
   * legacy - use rxMatch now
   * this is a prebaked comparison of error returned by unit.threw or indeed any rx
   * can be used like this unit.is(/regex to match error/, unit.threw(()=> some function), {
   *   compare: unit.rxCompare
   * })
   */
  rxCompare(expect, actual) {
    if (!Exports.Utils.isFunction(expect?.test)) {
      throw 'expect argument to rxCompare should be a regex'
    }

    return actual && expect.test(actual)
  }

  /**
   * this is a prebaked comparison of error returned by unit.threw or indeed any rx
   * can be used like this unit.is(/regex to match error/, unit.threw(()=> some function), {
   *   compare: unit.rxCompare
   * })
   */
  wcCompare(expect, actual) {
    return Exports.Utils.isMatch(expect, actual)
  }

  /**
   * complete summay report of all the tests
   * @return {boolean} if true then there's no errors
   */
  report() {
    console.info('Section summary')
    this.sections.forEach(f => {
      console.info('', f.number + ':', f.options.description, 'passes:' + this.sectionPasses(f), 'failures:' + this.sectionErrors(f))
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
      const promy = (value) => isAsync ? Promise.resolve(value) : value

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
        return r.catch(error => dealWithError(error, true))
      }
    } catch (error) {
      return dealWithError(error)
    }
  }

}

