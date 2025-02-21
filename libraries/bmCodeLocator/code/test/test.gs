//import { CodeLocator } from '../index.js'
// these are for material for readme

const test7 = () => {
  const foo = 'bar'
  if (foo !== 'foo') {
    CodeLocator.whoCalled(0, { lineOffset: -1, brief: true })
    return null
  }
  return foo
}

const test6 = () => {

  const myLocator = (depth) => {
    // because we're wrapping this in another function, 
    // we'll need a depth of 2 ro mimic the usual behavior
    CodeLocator.whoCalled(depth, {
      brief: true,
      defaultDepth: 2
    })
  }

  const adder = (a, b) => {
    if (a > b) {
      myLocator()
    }
    return a + b
  }

  adder(1.2)
  adder(2, 1)


}

const test5 = () => {

  // set some temporary default options
  CodeLocator.setFormatOptions({
    brief: false,
    surroundAfter: 3,
    surroundBefore: 4,
    showFileName: true,
    lineNumberWidth: 2,
    pointer: 'wtf?? =>'
  })

  const bar = 'foo'

  if (bar !== 'bar') {
    CodeLocator.whoCalled(0)
  } else {
    CodeLocator.whoCalled(0)
  }

  // reset the default
  CodeLocator.setFormatOptions()

  if (bar !== 'bar') {
    CodeLocator.whoCalled(0)
  } else {
    CodeLocator.whoCalled(0)
  }
}

const test3 = () => {


  const math = (prop, ...args) => {
    if (!Reflect.has(Math, prop)) {
      CodeLocator.whoCalled()
    }
    else {
      return Math[prop](...args)
    }
  }

  math("sqrt", 2)
  math("rubbish", 0)
  math("pow", 2, 3)
  math("nonsense")
  math("round", 1.3)

}

const test4 = () => {
  if (CodeLocator.isGas) setFetcher()

  const math = (prop, ...args) => {
    if (!Reflect.has(Math, prop)) {
      CodeLocator.whoCalled(0, {
        brief: true
      })
    }
    else {
      return Math[prop](...args)
    }
  }

  math("sqrt", 2)
  math("rubbish", 0)
  math("pow", 2, 3)
  math("nonsense")
  math("round", 1.3)

}


const setFetcher = () => {
  // because a GAS library cant get its caller's code
  CodeLocator.setGetResource(ScriptApp.getResource)
  // optional - generally not needed - only necessary if you are using multiple libraries and some file sahre the same ID
  CodeLocator.setScriptId(ScriptApp.getScriptId())
}

// note in apps script it has to be coerced to run and
// the main is __GS_INTERNAL_top_function_call__.gs so it can't get the code for that 


if (!CodeLocator.isGas) {
  test3()
  test4()
  test5()
  test6()
  test7()
}

const testAll = () => {

  if (CodeLocator.isGas) setFetcher()
  /// ... your code

  test3()
  test4()
  test5()
  test6()
  test7()
}

// in the apps script IDE, we need to manually run functions.
if (!CodeLocator.isGas) {
  testAll()
}