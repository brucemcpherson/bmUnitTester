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
    return deepEquals(expect, actual)
  },
  invert: false,
  description: '',
  neverUndefined: true,
  neverNull: false,
  showErrorsOnly: false,
  skip: false,
  maxLog: Infinity,
  showValues: true
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
  }

  get deepEquals() {
    return deepEquals
  }

  get defaultCompare() {
    return _defaultOptions.compare
  }
  /**
   * start a section of tests
   * @param {function} test a function with all the tests 
   * @param {TestOptions} [options] default options for this section
   * @return {UnitResult[]} tests that have failed so far in this section
   */
  section(test, options = {}) {
    options = {
      ...this.options,
      ...options,
      description: options.description || ''
    }
    this.sections.push({
      test,
      results: [],
      number: this.sections.length,
      options,
      startTime: new Date().getTime()
    })
    const currentSection = this.currentSection
    const { skip, description } = options
    console.log(`${skip ? 'Skipping' : 'Starting'} section`, description)
    if (!skip) {
      test()
      const failures = this.sectionErrors(currentSection)
      const passes = this.sectionPasses(currentSection)
      console.log(
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
    return []
  }

  /**
   * get the section currently being processed
   * @return {UnitSection}
   */
  get currentSection() {
    return this.sections.slice(-1)[0]
  }

  /** 
   * @param {*} expect the expected value
   * @param {*} actual the actual value
   * @param {TestOptions} testOptions 
   * @return UnitResult
   */
  test(expect, actual, options = {}) {
    const currentSection = this.currentSection
    options = {
      ...currentSection.options,
      ...options,
      description: options.description || ''
    }
    if (!options.skip) {
      const testNumber = currentSection.results.length
      const eql = options.compare(expect, actual)
      const failed = (Boolean(eql) === Boolean(options.invert)) ||
        (options.neverUndefined && Utils.isUndefined(actual)) ||
        (options.neverNull && Utils.isNull(actual))

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
   * do a test - succes is when compare is true
   * @param {*} expect the expected value
   * @param {*} actual the actual value
   * @param {TestOptions} options 
   * @return UnitResult
   */
  is(expect, actual, options) {
    return this.test(expect, actual, { ...options, invert: false })
  }

  /** 
   * do a test - succes is when compare is false
   * @param {*} expect the expected value
   * @param {*} actual the actual value
   * @param {TestOptions} options 
   * @return UnitResult
   */
  not(expect, actual, options) {
    return this.test(expect, actual, { ...options, invert: true })
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
      console.log('  ', this.getTestResult(result), '  \n', newUnexpectedValueError(e, a))
    } else if (!options.showErrorsOnly) {
      console.log('  ', this.getTestResult(result), '  \n', a)
    }
    return result
  }
  trunk(val, options) {
    const v = typeof val === 'object' ? JSON.stringify(val) : val
    return Utils.trunk(v, options.maxLog)
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
   * complete summay report of all the tests
   * @return {boolean} if true then there's no errors
   */
  report() {
    console.log('Section summary')
    this.sections.forEach(f => {
      console.log('  ', f.options.description, 'passes', this.sectionPasses(f), 'failures', this.sectionErrors(f))
    })
    console.log('  ', 'Total passes', this.totalPasses,
      `(${Utils.percent(this.totalPasses, this.totalPasses + this.totalErrors)}%)`,
      'Total failures', this.totalErrors,
      `(${Utils.percent(this.totalErrors, this.totalPasses + this.totalErrors)}%)`)
    console.log(this.totalErrors ? 'SOME TESTS FAILED' : 'ALL TESTS PASSED')
    console.log('Total elapsed ms', new Date().getTime() - this.startTime)
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
      console.log(`timer ${description? 'for '+ description : ''}`, timer)
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
    try {
      func()
      return null
    } catch (error) {
      // if this is a packresponse, we need to sort out the error message
      if (error && error.message && typeof error.message === 'string') {
        try {
          return JSON.parse(error.message)
        } catch (err) {
          return error
        }
      }
      return error
    }
  }

}
// export
var Unit = _Unit

