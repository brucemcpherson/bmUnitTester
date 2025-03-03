
//import { readFileSync } from 'fs'

/**
 * CodeLocation
 * @typedef CodeLocation
 * @property {number} depth the stack depth this came from
 * @property {string} file the file name the error was at
 * @property {number} line the line number it occurred at
 */

/**
 * CodeLocationFormatOptions
 * @typedef CodeLocationFormatOptions
 * @property {number} [lineOffset=0] offset from line - to point at for example the line before use -1
 * @property {number} [surroundBefore=2] how many lines to show before the target line
 * @property {number} [surroundAfter=2] how many lines to show after the target line
 * @property {boolean} [showFileName=true] whether to show the filename
 * @property {boolean} [showLineNumber=true] whether to show line numbers
 * @property {boolean} [brief=false] brief only prints the target line and igmores sourround params and uses a concise format
 * @property {number}  [lineNumberWidth=4] width of line number space
 * @property {string} [pointer='-->'] point at target line
 * @property {number} [defaultDepth=1] depth to report at if non specified
 */

/**
 * CodeReport
 * @typedef CodeReport
 * @property {CodeLocation} location report was created from
 * @property {string} formatted a printable string constructed according to the CodeLocationFormatOptions
 */

/**
 * CodeContent
 * @typedef CodeContent
 * @property {number} lineNumber 1 based line number in file
 * @property {string} text the code text
 */

const _CodeLocator = () => {

  // how to identify if we're using gas
  // need a better indicator TODO
  const isGas = Reflect.has(globalThis, 'ScriptApp') && typeof ScriptApp.getResource === 'function'

  // if there are multiple GAS libraries then a scriptId will be needed to distinguish files with the same name in cache

  let _scriptId = 'default'

  // this section is only needed for apps script when code-locator is being used in a library
  // because the library doesnt have access to the callers code
  // all this is ignored on Node
  // ----------------------------
  let _getResource = null

  /**
   * set a scriptid to distinguish files that have the same name in multiple libraries in Apps Script - normally not required
   * @param {string} scriptId 
   * @returns {string} the scriptId
   */
  const setScriptId = (scriptId) => {
    if (isGas && typeof scriptId !== 'string') {
      throw `scriptId must be a string - you provided a ${typeof scriptId}`
    }
    _scriptId = scriptId
    return getScriptId
  }

  /**
   * set a function to get code from the callers script file because an Apps Script library doesnt have access to its callers code normally
   * @param {function} getResource this will always be ScriptApp.getResource 
   * @returns {function} the getResource function
   */
  const setGetResource = (getResource) => {
    if (isGas && typeof getResource !== 'function') {
      throw `getResource must be the ScriptApp.getResource function - you provided a ${typeof getResource}`
    }
    _getResource = getResource
    return getGetResource()
  }
  /**
   * @returns {function} how to get the callers code - ie. the callers ScriptApp.getResource
   */
  const getGetResource = () => _getResource

  /**
   * @returns {string} the callers scriptid if it was provided, otherwise 'default'
   */
  const getScriptId = () => _scriptId
  //--------------------

  // the code is cached to avoide multiple fetching
  const codeCache = new Map()

  /**
   * get the code from a given file 
   * @param {string} fileName with file:// removed if present
   * @returns {CodeContent[]} the code from the filename
   */
  const getCodeContent = (fileName) => {
    const key = `${getScriptId}-${fileName}`
    if (!codeCache.has(key)) {
      // save as an array of lines
      const code = fetchResource(fileName).split("\n").map((text, i) => ({
        lineNumber: i + 1,
        text
      }))
      codeCache.set(key, code)
    }
    return codeCache.get(key)
  }

  /**
   * gets file from either local storage or gas repo
   * @param {string} fileName with file:// removed if present 
   * @returns {string}
   */
  const fetchResource = (fileName) => {

    try {
      if (isGas) {
        // if we're in gas, we should have had the scriptresource set
        if (!getGetResource()) {
          console.log('...cant get code from an apps script library\n...from your main script,call CodeLocator.setGetResource(ScriptApp.getResource)')
          return ''
        }
        const blob = getGetResource()(fileName)
        return blob ? blob.getDataAsString() : ''
      } else {
        return readFileSync(fileName, { encoding: 'utf8', flag: 'r' })
      }
    } catch (err) {
      console.error('getting', fileName)
      console.error(err)
      return ''
    }
  }

  /**
   * @returns {CodeLocation[]} get all the location son the stack
   */
  function getLocations() {

    const frozen = Error.prepareStackTrace;

    // fiddle with the native
    Error.prepareStackTrace = (_, stack) => stack;

    const capture = {};
    Error.captureStackTrace(capture, this);

    // stack at each depth - skip the first as its from here
    const result = capture.stack.slice(1).map((line, depth) => {
      const fileName = line.getFileName() || 'unable to trace fileName'
      return {
        depth,
        fileName: fileName.replace(/^.*:\/\//, ""),
        line: line.getLineNumber()
      }
    }
    )

    // restore original
    Error.prepareStackTrace = frozen;

    // access depth in result array
    return result
  };

  /**
   * @type CodeLocationFormatOptions
   */
  const _defaultFormatOptions = Object.freeze({
    lineOffset: 0,
    surroundBefore: 2,
    surroundAfter: 2,
    showFileName: true,
    showLineNumber: true,
    brief: false,
    lineNumberWidth: 4,
    pointer: '-->',
    defaultDepth: 1
  })

  /**
   * custom default format options
   * @type CodeLocationFormatOptions
   */
  let _formatOptions

  /**
   * 
   * @param {CodeLocationFormatOptions} options 
   * @returns {CodeLocationFormatOptions}
   */
  const checkFormatOptions = (options) => {
    const badOptions = Reflect.ownKeys(options).filter(k => typeof options[k] !== typeof _defaultFormatOptions[k])
    if (badOptions.length) {
      throw new Error(`invalid format options ${JSON.stringify(badOptions)}`)
    }
    return options
  }
  /**
   * set custom default format options
   * @param {CodeLocationFormatOptions} options 
   * @returns {CodeLocationFormatOptions}
   */
  const setFormatOptions = (options = {}) => {
    _formatOptions = checkFormatOptions(options)
    return _formatOptions
  }

  // start with no custom options
  setFormatOptions({})

  /**
   * format a line
   * @param {CodeLocation} location
   * @param {CodeLocationFormatOptions} options 
   * @return {string} the formatted line(s)
   */
  const formatter = (location, options = {}) => {

    // mask for line number fixed width
    const mask = " ".repeat(options.lineNumberWidth)
    const indent = " ".repeat(options.pointer.length)

    // the target code
    const { line, fileName } = location

    // get all the code
    const code = getCodeContent(fileName)

    // line numbers start at 1
    const targetLine = line + options.lineOffset - 1
    const start = options.brief ? targetLine : Math.max(0, targetLine - options.surroundBefore)
    const finish = options.brief ? targetLine + 1 : targetLine + options.surroundAfter + 1
    const codeLines = code.slice(start, finish)

    const text = []
    if (!options.brief && options.showFileName) text.push(location.fileName)
    const alignLineNumber = (lineNumber) => (mask + lineNumber).slice(-mask.length) + ':'

    if (!codeLines.length) {
      text.push(`${alignLineNumber(targetLine)} ${options.pointer} No code available`)
      return text.join(" ")
    }
    return text.concat(codeLines.map(f => {
      const ltext = []
      if (options.showLineNumber) ltext.push(alignLineNumber(f.lineNumber))
      if (options.brief && options.showFileName) ltext.push(`[${fileName}]`)
      ltext.push(f.lineNumber === targetLine + 1 ? options.pointer : indent)
      ltext.push(f.text)

      return ltext.join("")
    })).join("\n")

  }

  const decorateOptions = (depth, options) => {

    options = checkFormatOptions({
      ..._defaultFormatOptions,
      ..._formatOptions,
      ...options
    })

    if (depth === null || typeof depth === typeof undefined) depth = options.defaultDepth
    return {
      options,
      depth
    }

  }

  /**
   * get code at a given depth in the stack
   * @param {number} [depth] depth 0 is the call to getCode, 1 would be who called it's parent function. default comes from options
   * @param {CodeLocationFormatOptions} [options={}] formatting options
   * @return {CodeReport}
   */
  const getCode = (depth, options) => {

    const { options: dOptions, depth: dDepth } = decorateOptions(depth, options)

    const locations = getLocations()
    const location = locations[dDepth + 1]
    if (!location) return {
      location: null,
      formatted: `Couldn't find location at depth ${dDepth}`,
    }

    return {
      location,
      formatted: formatter(location, dOptions)
    }
  }

  /**
   * get code at a given depth in the stack and log it
   * @param {number} [depth] depth 0 is the call to getCode, 1 would be who called it's parent function
   * @param {CodeLocationFormatOptions} [options={}] formatting options
   * @return {CodeReport}
   */
  const whoCalled = (depth, options) => {
    const { options: dOptions, depth: dDepth } = decorateOptions(depth, options)
    const report = getCode(dDepth + 1, dOptions)
    console.info(report.formatted)
    return report
  }

  return {
    whoCalled,
    getLocations,
    getCode,
    isGas,
    setFormatOptions,
    getCodeContent,
    setGetResource,
    setScriptId,
    getGetResource
  }
}

// apps script libraries sometime have trouble with exported consts, so we'll use var
var CodeLocator = _CodeLocator()